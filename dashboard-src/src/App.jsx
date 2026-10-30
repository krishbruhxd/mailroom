import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Inspector from "./components/Inspector.jsx";
import InspectDialog from "./components/InspectDialog.jsx";
import Metrics from "./components/Metrics.jsx";
import Queue from "./components/Queue.jsx";
import { IconCheck, IconShield, timeOfDay } from "./components/ui.jsx";
import { getEmails } from "./data/mock.js";
import { analyze, parseHeaders, parseReceived, statusLabel, tlsVersion } from "./lib/analyze.js";

function firstValue(headers, name) {
  const found = headers.find((header) => header.name === name);
  return found ? found.value : "";
}

function buildRecord(raw, analysis) {
  const headers = parseHeaders(raw);
  const result = analysis.result;

  const signature = firstValue(headers, "dkim-signature");
  const dkimDomain = (signature.match(/\bd=([^;\s]+)/i) || [])[1] || "";

  const received = headers.filter((header) => header.name === "received").map(parseReceived);
  const receivedIp = [...received].reverse().map((hop) => hop.ip).find(Boolean) || "";
  const spfHeader = firstValue(headers, "received-spf");
  const clientIp = (spfHeader.match(/client-ip=([^;\s]+)/i) || [])[1] || "";

  return {
    id: "eml_" + Date.now().toString(36),
    added: true,
    source: "pasted",
    direction: "manual",
    minutesAgo: 0,
    receivedAt: new Date(),
    lastChecked: new Date(),
    from: {
      name: result.from.name || result.from.email || "Unknown sender",
      email: result.from.email || "unknown",
    },
    to: {
      name: result.to.name || "Mailbox",
      email: result.to.email || "unknown",
    },
    subject: result.subject || "(no subject)",
    status: {
      severity: analysis.severity,
      label: statusLabel(analysis.faults),
    },
    signals: {
      spf: result.auth.spf || "unknown",
      dkim: result.auth.dkim || "unknown",
      dmarc: result.auth.dmarc || "unknown",
      ptr: "unknown",
      spam: "unknown",
    },
    meta: {
      ip: receivedIp || clientIp || "not recorded",
      returnPath: result.returnPath.email || "not present",
      dkimDomain: dkimDomain || "not signed",
      tls: tlsVersion(headers) || "not recorded",
    },
    faults: analysis.faults,
    headers: raw,
  };
}

function shorten(text, max = 38) {
  if (!text) return "message";
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export default function App() {
  const [emails, setEmails] = useState(() => getEmails());
  const [selectedId, setSelectedId] = useState(() => emails[0]?.id || null);
  const [now, setNow] = useState(() => Date.now());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const handleAdd = useCallback(
    (raw, analysis) => {
      const record = buildRecord(raw, analysis);
      setEmails((current) => [record, ...current]);
      setSelectedId(record.id);
      setNow(Date.now());
      showToast(
        record.faults.length
          ? `Added “${shorten(record.subject)}” — ${record.faults.length} finding${record.faults.length === 1 ? "" : "s"}`
          : `Added “${shorten(record.subject)}” — no faults found`,
      );
    },
    [showToast],
  );

  const handleDiagnose = useCallback(() => {
    const target = emails.find((email) => email.id === selectedId);
    if (!target) return;

    const stamp = new Date();
    const severity = target.faults.length
      ? target.faults.some((fault) => fault.severity === "critical")
        ? "critical"
        : "warning"
      : "ok";

    setEmails((current) =>
      current.map((email) =>
        email.id === target.id
          ? { ...email, lastChecked: stamp, status: { ...email.status, severity } }
          : email,
      ),
    );
    setNow(stamp.getTime());

    showToast(
      target.faults.length
        ? `Re-checked “${shorten(target.subject)}” — ${target.faults.length} finding${
            target.faults.length === 1 ? "" : "s"
          }, no change`
        : `Re-checked “${shorten(target.subject)}” — no faults found`,
    );
  }, [emails, selectedId, showToast]);

  const selected = emails.find((email) => email.id === selectedId) || emails[0] || null;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-neutral-100">
      <Header
        onInspect={() => setDialogOpen(true)}
        onDiagnose={handleDiagnose}
        updatedAt={now}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-neutral-100">
                Deliverability overview
              </h1>
              <span className="rounded border border-neutral-800 bg-[#111113] px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                northwind.example
              </span>
            </div>
            <p className="mt-1 text-[12px] text-neutral-400">
              Inbound and outbound mail · last 24 hours
            </p>
          </div>

          <p className="inline-flex items-center gap-1.5 pb-0.5 text-[10.5px] text-neutral-400" aria-live="polite">
            <span aria-hidden="true" className="size-1.5 rounded-full bg--500" />
            Last refreshed {timeOfDay(now)} UTC
          </p>
        </div>

        <div className="mt-4">
          <Metrics emails={emails} />
        </div>

        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
          <Queue emails={emails} selectedId={selectedId} onSelect={setSelectedId} now={now} />

          {selected ? (
            <Inspector key={selected.id} record={selected} now={now} />
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-700 bg-[#111113] p-10 text-center text-[12.5px] text-neutral-400">
              Select a message from the queue to inspect it.
            </div>
          )}
        </div>

        <footer className="mt-6 flex flex-col gap-1.5 border-t border-neutral-800 pt-4 text-[10.5px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Demo data. Addresses use the reserved{" "}
            <span className="font-mono text-neutral-400">.example</span> TLD; no live DNS lookups.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <IconShield className="size-3.5" />
            Every finding quotes the header line behind it.
          </p>
        </footer>
      </main>

      {dialogOpen ? (
        <InspectDialog onClose={() => setDialogOpen(false)} onAdd={handleAdd} />
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
        >
          <div className="animate-dialog flex max-w-lg items-center gap-2 rounded-lg border border-white/10 bg-[#1b1b1f] px-3 py-2 text-[12px] text-neutral-100 shadow-[0_10px_36px_rgba(0,0,0,0.22)]">
            <IconCheck className="size-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{toast}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
