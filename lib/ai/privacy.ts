export interface PiiScrubResult {
  text: string;
  redactionCount: number;
}

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b/g;
const cardPattern = /\b(?:\d[ -]*?){13,16}\b/g;
const passportPattern = /\b[A-Z]{1,2}\d{6,9}\b/g;
const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;

export function scrubPII(input: string): PiiScrubResult {
  let redactionCount = 0;

  const replaceWithToken = (pattern: RegExp, token: string, value: string) =>
    value.replace(pattern, () => {
      redactionCount += 1;
      return token;
    });

  let sanitized = input;
  sanitized = replaceWithToken(emailPattern, "[REDACTED_EMAIL]", sanitized);
  sanitized = replaceWithToken(phonePattern, "[REDACTED_PHONE]", sanitized);
  sanitized = replaceWithToken(cardPattern, "[REDACTED_CARD]", sanitized);
  sanitized = replaceWithToken(passportPattern, "[REDACTED_ID]", sanitized);
  sanitized = replaceWithToken(ssnPattern, "[REDACTED_SSN]", sanitized);

  return {
    text: sanitized,
    redactionCount,
  };
}

export function ensurePrivacyInstruction(prompt: string): string {
  return `${prompt}\n\nPRIVACY RULE: Never output names, phone numbers, emails, payment details, or any identifiable personal data.`;
}
