// src/queryKeys.js
//
// Centralized TanStack Query key factories for the admin panel. Every screen
// and every SignalR handler (src/signalr/experienceHubClient.js) must build
// keys through these functions rather than inlining array literals, so a
// cache lookup/invalidate from one place always matches a query registered
// from another.
export const qk = {
  // Experiences list is cached per tab only — type/search/sort/page are
  // filtered client-side against the tab's full result set (see
  // AdminExperiences.jsx), so they are deliberately NOT part of the key.
  experiencesList: (tab) => ["experiences", "list", tab],
  experience: (id) => ["experience", id],
  currentUser: () => ["currentUser"],
  users: () => ["users"],
  forms: () => ["forms"],
  formSubmissions: (formId) => ["formSubmissions", formId],
};
