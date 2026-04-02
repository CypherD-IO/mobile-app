import React, { useCallback, useLayoutEffect, useState } from 'react';
import { t } from 'i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { showToast } from '../../../../containers/utilities/toastUtility';
import useBlindPayApi, { type BlindPayUploadFilePart } from '../../api';
import {
  BlindpayProofOfAddressDocType,
  BlindpayUploadBucket,
} from '../../types';
import { blindPayKycProofSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';
import BlindPayIdCaptureModal, {
  type CapturedFile,
} from '../BlindPayIdCaptureModal';

const POA_TYPE_LABELS: Record<BlindpayProofOfAddressDocType, string> = {
  [BlindpayProofOfAddressDocType.UTILITY_BILL]: 'Utility Bill',
  [BlindpayProofOfAddressDocType.BANK_STATEMENT]: 'Bank Statement',
  [BlindpayProofOfAddressDocType.RENTAL_AGREEMENT]: 'Rental Agreement',
  [BlindpayProofOfAddressDocType.TAX_DOCUMENT]: 'Tax Document',
  [BlindpayProofOfAddressDocType.GOVERNMENT_CORRESPONDENCE]: 'Government Correspondence',
};

export function BlindPayKycProofOfAddressStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const { uploadDocument } = useBlindPayApi();

  const docType = draft.proofOfAddressDocType;
  const docTypeName = docType
    ? POA_TYPE_LABELS[docType]
    : String(t('BLINDPAY_POA_DOC', 'Proof of address'));

  const [fileUrl, setFileUrl] = useState(draft.proofOfAddressDocFile ?? '');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState('');

  const handleCapture = useCallback(
    async (file: CapturedFile) => {
      setCaptureOpen(false);
      setUploading(true);
      setUploadError('');
      const filePart: BlindPayUploadFilePart = {
        uri: file.uri,
        name: file.name,
        type: file.type,
      };
      const res = await uploadDocument(filePart, BlindpayUploadBucket.ONBOARDING);
      setUploading(false);
      if (res.isError || !res.data?.fileUrl) {
        const msg = String(res.errorMessage ?? t('UNEXPECTED_ERROR', 'Something went wrong'));
        setUploadError(msg);
        showToast(msg, 'error');
        return;
      }
      setFileUrl(res.data.fileUrl);
      mergeDraft({ proofOfAddressDocFile: res.data.fileUrl });
      setFieldErrors(prev => omitFieldError(prev, 'proofOfAddressDocFile'));
      setUploadError('');
    },
    [mergeDraft, uploadDocument],
  );

  const handleNext = useCallback(() => {
    const parsed = blindPayKycProofSchema.safeParse({
      proofOfAddressDocType: docType,
      proofOfAddressDocFile: fileUrl,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      proofOfAddressDocType: parsed.data.proofOfAddressDocType,
      proofOfAddressDocFile: parsed.data.proofOfAddressDocFile,
    });
    advance();
  }, [advance, docType, fileUrl, mergeDraft]);

  useLayoutEffect(() => {
    onReady({
      canNext: !uploading,
      onNext: handleNext,
      nextLoading: uploading,
      titleOverride: docTypeName,
      subtitleOverride: `Upload a clear photo of your ${docTypeName.toLowerCase()}. Must match the address provided earlier.`,
    });
  }, [handleNext, onReady, uploading, docTypeName]);

  return (
    <>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_POA_UPLOAD', 'Proof of address document'))}
        </CyDText>
        <CyDTouchView
          onPress={() => setCaptureOpen(true)}
          disabled={uploading}
          className={`rounded-[16px] overflow-hidden border ${
            fieldErrors.proofOfAddressDocFile || uploadError ? 'border-errorText' : 'border-n30'
          }`}>
          <CyDView className='bg-n10 items-center py-[24px] gap-[8px]'>
            {uploadError ? (
              <CyDView className='w-[48px] h-[48px] bg-red-500 rounded-[12px] items-center justify-center'>
                <CyDMaterialDesignIcons name='alert-circle-outline' size={24} className='text-white' />
              </CyDView>
            ) : fileUrl ? (
              <CyDView className='w-[48px] h-[48px] bg-green-500 rounded-[12px] items-center justify-center'>
                <CyDMaterialDesignIcons name='check' size={24} className='text-white' />
              </CyDView>
            ) : (
              <CyDView className='w-[48px] h-[48px] bg-[#FBC02D] rounded-[12px] items-center justify-center'>
                <CyDMaterialDesignIcons name='file-document-outline' size={24} className='text-white' />
              </CyDView>
            )}
            <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>
              {fileUrl
                ? String(t('BLINDPAY_PHOTO_UPLOADED', 'Photo uploaded'))
                : docTypeName}
            </CyDText>
            {uploadError ? (
              <CyDText className='text-[12px] font-medium text-red-500 px-[16px] text-center'>{uploadError}</CyDText>
            ) : null}
          </CyDView>
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.proofOfAddressDocFile} />
      </CyDView>

      <BlindPayIdCaptureModal
        visible={captureOpen}
        docTypeName={docTypeName}
        side='front'
        onContinue={handleCapture}
        onClose={() => setCaptureOpen(false)}
      />
    </>
  );
}
