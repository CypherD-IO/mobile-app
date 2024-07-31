export interface SkipApiChainInterface {
  chain_name: string;
  chain_id: string;
  pfm_enabled: boolean;
  cosmos_module_support: {
    authz: boolean;
    feegrant: boolean;
  };
  supports_memo: boolean;
  logo_uri: string;
  bech32_prefix: string;
  fee_assets: Array<{
    denom: string;
    gas_price: {
      low: string;
      average: string;
      high: string;
    };
  }>;
  chain_type: string;
  ibc_capabilities: {
    cosmos_pfm: boolean;
    cosmos_ibc_hooks: boolean;
    cosmos_memo: boolean;
    cosmos_autopilot: boolean;
  };
  is_testnet: boolean;
}
