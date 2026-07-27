export type ContactNormalizationErrorCode =
  | "invalid_type"
  | "invalid_format"
  | "invalid_length"
  | "missing_area_code"
  | "unsupported_country"
  | "too_long";

export type ContactNormalizationResult<T> =
  | Readonly<{ ok: true; value: T | null }>
  | Readonly<{ ok: false; error: ContactNormalizationErrorCode }>;

export type NormalizedBrazilianPhone = Readonly<{
  original: string;
  normalized: `+55${string}`;
}>;

export type NormalizedEmail = Readonly<{
  original: string;
  normalized: string;
}>;

const PHONE_FORMATTING_PATTERN = /^[0-9+\s().-]+$/;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_PART_MAX_LENGTH = 64;

export function normalizeBrazilianPhone(
  input: unknown,
): ContactNormalizationResult<NormalizedBrazilianPhone> {
  if (typeof input !== "string") return { ok: false, error: "invalid_type" };

  const original = input.trim();
  if (!original) return { ok: true, value: null };
  if (!PHONE_FORMATTING_PATTERN.test(original)) {
    return { ok: false, error: "invalid_format" };
  }

  const plusMatches = original.match(/\+/g)?.length ?? 0;
  if (plusMatches > 1 || (plusMatches === 1 && !original.startsWith("+"))) {
    return { ok: false, error: "invalid_format" };
  }

  const digits = original.replace(/\D/g, "");
  const hasExplicitCountryCode = original.startsWith("+");
  if (hasExplicitCountryCode && !digits.startsWith("55")) {
    return { ok: false, error: "unsupported_country" };
  }

  let nationalNumber: string;
  if (digits.length === 10 || digits.length === 11) {
    nationalNumber = digits;
  } else if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith("55")) {
      return { ok: false, error: "unsupported_country" };
    }
    nationalNumber = digits.slice(2);
  } else if (digits.length === 8 || digits.length === 9) {
    return { ok: false, error: "missing_area_code" };
  } else {
    return { ok: false, error: "invalid_length" };
  }

  if (!/^[1-9]{2}[0-9]{8,9}$/.test(nationalNumber)) {
    return { ok: false, error: "missing_area_code" };
  }

  return {
    ok: true,
    value: {
      original,
      normalized: `+55${nationalNumber}`,
    },
  };
}

export function normalizeEmail(
  input: unknown,
): ContactNormalizationResult<NormalizedEmail> {
  if (typeof input !== "string") return { ok: false, error: "invalid_type" };

  const original = input.trim();
  if (!original) return { ok: true, value: null };
  if (original.length > EMAIL_MAX_LENGTH) return { ok: false, error: "too_long" };

  const normalized = original.toLowerCase();
  const atIndex = normalized.indexOf("@");
  if (atIndex <= 0 || atIndex !== normalized.lastIndexOf("@")) {
    return { ok: false, error: "invalid_format" };
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const domainLabels = domain.split(".");
  const hasValidLocalPart =
    localPart.length <= EMAIL_LOCAL_PART_MAX_LENGTH &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart);
  const hasValidDomain =
    domainLabels.length >= 2 &&
    domainLabels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        !label.startsWith("-") &&
        !label.endsWith("-") &&
        /^[a-z0-9-]+$/.test(label),
    ) &&
    domainLabels.at(-1)!.length >= 2;

  if (!hasValidLocalPart || !hasValidDomain) {
    return { ok: false, error: "invalid_format" };
  }

  return { ok: true, value: { original, normalized } };
}

export const CONTACT_NORMALIZATION_EXAMPLES = Object.freeze({
  validPhones: [
    ["(82) 99999-0000", "+5582999990000"],
    ["82999990000", "+5582999990000"],
    ["5582999990000", "+5582999990000"],
  ],
  invalidPhoneKinds: [
    "missing_area_code",
    "invalid_length",
    "unsupported_country",
  ],
  validEmail: [" Contato@Exemplo.COM ", "contato@exemplo.com"],
  invalidEmailKinds: ["invalid_format", "too_long"],
} as const);
