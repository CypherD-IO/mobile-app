import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { t } from 'i18next';
import {
  CyDText,
  CyDView,
} from '../../../../styles/tailwindComponents';
import ReviewCard from '../../components/ReviewCard';
import { showToast } from '../../../../containers/utilities/toastUtility';
import useBlindPayApi from '../../api';
import { buildBlindPayOnboardPayload } from '../buildBlindPayOnboardPayload';
import { isHighRiskCountry } from '../blindpayCountryRisk';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import type { BlindPayKycStackParamList } from '../BlindPayKycNavigation.types';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

function SectionTitle({ title }: { title: string }) {
  return (
    <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px] mt-[16px] mb-[4px]'>
      {title}
    </CyDText>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <CyDView className='gap-[4px] py-[10px] border-b border-n40'>
      <CyDText className='text-[12px] font-medium text-n200'>{label}</CyDText>
      <CyDText className='text-[15px] font-medium text-base400'>{value}</CyDText>
    </CyDView>
  );
}

function FileRow({ label, uploaded }: { label: string; uploaded: boolean }) {
  return (
    <CyDView className='flex-row items-center justify-between py-[10px] border-b border-n40'>
      <CyDText className='text-[12px] font-medium text-n200'>{label}</CyDText>
      <CyDText
        className={`text-[13px] font-semibold ${uploaded ? 'text-green-600' : 'text-errorText'}`}>
        {uploaded ? 'Uploaded' : 'Missing'}
      </CyDText>
    </CyDView>
  );
}

export function BlindPayKycReviewStep({
  advance: _advance,
  onReady,
}: BlindPayKycStepProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<BlindPayKycStackParamList>>();
  const { draft } = useBlindPayOnboardingForm();
  const { onboard } = useBlindPayApi();
  const [submitting, setSubmitting] = useState(false);

  const d = draft;
  const highRisk = isHighRiskCountry(d.country ?? '');

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const body = buildBlindPayOnboardPayload(draft);
      const res = await onboard(body);
      if (res.isError) {
        showToast(
          res.errorMessage ?? t('UNEXPECTED_ERROR', 'Something went wrong'),
          'error',
        );
        return;
      }
      showToast(
        t(
          'BLINDPAY_ONBOARD_SUCCESS',
          'Your information was submitted. We will notify you when verification is complete.',
        ),
      );
      const parent = navigation.getParent();
      if (parent?.canGoBack()) {
        parent.goBack();
      } else {
        navigation.popToTop();
      }
    } catch {
      showToast(t('UNEXPECTED_ERROR', 'Something went wrong'), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [draft, navigation, onboard]);

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useLayoutEffect(() => {
    onReady({
      canNext: !submitting,
      onNext: () => {
        void handleSubmitRef.current();
      },
      nextLoading: submitting,
      nextLabel: String(t('SUBMIT', 'Submit')),
    });
  }, [onReady, submitting]);

  return (
    <CyDView className='gap-[12px]'>
      <ReviewCard
        title={String(t('BLINDPAY_REVIEW_PERSONAL', 'Personal Details'))}
        rows={[
          { label: 'Name', value: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() },
          { label: 'DOB', value: d.dateOfBirth ?? '—' },
          { label: 'Email', value: d.email ?? '—' },
        ]}
      />

      <ReviewCard
        title={String(t('BLINDPAY_REVIEW_TAX', 'Tax Information'))}
        rows={[
          { label: 'Tax ID', value: d.taxId ?? '—' },
        ]}
      />

      <ReviewCard
        title={String(t('BLINDPAY_REVIEW_ADDR', 'Address'))}
        rows={[
          { label: 'Street', value: [d.addressLine1, d.addressLine2].filter(Boolean).join(', ') || '—' },
          { label: 'Location', value: [d.city, d.stateProvinceRegion, d.postalCode].filter(Boolean).join(', ') || '—' },
          { label: 'Country', value: d.country ?? '—' },
          { label: 'Phone', value: d.phoneNumber ?? '—' },
        ]}
      />

      {highRisk ? (
        <CyDView className='rounded-[12px] bg-n10 px-[16px] py-[14px] flex-row gap-[10px]'>
          <CyDText className='text-[18px] leading-[1]'>{'\u23F3'}</CyDText>
          <CyDView className='flex-1 gap-[4px]'>
            <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>
              {String(
                t(
                  'BLINDPAY_ENHANCED_KYC_TITLE',
                  'Enhanced verification required',
                ),
              )}
            </CyDText>
            <CyDText className='text-[13px] font-medium text-n200 tracking-[-0.4px] leading-[1.45]'>
              {String(
                t(
                  'BLINDPAY_ENHANCED_KYC_TIME',
                  'Your country requires enhanced verification. This process typically takes 3 hours to 3 business days to complete.',
                ),
              )}
            </CyDText>
          </CyDView>
        </CyDView>
      ) : null}
    </CyDView>
  );
}
