export interface SkipApiStatus {
  transfer_sequence: Array<{
    ibc_transfer?: {
      to_chain_id: string;
      from_chain_id: string;
      state:
        | 'TRANSFER_UNKNOWN'
        | 'TRANSFER_PENDING'
        | 'TRANSFER_RECEIVED'
        | 'TRANSFER_SUCCESS'
        | 'TRANSFER_FAILURE';
    };
    axelar_transfer?: {
      to_chain_id: string;
      from_chain_id: string;
      state:
        | 'AXELAR_TRANSFER_UNKNOWN'
        | 'AXELAR_TRANSFER_PENDING_CONFIRMATION'
        | 'AXELAR_TRANSFER_PENDING_RECEIPT'
        | 'AXELAR_TRANSFER_SUCCESS'
        | 'AXELAR_TRANSFER_FAILURE';
    };
    cctp_transfer?: {
      to_chain_id: string;
      from_chain_id: string;
      state:
        | 'CCTP_TRANSFER_UNKNOWN'
        | 'CCTP_TRANSFER_SENT'
        | 'CCTP_TRANSFER_PENDING_CONFIRMATION'
        | 'CCTP_TRANSFER_CONFIRMED'
        | 'CCTP_TRANSFER_RECEIVED';
    };
    hyperlane_transfer?: {
      to_chain_id: string;
      from_chain_id: string;
      state:
        | 'HYPERLANE_TRANSFER_UNKNOWN'
        | 'HYPERLANE_TRANSFER_SENT'
        | 'HYPERLANE_TRANSFER_FAILED'
        | 'HYPERLANE_TRANSFER_RECEIVED';
    };
  }>;
  state:
    | 'STATE_SUBMITTED'
    | 'STATE_PENDING'
    | 'STATE_COMPLETED_SUCCESS'
    | 'STATE_COMPLETED_ERROR'
    | 'STATE_ABANDONED'
    | 'STATE_PENDING_ERROR';
  error?: {
    message: string;
    type:
      | 'STATUS_ERROR_UNKNOWN'
      | 'STATUS_ERROR_TRANSACTION_EXECUTION'
      | 'STATUS_ERROR_INDEXING'
      | 'STATUS_ERROR_TRANSFER';
    details: {
      code: number;
      message: string;
    };
  };
}
