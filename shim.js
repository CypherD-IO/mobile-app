import { decode, encode } from 'base-64';
import { install } from 'react-native-quick-crypto';

install();

/**
 * Global polyfills / environment shims for React Native + Hermes.
 *
 * Important: do NOT pretend we're running in a browser.
 * RN 0.83 removed some legacy web compat surfaces, and several dependencies will
 * accidentally take their "web" code path if we set:
 *   - `process.browser = true`
 *   - `global.location.protocol = 'file:'`
 *
 * That leads to runtime crashes like:
 * - `ReferenceError: Property 'document' doesn't exist` (styled-components rehydration)
 * - `ReferenceError: Property 'WebAssembly' doesn't exist` (libsodium WASM path)
 *
 * We intentionally keep `process.browser = false` for RN.
 */

// NOTE:
// We previously had extra shims here to avoid DOM/WebAssembly crashes while we were still on
// `styled-components@5.x` and a WASM-only libsodium bundle. We upgraded those dependencies, so
// we keep this file minimal and avoid brittle environment spoofing.

if (typeof BigInt === 'undefined') {
  global.BigInt = require('big-integer');
}
if (!global.btoa) global.btoa = encode;
if (!global.atob) global.atob = decode;
if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';
if (typeof process === 'undefined') {
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (const p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}

// RN is not a browser environment.
process.browser = false;
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;

// Ensure base64 globals expected by some web3/crypto libs are always present.
// Use base64-js to avoid recursive paths through Buffer/polyfills.
if (typeof global.base64ToArrayBuffer !== 'function') {
  global.base64ToArrayBuffer = (b64, removeLinebreaks = false) => {
    const { toByteArray } = require('base64-js');
    const normalized = removeLinebreaks
      ? b64.replace(/(\r\n|\n|\r)/gm, '')
      : b64;
    const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = toByteArray(base64);
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
  };
}

if (typeof global.base64FromArrayBuffer !== 'function') {
  global.base64FromArrayBuffer = (arrayBuffer, urlSafe = false) => {
    const { fromByteArray } = require('base64-js');
    const base64 = fromByteArray(new Uint8Array(arrayBuffer));
    if (!urlSafe) {
      return base64;
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
}

// Provide a minimal `location` so some node-core polyfills choose the correct defaults.
// We use https here to avoid accidental "file:" browser paths.
if (typeof location === 'undefined') {
  global.location = { port: 443, protocol: 'https:' };
}

const isDev = typeof __DEV__ === 'boolean' && __DEV__;
process.env.NODE_ENV = isDev ? 'development' : 'production';
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}
// NOTE: We intentionally do NOT set `process.browser = true` or `location.protocol = 'file:'`.
// Those settings cause web-only code paths to run inside Hermes and crash.

