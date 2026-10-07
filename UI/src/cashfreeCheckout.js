// src/cashfreeCheckout.js
//
// Loads Cashfree.js and opens checkout. Used instead of the
// @cashfreepayments/cashfree-js loader because that one starts the script
// download once at import time and caches the result — if that single
// download fails (slow network, ad blocker, dev-server reload) every later
// "Pay" click fails until a full page refresh. This retries on each click.

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

let loading = null;

function loadScript() {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    document.querySelectorAll(`script[src="${SDK_URL}"]`).forEach((s) => s.remove());
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () =>
      window.Cashfree ? resolve(window.Cashfree) : reject(new Error("cashfree-sdk-missing"));
    script.onerror = () => reject(new Error("cashfree-sdk-blocked"));
    document.head.appendChild(script);
  }).finally(() => {
    // Let the next click try again if this attempt failed.
    if (!window.Cashfree) loading = null;
  });
  return loading;
}

/**
 * Opens Cashfree checkout in a modal.
 * Resolves with Cashfree's result ({ error } | { paymentDetails } | { redirect }).
 * Rejects with Error("cashfree-sdk-blocked" | "cashfree-sdk-missing") when the
 * script can't be loaded.
 */
export async function openCashfreeCheckout({ mode, paymentSessionId }) {
  const Cashfree = await loadScript();
  const cashfree = Cashfree({ mode: mode === "production" ? "production" : "sandbox" });
  return cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" });
}

export const isCashfreeLoadError = (err) =>
  err?.message === "cashfree-sdk-blocked" || err?.message === "cashfree-sdk-missing";
