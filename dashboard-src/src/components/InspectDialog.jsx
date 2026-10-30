import { useEffect, useRef, useState } from "react";
import { SAMPLES } from "../data/mock.js";
import { analyze } from "../lib/analyze.js";
import { Button, IconAlert, IconClose, IconSearch, IconShield } from "./ui.jsx";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function InspectDialog({ onClose, onAdd }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const textareaRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = panelRef.current ? Array.from(panelRef.current.querySelectorAll(FOCUSABLE)) : [];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    textareaRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  function loadSample(kind) {
    setText(SAMPLES[kind] || "");
    setError("");
    textareaRef.current?.focus();
  }

  function submit(event) {
    event.preventDefault();
    const result = analyze(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onAdd(text.trim(), result);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspect-dialog-title"
        aria-describedby="inspect-dialog-description"
        className="animate-dialog flex max-h-[calc(100vh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#111113] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-4 py-4 sm:px-5">
          <div>
            <h2
              id="inspect-dialog-title"
              className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-100"
            >
              Inspect new email
            </h2>
            <p id="inspect-dialog-description" className="mt-1 text-[11.5px] leading-4 text-neutral-400">
              Paste a full header block. The analysis runs in this tab.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60"
          >
            <IconClose className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="header-block"
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400"
              >
                Message headers
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => loadSample("suspicious")}
                  className="rounded px-1.5 py-1 text-[10.5px] font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60"
                >
                  Failing sample
                </button>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <button
                  type="button"
                  onClick={() => loadSample("clean")}
                  className="rounded px-1.5 py-1 text-[10.5px] font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/60"
                >
                  Clean sample
                </button>
              </div>
            </div>

            <textarea
              id="header-block"
              ref={textareaRef}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) setError("");
              }}
              rows={9}
              spellCheck={false}
              placeholder={
                "Return-Path: <billing@ledgerly.example>\n" +
                "Received: from mail.ledgerly.example (mail.ledgerly.example [203.0.113.24])\n" +
                "        by mx.northwind.example with ESMTPS id 4d8b\n" +
                "Authentication-Results: mx.northwind.example;\n" +
                "       spf=pass smtp.mailfrom=billing@ledgerly.example;\n" +
                "       dkim=pass header.d=ledgerly.example\n" +
                "From: Ledgerly Billing <billing@ledgerly.example>\n" +
                "Subject: Invoice 2026-1042 is ready\n" +
                "Date: Tue, 27 Oct 2026 09:41:09 +0000"
              }
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "header-block-error" : "header-block-hint"}
              className="mt-2 w-full resize-y rounded-lg border border-neutral-800 bg-[#0d0d0f] px-3 py-2.5 font-mono text-[11px] leading-[1.6] text-neutral-200 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-100/15"
            />

            {error ? (
              <p
                id="header-block-error"
                role="alert"
                className="mt-2 flex items-start gap-1.5 rounded-md border border-red-500/30 bg--500/10 px-2.5 py-2 text-[11.5px] leading-4 text-red-300"
              >
                <IconAlert className="mt-px size-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : (
              <p id="header-block-hint" className="mt-2 text-[10.5px] leading-4 text-neutral-400">
                Paste from the first line through to the blank line before the body. Nothing leaves
                the browser.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-800 bg-neutral-900/40 px-4 py-3 sm:px-5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-neutral-400">
              <IconShield className="size-3.5 text-neutral-400" />
              Same engine as the queue
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <IconSearch className="size-3.5" />
                Analyze email
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
