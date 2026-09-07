// src/Component/Sections/FormPage.jsx
//
// DRY / SKELETON page for the pay-to-submit Form Generator.
// See docs/form-generator/MASTER_PROMPT.md for the full flow this implements:
//   GET /api/forms/{slug}          -> render fields
//   POST /api/forms/{slug}/order   -> get a Razorpay order
//   Razorpay Checkout widget       -> user pays
//   POST /api/forms/{slug}/submit  -> verify + save + emails
//
// TODO(form-generator): this page assumes the Razorpay Checkout script is
// added to index.html:
//   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
// Until then `window.Razorpay` is undefined and handlePay() shows an error.

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formConfig } from "../Config/form.config";

const API_BASE = import.meta.env.VITE_API_URL;

export default function FormPage() {
  const { slug } = useParams();
  const { theme, content } = formConfig;

  const [form, setForm] = useState(null); // { title, fields, price, currency }
  const [values, setValues] = useState({});
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ready | paying | success | error
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
        const data = await res.json();
        setForm(data);
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

  const handlePay = async (e) => {
    e.preventDefault();
    setStatus("paying");
    setErrorMessage("");

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
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(content.paymentFailedMessage);
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
    return <CenteredMessage theme={theme} text={content.successMessage} />;
  }

  return (
    <section
      className="py-24 min-h-screen"
      style={{ backgroundColor: theme.sectionBackground, color: theme.textColor }}
    >
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-serif font-medium mb-2">{form.title}</h1>
        <p className="opacity-70 mb-10">
          {form.currency} {form.price} — payment required to submit.
        </p>

        <form onSubmit={handlePay} className="space-y-6">
          <TextField label="Your Name" value={submitterName} onChange={setSubmitterName} required />
          <TextField label="Your Email" type="email" value={submitterEmail} onChange={setSubmitterEmail} required />

          {form.fields.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              type={field.type === "textarea" ? "text" : field.type}
              required={field.required}
              value={values[field.name] || ""}
              onChange={(v) => handleFieldChange(field.name, v)}
            />
          ))}

          <button
            type="submit"
            disabled={status === "paying"}
            className="w-full py-4 font-bold uppercase tracking-widest rounded-lg transition-all hover:opacity-90 shadow-lg mt-4 disabled:opacity-50"
            style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
          >
            {status === "paying" ? content.payingMessage : content.payButtonLabel(form.price, form.currency)}
          </button>

          {status === "error" && errorMessage && (
            <p className="text-red-400 text-center text-sm mt-4 font-medium">{errorMessage}</p>
          )}
        </form>
      </div>
    </section>
  );
}

function TextField({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-xs uppercase font-bold tracking-widest mb-2 opacity-70">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0F161E] border border-white/10 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C19D60] transition-colors"
      />
    </div>
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
