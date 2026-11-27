export const MAX_COMMENT_CHARS = 140;

/** Friendly client-side check. The database enforces the same rules and is the real guard. */
export function commentProblem(raw: string): string | null {
  const t = raw.trim();
  if (t.length > MAX_COMMENT_CHARS) return `Please keep it under ${MAX_COMMENT_CHARS} characters.`;
  if (/[\u0000-\u001f\u007f]/.test(t)) return "Please keep it to one line.";
  if (/[\w.%+-]+@[\w-]+/i.test(t)) return "Please leave out email addresses.";
  if (/(https?:|www\.|\.com|\.org|\.net|\.au)/i.test(t)) return "Please leave out links.";
  if (/([0-9][\s().-]*){8,}/.test(t)) return "Please leave out phone numbers.";
  return null;
}
