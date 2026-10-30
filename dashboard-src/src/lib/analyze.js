/*
 * The analyzer.
 *
 * Pure functions only: text in, findings out. Nothing here touches the DOM,
 * so the same code runs in the browser, in a test, or behind an API later.
 *
 * Every check returns { state, title, why, evidence } plus:
 *   id   — stable name, used to attach remediation advice
 *   fix  — what to change, written for the person who has to change it
 *
 * The rule the whole tool is built on: no invented score. A finding is a
 * contradiction between two things the headers say, quoted verbatim.
 */

const BRANDS = [
  "paypal", "microsoft", "apple", "google", "amazon", "netflix", "dhl", "fedex", "ups",
  "hsbc", "barclays", "natwest", "lloyds", "coinbase", "binance", "outlook", "dropbox",
  "linkedin", "instagram", "facebook", "docusign", "adobe", "hmrc", "irs", "spotify",
  "icloud", "steam", "usps", "royalmail", "santander", "revolut", "wise", "booking",
];

// Characters that read as Latin letters in other alphabets, plus digit swaps.
const HOMOGLYPH = {
  "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c", "\u0445": "x",
  "\u0443": "y", "\u0456": "i", "\u0458": "j", "\u0455": "s", "\u0501": "d", "\u0261": "g",
  "\u03bd": "v", "\u03bf": "o", "\u03b1": "a", "\u03c1": "p", "\u03c4": "t", "\u0131": "i",
  "0": "o", "1": "l", "3": "e", "5": "s", "4": "a", "7": "t", "8": "b",
};

const TWO_LEVEL = {
  "co.uk": 1, "org.uk": 1, "ac.uk": 1, "gov.uk": 1, "co.nz": 1, "com.au": 1, "net.au": 1,
  "co.jp": 1, "co.in": 1, "com.br": 1, "co.za": 1, "com.sg": 1, "com.mx": 1, "co.il": 1,
};

const FIX = {
  "return-path":
    "Decide which domain actually sends this mail, then make the envelope and the letterhead agree. If a third party sends on your behalf, add their IPs to your SPF record and set the envelope sender to your own domain.",
  auth:
    "Publish an SPF record that lists every sending IP, sign with DKIM on the From domain, and add a DMARC record. Start at p=none to collect reports, then move to p=quarantine and p=reject once the reports are clean.",
  "reply-to":
    "Keep Reply-To on the same registrable domain as From. If a help desk really does handle the replies, route them through a subdomain you control, with its own SPF and DKIM.",
  lookalike:
    "Do not trust a domain that only resembles the real one. Check the message through a second channel, and block lookalike registrations at the mail gateway.",
  "message-id":
    "Ask the sending platform to stamp Message-ID on your own domain. If it always stamps its own, record that as expected so it stops appearing here.",
  route:
    "Check NTP on every sending host. If the clocks are not simply drifting, treat the whole header block as untrusted — it can be typed by hand.",
  missing:
    "This header is what the check needs. Ask the receiving server to keep it, or paste the full block from the original message.",
};

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

// Turns a pasted block into [{name, value, raw}], unfolding continuation lines.
export function parseHeaders(raw) {
  const text = String(raw || "").replace(/\r\n?/g, "\n");
  const block = text.split("\n\n")[0];
  const out = [];

  block.split("\n").forEach((line) => {
    if (/^[ \t]/.test(line) && out.length) {
      const last = out[out.length - 1];
      last.value += " " + line.trim();
      last.raw += "\n" + line;
      return;
    }
    const match = line.match(/^([^:\s][^:]*):[ \t]?([\s\S]*)$/);
    if (!match) return;
    out.push({
      name: match[1].toLowerCase(),
      value: match[2].trim(),
      raw: line,
    });
  });

  return out;
}

function first(headers, name) {
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].name === name) return headers[i].value;
  }
  return "";
}

function all(headers, name) {
  return headers.filter((h) => h.name === name);
}

// Pulls the address and display name out of a From / Return-Path / Reply-To value.
export function address(value) {
  const result = { raw: value || "", email: "", domain: "", name: "" };
  if (!value) return result;

  const angle = value.match(/<([^>]+)>/);
  let email = angle ? angle[1] : value.split(/[,;]/)[0];
  email = email.trim().replace(/^mailto:/i, "").replace(/[)>.,;"']+$/, "");

  result.email = email;
  if (email.indexOf("@") > -1) {
    result.domain = email.split("@").pop().trim().toLowerCase();
  }
  if (angle) {
    result.name = value.slice(0, angle.index).trim().replace(/^"|"$/g, "");
  }
  return result;
}

// The domain someone would actually have to own: example.co.uk, not a.b.example.co.uk
export function registrable(domain) {
  const parts = (domain || "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  return TWO_LEVEL[lastTwo] ? parts.slice(-3).join(".") : lastTwo;
}

// Pulls apart a single Received header.
export function parseReceived(header) {
  const value = header.value;
  const semi = value.lastIndexOf(";");
  const head = semi === -1 ? value : value.slice(0, semi);
  const rawDate = semi === -1 ? "" : value.slice(semi + 1).trim();
  const cleanDate = rawDate.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  const fromMatch = head.match(/\bfrom\s+([^\s;()]+)(?:\s*\(([^)]*)\))?/i);
  const byMatch = head.match(/\bby\s+([^\s;()]+)/i);
  const withMatch = head.match(/\bwith\s+([A-Za-z0-9._-]+)/i);
  const ipMatch = head.match(/\[([0-9a-fA-F:.]{3,})\]/);

  return {
    raw: header.raw,
    from: fromMatch ? fromMatch[1] : "",
    by: byMatch ? byMatch[1] : "",
    proto: withMatch ? withMatch[1] : "",
    ip: ipMatch ? ipMatch[1] : "",
    date: rawDate,
    time: cleanDate ? Date.parse(cleanDate) : NaN,
  };
}

// Reads spf/dkim/dmarc out of Authentication-Results, topmost header first.
export function parseAuth(headers) {
  const result = { spf: "", dkim: "", dmarc: "", headerFrom: "", lines: [] };

  all(headers, "authentication-results").forEach((header, index) => {
    result.lines.push(header.raw);
    if (index > 0) return;
    ["spf", "dkim", "dmarc"].forEach((mech) => {
      const match = header.value.match(
        new RegExp("(?:^|[\\s;])" + mech + "\\s*=\\s*([a-z]+)", "i"),
      );
      if (match) result[mech] = match[1].toLowerCase();
    });
    const headerFrom = header.value.match(/header\.from\s*=\s*([^\s;]+)/i);
    if (headerFrom) result.headerFrom = headerFrom[1].toLowerCase();
  });

  // Some receivers put the SPF verdict in its own header instead.
  const receivedSpf = first(headers, "received-spf");
  if (!result.spf && receivedSpf) {
    const spfMatch = receivedSpf.match(/^\s*([a-z]+)/i);
    if (spfMatch) result.spf = spfMatch[1].toLowerCase();
    result.lines.push("Received-SPF: " + receivedSpf);
  }

  result.present = result.lines.length > 0;
  return result;
}

/* ------------------------------------------------------------------ *
 * Lookalike domains
 * ------------------------------------------------------------------ */

function fold(text) {
  return String(text)
    .split("")
    .map((ch) => HOMOGLYPH[ch] || ch)
    .join("")
    .replace(/-/g, "");
}

function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  let prev = [];
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

// Returns {kind, brand} when a domain is imitating a known brand.
export function lookalike(domain) {
  if (!domain) return null;
  const reg = registrable(domain);
  const parts = reg.split(".");
  const label = parts[0] || "";
  const folded = fold(label);

  // 1. A brand used as a subdomain: ledgerly.example.secure-login.example
  const labels = domain.split(".");
  if (labels.length > 2) {
    for (let i = 0; i < labels.length - 1; i++) {
      if (BRANDS.indexOf(fold(labels[i])) > -1) {
        return { kind: "subdomain", brand: fold(labels[i]) };
      }
    }
  }

  // 2. The label should read as a brand but doesn't, character for character.
  if (BRANDS.indexOf(folded) > -1 && folded !== label) {
    return { kind: "homoglyph", brand: folded };
  }

  // 3. Every other real brand, plus one-character-off names.
  for (let b = 0; b < BRANDS.length; b++) {
    const brand = BRANDS[b];
    if (label === brand) return null;
    if (label.length >= 5 && editDistance(folded, brand) === 1) {
      return { kind: "near", brand };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function fmtDuration(ms) {
  if (!isFinite(ms)) return "unknown";
  const s = Math.round(ms / 1000);
  if (s < 1) return "under a second";
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m " + (s % 60) + "s";
  const h = Math.floor(m / 60);
  return h + "h " + (m % 60) + "m";
}

/* ------------------------------------------------------------------ *
 * The checks
 * ------------------------------------------------------------------ */

const STATE_LABEL = { fail: "Contradiction", check: "Can't confirm", pass: "Confirmed" };

export function buildChecks(headers) {
  const checks = [];
  const from = address(first(headers, "from"));
  const returnPath = address(first(headers, "return-path"));
  const replyTo = address(first(headers, "reply-to"));
  const auth = parseAuth(headers);
  const messageId = first(headers, "message-id");
  const messageIdDomain = messageId ? (messageId.match(/@([^>\s]+)/) || [])[1] || "" : "";
  const hasDkimSignature = all(headers, "dkim-signature").length > 0;

  /* 1. The two return addresses */
  if (!from.domain) {
    checks.push({
      id: "missing",
      state: "check",
      title: "No sender address to compare",
      why: "This block has no usable From line, so there is nothing to check the envelope against.",
      evidence: [{ label: "From", raw: first(headers, "from") || "not present" }],
    });
  } else if (!returnPath.domain) {
    checks.push({
      id: "missing",
      state: "check",
      title: "The envelope sender is missing",
      why: "There is no Return-Path, so the second address isn't available. Clients are allowed to strip it, but it removes the cheapest cross-check you have.",
      evidence: [{ label: "From", raw: first(headers, "from") }],
    });
  } else if (registrable(from.domain) === registrable(returnPath.domain)) {
    checks.push({
      id: "return-path",
      state: "pass",
      title: "The envelope matches the letterhead",
      why:
        "The address shown to you and the address bounces go to are both on " +
        registrable(from.domain) + ".",
      evidence: [
        { label: "From", raw: first(headers, "from") },
        { label: "Return-Path", raw: first(headers, "return-path") },
      ],
    });
  } else {
    checks.push({
      id: "return-path",
      state: "fail",
      title: "It returns to a different organisation",
      why:
        "The message says it is from " + registrable(from.domain) +
        ", but the envelope belongs to " + registrable(returnPath.domain) +
        ". One of those two addresses is the truth about who sent it.",
      evidence: [
        { label: "From", raw: first(headers, "from") },
        { label: "Return-Path", raw: first(headers, "return-path") },
      ],
    });
  }

  /* 2. Who vouched for it */
  const mechanisms = ["spf", "dkim", "dmarc"].filter((m) => auth[m]);
  const bad = mechanisms.filter(
    (m) => ["fail", "softfail", "permerror", "temperror"].indexOf(auth[m]) > -1,
  );

  if (!auth.present) {
    checks.push({
      id: "auth",
      state: "check",
      title: "Nothing vouches for the sender",
      why: "There is no Authentication-Results header, so no receiver recorded whether SPF, DKIM or DMARC passed. Some clients drop this header when forwarding.",
      evidence: [
        { label: "Looked for", raw: "Authentication-Results: …\nReceived-SPF: …" },
        { label: "DKIM-Signature present", raw: hasDkimSignature ? "yes" : "no" },
      ],
    });
  } else if (bad.length) {
    checks.push({
      id: "auth",
      state: "fail",
      title: "The sender's own claims were rejected",
      why:
        "The receiving server recorded " +
        bad.map((m) => m.toUpperCase() + " " + auth[m]).join(", ") +
        ". Whatever the display name says, the infrastructure did not back it up.",
      evidence: auth.lines.map((raw) => ({ label: "Authentication-Results", raw })),
    });
  } else if (mechanisms.length < 3) {
    checks.push({
      id: "auth",
      state: "check",
      title: "Only part of the message was authenticated",
      why:
        "Mailroom found " +
        mechanisms.map((m) => m.toUpperCase() + " " + auth[m]).join(" and ") +
        ", with no result for the rest. That is common and not automatically bad, but it is not a full picture.",
      evidence: auth.lines.map((raw) => ({ label: "Authentication-Results", raw })),
    });
  } else {
    checks.push({
      id: "auth",
      state: "pass",
      title: "SPF, DKIM and DMARC all passed",
      why:
        "Three separate mechanisms agree the message came from infrastructure that " +
        (registrable(auth.headerFrom || from.domain) || "the sender") + " authorised.",
      evidence: auth.lines.map((raw) => ({ label: "Authentication-Results", raw })),
    });
  }

  /* 3. Replies going elsewhere */
  if (replyTo.domain && from.domain && registrable(replyTo.domain) !== registrable(from.domain)) {
    checks.push({
      id: "reply-to",
      state: "check",
      title: "Replies would go to a different domain",
      why:
        "Reply-To points at " + registrable(replyTo.domain) + " instead of " +
        registrable(from.domain) +
        ". Mailing lists and help desks do this legitimately. It matters most when the rest of the message is already failing.",
      evidence: [
        { label: "Reply-To", raw: first(headers, "reply-to") },
        { label: "From", raw: first(headers, "from") },
      ],
    });
  }

  /* 4. Does the sender's domain imitate a brand? */
  const spoof = lookalike(from.domain);
  if (spoof && spoof.kind === "subdomain") {
    checks.push({
      id: "lookalike",
      state: "fail",
      title: "A known name is being used as a subdomain",
      why:
        "The domain " + from.domain + " contains \u201c" + spoof.brand +
        "\u201d, but the part someone actually owns is " + registrable(from.domain) +
        ". Everything to the left of that can be invented by whoever registers the domain.",
      evidence: [{ label: "From", raw: first(headers, "from") }],
    });
  } else if (spoof && spoof.kind === "homoglyph") {
    checks.push({
      id: "lookalike",
      state: "fail",
      title: "The domain copies \u201c" + spoof.brand + "\u201d with different characters",
      why:
        "Once lookalike characters and digits are normalised, " + from.domain +
        " reads as " + spoof.brand +
        ". The domain is not the brand's; it is built to survive a quick glance.",
      evidence: [{ label: "From", raw: first(headers, "from") }],
    });
  } else if (spoof && spoof.kind === "near") {
    checks.push({
      id: "lookalike",
      state: "check",
      title: "The domain is one character away from " + spoof.brand,
      why:
        from.domain + " is a single edit away from " + spoof.brand +
        ". This can be a coincidence, a regional domain, or a typo trap — check it against the address you already have on file.",
      evidence: [{ label: "From", raw: first(headers, "from") }],
    });
  } else {
    checks.push({
      id: "lookalike",
      state: "pass",
      title: "The domain doesn't imitate a well-known brand",
      why:
        "Mailroom compared " + (registrable(from.domain) || "the sender domain") +
        " against a short list of commonly spoofed names, including digit and character swaps. That list is not everything.",
      evidence: [{ label: "From", raw: first(headers, "from") }],
    });
  }

  /* 5. Message-ID minted elsewhere */
  if (
    messageIdDomain && from.domain &&
    registrable(messageIdDomain) !== registrable(from.domain)
  ) {
    checks.push({
      id: "message-id",
      state: "check",
      title: "The message was stamped by another domain",
      why:
        "The Message-ID was issued by " + registrable(messageIdDomain) + ", not " +
        registrable(from.domain) +
        ". Sending platforms do this on behalf of their customers, so on its own it proves nothing.",
      evidence: [{ label: "Message-ID", raw: first(headers, "message-id") }],
    });
  }

  /* 6. Does the route make chronological sense? */
  const hops = all(headers, "received").map(parseReceived).reverse();
  const timed = hops.filter((h) => isFinite(h.time));
  if (timed.length >= 2) {
    const backwards = [];
    for (let i = 1; i < timed.length; i++) {
      if (timed[i].time < timed[i - 1].time) backwards.push(timed[i]);
    }
    checks.push({
      id: "route",
      state: backwards.length ? "check" : "pass",
      title: backwards.length ? "The timestamps run backwards" : "The route is in chronological order",
      why: backwards.length
        ? "At least one server claims to have received the message before the server before it sent it. Clocks drift, but this is also what hand-edited headers look like."
        : "Every hop arrives after the one before it, and the whole journey took " +
          fmtDuration(timed[timed.length - 1].time - timed[0].time) + ".",
      evidence: timed.map((h) => ({ label: "Received", raw: h.raw })),
    });
  }

  return {
    checks,
    from,
    returnPath,
    replyTo,
    auth,
    messageIdDomain,
    date: first(headers, "date"),
    subject: first(headers, "subject"),
    to: address(first(headers, "to")),
    hops,
  };
}

/* ------------------------------------------------------------------ *
 * Public entry point
 * ------------------------------------------------------------------ */

const SEVERITY = { fail: "critical", check: "warning", pass: "ok" };

export function analyze(rawText) {
  const headers = parseHeaders(rawText);
  const result = buildChecks(headers);
  const present = headers.length;

  const usable = headers.filter((h) =>
    ["from", "received", "return-path", "authentication-results", "dkim-signature"].includes(h.name),
  );

  if (present < 3 || !usable.length) {
    return {
      ok: false,
      headers: present,
      error: rawText.trim()
        ? "That doesn't look like a header block. Start at the first line — usually \u201cReturn-Path:\u201d or \u201cReceived:\u201d — and paste through to the blank line before the body."
        : "Paste the message headers first, or load one of the examples.",
    };
  }

  const faults = result.checks
    .filter((check) => check.state !== "pass")
    .map((check) => ({
      id: check.id + "-" + check.state,
      severity: SEVERITY[check.state],
      title: check.title,
      detail: check.why,
      evidence: check.evidence,
      fix: FIX[check.id] || FIX.missing,
    }));

  return {
    ok: true,
    headers: present,
    checks: result.checks,
    faults,
    result,
    severity: faults.some((f) => f.severity === "critical")
      ? "critical"
      : faults.length
        ? "warning"
        : "ok",
  };
}

/* A short, specific status label for the queue tag. */
export function statusLabel(faults) {
  if (!faults.length) return "Clean";
  const critical = faults.filter((f) => f.severity === "critical");
  if (critical.length) {
    if (critical.some((f) => f.id.startsWith("lookalike"))) return "Lookalike domain";
    if (critical.some((f) => f.id.startsWith("auth"))) return "Auth failed";
    if (critical.some((f) => f.id.startsWith("return-path"))) return "Sender mismatch";
    return "Critical fault";
  }
  if (faults.some((f) => f.id.startsWith("route"))) return "Clock drift";
  if (faults.some((f) => f.id.startsWith("reply-to"))) return "Reply-To mismatch";
  if (faults.some((f) => f.id.startsWith("message-id"))) return "Unverified route";
  return "Warning";
}

/* Rough TLS version, read out of the Received chain when it's there. */
export function tlsVersion(headers) {
  const text = headers.map((h) => h.value).join(" ");
  const match = text.match(/TLS(?:v)?\s?1\.[0-3]/i);
  return match ? match[0].replace(/\s/g, "").replace(/^TLSv/i, "TLSv") : "";
}

export { STATE_LABEL };
