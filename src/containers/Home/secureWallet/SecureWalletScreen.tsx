import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import PageHeader from '../../../components/PageHeader';
import { screenTitle } from '../../../constants';
import { ConnectionTypes } from '../../../constants/enum';
import {
  getSecureWalletLastVerifiedAt,
  getWinddownStepsCompleted,
} from '../../../core/asyncStorage';
import {
  getSecureWalletVariant,
  SecureWalletVariant,
} from './getSecureWalletVariant';
import { getEffectiveConnectionType } from './effectiveConnectionType';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const formatTimestamp = (ts: number | null): string => {
  if (!ts) return 'Never';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'Never';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

interface StepCopy {
  title: string;
  description: string;
}

function StepCard({
  index,
  step,
}: {
  index: number;
  step: StepCopy;
}) {
  return (
    <CyDView className='bg-n0 border-[1px] border-n40 rounded-[20px] px-[15px] py-[14px] flex-row items-start mb-[10px]'>
      <CyDView className='w-[34px] h-[34px] rounded-[11px] bg-[#FDF3D8] items-center justify-center mr-[13px]'>
        {/* `!` forces the dark tone over CyDText's default text-base400, which
            otherwise wins in dark mode and makes the number vanish on pale bg. */}
        <CyDText className='text-[16px] font-extrabold !text-[#483400]'>
          {index}
        </CyDText>
      </CyDView>
      <CyDView className='flex-1'>
        <CyDText className='text-[14px] font-bold text-base400'>
          {step.title}
        </CyDText>
        <CyDText className='text-[12px] text-n200 mt-[4px] leading-[18px]'>
          {step.description}
        </CyDText>
      </CyDView>
    </CyDView>
  );
}

/**
 * Secure Wallet overview (Figma node 1-501). Variant-aware: copy adapts to seed
 * vs private-key / social wallets. The CTA starts the reveal flow.
 */
export default function SecureWalletScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [variant, setVariant] = useState<SecureWalletVariant | null>(null);
  const [isBackedUp, setIsBackedUp] = useState(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async (): Promise<void> => {
        const connectionType = await getEffectiveConnectionType();
        const cache = await getWinddownStepsCompleted();
        const ts = await getSecureWalletLastVerifiedAt();
        if (!active) return;
        // Defensive: this screen is only reachable for backable wallets.
        setVariant(
          getSecureWalletVariant(connectionType) ??
            getSecureWalletVariant(ConnectionTypes.SEED_PHRASE),
        );
        setIsBackedUp(Boolean(cache.backup));
        setLastVerifiedAt(ts);
      };
      void load();
      return () => {
        active = false;
      };
    }, []),
  );

  const isMnemonic = variant?.secretType !== 'privateKey';

  const subtitle = isMnemonic
    ? t(
        'SECURE_WALLET_SUBTITLE_SEED',
        'Your recovery phrase is the only way to access funds after Cypher shuts down. Save it somewhere safe, then confirm it here.',
      )
    : t(
        'SECURE_WALLET_SUBTITLE_KEY',
        'Your private key is the only way to access funds after Cypher shuts down. Save it somewhere safe, then confirm it here.',
      );

  const steps: StepCopy[] = isMnemonic
    ? [
        {
          title: t('SECURE_WALLET_SEED_STEP1_TITLE', 'Reveal recovery phrase'),
          description: t(
            'SECURE_WALLET_SEED_STEP1_DESC',
            'View your 12 / 24 words in a private, screenshot-blocked view.',
          ),
        },
        {
          title: t('SECURE_WALLET_SEED_STEP2_TITLE', 'Write it down offline'),
          description: t(
            'SECURE_WALLET_SEED_STEP2_DESC',
            'Store on paper or a hardware wallet. Never share it anywhere or anyone.',
          ),
        },
        {
          title: t('SECURE_WALLET_SEED_STEP3_TITLE', 'Verify access'),
          description: t(
            'SECURE_WALLET_SEED_STEP3_DESC',
            'Re-enter 4 words to confirm your backup is correct.',
          ),
        },
      ]
    : [
        {
          title: t('SECURE_WALLET_KEY_STEP1_TITLE', 'Reveal private key'),
          description: t(
            'SECURE_WALLET_KEY_STEP1_DESC',
            'View your private key in a private, screenshot-blocked view.',
          ),
        },
        {
          title: t('SECURE_WALLET_KEY_STEP2_TITLE', 'Save it securely'),
          description: t(
            'SECURE_WALLET_KEY_STEP2_DESC',
            'Store it somewhere safe. Never share your private key with anyone.',
          ),
        },
        {
          title: t('SECURE_WALLET_KEY_STEP3_TITLE', 'Confirm backup'),
          description: t(
            'SECURE_WALLET_KEY_STEP3_DESC',
            "Confirm you've saved your private key securely.",
          ),
        },
      ];

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <PageHeader
        title={t('SECURE_WALLET_HEADER', 'Secure your wallet')}
        navigation={navigation}
      />
      <CyDScrollView
        className='flex-1 bg-n20 px-[20px]'
        showsVerticalScrollIndicator={false}>
        {/* Shield + title */}
        <CyDView className='items-center mt-[16px] mb-[8px]'>
          <CyDView className='w-[84px] h-[84px] rounded-[24px] bg-[#D8333D1A] items-center justify-center mb-[14px]'>
            <CyDIcons name='shield' size={44} className='text-[#D8333D]' />
          </CyDView>
          <CyDText className='text-[21px] font-extrabold text-base400 text-center tracking-[-0.42px]'>
            {t('SECURE_WALLET_TITLE', "Don't lose access to your wallet")}
          </CyDText>
          <CyDText className='text-[13.5px] text-n200 text-center mt-[8px] leading-[20px]'>
            {subtitle}
          </CyDText>
        </CyDView>

        {/* Status card */}
        <CyDView className='bg-n0 border-[1px] border-n40 rounded-[22px] mt-[16px] mb-[16px]'>
          <CyDView className='flex-row items-center justify-between px-[16px] py-[15px] border-b-[1px] border-n40'>
            <CyDText className='text-[14px] font-medium text-n200'>
              {t('SECURE_WALLET_BACKUP_STATUS', 'Backup status')}
            </CyDText>
            {isBackedUp ? (
              <CyDView className='px-[9px] py-[4px] rounded-full bg-green20'>
                <CyDText className='text-[11px] font-bold text-green400'>
                  {t('WINDDOWN_COMPLETED', 'Completed')}
                </CyDText>
              </CyDView>
            ) : (
              <CyDView className='px-[9px] py-[4px] rounded-full bg-[#D8333D1A]'>
                <CyDText className='text-[11px] font-bold text-[#D8333D]'>
                  {t('WINDDOWN_NOT_BACKED_UP', 'Not backed up')}
                </CyDText>
              </CyDView>
            )}
          </CyDView>
          <CyDView className='flex-row items-center justify-between px-[16px] py-[15px]'>
            <CyDText className='text-[14px] font-medium text-n200'>
              {t('SECURE_WALLET_LAST_VERIFICATION', 'Last verification')}
            </CyDText>
            <CyDText className='text-[14px] font-semibold text-base400'>
              {lastVerifiedAt
                ? formatTimestamp(lastVerifiedAt)
                : t('SECURE_WALLET_NEVER', 'Never')}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Steps */}
        {steps.map((step, i) => (
          <StepCard key={step.title} index={i + 1} step={step} />
        ))}

        {/* Warning banner */}
        <CyDView className='bg-[#F5A6231F] rounded-[18px] px-[15px] py-[14px] flex-row items-center mt-[6px] mb-[20px]'>
          <CyDIcons name='lock' size={18} className='text-[#C77A12] mr-[12px]' />
          <CyDView className='flex-1'>
            <CyDText className='text-[14px] font-bold text-[#C77A12]'>
              {t(
                'SECURE_WALLET_WARNING_TITLE',
                'Cypher can never recover this for you',
              )}
            </CyDText>
            <CyDText className='text-[12px] text-n200 mt-[3px] leading-[18px]'>
              {t(
                'SECURE_WALLET_WARNING_DESC',
                'Self-custody means only you hold the keys. Keep it private.',
              )}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDScrollView>

      {/* Bottom CTA */}
      <CyDView className='bg-n0 border-t-[1px] border-n40 px-[20px] pt-[15px] pb-[20px]'>
        <CyDTouchView
          onPress={() => navigation.navigate(screenTitle.SECURE_WALLET_REVEAL)}
          activeOpacity={0.85}
          accessibilityRole='button'
          className='bg-[#F7C645] rounded-[56px] py-[15px] items-center justify-center'>
          <CyDText className='text-[15px] font-bold text-black tracking-[-0.15px]'>
            {isBackedUp
              ? t('SECURE_WALLET_CTA_AGAIN', 'Back up again')
              : t('SECURE_WALLET_CTA', 'Secure your wallet')}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
