import Long from 'long';

export enum Denom {
  ATOM = 'uatom',
  OSMOSIS = 'uosmo',
  EVMOS = 'aevmos',
  JUNO = 'ujuno',
  STARGAZE = 'ustars',
  NOBLE = 'uusdc',
  COREUM = 'ucore',
  INJECTIVE = 'inj',
  KUJIRA = 'ukuji',
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
    denom: Denom.ATOM,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'COSMOS',
    channel: {
      osmosis: 'channel-141',
      evmos: 'channel-292',
      juno: 'channel-207',
      stargaze: 'channel-730',
      noble: 'channel-536',
      coreum: 'channel-660',
      injective: 'channel-220',
      kujira: 'channel-343',
    },
    gasPrice: 0.025,
    ibcDenoms: {
      cosmos: 'uatom',
      osmosis:
        'ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
      evmos:
        'ibc/19DD710119533524061885A6F190B18AF28D9537E2BAE37F32A62C1A25979287',
      juno: 'ibc/CDAB23DA5495290063363BD1C3499E26189036302DC689985A7E23F8DF8D8DB0',
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
  },
  osmosis: {
    prefix: 'osmo',
    denom: Denom.OSMOSIS,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'OSMOSIS',
    channel: {
      cosmos: 'channel-0',
      evmos: 'channel-204',
      juno: 'channel-42',
      stargaze: 'channel-75',
      noble: 'channel-750',
      coreum: 'channel-2188',
      injective: 'channel-122',
      kujira: 'channel-259',
    },
    gasPrice: 0.025,
    ibcDenoms: {
      osmosis: 'uosmo',
      cosmos:
        'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      evmos:
        'ibc/6AE98883D4D5D5FF9E50D7130F1305DA2FFA0C652D1DD9C123657C6B4EB2DF8A',
      juno: 'ibc/46B44899322F3CD854D2D46DEEF881958467CDD4B3B10086DA49296BBED94BED',
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
      evmos: Long.fromNumber(722),
      juno: Long.fromNumber(497),
      stargaze: Long.fromNumber(604),
      noble: Long.fromNumber(605),
    },
  },
  evmos: {
    prefix: 'evmos',
    denom: Denom.EVMOS,
    contractDecimal: 18,
    coinType: 60,
    backendName: 'EVMOS',
    channel: {
      cosmos: 'channel-3',
      osmosis: 'channel-0',
      juno: 'channel-5',
      stargaze: 'channel-13',
      noble: 'channel-64',
      coreum: 'channel-87',
      injective: 'channel-10',
      kujira: 'channel-18',
    },
    gasPrice: 25000000000,
    ibcDenoms: {
      cosmos:
        'ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701',
      osmosis:
        'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      juno: 'ibc/448C1061CE97D86CC5E86374CD914870FB8EBA16C58661B5F1D3F46729A2422D',
      stargaze:
        'ibc/7564B7F838579DD4517A225978C623504F852A6D0FF7984AFB28F10D36022BE8',
      noble:
        'ibc/35357FE55D81D88054E135529BB2AEB1BB20D207292775A19BD82D83F27BE9B4',
      coreum:
        'ibc/44E85975827951920BB797F41CA3A0638C8C2C4986238514C4999317B8623C52',
      injective:
        'ibc/ADF401C952ADD9EE232D52C8303B8BE17FE7953C8D420F20769AF77240BD0C58',
      kujira:
        'ibc/A3ABC733BECAEA02484AFB992F689DF8B8820DD4845EE4BCEBA680AEAE03E3FA',
      evmos: 'aevmos',
    },
  },
  juno: {
    prefix: 'juno',
    denom: Denom.JUNO,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'juno',
    channel: {
      cosmos: 'channel-1',
      osmosis: 'channel-0',
      evmos: 'channel-70',
      stargaze: 'channel-20',
      noble: 'channel-224',
      coreum: '',
      injective: '',
      kujira: '',
    },
    gasPrice: 0.1,
    ibcDenoms: {
      cosmos:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      osmosis:
        'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      juno: 'ujuno',
      evmos:
        'ibc/9B990F95D85E7CA8C46544975776CAA20A3DEE3507EEA829A4000D8D65617F6D',
      stargaze:
        'ibc/F6B367385300865F654E110976B838502504231705BAC0849B0651C226385885',
      noble:
        'ibc/4A482FA914A4B9B05801ED81C33713899F322B24F76A06F4B8FE872485EA22FF',
      coreum: '',
      injective: '',
      kujira: '',
    },
  },
  stargaze: {
    prefix: 'stars',
    denom: Denom.STARGAZE,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'STARGAZE',
    channel: {
      cosmos: 'channel-239',
      evmos: 'channel-46',
      osmosis: 'channel-0',
      juno: 'channel-5',
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
      juno: 'ibc/448C1061CE97D86CC5E86374CD914870FB8EBA16C58661B5F1D3F46729A2422D',
      evmos:
        'ibc/F9C792DF71F960BB9EF698493B61E29C1EBB8FCD56B1F8BB08C86871F5F497C0',
      stargaze: 'ustars',
      noble:
        'ibc/4A1C18CA7F50544760CF306189B810CE4C1CB156C7FC870143D401FE7280E591',
      coreum: '',
      injective: '',
      kujira: '',
    },
  },
  noble: {
    prefix: 'noble',
    denom: Denom.NOBLE,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'NOBLE',
    channel: {
      cosmos: 'channel-4',
      evmos: 'channel-7',
      osmosis: 'channel-1',
      juno: 'channel-3',
      stargaze: 'channel-11',
      coreum: 'channel-49',
      injective: 'channel-31',
      kujira: 'channel-2',
    },
    gasPrice: 0.15,
    ibcDenoms: {
      cosmos:
        'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0',
      osmosis:
        'ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817B',
      juno: 'ibc/C814F0B662234E24248AE3B2FE2C1B54BBAF12934B757F6E7BC5AEC119963895',
      evmos:
        'ibc/73E97EB411B29C6F989C35D277D1A7FC65083572F102AC6BD101884EE9FB2C9F',
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
  },
  coreum: {
    prefix: 'core',
    denom: Denom.COREUM,
    contractDecimal: 6,
    coinType: 990,
    backendName: 'COREUM',
    channel: {
      cosmos: 'channel-9',
      evmos: 'channel-8',
      osmosis: 'channel-2',
      juno: '',
      stargaze: '',
      noble: 'channel-19',
      injective: '',
      kujira: 'channel-17',
    },
    gasPrice: 0.0325,
    ibcDenoms: {
      cosmos:
        'ibc/45C001A5AE212D09879BE4627C45B64D5636086285590D5145A51E18E9D16722',
      osmosis:
        'ibc/13B2C536BB057AC79D5616B8EA1B9540EC1F2170718CAFF6F0083C966FFFED0B',
      juno: '',
      evmos:
        'ibc/078EAF11288A47609FD894070CA8A1BFCEBD9E08745EA7030F95D7ADEE2E22CA',
      stargaze: '',
      noble:
        'ibc/E1E3674A0E4E1EF9C69646F9AF8D9497173821826074622D831BAB73CCB99A2D',
      coreum: 'ucore',
      injective: '',
      kujira:
        'ibc/AB305490F17ECCAE3F2B0398A572E0EFB3AF394B90C3A1663DA28C1F0869F624',
    },
  },
  injective: {
    prefix: 'inj',
    denom: Denom.INJECTIVE,
    contractDecimal: 18,
    coinType: 60,
    backendName: 'INJECTIVE',
    channel: {
      cosmos: 'channel-1',
      evmos: 'channel-83',
      osmosis: 'channel-8',
      juno: '',
      stargaze: '',
      noble: 'channel-148',
      coreum: '',
      kujira: 'channel-98',
    },
    gasPrice: 700000000,
    ibcDenoms: {
      cosmos:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      osmosis:
        'ibc/92E0120F15D037353CFB73C14651FC8930ADC05B93100FD7754D3A689E53B333',
      juno: '',
      evmos:
        'ibc/16618B7F7AC551F48C057A13F4CA5503693FBFF507719A85BC6876B8BD75F821',
      stargaze: '',
      noble:
        'ibc/2CBC2EA121AE42563B08028466F37B600F2D7D4282342DE938283CC3FB2BC00E',
      coreum: '',
      injective: 'inj',
      kujira:
        'ibc/9A115B56E769B92621FFF90567E2D60EFD146E86E867491DB69EEDA9ADC36204',
    },
  },
  kujira: {
    prefix: 'kujira',
    denom: Denom.KUJIRA,
    contractDecimal: 6,
    coinType: 118,
    backendName: 'KUJIRA',
    channel: {
      cosmos: 'channel-0',
      evmos: 'channel-23',
      osmosis: 'channel-3',
      juno: 'channel-1',
      stargaze: 'channel-7',
      noble: 'channel-62',
      coreum: 'channel-122',
      injective: 'channel-54',
    },
    gasPrice: 0.0051,
    ibcDenoms: {
      cosmos:
        'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      osmosis:
        'ibc/47BD209179859CDE4A2806763D7189B6E6FE13A17880FE2B42DE1E6C1E329E23',
      juno: 'ibc/EFF323CC632EC4F747C61BCE238A758EFDB7699C3226565F7C20DA06509D59A5',
      evmos:
        'ibc/16618B7F7AC551F48C057A13F4CA5503693FBFF507719A85BC6876B8BD75F821',
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
  },
};
