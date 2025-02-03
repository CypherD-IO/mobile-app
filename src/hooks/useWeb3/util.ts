import Long from 'long';
import { StdSignDoc } from '@cosmjs/launchpad';
import { EmbedChainInfos as ChainInfos } from '../../constants/config';
import {
  BASE_GAS_LIMIT,
  CHAIN_OPTIMISM,
  OPTIMISM_GAS_MULTIPLIER,
  CONTRACT_GAS_MULTIPLIER,
  OP_ETH_ADDRESS,
  CHAIN_BSC,
} from '../../constants/server';
import { DecimalHelper } from '../../utils/decimalHelper';

export const getChainInfo = (chainId: string) => {
  const chainInfo = ChainInfos.find(info => info.chainId === chainId);
  if (chainInfo) {
    return chainInfo;
  }
  throw new Error(`There is no chain info for ${chainId}`);
};

function toHex(data: Uint8Array): string {
  let out = '';
  for (const byte of data) {
    out += ('0' + byte.toString(16)).slice(-2);
  }
  return out;
}

function fromHex(hexstring: string): Uint8Array {
  if (hexstring.length % 2 !== 0) {
    throw new Error('hex string length must be a multiple of 2');
  }

  const listOfInts: number[] = [];
  for (let i = 0; i < hexstring.length; i += 2) {
    const hexByteAsString = hexstring.substr(i, 2);
    if (!hexByteAsString.match(/[0-9a-f]{2}/i)) {
      throw new Error('hex string contains invalid characters');
    }
    listOfInts.push(parseInt(hexByteAsString, 16));
  }
  return new Uint8Array(listOfInts);
}

export class JSONUint8Array {
  static parse(text: string) {
    return JSON.parse(text, (key, value) => {
      // Prevent potential prototype poisoning.
      if (key === '__proto__') {
        throw new Error('__proto__ is disallowed');
      }

      if (
        value &&
        typeof value === 'string' &&
        value.startsWith('__uint8array__')
      ) {
        return fromHex(value.replace('__uint8array__', ''));
      }

      return value;
    });
  }

  static stringify(obj: unknown): string {
    return JSON.stringify(obj, (key, value) => {
      // Prevent potential prototype poisoning.
      if (key === '__proto__') {
        throw new Error('__proto__ is disallowed');
      }

      if (
        value &&
        (value instanceof Uint8Array ||
          (typeof value === 'object' &&
            'type' in value &&
            'data' in value &&
            value.type === 'Buffer' &&
            Array.isArray(value.data)))
      ) {
        const array =
          value instanceof Uint8Array ? value : new Uint8Array(value.data);

        return `__uint8array__${toHex(array)}`;
      }

      return value;
    });
  }

  static wrap(obj: any): any {
    if (obj === undefined) return undefined;

    return JSON.parse(JSONUint8Array.stringify(obj));
  }

  static unwrap(obj: any): any {
    if (obj === undefined) return undefined;

    return JSONUint8Array.parse(JSON.stringify(obj));
  }
}

export function checkAndValidateADR36AminoSignDoc(
  signDoc: StdSignDoc,
  bech32PrefixAccAddr?: string,
): boolean {
  const hasOnlyMsgSignData = (() => {
    if (
      signDoc?.msgs &&
      Array.isArray(signDoc.msgs) &&
      signDoc.msgs.length === 1
    ) {
      const msg = signDoc.msgs[0];
      return msg.type === 'sign/MsgSignData';
    } else {
      return false;
    }
  })();

  if (!hasOnlyMsgSignData) {
    return false;
  }

  if (signDoc.chain_id !== '') {
    throw new Error('Chain id should be empty string for ADR-36 signing');
  }

  if (signDoc.memo !== '') {
    throw new Error('Memo should be empty string for ADR-36 signing');
  }

  if (signDoc.account_number !== '0') {
    throw new Error('Account number should be "0" for ADR-36 signing');
  }

  if (signDoc.sequence !== '0') {
    throw new Error('Sequence should be "0" for ADR-36 signing');
  }

  if (signDoc.fee.gas !== '0') {
    throw new Error('Gas should be "0" for ADR-36 signing');
  }

  if (signDoc.fee.amount.length !== 0) {
    throw new Error('Fee amount should be empty array for ADR-36 signing');
  }

  const msg = signDoc.msgs[0];
  if (msg.type !== 'sign/MsgSignData') {
    throw new Error(`Invalid type of ADR-36 sign msg: ${msg.type}`);
  }
  if (!msg.value) {
    throw new Error('Empty value in the msg');
  }
  const signer = msg.value.signer;
  if (!signer) {
    throw new Error('Empty signer in the ADR-36 msg');
  }

  if (!signer.startsWith(bech32PrefixAccAddr)) {
    throw new Error('Singer prefix mismatch');
  }

  const data = msg.value.data;
  if (!data) {
    throw new Error('Empty data in the ADR-36 msg');
  }
  const rawData = Buffer.from(data, 'base64');

  // Validate the data is encoded as base64.
  if (rawData.toString('base64') !== data) {
    throw new Error('Data is not encoded by base64');
  }
  if (rawData.length === 0) {
    throw new Error('Empty data in the ADR-36 msg');
  }

  return true;
}

export const parseCosmosMessage = (msg: any) => {
  const message = typeof msg === 'string' ? JSON.parse(msg) : msg;

  if (!message || message.type !== 'proxy-request') {
    return;
  }

  if (!message.id) {
    throw new Error('Empty id');
  }

  const notSupportedMethods = ['version', 'mode', 'defaultOptions'];
  const notAProxyRequest = [
    'getOfflineSigner',
    'getOfflineSignerOnlyAmino',
    'getOfflineSignerAuto',
    'getEnigmaUtils',
  ];

  if (notSupportedMethods.includes(message.method)) {
    throw new Error(`${message?.method as string} is not function`);
  }

  if (notAProxyRequest.includes(message.method)) {
    throw new Error(
      `${message?.method as string} method can't be proxy request`,
    );
  }

  if (message.method === 'signDirect') {
    const [arg0, arg1, arg2, arg3] = JSONUint8Array.unwrap(message.args);
    const receivedSignDoc: {
      bodyBytes?: Uint8Array | null;
      authInfoBytes?: Uint8Array | null;
      chainId?: string | null;
      accountNumber?: string | null;
    } = arg2;

    const preparedSingDoc = {
      bodyBytes: receivedSignDoc.bodyBytes,
      authInfoBytes: receivedSignDoc.authInfoBytes,
      chainId: receivedSignDoc.chainId,
      accountNumber: receivedSignDoc.accountNumber
        ? Long.fromString(receivedSignDoc.accountNumber)
        : null,
    };

    return [arg0, arg1, preparedSingDoc, arg3];
  } else {
    return [...JSONUint8Array.unwrap(message.args)];
  }
};

export const decideGasLimitBasedOnTypeOfToAddress = (
  code: string,
  gasLimit: number | bigint,
  chain: string,
  contractAddress: string,
): number => {
  if (gasLimit > BASE_GAS_LIMIT) {
    if (code !== '0x') {
      return DecimalHelper.multiply(CONTRACT_GAS_MULTIPLIER, gasLimit)
        .floor()
        .toNumber();
    }
    return Number(gasLimit);
  } else if (
    (contractAddress.toLowerCase() === OP_ETH_ADDRESS &&
      chain === CHAIN_OPTIMISM.backendName) ||
    (contractAddress.toLowerCase() ===
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' &&
      chain === CHAIN_BSC.backendName)
  ) {
    return DecimalHelper.multiply(BASE_GAS_LIMIT, OPTIMISM_GAS_MULTIPLIER)
      .floor()
      .toNumber();
  } else {
    return BASE_GAS_LIMIT;
  }
};
