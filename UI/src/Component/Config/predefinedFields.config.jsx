// src/Component/Config/predefinedFields.config.jsx
//
// The predefined block catalogue: fields that arrive on the canvas already
// labelled, placeheld, validated and (for composites) sub-divided, so building
// a registration form is a few drags instead of a few dozen edits.
//
// These are TEMPLATES, COPIED ON DROP. `createField` deep-clones the `field`
// object below into the form's own field array, which is what makes editing a
// dropped block affect only that form and never the master definition here.
// Nothing in this file is stored in, or read from, the database — see
// docs/form-generator/PREDEFINED_FIELDS_PLAN.md §0.
//
// A block is:
//   key          unique catalogue id (also the palette's drag payload)
//   group        which palette section it sits in
//   paletteLabel the 1-2 word name under its icon in the 2-column palette
//   icon         key into Config/fieldIcons.jsx
//   keywords     extra terms the palette search should match on
//   field        the template instance (see useFormBuilder for the full shape)
//
// `field.validation` is the declarative block FormRenderer interprets:
//   pattern     RegExp source, tested on the trimmed value
//   message     what to show when it fails
//   min/max     numeric bounds (type="number")
//   minLength/maxLength
//   digitsOnly  strip non-digits as the user types
//   inputMode   mobile keyboard hint
//   prefix      static, non-editable adornment inside the input (e.g. "+91")

// Kept verbatim-ish from the ArchaeoTrails booking terms so the block is
// useful the moment it lands. Authors edit it per form in the settings pane.
const CANCELLATION_POLICY = `Cancellation & Refund Policy

Cancellation Before the Tour — Refund
25 days or more — 85% of the tour fee
20–24 days — 75% of the tour fee
15–19 days — 60% of the tour fee
10–14 days — 40% of the tour fee
8–9 days — 20% of the tour fee
Less than 8 days / No Show / After the tour starts — No Refund

Additional Refund Terms

• If Archaeo Trails cancels the tour due to unforeseen circumstances or insufficient registrations, participants may choose either a full refund or transfer their booking to a future tour.
• Refunds are processed to the original payment method within 7–10 working days.
• Transaction and payment-gateway charges are non-refundable.`;

const DECLARATION_TEXT = `I hereby declare that the information provided by me is true and correct. I have read, understood, and agree to abide by the Terms & Conditions of Archaeo Trails. I understand that participation in this heritage tour is voluntary, and I agree to follow the instructions of the organizers throughout the tour. I accept full responsibility for my conduct and acknowledge that Archaeo Trails shall not be held liable for any loss, damage, injury, or delay arising from circumstances beyond its reasonable control.

I have read, understood, and agree to the above declaration and the Terms & Conditions.`;

// Both "phone" blocks share these rules — Indian mobile numbers start 6-9 and
// are exactly 10 digits.
const INDIAN_MOBILE = {
  pattern: "^[6-9]\\d{9}$",
  message: "Enter a valid 10-digit Indian mobile number.",
  maxLength: 10,
  digitsOnly: true,
  inputMode: "numeric",
  prefix: "+91",
};

export const predefinedBlocks = [
  // ---------------------------------------------------------------- personal
  {
    key: "fullName",
    group: "Personal",
    paletteLabel: "Name",
    icon: "user",
    keywords: "full name person applicant",
    field: {
      type: "text",
      name: "fullName",
      label: "Full Name",
      placeholder: "As it appears on your ID",
      required: true,
      width: 6,
      // Marks this as the field whose answer becomes SubmitterName on submit.
      role: "submitterName",
      validation: { minLength: 2, message: "Please enter your full name." },
    },
  },
  {
    key: "emailAddress",
    group: "Personal",
    paletteLabel: "Email",
    icon: "email",
    keywords: "mail address e-mail",
    field: {
      type: "email",
      name: "email",
      label: "Email Address",
      placeholder: "you@example.com",
      required: true,
      width: 6,
      role: "submitterEmail",
      validation: {
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$",
        message: "Enter a valid email address.",
        inputMode: "email",
      },
    },
  },
  {
    key: "phoneIndian",
    group: "Personal",
    paletteLabel: "Phone",
    icon: "phone",
    keywords: "mobile number contact whatsapp",
    field: {
      type: "phone",
      name: "phone",
      label: "Phone Number",
      placeholder: "10-digit mobile number",
      required: true,
      width: 6,
      validation: { ...INDIAN_MOBILE },
    },
  },
  {
    key: "emergencyContact",
    group: "Personal",
    paletteLabel: "Emergency",
    icon: "bell",
    keywords: "emergency contact number next of kin",
    field: {
      type: "phone",
      name: "emergencyContactNumber",
      label: "Emergency Contact Number",
      placeholder: "Reachable during the tour",
      required: true,
      width: 6,
      validation: { ...INDIAN_MOBILE },
    },
  },
  {
    key: "addressIndian",
    group: "Personal",
    paletteLabel: "Address",
    icon: "address",
    keywords: "street city state pincode postal door",
    field: {
      type: "group",
      name: "address",
      label: "Address",
      required: true,
      width: 12,
      // Wires the PIN-code -> city/state lookup in FormRenderer. Sub-field
      // names are matched by role, so renaming labels can't break it.
      behavior: "indianAddress",
      children: [
        {
          type: "text",
          name: "doorNo",
          label: "Door / Flat Number",
          placeholder: "e.g. 12/4B",
          required: true,
          width: 6,
        },
        {
          type: "text",
          name: "street",
          label: "Street Name",
          placeholder: "Street / Area",
          required: true,
          width: 6,
        },
        {
          type: "text",
          name: "line2",
          label: "Address Line 2",
          placeholder: "Landmark, locality (optional)",
          required: false,
          width: 12,
        },
        {
          type: "text",
          name: "pincode",
          label: "PIN Code",
          placeholder: "6 digits",
          required: true,
          width: 4,
          role: "pincode",
          validation: {
            pattern: "^[1-9]\\d{5}$",
            message: "Enter a valid 6-digit PIN code.",
            maxLength: 6,
            digitsOnly: true,
            inputMode: "numeric",
          },
        },
        {
          type: "text",
          name: "city",
          label: "City",
          placeholder: "Fills in from the PIN code",
          required: true,
          width: 4,
          role: "city",
        },
        {
          type: "select",
          name: "state",
          label: "State",
          required: true,
          width: 4,
          role: "state",
          // Pulled from Config/indiaGeo.config.js rather than inlined, so a
          // saved form stores one word instead of 36 strings.
          optionsFrom: "indiaStates",
          options: [],
        },
      ],
    },
  },

  // ------------------------------------------------------------------- event
  {
    key: "registrationType",
    group: "Event",
    paletteLabel: "Reg. type",
    icon: "users",
    keywords: "registration individual group booking type",
    field: {
      type: "select",
      name: "registrationType",
      label: "Registration type",
      placeholder: "-Select-",
      required: true,
      width: 6,
      options: ["Individual", "Group"],
    },
  },
  {
    key: "attendeeCount",
    group: "Event",
    paletteLabel: "Attendees",
    icon: "attendees",
    keywords: "number of attendees people count group size",
    field: {
      type: "number",
      name: "numberOfAttendees",
      label: "Number of Attendees",
      placeholder: "1",
      required: true,
      width: 6,
      helpText: "Enter 1 for an individual registration.",
      validation: { min: 1, max: 50, inputMode: "numeric", message: "Enter between 1 and 50 attendees." },
    },
  },
  {
    key: "preferredLunch",
    group: "Event",
    paletteLabel: "Lunch",
    icon: "lunch",
    keywords: "food meal veg preference lunch",
    field: {
      type: "checkbox",
      name: "preferredLunch",
      label: "Preferred Lunch",
      required: true,
      width: 12,
      options: ["Veg Rice", "Sambhar Rice", "Curd Rice"],
    },
  },
  {
    key: "heardAbout",
    group: "Event",
    paletteLabel: "Heard via",
    icon: "megaphone",
    keywords: "how did you hear source referral marketing",
    field: {
      type: "checkbox",
      name: "heardAboutEvent",
      label: "How did you hear about this event?",
      required: true,
      width: 12,
      options: ["Whatsapp", "Instagram", "Website", "Facebook", "Other"],
      // Ticking the option named below reveals a free-text box; the answer is
      // stored as "Other: <text>" so it stays one string.
      allowOther: true,
      otherLabel: "Other",
    },
  },
  {
    key: "eventUpdates",
    group: "Event",
    paletteLabel: "Updates",
    icon: "bell",
    keywords: "updates newsletter subscribe upcoming events",
    field: {
      type: "radio",
      name: "wantsEventUpdates",
      label: "Would you like to be updated about the upcoming Events?",
      required: false,
      width: 12,
      options: ["Yes", "No"],
    },
  },

  // ----------------------------------------------------------------- consent
  {
    key: "termsAndConditions",
    group: "Consent",
    paletteLabel: "Terms",
    icon: "terms",
    keywords: "terms conditions policy refund cancellation agree",
    field: {
      type: "terms",
      name: "termsAccepted",
      label: "Terms and Conditions",
      required: true,
      width: 12,
      // The scrollable body, and the line beside the tick box.
      bodyText: CANCELLATION_POLICY,
      acknowledgementText: "I have read and agree to the Terms & Conditions.",
    },
  },
  {
    key: "declaration",
    group: "Consent",
    paletteLabel: "Declaration",
    icon: "consent",
    keywords: "declaration consent agree responsibility liability",
    field: {
      type: "consent",
      name: "declarationAccepted",
      label: "Declaration",
      required: true,
      width: 12,
      acknowledgementText: DECLARATION_TEXT,
    },
  },
];

/** Catalogue keys of the blocks a brand-new form starts with. */
export const DEFAULT_FORM_BLOCKS = ["fullName", "emailAddress"];

export const predefinedBlockByKey = Object.fromEntries(
  predefinedBlocks.map((b) => [b.key, b])
);
