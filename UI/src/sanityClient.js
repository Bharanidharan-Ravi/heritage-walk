// src/sanityClient.js
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

export const client = createClient({
  projectId: "nh8jhz7r", // <--- We will find this in Step 2
  dataset: "production",
  useCdn: true, // true = fast response (cached), false = instant updates
  apiVersion: "2024-04-27",
});

const builder = imageUrlBuilder(client);

// Helper function to get the image URL
export function urlFor(source) {
  return builder.image(source);
}