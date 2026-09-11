// src/Component/Sections/FormPage.jsx
//
// The public page behind /forms/{slug}. See
// docs/form-generator/MASTER_PROMPT.md for the full flow.
//
//   GET  /api/forms/{slug}          -> render fields (via FormRenderer)
//   Paid forms:
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
import { useParams } from "react-router-dom";
import { formConfig } from "../Config/form.config";
import FormRenderer from "./FormRenderer";

const API_BASE = import.meta.env.VITE_API_URL;

export default function FormPage() {
  const { slug } = useParams();
  const { theme, content } = formConfig;

  const [form, setForm] = useState(null); // { title, description, fields, requiresPayment, price, currency }
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("loading"); // loading | ready | paying | submitting | success | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadForm() {
      try {
        const res = await fetch(`${API_BASE}/api/forms/${slug}`);
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(content.notFoundMessage);
          return;
        }
        setForm(await res.json());
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

  const submitterName = answerByRole("submitterName");
  const submitterEmail = answerByRole("submitterEmail");

  // Free forms go straight to /submit; paid ones detour through Razorpay first.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.requiresPayment) {
      setStatus("submitting");
      await submitForm(null, "");
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
      if (!orderRes.ok) throw new Error("order-failed");
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

  const submitForm = async (paymentResult, orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: values,
          submitterName,
          submitterEmail,
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

  return (
    <section
      className="py-24 min-h-screen"
      style={{ backgroundColor: theme.sectionBackground, color: theme.textColor }}
    >
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-2">{form.title}</h1>
        {form.description && <p className="opacity-70 mb-3">{form.description}</p>}
        <p className="opacity-60 text-sm mb-10">
          {form.requiresPayment
            ? content.paidNotice(form.price, form.currency)
            : content.freeNotice}
        </p>

        <FormRenderer
          form={form}
          values={values}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          submitting={busy}
          errorMessage={status === "error" ? errorMessage : ""}
          submitLabel={
            busy
              ? (form.requiresPayment ? content.payingMessage : content.submittingMessage)
              : (form.requiresPayment
                  ? content.payButtonLabel(form.price, form.currency)
                  : content.submitButtonLabel)
          }
        />
      </div>
    </section>
  );
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
