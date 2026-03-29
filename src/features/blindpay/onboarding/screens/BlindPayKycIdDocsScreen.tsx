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
import { BlindpayIdDocType, BlindpayUploadCategory } from '../../types';
import { blindPayKycIdDocsSchema } from '../blindpayKycFormSchemas';
import BlindPayCountryPickerModal from '../BlindPayCountryPickerModal';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';
import { BLINDPAY_COUNTRY_OPTIONS } from '../blindpayCountryList';
import BlindPayIdCaptureModal, {
  type CapturedFile,
} from '../BlindPayIdCaptureModal';
import BlindPayPhotoRequirements from '../BlindPayPhotoRequirements';

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

  const idDocType = draft.idDocType;
  const docTypeName = idDocType
    ? ID_TYPE_LABELS[idDocType]
    : String(t('BLINDPAY_ID_DOC', 'ID Document'));

  const [idDocCountry, setIdDocCountry] = useState(draft.idDocCountry ?? '');
  const [frontUrl, setFrontUrl] = useState(draft.idDocFrontFile ?? '');
  const [backUrl, setBackUrl] = useState(draft.idDocBackFile ?? '');
  const [countryOpen, setCountryOpen] = useState(false);
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
        BlindpayUploadCategory.ID_DOC_FRONT,
      );
      setUploading(false);
      if (res.isError || !res.data?.url) {
        const msg =
          res.errorMessage ??
          t('UNEXPECTED_ERROR', 'Something went wrong');
        setUploadError(prev => ({ ...prev, front: msg }));
        showToast(msg, 'error');
        return;
      }
      setFrontUrl(res.data.url);
      mergeDraft({ idDocFrontFile: res.data.url });
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
        BlindpayUploadCategory.ID_DOC_BACK,
      );
      setUploading(false);
      if (res.isError || !res.data?.url) {
        const msg =
          res.errorMessage ??
          t('UNEXPECTED_ERROR', 'Something went wrong');
        setUploadError(prev => ({ ...prev, back: msg }));
        showToast(msg, 'error');
        return;
      }
      setBackUrl(res.data.url);
      mergeDraft({ idDocBackFile: res.data.url });
      clearKey('idDocBackFile');
      setUploadError(prev => ({ ...prev, back: '' }));
    },
    [clearKey, mergeDraft, uploadDocument],
  );

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
            setCountryOpen(true);
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

      {/* Front side card */}
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(
            t('BLINDPAY_ID_FRONT', 'ID document — front / main page'),
          )}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setCaptureTarget('front');
          }}
          disabled={uploading}
          className={`rounded-[16px] overflow-hidden border ${
            fieldErrors.idDocFrontFile || uploadError.front
              ? 'border-errorText'
              : 'border-transparent'
          }`}>
          <CyDView className='bg-[#FFF8E1] items-center py-[24px] gap-[8px]'>
            {uploadError.front ? (
              <CyDView className='w-[56px] h-[56px] bg-red-500 rounded-[14px] items-center justify-center'>
                <CyDMaterialDesignIcons
                  name='alert-circle-outline'
                  size={28}
                  className='text-white'
                />
              </CyDView>
            ) : frontUrl ? (
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
                  name='card-account-details-outline'
                  size={28}
                  className='text-white'
                />
              </CyDView>
            )}
            <CyDText className='text-[16px] font-semibold text-[#C99200] tracking-[-0.8px]'>
              {String(t('BLINDPAY_FRONT_SIDE', 'Front Side'))}
            </CyDText>
          </CyDView>
          <CyDView
            className={`px-[16px] py-[10px] flex-row items-center gap-[6px] ${
              uploadError.front ? 'bg-red-100' : 'bg-[#FFE082]'
            }`}>
            <CyDMaterialDesignIcons
              name={uploadError.front ? 'alert-circle-outline' : 'information-outline'}
              size={16}
              className={uploadError.front ? 'text-red-600' : 'text-[#C99200]'}
            />
            <CyDText
              className={`text-[13px] font-medium tracking-[-0.4px] flex-1 ${
                uploadError.front ? 'text-red-600' : 'text-[#C99200]'
              }`}
              numberOfLines={2}>
              {uploadError.front
                ? uploadError.front
                : frontUrl
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
        <BlindPayKycFieldError message={fieldErrors.idDocFrontFile} />
      </CyDView>

      {/* Back side card */}
      {needsBack ? (
        <CyDView className='gap-[4px]'>
          <CyDText className='text-[12px] font-bold text-base400'>
            {String(t('BLINDPAY_ID_BACK', 'ID document — back'))}
          </CyDText>
          <CyDTouchView
            onPress={() => {
              setCaptureTarget('back');
            }}
            disabled={uploading}
            className={`rounded-[16px] overflow-hidden border ${
              fieldErrors.idDocBackFile || uploadError.back
                ? 'border-errorText'
                : 'border-transparent'
            }`}>
            <CyDView className='bg-[#FFF8E1] items-center py-[24px] gap-[8px]'>
              {uploadError.back ? (
                <CyDView className='w-[56px] h-[56px] bg-red-500 rounded-[14px] items-center justify-center'>
                  <CyDMaterialDesignIcons
                    name='alert-circle-outline'
                    size={28}
                    className='text-white'
                  />
                </CyDView>
              ) : backUrl ? (
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
                    name='card-account-details-outline'
                    size={28}
                    className='text-white'
                  />
                </CyDView>
              )}
              <CyDText className='text-[16px] font-semibold text-[#C99200] tracking-[-0.8px]'>
                {String(t('BLINDPAY_BACK_SIDE', 'Back Side'))}
              </CyDText>
            </CyDView>
            <CyDView
              className={`px-[16px] py-[10px] flex-row items-center gap-[6px] ${
                uploadError.back ? 'bg-red-100' : 'bg-[#FFE082]'
              }`}>
              <CyDMaterialDesignIcons
                name={uploadError.back ? 'alert-circle-outline' : 'information-outline'}
                size={16}
                className={uploadError.back ? 'text-red-600' : 'text-[#C99200]'}
              />
              <CyDText
                className={`text-[13px] font-medium tracking-[-0.4px] flex-1 ${
                  uploadError.back ? 'text-red-600' : 'text-[#C99200]'
                }`}
                numberOfLines={2}>
                {uploadError.back
                  ? uploadError.back
                  : backUrl
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
          <BlindPayKycFieldError message={fieldErrors.idDocBackFile} />
        </CyDView>
      ) : null}

      <BlindPayPhotoRequirements />

      {/* Country picker modal */}
      <BlindPayCountryPickerModal
        visible={countryOpen}
        selectedCode={idDocCountry}
        onSelect={code => {
          setIdDocCountry(code);
          mergeDraft({ idDocCountry: code });
          clearKey('idDocCountry');
        }}
        onClose={() => {
          setCountryOpen(false);
        }}
      />

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
