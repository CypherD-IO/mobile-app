import Long from 'long';

export enum Denom {
  ATOM = 'uatom',
  OSMOSIS = 'uosmo',
  NOBLE = 'uusdc',
  COREUM = 'ucore',
  INJECTIVE = 'inj',
}

export interface CosmosChainConfig {
  prefix: string;
  backendName: string;
  denom: Denom;
  contractDecimal: number;
  coinType: number;
  channel: Record<string, string>;
  gasPrice: number;
  ibcDenoms: Record<string, string>;
  poolIds?: Record<string, Long>;
  rest?: string;
}
export const cosmosConfig: Record<string, CosmosChainConfig> = {
  cosmos: {
    prefix: 'cosmos',
    denom: Denom.ATOM,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'COSMOS',
    channel: {
      osmosis: 'channel-141',
      noble: 'channel-536',
      coreum: 'channel-660',
      injective: 'channel-220',
    },
    gasPrice: 0.1,
    ibcDenoms: {
      cosmos: 'uatom',
      osmosis:
        'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
      noble:
        'ibc/F663521BF1836B00F5F177680F74BFB9A8B5654A694D0D2BC249E03CF2509013',
      coreum:
        'ibc/F8215CF2CD97294057DBECAA45E3ABEB6012D25550750DA8EC56BEC73F0E522F',
      injective:
        'ibc/6469BDA6F62C4F4B8F76629FA1E72A02A3D1DD9E2B22DDB3C3B2296DEAD29AB8',
    },
    rest: 'https://cosmoshub.lava.build:443',
  },
  osmosis: {
    prefix: 'osmo',
    denom: Denom.OSMOSIS,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'OSMOSIS',
    channel: {
      cosmos: 'channel-0',
      noble: 'channel-750',
      coreum: 'channel-2188',
      injective: 'channel-122',
    },
    gasPrice: 0.04,
    ibcDenoms: {
      osmosis: 'uosmo',
      cosmos:
        'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      noble:
        'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4',
      coreum:
        'ibc/F3166F4D31D6BA1EC6C9F5536F5DDDD4CC93DBA430F7419E7CDC41C497944A65',
      injective:
        'ibc/64BA6E31FE887D66C6F8F31C7B1A80C7CA179239677B4088BB55F5EA07DBE273',
    },
    poolIds: {
      cosmos: Long.fromNumber(1),
      noble: Long.fromNumber(605),
    },
    rest: 'https://rest.lavenderfive.com:443/osmosis',
  },
  noble: {
    prefix: 'noble',
    denom: Denom.NOBLE,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'NOBLE',
    channel: {
      cosmos: 'channel-4',
      osmosis: 'channel-1',
      coreum: 'channel-49',
      injective: 'channel-31',
    },
    gasPrice: 0.3,
    ibcDenoms: {
      cosmos:
        'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0',
      osmosis:
        'ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B',
      noble: 'uatom',
      coreum:
        'ibc/1B229CD41D9F3787A48B822DE2E963E8F7BEADEF28AE45941940E2406A6D596F',
      injective:
        'ibc/C13664951326AE95004297843B30BA98FAB102B8F6904A68C03576D1812D1D72',
    },
    rest: 'https://rest.lavenderfive.com:443/noble',
  },
  coreum: {
    prefix: 'core',
    denom: Denom.COREUM,
    contractDecimal: 6,
    coinType: 990,
    backendName: 'COREUM',
    channel: {
      cosmos: 'channel-9',
      osmosis: 'channel-2',
      noble: 'channel-19',
      injective: '',
    },
    gasPrice: 0.0625,
    ibcDenoms: {
      cosmos:
        'ibc/45C001A5AE212D09879BE4627C45B64D5636086285590D5145A51E18E9D16722',
      osmosis:
        'ibc/13B2C536BB057AC79D5616B8EA1B9540EC1F2170718CAFF6F0083C966FFFED0B',
      noble:
        'ibc/E1E3674A0E4E1EF9C69646F9AF8D9497173821826074622D831BAB73CCB99A2D',
      coreum: 'ucore',
      injective: '',
    },
    rest: 'https://rest-coreum.ecostake.com',
  },
  injective: {
    prefix: 'inj',
    denom: Denom.INJECTIVE,
    contractDecimal: 18,
    coinType: 60,
    backendName: 'INJECTIVE',
    channel: {
      cosmos: 'channel-1',
      osmosis: 'channel-8',
      noble: 'channel-148',
      coreum: '',
    },
    gasPrice: 900000000,
    ibcDenoms: {
      cosmos:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      osmosis:
        'ibc/92E0120F15D037353CFB73C14651FC8930ADC05B93100FD7754D3A689E53B333',
      noble:
        'ibc/2CBC2EA121AE42563B08028466F37B600F2D7D4282342DE938283CC3FB2BC00E',
      coreum: '',
      injective: 'inj',
    },
    rest: 'https://injective-api.polkachu.com',
  },
};
