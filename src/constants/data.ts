import { ChainBackendNames } from './server';

export const INJECTED_WEB3_CDN = 'https://public.cypherd.io/js/injected.web3.js';

export const gasFeeReservation: Record<ChainBackendNames, number> = {
  AVALANCHE: 0.001,
  BSC: 0.001,
  COSMOS: 0.1,
  EVMOS: 0.1,
  FANTOM: 0.1,
  JUNO: 0.1,
  OSMOSIS: 0.1,
  POLYGON: 0.1,
  ETH: 0.001,
  ARBITRUM: 0.001,
  OPTIMISM: 0.001,
  STARGAZE: 0.1
};

export const nativeTokenMapping: Record<ChainBackendNames, string> = {
  ETH: 'Ethereum',
  POLYGON: 'Matic',
  AVALANCHE: 'Avalanche',
  FANTOM: 'Fantom',
  ARBITRUM: 'Ethereum',
  OPTIMISM: 'Ethereum',
  BSC: 'Binance',
  EVMOS: 'Evmos',
  COSMOS: 'Atom',
  OSMOSIS: 'Osmo',
  JUNO: 'Juno',
  STARGAZE: 'Stargaze'
};

export const months = [
  {
    value: 'Jan',
    label: 'January'
  },
  {
    value: 'Feb',
    label: 'February'
  },
  {
    value: 'Mar',
    label: 'March'
  },
  {
    value: 'Apr',
    label: 'April'
  },
  {
    value: 'May',
    label: 'May'
  },
  {
    value: 'Jun',
    label: 'June'
  },
  {
    value: 'Jul',
    label: 'July'
  },
  {
    value: 'Aug',
    label: 'August'
  },
  {
    value: 'Sep',
    label: 'September'
  },
  {
    value: 'Oct',
    label: 'October'
  },
  {
    value: 'Nov',
    label: 'November'
  },
  {
    value: 'Dec',
    label: 'December'
  }
];

export const ensAbi = [{ inputs: [{ internalType: 'contract ENS', name: '_ens', type: 'address' }], payable: false, stateMutability: 'nonpayable', type: 'constructor' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: true, internalType: 'uint256', name: 'contentType', type: 'uint256' }], name: 'ABIChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'address', name: 'a', type: 'address' }], name: 'AddrChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'uint256', name: 'coinType', type: 'uint256' }, { indexed: false, internalType: 'bytes', name: 'newAddress', type: 'bytes' }], name: 'AddressChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: true, internalType: 'address', name: 'owner', type: 'address' }, { indexed: true, internalType: 'address', name: 'target', type: 'address' }, { indexed: false, internalType: 'bool', name: 'isAuthorised', type: 'bool' }], name: 'AuthorisationChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'bytes', name: 'hash', type: 'bytes' }], name: 'ContenthashChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'bytes', name: 'name', type: 'bytes' }, { indexed: false, internalType: 'uint16', name: 'resource', type: 'uint16' }, { indexed: false, internalType: 'bytes', name: 'record', type: 'bytes' }], name: 'DNSRecordChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'bytes', name: 'name', type: 'bytes' }, { indexed: false, internalType: 'uint16', name: 'resource', type: 'uint16' }], name: 'DNSRecordDeleted', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }], name: 'DNSZoneCleared', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: true, internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' }, { indexed: false, internalType: 'address', name: 'implementer', type: 'address' }], name: 'InterfaceChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'string', name: 'name', type: 'string' }], name: 'NameChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: false, internalType: 'bytes32', name: 'x', type: 'bytes32' }, { indexed: false, internalType: 'bytes32', name: 'y', type: 'bytes32' }], name: 'PubkeyChanged', type: 'event' }, { anonymous: false, inputs: [{ indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' }, { indexed: true, internalType: 'string', name: 'indexedKey', type: 'string' }, { indexed: false, internalType: 'string', name: 'key', type: 'string' }], name: 'TextChanged', type: 'event' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'uint256', name: 'contentTypes', type: 'uint256' }], name: 'ABI', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }, { internalType: 'bytes', name: '', type: 'bytes' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }], name: 'addr', outputs: [{ internalType: 'address payable', name: '', type: 'address' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'uint256', name: 'coinType', type: 'uint256' }], name: 'addr', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }, { internalType: 'address', name: '', type: 'address' }, { internalType: 'address', name: '', type: 'address' }], name: 'authorisations', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }], name: 'clearDNSZone', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }], name: 'contenthash', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes32', name: 'name', type: 'bytes32' }, { internalType: 'uint16', name: 'resource', type: 'uint16' }], name: 'dnsRecord', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes32', name: 'name', type: 'bytes32' }], name: 'hasDNSRecords', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' }], name: 'interfaceImplementer', outputs: [{ internalType: 'address', name: '', type: 'address' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }], name: 'multicall', outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }], name: 'pubkey', outputs: [{ internalType: 'bytes32', name: 'x', type: 'bytes32' }, { internalType: 'bytes32', name: 'y', type: 'bytes32' }], payable: false, stateMutability: 'view', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'uint256', name: 'contentType', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], name: 'setABI', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'uint256', name: 'coinType', type: 'uint256' }, { internalType: 'bytes', name: 'a', type: 'bytes' }], name: 'setAddr', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'address', name: 'a', type: 'address' }], name: 'setAddr', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'address', name: 'target', type: 'address' }, { internalType: 'bool', name: 'isAuthorised', type: 'bool' }], name: 'setAuthorisation', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes', name: 'hash', type: 'bytes' }], name: 'setContenthash', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], name: 'setDNSRecords', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' }, { internalType: 'address', name: 'implementer', type: 'address' }], name: 'setInterface', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'string', name: 'name', type: 'string' }], name: 'setName', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'bytes32', name: 'x', type: 'bytes32' }, { internalType: 'bytes32', name: 'y', type: 'bytes32' }], name: 'setPubkey', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: false, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'string', name: 'key', type: 'string' }, { internalType: 'string', name: 'value', type: 'string' }], name: 'setText', outputs: [], payable: false, stateMutability: 'nonpayable', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' }], name: 'supportsInterface', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], payable: false, stateMutability: 'pure', type: 'function' }, { constant: true, inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'string', name: 'key', type: 'string' }], name: 'text', outputs: [{ internalType: 'string', name: '', type: 'string' }], payable: false, stateMutability: 'view', type: 'function' }];
