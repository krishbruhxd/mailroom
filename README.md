# Mailroom

A header analyzer for suspicious email, plus a diagnostics dashboard built on the same checks.

Paste the raw headers from a message — or drop in the `.eml` file your mail client saved — and
it shows what the message says about where it came from: the address you see, the address
bounces return to, who vouched for the sender, and the route it travelled — quoting the exact
header lines behind every claim.

It runs entirely in the browser. There is no server, no build step for the analyzer, and nothing
you paste or drop leaves the page.

**Live:** https://krishbruhxd.github.io/mailroom/ (dashboard at `/dashboard/`)

The Pages URL follows the repository name exactly, so it is all lowercase now that the repo
is `mailroom`.

## Layout

```
index.html          the analyzer — one file, no dependencies
dashboard/          the dashboard, pre-built for GitHub Pages
dashboard-src/      the dashboard source (React 19 + Vite 7 + Tailwind 4)
```

## Run it

Analyzer: open `index.html` in a browser. That's the whole setup.

Dashboard:

```bash
cd dashboard-src
npm install
npm run dev
```

Rebuild it after changes, then copy `dashboard-src/dist/*` into `dashboard/`:

```bash
cd dashboard-src
npm run build
```

Files are read locally with the browser's File API, and the body is discarded at the first
blank line, so only the header block is ever held in the page.

## Publish it

Pages serves `main` from the repository root, so `dashboard/` is already in place — no build
step on the server. After changing the dashboard source, rebuild and commit both folders.

## What it checks

| Check | What a failure means |
| --- | --- |
| Return-Path vs From | The message returns to a different organisation than the one it names. |
| SPF, DKIM, DMARC | The receiving server recorded that the sender's claim was not authorised. |
| Reply-To | Replies would go to a different domain. Usually innocent; suspicious next to a failed SPF. |
| Lookalike domain | The sender's domain imitates a known brand using digit, character or subdomain tricks. |
| Message-ID | The message was stamped by a different domain than the sender (common with sending platforms). |
| Route timing | Hops are out of chronological order, which is what hand-edited headers look like. |

## What it can't do

- It doesn't look at links, attachments or the body.
- Passing authentication proves a domain sent the message, not that the domain is honest
  or that the account wasn't compromised.
- Header blocks can be written by hand. A clean report is not a clean email.

These limits are stated in the page footer on purpose. Knowing where a tool stops is part
of the tool.

## Real-world test

Checked by hand against a genuine Steam receipt saved as `.eml` from Gmail. The file loaded
with the body discarded, both addresses resolved to the same domain, and the verdict was
"nothing contradicts the message" — the expected result for a real transactional email.

One message is not a test suite. That is why the parser tests and an accuracy corpus are on
the roadmap rather than in the "done" column.

## Explaining it in an interview

Sixty seconds, in this order:

1. **The problem.** People are told to "check the headers" and are handed forty lines of
   routing data. Almost nobody can read them, so they give up and trust the display name.
2. **The idea.** An email has two return addresses — the one you see, and the envelope the
   servers actually used. Phishing usually works because those two disagree. Mailroom
   compares them and shows the disagreement in plain English.
3. **The engineering.** Parsing RFC 5322 by hand: unfolding continuation lines, splitting
   the header block from the body, pulling IPs and timestamps out of `Received` chains,
   reading `Authentication-Results`, and detecting lookalike domains with unicode folding
   plus edit distance.
4. **The judgement.** No risk score out of 100. Every finding quotes the line it came from,
   because a security tool that asks for trust while providing no evidence is the thing
   it's supposed to be protecting you from.
5. **The limits.** Say what it can't see before you're asked. It reads headers, not content,
   and authentication passing doesn't make a message honest.

## If you want to take it further

In rough order of how much they'd add:

- Resolve the sending domain's SPF and DMARC records live, and check whether the originating
  IP is inside the declared range. That turns "the domain looks wrong" into "this IP was
  never allowed to send for this domain."
- Reverse-DNS the originating IP and show whether the hostname matches the domain that
  claims to have sent it.
- A small API in Python so other tools can call the same checks, plus tests for the parser.
  The parser is the part worth testing — real headers are messy in ways samples aren't.

## Design notes

Same palette as the dashboard: near-black canvas, raised cards, 1px rules, and colour used
only for the three verdicts. The report is built around one comparison — the letterhead you
see against the envelope it bounces from — with a `=` / `≠` bridge between them. Findings
stagger in, the raw block highlights `spf=`/`dkim=`/`dmarc=` results in place, and
Ctrl/⌘ + Enter runs the analysis without reaching for the mouse. A dropped `.eml` is cut at
the first blank line, so the body is discarded before any check runs.

## Structure

One file, three parts: the markup for the intake and the report skeleton, a CSS block whose
tokens sit at the top, and a script organised as parse → check → render. The checks are
plain functions returning `{state, title, why, evidence}`, so adding a check means adding a
function and pushing it onto the list.
