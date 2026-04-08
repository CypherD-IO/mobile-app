import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
  CyDKeyboardAwareScrollView,
  CyDScrollView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import type { BlindPayUploadFilePart } from '../api';
import ReviewCard from '../components/ReviewCard';
import { BlindpayUploadBucket } from '../types';
import BlindPayIdCaptureModal, {
  type CapturedFile,
} from '../onboarding/BlindPayIdCaptureModal';

const INDIVIDUAL_DOC_OPTIONS = [
  { value: 'individual_bank_statement', label: 'Bank Statement' },
  { value: 'individual_tax_return', label: 'Tax Return' },
  { value: 'individual_proof_of_income', label: 'Proof of Income' },
];

const BUSINESS_DOC_OPTIONS = [
  { value: 'business_bank_statement', label: 'Business Bank Statement' },
  { value: 'business_financial_statements', label: 'Financial Statements' },
  { value: 'business_tax_return', label: 'Business Tax Return' },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DropdownSheet({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string;
  options: { value: string; label: string }[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType='fade' onRequestClose={onClose}>
      <CyDView className='flex-1 justify-end bg-black/40'>
        <CyDTouchView className='flex-1' onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(300)}>
          <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
            <CyDView className='items-center pt-[12px] pb-[16px]'>
              <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
            </CyDView>
            <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
              {title}
            </CyDText>
            <CyDScrollView className='max-h-[300px]' showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); onClose(); }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>{opt.label}</CyDText>
                  {selected === opt.value ? (
                    <CyDMaterialDesignIcons name='check' size={20} className='text-[#FBC02D]' />
                  ) : null}
                </CyDTouchView>
              ))}
            </CyDScrollView>
          </CyDView>
        </Animated.View>
      </CyDView>
    </Modal>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <CyDView className='py-[10px] border-b border-n40 gap-[2px]'>
      <CyDText className='text-[12px] font-medium text-n200'>{label}</CyDText>
      <CyDText className='text-[15px] font-medium text-base400'>{value || '—'}</CyDText>
    </CyDView>
  );
}

export default function BlindPayRequestLimitIncreaseScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, { limits?: any; receiverType?: string }>, string>>();
  const insets = useSafeAreaInsets();
  const { requestLimitIncrease, uploadDocument } = useBlindPayApi();

  const currentLimits = route.params?.limits ?? {};
  const receiverType = route.params?.receiverType ?? 'individual';
  const docOptions = receiverType === 'business' ? BUSINESS_DOC_OPTIONS : INDIVIDUAL_DOC_OPTIONS;

  // 3-step wizard: 0=amounts, 1=document, 2=review
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  // Step 0
  const [perTx, setPerTx] = useState(
    currentLimits.perTransaction != null ? String(currentLimits.perTransaction / 100) : '',
  );
  const [daily, setDaily] = useState(
    currentLimits.daily != null ? String(currentLimits.daily / 100) : '',
  );
  const [monthly, setMonthly] = useState(
    currentLimits.monthly != null ? String(currentLimits.monthly / 100) : '',
  );

  // Step 1
  const [docType, setDocType] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [docPickerOpen, setDocPickerOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const docTypeLabel = docOptions.find(o => o.value === docType)?.label;

  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};
    const req = 'This field is required';
    if (step === 0) {
      const pNum = Number(perTx);
      const dNum = Number(daily);
      const mNum = Number(monthly);
      if (!perTx && !daily && !monthly) {
        e.general = 'Enter at least one new limit';
      }
      const maxDollars = 1_000_000_000; // $1B (100B cents / 100)
      if (perTx && (isNaN(pNum) || pNum <= 0)) e.perTx = 'Enter a valid amount';
      else if (perTx && pNum > maxDollars) e.perTx = `Maximum is $${maxDollars.toLocaleString()}`;
      if (daily && (isNaN(dNum) || dNum <= 0)) e.daily = 'Enter a valid amount';
      else if (daily && dNum > maxDollars) e.daily = `Maximum is $${maxDollars.toLocaleString()}`;
      if (monthly && (isNaN(mNum) || mNum <= 0)) e.monthly = 'Enter a valid amount';
      else if (monthly && mNum > maxDollars) e.monthly = `Maximum is $${maxDollars.toLocaleString()}`;
    } else if (step === 1) {
      if (!docType) e.docType = req;
      if (!docUrl) e.docFile = 'Upload a supporting document';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [step, perTx, daily, monthly, docType, docUrl]);

  const handleCapture = useCallback(
    async (file: CapturedFile) => {
      setCaptureOpen(false);
      setUploading(true);
      setUploadError('');
      const filePart: BlindPayUploadFilePart = { uri: file.uri, name: file.name, type: file.type };
      const res = await uploadDocument(filePart, BlindpayUploadBucket.LIMIT_INCREASE);
      setUploading(false);
      if (res.isError || !res.data?.fileUrl) {
        const msg = res.errorMessage ?? 'Upload failed';
        setUploadError(msg);
        showToast(msg, 'error');
        return;
      }
      setDocUrl(res.data.fileUrl);
      clearError('docFile');
      setUploadError('');
    },
    [uploadDocument, clearError],
  );

  const handleNext = useCallback(async () => {
    Keyboard.dismiss();
    if (!validateStep()) return;
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
      return;
    }

    // Submit
    setSubmitting(true);
    const body: any = {
      supportingDocumentType: docType,
      supportingDocumentFile: docUrl,
    };
    if (perTx) body.perTransaction = Math.round(Number(perTx) * 100);
    if (daily) body.daily = Math.round(Number(daily) * 100);
    if (monthly) body.monthly = Math.round(Number(monthly) * 100);

    const res = await requestLimitIncrease(body);
    setSubmitting(false);
    if (res.isError) {
      showToast(res.errorMessage ?? 'Something went wrong', 'error');
      return;
    }
    showToast('Limit increase request submitted');
    navigation.goBack();
  }, [validateStep, step, perTx, daily, monthly, docType, docUrl, requestLimitIncrease, navigation]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
    else navigation.goBack();
  }, [step, navigation]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0: return 'New Limits';
      case 1: return 'Supporting Document';
      case 2: return 'Review & Submit';
      default: return '';
    }
  }, [step]);

  const helpText = useMemo(() => {
    switch (step) {
      case 0:
        return `Enter the new limits you'd like to request (in dollars).\n\nPer Transaction: Maximum amount per single transfer.\nDaily: Maximum total transfers per day.\nMonthly: Maximum total transfers per month.\n\nYour current limits are pre-filled. Enter higher amounts for the limits you want increased.`;
      case 1:
        return `Upload a document that supports your request:\n\n• Bank Statement: Recent statement showing account activity\n• Tax Return: Most recent tax filing\n• Proof of Income: Pay stubs, employment letter, or similar\n\nDocuments must be clear, recent, and in PDF/JPEG/PNG format.`;
      default:
        return 'Review your request before submitting. Once submitted, the review typically takes 1-3 business days.';
    }
  }, [step]);

  const isLastStep = step === totalSteps - 1;

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center justify-between px-[16px] h-[64px]'>
        <CyDTouchView onPress={handleBack} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDTouchView
          onPress={() => setShowHelp(true)}
          className='flex-row items-center gap-[6px] rounded-full bg-n20 px-[12px] py-[6px]'>
          <CyDIcons name='help-circle-outline' size={20} className='text-base400' />
          <CyDText className='text-[14px] font-normal text-base400 tracking-[-0.6px]'>
            Questions
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          {stepTitle}
        </CyDText>
      </CyDView>

      <CyDKeyboardAwareScrollView
        className='flex-1'
        enableOnAndroid
        enableAutomaticScroll
        keyboardShouldPersistTaps='handled'
        extraScrollHeight={32}
        contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'>

        {step === 0 ? (
          <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
            {[
              {
                key: 'perTx',
                label: 'Per Transaction',
                value: perTx,
                current: currentLimits.perTransaction,
                onChange: setPerTx,
              },
              {
                key: 'daily',
                label: 'Daily Limit',
                value: daily,
                current: currentLimits.daily,
                onChange: setDaily,
              },
              {
                key: 'monthly',
                label: 'Monthly Limit',
                value: monthly,
                current: currentLimits.monthly,
                onChange: setMonthly,
                isLast: true,
              },
            ].map(row => (
              <CyDView key={row.key}>
                <CyDView
                  className={`px-[16px] min-h-[52px] justify-center ${
                    errors[row.key] ? 'bg-red20' : ''
                  }`}>
                  <CyDView className='py-[8px]'>
                    {row.value ? (
                      <CyDText className='text-[11px] text-n100 leading-[1.5]'>
                        {row.label}
                        {row.current != null
                          ? ` (current: ${formatCents(row.current)})`
                          : ''}
                      </CyDText>
                    ) : null}
                    <CyDView className='flex-row items-center'>
                      <CyDText className='text-[16px] font-medium text-base400 mr-[2px]'>
                        $
                      </CyDText>
                      <CyDTextInput
                        className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 flex-1 bg-transparent'
                        value={row.value}
                        onChangeText={v => {
                          row.onChange(v.replace(/[^0-9.]/g, ''));
                          clearError(row.key);
                          clearError('general');
                        }}
                        placeholder={
                          row.value
                            ? ''
                            : `${row.label}${
                                row.current != null
                                  ? ` (current: ${formatCents(row.current)})`
                                  : ''
                              }`
                        }
                        placeholderTextColor='#A6AEBB'
                        keyboardType='decimal-pad'
                        returnKeyType='next'
                        onFocus={() => setFocusedField(row.key)}
                        onBlur={() => setFocusedField(null)}
                      />
                    </CyDView>
                  </CyDView>
                </CyDView>
                {errors[row.key] ? (
                  <CyDText className='text-[11px] text-errorText px-[16px] pb-[4px]'>
                    {errors[row.key]}
                  </CyDText>
                ) : null}
                {!row.isLast ? <CyDView className='h-[0.5px] bg-n50' /> : null}
              </CyDView>
            ))}
          </CyDView>
        ) : step === 1 ? (
          <>
            {/* Document type in grouped card */}
            <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
              <CyDTouchView
                onPress={() => setDocPickerOpen(true)}
                className={`px-[16px] min-h-[52px] flex-row items-center justify-between ${
                  errors.docType ? 'bg-red20' : ''
                }`}>
                <CyDView className='flex-1 py-[8px]'>
                  {docType ? (
                    <>
                      <CyDText className='text-[11px] text-n100 leading-[1.5]'>
                        Document Type
                      </CyDText>
                      <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
                        {docTypeLabel}
                      </CyDText>
                    </>
                  ) : (
                    <CyDText className='text-[16px] font-normal text-n70 tracking-[-0.8px]'>
                      Document Type
                    </CyDText>
                  )}
                </CyDView>
                <CyDMaterialDesignIcons name='chevron-down' size={20} className='text-n70' />
              </CyDTouchView>
              {errors.docType ? (
                <CyDText className='text-[11px] text-errorText px-[16px] pb-[4px]'>
                  {errors.docType}
                </CyDText>
              ) : null}
            </CyDView>

            {/* Upload card */}
            <CyDTouchView
              onPress={() => setCaptureOpen(true)}
              disabled={uploading}
              className={`rounded-[16px] overflow-hidden border ${
                errors.docFile || uploadError ? 'border-errorText' : 'border-transparent'
              }`}>
              <CyDView className='bg-n10 items-center py-[20px] gap-[6px]'>
                {uploadError ? (
                  <CyDView className='w-[48px] h-[48px] bg-red200 rounded-[12px] items-center justify-center'>
                    <CyDMaterialDesignIcons name='alert-circle-outline' size={24} className='text-white' />
                  </CyDView>
                ) : docUrl ? (
                  <CyDView className='w-[48px] h-[48px] bg-green-500 rounded-[12px] items-center justify-center'>
                    <CyDMaterialDesignIcons name='check' size={24} className='text-white' />
                  </CyDView>
                ) : (
                  <CyDView className='w-[48px] h-[48px] bg-[#FBC02D] rounded-[12px] items-center justify-center'>
                    <CyDMaterialDesignIcons name='file-document-outline' size={24} className='text-white' />
                  </CyDView>
                )}
                <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>
                  Supporting Document
                </CyDText>
              </CyDView>
              <CyDView
                className={`px-[12px] py-[8px] flex-row items-center gap-[6px] ${
                  uploadError ? 'bg-red-100' : 'bg-[#FFE082]'
                }`}>
                <CyDMaterialDesignIcons
                  name={uploadError ? 'alert-circle-outline' : 'information-outline'}
                  size={14}
                  className={uploadError ? 'text-red-600' : 'text-n200'}
                />
                <CyDText
                  className={`text-[12px] font-medium tracking-[-0.4px] flex-1 ${
                    uploadError ? 'text-red-600' : 'text-n200'
                  }`}
                  numberOfLines={1}>
                  {uploadError || (docUrl ? 'Uploaded' : 'Tap to upload')}
                </CyDText>
              </CyDView>
            </CyDTouchView>
            {errors.docFile ? (
              <CyDText className='text-[12px] text-errorText'>{errors.docFile}</CyDText>
            ) : null}
          </>
        ) : (
          /* Review */
          <CyDView className='gap-[12px]'>
            <ReviewCard
              title='Requested Limits'
              rows={[
                ...(perTx ? [{ label: 'Per Tx', value: `$${Number(perTx).toLocaleString()}` }] : []),
                ...(daily ? [{ label: 'Daily', value: `$${Number(daily).toLocaleString()}` }] : []),
                ...(monthly ? [{ label: 'Monthly', value: `$${Number(monthly).toLocaleString()}` }] : []),
              ]}
            />
            <ReviewCard
              title='Supporting Document'
              rows={[
                { label: 'Type', value: docTypeLabel ?? '—' },
                { label: 'File', value: docUrl ? 'Uploaded' : '—' },
              ]}
            />
          </CyDView>
        )}

        {errors.general ? (
          <CyDText className='text-[12px] text-errorText text-center'>
            {errors.general}
          </CyDText>
        ) : null}
      </CyDKeyboardAwareScrollView>

      {/* Bottom: progress + button */}
      <CyDView
        className='px-[16px] pt-[12px] border-t border-n40 flex-row items-center gap-[16px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDView className='flex-1 h-[6px] rounded-full bg-n40 overflow-hidden'>
          <CyDView
            className='h-full rounded-full bg-base400'
            style={{ width: `${(((step + 1) / totalSteps) * 100).toFixed(1)}%` as any }}
          />
        </CyDView>
        <CyDTouchView
          onPress={() => { void handleNext(); }}
          disabled={submitting || uploading}
          className='rounded-full min-h-[48px] min-w-[120px] bg-[#FBC02D] px-[24px] flex-row items-center justify-center'>
          <CyDView className='relative items-center justify-center'>
            <CyDText
              className={`text-[16px] font-semibold text-black tracking-[-0.8px] ${
                submitting ? 'opacity-0' : ''
              }`}>
              {isLastStep ? 'Submit' : 'Next'}
            </CyDText>
            {submitting ? (
              <CyDView className='absolute inset-0 items-center justify-center'>
                <ActivityIndicator color='#0D0D0D' />
              </CyDView>
            ) : null}
          </CyDView>
        </CyDTouchView>
      </CyDView>

      <DropdownSheet
        visible={docPickerOpen}
        title='Document Type'
        options={docOptions}
        selected={docType}
        onSelect={v => { setDocType(v); clearError('docType'); }}
        onClose={() => setDocPickerOpen(false)}
      />

      <BlindPayIdCaptureModal
        visible={captureOpen}
        docTypeName={docTypeLabel ?? 'Document'}
        side='front'
        onContinue={handleCapture}
        onClose={() => setCaptureOpen(false)}
      />

      {/* Help sheet */}
      {showHelp ? (
        <Modal visible transparent animationType='fade' onRequestClose={() => setShowHelp(false)}>
          <CyDView className='flex-1 justify-end bg-black/40'>
            <CyDTouchView className='flex-1' onPress={() => setShowHelp(false)} />
            <Animated.View entering={SlideInDown.duration(300)}>
              <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
                <CyDView className='items-center pt-[12px] pb-[16px]'>
                  <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
                </CyDView>
                <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[12px]'>
                  Help
                </CyDText>
                <CyDText className='text-[14px] font-medium text-n200 leading-[1.5] tracking-[-0.4px]'>
                  {helpText}
                </CyDText>
                <CyDTouchView
                  onPress={() => setShowHelp(false)}
                  className='rounded-full h-[48px] bg-[#FBC02D] items-center justify-center mt-[20px]'>
                  <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
                    Got it
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            </Animated.View>
          </CyDView>
        </Modal>
      ) : null}
    </CyDSafeAreaView>
  );
}
