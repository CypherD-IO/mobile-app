import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Modal } from 'react-native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { showToast } from '../../../../containers/utilities/toastUtility';
import useBlindPayApi, { type BlindPayUploadFilePart } from '../../api';
import {
  BlindpaySourceOfFundsDocType,
  BlindpayUploadBucket,
} from '../../types';
import { blindPayKycSourceOfFundsSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';
import BlindPayIdCaptureModal, {
  type CapturedFile,
} from '../BlindPayIdCaptureModal';

const SOF_OPTIONS = [
  { value: BlindpaySourceOfFundsDocType.SALARY, label: 'Salary' },
  { value: BlindpaySourceOfFundsDocType.BUSINESS_INCOME, label: 'Business income' },
  { value: BlindpaySourceOfFundsDocType.SAVINGS, label: 'Savings' },
  { value: BlindpaySourceOfFundsDocType.INVESTMENT_PROCEEDS, label: 'Investment proceeds' },
  { value: BlindpaySourceOfFundsDocType.INVESTMENT_LOANS, label: 'Investment / Loans' },
  { value: BlindpaySourceOfFundsDocType.PENSION_RETIREMENT, label: 'Pension / Retirement' },
  { value: BlindpaySourceOfFundsDocType.INHERITANCE, label: 'Inheritance' },
  { value: BlindpaySourceOfFundsDocType.GIFTS, label: 'Gifts' },
  { value: BlindpaySourceOfFundsDocType.GOVERNMENT_BENEFITS, label: 'Government benefits' },
  { value: BlindpaySourceOfFundsDocType.SALE_OF_ASSETS_REAL_ESTATE, label: 'Sale of assets / Real estate' },
  { value: BlindpaySourceOfFundsDocType.ESOPS, label: 'ESOPs' },
  { value: BlindpaySourceOfFundsDocType.GAMBLING_PROCEEDS, label: 'Gambling proceeds' },
  { value: BlindpaySourceOfFundsDocType.SOMEONE_ELSE_FUNDS, label: "Someone else's funds" },
] as const;

export function BlindPayKycSourceOfFundsStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const { uploadDocument } = useBlindPayApi();

  const [docType, setDocType] = useState<
    BlindpaySourceOfFundsDocType | undefined
  >(draft.sourceOfFundsDocType as BlindpaySourceOfFundsDocType | undefined);
  const [fileUrl, setFileUrl] = useState(draft.sourceOfFundsDocFile ?? '');
  const [typeOpen, setTypeOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const typeLabel = SOF_OPTIONS.find(o => o.value === docType)?.label;

  const clearKey = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const handleCapture = useCallback(
    async (file: CapturedFile) => {
      setCaptureOpen(false);
      setUploading(true);
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
        showToast(
          res.errorMessage ??
            t('UNEXPECTED_ERROR', 'Something went wrong'),
          'error',
        );
        return;
      }
      setFileUrl(res.data.fileUrl);
      mergeDraft({ sourceOfFundsDocFile: res.data.fileUrl });
      clearKey('sourceOfFundsDocFile');
    },
    [clearKey, mergeDraft, uploadDocument],
  );

  const handleNext = useCallback(() => {
    const parsed = blindPayKycSourceOfFundsSchema.safeParse({
      sourceOfFundsDocType: docType,
      sourceOfFundsDocFile: fileUrl,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      sourceOfFundsDocType: parsed.data.sourceOfFundsDocType,
      sourceOfFundsDocFile: parsed.data.sourceOfFundsDocFile,
    });
    advance();
  }, [advance, docType, fileUrl, mergeDraft]);

  useLayoutEffect(() => {
    onReady({
      canNext: !uploading,
      onNext: handleNext,
      nextLoading: uploading,
    });
  }, [handleNext, onReady, uploading]);

  return (
    <>
      {/* Document type selector */}
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_SOF_TYPE', 'Document type'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setTypeOpen(true);
          }}
          className={`rounded-[12px] bg-n20 px-[14px] py-[14px] flex-row items-center justify-between border ${
            fieldErrors.sourceOfFundsDocType
              ? 'border-errorText'
              : 'border-transparent'
          }`}>
          <CyDText
            className={`text-[16px] font-medium ${
              docType ? 'text-base400' : 'text-n200'
            }`}>
            {typeLabel ?? String(t('SELECT', 'Select'))}
          </CyDText>
          <CyDMaterialDesignIcons
            name='chevron-down'
            size={22}
            className='text-base400'
          />
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.sourceOfFundsDocType} />
      </CyDView>

      {/* Upload card */}
      <CyDView className='gap-[4px]'>
        <CyDText className='text-[12px] font-bold text-base400'>
          {String(t('BLINDPAY_SOF_UPLOAD', 'Upload document'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setCaptureOpen(true);
          }}
          disabled={uploading}
          className={`rounded-[16px] overflow-hidden border ${
            fieldErrors.sourceOfFundsDocFile
              ? 'border-errorText'
              : 'border-transparent'
          }`}>
          <CyDView className='bg-n10 items-center py-[24px] gap-[8px]'>
            {fileUrl ? (
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
                  name='file-document-outline'
                  size={28}
                  className='text-white'
                />
              </CyDView>
            )}
            <CyDText className='text-[16px] font-semibold text-n200 tracking-[-0.8px]'>
              {String(t('BLINDPAY_SOF_LABEL', 'Source of Funds'))}
            </CyDText>
          </CyDView>
          <CyDView className='bg-[#FFE082] px-[16px] py-[10px] flex-row items-center gap-[6px]'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={16}
              className='text-n200'
            />
            <CyDText className='text-[13px] font-medium text-n200 tracking-[-0.4px] flex-1'>
              {fileUrl
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
        <BlindPayKycFieldError message={fieldErrors.sourceOfFundsDocFile} />
      </CyDView>

      {/* Type picker bottom sheet */}
      <Modal
        visible={typeOpen}
        transparent
        animationType='fade'
        onRequestClose={() => {
          setTypeOpen(false);
        }}>
        <CyDView className='flex-1 justify-end bg-black/40'>
          <CyDTouchView
            className='flex-1'
            onPress={() => {
              setTypeOpen(false);
            }}
          />
          <Animated.View entering={SlideInDown.duration(300)}>
            <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
              <CyDView className='items-center pt-[12px] pb-[16px]'>
                <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
              </CyDView>
              <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
                {String(t('BLINDPAY_SOF_TYPE', 'Document type'))}
              </CyDText>
              {SOF_OPTIONS.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => {
                    setDocType(opt.value);
                    mergeDraft({ sourceOfFundsDocType: opt.value });
                    setTypeOpen(false);
                    clearKey('sourceOfFundsDocType');
                  }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>
                    {opt.label}
                  </CyDText>
                  {docType === opt.value ? (
                    <CyDMaterialDesignIcons
                      name='check'
                      size={20}
                      className='text-[#FBC02D]'
                    />
                  ) : null}
                </CyDTouchView>
              ))}
            </CyDView>
          </Animated.View>
        </CyDView>
      </Modal>

      {/* Capture modal */}
      <BlindPayIdCaptureModal
        visible={captureOpen}
        docTypeName={typeLabel ?? String(t('BLINDPAY_SOF_LABEL', 'Source of Funds'))}
        side='front'
        onContinue={handleCapture}
        onClose={() => {
          setCaptureOpen(false);
        }}
      />
    </>
  );
}
