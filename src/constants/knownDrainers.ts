/**
 * Curated blocklist of EVM spender addresses and domains tied to active
 * drainer campaigns. Add entries here when support confirms a scam; bump
 * the trailing comment with the campaign + date so we can prune later.
 *
 * Domain entries match the exact host plus any subdomain.
 */

const RAW_DRAINER_ADDRESSES: string[] = [
  // farmeth.io drainer contract (`agentAddress` field served by /api/api/cs/user/getInfoA).
  // Receives ERC20.approve and EIP-2612 Permit spending caps from victims after they sign
  // a fake "Login" message on stakevaulteth.io and get redirected. Reported 2026-05-26.
  '0xFaC379E4acaAe6D1fae5CD84DFB5387c18910349',
];

const RAW_SCAM_DOMAINS: string[] = [
  'stakevaulteth.io', // honeypot Defi Farm, reported 2026-05-23
  'farmeth.io', // drainer landing for stakevaulteth.io, reported 2026-05-25
  'etherto.top', // related cluster, same CF backend
  'miningent.com', // related cluster, same CF backend
  'stayser.com', // related cluster, same CF backend
  'defitn.ink', // related cluster, same CF backend
  'etherh.cc', // related cluster, same CF backend
];

export const KNOWN_DRAINER_ADDRESSES: ReadonlySet<string> = new Set(
  RAW_DRAINER_ADDRESSES.map(a => a.toLowerCase()),
);

export const KNOWN_SCAM_DOMAINS: ReadonlySet<string> = new Set(
  RAW_SCAM_DOMAINS.map(d => d.toLowerCase()),
);

export function isKnownDrainerAddress(addr: string | undefined | null): boolean {
  if (!addr) return false;
  return KNOWN_DRAINER_ADDRESSES.has(addr.toLowerCase());
}

export function isKnownScamHost(host: string | undefined | null): boolean {
  if (!host) return false;
  const lower = host.toLowerCase().replace(/^www\./, '');
  if (KNOWN_SCAM_DOMAINS.has(lower)) return true;
  for (const domain of KNOWN_SCAM_DOMAINS) {
    if (lower.endsWith('.' + domain)) return true;
  }
  return false;
}

export function isKnownScamUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return isKnownScamHost(parsed.hostname);
  } catch {
    return false;
  }
}
