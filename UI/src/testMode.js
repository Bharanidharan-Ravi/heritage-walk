// src/testMode.js
//
// "Test mode" = the whole public site served under /test (router basename)
// reading the Sanity `development` dataset. Only active in dev, or in a build made
// with VITE_ENABLE_TEST_PAGE=true — otherwise /test is just an unknown route.
//
// vite.config.js imports sanityClient.js in Node (no import.meta.env, no
// window), so everything here is null-safe.

const env = import.meta.env ?? {};

export const TEST_ENABLED = !!env.DEV || env.VITE_ENABLE_TEST_PAGE === "true";

const path = typeof window !== "undefined" ? window.location.pathname : "/";

export const isTestMode =
  TEST_ENABLED && (path === "/test" || path.startsWith("/test/"));

export const TEST_BASENAME = "/test";

// Sent with every .NET API call so experiences created under /test stay
// separate from the live site's (see ExperiencesController.IsTestSite).
export const SITE_ENV_HEADERS = isTestMode ? { "X-Site-Env": "test" } : {};

export const SANITY_DATASET = isTestMode
  ? env.VITE_SANITY_TEST_DATASET || "development"
  : "production";
