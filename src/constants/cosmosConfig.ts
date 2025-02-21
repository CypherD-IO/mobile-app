import Long from 'long';

export enum Denom {
  ATOM = 'uatom',
  OSMOSIS = 'uosmo',
  STARGAZE = 'ustars',
  NOBLE = 'uusdc',
  COREUM = 'ucore',
  INJECTIVE = 'inj',
  KUJIRA = 'ukuji',
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
      stargaze: 'channel-730',
      noble: 'channel-536',
      coreum: 'channel-660',
      injective: 'channel-220',
      kujira: 'channel-343',
    },
    gasPrice: 0.1,
    ibcDenoms: {
      cosmos: 'uatom',
      osmosis:
        'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
      stargaze:
        'ibc/F79A876741A3A49DD66421F63CD68FC43A5F92C381EB1415966277BF66C720A7',
      noble:
        'ibc/F663521BF1836B00F5F177680F74BFB9A8B5654A694D0D2BC249E03CF2509013',
      coreum:
        'ibc/F8215CF2CD97294057DBECAA45E3ABEB6012D25550750DA8EC56BEC73F0E522F',
      injective:
        'ibc/6469BDA6F62C4F4B8F76629FA1E72A02A3D1DD9E2B22DDB3C3B2296DEAD29AB8',
      kujira:
        'ibc/4CC44260793F84006656DD868E017578F827A492978161DA31D7572BCB3F4289',
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
      stargaze: 'channel-75',
      noble: 'channel-750',
      coreum: 'channel-2188',
      injective: 'channel-122',
      kujira: 'channel-259',
    },
    gasPrice: 0.04,
    ibcDenoms: {
      osmosis: 'uosmo',
      cosmos:
        'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      stargaze:
        'ibc/987C17B11ABC2B20019178ACE62929FE9840202CE79498E29FE8E5CB02B7C0A4',
      noble:
        'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4',
      coreum:
        'ibc/F3166F4D31D6BA1EC6C9F5536F5DDDD4CC93DBA430F7419E7CDC41C497944A65',
      injective:
        'ibc/64BA6E31FE887D66C6F8F31C7B1A80C7CA179239677B4088BB55F5EA07DBE273',
      kujira:
        'ibc/BB6BCDB515050BAE97516111873CCD7BCF1FD0CCB723CC12F3C4F704D6C646CE',
    },
    poolIds: {
      cosmos: Long.fromNumber(1),
      stargaze: Long.fromNumber(604),
      noble: Long.fromNumber(605),
    },
    rest: 'https://rest.lavenderfive.com:443/osmosis',
  },
  stargaze: {
    prefix: 'stars',
    denom: Denom.STARGAZE,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'STARGAZE',
    channel: {
      cosmos: 'channel-239',
      osmosis: 'channel-0',
      noble: 'channel-204',
      coreum: '',
      injective: '',
      kujira: '',
    },
    gasPrice: 1.1,
    ibcDenoms: {
      cosmos:
        'iibc/9DF365E2C0EF4EA02FA771F638BB9C0C830EFCD354629BDC017F79B348B4E989',
      osmosis:
        'ibc/AB7C92666DE8C7A977666B8080CABF0127B652B9D40F7251E6914DE942D9942B',
      stargaze: 'ustars',
      noble:
        'ibc/4A1C18CA7F50544760CF306189B810CE4C1CB156C7FC870143D401FE7280E591',
      coreum: '',
      injective: '',
      kujira: '',
    },
    rest: 'https://api-stargaze.ezstaking.dev',
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
      stargaze: 'channel-11',
      coreum: 'channel-49',
      injective: 'channel-31',
      kujira: 'channel-2',
    },
    gasPrice: 0.3,
    ibcDenoms: {
      cosmos:
        'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0',
      osmosis:
        'ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B',
      stargaze:
        'ibc/D7CBF85B893451FA339A4171FEEC19A328FE7AFA86D37D6CD66EAAC02AF6EB5F',
      noble: 'uatom',
      coreum:
        'ibc/1B229CD41D9F3787A48B822DE2E963E8F7BEADEF28AE45941940E2406A6D596F',
      injective:
        'ibc/C13664951326AE95004297843B30BA98FAB102B8F6904A68C03576D1812D1D72',
      kujira:
        'ibc/D78D2139CE19A59D2EB05B38B6E5BC9BAC6B31058291B3613F84529140A451CC',
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
      stargaze: '',
      noble: 'channel-19',
      injective: '',
      kujira: 'channel-17',
    },
    gasPrice: 0.0625,
    ibcDenoms: {
      cosmos:
        'ibc/45C001A5AE212D09879BE4627C45B64D5636086285590D5145A51E18E9D16722',
      osmosis:
        'ibc/13B2C536BB057AC79D5616B8EA1B9540EC1F2170718CAFF6F0083C966FFFED0B',
      stargaze: '',
      noble:
        'ibc/E1E3674A0E4E1EF9C69646F9AF8D9497173821826074622D831BAB73CCB99A2D',
      coreum: 'ucore',
      injective: '',
      kujira:
        'ibc/AB305490F17ECCAE3F2B0398A572E0EFB3AF394B90C3A1663DA28C1F0869F624',
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
      stargaze: '',
      noble: 'channel-148',
      coreum: '',
      kujira: 'channel-98',
    },
    gasPrice: 900000000,
    ibcDenoms: {
      cosmos:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      osmosis:
        'ibc/92E0120F15D037353CFB73C14651FC8930ADC05B93100FD7754D3A689E53B333',
      stargaze: '',
      noble:
        'ibc/2CBC2EA121AE42563B08028466F37B600F2D7D4282342DE938283CC3FB2BC00E',
      coreum: '',
      injective: 'inj',
      kujira:
        'ibc/9A115B56E769B92621FFF90567E2D60EFD146E86E867491DB69EEDA9ADC36204',
    },
    rest: 'https://injective-api.polkachu.com',
  },
  kujira: {
    prefix: 'kujira',
    denom: Denom.KUJIRA,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'KUJIRA',
    channel: {
      cosmos: 'channel-0',
      osmosis: 'channel-3',
      stargaze: 'channel-7',
      noble: 'channel-62',
      coreum: 'channel-122',
      injective: 'channel-54',
    },
    gasPrice: 0.007,
    ibcDenoms: {
      cosmos:
        'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      osmosis:
        'ibc/47BD209179859CDE4A2806763D7189B6E6FE13A17880FE2B42DE1E6C1E329E23',
      stargaze:
        'ibc/4F393C3FCA4190C0A6756CE7F6D897D5D1BE57D6CCB80D0BC87393566A7B6602',
      noble:
        'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
      coreum:
        'ibc/DF2EE65970C03A37C3CA55884601329BEDB32B155B52F9B6B1D5D4CBB8AD9BA4',
      injective:
        'ibc/5A3DCF59BC9EC5C0BB7AA0CA0279FC2BB126640CB8B8F704F7BC2DC42495041B',
      kujira: 'ukuji',
    },
    rest: 'https://rest.lavenderfive.com:443/kujira',
  },
};
