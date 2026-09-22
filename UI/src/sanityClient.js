// src/sanityClient.js
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import { isTestMode, SANITY_DATASET } from "./testMode";

export const client = createClient({
  projectId: "nh8jhz7r", // <--- We will find this in Step 2
  dataset: SANITY_DATASET, // "production", or the test dataset under /test
  // Test mode skips the CDN (instant updates) and may need a read token if
  // the test dataset is private (dev only — never set it in a public build).
  useCdn: !isTestMode,
  token: isTestMode ? import.meta.env?.VITE_SANITY_TEST_TOKEN : undefined,
  apiVersion: "2024-04-27",
});

const builder = imageUrlBuilder(client);

// Helper function to get the image URL
export function urlFor(source) {
  return builder.image(source);
}