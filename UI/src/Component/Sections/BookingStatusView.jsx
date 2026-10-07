// src/Component/Sections/BookingStatusView.jsx
//
// The public page behind /booking/:ref — where the visitor lands after
// Cashfree checkout (modal close or Cashfree's return_url redirect).
//
//   GET /api/bookings/{ref} -> status. While PendingPayment the API asks
//   Cashfree and confirms the booking once the order is PAID, so this page
//   polls for a short while before giving up with a "still waiting" message.
//   If the Cashfree order is still open by then (they never finished paying),
//   "Complete payment" reopens the same order via POST /api/bookings/{ref}/retry.
//
// See docs/form-generator/CASHFREE_BOOKING_PLAN.md §6.

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { openCashfreeCheckout, isCashfreeLoadError } from "../../cashfreeCheckout";
import { bookingConfirmationConfig } from "../Config/bookingConfirmation.config";

const API_BASE = import.meta.env.VITE_API_URL;

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const formatTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const formatCountdown = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function BookingStatusView() {
  const { ref } = useParams();
  const { theme, content, pollIntervalMs, pollTimeoutMs } = bookingConfirmationConfig;

  const [booking, setBooking] = useState(null);
  const [state, setState] = useState("loading"); // loading | pending | slow | done | notFound
  const [copied, setCopied] = useState(false);
  // Bumped after "Complete payment" to start polling again.
  const [pollKey, setPollKey] = useState(0);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const startedAt = Date.now();

    async function check() {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${encodeURIComponent(ref)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setState("notFound");
          return;
        }
        if (!res.ok) throw new Error("status-failed");
        const data = await res.json();
        if (cancelled) return;
        setBooking(data);

        if (data.status !== "PendingPayment") {
          setState("done");
          return;
        }
        if (Date.now() - startedAt >= pollTimeoutMs) {
          setState("slow");
          return;
        }
        setState("pending");
      } catch {
        if (cancelled) return;
        if (Date.now() - startedAt >= pollTimeoutMs) {
          setState("slow");
          return;
        }
      }
      timer = setTimeout(check, pollIntervalMs);
    }

    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ref, pollIntervalMs, pollTimeoutMs, pollKey]);

  // Ticks once a second while a hold is running, for the countdown.
  const [now, setNow] = useState(() => Date.now());
  const holdEndsAt = booking?.status === "PendingPayment" && booking?.expiresAt ? new Date(booking.expiresAt).getTime() : null;
  useEffect(() => {
    if (!holdEndsAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [holdEndsAt]);
  const holdLeftMs = holdEndsAt ? Math.max(0, holdEndsAt - now) : null;

  // Hold just ran out — ask the API once more so the page flips to "expired".
  const holdRanOut = holdLeftMs === 0;
  useEffect(() => {
    if (holdRanOut) setPollKey((k) => k + 1);
  }, [holdRanOut]);

  const recheck = () => {
    setState("pending");
    setPollKey((k) => k + 1);
  };

  const resumePayment = async () => {
    setResuming(true);
    setResumeError("");
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${encodeURIComponent(ref)}/retry`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.alreadyPaid) {
        recheck();
        return;
      }
      if (!res.ok || !data?.paymentSessionId) {
        setResumeError(data?.message || content.retryErrorText);
        // 409 = the hold ran out — re-checking shows the "expired" state.
        if (res.status === 409) recheck();
        return;
      }

      const result = await openCashfreeCheckout({ mode: data.mode, paymentSessionId: data.paymentSessionId });
      if (result?.error && !result?.paymentDetails) {
        console.warn("Cashfree checkout:", result.error);
        setResumeError(result.error.message || content.retryErrorText);
        return;
      }
      recheck();
    } catch (err) {
      console.error("Cashfree payment failed:", err);
      setResumeError(isCashfreeLoadError(err) ? content.paymentWindowBlockedText : content.retryErrorText);
    } finally {
      setResuming(false);
    }
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(booking?.bookingRef || ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the ID is on screen anyway.
    }
  };

  const status = booking?.status;
  const isPaid = status === "Paid" || status === "Submitted";
  const canResume =
    state === "slow" &&
    status === "PendingPayment" &&
    booking?.gatewayStatus === "ACTIVE" &&
    holdLeftMs > 0;
  const view =
    state === "notFound" ? { title: content.notFoundTitle, text: content.notFoundText, color: theme.errorColor }
    : state === "loading" ? { title: content.loadingTitle, text: "", color: theme.accentColor }
    : state === "pending" ? { title: content.pendingTitle, text: content.pendingText, color: theme.accentColor }
    : canResume ? { title: content.unpaidTitle, text: content.unpaidText(formatTime(booking.expiresAt)), color: theme.accentColor }
    : state === "slow" ? { title: content.slowTitle, text: content.slowText, color: theme.accentColor }
    : isPaid ? { title: content.paidTitle, text: content.paidText(booking.submitterFirstName), color: theme.successColor }
    : status === "Expired" ? { title: content.expiredTitle, text: content.expiredText, color: theme.errorColor }
    : { title: content.failedTitle, text: content.failedText, color: theme.errorColor };

  const showSpinner = state === "loading" || state === "pending";
  const experienceLink = booking?.experienceId ? `/experiences/${booking.experienceId}` : null;

  const rows = booking
    ? [
        booking.experienceTitle && [content.experienceLabel, booking.experienceTitle],
        booking.experienceDate && [content.dateLabel, formatDate(booking.experienceDate)],
        booking.registrationType && [content.typeLabel, booking.registrationType],
        [content.guestsLabel, booking.quantity],
        [isPaid ? content.amountLabel : content.totalLabel, `${booking.currency} ${booking.amount}`],
      ].filter(Boolean)
    : [];

  return (
    <section
      className="py-24 min-h-screen"
      style={{ backgroundColor: theme.sectionBackground, color: theme.textColor }}
    >
      <div className="max-w-xl mx-auto px-6 text-center">
        {showSpinner && (
          <div
            className="w-10 h-10 mx-auto mb-6 rounded-full border-4 animate-spin"
            style={{ borderColor: theme.cardBorder, borderTopColor: theme.accentColor }}
          />
        )}
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-3" style={{ color: view.color }}>
          {view.title}
        </h1>
        {view.text && <p className="opacity-75 mb-8">{view.text}</p>}

        {holdLeftMs > 0 && state !== "loading" && (
          <div
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm"
            style={{ border: `1px solid ${theme.cardBorder}`, color: holdLeftMs < 2 * 60 * 1000 ? theme.errorColor : theme.textColor }}
            aria-live="off"
          >
            <span className="opacity-70">{content.holdTimerLabel}</span>
            <span className="font-mono font-semibold" style={{ color: holdLeftMs < 2 * 60 * 1000 ? theme.errorColor : theme.accentColor }}>
              {formatCountdown(holdLeftMs)}
            </span>
          </div>
        )}

        {state !== "notFound" && state !== "loading" && (
          <div
            className="rounded-xl p-6 text-left"
            style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}
          >
            <p className="text-xs uppercase tracking-widest opacity-60 mb-1">{content.bookingIdLabel}</p>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl font-mono font-semibold" style={{ color: theme.accentColor }}>
                {booking?.bookingRef || ref}
              </span>
              <button
                type="button"
                onClick={copyRef}
                className="text-xs px-2 py-1 rounded"
                style={{ border: `1px solid ${theme.cardBorder}` }}
              >
                {copied ? content.copiedLabel : content.copyLabel}
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="opacity-60">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {canResume && (
          <div className="mt-8">
            <button
              type="button"
              onClick={resumePayment}
              disabled={resuming}
              className="px-5 py-2.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-wait"
              style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
            >
              {resuming ? content.resumingLabel : content.resumePaymentLabel}
            </button>
            {resumeError && (
              <p role="alert" className="mt-3 text-sm" style={{ color: theme.errorColor }}>
                {resumeError}
              </p>
            )}
          </div>
        )}

        {(state === "done" || state === "notFound") && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {experienceLink && (
              <Link
                to={experienceLink}
                className="px-5 py-2.5 rounded-lg font-medium"
                style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
              >
                {isPaid ? content.backToExperienceLabel : content.bookAgainLabel}
              </Link>
            )}
            <Link to="/" className="px-5 py-2.5 rounded-lg" style={{ border: `1px solid ${theme.cardBorder}` }}>
              {content.homeLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
