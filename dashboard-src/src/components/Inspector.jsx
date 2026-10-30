import { useId, useRef, useState } from "react";
import {
  CopyButton,
  IconCheck,
  IconChevron,
  IconClock,
  IconShield,
  SeverityDot,
  StatusPill,
  fullTime,
  relativeTime,
  severityText,
  timeOfDay,
} from "./ui.jsx";

/* ------------------------------------------------------------------ *
 * Signals
 * ------------------------------------------------------------------ */

const SIGNAL_LABELS = { spf: "SPF", dkim: "DKIM", dmarc: "DMARC", ptr: "rDNS", spam: "Spam" };

const VERDICTS = {
  pass: { severity: "ok", text: "pass" },
  fail: { severity: "critical", text: "fail" },
  warn: { severity: "warning", text: "warn" },
  none: { severity: "warning", text: "none" },
  unknown: { severity: "none", text: "not checked" },
};

function SignalChip({ name, value }) {
  const verdict = VERDICTS[value] || VERDICTS.unknown;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-[#111113] px-1.5 py-1 text-[10.5px] text-neutral-400">
      <SeverityDot severity={verdict.severity} />
      <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.05em] text-neutral-400">
        {SIGNAL_LABELS[name] || name}
      </span>
      <span className="text-neutral-300">{verdict.text}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

function Field({ label, value }) {
  const text = value || "not recorded";
  return (
    <div className="min-w-0 bg-[#0d0d0f] px-3 py-2.5">
      <dt className="text-[9.5px] font-medium uppercase tracking-[0.07em] text-neutral-400">{label}</dt>
      <dd className="mt-1 truncate font-mono text-[11.5px] leading-4 text-neutral-200" title={text}>
        {text}
      </dd>
    </div>
  );
}

function Overview({ record }) {
  const meta = record.meta || {};
  const signals = Object.entries(record.signals || {});
  return (
    <section aria-labelledby="overview-heading">
      <div className="flex items-baseline justify-between">
        <h3
          id="overview-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.09em] text-neutral-400"
        >
          Overview
        </h3>
        <span className="font-mono text-[10px] text-neutral-400">{record.direction || "inbound"}</span>
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-neutral-800 bg-neutral-800 sm:grid-cols-2 xl:grid-cols-1">
        <Field label="Sender IP" value={meta.ip} />
        <Field label="Return-Path" value={meta.returnPath} />
        <Field label="DKIM domain" value={meta.dkimDomain} />
        <Field label="TLS version" value={meta.tls} />
        <div className="col-span-1 min-w-0 bg-[#0d0d0f] px-3 py-2.5 sm:col-span-2">
          <dt className="text-[9.5px] font-medium uppercase tracking-[0.07em] text-neutral-400">
            Signals
          </dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {signals.map(([name, value]) => (
              <SignalChip key={name} name={name} value={value} />
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Faults
 * ------------------------------------------------------------------ */

function EvidenceBlock({ item }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-800 bg-[#111113]">
      <div className="border-b border-neutral-800 bg-neutral-900/40 px-2.5 py-1">
        <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.07em] text-neutral-400">
          {item.label}
        </span>
      </div>
      <pre className="overflow-x-auto whitespace-pre px-2.5 py-1.5 font-mono text-[10.5px] leading-[1.6] text-neutral-400">
        {item.raw}
      </pre>
    </div>
  );
}

function CodeBlock({ code }) {
  return (
    <div className="mt-2.5 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-2.5 py-1">
        <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.07em] text-neutral-400">
          {code.label}
        </span>
        <CopyButton text={code.body} label="Copy" className="-mr-1 h-6" />
      </div>
      <pre className="overflow-x-auto whitespace-pre px-2.5 py-2 font-mono text-[10.5px] leading-[1.65] text-neutral-300">
        {code.body}
      </pre>
    </div>
  );
}

function FaultItem({ fault, defaultOpen, index }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <li
      data-testid="fault"
      className="overflow-hidden rounded-lg border border-neutral-800 bg-[#111113] transition-colors hover:border-neutral-700"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400/60"
      >
        <SeverityDot severity={fault.severity} className="mt-[7px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium leading-5 text-neutral-100">
            {fault.title}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px]">
            <span className={"font-medium uppercase tracking-[0.06em] " + severityText(fault.severity)}>
              {fault.severity === "critical" ? "Critical" : "Warning"}
            </span>
            <span className="text-neutral-600" aria-hidden="true">/</span>
            <span className="text-neutral-400">
              {fault.evidence && fault.evidence.length
                ? `${fault.evidence.length} header line${fault.evidence.length === 1 ? "" : "s"}`
                : "no evidence line"}
            </span>
          </span>
        </span>
        <IconChevron
          className={
            "mt-0.5 size-4 shrink-0 text-neutral-400 transition-transform duration-200 " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-neutral-800 px-3.5 pb-3.5 pt-3">
          <p className="max-w-[72ch] text-[12px] leading-[1.6] text-neutral-400">{fault.detail}</p>

          {fault.evidence && fault.evidence.length ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.07em] text-neutral-400">
                What the headers say
              </p>
              <div className="space-y-1.5">
                {fault.evidence.map((item, itemIndex) => (
                  <EvidenceBlock key={`${index}-${itemIndex}`} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400">
              <IconShield className="size-3.5 text-neutral-400" />
              How to fix it
            </p>
            <p className="mt-1.5 max-w-[72ch] text-[12px] leading-[1.6] text-neutral-300">{fault.fix}</p>
            {fault.code ? <CodeBlock code={fault.code} /> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function CleanPanel({ record }) {
  const signals = record.signals || {};
  const unknown = Object.values(signals).some((value) => value === "unknown");
  const passed = Object.values(signals).filter((value) => value === "pass").length;
  const total = Object.keys(signals).length;

  return (
    <div className="rounded-lg border border-emerald-500/30 bg--500/[0.06] p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#111113] ring-1 ring-emerald-200">
          <IconCheck className="size-4 text-emerald-400" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-emerald-100">No faults detected</p>
          <p className="mt-1 max-w-[60ch] text-[12px] leading-[1.6] text-emerald-200/75">
            Nothing in this message contradicts itself.{" "}
            {unknown
              ? "The checks that could run locally passed; DNS and spam reputation were not queried."
              : `${passed} of ${total} signals came back clean, including SPF, DKIM and DMARC alignment.`}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(signals).map(([name, value]) => (
          <SignalChip key={name} name={name} value={value} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Raw headers
 * ------------------------------------------------------------------ */

const RESULT_TOKEN = /((?:spf|dkim|dmarc)=(?:pass|fail|softfail|none|neutral|temperror|permerror))/gi;
const RESULT_PARTS = /^(spf|dkim|dmarc)=(pass|fail|softfail|none|neutral|temperror|permerror)$/i;

function HighlightValue({ value }) {
  const parts = value.split(RESULT_TOKEN);
  return parts.map((part, index) => {
    const match = part.match(RESULT_PARTS);
    if (!match) return <span key={index}>{part}</span>;
    const verdict = match[2].toLowerCase();
    const tone =
      verdict === "pass"
        ? "text-emerald-400"
        : verdict === "none" || verdict === "neutral"
          ? "text-amber-400"
          : "text-red-400";
    return (
      <span key={index} className={"font-medium " + tone}>
        {part}
      </span>
    );
  });
}

function HeaderLine({ line }) {
  const match = line.match(/^([A-Za-z][A-Za-z0-9-]*):[ \t]?(.*)$/);
  if (!match) {
    return <span className="text-neutral-400">{line || " "}</span>;
  }
  return (
    <>
      <span className="font-medium text-neutral-100">{match[1]}</span>
      <span className="text-neutral-400">: </span>
      <span className="text-neutral-400">
        <HighlightValue value={match[2]} />
      </span>
    </>
  );
}

function RawHeaders({ record }) {
  const text = String(record.headers || "").replace(/\r\n?/g, "\n").replace(/\n$/, "");
  const lines = text.split("\n");

  return (
    <section aria-label="Raw message headers" data-testid="raw-headers">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <p className="text-[11px] text-neutral-400">
          <span className="font-mono tabular-nums">{lines.length}</span> lines · full header block
        </p>
        <CopyButton text={text} label="Copy headers" />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-[#111113]">
        <div className="max-h-[520px] overflow-auto">
          <div className="min-w-max py-2">
            {lines.map((line, index) => (
              <div key={index} className="flex hover:bg-neutral-900">
                <span
                  aria-hidden="true"
                  className="w-10 shrink-0 select-none pr-2.5 text-right font-mono text-[10px] leading-[1.75] text-neutral-600"
                >
                  {index + 1}
                </span>
                <span className="whitespace-pre pr-5 font-mono text-[11px] leading-[1.75]">
                  <HeaderLine line={line} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10.5px] leading-4 text-neutral-400">
        The block as it arrived. Mailroom reads it locally; no header is sent anywhere.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Inspector
 * ------------------------------------------------------------------ */

const TABS = [
  { id: "diagnostic", label: "Diagnostic" },
  { id: "raw", label: "Raw headers" },
];

export default function Inspector({ record, now }) {
  const [tab, setTab] = useState("diagnostic");
  const tabRefs = useRef({});
  const baseId = useId();

  const critical = record.faults.filter((fault) => fault.severity === "critical").length;
  const warnings = record.faults.length - critical;

  const report = [
    "Mailroom diagnostic",
    "",
    "Subject: " + record.subject,
    "From: " + record.from.name + " <" + record.from.email + ">",
    "To: " + record.to.email,
    "Received: " + fullTime(record.receivedAt),
    "Status: " + record.status.label,
    "",
    "Sender IP: " + (record.meta?.ip || "not recorded"),
    "Return-Path: " + (record.meta?.returnPath || "not recorded"),
    "DKIM domain: " + (record.meta?.dkimDomain || "not recorded"),
    "TLS: " + (record.meta?.tls || "not recorded"),
    "",
    record.faults.length ? "Findings (" + record.faults.length + "):" : "Findings: none",
    ...record.faults.flatMap((fault) => [
      "",
      "- [" + fault.severity + "] " + fault.title,
      "  " + fault.detail,
      "  Fix: " + fault.fix,
    ]),
  ].join("\n");

  function onTabKeyDown(event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = tab === "diagnostic" ? "raw" : "diagnostic";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      aria-label="Diagnostic inspector"
      data-testid="inspector"
      className="overflow-hidden rounded-xl border border-neutral-800 bg-[#111113] shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill severity={record.status.severity}>{record.status.label}</StatusPill>
            <span className="text-[10.5px] text-neutral-400">
              {timeOfDay(record.receivedAt)} UTC · {relativeTime(record.receivedAt, now)}
            </span>
          </div>

          <h2 className="mt-2 text-[15px] font-semibold leading-5 tracking-[-0.01em] text-neutral-100">
            {record.subject}
          </h2>

          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-neutral-400">
            <span className="max-w-full truncate">{record.from.name}</span>
            <span className="font-mono text-[10.5px] text-neutral-400">&lt;{record.from.email}&gt;</span>
            <span aria-hidden="true" className="text-neutral-600">→</span>
            <span className="max-w-full truncate font-mono text-[10.5px] text-neutral-400">
              {record.to.email}
            </span>
          </p>
        </div>

        <div className="-mr-1 -mt-1 shrink-0">
          <CopyButton text={report} label="Copy report" />
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Inspector view"
        onKeyDown={onTabKeyDown}
        className="mt-3 flex gap-4 border-b border-neutral-800 px-4 sm:px-5"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={active ? 0 : -1}
              data-testid={`tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={
                "-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 " +
                (active
                  ? "border-neutral-900 text-neutral-100"
                  : "border-transparent text-neutral-400 hover:border-neutral-800 hover:text-neutral-200")
              }
            >
              {item.label}
              {item.id === "diagnostic" && record.faults.length ? (
                <span
                  className={
                    "rounded-full px-1.5 py-px font-mono text-[9.5px] tabular-nums " +
                    (critical ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-300")
                  }
                >
                  {record.faults.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "diagnostic" ? (
        <div
          key={record.id + "-diagnostic"}
          role="tabpanel"
          id={`${baseId}-panel-diagnostic`}
          aria-labelledby={`${baseId}-tab-diagnostic`}
          className="animate-report px-4 py-4 sm:px-5"
        >
          <div className="xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-7">
            <Overview record={record} />

            <div className="mt-5 xl:mt-0">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.09em] text-neutral-400">
                  Detected faults
                </h3>
                {record.faults.length ? (
                  <span className="text-[10.5px] text-neutral-400">
                    {critical} critical · {warnings} warning{warnings === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-400">
                    <IconCheck className="size-3" /> all clear
                  </span>
                )}
              </div>

              {record.faults.length ? (
                <ul className="mt-2 space-y-2">
                  {record.faults.map((fault, index) => (
                    <FaultItem
                      key={fault.id + "-" + index}
                      fault={fault}
                      index={index}
                      defaultOpen={index === 0}
                    />
                  ))}
                </ul>
              ) : (
                <div className="mt-2">
                  <CleanPanel record={record} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-neutral-800 pt-3 text-[10.5px] text-neutral-400">
            <IconClock className="size-3.5 shrink-0" />
            <span>Checked {fullTime(record.lastChecked)}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>
              {record.source === "pasted"
                ? "Static analysis of the pasted block; DNS was not queried."
                : "Demo record; findings are hand-authored."}
            </span>
          </div>
        </div>
      ) : (
        <div
          key={record.id + "-raw"}
          role="tabpanel"
          id={`${baseId}-panel-raw`}
          aria-labelledby={`${baseId}-tab-raw`}
          className="animate-report px-4 py-4 sm:px-5"
        >
          <RawHeaders record={record} />
        </div>
      )}
    </section>
  );
}
