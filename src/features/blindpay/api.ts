import { useContext } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { hostWorker } from '../../global';
import useAxios from '../../core/HttpRequest';
import { parseErrorMessage } from '../../core/util';
import type {
  AddBankAccountRequest,
  BlindpayUploadCategory,
  BlindpayStatusResponse,
  CompleteTermsResponse,
  CreateReceiverRequest,
  CreateReceiverResponse,
  InitiateTermsResponse,
  UploadDocumentResponse,
} from './types';

const ENDPOINTS = {
  STATUS: '/v1/blindpay/status',
  TERMS_INITIATE: '/v1/blindpay/terms/initiate',
  TERMS_COMPLETE: '/v1/blindpay/terms/complete',
  DOCUMENTS: '/v1/blindpay/documents',
  ONBOARD: '/v1/blindpay/onboard',
  PROFILE: '/v1/blindpay/profile',
  BANK_ACCOUNTS: '/v1/blindpay/bank-accounts',
  RECEIVER: '/v1/blindpay/receiver',
  VIRTUAL_ACCOUNTS: '/v1/blindpay/virtual-accounts',
  LIMITS: '/v1/blindpay/limits',
  LIMITS_INCREASE: '/v1/blindpay/limits/increase',
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
   */
  async function uploadDocument(
    file: BlindPayUploadFilePart,
    documentType: BlindpayUploadCategory,
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
    form.append('documentType', documentType);

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
      const docUrl = (data as UploadDocumentResponse)?.url;
      // Validate the returned URL has a real path (not just a bare bucket root)
      if (!docUrl || docUrl.endsWith('/') || docUrl.split('/').length < 5) {
        console.log('[BlindPay] uploadDocument: invalid URL returned:', docUrl);
        return {
          isError: true,
          errorMessage: 'Upload failed — invalid file URL returned. Please try again.',
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

  return {
    getStatus,
    getProfile,
    initiateTerms,
    completeTerms,
    uploadDocument,
    onboard,
    addBankAccount,
    listBankAccounts,
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
