import type { ZodError } from 'zod';

/** Map first Zod issue per top-level field key for inline messages. */
export function zodErrorToFieldMap(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key =
      issue.path.length > 0 ? String(issue.path[0]) : '_root';
    if (out[key] === undefined) {
      out[key] = issue.message;
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
