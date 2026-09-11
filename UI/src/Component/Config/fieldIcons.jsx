// src/Component/Config/fieldIcons.jsx
//
// The glyphs for the builder's block palette. Hand-rolled inline SVG rather
// than a new npm dependency, matching the approach already used for the admin
// sidebar in Admin/AdminLayout.jsx.
//
// All paths are drawn on a 20x20 grid, stroked (never filled) with
// currentColor, so one <FieldIcon> component styles every glyph and they
// inherit the palette's accent colour for free.

import React from "react";

// name -> the inner geometry of the glyph. Kept as raw elements so a glyph can
// mix paths, circles and rects without a per-icon component.
const PATHS = {
  // ---- generic input types -------------------------------------------------
  text: (
    <>
      <path d="M4 15 7.5 5h1L12 15" />
      <path d="M5.4 12.2h5.2" />
      <path d="M15.5 7.5v7.5" />
    </>
  ),
  textarea: (
    <>
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
      <path d="M5.5 7.5h9M5.5 10h9M5.5 12.5h5" />
    </>
  ),
  email: (
    <>
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="m3 6 7 5 7-5" />
    </>
  ),
  phone: (
    <>
      <rect x="5.5" y="2.5" width="9" height="15" rx="2" />
      <path d="M8.5 15h3" />
    </>
  ),
  number: (
    <>
      <path d="M7 3.5 5.5 16.5M14 3.5 12.5 16.5" />
      <path d="M4 7.5h12M3.5 12.5h12" />
    </>
  ),
  select: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
      <path d="m11.5 8.5 2 2 2-2" />
    </>
  ),
  radio: (
    <>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="2.8" />
    </>
  ),
  checkbox: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="2.5" />
      <path d="m6.5 10 2.5 2.5 4.5-5" />
    </>
  ),
  date: (
    <>
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M6.5 2.5v4M13.5 2.5v4" />
    </>
  ),
  time: (
    <>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 5.8V10l2.8 1.8" />
    </>
  ),

  // ---- layout blocks -------------------------------------------------------
  heading: (
    <>
      <path d="M5 4v12M13 4v12M5 10h8" />
    </>
  ),
  paragraph: (
    <>
      <path d="M3.5 5.5h13M3.5 9h13M3.5 12.5h13M3.5 16h8" />
    </>
  ),
  divider: (
    <>
      <path d="M2.5 10h15" />
      <path d="M5 5.5h10M5 14.5h10" opacity="0.4" />
    </>
  ),

  // ---- predefined blocks ---------------------------------------------------
  user: (
    <>
      <circle cx="10" cy="6.8" r="3.3" />
      <path d="M3.8 17c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
    </>
  ),
  address: (
    <>
      <path d="M10 17.5s5.5-4.8 5.5-9a5.5 5.5 0 1 0-11 0c0 4.2 5.5 9 5.5 9Z" />
      <circle cx="10" cy="8.2" r="2.1" />
    </>
  ),
  users: (
    <>
      <circle cx="7.5" cy="7" r="2.8" />
      <path d="M2.5 16.5c0-3 2.2-4.8 5-4.8s5 1.8 5 4.8" />
      <circle cx="14.5" cy="7.5" r="2.2" />
      <path d="M13.2 12.2c2.2.2 4.3 1.8 4.3 4.3" />
    </>
  ),
  attendees: (
    <>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M7 8.5 9.5 7v6M12.5 13h-2" opacity="0.9" />
    </>
  ),
  lunch: (
    <>
      <path d="M5 2.5v6.5a2 2 0 0 0 4 0V2.5" />
      <path d="M7 9v8.5" />
      <path d="M14.5 2.5c-1.4 1-2 2.6-2 4.5s.6 2.6 2 2.6" />
      <path d="M14.5 9.6v7.9" />
    </>
  ),
  megaphone: (
    <>
      <path d="M16.5 5.5v9l-9-2.2V7.7l9-2.2Z" />
      <path d="M7.5 7.7H5a2 2 0 0 0 0 4h2.5" />
      <path d="M8.5 12v4a1.5 1.5 0 0 0 3 0v-3.2" />
    </>
  ),
  bell: (
    <>
      <path d="M15 13.5H5c1.2-1 1.5-2.2 1.5-3.7V8.5a3.5 3.5 0 1 1 7 0v1.3c0 1.5.3 2.7 1.5 3.7Z" />
      <path d="M8.4 16a1.8 1.8 0 0 0 3.2 0" />
    </>
  ),
  terms: (
    <>
      <path d="M5 2.5h7l3.5 3.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" />
      <path d="M12 2.5V6h3.5" />
      <path d="M7 9.5h6M7 12h6M7 14.5h3.5" />
    </>
  ),
  consent: (
    <>
      <rect x="2.5" y="5" width="9" height="9" rx="1.5" />
      <path d="m4.8 9.5 2 2 4-4.5" />
      <path d="M13.5 8h4M13.5 11.5h3" opacity="0.6" />
    </>
  ),

  // ---- experience-builder blocks (Config/experienceBuilder.config.jsx) -----
  image: (
    <>
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
      <circle cx="7" cy="8.2" r="1.4" />
      <path d="m4 14.5 4-4 3 3 2.5-3 3.5 4" />
    </>
  ),
  gallery: (
    <>
      <rect x="2" y="6" width="12" height="10.5" rx="1.5" />
      <circle cx="5.8" cy="9.6" r="1.1" />
      <path d="m3.2 15 3-3 2.3 2 2-2.5 2.5 3" />
      <path d="M5.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v9" opacity="0.6" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="5" width="10.5" height="10" rx="1.5" />
      <path d="m13 8.3 4.5-2.6v8.6L13 11.7Z" />
    </>
  ),
  location: (
    <>
      <path d="M10 17.5s5.5-4.8 5.5-9a5.5 5.5 0 1 0-11 0c0 4.2 5.5 9 5.5 9Z" />
      <circle cx="10" cy="8.2" r="2.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 5.8V10l2.8 1.8" />
    </>
  ),
  toggle: (
    <>
      <rect x="2.5" y="6.5" width="15" height="7" rx="3.5" />
      <circle cx="13.5" cy="10" r="2.4" />
    </>
  ),
  list: (
    <>
      <circle cx="4" cy="5.5" r="1" />
      <circle cx="4" cy="10" r="1" />
      <circle cx="4" cy="14.5" r="1" />
      <path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9" />
    </>
  ),
  faq: (
    <>
      <circle cx="10" cy="9.5" r="7" />
      <path d="M7.8 7.8a2.2 2.2 0 1 1 3.1 2c-.9.5-1.2 1-1.2 1.8" />
      <circle cx="9.9" cy="13.7" r="0.15" fill="currentColor" stroke="none" />
    </>
  ),
  modules: (
    <>
      <rect x="2.5" y="3" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="3" width="6.5" height="6.5" rx="1.2" />
      <rect x="2.5" y="10.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="10.5" width="6.5" height="6.5" rx="1.2" />
    </>
  ),
  certificate: (
    <>
      <circle cx="10" cy="7.5" r="5" />
      <path d="m7.2 11.8-1.4 5.7 4.2-2.3 4.2 2.3-1.4-5.7" />
      <path d="m7.7 7.5 1.6 1.6 3-3.2" />
    </>
  ),
  instructor: (
    <>
      <circle cx="10" cy="6.8" r="3.3" />
      <path d="M3.8 17c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
      <path d="M15.5 3.5 17 5l-3 3-1.5-1" opacity="0.7" />
    </>
  ),
  luggage: (
    <>
      <rect x="3" y="6.5" width="14" height="9.5" rx="1.5" />
      <path d="M7.5 6.5V4a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 12.5 4v2.5" />
      <path d="M10 9v4" />
    </>
  ),
  distance: (
    <>
      <path d="M3 15c2-4 3.5-6 5-6s2 3 3.5 3 3-5 5.5-5" />
      <circle cx="3" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  accessibility: (
    <>
      <circle cx="10" cy="4.3" r="1.6" />
      <path d="M4.5 8h11M10 5.9V12l-3.5 5M10 12l3.5 5M7.5 9.5 10 12l4-1.3" />
    </>
  ),
  languages: (
    <>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M2.8 10h14.4M10 2.8c1.8 2 2.8 4.6 2.8 7.2s-1 5.2-2.8 7.2c-1.8-2-2.8-4.6-2.8-7.2s1-5.2 2.8-7.2Z" />
    </>
  ),
  difficulty: (
    <>
      <path d="M3 16 8 6l3 5 2-3 4 8Z" />
    </>
  ),

  // ---- palette chrome ------------------------------------------------------
  search: (
    <>
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="m12.8 12.8 4 4" />
    </>
  ),
  chevron: <path d="m6 8 4 4 4-4" />,
};

/**
 * One glyph. `name` falls back to a neutral square so an unmapped block still
 * renders a tile instead of a hole.
 */
export default function FieldIcon({ name, className = "w-4 h-4" }) {
  const inner = PATHS[name] || <rect x="4" y="4" width="12" height="12" rx="2" />;

  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {inner}
    </svg>
  );
}
