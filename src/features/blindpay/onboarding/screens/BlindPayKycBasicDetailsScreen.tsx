import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { Keyboard } from 'react-native';
import { t } from 'i18next';
import DatePickerModal from 'react-native-modal-datetime-picker';
import { GlobalContext } from '../../../../core/globalContext';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { blindPayKycBasicSchema } from '../blindpayKycFormSchemas';
import type { BlindPayKycStepProps } from '../blindpayKycWizardTypes';
import { omitFieldError, zodErrorToFieldMap } from '../blindpayKycZodUtils';
import BlindPayKycFieldError from '../BlindPayKycFieldError';
import { useBlindPayOnboardingForm } from '../BlindPayOnboardingFormContext';

function formatYmd(d: Date): string {
  // Use local date parts (not UTC) so users east of UTC don't see the day shift
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDobDisplay(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return '';
  }
  const [y, m, d] = ymd.split('-').map(Number);
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd} ${mm} ${y}`;
}

type FieldFocus = 'firstName' | 'lastName' | 'email' | null;

function fieldContainerClass(
  hasError: boolean,
  focused: boolean,
): string {
  if (hasError) {
    return 'rounded-[8px] border border-errorText bg-n20';
  }
  if (focused) {
    return 'rounded-[8px] border border-base400 bg-n20';
  }
  return 'rounded-[8px] border border-transparent bg-n20';
}

const LABEL_CLASS =
  'text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]';
const INPUT_TEXT_CLASS =
  'flex-1 bg-transparent text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] py-0';

export function BlindPayKycBasicDetailsStep({
  advance,
  onReady,
}: BlindPayKycStepProps) {
  const { draft, mergeDraft } = useBlindPayOnboardingForm();
  const globalContext = useContext(GlobalContext);
  const profileEmail = useMemo(() => {
    const raw = globalContext?.globalState.cardProfile?.email?.trim();
    return raw && raw.length > 0 ? raw : '';
  }, [globalContext?.globalState.cardProfile?.email]);

  const hasProfileEmail = profileEmail.length > 0;

  const [showDob, setShowDob] = useState(false);
  const [firstName, setFirstName] = useState(draft.firstName ?? '');
  const [lastName, setLastName] = useState(draft.lastName ?? '');
  const [dob, setDob] = useState(draft.dateOfBirth ?? '');
  const [emailInput, setEmailInput] = useState(() => draft.email?.trim() ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<FieldFocus>(null);

  // Sync local state when draft is populated by async prefill (e.g. card user-data)
  useEffect(() => {
    if (draft.firstName && !firstName) setFirstName(draft.firstName);
  }, [draft.firstName]);
  useEffect(() => {
    if (draft.lastName && !lastName) setLastName(draft.lastName);
  }, [draft.lastName]);
  useEffect(() => {
    if (draft.dateOfBirth && !dob) setDob(draft.dateOfBirth);
  }, [draft.dateOfBirth]);

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const minDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d;
  }, []);

  const resolvedEmail = hasProfileEmail ? profileEmail : emailInput.trim();

  const clearError = useCallback((key: string) => {
    setFieldErrors(prev => omitFieldError(prev, key));
  }, []);

  const handleNext = useCallback(() => {
    const parsed = blindPayKycBasicSchema.safeParse({
      firstName,
      lastName,
      dateOfBirth: dob,
      email: resolvedEmail,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    mergeDraft({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: parsed.data.dateOfBirth,
      email: parsed.data.email,
    });
    advance();
  }, [advance, dob, firstName, lastName, mergeDraft, resolvedEmail]);

  useLayoutEffect(() => {
    onReady({
      canNext: true,
      onNext: handleNext,
    });
  }, [handleNext, onReady]);

  const dobDisplay = dob ? formatDobDisplay(dob) : '';

  return (
    <>
      <CyDView className='gap-[4px]'>
        <CyDText className={LABEL_CLASS}>
          {String(t('FIRST_NAME', 'First Name'))}
        </CyDText>
        <CyDView
          className={fieldContainerClass(
            !!fieldErrors.firstName,
            focusedField === 'firstName',
          )}>
          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              className={INPUT_TEXT_CLASS}
              value={firstName}
              onChangeText={v => {
                setFirstName(v);
                clearError('firstName');
              }}
              onFocus={() => {
                setFocusedField('firstName');
              }}
              onBlur={() => {
                setFocusedField(f => (f === 'firstName' ? null : f));
              }}
              autoCapitalize='words'
              autoCorrect={false}
              returnKeyType='done'
              blurOnSubmit
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
            />
          </CyDView>
        </CyDView>
        <BlindPayKycFieldError message={fieldErrors.firstName} />
      </CyDView>

      <CyDView className='gap-[4px]'>
        <CyDText className={LABEL_CLASS}>
          {String(t('LAST_NAME', 'Last Name'))}
        </CyDText>
        <CyDView
          className={fieldContainerClass(
            !!fieldErrors.lastName,
            focusedField === 'lastName',
          )}>
          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              className={INPUT_TEXT_CLASS}
              value={lastName}
              onChangeText={v => {
                setLastName(v);
                clearError('lastName');
              }}
              onFocus={() => {
                setFocusedField('lastName');
              }}
              onBlur={() => {
                setFocusedField(f => (f === 'lastName' ? null : f));
              }}
              autoCapitalize='words'
              autoCorrect={false}
              returnKeyType='done'
              blurOnSubmit
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
            />
          </CyDView>
        </CyDView>
        <BlindPayKycFieldError message={fieldErrors.lastName} />
      </CyDView>

      <CyDView className='gap-[4px]'>
        <CyDText className={LABEL_CLASS}>
          {String(t('DATE_OF_BIRTH', 'Date of Birth'))}
        </CyDText>
        <CyDTouchView
          onPress={() => {
            setShowDob(true);
          }}
          className={fieldContainerClass(!!fieldErrors.dateOfBirth, showDob)}>
          <CyDView className='min-h-[48px] flex-row items-center px-[12px]'>
            <CyDText
              className={`flex-1 text-[16px] font-medium tracking-[-0.8px] leading-[1.3] ${
                dobDisplay ? 'text-base400' : 'text-n200'
              }`}>
              {dobDisplay || String(t('SELECT_DATE', 'Select date'))}
            </CyDText>
            <CyDMaterialDesignIcons
              name='calendar'
              size={24}
              className='text-base400'
            />
          </CyDView>
        </CyDTouchView>
        <BlindPayKycFieldError message={fieldErrors.dateOfBirth} />
      </CyDView>

      <CyDView className='gap-[4px]'>
        <CyDText className={LABEL_CLASS}>
          {String(t('BLINDPAY_EMAIL_ADDRESS_LABEL', 'Email Address'))}
        </CyDText>
        <CyDView
          className={fieldContainerClass(
            !!fieldErrors.email,
            focusedField === 'email',
          )}>
          <CyDView className='min-h-[48px] justify-center px-[12px]'>
            <CyDTextInput
              className={INPUT_TEXT_CLASS}
              value={hasProfileEmail ? profileEmail : emailInput}
              onChangeText={
                hasProfileEmail
                  ? undefined
                  : v => {
                      setEmailInput(v);
                      clearError('email');
                    }
              }
              editable={!hasProfileEmail}
              onFocus={() => {
                setFocusedField('email');
              }}
              onBlur={() => {
                setFocusedField(f => (f === 'email' ? null : f));
              }}
              keyboardType='email-address'
              autoCapitalize='none'
              autoCorrect={false}
              returnKeyType='done'
              blurOnSubmit
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
              placeholder={
                hasProfileEmail
                  ? undefined
                  : String(t('BLINDPAY_EMAIL_PLACEHOLDER', 'name@example.com'))
              }
              placeholderTextColor='#8C8C8C'
            />
          </CyDView>
        </CyDView>
        <BlindPayKycFieldError message={fieldErrors.email} />
        <CyDText className='text-[12px] font-normal text-n200 leading-[1.5]'>
          {String(
            t(
              'BLINDPAY_EMAIL_HELPER',
              'An email address is necessary for verification, updates and further communication',
            ),
          )}
        </CyDText>
      </CyDView>

      <DatePickerModal
        isVisible={showDob}
        mode='date'
        date={dob ? new Date(`${dob}T12:00:00`) : maxDob}
        maximumDate={maxDob}
        minimumDate={minDob}
        onConfirm={d => {
          setShowDob(false);
          setDob(formatYmd(d));
          clearError('dateOfBirth');
        }}
        onCancel={() => {
          setShowDob(false);
        }}
      />
    </>
  );
}
