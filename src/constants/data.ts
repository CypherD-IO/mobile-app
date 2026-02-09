import {
  ApplicationName,
  CypherDeclineCodes,
  CypherPlanId,
  RPCODES,
} from './enum';
import {
  CHAIN_SOLANA,
  CHAIN_ARBITRUM,
  CHAIN_AVALANCHE,
  CHAIN_BASE,
  CHAIN_BSC,
  CHAIN_COREUM,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_INJECTIVE,
  CHAIN_NOBLE,
  CHAIN_OPTIMISM,
  CHAIN_OSMOSIS,
  CHAIN_POLYGON,
  ChainBackendNames,
  CHAIN_ZKSYNC_ERA,
  Chain,
} from './server';

export const INJECTED_WEB3_CDN =
  'https://public.cypherd.io/js/injected.web3.js';

export const ANALYTICS_SUCCESS_URL =
  'https://arch.cypherd.io/v1/monitoring/transaction';

export const ANALYTICS_ERROR_URL =
  'https://arch.cypherd.io/v1/monitoring/error';

export const gasFeeReservation: Record<ChainBackendNames, number> = {
  ETH: 0.0006,
  POLYGON: 0.02,
  BSC: 0.0002,
  AVALANCHE: 0.002,
  OPTIMISM: 0.00001,
  ARBITRUM: 0.00001,
  COSMOS: 0.1,
  OSMOSIS: 0.2,
  NOBLE: 0.1,
  COREUM: 0.1,
  INJECTIVE: 0.001,
  ZKSYNC_ERA: 0.0006, // TODO
  BASE: 0.000004,
  SOLANA: 0.001,
  ALL: 0.0,
};

export const MINIMUM_TRANSFER_AMOUNT_ETH = 50;

export const MINIMUM_TRANSFER_AMOUNT_HL_SPOT = 15;

export const months = [
  {
    value: 'Jan',
    label: 'January',
  },
  {
    value: 'Feb',
    label: 'February',
  },
  {
    value: 'Mar',
    label: 'March',
  },
  {
    value: 'Apr',
    label: 'April',
  },
  {
    value: 'May',
    label: 'May',
  },
  {
    value: 'Jun',
    label: 'June',
  },
  {
    value: 'Jul',
    label: 'July',
  },
  {
    value: 'Aug',
    label: 'August',
  },
  {
    value: 'Sep',
    label: 'September',
  },
  {
    value: 'Oct',
    label: 'October',
  },
  {
    value: 'Nov',
    label: 'November',
  },
  {
    value: 'Dec',
    label: 'December',
  },
];

export const ensAbi = [
  {
    inputs: [{ internalType: 'contract ENS', name: '_ens', type: 'address' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'contentType',
        type: 'uint256',
      },
    ],
    name: 'ABIChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { indexed: false, internalType: 'address', name: 'a', type: 'address' },
    ],
    name: 'AddrChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'coinType',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'newAddress',
        type: 'bytes',
      },
    ],
    name: 'AddressChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'target',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isAuthorised',
        type: 'bool',
      },
    ],
    name: 'AuthorisationChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { indexed: false, internalType: 'bytes', name: 'hash', type: 'bytes' },
    ],
    name: 'ContenthashChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { indexed: false, internalType: 'bytes', name: 'name', type: 'bytes' },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'resource',
        type: 'uint16',
      },
      { indexed: false, internalType: 'bytes', name: 'record', type: 'bytes' },
    ],
    name: 'DNSRecordChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { indexed: false, internalType: 'bytes', name: 'name', type: 'bytes' },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'resource',
        type: 'uint16',
      },
    ],
    name: 'DNSRecordDeleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
    ],
    name: 'DNSZoneCleared',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'bytes4',
        name: 'interfaceID',
        type: 'bytes4',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'implementer',
        type: 'address',
      },
    ],
    name: 'InterfaceChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
    ],
    name: 'NameChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 'x', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 'y', type: 'bytes32' },
    ],
    name: 'PubkeyChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'node', type: 'bytes32' },
      {
        indexed: true,
        internalType: 'string',
        name: 'indexedKey',
        type: 'string',
      },
      { indexed: false, internalType: 'string', name: 'key', type: 'string' },
    ],
    name: 'TextChanged',
    type: 'event',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'uint256', name: 'contentTypes', type: 'uint256' },
    ],
    name: 'ABI',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'bytes', name: '', type: 'bytes' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'addr',
    outputs: [{ internalType: 'address payable', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'uint256', name: 'coinType', type: 'uint256' },
    ],
    name: 'addr',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: '', type: 'bytes32' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'authorisations',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'clearDNSZone',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'contenthash',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes32', name: 'name', type: 'bytes32' },
      { internalType: 'uint16', name: 'resource', type: 'uint16' },
    ],
    name: 'dnsRecord',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes32', name: 'name', type: 'bytes32' },
    ],
    name: 'hasDNSRecords',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' },
    ],
    name: 'interfaceImplementer',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'pubkey',
    outputs: [
      { internalType: 'bytes32', name: 'x', type: 'bytes32' },
      { internalType: 'bytes32', name: 'y', type: 'bytes32' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'uint256', name: 'contentType', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'setABI',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'uint256', name: 'coinType', type: 'uint256' },
      { internalType: 'bytes', name: 'a', type: 'bytes' },
    ],
    name: 'setAddr',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'address', name: 'a', type: 'address' },
    ],
    name: 'setAddr',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'bool', name: 'isAuthorised', type: 'bool' },
    ],
    name: 'setAuthorisation',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes', name: 'hash', type: 'bytes' },
    ],
    name: 'setContenthash',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'setDNSRecords',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' },
      { internalType: 'address', name: 'implementer', type: 'address' },
    ],
    name: 'setInterface',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'string', name: 'name', type: 'string' },
    ],
    name: 'setName',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'bytes32', name: 'x', type: 'bytes32' },
      { internalType: 'bytes32', name: 'y', type: 'bytes32' },
    ],
    name: 'setPubkey',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'string', name: 'key', type: 'string' },
      { internalType: 'string', name: 'value', type: 'string' },
    ],
    name: 'setText',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'bytes4', name: 'interfaceID', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'pure',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'string', name: 'key', type: 'string' },
    ],
    name: 'text',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

export const APPLICATION_ADDRESS_NAME_MAP: Map<string, string> = new Map([
  ['0xce16f69375520ab01377ce7b88f5ba8c48f8d666', ApplicationName.SQUID],
  ['0x69dd38645f7457be13571a847ffd905f9acbaf6d', ApplicationName.ODOS],
  ['0xa32ee1c40594249eb3183c10792bcf573d4da47c', ApplicationName.ODOS],
  ['0x76f4eed9fe41262669d0250b2a97db79712ad855', ApplicationName.ODOS],
  ['0xdd94018f54e565dbfc939f7c44a16e163faab331', ApplicationName.ODOS],
  ['0x9f138be5aa5cc442ea7cc7d18cd9e30593ed90b9', ApplicationName.ODOS],
  ['0x1b02da8cb0d097eb8d57a175b88c7d8b47997506', ApplicationName.SUSHISWAP],
  ['0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', ApplicationName.SUSHISWAP],
  ['0xe52180815c81d7711b83412e53259bed6a3ab70a', ApplicationName.SUSHISWAP],
  ['0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b', ApplicationName.UNISWAP],
  ['0x4c60051384bd2d3c01bfc845cf5f4b44bcbe9de5', ApplicationName.UNISWAP],
  ['0x7a250d5630b4cf539739df2c5dacb4c659f2488d', ApplicationName.UNISWAP],
  ['0xe592427a0aece92de3edee1f18e0157c05861564', ApplicationName.UNISWAP],
  ['0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', ApplicationName.UNISWAP],
  ['0x000000000022d473030f116ddee9f6b43ac78ba3', ApplicationName.UNISWAP],
  ['0x6d0176c5ea1e44b08d3dd001b0784ce42f47a3a7', ApplicationName.UNISWAP],
  ['0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', ApplicationName.UNISWAP],
  ['0xabbc5f99639c9b6bcb58544ddf04efa6802f4064', ApplicationName.GMX],
  ['0xb87a436b93ffe9d75c5cfa7bacfff96430b09868', ApplicationName.GMX],
  ['0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9', ApplicationName.AAVE],
  ['0x1e4b7a6b903680eab0c5dabcb8fd429cd2a9598c', ApplicationName.AAVE],
  ['0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', ApplicationName.AAVE],
  ['0x79bc8bd53244bc8a9c8c27509a2d573650a83373', ApplicationName.POOL_TOGETHER],
  ['0xdef171fe48cf0115b1d80b88dc8eab59176fee57', ApplicationName.PARA_SWAP],
  ['0x216b4b4ba9f3e719726886d34a177484278bfcae', ApplicationName.PARA_SWAP],
  ['0x213a57c79ef27c079f7ac98c4737333c51a95b02', ApplicationName.OPEN_SEA],
  ['0x283af0b28c62c092c9727f1ee09c02ca627eb7f5', ApplicationName.ENS],
  ['0x10ed43c718714eb63d5aa57b78b54704e256024e', ApplicationName.PANCAKE_SWAP],
  ['0x0e3a8078edd2021dadcde733c6b4a86e51ee8f07', ApplicationName.PANCAKE_SWAP],
  ['0x13f4ea83d0bd40e75c8222255bc855a974568dd4', ApplicationName.PANCAKE_SWAP],
  ['0xa5f8c5dbd5f286960b9d90548680ae5ebff07652', ApplicationName.PANCAKE_SWAP],
  ['0x4ec3432d9443f05022e2ff4e54fc7514be2359e0', ApplicationName.PANCAKE_SWAP],
  [
    '0xa0c68c638235ee32657e8f720a23cec1bfc77c77',
    ApplicationName.POLYGON_BRIDGE,
  ],
  ['0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31', ApplicationName.METAMASK],
  ['0xb003e75f7e0b5365e814302192e99b4ee08c0ded', ApplicationName.SYNAPSE],
  ['0x6571d6be3d8460cf5f7d6711cd9961860029d85f', ApplicationName.SYNAPSE],
  ['0x1c6ae197ff4bf7ba96c66c5fd64cb22450af9cc8', ApplicationName.SYNAPSE],
  ['0x1111111254eeb25477b68fb85ed929f73a960582', ApplicationName._1_INCH],
  ['0x1111111254fb6c44bac0bed2854e76f90643097d', ApplicationName._1_INCH],
  ['0x11111112542D85B3EF69AE05771c2dCCff4fAa26', ApplicationName._1_INCH],
  ['0x16327e3fbdaca3bcf7e38f5af2599d2ddc33ae52', ApplicationName.SPIRIT_SWAP],
  ['0x31f63a33141ffee63d4b26755430a390acdd8a4d', ApplicationName.SPOOKY_SWAP],
  ['0xf491e7b69e4244ad4002bc14e878a34207e38c29', ApplicationName.SPOOKY_SWAP],
  ['0xdef1c0ded9bec7f1a1670819833240f027b25eff', ApplicationName._0X_EXCHANGE],
  ['0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff', ApplicationName.QUICK_SWAP],
  ['0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae', ApplicationName.LIFI],
  ['0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', ApplicationName.WRAPPED_MATIC],
  ['0xfcd2ce20ef8ed3d43ab4f8c2da13bbf1c6d9512f', ApplicationName.DIFFUSION],
  ['0xb4315e873dbcf96ffd0acd8ea43f689d8c20fb30', ApplicationName.TRADER_JOE],
  ['0xc30141b657f4216252dc59af2e7cdb9d8792e1b0', ApplicationName.SOCKET],
  ['0xae3dd4c0e3ca6823cdbe9641b1938551ccb25a2d', ApplicationName.SOCKET],
  ['0xcf0febd3f17cef5b47b0cd257acf6025c5bff3b7', ApplicationName.APE_SWAP],
  ['0x6947a425453d04305520e612f0cb2952e4d07d62', ApplicationName.ARB_SWAP],
  ['0x1619de6b6b20ed217a58d00f37b9d47c7663feca', ApplicationName.CBRIDGE],
  ['0x76b22b8c1079a44f1211d867d68b1eda76a635a7', ApplicationName.HOP],
  ['0x3666f603cc164936c1b87e207f36beba4ac5f18a', ApplicationName.HOP],
  ['0x3ee18b2214aff97000d974cf647e7c347e8fa585', ApplicationName.WORM_HOLE],
]);

export const APPLICATION_LOGO_MAP: Map<string, string> = new Map([
  [
    ApplicationName.SQUID,
    'https://public.cypherd.io/assets/blockchains/token-icons/squid.png',
  ],
  [
    ApplicationName.ODOS,
    'https://public.cypherd.io/assets/blockchains/token-icons/odos.jpeg',
  ],
  [
    ApplicationName.SUSHISWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/sushi-exchange.png',
  ],
  [
    ApplicationName.UNISWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/uniswap_protocol.png',
  ],
  [
    ApplicationName.GMX,
    'https://public.cypherd.io/assets/blockchains/token-icons/gmx.jpeg',
  ],
  [
    ApplicationName.AAVE,
    'https://public.cypherd.io/assets/blockchains/token-icons/aave.png',
  ],
  [
    ApplicationName.POOL_TOGETHER,
    'https://public.cypherd.io/assets/blockchains/token-icons/pooltogether.png',
  ],
  [
    ApplicationName.PARA_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/paraswap.png',
  ],
  [
    ApplicationName.OPEN_SEA,
    'https://public.cypherd.io/assets/blockchains/token-icons/opensea.png',
  ],
  [
    ApplicationName.ENS,
    'https://public.cypherd.io/assets/blockchains/token-icons/ens.jpeg',
  ],
  [
    ApplicationName.PANCAKE_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/pancake.jpeg',
  ],
  [
    ApplicationName.POLYGON_BRIDGE,
    'https://public.cypherd.io/assets/blockchains/token-icons/polygon-bridge.png',
  ],
  [
    ApplicationName.METAMASK,
    'https://public.cypherd.io/assets/blockchains/token-icons/metamask.jpeg',
  ],
  [
    ApplicationName.SYNAPSE,
    'https://public.cypherd.io/assets/blockchains/token-icons/synapse.png',
  ],
  [
    ApplicationName._1_INCH,
    'https://public.cypherd.io/assets/blockchains/token-icons/1inch.png',
  ],
  [
    ApplicationName.SPOOKY_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/spookyswap.jpeg',
  ],
  [
    ApplicationName._0X_EXCHANGE,
    'https://public.cypherd.io/assets/blockchains/token-icons/0x-exchange.png',
  ],
  [
    ApplicationName.QUICK_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/quickswap.png',
  ],
  [
    ApplicationName.LIFI,
    'https://public.cypherd.io/assets/blockchains/token-icons/lifi.png',
  ],
  [
    ApplicationName.SPIRIT_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/spirit.png',
  ],
  [
    ApplicationName.DIFFUSION,
    'https://public.cypherd.io/assets/blockchains/token-icons/diffusion.png',
  ],
  [
    ApplicationName.TRADER_JOE,
    'https://public.cypherd.io/assets/blockchains/token-icons/trader_joe.png',
  ],
  [
    ApplicationName.WRAPPED_MATIC,
    'https://public.cypherd.io/assets/blockchains/token-icons/wrapped_matic.png',
  ],
  [
    ApplicationName.SOCKET,
    'https://public.cypherd.io/assets/blockchains/token-icons/socket.png',
  ],
  [
    ApplicationName.APE_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/ape.png',
  ],
  [
    ApplicationName.ARB_SWAP,
    'https://public.cypherd.io/assets/blockchains/token-icons/arbswap.jpeg',
  ],
  [
    ApplicationName.CBRIDGE,
    'https://public.cypherd.io/assets/blockchains/token-icons/cbridge.png',
  ],
  [
    ApplicationName.HOP,
    'https://public.cypherd.io/assets/blockchains/token-icons/hop.png',
  ],
  [
    ApplicationName.WORM_HOLE,
    'https://public.cypherd.io/assets/blockchains/token-icons/wormhole.png',
  ],
]);

export const PEP_OPTIONS = [
  { id: 0, label: 'Yes', value: true },
  { id: 1, label: 'No', value: false },
];
export const TXN_FILTER_STATUSES = [
  { id: 0, label: 'completed', value: 'completed' },
  { id: 1, label: 'error', value: 'error' },
  { id: 2, label: 'all', value: 'all' },
];
export const DEFI_FILTER_STATUSES = [
  { id: 0, label: 'Yes', value: 'Yes' },
  { id: 1, label: 'No', value: 'No' },
];
export const TIME_GAPS = [
  { id: 0, label: 'All', value: 'All' },
  { id: 1, label: 'Today', value: 'Today' },
  { id: 2, label: 'This Week', value: 'This Week' },
  { id: 3, label: 'This Month', value: 'This Month' },
];

// Rewards program anchor: first epoch start (09 Oct 2025 00:00:00 UTC)
// Keep as a number (unix seconds) to match backend API expectations for startDate/endDate
export const FIRST_REWARDS_EPOCH_START_UTC: number = Math.floor(
  new Date('2025-10-09T00:00:00Z').getTime() / 1000,
);

export const GAS_BUFFER_FACTOR = 1.3;
export const GAS_BUFFER_FACTOR_FOR_LOAD_MAX = 1.5;

export const CardFeePercentage = {
  POLYGON: 0.5,
  AVALANCHE: 0.5,
  ETH: 0.5,
  ETH_GOERLI: 0.5,
  POLYGON_MUMBAI: 0.5,
  ARBITRUM: 0.5,
  OPTIMISM: 0.5,
  BASE: 0.5,
  ZKSYNC_ERA: 0.5,
  BSC: 0.5,
  COSMOS: 0.5,
  OSMOSIS: 0.5,
  NOBLE: 0,
  TRON: 3,
  COREUM: 3,
  INJECTIVE: 3,
  SOLANA: 0.5,
};

export const SlippageFactor = {
  POLYGON: 0.003,
  AVALANCHE: 0.003,
  ETH: 0.003,
  ETH_GOERLI: 0.003,
  POLYGON_MUMBAI: 0.003,
  ARBITRUM: 0.003,
  OPTIMISM: 0.003,
  BASE: 0.003,
  ZKSYNC_ERA: 0.003,
  BSC: 0.003,
  COSMOS: 0.003,
  OSMOSIS: 0.003,
  NOBLE: 0,
  TRON: 0.005,
  COREUM: 0.005,
  INJECTIVE: 0.005,
  SOLANA: 0.003,
};

export const ChainIdNameMapping = {
  '1': 'ethereum',
  '137': 'ethereum',
  '56': 'ethereum',
  '43114': 'ethereum',
  '250': 'ethereum',
  '42161': 'ethereum',
  '10': 'ethereum',
  '9001': 'ethereum',
  '324': 'ethereum',
  '8453': 'ethereum',
  '1101': 'ethereum',
  '1313161554': 'ethereum',
  '1284': 'ethereum',
  '1285': 'ethereum',
  '79': 'ethereum',
  'cosmoshub-4': 'cosmos',
  'osmosis-1': 'osmosis',
  'noble-1': 'noble',
  'coreum-mainnet-1': 'coreum',
  'injective-1': 'injective',
  solana: 'solana',
};

export const ChainBackendNameMapping = {
  cosmos: [ChainBackendNames.COSMOS],
  osmosis: [ChainBackendNames.OSMOSIS],
  noble: [ChainBackendNames.NOBLE],
  coreum: [ChainBackendNames.COREUM],
  injective: [ChainBackendNames.INJECTIVE],
};

export const AddressDerivationPath = {
  ETH: "m/44'/60'/0'/0/",
  COSMOS: "m/44'/118'/0'/0/",
  SOLANA: "m/44'/501'/",
  COREUM: "m/44'/990'/0'/0/",
};

export const Bech32Prefixes = {
  COSMOS: 'cosmos',
  NOBLE: 'noble',
  OSMOSIS: 'osmo',
  COREUM: 'core',
  INJECTIVE: 'inj',
};

export const CYPHER_PLAN_ID_NAME_MAPPING: Record<CypherPlanId, string> = {
  [CypherPlanId.BASIC_PLAN]: 'Standard Plan',
  [CypherPlanId.PRO_PLAN]: 'Premium Plan',
};

export const PlanIdPriority = {
  [CypherPlanId.BASIC_PLAN]: 0,
  [CypherPlanId.PRO_PLAN]: 10,
};

export const ChainIdToBackendNameMapping = {
  '1': ChainBackendNames.ETH,
  '137': ChainBackendNames.POLYGON,
  '56': ChainBackendNames.BSC,
  '43114': ChainBackendNames.AVALANCHE,
  '42161': ChainBackendNames.ARBITRUM,
  '10': ChainBackendNames.OPTIMISM,
  '324': ChainBackendNames.ZKSYNC_ERA,
  '8453': ChainBackendNames.BASE,
  'cosmoshub-4': ChainBackendNames.COSMOS,
  'osmosis-1': ChainBackendNames.OSMOSIS,
  'noble-1': ChainBackendNames.NOBLE,
  'coreum-mainnet-1': ChainBackendNames.COREUM,
  'injective-1': ChainBackendNames.INJECTIVE,
  solana: ChainBackendNames.SOLANA,
};

export const ChainNameToChainMapping: Record<ChainBackendNames, Chain> = {
  [ChainBackendNames.ALL]: {
    chainName: 'all',
    name: 'All',
    symbol: 'ALL',
    id: 0,
    logo_url: '',
    backendName: ChainBackendNames.ALL,
    chain_id: '',
    native_token_address: '',
    nativeTokenLogoUrl: '',
    chainIdNumber: 0,
  },
  [ChainBackendNames.ETH]: CHAIN_ETH,
  [ChainBackendNames.POLYGON]: CHAIN_POLYGON,
  [ChainBackendNames.BSC]: CHAIN_BSC,
  [ChainBackendNames.AVALANCHE]: CHAIN_AVALANCHE,
  [ChainBackendNames.ARBITRUM]: CHAIN_ARBITRUM,
  [ChainBackendNames.OPTIMISM]: CHAIN_OPTIMISM,
  [ChainBackendNames.ZKSYNC_ERA]: CHAIN_ZKSYNC_ERA,
  [ChainBackendNames.BASE]: CHAIN_BASE,
  [ChainBackendNames.COSMOS]: CHAIN_COSMOS,
  [ChainBackendNames.OSMOSIS]: CHAIN_OSMOSIS,
  [ChainBackendNames.NOBLE]: CHAIN_NOBLE,
  [ChainBackendNames.COREUM]: CHAIN_COREUM,
  [ChainBackendNames.INJECTIVE]: CHAIN_INJECTIVE,
  [ChainBackendNames.SOLANA]: CHAIN_SOLANA,
};

export const QUICK_ACTION_NOTIFICATION_CATEGORY_IDS: Array<
  CypherDeclineCodes | RPCODES
> = [
  CypherDeclineCodes.INT_COUNTRY,
  RPCODES.CardIsNotActivated,
  RPCODES.CardIsBlocked,
];

// address for gas estimation in comsos chains ( as the target address will be a osmosis address and the action is IBC )
export const OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION =
  'osmo1xalq4sul7623pelmym39taknt0svyq63evw7zd';

export const LEGAL_CYPHERHQ = 'https://cypherhq.io/legal';
export const TERMS_PRIVACY_POLICY_URL = 'https://cypherhq.io/legal';
export const RAIN_CARD_TERMS_INTL = 'https://cypherhq.io/legal-card-terms/';
export const RAIN_CARD_TERMS_US = 'https://cypherhq.io/legal-card-terms-us/';

export const RAIN_E_SIGN_CONSENT_URL =
  'https://cypherhq.io/legal-electronic-communications/';
export const RAIN_ACCOUNT_OPENING_PRIVACY_POLICY_URL =
  'https://cypherhq.io/account-opening-privacy-policy-us/';

export const chainExplorerMapping: Record<string, string> = {
  ETH: 'https://etherscan.io/tx/',
  POLYGON: 'https://polygonscan.com/tx/',
  BSC: 'https://bscscan.com/tx/',
  AVALANCHE: 'https://snowtrace.io/tx/',
  ARBITRUM: 'https://arbiscan.io/tx/',
  OPTIMISM: 'https://optimistic.etherscan.io/tx/',
  COSMOS: 'https://www.mintscan.io/cosmos/txs/',
  OSMOSIS: 'https://www.mintscan.io/osmosis/txs/',
  NOBLE: 'https://www.mintscan.io/noble/txs/',
  COREUM: 'https://www.mintscan.io/coreum/txs/',
  INJECTIVE: 'https://www.mintscan.io/injective/txs/',
  BASE: 'https://basescan.org/tx/',
  ZKSYNC_ERA: 'https://www.oklink.com/zksync/tx/',
  TRON: 'https://tronscan.org/#/transaction/',
  SOLANA: 'https://solscan.io/tx/',
};

export const OCCUPATION_LABEL_TO_CODE_MAP: Record<string, string> = {
  'Management / Operations': '11-1021',
  'Accounting & Finance': '13-2011',
  'Software & IT': '15-1132',
  Engineering: '17-2051',
  'Science & Research': '19-1012',
  'Social Services & Counseling': '21-1014',
  Legal: '23-1011',
  Education: '25-2021',
  'Design, Media & Arts': '27-1024',
  'Healthcare (Practitioners)': '29-1141',
  'Healthcare (Support)': '29-2061',
  'Protective Services': '33-3051',
  'Food & Hospitality': '35-1011',
  'Cleaning & Maintenance': '37-2011',
  'Personal Services & Care': '39-9011',
  Sales: '41-1011',
  'Admin & Office Support': '43-6014',
  'Agriculture & Farming': '45-2092',
  Construction: '47-2061',
  'Repair & Installation': '49-3023',
  Manufacturing: '51-2092',
  'Transportation & Logistics': '53-3032',
  'Military / Armed Forces': '55-1016',
  'Self-Employed': 'SELFEMP',
  Student: 'STUDENT',
  Unemployed: 'UNEMPLO',
  Retired: 'RETIRED',
  'Other / Not Listed': 'OTHERXX',
};

export const ASYNC_STORAGE_KEYS_TO_PRESERVE: string[] = [
  /*
   * ARCH_HOST stores the base URL for the backend (Arch) service and must persist
   * between app sessions—even when the user opts to clear all local data.
   * Add additional keys here in future if they should be retained across resets.
   */
  'ARCH_HOST',
];

export const CYPHER_TARGET_ROUTER_CONTRACT_ADDRESS = "0x2cAD10c323679Dbd6b4b7bCF0E6E0426F7019210";

export const TargetRouterABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
    ],
    name: 'TargetRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'target',
        type: 'string',
      },
    ],
    name: 'TargetSet',
    type: 'event',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
    ],
    name: 'removeTarget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'program',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'provider',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'chain',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'target',
        type: 'string',
      },
    ],
    name: 'setTarget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'string',
            name: 'program',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'provider',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'chain',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'target',
            type: 'string',
          }
        ],
        internalType: 'struct CypherTargetRouter.InitialTarget[]',
        name: 'newTargets',
        type: 'tuple[]',
      }
    ],
    name: 'setTargets',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    name: 'targets',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
