"use strict";

// The single approved public/owner business contact number.
// Customer, staff, delivery and historical order numbers are never rewritten.
const OFFICIAL_PHONE = "+970562499924";
const OFFICIAL_WHATSAPP_DIGITS = "970562499924";
const OFFICIAL_WHATSAPP_URL = "https://wa.me/" + OFFICIAL_WHATSAPP_DIGITS;

function applyOfficialContactSettings(settings) {
  const incoming = settings && typeof settings === "object" && !Array.isArray(settings)
    ? { ...settings } : {};
  for (const key of ["phone", "whatsapp", "whatsapp_number"]) {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      incoming[key] = OFFICIAL_PHONE;
    }
  }
  for (const key of ["social_links", "social"]) {
    const socials = incoming[key];
    if (!socials || typeof socials !== "object" || Array.isArray(socials)) continue;
    if (socials.whatsapp && typeof socials.whatsapp === "object" && !Array.isArray(socials.whatsapp)) {
      incoming[key] = {
        ...socials,
        whatsapp: { ...socials.whatsapp, url: OFFICIAL_WHATSAPP_URL }
      };
    }
  }
  return incoming;
}

module.exports = {
  OFFICIAL_PHONE, OFFICIAL_WHATSAPP_DIGITS, OFFICIAL_WHATSAPP_URL,
  applyOfficialContactSettings
};
