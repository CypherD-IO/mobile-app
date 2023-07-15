export interface DeBankToken {
  id: string
  chain: string
  name: string
  symbol: string
  display_symbol: string | null
  optimized_symbol: string
  decimals: number
  logo_url: string
  protocol_id: string
  price: number
  is_verified: boolean
  is_scam?: boolean
  is_suspicious?: boolean
  is_core: boolean
  is_wallet: boolean
  time_at: number | null
  amount?: number
  usd_value?: number
  raw_amount?: number
  raw_amount_str?: string
  raw_amount_hex_str?: string
  is_infinity?: boolean
  credit_score?: number
}

export interface DeBankNft {
  id: string
  description: string
  name: string
  contract_id: string
  inner_id: string
  content_type: string
  content: string
  thumbnail_url: string
  detail_url: string
  attributes: Array<{ trait_type: string, value: any }>
  is_erc1155: boolean
  is_erc721: boolean
  contract_name: string
}

export interface DeBankErrorMessage {
  code: number
  msg: string
}

export interface PreExecuteTxnResponse {
  balance_change: {
    success: boolean
    error: DeBankErrorMessage | null
    send_token_list: DeBankToken[]
    receive_token_list: DeBankToken[]
    send_nft_list: DeBankNft[]
    receive_nft_list: DeBankNft[]
    usd_value_change: number
  }
  gas: {
    success: boolean
    error: null
    gas_used: number
    gas_limit: number
  }
  is_multisig: boolean
  multisig: any
  pre_exec: {
    success: boolean
    error: DeBankErrorMessage | null
  }
}

export interface SendTokenAction {
  type: string
  from_addr: string
  to_addr: string
  token: DeBankToken
}

export interface SendNFTAction {
  type: string
  from_addr: string
  to_addr: string
  nft: DeBankNft
}

export interface ApproveTokenAction {
  type: string
  owner: string
  spender: {
    id: string
    protocol: {
      id: string
      name: string
      logo_url: string
    }
  }
  token: DeBankToken
}
export interface ApproveNftAction {
  type: string
  owner: string
  spender: {
    id: string
    protocol: {
      id: string
      name: string
      logo_url: string
    }
  }
  nft: DeBankNft
}

export interface ApproveNftCollectionAction {
  type: string
  owner: string
  spender: {
    id: string
    protocol: {
      id: string
      name: string
      logo_url: string
    }
  }
  collection: DeBankNft[]
}
export interface RevokeTokenApprovalAction {
  type: string
  owner: string
  spender: {
    id: string
    protocol: {
      id: string
      name: string
      logo_url: string
    }
  }
  token: DeBankToken
}

export interface RevokeNFTApprovalAction {
  type: string
  owner: string
  spender: {
    id: string
    protocol: {
      id: string
      name: string
      logo_url: string
    }
  }
  nft: DeBankNft
}

export interface RevokeNFTCollectionApprovalAction {
  type: string
  owner: string
  spender: {
    id: string
    protocol: {
      id: string
      name: string
      logo_url: string
    }
  }
  collection: DeBankNft[]
}

export interface CancelTxAction {
  type: string
  from_addr: string
}

export interface DeployContractAction {
  type: string
  from_addr: string
}

export interface CallAction {
  type: string
  from_addr: string
  to_addr: string
  contract: {
    id: string
    protocol: {
      logo_url: string
      name: string
      id: string
    }
  }
}

export interface DeBankActions {
  send_token?: SendTokenAction
  send_nft?: SendNFTAction
  approve_token?: ApproveTokenAction
  approve_nft?: ApproveNftAction
  approve_nft_collection?: ApproveNftCollectionAction
  revoke_token_approval?: RevokeTokenApprovalAction
  revoke_nft_approval?: RevokeNFTApprovalAction
  revoke_nft_collection_approval?: RevokeNFTCollectionApprovalAction
  cancel_tx?: CancelTxAction
  deploy_contract?: DeployContractAction
  call?: CallAction
}

export interface ExplainTxnResponse {
  abi: {
    func: string
    params: any[]
  }
  actions: DeBankActions[]
}

export interface DeBankTxnRequest {
  chainId: number
  from: string
  to: string
  value: string
  data: string
  gas: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce: string
}

export interface IDecodedTransactionResponse {
  abi: {
    func: string
    params: any[]
  }
  abi_str: string
  balance_change: {
    success: boolean
    error: DeBankErrorMessage | null
    send_token_list: DeBankToken[]
    receive_token_list: DeBankToken[]
    send_nft_list: DeBankNft[]
    receive_nft_list: DeBankNft[]
    usd_value_change: number
  }
  gas: {
    success: boolean
    error: null
    gas_used: number
    gas_limit: number
  }
  is_gnosis?: boolean
  native_token: DeBankToken
  pre_exec_version?: string
  pre_exec: {
    success: boolean
    error: DeBankErrorMessage | null
  }
  // Native send
  type_send?: {
    to_addr: string
    token_symbol: string
    token_amount: number
    token: DeBankToken
  }
  // Contract call - swap
  type_call?: {
    action: string
    contract: string
    contract_protocol_name: string
    contract_protocol_logo_url: string
  }
  // Approval
  type_token_approval?: {
    spender: string
    spender_protocol_name: string
    spender_protocol_logo_url: string
    token_symbol: string
    token_amount: number
    is_infinity: boolean
    is_nft: boolean
    nft: null | DeBankNft
    token: DeBankToken
  }
  // Revoke
  type_cancel_token_approval?: {
    spender: string
    spender_protocol_name: string
    spender_protocol_logo_url: string
    token_symbol: string
    is_nft: boolean
    nft: null | DeBankNft
  }

  type: string
  gasLimit: string
  gasPrice?: number
}
