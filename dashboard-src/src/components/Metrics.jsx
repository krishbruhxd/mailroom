import { BASELINE } from "../data/mock.js";
import { IconAlert, IconClock, IconMail, IconShield } from "./ui.jsx";

function Meter({ children, label }) {
  return (
    <div className="mt-3 flex h-1.5 items-center gap-px overflow-hidden rounded-full bg-neutral-800" aria-hidden="true" title={label}>
      {children}
    </div>
  );
}

function Card({ label, value, suffix, hint, icon: Icon, iconClass, children }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-800 bg-[#111113] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.55)] transition-colors duration-200 hover:border-neutral-700">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.075em] text-neutral-400">
          {label}
        </span>
        <Icon className={`size-4 shrink-0 ${iconClass}`} />
      </div>

      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="text-[27px] font-semibold leading-none tracking-[-0.025em] tabular-nums text-neutral-100">
          {value}
        </span>
        {suffix ? (
          <span className="text-[14px] font-medium tabular-nums text-neutral-400">{suffix}</span>
        ) : null}
      </div>

      {children}

      <p className="mt-auto pt-2.5 text-[11.5px] leading-4 text-neutral-400">{hint}</p>
    </div>
  );
}

export default function Metrics({ emails }) {
  const added = emails.filter((email) => email.added);
  const scanned = BASELINE.scanned + added.length;
  const healthy = BASELINE.healthy + added.filter((email) => !email.faults.length).length;
  const healthyPct = (healthy / scanned) * 100;

  const critical = emails.filter((email) =>
    email.faults.some((fault) => fault.severity === "critical"),
  ).length;
  const withFaults = emails.filter((email) => email.faults.length).length;
  const warnings = withFaults - critical;
  const clean = emails.length - withFaults;

  return (
    <section aria-label="Summary metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Card
        label="Total scanned"
        value={scanned.toLocaleString("en-US")}
        icon={IconMail}
        iconClass="text-neutral-600"
        hint={`Last 24 hours · ${emails.length} messages in the current feed`}
      >
        <div className="mt-3 flex h-1.5 gap-px overflow-hidden rounded-full bg-neutral-800" aria-hidden="true">
          <span className="h-full flex-[3] bg-neutral-800" />
          <span className="h-full flex-[5] bg-neutral-700" />
          <span className="h-full flex-[2] bg-neutral-100" />
        </div>
      </Card>

      <Card
        label="Healthy deliverability"
        value={healthyPct.toFixed(1)}
        suffix="%"
        icon={IconShield}
        iconClass="text-emerald-400/70"
        hint={`${healthy.toLocaleString("en-US")} of ${scanned.toLocaleString("en-US")} passed every check`}
      >
        <Meter label={`${healthyPct.toFixed(1)} percent healthy`}>
          <span
            className="h-full rounded-full bg--500/80 transition-[width] duration-500"
            style={{ width: `${healthyPct}%` }}
          />
        </Meter>
      </Card>

      <Card
        label="Active issues"
        value={withFaults}
        icon={IconAlert}
        iconClass="text-amber-500/80"
        hint={
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-red-400" aria-hidden="true" />
              {critical} critical
            </span>
            <span className="text-neutral-600" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
              {warnings} warning{warnings === 1 ? "" : "s"}
            </span>
          </span>
        }
      >
        <Meter label={`${critical} critical and ${warnings} warning messages`}>
          {critical > 0 ? <span className="h-full bg-red-400" style={{ flexGrow: critical }} /> : null}
          {warnings > 0 ? <span className="h-full bg-amber-400" style={{ flexGrow: warnings }} /> : null}
          {clean > 0 ? <span className="h-full bg-neutral-800" style={{ flexGrow: clean }} /> : null}
        </Meter>
      </Card>

      <Card
        label="Critical failures"
        value={critical}
        icon={IconClock}
        iconClass="text-red-400/80"
        hint="Held or rejected by receiver policy"
      >
        <div className="mt-3 flex h-1.5 items-center gap-1" aria-hidden="true">
          {emails.map((email) => {
            const isCritical = email.faults.some((fault) => fault.severity === "critical");
            return (
              <span
                key={email.id}
                className={
                  "h-1.5 flex-1 rounded-full " +
                  (isCritical ? "bg-red-400" : email.faults.length ? "bg-amber-300" : "bg-neutral-800")
                }
              />
            );
          })}
        </div>
      </Card>
    </section>
  );
}
