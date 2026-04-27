/**
 * BlindPay redirects after TOS acceptance with a 15-character terms id.
 * Query param name may be tos_id (per product spec) or similar.
 */
const TOS_ID_PATTERN = /[?&#](?:tos_id|tosId|terms_id|termsId)=([^&]+)/i;

export function extractTermsIdFromUrl(url: string): string | null {
  const match = url.match(TOS_ID_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  let raw: string;
  try {
    raw = decodeURIComponent(match[1].trim());
  } catch {
    // Malformed percent-encoding — treat as no match
    return null;
  }
  if (raw.length === 15) {
    return raw;
  }
  return null;
}
