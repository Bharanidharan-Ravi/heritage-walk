// src/Component/Config/indiaGeo.config.js
//
// Indian state/UT list + PIN-code lookup for the address block.
//
// Deliberately NOT a database table. The free Azure SQL tier is serverless —
// the scarce resource is vCore-seconds and the DB auto-pauses, so putting
// static reference data behind a query would burn budget and make the first
// lookup after an idle period wait on a ~30-60s resume. See
// docs/form-generator/PREDEFINED_FIELDS_PLAN.md §0.
//
// The 36 states/UTs are constitutional entities that change once a decade, so
// they ship in the bundle. City/district comes from the free, key-less India
// Post API at lookup time.

/** All 28 states + 8 union territories, alphabetical. */
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// Named lists a field can pull its options from via `optionsFrom`, so a saved
// form stores the name rather than inlining 36 strings into FieldsJson.
export const NAMED_OPTION_LISTS = {
  indiaStates: INDIA_STATES,
};

export const resolveOptions = (field) =>
  (field?.optionsFrom && NAMED_OPTION_LISTS[field.optionsFrom]) || field?.options || [];

/** A 6-digit PIN that doesn't start with 0. */
export const isValidPincode = (pin) => /^[1-9]\d{5}$/.test(String(pin || "").trim());

const PINCODE_API = "https://api.postalpincode.in/pincode";

// Same PIN gets looked up repeatedly while the user tabs around the form, so
// keep answers for the life of the page. Bounded by how many PINs one person
// can type, which is not a leak worth managing.
const pincodeCache = new Map();

/**
 * PIN code -> { city, district, state, offices[] }, or null if unknown.
 *
 * Free, key-less, open India Post endpoint. Any failure (offline, rate limit,
 * CORS, shape change) resolves to null rather than throwing — the address
 * block always stays fillable by hand, so a third-party outage can never block
 * a submission.
 */
export async function lookupPincode(pin, { signal } = {}) {
  const key = String(pin || "").trim();
  if (!isValidPincode(key)) return null;
  if (pincodeCache.has(key)) return pincodeCache.get(key);

  try {
    const res = await fetch(`${PINCODE_API}/${key}`, { signal });
    if (!res.ok) return null;

    const body = await res.json();
    const entry = Array.isArray(body) ? body[0] : null;
    if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
      pincodeCache.set(key, null);
      return null;
    }

    const offices = entry.PostOffice;
    const first = offices[0];
    const result = {
      // District is the closest thing the API has to "city"; Block/Division are
      // frequently "NA", so district is the reliable one to prefill with.
      city: first.District || first.Division || "",
      district: first.District || "",
      state: first.State || "",
      offices: offices.map((o) => o.Name).filter(Boolean),
    };

    pincodeCache.set(key, result);
    return result;
  } catch {
    // Includes AbortError from a superseded lookup — the caller doesn't care.
    return null;
  }
}
