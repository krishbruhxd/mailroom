/*
 * Demo data.
 *
 * Addresses use the reserved .example TLD on purpose: nothing here points at
 * a real person or company. The header blocks are complete enough to parse,
 * and the "Inspect new email" dialog runs the real analyzer on them.
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function rfc2822(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    DAYS[d.getUTCDay()] + ", " + pad(d.getUTCDate()) + " " + MONTHS[d.getUTCMonth()] +
    " " + d.getUTCFullYear() + " " + pad(d.getUTCHours()) + ":" +
    pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " +0000"
  );
}

// [[t]] is the message time; [[t-38]] is 38 seconds earlier.
function fill(headers, base) {
  return headers.replace(/\[\[t(?:-(\d+))?\]\]/g, (_, offset) =>
    rfc2822(new Date(new Date(base).getTime() - (Number(offset) || 0) * 1000)),
  );
}

export const BASELINE = {
  scanned: 1284,
  healthy: 1238,
};

const RECORDS = [
  {
    id: "eml_01hx8k2m",
    minutesAgo: 3,
    direction: "inbound",
    from: { name: "Ledgerly Billing", email: "billing@ledgerly.example" },
    to: { name: "Operations", email: "ops@northwind.example" },
    subject: "Invoice 2026-1042 is ready",
    status: { severity: "ok", label: "Clean" },
    signals: { spf: "pass", dkim: "pass", dmarc: "pass", ptr: "pass", spam: "pass" },
    meta: {
      ip: "203.0.113.24",
      returnPath: "billing@ledgerly.example",
      dkimDomain: "ledgerly.example",
      tls: "TLSv1.3",
      mx: "mx1.ledgerly.example (10)",
      ptr: "mail.ledgerly.example",
      spamScore: "0.2",
    },
    faults: [],
    headers: [
      "Return-Path: <billing@ledgerly.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 7f2a",
      "        for <ops@northwind.example>;",
      "        [[t]]",
      "Received: from mail.ledgerly.example (mail.ledgerly.example [203.0.113.24])",
      "        by mx.northwind.example with ESMTPS id 4d8b",
      "        (TLSv1.3 with cipher TLS_AES_256_GCM_SHA384)",
      "        for <ops@northwind.example>;",
      "        [[t-38]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass (ledgerly.example designates 203.0.113.24 as permitted sender)",
      "        smtp.mailfrom=billing@ledgerly.example;",
      "       dkim=pass (2048-bit key) header.d=ledgerly.example header.s=ledgerly2026",
      "        header.b=\"Xk2pQ9wA\";",
      "       dmarc=pass (p=reject sp=reject dis=none) header.from=ledgerly.example",
      "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=ledgerly.example;",
      "        s=ledgerly2026; t=1793090421; h=from:to:subject:date:message-id;",
      "        bh=YjQ3ZjJkOWE4YzFlNmI3; b=Zm9vYmFyLWRlbW8tc2lnbmF0dXJl",
      "From: Ledgerly Billing <billing@ledgerly.example>",
      "To: ops@northwind.example",
      "Reply-To: billing@ledgerly.example",
      "Subject: Invoice 2026-1042 is ready",
      "Date: [[t-40]]",
      "Message-ID: <20261027094109.4d8b@ledgerly.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=\"utf-8\"",
      "Content-Transfer-Encoding: 7bit",
    ].join("\n"),
  },

  {
    id: "eml_01hx8jvq",
    minutesAgo: 8,
    direction: "inbound",
    from: { name: "Ledgerly Billing", email: "billing@ledgerly.example" },
    to: { name: "Operations", email: "ops@northwind.example" },
    subject: "Action required: verify your billing details",
    status: { severity: "critical", label: "SPF failed" },
    signals: { spf: "fail", dkim: "none", dmarc: "fail", ptr: "pass", spam: "pass" },
    meta: {
      ip: "185.234.72.19",
      returnPath: "bounce@mail-relay-04.example",
      dkimDomain: "none",
      tls: "TLSv1.2",
      mx: "mx1.ledgerly.example (10)",
      ptr: "mail-relay-04.example",
      spamScore: "1.1",
    },
    faults: [
      {
        id: "spf-hardfail",
        severity: "critical",
        title: "Hard fail: SPF does not include the sending IP",
        detail:
          "ledgerly.example publishes v=spf1 include:_spf.ledgerly.example -all, which does not authorise 185.234.72.19. The receiving server recorded spf=fail, so the message was sent by infrastructure the domain never approved.",
        evidence: [
          {
            label: "Authentication-Results",
            raw:
              "spf=fail (sender IP is 185.234.72.19)\n  smtp.mailfrom=bounce@mail-relay-04.example",
          },
          {
            label: "Received",
            raw:
              "from mail-relay-04.example (mail-relay-04.example [185.234.72.19])\n        by mx.northwind.example with ESMTPS id 91ac",
          },
        ],
        fix:
          "If this sender is yours, add the IP to the SPF record for the domain that actually sends the mail. If it is not yours, do not add it — the message is being sent without your authorisation and the record is doing its job.",
        code: {
          label: "DNS TXT record",
          body:
            'ledgerly.example. 3600 IN TXT "v=spf1 include:_spf.ledgerly.example ip4:185.234.72.19 -all"',
        },
      },
      {
        id: "alignment",
        severity: "critical",
        title: "The envelope is on a different domain from the letterhead",
        detail:
          "From says ledgerly.example, but bounces return to mail-relay-04.example. DMARC checks alignment between those two, so even a passing SPF result would not have saved this message.",
        evidence: [
          { label: "From", raw: "From: Ledgerly Billing <billing@ledgerly.example>" },
          { label: "Return-Path", raw: "Return-Path: <bounce@mail-relay-04.example>" },
        ],
        fix:
          "Send through your own authenticated relay, or set the envelope sender to a subdomain of the From domain and sign with DKIM using that same subdomain. Alignment is the part that matters, not the SPF pass on its own.",
      },
    ],
    headers: [
      "Return-Path: <bounce@mail-relay-04.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 1c93",
      "        for <ops@northwind.example>;",
      "        [[t]]",
      "Received: from mail-relay-04.example (mail-relay-04.example [185.234.72.19])",
      "        by mx.northwind.example with ESMTPS id 91ac",
      "        (TLSv1.2 with cipher ECDHE-RSA-AES256-GCM-SHA384)",
      "        for <ops@northwind.example>;",
      "        [[t-12]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=fail (sender IP is 185.234.72.19)",
      "        smtp.mailfrom=bounce@mail-relay-04.example;",
      "       dkim=none (message not signed) header.d=none;",
      "       dmarc=fail (p=reject sp=reject dis=none) header.from=ledgerly.example",
      "From: \"Ledgerly Billing\" <billing@ledgerly.example>",
      "To: ops@northwind.example",
      "Subject: Action required: verify your billing details",
      "Date: [[t-40]]",
      "Message-ID: <20261027093811.91ac@mail-relay-04.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=\"utf-8\"",
    ].join("\n"),
  },

  {
    id: "eml_01hx8j3r",
    minutesAgo: 14,
    direction: "inbound",
    from: { name: "Inkwell Weekly", email: "newsletter@inkwell.example" },
    to: { name: "Operations", email: "ops@northwind.example" },
    subject: "LAST CHANCE: 70% OFF EVERYTHING!!!",
    status: { severity: "warning", label: "Spam score 6.8" },
    signals: { spf: "pass", dkim: "pass", dmarc: "pass", ptr: "pass", spam: "fail" },
    meta: {
      ip: "203.0.113.61",
      returnPath: "newsletter@inkwell.example",
      dkimDomain: "inkwell.example",
      tls: "TLSv1.3",
      mx: "mx.inkwell.example (10)",
      ptr: "mail.inkwell.example",
      spamScore: "6.8",
    },
    faults: [
      {
        id: "spam-score",
        severity: "warning",
        title: "Spam score 6.8 — above your 5.0 threshold",
        detail:
          "Four rules fired, none of them fatal on its own: a link shortener in the body (+2.1), an image-only HTML part with almost no text (+1.8), an all-caps subject (+1.6), and no List-Unsubscribe header (+1.3). Authentication passed, so this is a content and policy problem, not a spoofing one.",
        evidence: [
          {
            label: "X-Spam-Status",
            raw:
              "X-Spam-Status: Yes, score=6.8 required=5.0\n  tests=HTML_IMAGE_ONLY_08,SHORTENER,SUBJ_ALL_CAPS,MISSING_LIST_UNSUB",
          },
          {
            label: "Subject",
            raw: "Subject: LAST CHANCE: 70% OFF EVERYTHING!!!",
          },
        ],
        fix:
          "Send from your own link domain instead of a shortener, add real text to the HTML part, drop the capitals and exclamation marks, and publish the two unsubscribe headers. Then re-score before the next send.",
        code: {
          label: "Headers to add",
          body:
            "List-Unsubscribe: <mailto:unsubscribe@inkwell.example?subject=unsub>,\n  <https://inkwell.example/unsubscribe?u=abc123>\nList-Unsubscribe-Post: List-Unsubscribe=One-Click",
        },
      },
    ],
    headers: [
      "Return-Path: <newsletter@inkwell.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 6b11",
      "        for <ops@northwind.example>;",
      "        [[t]]",
      "Received: from mail.inkwell.example (mail.inkwell.example [203.0.113.61])",
      "        by mx.northwind.example with ESMTPS id 2f7d",
      "        (TLSv1.3 with cipher TLS_AES_128_GCM_SHA256)",
      "        for <ops@northwind.example>;",
      "        [[t-26]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass (inkwell.example designates 203.0.113.61 as permitted sender)",
      "        smtp.mailfrom=newsletter@inkwell.example;",
      "       dkim=pass (2048-bit key) header.d=inkwell.example header.s=k1;",
      "       dmarc=pass (p=quarantine sp=quarantine dis=none) header.from=inkwell.example",
      "X-Spam-Score: 6.8",
      "X-Spam-Status: Yes, score=6.8 required=5.0",
      "        tests=HTML_IMAGE_ONLY_08,SHORTENER,SUBJ_ALL_CAPS,MISSING_LIST_UNSUB",
      "X-Spam-Report: * 2.1 SHORTENER Link shortener in body",
      "        * 1.8 HTML_IMAGE_ONLY_08 Image-only HTML, little text",
      "        * 1.6 SUBJ_ALL_CAPS Subject in all capitals",
      "        * 1.3 MISSING_LIST_UNSUB No List-Unsubscribe header",
      "From: Inkwell Weekly <newsletter@inkwell.example>",
      "To: ops@northwind.example",
      "Subject: LAST CHANCE: 70% OFF EVERYTHING!!!",
      "Date: [[t-30]]",
      "Message-ID: <20261027093044.2f7d@inkwell.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=\"utf-8\"",
    ].join("\n"),
  },

  {
    id: "eml_01hx8ht9",
    minutesAgo: 21,
    direction: "inbound",
    from: { name: "Parcelwise", email: "support@parcelwise.example" },
    to: { name: "Accounts", email: "accounts@northwind.example" },
    subject: "Your parcel NW-4471 is delayed",
    status: { severity: "critical", label: "DMARC quarantine" },
    signals: { spf: "pass", dkim: "pass", dmarc: "fail", ptr: "pass", spam: "warn" },
    meta: {
      ip: "198.51.100.77",
      returnPath: "bounce@mail.parcelwise-mail.example",
      dkimDomain: "parcelwise-mail.example",
      tls: "TLSv1.2",
      mx: "mx1.parcelwise.example (5)",
      ptr: "mail.parcelwise-mail.example",
      spamScore: "3.4",
    },
    faults: [
      {
        id: "dmarc-alignment",
        severity: "critical",
        title: "DMARC alignment failed — message quarantined",
        detail:
          "SPF and DKIM both passed, but for parcelwise-mail.example, not for the From domain parcelwise.example. The domain's policy is p=quarantine with strict alignment, so the receiver held the message.",
        evidence: [
          {
            label: "Authentication-Results",
            raw:
              "spf=pass smtp.mailfrom=bounce@mail.parcelwise-mail.example;\n  dkim=pass header.d=parcelwise-mail.example;\n  dmarc=fail (p=quarantine sp=quarantine dis=none) header.from=parcelwise.example",
          },
          { label: "From", raw: "From: Parcelwise <support@parcelwise.example>" },
        ],
        fix:
          "Make the From domain and the signing domain the same. Either send as support@mail.parcelwise.example and sign with mail.parcelwise.example, or move DKIM to selectors under parcelwise.example. Relaxed alignment buys you subdomain flexibility; strict alignment does not.",
        code: {
          label: "DKIM record for the aligned selector",
          body:
            "_dmarc.parcelwise.example. 3600 IN TXT \"v=DMARC1; p=quarantine;\n  adkim=r; aspf=r; rua=mailto:dmarc@parcelwise.example\"",
        },
      },
      {
        id: "weak-dkim",
        severity: "warning",
        title: "DKIM key is 1024-bit",
        detail:
          "The signature verifies, but the key is below the 2048-bit floor most receivers now expect. Some will treat the signature as weak and ignore it entirely, which quietly removes one of your two alignment paths.",
        evidence: [
          {
            label: "Authentication-Results",
            raw: "dkim=pass (1024-bit key) header.d=parcelwise-mail.example",
          },
        ],
        fix:
          "Generate a 2048-bit key under a new selector, publish the DNS record, keep signing with both selectors for 48 hours, then retire the old one.",
      },
    ],
    headers: [
      "Return-Path: <bounce@mail.parcelwise-mail.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 3a4e",
      "        for <accounts@northwind.example>;",
      "        [[t]]",
      "Received: from mail.parcelwise-mail.example (mail.parcelwise-mail.example [198.51.100.77])",
      "        by mx.northwind.example with ESMTPS id 8c02",
      "        (TLSv1.2 with cipher ECDHE-RSA-AES256-GCM-SHA384)",
      "        for <accounts@northwind.example>;",
      "        [[t-19]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass smtp.mailfrom=bounce@mail.parcelwise-mail.example;",
      "       dkim=pass (1024-bit key) header.d=parcelwise-mail.example header.s=pw1;",
      "       dmarc=fail (p=quarantine sp=quarantine dis=none) header.from=parcelwise.example",
      "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=parcelwise-mail.example;",
      "        s=pw1; t=1793088910; h=from:to:subject:date:message-id;",
      "        bh=OWE4YzFlNmI3YjQ3; b=ZGVtby1zaWduYXR1cmUtMTAyNC1iaXQ",
      "From: Parcelwise <support@parcelwise.example>",
      "To: accounts@northwind.example",
      "Subject: Your parcel NW-4471 is delayed",
      "Date: [[t-24]]",
      "Message-ID: <20261027092351.8c02@mail.parcelwise-mail.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=\"utf-8\"",
    ].join("\n"),
  },

  {
    id: "eml_01hx8g7c",
    minutesAgo: 34,
    direction: "outbound",
    from: { name: "CloudDesk", email: "no-reply@clouddesk.example" },
    to: { name: "Operations", email: "ops@northwind.example" },
    subject: "Your workspace export is ready",
    status: { severity: "warning", label: "DMARC missing" },
    signals: { spf: "pass", dkim: "pass", dmarc: "none", ptr: "pass", spam: "pass" },
    meta: {
      ip: "192.0.2.140",
      returnPath: "no-reply@clouddesk.example",
      dkimDomain: "clouddesk.example",
      tls: "TLSv1.3",
      mx: "mx.clouddesk.example (10)",
      ptr: "outbound.clouddesk.example",
      spamScore: "0.8",
    },
    faults: [
      {
        id: "dmarc-missing",
        severity: "warning",
        title: "No DMARC record published",
        detail:
          "A query for _dmarc.clouddesk.example returns NXDOMAIN. SPF and DKIM are doing their jobs, but without a DMARC record a receiver has no instruction for what to do when they fail — so it guesses, and different receivers guess differently.",
        evidence: [
          {
            label: "Authentication-Results",
            raw:
              "spf=pass smtp.mailfrom=no-reply@clouddesk.example;\n  dkim=pass header.d=clouddesk.example",
          },
          { label: "DNS lookup", raw: "_dmarc.clouddesk.example. 3600 IN TXT  →  NXDOMAIN" },
        ],
        fix:
          "Publish a DMARC record at p=none with a reporting address, read the reports for two weeks, then move to quarantine and finally reject. Going straight to reject on a domain you have not measured is how legitimate mail disappears.",
        code: {
          label: "DNS TXT record",
          body:
            '_dmarc.clouddesk.example. 3600 IN TXT "v=DMARC1; p=none;\n  rua=mailto:dmarc@clouddesk.example; fo=1"',
        },
      },
    ],
    headers: [
      "Return-Path: <no-reply@clouddesk.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 5d70",
      "        for <ops@northwind.example>;",
      "        [[t]]",
      "Received: from outbound.clouddesk.example (outbound.clouddesk.example [192.0.2.140])",
      "        by mx.northwind.example with ESMTPS id 7a19",
      "        (TLSv1.3 with cipher TLS_AES_128_GCM_SHA256)",
      "        for <ops@northwind.example>;",
      "        [[t-31]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass (clouddesk.example designates 192.0.2.140 as permitted sender)",
      "        smtp.mailfrom=no-reply@clouddesk.example;",
      "       dkim=pass (2048-bit key) header.d=clouddesk.example header.s=cd2026;",
      "       dmarc=none (no DMARC record found)",
      "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=clouddesk.example;",
      "        s=cd2026; t=1793088137; h=from:to:subject:date:message-id;",
      "        bh=NmI3YjQ3ZjJk; b=ZGVtby1zaWduYXR1cmUtY2xvdWRkZXNr",
      "From: CloudDesk <no-reply@clouddesk.example>",
      "To: ops@northwind.example",
      "Subject: Your workspace export is ready",
      "Date: [[t-35]]",
      "Message-ID: <20261027091220.7a19@clouddesk.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=\"utf-8\"",
    ].join("\n"),
  },

  {
    id: "eml_01hx8fb1",
    minutesAgo: 47,
    direction: "inbound",
    from: { name: "Fintrack Alerts", email: "alerts@fintrack.example" },
    to: { name: "Operations", email: "ops@northwind.example" },
    subject: "Unusual login from a new device",
    status: { severity: "warning", label: "Bounce risk" },
    signals: { spf: "pass", dkim: "pass", dmarc: "pass", ptr: "fail", spam: "warn" },
    meta: {
      ip: "192.0.2.88",
      returnPath: "alerts@fintrack.example",
      dkimDomain: "fintrack.example",
      tls: "TLSv1.2",
      mx: "mx.fintrack.example (10)",
      ptr: "not set",
      spamScore: "2.9",
    },
    faults: [
      {
        id: "ptr-missing",
        severity: "warning",
        title: "Missing PTR record for the sending IP",
        detail:
          "192.0.2.88 has no reverse DNS entry. Automatic content filters weigh forward-confirmed reverse DNS heavily; without it, a message that authenticates correctly can still be deferred or filed as bulk.",
        evidence: [
          {
            label: "Received",
            raw:
              "from mail.fintrack.example (mail.fintrack.example [192.0.2.88])\n        by mx.northwind.example with ESMTPS id 44be",
          },
          { label: "DNS lookup", raw: "88.2.0.192.in-addr.arpa.  →  NXDOMAIN" },
        ],
        fix:
          "Ask the host to point the reverse record at mail.fintrack.example, then confirm that the forward lookup for that name returns the same IP. One without the other is worse than neither.",
        code: {
          label: "PTR record",
          body: "88.2.0.192.in-addr.arpa. 3600 IN PTR mail.fintrack.example.",
        },
      },
    ],
    headers: [
      "Return-Path: <alerts@fintrack.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 9e02",
      "        for <ops@northwind.example>;",
      "        [[t]]",
      "Received: from mail.fintrack.example (mail.fintrack.example [192.0.2.88])",
      "        by mx.northwind.example with ESMTPS id 44be",
      "        (TLSv1.2 with cipher ECDHE-RSA-AES128-GCM-SHA256)",
      "        for <ops@northwind.example>;",
      "        [[t-44]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass (fintrack.example designates 192.0.2.88 as permitted sender)",
      "        smtp.mailfrom=alerts@fintrack.example;",
      "       dkim=pass (2048-bit key) header.d=fintrack.example header.s=ft1;",
      "       dmarc=pass (p=reject sp=reject dis=none) header.from=fintrack.example",
      "From: Fintrack Alerts <alerts@fintrack.example>",
      "To: ops@northwind.example",
      "Subject: Unusual login from a new device",
      "Date: [[t-49]]",
      "Message-ID: <20261027085921.44be@fintrack.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=\"utf-8\"",
    ].join("\n"),
  },

  {
    id: "eml_01hx8dt4",
    minutesAgo: 58,
    direction: "inbound",
    from: { name: "Ledgerly Support", email: "help@ledgerly.example" },
    to: { name: "Accounts", email: "accounts@northwind.example" },
    subject: "Re: payment query 88213",
    status: { severity: "warning", label: "Reply-To mismatch" },
    signals: { spf: "pass", dkim: "pass", dmarc: "pass", ptr: "pass", spam: "pass" },
    meta: {
      ip: "203.0.113.24",
      returnPath: "help@ledgerly.example",
      dkimDomain: "ledgerly.example",
      tls: "TLSv1.3",
      mx: "mx1.ledgerly.example (10)",
      ptr: "mail.ledgerly.example",
      spamScore: "0.6",
    },
    faults: [
      {
        id: "reply-to",
        severity: "warning",
        title: "Replies would go to a different registrable domain",
        detail:
          "From is on ledgerly.example, Reply-To is on ledgerly-support.example. A help desk doing this on purpose is normal, but it also means anyone who hits reply is now talking to a domain that is not the one they verified. It matters most when other checks are already failing.",
        evidence: [
          { label: "From", raw: "From: Ledgerly Support <help@ledgerly.example>" },
          { label: "Reply-To", raw: "Reply-To: refunds@ledgerly-support.example" },
        ],
        fix:
          "Route replies through support.ledgerly.example instead — a subdomain you control, with its own SPF and DKIM — or keep Reply-To on ledgerly.example and sort mail internally.",
      },
    ],
    headers: [
      "Return-Path: <help@ledgerly.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 2b48",
      "        for <accounts@northwind.example>;",
      "        [[t]]",
      "Received: from mail.ledgerly.example (mail.ledgerly.example [203.0.113.24])",
      "        by mx.northwind.example with ESMTPS id 6c31",
      "        (TLSv1.3 with cipher TLS_AES_256_GCM_SHA384)",
      "        for <accounts@northwind.example>;",
      "        [[t-52]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass (ledgerly.example designates 203.0.113.24 as permitted sender)",
      "        smtp.mailfrom=help@ledgerly.example;",
      "       dkim=pass (2048-bit key) header.d=ledgerly.example header.s=ledgerly2026;",
      "       dmarc=pass (p=reject sp=reject dis=none) header.from=ledgerly.example",
      "From: Ledgerly Support <help@ledgerly.example>",
      "To: accounts@northwind.example",
      "Reply-To: refunds@ledgerly-support.example",
      "Subject: Re: payment query 88213",
      "Date: [[t-56]]",
      "Message-ID: <20261027084803.6c31@ledgerly.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=\"utf-8\"",
    ].join("\n"),
  },

  {
    id: "eml_01hx8cn7",
    minutesAgo: 72,
    direction: "inbound",
    from: { name: "Northwind IT", email: "it@northwind.example" },
    to: { name: "Operations", email: "ops@northwind.example" },
    subject: "Scheduled maintenance tonight, 23:00–01:00",
    status: { severity: "ok", label: "Clean" },
    signals: { spf: "pass", dkim: "pass", dmarc: "pass", ptr: "pass", spam: "pass" },
    meta: {
      ip: "203.0.113.5",
      returnPath: "it@northwind.example",
      dkimDomain: "northwind.example",
      tls: "TLSv1.3",
      mx: "mx.northwind.example (10)",
      ptr: "mx.northwind.example",
      spamScore: "0.1",
    },
    faults: [],
    headers: [
      "Return-Path: <it@northwind.example>",
      "Received: from mx.northwind.example (mx.northwind.example [203.0.113.5])",
      "        by inbox.northwind.example with LMTP id 8a15",
      "        for <ops@northwind.example>;",
      "        [[t]]",
      "Received: from mail.northwind.example (mail.northwind.example [203.0.113.5])",
      "        by mx.northwind.example with ESMTPS id 1d47",
      "        (TLSv1.3 with cipher TLS_AES_256_GCM_SHA384)",
      "        for <ops@northwind.example>;",
      "        [[t-6]]",
      "Authentication-Results: mx.northwind.example;",
      "       spf=pass (northwind.example designates 203.0.113.5 as permitted sender)",
      "        smtp.mailfrom=it@northwind.example;",
      "       dkim=pass (2048-bit key) header.d=northwind.example header.s=nw1;",
      "       dmarc=pass (p=reject sp=reject dis=none) header.from=northwind.example",
      "DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=northwind.example;",
      "        s=nw1; t=1793087320; h=from:to:subject:date:message-id;",
      "        bh=YjQ3ZjJkOWE4; b=ZGVtby1zaWduYXR1cmUtbm9ydGh3aW5k",
      "From: Northwind IT <it@northwind.example>",
      "To: ops@northwind.example",
      "Subject: Scheduled maintenance tonight, 23:00-01:00",
      "Date: [[t-8]]",
      "Message-ID: <20261027083331.1d47@northwind.example>",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=\"utf-8\"",
    ].join("\n"),
  },
];

export function getEmails(now = Date.now()) {
  return RECORDS.map((record) => {
    const receivedAt = new Date(now - record.minutesAgo * 60 * 1000);
    return {
      ...record,
      receivedAt,
      lastChecked: new Date(now - Math.max(0, record.minutesAgo - 1) * 60 * 1000),
      headers: fill(record.headers, receivedAt),
    };
  });
}

/* Two blocks the inspect dialog can load with one click. */
const SAMPLE_BASE = Date.now();

export const SAMPLES = {
  suspicious: fill(RECORDS.find((r) => r.id === "eml_01hx8jvq").headers, SAMPLE_BASE),
  clean: fill(RECORDS.find((r) => r.id === "eml_01hx8k2m").headers, SAMPLE_BASE),
};
