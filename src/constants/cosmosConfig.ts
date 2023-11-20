import Long from 'long';

export enum Denom {
  ATOM = 'uatom',
  OSMOSIS = 'uosmo',
  EVMOS = 'aevmos',
  JUNO = 'ujuno',
  STARGAZE = 'ustars',
  NOBLE = 'uusdc',
}

export interface IIBCData {
  prefix: string;
  backendName: string;
  denom: Denom;
  contractDecimal: number;
  coinType: number;
  channel: Record<string, string>;
  gasPrice: number;
  ibcDenoms: Record<string, string>;
  poolIds?: Record<string, Long>;
}

export const cosmosConfig: Record<string, IIBCData> = {
  cosmos: {
    prefix: 'cosmos',
    backendName: 'COSMOS',
    denom: Denom.ATOM,
    contractDecimal: 6,
    coinType: 118,
    channel: {
      osmosis: 'channel-141',
      evmos: 'channel-292',
      juno: 'channel-207',
      stargaze: 'channel-285',
      noble: 'channel-536',
    },
    gasPrice: 0.000000035998075,
    ibcDenoms: {
      cosmos: 'uatom',
      osmosis:
        'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
      evmos:
        'ibc/19DD710119533524061885A6F190B18AF28D9537E2BAE37F32A62C1A25979287',
      juno: 'ibc/CDAB23DA5495290063363BD1C3499E26189036302DC689985A7E23F8DF8D8DB0',
      stargaze:
        'ibc/902EB27DB5573282C1200C0E681541C1D4176CF851811530A5B77140777B0769',
      noble:
        'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0',
    },
  },
  osmosis: {
    prefix: 'osmo',
    backendName: 'OSMOSIS',
    denom: Denom.OSMOSIS,
    contractDecimal: 6,
    coinType: 118,
    channel: {
      cosmos: 'channel-0',
      evmos: 'channel-204',
      juno: 'channel-42',
      stargaze: 'channel-75',
      noble: 'channel-750',
    },
    gasPrice: 0.000000040006986,
    ibcDenoms: {
      osmosis: 'uosmo',
      cosmos:
        'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      evmos:
        'ibc/6AE98883D4D5D5FF9E50D7130F1305DA2FFA0C652D1DD9C123657C6B4EB2DF8A',
      juno: 'ibc/46B44899322F3CD854D2D46DEEF881958467CDD4B3B10086DA49296BBED94BED',
      stargaze:
        'ibc/987C17B11ABC2B20019178ACE62929FE9840202CE79498E29FE8E5CB02B7C0A4',
      noble: '',
    },
    poolIds: {
      cosmos: Long.fromNumber(1),
      evmos: Long.fromNumber(722),
      juno: Long.fromNumber(497),
      stargaze: Long.fromNumber(604),
      noble: Long.fromNumber(605),
    },
  },
  evmos: {
    prefix: 'evmos',
    backendName: 'EVMOS',
    denom: Denom.EVMOS,
    contractDecimal: 18,
    coinType: 60,
    channel: {
      cosmos: 'channel-3',
      osmosis: 'channel-0',
      juno: 'channel-5',
      stargaze: 'channel-13',
      noble: 'channel-63',
    },
    gasPrice: 0.000000075,
    ibcDenoms: {
      cosmos:
        'ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701',
      osmosis:
        'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      juno: 'ibc/448C1061CE97D86CC5E86374CD914870FB8EBA16C58661B5F1D3F46729A2422D',
      stargaze:
        'ibc/7564B7F838579DD4517A225978C623504F852A6D0FF7984AFB28F10D36022BE8',
      noble: '',
    },
  },
  juno: {
    prefix: 'juno',
    backendName: 'JUNO',
    denom: Denom.JUNO,
    contractDecimal: 6,
    coinType: 118,
    channel: {
      cosmos: 'channel-1',
      osmosis: 'channel-0',
      evmos: 'channel-70',
      stargaze: 'channel-20',
      noble: 'channel-224',
    },
    gasPrice: 0.000000175,
    ibcDenoms: {
      cosmos:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9 ',
      osmosis:
        'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518 ',
      juno: 'ujuno',
      evmos:
        'ibc/9B990F95D85E7CA8C46544975776CAA20A3DEE3507EEA829A4000D8D65617F6D',
      stargaze:
        'ibc/F6B367385300865F654E110976B838502504231705BAC0849B0651C226385885',
      noble: '',
    },
  },
  stargaze: {
    prefix: 'stars',
    backendName: 'STARGAZE',
    denom: Denom.STARGAZE,
    contractDecimal: 6,
    coinType: 118,
    channel: {
      cosmos: 'channel-19',
      evmos: 'channel-46',
      osmosis: 'channel-0',
      juno: 'channel-5',
      noble: '',
    },
    gasPrice: 0.00001105,
    ibcDenoms: {
      cosmos:
        'ibc/6CDD4663F2F09CD62285E2D45891FC149A3568E316CE3EBBE201A71A78A69388',
      osmosis:
        'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      juno: 'ibc/448C1061CE97D86CC5E86374CD914870FB8EBA16C58661B5F1D3F46729A2422D',
      evmos:
        'ibc/F9C792DF71F960BB9EF698493B61E29C1EBB8FCD56B1F8BB08C86871F5F497C0',
      stargaze: 'ustars',
      noble: '',
    },
  },
  noble: {
    prefix: 'noble',
    backendName: 'NOBLE',
    denom: Denom.NOBLE,
    contractDecimal: 6,
    coinType: 118,
    channel: {
      cosmos: 'channel-4',
      evmos: 'channel-6',
      osmosis: 'channel-1',
      juno: 'channel-3',
      stargaze: '',
    },
    gasPrice: 0.00000005,
    ibcDenoms: {
      cosmos:
        'ibc/6CDD4663F2F09CD62285E2D45891FC149A3568E316CE3EBBE201A71A78A69388',
      osmosis:
        'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      juno: 'ibc/448C1061CE97D86CC5E86374CD914870FB8EBA16C58661B5F1D3F46729A2422D',
      evmos:
        'ibc/F9C792DF71F960BB9EF698493B61E29C1EBB8FCD56B1F8BB08C86871F5F497C0',
      stargaze:
        'ibc/F6B367385300865F654E110976B838502504231705BAC0849B0651C226385885',
      noble: 'uatom',
    },
  },
};
