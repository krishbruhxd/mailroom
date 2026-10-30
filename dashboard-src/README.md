# Mailroom — Diagnostics

A dashboard for the [Mailroom](../mailroom/) header analyzer. It shows a queue of incoming
mail, a health summary at the top, and a diagnostic panel for whichever message you select.
Each finding quotes the header line it came from and explains the DNS or header change that
would fix it.

This is the portfolio version of the idea: the same checks, presented the way a real
operations console would present them. The plain single-file analyzer still lives next door
and still works.

## Run it

You need [Node.js](https://nodejs.org) installed. Then, in this folder:

```bash
npm install
npm run dev
```

Open the address it prints, usually `http://localhost:5173`. The page reloads when you save a
file.

To see the production build:

```bash
npm run build
npm run preview
```

## Publish it

This lives inside the main `mailroom` repository. GitHub Pages serves the repository root, so
the built app is copied into the sibling `dashboard/` folder rather than published on its own.

`vite.config.js` sets `base: "./"`, which is the part people usually get wrong in a subfolder.

```bash
npm run build
xcopy /E /Y dist\* ..\dashboard\
```

Commit `dashboard/`, `dashboard-src/` and `index.html` together so the live site and the source
never drift apart. Live at `https://krishbruhxd.github.io/Mailroom/dashboard/`.

## What is real and what is demo

Worth knowing before you show it to anyone.

| Part | Real or demo |
| --- | --- |
| **Inspect new email** | Real. It runs the ported analyzer over the header block you paste — parsing, SPF/DKIM/DMARC reading, Return-Path comparison, lookalike domains, route ordering. The findings you see are produced from your text, in the browser. |
| **The queue on first load** | Demo. Eight hand-written messages on the reserved `.example` domain, chosen to cover the states the UI needs to render. |
| **Run diagnostic** | Demo. It re-derives severity from the existing findings, updates the "Checked" time, and shows a toast. Nothing is fetched. |
| **DNS and reputation** | Not performed. SPF and DMARC records are read from the headers that already recorded them, not looked up. The UI says so in the panel footer. |

Nothing you paste leaves the page. There is no backend and no analytics.

## The demo messages

Six of the eight have findings, two are clean:

- A clean billing notice.
- An SPF hard fail where the envelope domain doesn't match the letterhead.
- A spam-score alert (`X-Spam-Status` above threshold).
- A DMARC alignment failure that got the message quarantined, plus a 1024-bit DKIM key.
- A domain with no DMARC record, a missing PTR record, and a Reply-To on another domain.
- A clean internal maintenance notice.

The metrics at the top count *messages*, not faults: 6 of 8 have something wrong, 2 of those
are critical. The healthy percentage is against a stated baseline of 1,284 scanned messages,
so it moves by a tenth of a percent when you add one — which is what a real 24-hour window
does.

## Design notes

The brief was a quiet console, not a security-theatre dashboard.

- **No risk score.** A score out of 100 invites people to argue with the number instead of
  reading the evidence. Every fault lists the header lines behind it and how to fix it.
- **Dark by default.** A near-black canvas (`#0a0a0b`), cards one step up (`#111113`) and
  1px `#26262a` rules. No gradients and no glow, so colour is reserved for findings.
- **Colour carries one meaning each.** Emerald for passed, amber for needs a look, muted red
  for failed. Everything else is neutral, so a red row is the only red thing on screen.
- **Type does the ranking.** Sans for interface copy, monospace for anything that came out of
  a header. Numbers are tabular so columns line up.
- **Body copy is capped at a readable measure.** On wide screens the overview moves into a
  300px sidebar so the explanation column never runs the full width of the monitor.
- **Accessibility is checked, not assumed.** Every text/background pair was measured against
  WCAG AA; the build has no failing pairs at 1440px, 375px, or in the modal. Focus rings are
  visible, the modal traps focus and returns it on close, and all motion respects
  `prefers-reduced-motion`.

## Explaining it in an interview

Sixty seconds, in this order:

1. **The problem.** "Check the headers" is advice nobody can follow. Forty lines of routing
   data, and the person reading it is already suspicious and in a hurry.
2. **The idea.** An email carries two identities: the one on the envelope the servers used,
   and the one in the letterhead the reader sees. Phishing lives in the gap. Mailroom puts
   those side by side and quotes the lines that disagree.
3. **The build.** RFC 5322 parsing by hand — unfolding continuation lines, separating headers
   from body, pulling IPs and timestamps out of `Received` chains, reading
   `Authentication-Results` — then a React interface over the results with a real analyzer
   behind the "inspect" action.
4. **The judgement.** No score, no invented confidence. Every claim is traceable to a header
   line, and every fault ends with the DNS record or header change that would resolve it. A
   security tool that asks for trust without evidence is the thing it's meant to protect you
   from.
5. **The limits.** It reads headers, not bodies or links. Passing authentication proves a
   domain sent the message, not that the domain is trustworthy. It says both in the UI.

## Structure

```
src/
  App.jsx                  state, metrics wiring, toast
  components/
    Header.jsx             title, live badge, actions
    Metrics.jsx            the four summary cards
    Queue.jsx              filters, search, message rows
    Inspector.jsx          overview, faults, evidence, raw headers
    InspectDialog.jsx      paste-and-analyze modal
    ui.jsx                 icons, buttons, pills, copy helper
  data/mock.js             demo messages, faults, evidence, fixes
  lib/analyze.js           the analyzer ported from the single-file tool
  index.css                theme fonts, scrollbars, motion
```

The analyzer returns findings as `{severity, title, detail, evidence[], fix, code}`. Adding a
check means adding a function that returns that shape — the UI renders anything that fits.

## If you want to take it further

In rough order of how much they would add:

- **Look up the records live** over DNS-over-HTTPS: fetch the domain's SPF and DMARC TXT
  records and check whether the sending IP is inside the declared range. That turns "the
  record doesn't match" into "this IP was never allowed to send for this domain."
- **Tests for the parser.** Real headers are messier than any sample: broken folds, duplicate
  fields, `Received` chains that loop. A table of awkward inputs and expected output is the
  most credible thing you can add to this project.
- **A labelled corpus.** Run it over a set of known phishing and known-good messages and
  report precision and recall per check. That is the difference between a demo and a tool.
- **A small Python API** so the same checks can be called by other systems, with the React
  app as one client among several.
