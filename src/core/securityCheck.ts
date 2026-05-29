import axios from 'axios';
import { hostWorker } from '../global';

interface SecurityCheckResponse {
  addresses: Record<string, boolean>;
  hosts: Record<string, boolean>;
}

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const ENDPOINT_PATH = '/v1/security/check';
const REQUEST_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const addressCache = new Map<string, CacheEntry>();
const hostCache = new Map<string, CacheEntry>();

const now = (): number => Date.now();

const readCache = (cache: Map<string, CacheEntry>, key: string): boolean | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const writeCache = (cache: Map<string, CacheEntry>, key: string, value: boolean): void => {
  cache.set(key, { value, expiresAt: now() + CACHE_TTL_MS });
};

const normaliseAddress = (addr: string): string => addr.trim().toLowerCase();
const normaliseHost = (host: string): string => host.trim().toLowerCase().replace(/^www\./, '');

/**
 * Calls arch's POST /v1/security/check endpoint. Best-effort: any failure (network,
 * timeout, 5xx) resolves to "not scam" for every input so the wallet never blocks a
 * legitimate flow because the security service is unreachable. Bundled `knownDrainers`
 * remains the offline floor.
 */
export async function checkSecurity(input: {
  addresses?: string[];
  hosts?: string[];
}): Promise<SecurityCheckResponse> {
  const addresses = (input.addresses ?? []).map(normaliseAddress).filter(Boolean);
  const hosts = (input.hosts ?? []).map(normaliseHost).filter(Boolean);

  const result: SecurityCheckResponse = { addresses: {}, hosts: {} };

  const uncachedAddresses: string[] = [];
  for (const addr of addresses) {
    const cached = readCache(addressCache, addr);
    if (cached === undefined) uncachedAddresses.push(addr);
    else result.addresses[addr] = cached;
  }
  const uncachedHosts: string[] = [];
  for (const host of hosts) {
    const cached = readCache(hostCache, host);
    if (cached === undefined) uncachedHosts.push(host);
    else result.hosts[host] = cached;
  }

  if (uncachedAddresses.length === 0 && uncachedHosts.length === 0) {
    return result;
  }

  try {
    const base = hostWorker.getHost('ARCH_HOST');
    const { data } = await axios.post<SecurityCheckResponse>(
      `${base}${ENDPOINT_PATH}`,
      {
        addresses: uncachedAddresses.length ? uncachedAddresses : undefined,
        hosts: uncachedHosts.length ? uncachedHosts : undefined,
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    for (const [addr, hit] of Object.entries(data?.addresses ?? {})) {
      result.addresses[addr] = Boolean(hit);
      writeCache(addressCache, addr, Boolean(hit));
    }
    for (const [host, hit] of Object.entries(data?.hosts ?? {})) {
      result.hosts[host] = Boolean(hit);
      writeCache(hostCache, host, Boolean(hit));
    }
    // Backfill any inputs the server omitted from the response so the cache
    // remembers the "miss" verdict instead of re-asking next call.
    for (const addr of uncachedAddresses) {
      if (!(addr in result.addresses)) {
        result.addresses[addr] = false;
        writeCache(addressCache, addr, false);
      }
    }
    for (const host of uncachedHosts) {
      if (!(host in result.hosts)) {
        result.hosts[host] = false;
        writeCache(hostCache, host, false);
      }
    }
  } catch {
    // Fail open — leave uncached entries as `false`. Bundled list covers the floor.
    for (const addr of uncachedAddresses) result.addresses[addr] = false;
    for (const host of uncachedHosts) result.hosts[host] = false;
  }

  return result;
}

export async function isAddressScamRemote(addr: string | null | undefined): Promise<boolean> {
  if (!addr) return false;
  const lower = normaliseAddress(addr);
  if (!lower) return false;
  const result = await checkSecurity({ addresses: [lower] });
  return Boolean(result.addresses[lower]);
}

export async function isHostScamRemote(host: string | null | undefined): Promise<boolean> {
  if (!host) return false;
  const lower = normaliseHost(host);
  if (!lower) return false;
  const result = await checkSecurity({ hosts: [lower] });
  return Boolean(result.hosts[lower]);
}
