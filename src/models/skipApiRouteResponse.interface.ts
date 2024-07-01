interface FeeAsset {
  chain_id: string;
  coingecko_id?: string;
  decimals?: number;
  denom: string;
  description?: string;
  is_cw20: boolean;
  is_evm: boolean;
  is_svm: boolean;
  logo_uri?: string;
  name?: string;
  origin_chain_id: string;
  origin_denom: string;
  recommended_symbol?: string;
  symbol?: string;
  token_contract?: string;
  trace: string;
}

// interface IBCtransfer {
//   from_chain_id: string;
//   to_chain_id: string;
//   channel: string;
//   dest_denom: string;
//   pfm_enabled: string;
//   port: string;
//   supports_memo: string;
//   denom_in: string;
//   denom_out: string;
//   fee_amount: string | null;
//   usd_fee_amount: string | null;
//   fee_asset: FeeAsset | null;
//   bridge_id: 'IBC' | 'AXELAR' | 'CCTP' | 'HYPERLANE';
//   smart_relay: boolean;
// }

export interface SkipApiRouteResponse {
  amount_in: string;
  amount_out: string;
  chain_ids: string[];
  required_chain_addresses: string[];
  dest_asset_chain_id: string;
  dest_asset_denom: string;
  does_swap: boolean;
  estimated_amount_out: string;
  operations: Array<{
    transfer?: any;
    swap?: any;
    axelar_transfer?: any;
    bank_send?: any;
    cctp_transfer?: any;
    hyperlane_transfer?: any;
    tx_index: number;
    amount_in: string;
    amount_out: string;
  }>;
  source_asset_chain_id: string;
  source_asset_denom: string;
  swap_venue: {
    chain_id: string;
    name: string;
  };
  txs_required: number;
  usd_amount_in: string;
  usd_amount_out: string;
  swap_price_impact_percent?: string;
  warning?: {
    type: 'LOW_INFO_WARNING' | 'BAD_PRICE_WARNING';
    message: string;
  };
  estimated_fees: Array<{
    fee_type: 'SMART_RELAY';
    bridge_id: 'IBC' | 'AXELAR' | 'CCTP' | 'HYPERLANE';
    amount: string;
    usd_amount: string;
    chain_id: string;
    tx_index: number;
    origin_asset: {
      denom: string;
      chain_id: string;
      origin_denom: string;
      origin_chain_id: string;
      trace: string;
      is_cw20: boolean;
      is_evm: boolean;
      is_svm: boolean;
      symbol: string;
      name: string;
      logo_uri: string;
      decimals: number;
      description: string;
      coingecko_id: string;
      recommended_symbol: string;
    };
  }>;
  amount: string;
  usd_amount: string;
  origin_asset: FeeAsset;
  chain_id: string;
  tx_index: number;
  operation_index?: number;
}
