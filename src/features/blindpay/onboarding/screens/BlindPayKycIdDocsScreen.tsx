import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { t } from 'i18next';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { showToast } from '../../../../containers/utilities/toastUtility';
import useBlindPayApi, { type BlindPayUploadFilePart } from '../../api';
import { BlindpayIdDocType, BlindpayUploadBucket } from '../../types';
import { blindPayKycIdDocsSchema } from '../blindpayKycFormSchemas';
import useBlindPaySheet from '../../components/BlindPayDropdownSheet';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';
import { BLINDPAY_COUNTRY_OPTIONS } from '../blindpayCountryList';
import BlindPayIdCaptureModal, {
  type CapturedFile,
} from '../BlindPayIdCaptureModal';
import { pickBlindPaySingleFile } from '../pickBlindPayFile';

const ID_TYPE_LABELS: Record<BlindpayIdDocType, string> = {
  [BlindpayIdDocType.PASSPORT]: 'Passport',
  [BlindpayIdDocType.ID_CARD]: 'ID Card',
  [BlindpayIdDocType.DRIVERS]: "Driver's License",
};

function selectRowClass(hasError: boolean): string {
  return hasError
    ? 'rounded-[12px] bg-n20 px-[14px] py-[14px] flex-row items-center justify-between border border-errorText'
    : 'rounded-[12px] bg-n20 px-[14px] py-[14px] flex-row items-center justify-between border border-transparent';
}

export function BlindPayKycIdDocsStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const { uploadDocument } = useBlindPayApi();
  const { openDropdown } = useBlindPaySheet();

  const idDocType = draft.idDocType;
  const docTypeName = idDocType
    ? ID_TYPE_LABELS[idDocType]
    : String(t('BLINDPAY_ID_DOC', 'ID Document'));

  const [idDocCountry, setIdDocCountry] = useState(draft.idDocCountry ?? '');
  const [frontUrl, setFrontUrl] = useState(draft.idDocFrontFile ?? '');
  const [backUrl, setBackUrl] = useState(draft.idDocBackFile ?? '');
  const [captureTarget, setCaptureTarget] = useState<'front' | 'back' | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const countryLabel = useMemo(
    () => BLINDPAY_COUNTRY_OPTIONS.find(c => c.code === idDocCountry)?.name,
    [idDocCountry],
  );

  const needsBack = useMemo(
    () =>
      idDocType === BlindpayIdDocType.ID_CARD ||
      idDocType === BlindpayIdDocType.DRIVERS,
    [idDocType],
  );

  const clearKey = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  const handleFrontCapture = useCallback(
    async (file: CapturedFile) => {
      setCaptureTarget(null);
      setUploading(true);
      setUploadError(prev => ({ ...prev, front: '' }));
      const filePart: BlindPayUploadFilePart = {
        uri: file.uri,
        name: file.name,
        type: file.type,
      };
      const res = await uploadDocument(
        filePart,
        BlindpayUploadBucket.ONBOARDING,
      );
      setUploading(false);
      if (res.isError || !res.data?.fileUrl) {
        const msg = String(
          res.errorMessage ?? t('UNEXPECTED_ERROR', 'Something went wrong'));
        setUploadError(prev => ({ ...prev, front: msg }));
        showToast(msg, 'error');
        return;
      }
      setFrontUrl(res.data.fileUrl);
      mergeDraft({ idDocFrontFile: res.data.fileUrl });
      clearKey('idDocFrontFile');
      setUploadError(prev => ({ ...prev, front: '' }));
    },
    [clearKey, mergeDraft, uploadDocument],
  );

  const handleBackCapture = useCallback(
    async (file: CapturedFile) => {
      setCaptureTarget(null);
      setUploading(true);
      setUploadError(prev => ({ ...prev, back: '' }));
      const filePart: BlindPayUploadFilePart = {
        uri: file.uri,
        name: file.name,
        type: file.type,
      };
      const res = await uploadDocument(
        filePart,
        BlindpayUploadBucket.ONBOARDING,
      );
      setUploading(false);
      if (res.isError || !res.data?.fileUrl) {
        const msg = String(
          res.errorMessage ?? t('UNEXPECTED_ERROR', 'Something went wrong'));
        setUploadError(prev => ({ ...prev, back: msg }));
        showToast(msg, 'error');
        return;
      }
      setBackUrl(res.data.fileUrl);
      mergeDraft({ idDocBackFile: res.data.fileUrl });
      clearKey('idDocBackFile');
      setUploadError(prev => ({ ...prev, back: '' }));
    },
    [clearKey, mergeDraft, uploadDocument],
  );

  const handlePickFront = useCallback(async () => {
    const file = await pickBlindPaySingleFile();
    if (file) void handleFrontCapture(file as CapturedFile);
  }, [handleFrontCapture]);

  const handlePickBack = useCallback(async () => {
    const file = await pickBlindPaySingleFile();
    if (file) void handleBackCapture(file as CapturedFile);
  }, [handleBackCapture]);

  const handleNext = useCallback(() => {
    const parsed = blindPayKycIdDocsSchema.safeParse({
      idDocType,
      idDocCountry,
      idDocFrontFile: frontUrl,
      idDocBackFile: needsBack ? backUrl : undefined,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      idDocType: parsed.data.idDocType,
      idDocCountry: parsed.data.idDocCountry,
      idDocFrontFile: parsed.data.idDocFrontFile,
      idDocBackFile: needsBack ? parsed.data.idDocBackFile : undefined,
    });
    advance();
  }, [
    advance,
    backUrl,
    frontUrl,
    idDocCountry,
    idDocType,
    mergeDraft,
    needsBack,
  ]);

  useLayoutEffect(() => {
    onReady({
      canNext: !uploading,
      onNext: handleNext,
      nextLoading: uploading,
      titleOverride: docTypeName,
      subtitleOverride: `Upload clear photos of your ${docTypeName.toLowerCase()}. ${
        idDocType === BlindpayIdDocType.PASSPORT ? 'Only the photo page is needed.' : 'Both front and back are required.'
      }`,
    });
  }, [handleNext, onReady, uploading]);

  return (
    <>
      {/* Country selector */}
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_ID_ISSUING_COUNTRY', 'ID issuing country'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            openDropdown({
              title: String(t('BLINDPAY_SELECT_COUNTRY', 'Select country')),
              options: BLINDPAY_COUNTRY_OPTIONS.map(c => ({
                value: c.code,
                label: c.name,
                icon: c.flag,
              })),
              selected: idDocCountry,
              searchable: true,
              onSelect: code => {
                setIdDocCountry(code);
                mergeDraft({ idDocCountry: code });
                clearKey('idDocCountry');
              },
            });
          }}
          className={selectRowClass(!!fieldErrors.idDocCountry)}>
          <CyDText
            className={`text-[16px] font-medium ${
              countryLabel ? 'text-base400' : 'text-n200'
            }`}>
            {countryLabel ?? String(t('SELECT_COUNTRY', 'Select country'))}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-down'
            size={22}
            className='text-base400'
          />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.idDocCountry} />
      </CyDView>

      {/* Front side */}
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_ID_FRONT', 'ID document — front / main page'))}
        </CyDText>
        <CyDTouchView
          onPress={() => setCaptureTarget('front')}
          disabled={uploading}
          className={`rounded-[16px] overflow-hidden border ${
            fieldErrors.idDocFrontFile || uploadError.front ? 'border-errorText' : 'border-n30'
          }`}>
          <CyDView className='bg-n10 items-center py-[24px] gap-[8px]'>
            {uploadError.front ? (
              <CyDView className='w-[48px] h-[48px] bg-red-500 rounded-[12px] items-center justify-center'>
                <CyDMaterialDesignIcons name='alert-circle-outline' size={24} className='text-white' />
              </CyDView>
            ) : frontUrl ? (
              <CyDView className='w-[48px] h-[48px] bg-green-500 rounded-[12px] items-center justify-center'>
                <CyDMaterialDesignIcons name='check' size={24} className='text-white' />
              </CyDView>
            ) : (
              <CyDView className='w-[48px] h-[48px] bg-[#FBC02D] rounded-[12px] items-center justify-center'>
                <CyDMaterialDesignIcons name='card-account-details-outline' size={24} className='text-white' />
              </CyDView>
            )}
            <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>
              {frontUrl
                ? String(t('BLINDPAY_PHOTO_UPLOADED', 'Photo uploaded'))
                : String(t('BLINDPAY_FRONT_SIDE', 'Front Side'))}
            </CyDText>
            {uploadError.front ? (
              <CyDText className='text-[12px] font-medium text-red-500 px-[16px] text-center'>{uploadError.front}</CyDText>
            ) : null}
          </CyDView>
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.idDocFrontFile} />
      </CyDView>

      {/* Back side */}
      {needsBack ? (
        <CyDView className='gap-[4px]'>
          <CyDText className='text-[12px] font-bold text-base400'>
            {String(t('BLINDPAY_ID_BACK', 'ID document — back'))}
          </CyDText>
          <CyDTouchView
            onPress={() => setCaptureTarget('back')}
            disabled={uploading}
            className={`rounded-[16px] overflow-hidden border ${
              fieldErrors.idDocBackFile || uploadError.back ? 'border-errorText' : 'border-n30'
            }`}>
            <CyDView className='bg-n10 items-center py-[24px] gap-[8px]'>
              {uploadError.back ? (
                <CyDView className='w-[48px] h-[48px] bg-red-500 rounded-[12px] items-center justify-center'>
                  <CyDMaterialDesignIcons name='alert-circle-outline' size={24} className='text-white' />
                </CyDView>
              ) : backUrl ? (
                <CyDView className='w-[48px] h-[48px] bg-green-500 rounded-[12px] items-center justify-center'>
                  <CyDMaterialDesignIcons name='check' size={24} className='text-white' />
                </CyDView>
              ) : (
                <CyDView className='w-[48px] h-[48px] bg-[#FBC02D] rounded-[12px] items-center justify-center'>
                  <CyDMaterialDesignIcons name='card-account-details-outline' size={24} className='text-white' />
                </CyDView>
              )}
              <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>
                {backUrl
                  ? String(t('BLINDPAY_PHOTO_UPLOADED', 'Photo uploaded'))
                  : String(t('BLINDPAY_BACK_SIDE', 'Back Side'))}
              </CyDText>
              {uploadError.back ? (
                <CyDText className='text-[12px] font-medium text-red-500 px-[16px] text-center'>{uploadError.back}</CyDText>
              ) : null}
            </CyDView>
          </CyDTouchView>
          <BlindPayKycFieldError message={fieldErrors.idDocBackFile} />
        </CyDView>
      ) : null}

      {/* Capture modals */}
      <BlindPayIdCaptureModal
        visible={captureTarget === 'front'}
        docTypeName={docTypeName}
        side='front'
        onContinue={handleFrontCapture}
        onClose={() => {
          setCaptureTarget(null);
        }}
      />

      <BlindPayIdCaptureModal
        visible={captureTarget === 'back'}
        docTypeName={docTypeName}
        side='back'
        onContinue={handleBackCapture}
        onClose={() => {
          setCaptureTarget(null);
        }}
      />
    </>
  );
}
