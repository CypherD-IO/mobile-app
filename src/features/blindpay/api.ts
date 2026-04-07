import { useContext } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { hostWorker } from '../../global';
import useAxios from '../../core/HttpRequest';
import { parseErrorMessage } from '../../core/util';
import type {
  AddBankAccountRequest,
  ApiFieldSchema,
  BlindpayPayoutResponse,
  BlindpayStatusResponse,
  IBlindpayAvailableRail,
  IBlindpaySwiftLookupResult,
  CompleteTermsResponse,
  CreateReceiverRequest,
  CreateReceiverResponse,
  InitiateTermsResponse,
  ListPayoutsQuery,
  SubmitPayoutDocumentsRequest,
  UploadDocumentResponse,
} from './types';
import { BlindpayUploadBucket } from './types';

const ENDPOINTS = {
  STATUS: '/v1/bp/status',
  TERMS_INITIATE: '/v1/bp/terms/initiate',
  TERMS_COMPLETE: '/v1/bp/terms/complete',
  DOCUMENTS: '/v1/bp/documents',
  ONBOARD: '/v1/bp/onboard',
  PROFILE: '/v1/bp/profile',
  BANK_ACCOUNTS: '/v1/bp/bank-accounts',
  RECEIVER: '/v1/bp/receiver',
  VIRTUAL_ACCOUNTS: '/v1/bp/virtual-accounts',
  QUOTES: '/v1/bp/quotes',
  QUOTES_FX: '/v1/bp/quotes/fx',
  PAYOUTS_EVM: '/v1/bp/payouts/evm',
  PAYOUTS_SOLANA: '/v1/bp/payouts/solana',
  PAYOUTS_SOLANA_PREPARE: '/v1/bp/payouts/solana/prepare-delegate',
  PAYOUTS: '/v1/bp/payouts',
  LIMITS: '/v1/bp/limits',
  LIMITS_INCREASE: '/v1/bp/limits/increase',
  AVAILABLE_RAILS: '/v1/bp/available/rails',
  AVAILABLE_SWIFT: '/v1/bp/available/swift',
  AVAILABLE_BANK_DETAILS: '/v1/bp/available/bank-details',
} as const;

export interface BlindPayUploadFilePart {
  uri: string;
  name: string;
  type: string;
}

export default function useBlindPayApi() {
  const { getWithAuth, postWithAuth, putWithAuth, deleteWithAuth, postFormWithAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const token = globalContext.globalState.token;
  const baseURL = hostWorker.getHost('ARCH_HOST');

  async function getStatus(): Promise<{
    isError: boolean;
    data?: BlindpayStatusResponse;
    errorMessage?: string;
  }> {
    const response = await getWithAuth(ENDPOINTS.STATUS);
    if (response.isError) {
      return {
        isError: true,
        errorMessage: parseErrorMessage(response.error),
      };
    }
    return { isError: false, data: response.data as BlindpayStatusResponse };
  }

  async function getProfile(): Promise<{
    isError: boolean;
    data?: BlindpayStatusResponse;
    errorMessage?: string;
  }> {
    const response = await getWithAuth(ENDPOINTS.PROFILE);
    if (response.isError) {
      return {
        isError: true,
        errorMessage: parseErrorMessage(response.error),
      };
    }
    // Profile endpoint returns flat object; wrap it under `blindpay` key
    // to match the shape of BlindpayStatusResponse.
    const raw = response.data as any;
    if (raw && !raw.blindpay && raw.id) {
      return { isError: false, data: { blindpay: raw } };
    }
    return { isError: false, data: raw as BlindpayStatusResponse };
  }

  /**
   * Body is `{}` from the app. Your server must still pass BlindPay a `redirect_url` when it calls
   * BlindPay TOS initiate — otherwise after “Accept” BlindPay never navigates to your URL with
   * `?tos_id=` (see BlindPay API: initiate TOS `requestBody.redirect_url`).
   */
  async function initiateTerms(): Promise<{
    isError: boolean;
    data?: InitiateTermsResponse;
    errorMessage?: string;
  }> {
    const response = await postWithAuth(ENDPOINTS.TERMS_INITIATE, {});
    if (response.isError) {
      return {
        isError: true,
        errorMessage: parseErrorMessage(response.error),
      };
    }
    return {
      isError: false,
      data: response.data as InitiateTermsResponse,
    };
  }

  async function completeTerms(termsId: string): Promise<{
    isError: boolean;
    data?: CompleteTermsResponse;
    errorMessage?: string;
  }> {
    const response = await postWithAuth(ENDPOINTS.TERMS_COMPLETE, {
      termsId,
    });
    if (response.isError) {
      return {
        isError: true,
        errorMessage: parseErrorMessage(response.error),
      };
    }
    return {
      isError: false,
      data: response.data as CompleteTermsResponse,
    };
  }

  /**
   * Multipart upload. React Native `FormData` file part uses `{ uri, name, type }`.
   * Bucket: "onboarding" for KYC docs, "limit_increase" for limit docs, "avatar" for profile.
   */
  async function uploadDocument(
    file: BlindPayUploadFilePart,
    bucket: BlindpayUploadBucket,
  ): Promise<{
    isError: boolean;
    data?: UploadDocumentResponse;
    errorMessage?: string;
  }> {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    form.append('bucket', bucket);

    // Use fetch directly — axios v0.24 sends Content-Type without the
    // multipart boundary, which prevents multer from parsing the file.
    try {
      const res = await fetch(`${baseURL}${ENDPOINTS.DOCUMENTS}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${String(token)}`,
          // Do NOT set Content-Type — fetch auto-sets it with boundary
        },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          isError: true,
          errorMessage:
            data?.errors?.[0]?.message ??
            data?.message ??
            'Upload failed',
        };
      }
      const fileUrl = (data as UploadDocumentResponse)?.fileUrl;
      if (!fileUrl) {
        return {
          isError: true,
          errorMessage: 'Upload failed — no file URL returned.',
        };
      }
      return {
        isError: false,
        data: data as UploadDocumentResponse,
      };
    } catch (error: any) {
      return {
        isError: true,
        errorMessage: error?.message ?? 'Upload failed',
      };
    }
  }

  async function onboard(body: CreateReceiverRequest): Promise<{
    isError: boolean;
    data?: CreateReceiverResponse;
    errorMessage?: string;
  }> {
    const response = await postWithAuth(ENDPOINTS.ONBOARD, body);
    if (response.isError) {
      return {
        isError: true,
        errorMessage: parseErrorMessage(response.error),
      };
    }
    return {
      isError: false,
      data: response.data as CreateReceiverResponse,
    };
  }

  async function addBankAccount(
    body: AddBankAccountRequest,
  ): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await postWithAuth(ENDPOINTS.BANK_ACCOUNTS, body);
    if (response.isError) {
      return {
        isError: true,
        errorMessage: parseErrorMessage(response.error),
      };
    }
    return { isError: false, data: response.data };
  }

  async function listBankAccounts(): Promise<{
    isError: boolean;
    data?: any[];
    errorMessage?: string;
  }> {
    const response = await getWithAuth(ENDPOINTS.BANK_ACCOUNTS);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data as any[] };
  }

  async function getBankAccount(id: string): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await getWithAuth(`${ENDPOINTS.BANK_ACCOUNTS}/${id}`);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function deleteBankAccount(id: string): Promise<{
    isError: boolean;
    errorMessage?: string;
  }> {
    const response = await deleteWithAuth(`${ENDPOINTS.BANK_ACCOUNTS}/${id}`);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false };
  }

  async function updateReceiver(
    body: Record<string, any>,
  ): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await putWithAuth(ENDPOINTS.RECEIVER, body);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function getFxQuote(body: {
    from: string; to: string; requestAmount: number; currencyType: string;
  }): Promise<{ isError: boolean; data?: any; errorMessage?: string }> {
    const response = await postWithAuth(ENDPOINTS.QUOTES_FX, body);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data };
  }

  async function createQuote(body: {
    bankAccountId: string; currencyType: string; requestAmount: number;
    network: string; token: string; coverFees?: boolean; description?: string;
  }): Promise<{ isError: boolean; data?: any; errorMessage?: string }> {
    const response = await postWithAuth(ENDPOINTS.QUOTES, body);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data };
  }

  async function createEvmPayout(body: {
    quoteId: string; senderWalletAddress: string;
  }): Promise<{ isError: boolean; data?: BlindpayPayoutResponse; errorMessage?: string }> {
    const response = await postWithAuth(ENDPOINTS.PAYOUTS_EVM, body);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data as BlindpayPayoutResponse };
  }

  async function prepareSolanaDelegate(body: {
    ownerAddress: string; quoteId?: string; tokenAddress?: string; amount?: string;
  }): Promise<{ isError: boolean; data?: any; errorMessage?: string }> {
    const response = await postWithAuth(ENDPOINTS.PAYOUTS_SOLANA_PREPARE, body);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data };
  }

  async function createSolanaPayout(body: {
    quoteId: string; senderWalletAddress: string; signedTransaction?: string;
  }): Promise<{ isError: boolean; data?: BlindpayPayoutResponse; errorMessage?: string }> {
    const response = await postWithAuth(ENDPOINTS.PAYOUTS_SOLANA, body);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data as BlindpayPayoutResponse };
  }

  async function getPayout(id: string): Promise<{ isError: boolean; data?: BlindpayPayoutResponse; errorMessage?: string }> {
    const response = await getWithAuth(`${ENDPOINTS.PAYOUTS}/${id}`);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data as BlindpayPayoutResponse };
  }

  async function listPayouts(query?: ListPayoutsQuery): Promise<{ isError: boolean; data?: BlindpayPayoutResponse[]; errorMessage?: string }> {
    let url = ENDPOINTS.PAYOUTS;
    if (query) {
      const params = Object.entries(query).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&');
      if (params) url += `?${params}`;
    }
    const response = await getWithAuth(url);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    const data = response.data;
    const list = Array.isArray(data) ? data : (data as any)?.payouts ?? (data as any)?.data ?? [];
    return { isError: false, data: list as BlindpayPayoutResponse[] };
  }

  async function submitPayoutDocuments(payoutId: string, body: SubmitPayoutDocumentsRequest): Promise<{ isError: boolean; data?: BlindpayPayoutResponse; errorMessage?: string }> {
    const response = await postWithAuth(`${ENDPOINTS.PAYOUTS}/${payoutId}/documents`, body);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    return { isError: false, data: response.data as BlindpayPayoutResponse };
  }

  async function getLimits(): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await getWithAuth(ENDPOINTS.LIMITS);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function getLimitIncreaseHistory(): Promise<{
    isError: boolean;
    data?: any[];
    errorMessage?: string;
  }> {
    const response = await getWithAuth(ENDPOINTS.LIMITS_INCREASE);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data as any[] };
  }

  async function requestLimitIncrease(body: {
    perTransaction?: number | null;
    daily?: number | null;
    monthly?: number | null;
    supportingDocumentType: string;
    supportingDocumentFile: string;
  }): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await postWithAuth(ENDPOINTS.LIMITS_INCREASE, body);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function listVirtualAccounts(): Promise<{
    isError: boolean;
    data?: any[];
    errorMessage?: string;
  }> {
    const response = await getWithAuth(ENDPOINTS.VIRTUAL_ACCOUNTS);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data as any[] };
  }

  async function getVirtualAccount(id: string): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await getWithAuth(`${ENDPOINTS.VIRTUAL_ACCOUNTS}/${id}`);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function createVirtualAccount(body: {
    bankingPartner: string;
    token: string;
    blockchainWalletId: string;
    signedAgreementId?: string;
  }): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await postWithAuth(ENDPOINTS.VIRTUAL_ACCOUNTS, body);
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function updateVirtualAccount(
    id: string,
    body: { token: string; blockchainWalletId: string },
  ): Promise<{
    isError: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    const response = await putWithAuth(
      `${ENDPOINTS.VIRTUAL_ACCOUNTS}/${id}`,
      body,
    );
    if (response.isError) {
      return { isError: true, errorMessage: parseErrorMessage(response.error) };
    }
    return { isError: false, data: response.data };
  }

  async function lookupSwift(code: string): Promise<{ isError: boolean; data?: IBlindpaySwiftLookupResult; errorMessage?: string }> {
    const response = await getWithAuth(`${ENDPOINTS.AVAILABLE_SWIFT}/${code}`);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    // API may return a single object or an array — normalize to first result
    const raw = response.data;
    const result = Array.isArray(raw) ? raw[0] : raw;
    if (!result) return { isError: true, errorMessage: 'No bank found' };
    return { isError: false, data: result as IBlindpaySwiftLookupResult };
  }

  async function getBankAccountFields(railType: string): Promise<{ isError: boolean; data?: ApiFieldSchema[]; errorMessage?: string }> {
    const response = await getWithAuth(`${ENDPOINTS.AVAILABLE_BANK_DETAILS}?rail=${railType}`);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    const data = response.data;
    const list = Array.isArray(data) ? data : (data as any)?.fields ?? [];
    return { isError: false, data: list as ApiFieldSchema[] };
  }

  async function getAvailableRails(): Promise<{ isError: boolean; data?: IBlindpayAvailableRail[]; errorMessage?: string }> {
    const response = await getWithAuth(ENDPOINTS.AVAILABLE_RAILS);
    if (response.isError) return { isError: true, errorMessage: parseErrorMessage(response.error) };
    const data = response.data;
    const list = Array.isArray(data) ? data : (data as any)?.rails ?? [];
    return { isError: false, data: list as IBlindpayAvailableRail[] };
  }

  return {
    lookupSwift,
    getBankAccountFields,
    getAvailableRails,
    getStatus,
    getProfile,
    initiateTerms,
    completeTerms,
    uploadDocument,
    onboard,
    addBankAccount,
    listBankAccounts,
    getFxQuote,
    createQuote,
    createEvmPayout,
    prepareSolanaDelegate,
    createSolanaPayout,
    getPayout,
    listPayouts,
    submitPayoutDocuments,
    getBankAccount,
    deleteBankAccount,
    updateReceiver,
    getLimits,
    getLimitIncreaseHistory,
    requestLimitIncrease,
    listVirtualAccounts,
    getVirtualAccount,
    createVirtualAccount,
    updateVirtualAccount,
  };
}
