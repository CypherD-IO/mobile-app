export interface SkipAPiEvmTx {
  chain_id: string;
  data: string;
  required_erc20_approvals: Array<{
    amount: string;
    spender: string;
    token_contract: string;
  }>;
  signer_address: string;
  to: string;
  value: string;
}
export interface SkipApiCosmosTxn {
  chain_id: string;
  path: string[];
  msgs: Array<{
    msg: string;
    msg_type_url: string;
  }>;
  signer_address: string;
  operations_indices: number[];
}

export interface SkipApiSignMsg {
  msgs: Array<{
    multi_chain_msg?: {
      chain_id: string;
      msg: string;
      msg_type_url: string;
      path: string[];
    };
    evm_tx?: {
      chain_id: string;
      data: string;
      required_erc20_approvals: Array<{
        amount: string;
        spender: string;
        token_contract: string;
      }>;
      signer_address: string;
      to: string;
      value: string;
    };
  }>;
  estimated_fees: Array<{
    fee_type: 'SMART_RELAY';
    bridge_id: 'IBC' | 'AXELAR' | 'CCTP' | 'HYPERLANE';
    amount: string;
    usd_amount: string;
    origin_asset: {
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
    };
    chain_id: string;
    tx_index: number;
  }>;
  txs: Array<{
    evm_tx?: {
      chain_id: string;
      to: string;
      value: string;
      data: string;
      required_erc20_approvals: Array<{
        token_contract: string;
        spender: string;
        amount: string;
      }>;
      signer_address: string;
      operations_indices: number[];
    };

    cosmos_tx?: {
      chain_id: string;
      path: string[];
      msgs: Array<{
        msg: string;
        msg_type_url: string;
      }>;
      signer_address: string;
      operations_indices: number[];
    };
  }>;
}
