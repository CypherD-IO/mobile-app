import { ApplicationName } from './enum';
import { ChainBackendNames } from './server';
export const INJECTED_WEB3_CDN = 'https://public.cypherd.io/js/injected.web3.js';

export const gasFeeReservation: Record<ChainBackendNames, number> = {
  ETH: 0.0006,
  POLYGON: 0.02,
  BSC: 0.0002,
  AVALANCHE: 0.002,
  FANTOM: 0.005,
  OPTIMISM: 0.00001,
  ARBITRUM: 0.00001,
  COSMOS: 0.003,
  OSMOSIS: 0.008,
  EVMOS: 0.02,
  JUNO: 0.007,
  STARGAZE: 0.1,
  NOBLE: 0.1,
  SHARDEUM: 0.01,
  SHARDEUM_SPHINX: 0.01,
  ZKSYNC_ERA: 0.0006, // TODO
  BASE: 0.0006, // TODO
  POLYGON_ZKEVM: 0.0006, // TODO

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
  STARGAZE: 'Stargaze',
  NOBLE: 'Noble',
  SHARDEUM: 'Shm',
  SHARDEUM_SPHINX: 'Shm',
  ZKSYNC_ERA: 'Ethereum',
  BASE: 'Ethereum',
  POLYGON_ZKEVM: 'Ethereum',
};

export const MINIMUM_TRANSFER_AMOUNT_ETH = 50;

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
  ['0xa0c68c638235ee32657e8f720a23cec1bfc77c77', ApplicationName.POLYGON_BRIDGE],
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
  ['0xd4949664cd82660aae99bedc034a0dea8a0bd517', ApplicationName.WRAPPED_EVMOS],
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
  ['0x3ee18b2214aff97000d974cf647e7c347e8fa585', ApplicationName.WORM_HOLE]
]);

export const APPLICATION_LOGO_MAP: Map<string, string> = new Map([
  [ApplicationName.SQUID, 'https://public.cypherd.io/assets/blockchains/token-icons/squid.png'],
  [ApplicationName.ODOS, 'https://public.cypherd.io/assets/blockchains/token-icons/odos.jpeg'],
  [ApplicationName.SUSHISWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/sushi-exchange.png'],
  [ApplicationName.UNISWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/uniswap_protocol.png'],
  [ApplicationName.GMX, 'https://public.cypherd.io/assets/blockchains/token-icons/gmx.jpeg'],
  [ApplicationName.AAVE, 'https://public.cypherd.io/assets/blockchains/token-icons/aave.png'],
  [ApplicationName.POOL_TOGETHER, 'https://public.cypherd.io/assets/blockchains/token-icons/pooltogether.png'],
  [ApplicationName.PARA_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/paraswap.png'],
  [ApplicationName.OPEN_SEA, 'https://public.cypherd.io/assets/blockchains/token-icons/opensea.png'],
  [ApplicationName.ENS, 'https://public.cypherd.io/assets/blockchains/token-icons/ens.jpeg'],
  [ApplicationName.PANCAKE_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/pancake.jpeg'],
  [ApplicationName.POLYGON_BRIDGE, 'https://public.cypherd.io/assets/blockchains/token-icons/polygon-bridge.png'],
  [ApplicationName.METAMASK, 'https://public.cypherd.io/assets/blockchains/token-icons/metamask.jpeg'],
  [ApplicationName.SYNAPSE, 'https://public.cypherd.io/assets/blockchains/token-icons/synapse.png'],
  [ApplicationName._1_INCH, 'https://public.cypherd.io/assets/blockchains/token-icons/1inch.png'],
  [ApplicationName.SPOOKY_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/spookyswap.jpeg'],
  [ApplicationName._0X_EXCHANGE, 'https://public.cypherd.io/assets/blockchains/token-icons/0x-exchange.png'],
  [ApplicationName.QUICK_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/quickswap.png'],
  [ApplicationName.LIFI, 'https://public.cypherd.io/assets/blockchains/token-icons/lifi.png'],
  [ApplicationName.SPIRIT_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/spirit.png'],
  [ApplicationName.DIFFUSION, 'https://public.cypherd.io/assets/blockchains/token-icons/diffusion.png'],
  [ApplicationName.TRADER_JOE, 'https://public.cypherd.io/assets/blockchains/token-icons/trader_joe.png'],
  [ApplicationName.WRAPPED_MATIC, 'https://public.cypherd.io/assets/blockchains/token-icons/wrapped_matic.png'],
  [ApplicationName.SOCKET, 'https://public.cypherd.io/assets/blockchains/token-icons/socket.png'],
  [ApplicationName.APE_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/ape.png'],
  [ApplicationName.ARB_SWAP, 'https://public.cypherd.io/assets/blockchains/token-icons/arbswap.jpeg'],
  [ApplicationName.CBRIDGE, 'https://public.cypherd.io/assets/blockchains/token-icons/cbridge.png'],
  [ApplicationName.HOP, 'https://public.cypherd.io/assets/blockchains/token-icons/hop.png'],
  [ApplicationName.WORM_HOLE, 'https://public.cypherd.io/assets/blockchains/token-icons/wormhole.png'],
]);
