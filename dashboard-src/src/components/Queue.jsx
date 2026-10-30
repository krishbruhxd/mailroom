import { useEffect, useMemo, useState } from "react";
import {
  IconAlert,
  IconClose,
  IconSearch,
  StatusPill,
  relativeTime,
  timeOfDay,
} from "./ui.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "issues", label: "Issues" },
  { id: "critical", label: "Critical" },
  { id: "clean", label: "Clean" },
];

function matches(email, filter) {
  if (filter === "issues") return email.faults.length > 0;
  if (filter === "critical") return email.faults.some((fault) => fault.severity === "critical");
  if (filter === "clean") return email.faults.length === 0;
  return true;
}

function countFor(emails, filter) {
  return emails.filter((email) => matches(email, filter)).length;
}

function searchText(email) {
  return [
    email.from.name,
    email.from.email,
    email.to.name,
    email.to.email,
    email.subject,
    email.status.label,
    ...email.faults.map((fault) => fault.title),
  ]
    .join(" ")
    .toLowerCase();
}

export default function Queue({ emails, selectedId, onSelect, now }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return emails.filter((email) => {
      if (!matches(email, filter)) return false;
      if (!needle) return true;
      return searchText(email).includes(needle);
    });
  }, [emails, filter, query]);

  // If a new message arrives while a filter hides it, clear the filter so the
  // selection and the queue never disagree about what is on screen.
  useEffect(() => {
    const selected = emails.find((email) => email.id === selectedId);
    if (!selected) return;
    const needle = query.trim().toLowerCase();
    const hidden = !matches(selected, filter) || (needle && !searchText(selected).includes(needle));
    if (hidden) {
      setFilter("all");
      setQuery("");
    }
    // Only react to a new selection; typing in the search box should not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function chooseFilter(next) {
    setFilter(next);
    const list = emails.filter(
      (email) => matches(email, next) && (!query.trim() || searchText(email).includes(query.trim().toLowerCase())),
    );
    if (list.length && !list.some((email) => email.id === selectedId)) {
      onSelect(list[0].id);
    }
  }

  function reset() {
    setFilter("all");
    setQuery("");
  }

  return (
    <section
      aria-label="Email queue"
      data-testid="queue"
      className="flex max-h-[560px] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#111113] shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:max-h-[620px] lg:max-h-[calc(100vh-170px)]"
    >
      <div className="shrink-0 border-b border-neutral-800 px-4 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-neutral-400">
            Email queue
          </h2>
          <span className="font-mono text-[10px] tabular-nums text-neutral-400">
            {emails.length} in feed
          </span>
        </div>

        <div className="relative mt-3">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sender, subject, status…"
            aria-label="Search the email queue"
            className="h-8 w-full rounded-lg border border-neutral-800 bg-[#0d0d0f] pl-8 pr-8 text-[12.5px] text-neutral-200 placeholder:text-neutral-400 transition-colors focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-100/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60"
            >
              <IconClose className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-center gap-0.5 overflow-x-auto" role="group" aria-label="Filter the queue">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseFilter(item.id)}
                aria-pressed={active}
                className={
                  "inline-flex h-6.5 shrink-0 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60 " +
                  (active
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100")
                }
              >
                {item.label}
                <span
                  className={
                    "font-mono text-[10px] tabular-nums " +
                    (active ? "text-neutral-600" : "text-neutral-400")
                  }
                >
                  {countFor(emails, item.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length ? (
          <ul className="divide-y divide-neutral-800">
            {visible.map((email) => {
              const selected = email.id === selectedId;
              const critical = email.faults.some((fault) => fault.severity === "critical");
              return (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(email.id)}
                    aria-current={selected ? "true" : undefined}
                    className={
                      "group relative block w-full px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400/60 " +
                      (selected ? "bg-neutral-900" : "hover:bg-neutral-900/40")
                    }
                  >
                    {selected ? (
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-neutral-100" />
                    ) : critical ? (
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg--500/40" />
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[12.5px] font-medium text-neutral-100">
                            {email.from.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-400">
                            {timeOfDay(email.receivedAt)}
                          </span>
                        </div>

                        <p
                          className={
                            "mt-0.5 truncate text-[12.5px] leading-4 " +
                            (selected ? "text-neutral-300" : "text-neutral-400")
                          }
                          title={email.subject}
                        >
                          {email.subject}
                        </p>

                        <p className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-neutral-400">
                          <span className="truncate">{email.from.email}</span>
                          <span aria-hidden="true" className="shrink-0 text-neutral-600">→</span>
                          <span className="truncate">{email.to.email}</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                        <StatusPill severity={email.status.severity}>{email.status.label}</StatusPill>
                        <span className="text-[10px] text-neutral-400">
                          {relativeTime(email.receivedAt, now)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900">
              <IconAlert className="size-4 text-neutral-400" />
            </span>
            <p className="mt-2.5 text-[12.5px] font-medium text-neutral-300">No messages match</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-400">
              Try a different filter or clear the search.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-[11.5px] font-medium text-neutral-100 underline decoration-neutral-600 underline-offset-2 transition-colors hover:decoration-neutral-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-neutral-800 px-4 py-2 text-[10px] text-neutral-400">
        <span className="tabular-nums">
          Showing {visible.length} of {emails.length}
        </span>
        <span className="font-mono">newest first</span>
      </div>
    </section>
  );
}
