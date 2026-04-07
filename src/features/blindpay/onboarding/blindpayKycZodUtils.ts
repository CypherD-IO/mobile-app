import type { ZodError } from 'zod';

/**
 * Replace Zod's technical default messages with human-readable ones.
 * Common cases: invalid enum values, undefined required fields.
 */
function humanizeMessage(issue: any): string {
  const msg = issue.message ?? '';
  // Zod's default invalid enum / option / type messages — replace with generic "required" text
  if (
    issue.code === 'invalid_enum_value' ||
    issue.code === 'invalid_value' ||
    msg.startsWith('Invalid option') ||
    msg.startsWith('Expected')
  ) {
    return 'Please make a selection';
  }
  return msg;
}

/** Map first Zod issue per top-level field key for inline messages. */
export function zodErrorToFieldMap(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key =
      issue.path.length > 0 ? String(issue.path[0]) : '_root';
    if (out[key] === undefined) {
      out[key] = humanizeMessage(issue);
    }
  }
  return out;
}

export function omitFieldError(
  prev: Record<string, string>,
  key: string,
): Record<string, string> {
  if (!prev[key]) {
    return prev;
  }
  return Object.fromEntries(
    Object.entries(prev).filter(([k]) => k !== key),
  );
}
