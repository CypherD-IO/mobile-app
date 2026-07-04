import React, { useCallback, useContext, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { NativeModules } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import {
  CyDIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import PageHeader from '../../../components/PageHeader';
import Loading from '../../../components/v2/loading';
import { screenTitle } from '../../../constants';
import {
  copyToClipboard,
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../../core/util';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import {
  loadPrivateKeyFromKeyChain,
  loadRecoveryPhraseFromKeyChain,
} from '../../../core/Keychain';
import { showToast } from '../../utilities/toastUtility';
import { isAndroid } from '../../../misc/checkers';
import {
  buildVerifyChallenge,
  getSecureWalletVariant,
  SecureWalletVariant,
  validateVerifyWords,
} from './getSecureWalletVariant';
import { getEffectiveConnectionType } from './effectiveConnectionType';
import { completeSecureWalletBackup } from './completeBackup';

function GuidanceStep({ index, text }: { index: number; text: string }) {
  return (
    <CyDView className='flex-row items-start mb-[6px]'>
      <CyDText className='text-[12px] font-bold text-base400 mr-[6px]'>
        {index}.
      </CyDText>
      <CyDText className='flex-1 text-[12px] text-n200 leading-[18px]'>
        {text}
      </CyDText>
    </CyDView>
  );
}

/**
 * Reveals the wallet secret (seed phrase or private key) in a private,
 * screenshot-blocked view. Seed wallets then verify inline (enter 4 words) in
 * the same screen — reusing the already-loaded secret so there's only one
 * biometric prompt for the whole flow; private-key / social wallets confirm via
 * an acknowledgement checkbox. Social wallets also get import guidance and a
 * move-funds note.
 */
export default function SecureWalletRevealScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;

  const [variant, setVariant] = useState<SecureWalletVariant | null>(null);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Seed wallets verify inline after revealing: 'reveal' shows the phrase,
  // 'verify' asks for 4 words — both use the same in-memory `secret`.
  const [step, setStep] = useState<'reveal' | 'verify'>('reveal');
  const [challenge, setChallenge] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();

      const load = async (): Promise<void> => {
        try {
          const connectionType = await getEffectiveConnectionType();
          const v = getSecureWalletVariant(connectionType);
          const pin = hdWalletContext?.state?.pinValue ?? '';
          const value =
            v?.secretType === 'privateKey'
              ? await loadPrivateKeyFromKeyChain(false, pin)
              : await loadRecoveryPhraseFromKeyChain(false, pin);
          if (!active) return;
          if (!value || value === _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            showToast(t('SECURE_WALLET_LOAD_FAILED', 'Could not load your key'));
            navigation.goBack();
            return;
          }
          setVariant(v);
          setSecret(value);
        } catch (error) {
          Sentry.captureException(error);
          if (!active) return;
          showToast(t('SECURE_WALLET_LOAD_FAILED', 'Could not load your key'));
          navigation.goBack();
        } finally {
          if (active) setLoading(false);
        }
      };
      void load();

      return () => {
        active = false;
        if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      };
    }, []),
  );

  const onCopy = (): void => {
    copyToClipboard(secret);
    showToast(t('SECURE_WALLET_COPIED', 'Copied to clipboard'));
  };

  const onConfirmAcknowledge = (): void => {
    void completeSecureWalletBackup().then(() => {
      showToast(t('SECURE_WALLET_BACKED_UP', 'Wallet backed up'));
      navigation.navigate(screenTitle.HOME_SCREEN);
    });
  };

  // Move to the inline verify step, picking the words to challenge from the
  // already-revealed phrase (no keychain re-read, so no second biometric).
  const onContinueToVerify = (): void => {
    const wordCount = secret.trim().split(/\s+/).length;
    setChallenge(buildVerifyChallenge(wordCount, 4));
    setAnswers({});
    setVerifyError(false);
    setStep('verify');
  };

  const onVerifyAnswer = (index: number, value: string): void => {
    setVerifyError(false);
    setAnswers(prev => ({ ...prev, [index]: value }));
  };

  const onVerifyFinish = (): void => {
    if (validateVerifyWords(secret, answers)) {
      void completeSecureWalletBackup().then(() => {
        showToast(t('SECURE_WALLET_BACKED_UP', 'Wallet backed up'));
        navigation.navigate(screenTitle.HOME_SCREEN);
      });
    } else {
      setVerifyError(true);
    }
  };

  if (loading || !variant) return <Loading />;

  const isMnemonic = variant.secretType === 'mnemonic';
  const words = isMnemonic ? secret.trim().split(/\s+/) : [];
  const allVerifyFilled = challenge.every(
    i => (answers[i] ?? '').trim().length > 0,
  );

  // Inline verify step (seed wallets): re-enter 4 words against the in-memory
  // phrase. Back returns to the reveal step, not off the screen.
  if (step === 'verify') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
        <PageHeader
          title={t('SECURE_WALLET_VERIFY_HEADER', 'Verify access')}
          navigation={navigation}
          onPress={() => setStep('reveal')}
        />
        <CyDScrollView
          className='flex-1 bg-n0 px-[20px]'
          showsVerticalScrollIndicator={false}>
          <CyDText className='text-[14px] text-n200 mt-[12px] mb-[20px] leading-[20px]'>
            {t(
              'SECURE_WALLET_VERIFY_HINT',
              'Enter the following words from your recovery phrase to confirm your backup.',
            )}
          </CyDText>

          {challenge.map(index => (
            <CyDView key={index} className='mb-[16px]'>
              <CyDText className='text-[13px] font-semibold text-n200 mb-[6px]'>
                {t('SECURE_WALLET_WORD_N', 'Word #{{num}}', { num: index + 1 })}
              </CyDText>
              <CyDTextInput
                className='bg-n20 rounded-[12px] px-[16px] py-[12px] text-[15px] text-base400'
                autoCapitalize='none'
                autoCorrect={false}
                placeholder={t('SECURE_WALLET_WORD_PLACEHOLDER', 'Enter word')}
                value={answers[index] ?? ''}
                onChangeText={value => onVerifyAnswer(index, value)}
              />
            </CyDView>
          ))}

          {verifyError ? (
            <CyDText className='text-[13px] text-red400 mt-[4px]'>
              {t(
                'SECURE_WALLET_VERIFY_ERROR',
                "Those words don't match. Please check and try again.",
              )}
            </CyDText>
          ) : null}

          <CyDView className='h-[24px]' />
        </CyDScrollView>

        <CyDView className='bg-n0 border-t-[1px] border-n40 px-[20px] pt-[15px] pb-[20px]'>
          <CyDTouchView
            onPress={onVerifyFinish}
            activeOpacity={0.85}
            disabled={!allVerifyFilled}
            accessibilityRole='button'
            className={clsx(
              'rounded-[56px] py-[15px] items-center justify-center',
              allVerifyFilled ? 'bg-[#F7C645]' : 'bg-n40',
            )}>
            <CyDText className='text-[15px] font-bold text-black'>
              {t('SECURE_WALLET_VERIFY_CTA', 'Verify & finish')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <PageHeader
        title={
          isMnemonic
            ? t('SECURE_WALLET_REVEAL_SEED', 'Reveal recovery phrase')
            : t('SECURE_WALLET_REVEAL_KEY', 'Reveal private key')
        }
        navigation={navigation}
      />
      <CyDScrollView
        className='flex-1 bg-n0 px-[20px]'
        showsVerticalScrollIndicator={false}>
        <CyDText className='text-[14px] text-n200 mt-[12px] mb-[16px] leading-[20px]'>
          {isMnemonic
            ? t(
                'SECURE_WALLET_REVEAL_SEED_HINT',
                'These words unlock your wallet. Keep them somewhere only you can access.',
              )
            : t(
                'SECURE_WALLET_REVEAL_KEY_HINT',
                'This private key unlocks your wallet. Keep it somewhere only you can access.',
              )}
        </CyDText>

        {/* Secret box (tap to reveal) */}
        <CyDTouchView
          onPress={() => setRevealed(true)}
          activeOpacity={0.9}
          className='bg-n20 rounded-[16px] p-[20px] min-h-[140px] justify-center'>
          {revealed ? (
            isMnemonic ? (
              <CyDView className='flex-row flex-wrap'>
                {words.map((word, index) => (
                  <CyDView key={`${index}-${word}`} className='w-1/3 py-[8px]'>
                    <CyDText className='text-[14px] font-medium text-base400'>
                      {index + 1}. {word}
                    </CyDText>
                  </CyDView>
                ))}
              </CyDView>
            ) : (
              <CyDText className='text-[15px] font-medium text-base400 leading-[24px]'>
                {secret}
              </CyDText>
            )
          ) : (
            <CyDView className='items-center justify-center'>
              <CyDIcons name='eye-closed' size={40} className='text-base400' />
              <CyDText className='text-[14px] font-semibold text-base400 mt-[8px]'>
                {t('SECURE_WALLET_TAP_REVEAL', 'Tap to reveal')}
              </CyDText>
            </CyDView>
          )}
        </CyDTouchView>

        {revealed ? (
          <CyDTouchView
            onPress={onCopy}
            className='flex-row items-center justify-center bg-n20 rounded-full py-[10px] mt-[12px]'>
            <CyDIcons name='copy' size={18} className='text-base400 mr-[8px]' />
            <CyDText className='text-[14px] font-semibold text-base400'>
              {t('SECURE_WALLET_COPY', 'Copy')}
            </CyDText>
          </CyDTouchView>
        ) : null}

        {/* Social-login import guidance */}
        {variant.showSocialGuidance ? (
          <CyDView className='bg-n20 rounded-[16px] p-[16px] mt-[16px]'>
            <CyDText className='text-[14px] font-bold text-base400 mb-[8px]'>
              {t('SECURE_WALLET_IMPORT_TITLE', 'Move to another wallet')}
            </CyDText>
            <GuidanceStep
              index={1}
              text={t(
                'SECURE_WALLET_IMPORT_STEP1',
                'Install a self-custody wallet (e.g. MetaMask, Rabby, or Phantom for Solana).',
              )}
            />
            <GuidanceStep
              index={2}
              text={t(
                'SECURE_WALLET_IMPORT_STEP2',
                "Choose 'Import account' or 'Import private key'.",
              )}
            />
            <GuidanceStep
              index={3}
              text={t(
                'SECURE_WALLET_IMPORT_STEP3',
                'Paste the private key above. Your funds will appear in that wallet.',
              )}
            />
            {variant.showMoveFundsNote ? (
              <CyDText className='text-[12px] text-n200 mt-[8px] leading-[18px]'>
                {t(
                  'SECURE_WALLET_MOVE_FUNDS_NOTE',
                  "Prefer not to handle keys? You can also move your funds by sending them to another wallet you control.",
                )}
              </CyDText>
            ) : null}
          </CyDView>
        ) : null}

        {/* Acknowledge checkbox (private-key / social) */}
        {variant.verifyMode === 'acknowledge' ? (
          <CyDTouchView
            onPress={() => setAcknowledged(prev => !prev)}
            className='flex-row items-center mt-[20px]'>
            <CyDView
              className={clsx(
                'w-[22px] h-[22px] rounded-[6px] border-[1.5px] items-center justify-center mr-[10px]',
                acknowledged ? 'bg-[#F7C645] border-[#F7C645]' : 'border-n40',
              )}>
              {acknowledged ? (
                <CyDIcons name='tick' size={14} className='text-black' />
              ) : null}
            </CyDView>
            <CyDText className='flex-1 text-[13px] text-base400'>
              {t(
                'SECURE_WALLET_ACK',
                "I've saved my private key securely and understand Cypher can't recover it.",
              )}
            </CyDText>
          </CyDTouchView>
        ) : null}

        <CyDView className='h-[24px]' />
      </CyDScrollView>

      {/* Bottom CTA */}
      <CyDView className='bg-n0 border-t-[1px] border-n40 px-[20px] pt-[15px] pb-[20px]'>
        {variant.verifyMode === 'fourWords' ? (
          <CyDTouchView
            onPress={onContinueToVerify}
            activeOpacity={0.85}
            disabled={!revealed}
            accessibilityRole='button'
            className={clsx(
              'rounded-[56px] py-[15px] items-center justify-center',
              revealed ? 'bg-[#F7C645]' : 'bg-n40',
            )}>
            <CyDText className='text-[15px] font-bold text-black'>
              {t('SECURE_WALLET_CONTINUE_VERIFY', 'Continue to verify')}
            </CyDText>
          </CyDTouchView>
        ) : (
          <CyDTouchView
            onPress={onConfirmAcknowledge}
            activeOpacity={0.85}
            disabled={!acknowledged}
            accessibilityRole='button'
            className={clsx(
              'rounded-[56px] py-[15px] items-center justify-center',
              acknowledged ? 'bg-[#F7C645]' : 'bg-n40',
            )}>
            <CyDText className='text-[15px] font-bold text-black'>
              {t('SECURE_WALLET_CONFIRM', 'Confirm backup')}
            </CyDText>
          </CyDTouchView>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
