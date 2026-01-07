import { decode, encode } from 'base-64';
import {install} from 'react-native-quick-crypto';

install();

if (typeof BigInt === 'undefined') { global.BigInt = require('big-integer'); }
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
process.browser = false;
if (typeof Buffer === 'undefined') global.Buffer = require('buffer').Buffer;
if (typeof location === 'undefined') global.location = { port: 80, protocol: 'https:' };
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
process.env.NODE_ENV = isDev ? 'development' : 'production';
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}
// If using the crypto shim, uncomment the following line to ensure
// crypto is loaded first, so it can populate global.crypto
// require('crypto');

if (typeof BigInt === 'undefined') global.BigInt = require('big-integer');

/**
 * RN 0.83 / Hermes compatibility polyfills
 *
 * Some dependencies (directly or indirectly) expect these helpers to exist on `global`.
 * In older setups they were sometimes provided by the runtime or other shims.
 * When missing, modules can throw during evaluation and cause cascading "X is undefined"
 * failures later in app startup.
 */

// base64 -> ArrayBuffer
if (typeof global.base64ToArrayBuffer !== 'function') {
  global.base64ToArrayBuffer = (base64) => {
    try {
      const buf = global.Buffer.from(String(base64), 'base64');
      // Buffer may be a view into a larger ArrayBuffer; slice to the exact region.
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch (e) {
      // Fail safe: return empty buffer to avoid crashing during module init.
      return new ArrayBuffer(0);
    }
  };
}

// ArrayBuffer -> base64
if (typeof global.arrayBufferToBase64 !== 'function') {
  global.arrayBufferToBase64 = (arrayBuffer) => {
    try {
      return global.Buffer.from(arrayBuffer).toString('base64');
    } catch (e) {
      return '';
    }
  };
}


// Needed so that 'stream-http' chooses the right default protocol.
// @ts-ignore
global.location = {
  protocol: 'file:',
};
// @ts-ignore
global.process.version = 'v16.0.0';
if (!global.process.version) {
  global.process = require('process');
}
// @ts-ignore
process.browser = true;

