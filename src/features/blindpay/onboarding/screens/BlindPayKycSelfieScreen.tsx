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
import { BlindpayUploadCategory } from '../../types';
import { blindPayKycSelfieSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';
import BlindPaySelfieCaptureModal, {
  type CapturedFile,
} from '../BlindPaySelfieCaptureModal';

export function BlindPayKycSelfieStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const { uploadDocument } = useBlindPayApi();

  const [selfieUrl, setSelfieUrl] = useState(draft.selfieFile ?? '');
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
      const res = await uploadDocument(
        filePart,
        BlindpayUploadCategory.SELFIE,
      );
      setUploading(false);
      if (res.isError || !res.data?.url) {
        const msg =
          res.errorMessage ??
          t('UNEXPECTED_ERROR', 'Something went wrong');
        setUploadError(msg);
        showToast(msg, 'error');
        return;
      }
      setSelfieUrl(res.data.url);
      mergeDraft({ selfieFile: res.data.url });
      setFieldErrors(prev => omitFieldError(prev, 'selfieFile'));
      setUploadError('');
    },
    [mergeDraft, uploadDocument],
  );

  const handleNext = useCallback(() => {
    const parsed = blindPayKycSelfieSchema.safeParse({
      selfieFile: selfieUrl,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({ selfieFile: parsed.data.selfieFile });
    advance();
  }, [advance, mergeDraft, selfieUrl]);

  useLayoutEffect(() => {
    onReady({
      canNext: !uploading,
      onNext: handleNext,
      nextLoading: uploading,
    });
  }, [handleNext, onReady, uploading]);

  return (
    <>
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_SELFIE_UPLOAD', 'Selfie photo'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setCaptureOpen(true);
          }}
          disabled={uploading}
          className={`rounded-[16px] overflow-hidden border ${
            fieldErrors.selfieFile || uploadError
              ? 'border-errorText'
              : 'border-transparent'
          }`}>
          <CyDView className='bg-[#FFF8E1] items-center py-[24px] gap-[8px]'>
            {uploadError ? (
              <CyDView className='w-[56px] h-[56px] bg-red-500 rounded-[14px] items-center justify-center'>
                <CyDMaterialDesignIcons
                  name='alert-circle-outline'
                  size={28}
                  className='text-white'
                />
              </CyDView>
            ) : selfieUrl ? (
              <CyDView className='w-[56px] h-[56px] bg-green-500 rounded-[14px] items-center justify-center'>
                <CyDMaterialDesignIcons
                  name='check'
                  size={28}
                  className='text-white'
                />
              </CyDView>
            ) : (
              <CyDView className='w-[56px] h-[56px] bg-[#FBC02D] rounded-[14px] items-center justify-center'>
                <CyDMaterialDesignIcons
                  name='account-outline'
                  size={28}
                  className='text-white'
                />
              </CyDView>
            )}
            <CyDText className='text-[16px] font-semibold text-[#C99200] tracking-[-0.8px]'>
              {String(t('BLINDPAY_SELFIE_LABEL', 'Selfie'))}
            </CyDText>
          </CyDView>
          <CyDView
            className={`px-[16px] py-[10px] flex-row items-center gap-[6px] ${
              uploadError ? 'bg-red-100' : 'bg-[#FFE082]'
            }`}>
            <CyDMaterialDesignIcons
              name={uploadError ? 'alert-circle-outline' : 'information-outline'}
              size={16}
              className={uploadError ? 'text-red-600' : 'text-[#C99200]'}
            />
            <CyDText
              className={`text-[13px] font-medium tracking-[-0.4px] flex-1 ${
                uploadError ? 'text-red-600' : 'text-[#C99200]'
              }`}
              numberOfLines={2}>
              {uploadError
                ? uploadError
                : selfieUrl
                  ? String(t('BLINDPAY_PHOTO_UPLOADED', 'Photo uploaded'))
                  : String(
                      t(
                        'BLINDPAY_CAPTURE_HINT_SHORT',
                        'Capture or upload a photo',
                      ),
                    )}
            </CyDText>
          </CyDView>
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.selfieFile} />
      </CyDView>

      <BlindPaySelfieCaptureModal
        visible={captureOpen}
        onContinue={handleCapture}
        onClose={() => {
          setCaptureOpen(false);
        }}
      />
    </>
  );
}
