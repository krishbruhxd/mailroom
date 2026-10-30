import { Button, IconMail, IconRefresh, timeOfDay } from "./ui.jsx";

export default function Header({ onInspect, onDiagnose, updatedAt }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#0a0a0b]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[#0a0a0b]/70">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2.5 px-4 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-neutral-100 text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
            <IconMail className="size-[15px]" />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-100">
            Mailroom
          </span>
          <span className="hidden text-[11px] font-normal text-neutral-400 sm:inline">
            Diagnostics
          </span>
        </div>

        <span className="ml-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg--500/10 px-2 py-[3px] text-[10.5px] font-medium text-emerald-300">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg--500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          />
          <span className="hidden sm:inline">Live Monitoring</span>
          <span className="sm:hidden">Live</span>
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-[11px] text-neutral-400 lg:flex">
            <span className="font-mono text-[10.5px] text-neutral-400">northwind.example</span>
            <span className="text-neutral-600" aria-hidden="true">/</span>
            <span className="tabular-nums">{timeOfDay(updatedAt)} UTC</span>
          </span>

          <Button
            variant="secondary"
            onClick={onDiagnose}
            title="Re-run the diagnostic on the selected message"
            aria-label="Run diagnostic on the selected message"
            className="px-2.5 sm:px-3"
          >
            <IconRefresh className="size-3.5" />
            <span className="hidden sm:inline">Run diagnostic</span>
          </Button>

          <Button
            variant="primary"
            onClick={onInspect}
            aria-label="Inspect a new email"
            className="px-2.5 sm:px-3"
          >
            <IconMail className="size-3.5" />
            <span className="hidden sm:inline">Inspect new email</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
