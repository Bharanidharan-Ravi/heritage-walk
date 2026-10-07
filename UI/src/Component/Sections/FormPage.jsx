// src/Component/Sections/FormPage.jsx
//
// The public page behind /forms/{slug}. See
// docs/form-generator/MASTER_PROMPT.md for the full flow.
//
//   GET  /api/forms/{slug}          -> render fields (via FormRenderer)
//   Paid experience registration forms (form.experienceId set):
//     POST /api/bookings            -> pending booking + Cashfree payment_session_id
//     Cashfree checkout (modal)     -> user pays
//     /booking/{ref}                -> BookingStatusView confirms with the API
//   Other paid forms (legacy):
//     POST /api/forms/{slug}/order  -> get a Razorpay order
//     Razorpay Checkout widget      -> user pays
//     POST /api/forms/{slug}/submit -> verify signature + save + emails
//   Free forms (requiresPayment === false):
//     POST /api/forms/{slug}/submit -> save + emails, no payment step at all
//
// TODO(form-generator): paid forms assume the Razorpay Checkout script is in
// index.html:
//   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
// Free forms work without it.

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { openCashfreeCheckout, isCashfreeLoadError } from "../../cashfreeCheckout";
import { formConfig } from "../Config/form.config";
import { experiencePublicConfig } from "../Config/experiencePublic.config";
import FormRenderer from "./FormRenderer";
import { BookingCard, Breadcrumb, RegistrationSteps, Surface, TypeBadge } from "./ExperiencePageView";
import { unitPriceFor, withAttendeeNameFields } from "./experienceBlockHelpers";
import { SITE_ENV_HEADERS } from "../../testMode";

const API_BASE = import.meta.env.VITE_API_URL;
const FORM_ID = "registration-form";

export default function FormPage() {
  const { slug } = useParams();
  const { theme, content } = formConfig;
  const pub = experiencePublicConfig;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null); // { title, description, fields, requiresPayment, price, currency }
  // The linked experience (bookings only) — feeds the same booking card the
  // experience page shows, so the cart stays editable right up to payment.
  // Stays null for plain forms, or if it can't be loaded (then the page falls
  // back to the plain layout and the cart from the URL).
  const [experience, setExperience] = useState(null);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("loading"); // loading | ready | paying | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");
  // A payment started before the page was reloaded — offer its status page.
  // It may have been paid since (e.g. via "Complete payment" on the booking
  // page), so ask the API and only keep the notice while it's still unpaid.
  const [pendingRef, setPendingRef] = useState(null);
  useEffect(() => {
    const ref = readPendingBooking(slug);
    setPendingRef(null);
    if (!ref) return undefined;
    let cancelled = false;
    fetch(`${API_BASE}/api/bookings/${encodeURIComponent(ref)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.status === "PendingPayment") setPendingRef(ref);
        else forgetPendingBooking(slug);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const cartQty = searchParams.get("qty");
  const cartRegType = searchParams.get("registrationType");
  // A Group booking for N people asks for the other N-1 attendees' names too.
  const renderedForm = form
    ? { ...form, fields: withAttendeeNameFields(form.fields || [], { registrationType: cartRegType, qty: cartQty }) }
    : null;

  useEffect(() => {
    window.scrollTo(0, 0);
    async function loadForm() {
      try {
        const res = await fetch(`${API_BASE}/api/forms/${slug}`);
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(content.notFoundMessage);
          return;
        }
        const data = await res.json();
        setForm(data);

        if (data.experienceId) {
          const expRes = await fetch(`${API_BASE}/api/experiences/public/${data.experienceId}`, { headers: SITE_ENV_HEADERS }).catch(() => null);
          if (expRes?.ok) setExperience(await expRes.json());
        }

        // Carried over from the experience detail page's cart widget
        // (?qty=&registrationType=) when this form was reached via "Book Now".
        // Recorded in the answers even when the form has no field of that
        // name (the experience registration form leaves Registration type to
        // the cart), so the submission still says what was booked.
        const prefill = {};
        if (cartQty) prefill.numberOfAttendees = cartQty;
        if (cartRegType) prefill.registrationType = cartRegType;
        if (Object.keys(prefill).length > 0) setValues((prev) => ({ ...prev, ...prefill }));

        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorMessage(content.genericErrorMessage);
      }
    }
    loadForm();
  }, [slug]);

  const handleFieldChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Name and email are ordinary fields now, marked with a role by the builder
   * rather than hardcoded above the form. Read the answer back off whichever
   * field carries the role — and cope with it being absent, because the author
   * is allowed to delete it (the API then just skips the submitter's copy of
   * the confirmation email).
   */
  const answerByRole = (role) => {
    const field = form?.fields?.find((f) => f.role === role);
    return field ? values[field.name] || "" : "";
  };

  // The Name block drops as First Name (role: submitterName) + Last Name — if
  // the author hasn't deleted Last Name, the submitter's name is both parts
  // joined rather than just the role-carrying field's own answer.
  const nameField = form?.fields?.find((f) => f.role === "submitterName");
  const lastNameField = nameField?.pairId
    ? form?.fields?.find((f) => f.pairId === nameField.pairId && f.id !== nameField.id)
    : null;
  const submitterName = nameField
    ? [values[nameField.name], lastNameField ? values[lastNameField.name] : ""].filter(Boolean).join(" ")
    : "";
  const submitterEmail = answerByRole("submitterEmail");

  // The mobile number Cashfree needs: the predefined Phone block ("phone"),
  // else the first phone field that isn't the emergency contact.
  const phoneField =
    form?.fields?.find((f) => f.name === "phone") ||
    form?.fields?.find((f) => f.type === "phone" && f.name !== "emergencyContactNumber");
  const submitterPhone = phoneField ? values[phoneField.name] || "" : "";

  // Experience bookings: per-person price for the cart's option × people.
  // Display only — the API recomputes the amount from the database.
  const isBooking = Boolean(form?.experienceId);
  // An experience that offers only one option wins over whatever the URL says,
  // matching what the booking card shows ("Individual" = old name for Group).
  const offered = experience?.registrationType === "Individual" ? "Group" : experience?.registrationType;
  const bookingRegType = offered === "Group" || offered === "Private"
    ? offered
    : cartRegType === "Private" ? "Private" : "Group";
  const minQty = bookingRegType === "Private" ? Math.max(1, experience?.privateMinPeople || 1) : 1;
  const bookingQty = Math.max(minQty, Number(cartQty) || 1);
  const bookingUnit = form ? unitPriceFor(form, bookingRegType) : 0;
  const bookingTotal = Math.round(bookingUnit * bookingQty * 100) / 100;
  const cartSelection = { regType: bookingRegType, qty: bookingQty, slot: searchParams.get("slot") || "" };

  // The booking card edits the cart in place. The URL stays its single source
  // of truth (so a reload keeps the choice), and the answers carry it too.
  const handleCartChange = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set("qty", String(next.qty));
    params.set("registrationType", next.regType);
    if (next.slot) params.set("slot", next.slot);
    else params.delete("slot");
    setSearchParams(params, { replace: true });
    setValues((prev) => ({ ...prev, numberOfAttendees: String(next.qty), registrationType: next.regType }));
    if (status === "error") {
      setStatus("ready");
      setErrorMessage("");
    }
  };

  // Free forms go straight to /submit; experience bookings pay via Cashfree;
  // other paid forms (legacy) detour through Razorpay first.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.requiresPayment) {
      setStatus("submitting");
      await submitForm(null, "");
      return;
    }

    if (isBooking) {
      await payWithCashfree();
      return;
    }

    setStatus("paying");
    try {
      // 1. Create a Razorpay order for this form's (server-side, authoritative) price.
      const orderRes = await fetch(`${API_BASE}/api/forms/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!orderRes.ok) {
        const failure = await orderRes.json().catch(() => null);
        setStatus("error");
        setErrorMessage(failure?.message || content.genericErrorMessage);
        return;
      }
      const order = await orderRes.json(); // { orderId, amount, currency, razorpayKeyId }

      if (typeof window.Razorpay === "undefined") {
        // TODO(form-generator): remove this guard once the Checkout script is added.
        throw new Error("razorpay-script-missing");
      }

      // 2. Open Razorpay Checkout, then submit on success.
      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: Math.round(order.amount * 100), // paise
        currency: order.currency,
        order_id: order.orderId,
        name: form.title,
        prefill: { name: submitterName, email: submitterEmail },
        handler: async (paymentResult) => {
          await submitForm(paymentResult, order.orderId);
        },
        modal: {
          ondismiss: () => setStatus("ready"),
        },
      });
      checkout.open();
    } catch {
      setStatus("error");
      setErrorMessage(content.genericErrorMessage);
    }
  };

  const payWithCashfree = async () => {
    if (!submitterPhone) {
      setStatus("error");
      setErrorMessage(content.phoneRequiredMessage);
      return;
    }

    setStatus("paying");
    try {
      // 1. Pending booking + Cashfree order. No amount is sent — the API
      //    prices it from the experience (option × people).
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId: form.experienceId,
          registrationType: bookingRegType,
          quantity: bookingQty,
          slot: searchParams.get("slot") || "",
          formData: values,
          submitterName,
          submitterEmail,
          submitterPhone,
        }),
      });
      const booking = await res.json().catch(() => null);
      if (res.ok && booking?.alreadyPaid) {
        // Their earlier attempt (before a reload) was paid — show that booking.
        forgetPendingBooking(slug);
        navigate(`/booking/${booking.bookingRef}`);
        return;
      }
      if (!res.ok || !booking?.paymentSessionId) {
        setStatus("error");
        setErrorMessage(booking?.message || content.genericErrorMessage);
        return;
      }

      // 2. Cashfree checkout in a modal; either way the booking page asks the
      //    API (which asks Cashfree) whether it was paid. Some methods (UPI
      //    apps, netbanking) leave the page and come back via Cashfree's
      //    return_url (Cashfree:ReturnUrl) to the same /booking/{ref} page.
      rememberPendingBooking(slug, booking.bookingRef, booking.expiresAt);
      const result = await openCashfreeCheckout({
        mode: booking.mode,
        paymentSessionId: booking.paymentSessionId,
      });

      if (result?.error && !result?.paymentDetails) {
        // Closed the modal or the payment failed — stay on the form so they can retry.
        console.warn("Cashfree checkout:", result.error);
        setStatus("error");
        setErrorMessage(result.error.message || content.paymentFailedMessage);
        return;
      }
      forgetPendingBooking(slug);
      navigate(`/booking/${booking.bookingRef}`);
    } catch (err) {
      console.error("Cashfree payment failed:", err);
      setStatus("error");
      setErrorMessage(isCashfreeLoadError(err) ? content.paymentWindowBlockedMessage : content.genericErrorMessage);
    }
  };

  const submitForm = async (paymentResult, orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: values,
          submitterName,
          submitterEmail,
          // Private bookings only — the date picked in the cart widget; the
          // server checks it's still free and takes it off the public list.
          slot: searchParams.get("slot") || "",
          // Empty on a free form — the server ignores them when
          // requiresPayment is false and never records an amount.
          razorpayOrderId: orderId || "",
          razorpayPaymentId: paymentResult?.razorpay_payment_id || "",
          razorpaySignature: paymentResult?.razorpay_signature || "",
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(
          result?.message || (form.requiresPayment ? content.paymentFailedMessage : content.genericErrorMessage)
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage(content.genericErrorMessage);
    }
  };

  if (status === "loading") {
    return <CenteredMessage theme={theme} text={content.loadingMessage} />;
  }
  if (status === "error" && !form) {
    return <CenteredMessage theme={theme} text={errorMessage} />;
  }
  if (status === "success") {
    return (
      <CenteredMessage
        theme={theme}
        text={form.requiresPayment ? content.successMessage : content.freeSuccessMessage}
      />
    );
  }

  const busy = status === "paying" || status === "submitting";
  const submitLabel = busy
    ? (form.requiresPayment ? content.payingMessage : content.submittingMessage)
    : (!form.requiresPayment
        ? content.submitButtonLabel
        : isBooking
          ? content.bookingPayButtonLabel(bookingTotal, form.currency)
          : content.payButtonLabel(form.price, form.currency));

  const resumeNotice = isBooking && pendingRef && (
    <div
      className="rounded-xl p-3.5 mb-6 text-[13px]"
      style={{ backgroundColor: experience ? pub.theme.insetBackground : theme.inputBackground, border: `1px solid ${experience ? pub.theme.surfaceBorder : theme.inputBorder}` }}
    >
      {content.resumeNotice(pendingRef)}{" "}
      <Link to={`/booking/${pendingRef}`} className="underline" style={{ color: experience ? pub.theme.accentStrong : theme.accentColor }}>
        {content.resumeLinkLabel}
      </Link>
    </div>
  );

  // Experience booking: the same cream look and booking card as the
  // experience page (mirrors the admin preview's registration screen in
  // Admin/ExperienceBuilder/ExperiencePreviewModal.jsx). The card's button
  // submits the form, so Group/Private, people and date can still change here.
  if (isBooking && experience) {
    const typeLabel = pub.content.typeLabels[experience.type?.toLowerCase()] || experience.type;
    return (
      <section className="pt-4 pb-16 min-h-screen text-[14px]" style={{ backgroundColor: pub.theme.pageBackground, color: pub.theme.textColor }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            theme={pub.theme}
            content={pub.content}
            typeLabel={typeLabel}
            title={experience.title}
            onTitleClick={() => navigate(`/experiences/${experience.id}`)}
            current={pub.content.breadcrumbRegistration}
          />
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <TypeBadge theme={pub.theme}>{typeLabel}</TypeBadge>
              <h1 className="text-[26px] md:text-[32px] font-serif font-medium leading-[1.15] tracking-tight mt-3">
                {experience.title || pub.content.registrationTitleFallback}
              </h1>
            </div>
            <RegistrationSteps theme={pub.theme} steps={pub.content.registrationSteps} active={pub.content.registrationActiveStep} />
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 xl:gap-8 mt-6">
            <Surface theme={pub.theme} className="min-w-0 md:p-6">
              <h2 className="text-[18px] font-serif font-medium">{pub.content.registrationHeading}</h2>
              <p className="text-[12.5px] mt-1 mb-5" style={{ color: pub.theme.mutedColor }}>
                {form.description || pub.content.registrationSubheading}
              </p>
              {resumeNotice}
              <FormRenderer
                light
                id={FORM_ID}
                form={renderedForm}
                values={values}
                onChange={handleFieldChange}
                onSubmit={handleSubmit}
                submitting={busy}
                hideSubmit
              />
            </Surface>
            <div className="min-w-0">
              <BookingCard
                experience={experience}
                theme={pub.theme}
                content={pub.content}
                selection={cartSelection}
                onSelectionChange={handleCartChange}
                submitFormId={FORM_ID}
                submitLabel={submitLabel}
                submitting={busy}
                actionError={status === "error" ? errorMessage : ""}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="pt-4 pb-16 min-h-screen"
      style={{ backgroundColor: theme.sectionBackground, color: theme.textColor }}
    >
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-2">{form.title}</h1>
        {form.description && <p className="opacity-70 mb-3">{form.description}</p>}
        <p className="opacity-60 text-sm mb-10">
          {!form.requiresPayment
            ? content.freeNotice
            : isBooking
              ? content.bookingNotice(bookingUnit, bookingQty, bookingTotal, form.currency)
              : content.paidNotice(form.price, form.currency)}
        </p>

        {resumeNotice}

        <FormRenderer
          form={renderedForm}
          values={values}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          submitting={busy}
          errorMessage={status === "error" ? errorMessage : ""}
          submitLabel={submitLabel}
        />
      </div>
    </section>
  );
}

// The booking ref of an unfinished Cashfree payment, per form, for this tab
// only. Storage can be blocked (private mode) — then there's simply no notice.
const pendingKey = (slug) => `pendingBooking:${slug}`;

function rememberPendingBooking(slug, ref, expiresAt) {
  try {
    sessionStorage.setItem(pendingKey(slug), JSON.stringify({ ref, expiresAt }));
  } catch {
    // ignore
  }
}

function forgetPendingBooking(slug) {
  try {
    sessionStorage.removeItem(pendingKey(slug));
  } catch {
    // ignore
  }
}

function readPendingBooking(slug) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(pendingKey(slug)) || "null");
    if (saved?.ref && new Date(saved.expiresAt) > new Date()) return saved.ref;
    sessionStorage.removeItem(pendingKey(slug));
  } catch {
    // ignore
  }
  return null;
}

function CenteredMessage({ theme, text }) {
  return (
    <section
      className="py-24 min-h-screen flex items-center justify-center text-center"
      style={{ backgroundColor: theme.sectionBackground, color: theme.textColor }}
    >
      <p className="text-xl px-6">{text}</p>
    </section>
  );
}
