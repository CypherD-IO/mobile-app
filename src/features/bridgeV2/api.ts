import useAxios from '../../core/HttpRequest';
import {
  BridgeV2ChainsResponse,
  BridgeV2CosmosMessagesRequestDto,
  BridgeV2CosmosMessagesResponse,
  BridgeV2QuoteRequestDto,
  BridgeV2QuoteResponse,
  BridgeV2StatusRequestDto,
  BridgeV2StatusResponse,
  BridgeV2TokensResponse,
} from './types';

const ENDPOINTS = {
  CHAINS: '/v1/swap/v2/bridge/chains',
  TOKENS: '/v1/swap/v2/bridge/tokens',
  QUOTE: '/v1/swap/v2/bridge/quote',
  MESSAGES: '/v1/swap/v2/bridge/messages',
  STATUS: '/v1/swap/v2/bridge/status',
} as const;

export default function useBridgeV2Api() {
  const { getWithAuth, postWithAuth } = useAxios();

  async function getBridgeV2Chains(params?: {
    forceFetch?: boolean;
  }): Promise<{ isError: boolean; data?: BridgeV2ChainsResponse; error?: any }> {
    const query: Record<string, string> = {};
    if (params?.forceFetch) query.forceFetch = 'true';

    const response = await getWithAuth(ENDPOINTS.CHAINS, query);
    if (response.isError) {
      return { isError: true, error: response.error };
    }
    return { isError: false, data: response.data };
  }

  async function getBridgeV2Tokens(params?: {
    chainIds?: string[];
    forceFetch?: boolean;
  }): Promise<{ isError: boolean; data?: BridgeV2TokensResponse; error?: any }> {
    const query: Record<string, string> = {};
    if (params?.chainIds?.length) query.chainIds = params.chainIds.join(',');
    if (params?.forceFetch) query.forceFetch = 'true';

    const response = await getWithAuth(ENDPOINTS.TOKENS, query);
    if (response.isError) {
      return { isError: true, error: response.error };
    }
    return { isError: false, data: response.data };
  }

  async function postBridgeV2Quote(
    body: BridgeV2QuoteRequestDto,
  ): Promise<{ isError: boolean; data?: BridgeV2QuoteResponse; error?: any }> {
    const response = await postWithAuth(ENDPOINTS.QUOTE, body);
    if (response.isError) {
      return { isError: true, error: response.error };
    }
    return { isError: false, data: response.data };
  }

  async function postBridgeV2Messages(
    body: BridgeV2CosmosMessagesRequestDto,
  ): Promise<{
    isError: boolean;
    data?: BridgeV2CosmosMessagesResponse;
    error?: any;
  }> {
    const response = await postWithAuth(ENDPOINTS.MESSAGES, body);
    if (response.isError) {
      return { isError: true, error: response.error };
    }
    return { isError: false, data: response.data };
  }

  async function getBridgeV2Status(
    query: BridgeV2StatusRequestDto,
  ): Promise<{ isError: boolean; data?: BridgeV2StatusResponse; error?: any }> {
    const params: Record<string, string> = { txHash: query.txHash };
    if (query.sourceChainId) params.sourceChainId = query.sourceChainId;
    if (query.destChainId) params.destChainId = query.destChainId;
    if (query.bridge) params.bridge = query.bridge;

    const response = await getWithAuth(ENDPOINTS.STATUS, params);
    if (response.isError) {
      return { isError: true, error: response.error };
    }
    return { isError: false, data: response.data };
  }

  return {
    getBridgeV2Chains,
    getBridgeV2Tokens,
    postBridgeV2Quote,
    postBridgeV2Messages,
    getBridgeV2Status,
  };
}
