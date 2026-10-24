export type PiiKind = "phone" | "email" | "government_id";

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/iu;
// 10 to 13 digits, optionally with +, spaces, dashes or dots between groups.
const PHONE = /(?<![\d])(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,11}\d(?![\d])/u;
// Aadhaar-style number: 12 digits, usually grouped 4-4-4.
const AADHAAR = /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/u;
// PAN-style: five letters, four digits, one letter.
const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/u;

/** Finds things that look like personal details. Used to ask "are you sure?", never to block. */
export function findPersonalDetails(text: string): PiiKind[] {
  const found = new Set<PiiKind>();
  if (EMAIL.test(text)) found.add("email");
  if (AADHAAR.test(text) || PAN.test(text)) found.add("government_id");
  if (PHONE.test(text)) found.add("phone");
  return [...found];
}
