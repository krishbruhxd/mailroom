import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ *
 * Icons — one family, 1.6 stroke, 16px grid. No icon dependency.
 * ------------------------------------------------------------------ */

function Svg({ children, className = "size-4", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconMail(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.8 7 8.2 5.6L20.2 7" />
    </Svg>
  );
}

export function IconShield(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 19 6v5.2c0 4-2.9 7.4-7 9.3-4.1-1.9-7-5.3-7-9.3V6l7-2.5Z" />
      <path d="m9 11.8 2.1 2.1L15 10" />
    </Svg>
  );
}

export function IconAlert(props) {
  return (
    <Svg {...props}>
      <path d="M10.3 4.6 2.9 17.2A1.9 1.9 0 0 0 4.6 20h14.8a1.9 1.9 0 0 0 1.7-2.8L13.7 4.6a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9.4v4.4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconClock(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6V12l2.9 1.8" />
    </Svg>
  );
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

export function IconCopy(props) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6a2 2 0 0 0-2 2v6.5A2.5 2.5 0 0 0 6.5 15" />
    </Svg>
  );
}

export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="m4.8 12.4 4.6 4.6L19.4 7" />
    </Svg>
  );
}

export function IconArrow(props) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15" />
      <path d="m14 6.5 5.5 5.5L14 17.5" />
    </Svg>
  );
}

export function IconRefresh(props) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4.5V9h-4.5" />
    </Svg>
  );
}

export function IconClose(props) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconChevron(props) {
  return (
    <Svg {...props}>
      <path d="m7 10 5 5 5-5" />
    </Svg>
  );
}

export function IconExternal(props) {
  return (
    <Svg {...props}>
      <path d="M13 5h6v6" />
      <path d="M19 5l-8 8" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * Buttons
 * ------------------------------------------------------------------ */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium " +
  "transition-colors duration-150 select-none whitespace-nowrap " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 " +
  "focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0b] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary:
    "h-8.5 px-3 bg-neutral-100 text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)] " +
    "hover:bg-neutral-300 active:bg-neutral-100",
  secondary:
    "h-8.5 px-3 border border-neutral-800 bg-[#111113] text-neutral-300 " +
    "shadow-[0_1px_1px_rgba(0,0,0,0.02)] hover:border-neutral-700 hover:bg-neutral-900 " +
    "hover:text-neutral-100",
  ghost:
    "h-8 px-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
};

export function Button({ variant = "secondary", className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Status
 * ------------------------------------------------------------------ */

const SEVERITY = {
  ok: {
    dot: "bg--500",
    pill: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
    text: "text-emerald-400",
  },
  warning: {
    dot: "bg--500",
    pill: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    text: "text-amber-300",
  },
  critical: {
    dot: "bg--500",
    pill: "bg-red-500/10 text-red-400 ring-red-500/25",
    text: "text-red-400",
  },
  none: {
    dot: "border border-neutral-600 bg-transparent",
    pill: "bg-neutral-900 text-neutral-400 ring-neutral-300",
    text: "text-neutral-400",
  },
};

export function SeverityDot({ severity, className = "" }) {
  const tone = SEVERITY[severity] || SEVERITY.none;
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-1.5 shrink-0 rounded-full ${tone.dot} ${className}`}
    />
  );
}

export function StatusPill({ severity, children }) {
  const tone = SEVERITY[severity] || SEVERITY.none;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] " +
        "font-medium ring-1 ring-inset " + tone.pill
      }
    >
      <SeverityDot severity={severity} />
      {children}
    </span>
  );
}

export function severityText(severity) {
  return (SEVERITY[severity] || SEVERITY.none).text;
}

/* ------------------------------------------------------------------ *
 * Copy to clipboard, with a fallback for non-secure contexts.
 * ------------------------------------------------------------------ */

async function writeClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = "Copy", className = "" }) {
  const [state, setState] = useState("idle");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = useCallback(async () => {
    const ok = await writeClipboard(text);
    setState(ok ? "done" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1600);
  }, [text]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium " +
        "text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 " +
        className
      }
      aria-label={state === "done" ? "Copied" : state === "failed" ? "Copy failed" : label}
    >
      {state === "done" ? (
        <>
          <IconCheck className="size-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : state === "failed" ? (
        <>
          <IconCopy className="size-3.5" />
          <span className="text-red-400">Copy failed</span>
        </>
      ) : (
        <>
          <IconCopy className="size-3.5" />
          {label}
        </>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "done" ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Small formatting helpers
 * ------------------------------------------------------------------ */

export function mono(text, className = "") {
  return <span className={`font-mono text-[12px] ${className}`}>{text}</span>;
}

export function timeOfDay(date) {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

export function relativeTime(date, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.round(minutes / 60);
  return hours + "h ago";
}

export function fullTime(date) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}
