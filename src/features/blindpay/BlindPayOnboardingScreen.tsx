import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
import {
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { screenTitle } from '../../constants';
import { navigateToBlindPayKycStack } from './navigateToBlindPayKyc';
import BlindPaySendMoneyScreen from './BlindPaySendMoneyScreen';
import BlindPayFxPreviewScreen from './BlindPayFxPreviewScreen';
import useBlindPayApi from './api';
import { BLINDPAY_FIGMA_ASSETS } from './figmaAssets';
import { showToast } from '../../containers/utilities/toastUtility';
import { parseErrorMessage } from '../../core/util';
import type { BlindpayUserConfig } from './types';
import { BlindpayReceiverStatus } from './types';
import { HdWalletContext } from '../../core/util';
import type { Holding } from '../../core/portfolio';

// ── Status screens ──────────────────────────────────────────────

function KycInProgressScreen({
  onRefresh,
  onGoHome,
  refreshing,
}: {
  onRefresh: () => void;
  onGoHome: () => void;
  refreshing: boolean;
}) {
  return (
    <CyDScrollView className='flex-1' contentContainerClassName='pb-[24px]'>
      <CyDView className='items-center pt-[16px] pb-[8px]'>
        <CyDImage
          source={{ uri: BLINDPAY_FIGMA_ASSETS.kycInProgress }}
          className='h-[160px] w-[160px]'
          resizeMode='contain'
        />
      </CyDView>

      <CyDView className='px-[16px] gap-[16px]'>
        <CyDView className='gap-[6px]'>
          <CyDText className='text-[32px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
            {String(
              t('BLINDPAY_KYC_IN_PROGRESS', 'Verification In-Progress'),
            )}
          </CyDText>
          <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px]'>
            {String(
              t(
                'BLINDPAY_KYC_IN_PROGRESS_DESC',
                'Your KYC is currently in progress. Please wait for a short while as we complete the process.',
              ),
            )}
          </CyDText>
        </CyDView>

        {/* KYC Status row */}
        <CyDView className='gap-[4px]'>
          <CyDText className='text-[14px] font-normal text-n200 leading-[1.45] tracking-[-0.6px]'>
            {String(t('BLINDPAY_KYC_STATUS', 'KYC Status'))}
          </CyDText>
          <CyDView className='border border-n40 rounded-[8px] px-[12px] py-[12px] flex-row items-center justify-between'>
            <CyDView className='flex-row items-center gap-[10px]'>
              <CyDView className='w-[10px] h-[10px] rounded-full bg-[#ECAB00]' />
              <CyDText className='text-[20px] font-medium text-n200 tracking-[-1px]'>
                {String(t('BLINDPAY_IN_PROGRESS', 'In progress'))}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={onRefresh}
              disabled={refreshing}
              className='flex-row items-center gap-[6px] bg-n30 rounded-[6px] px-[12px] py-[6px]'>
              {refreshing ? (
                <ActivityIndicator size='small' color='#0D0D0D' />
              ) : (
                <CyDMaterialDesignIcons
                  name='refresh'
                  size={18}
                  className='text-base400'
                />
              )}
              <CyDText className='text-[12px] font-bold text-base400'>
                {String(t('REFRESH', 'Refresh'))}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {/* Info card */}
        <CyDView className='border border-n40 rounded-[8px] p-[16px] gap-[16px]'>
          <CyDView className='flex-row gap-[8px] items-start'>
            <CyDMaterialDesignIcons
              name='clock-outline'
              size={24}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-normal text-base400 tracking-[-0.8px] leading-[1.4] flex-1'>
              {String(
                t(
                  'BLINDPAY_WAIT_TIME',
                  'Please wait for 3-10 minutes as we complete this process.',
                ),
              )}
            </CyDText>
          </CyDView>
          <CyDView className='h-px bg-n40' />
          <CyDView className='flex-row gap-[12px] items-start'>
            <CyDMaterialDesignIcons
              name='email-outline'
              size={24}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-normal text-base400 tracking-[-0.8px] leading-[1.4] flex-1'>
              {String(
                t(
                  'BLINDPAY_EMAIL_NOTIFY',
                  "You'll receive an email as soon as your KYC verification is complete.",
                ),
              )}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Go Home button */}
        <CyDTouchView
          onPress={onGoHome}
          className='rounded-full h-[52px] bg-[#FBC02D] items-center justify-center mt-[8px]'>
          <CyDText className='text-[20px] font-semibold text-black tracking-[-1px]'>
            {String(t('GO_HOME', 'Go Home'))}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDScrollView>
  );
}

function KycVerifyingScreen({
  onRefresh,
  onGoHome,
  refreshing,
}: {
  onRefresh: () => void;
  onGoHome: () => void;
  refreshing: boolean;
}) {
  return (
    <CyDScrollView className='flex-1' contentContainerClassName='pb-[40px]'>
      <CyDView className='items-center pt-[24px] pb-[16px]'>
        <CyDImage
          source={{ uri: BLINDPAY_FIGMA_ASSETS.kycReview }}
          className='h-[208px] w-[208px]'
          resizeMode='contain'
        />
      </CyDView>

      <CyDView className='px-[16px] gap-[16px]'>
        <CyDView className='gap-[6px]'>
          <CyDText className='text-[32px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
            {String(t('BLINDPAY_ADDITIONAL_REVIEW', 'Additional Review'))}
          </CyDText>
          <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px]'>
            {String(
              t(
                'BLINDPAY_ADDITIONAL_REVIEW_DESC',
                "We're currently processing your document with care.",
              ),
            )}
          </CyDText>
        </CyDView>

        {/* Info card */}
        <CyDView className='border border-n40 rounded-[8px] p-[16px] gap-[16px]'>
          <CyDView className='flex-row gap-[8px] items-start'>
            <CyDMaterialDesignIcons
              name='clock-outline'
              size={24}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-normal text-base400 tracking-[-0.8px] leading-[1.4] flex-1'>
              {String(
                t(
                  'BLINDPAY_REVIEW_WAIT',
                  'The additional review generally requires 3 to 5 business days for completion.',
                ),
              )}
            </CyDText>
          </CyDView>
          <CyDView className='h-px bg-n40' />
          <CyDView className='flex-row gap-[12px] items-start'>
            <CyDMaterialDesignIcons
              name='email-outline'
              size={24}
              className='text-base400'
            />
            <CyDText className='text-[16px] font-normal text-base400 tracking-[-0.8px] leading-[1.4] flex-1'>
              {String(
                t(
                  'BLINDPAY_EMAIL_NOTIFY',
                  "You'll receive an email as soon as your KYC verification is complete.",
                ),
              )}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* KYC Status row */}
        <CyDView className='gap-[4px]'>
          <CyDText className='text-[14px] font-normal text-n200 leading-[1.45] tracking-[-0.6px]'>
            {String(t('BLINDPAY_KYC_STATUS', 'KYC Status'))}
          </CyDText>
          <CyDView className='border border-n40 rounded-[8px] px-[12px] py-[12px] flex-row items-center justify-between'>
            <CyDView className='flex-row items-center gap-[10px]'>
              <CyDView className='w-[10px] h-[10px] rounded-full bg-[#ECAB00]' />
              <CyDText className='text-[20px] font-medium text-n200 tracking-[-1px]'>
                {String(t('BLINDPAY_IN_PROGRESS', 'In progress'))}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={onRefresh}
              disabled={refreshing}
              className='flex-row items-center gap-[6px] bg-n30 rounded-[6px] px-[12px] py-[6px]'>
              {refreshing ? (
                <ActivityIndicator size='small' color='#0D0D0D' />
              ) : (
                <CyDMaterialDesignIcons
                  name='refresh'
                  size={18}
                  className='text-base400'
                />
              )}
              <CyDText className='text-[12px] font-bold text-base400'>
                {String(t('REFRESH', 'Refresh'))}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {/* Go Home button */}
        <CyDTouchView
          onPress={onGoHome}
          className='rounded-full h-[52px] bg-[#FBC02D] items-center justify-center mt-[8px]'>
          <CyDText className='text-[20px] font-semibold text-black tracking-[-1px]'>
            {String(t('GO_HOME', 'Go Home'))}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDScrollView>
  );
}

function KycApprovedScreen({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <CyDView className='flex-1'>
      <CyDView className='flex-1 items-center justify-center px-[16px]'>
        <CyDView className='items-center gap-[33px]'>
          <CyDImage
            source={{ uri: BLINDPAY_FIGMA_ASSETS.kycApproved }}
            className='h-[171px] w-[183px]'
            resizeMode='contain'
          />
          <CyDView className='gap-[6px] items-center'>
            <CyDText className='text-[32px] font-normal text-base400 tracking-[-1px] leading-[1.4] text-center'>
              {String(
                t('BLINDPAY_KYC_APPROVED_TITLE', 'Verification Completed'),
              )}
            </CyDText>
            <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px] text-center'>
              {String(
                t(
                  'BLINDPAY_KYC_APPROVED_DESC',
                  'Great news! Your KYC Verification has been successfully completed. You now have full access to all features.',
                ),
              )}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>

      <CyDView
        className='px-[16px] pt-[12px] items-center gap-[12px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDText className='text-[14px] font-semibold text-[#006A31] tracking-[-0.6px] text-center'>
          {String(
            t(
              'BLINDPAY_FREE_TX',
              '\uD83C\uDF89 Your First 3 transactions are free',
            ),
          )}
        </CyDText>
        <CyDTouchView
          onPress={onContinue}
          className='rounded-full h-[48px] w-full bg-[#FFDE59] items-center justify-center shadow-sm'>
          <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
            {String(t('BLINDPAY_START_SENDING', 'Start sending money'))}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
}

function KycRejectedScreen({
  onGoHome,
  reason,
}: {
  onGoHome: () => void;
  reason?: string;
}) {
  const insets = useSafeAreaInsets();
  const errorMessage = reason
    ? reason
    : String(
        t(
          'BLINDPAY_KYC_REJECT_REASON',
          "We can't share the specific reasons for your rejection right now, considering your privacy and security.",
        ),
      );

  return (
    <CyDView className='flex-1'>
      <CyDScrollView className='flex-1' contentContainerClassName='pb-[24px]'>
        <CyDView className='items-center pt-[40px] pb-[24px]'>
          <CyDImage
            source={{ uri: BLINDPAY_FIGMA_ASSETS.kycRejected }}
            className='h-[166px] w-[166px]'
            resizeMode='contain'
          />
        </CyDView>

        <CyDView className='px-[16px] gap-[16px]'>
          <CyDView className='gap-[6px]'>
            <CyDText className='text-[32px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
              {String(t('BLINDPAY_KYC_FAILED', 'Verification Failed'))}
            </CyDText>
            <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px]'>
              {String(
                t(
                  'BLINDPAY_KYC_FAILED_DESC',
                  'We regret to inform you that your KYC verification has not been approved by our banking partner.',
                ),
              )}
            </CyDText>
          </CyDView>

          {/* Error card */}
          <CyDView className='bg-[#F9DEDE] border border-[#C03838] rounded-[12px] p-[16px]'>
            <CyDView className='flex-row gap-[8px] items-start'>
              <CyDMaterialDesignIcons
                name='alert-circle-outline'
                size={24}
                className='text-[#A00000]'
              />
              <CyDText className='text-[16px] font-normal text-[#A00000] tracking-[-0.8px] leading-[1.4] flex-1'>
                {errorMessage}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>

      {/* Go Home pinned to bottom */}
      <CyDView
        className='px-[16px] pt-[16px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDTouchView
          onPress={onGoHome}
          className='rounded-full h-[52px] bg-[#FBC02D] items-center justify-center'>
          <CyDText className='text-[20px] font-semibold text-black tracking-[-1px]'>
            {String(t('GO_HOME', 'Go Home'))}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
}

// ── Dashboard (approved) ────────────────────────────────────────

const PAYOUT_CHAINS = ['eth', 'base', 'polygon', 'arbitrum', 'solana'] as const;
const STABLE_SYMBOLS = ['USDC', 'USDT'];

function useStableBalance(): { balance: number; loading: boolean } {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const hdWallet = useContext(HdWalletContext) as any;
  const address =
    hdWallet?.state?.wallet?.ethereum?.address ??
    hdWallet?.state?.wallet?.solana?.address ??
    '';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        const { getPortfolioData } = await import('../../core/asyncStorage');
        const portfolio = await getPortfolioData(address);
        if (cancelled || !portfolio?.data) {
          setLoading(false);
          return;
        }
        let total = 0;
        for (const chain of PAYOUT_CHAINS) {
          const holdings: Holding[] =
            (portfolio.data as any)[chain]?.totalHoldings ?? [];
          for (const h of holdings) {
            if (
              STABLE_SYMBOLS.includes(h.symbol?.toUpperCase()) &&
              typeof h.totalValue === 'number'
            ) {
              total += h.totalValue;
            }
          }
        }
        if (!cancelled) {
          setBalance(total);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { balance, loading };
}

function DashboardScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const { balance, loading } = useStableBalance();

  const menuItems = [
    {
      icon: 'send' as const,
      title: String(t('SEND_MONEY', 'Send Money')),
      subtitle: String(
        t('SEND_MONEY_DESC', 'Transfer funds to a recipient'),
      ),
      onPress: () =>
        navigation.navigate(screenTitle.BLINDPAY_SEND_MONEY),
    },
    {
      icon: 'bank-outline' as const,
      title: String(t('BANK_ACCOUNTS', 'Bank Accounts')),
      subtitle: String(
        t('BANK_ACCOUNTS_DESC', 'Manage your linked bank accounts'),
      ),
      onPress: () =>
        navigation.navigate(screenTitle.BLINDPAY_BANK_ACCOUNTS),
    },
    {
      icon: 'credit-card-outline' as const,
      title: String(t('VIRTUAL_ACCOUNT', 'Virtual Accounts')),
      subtitle: String(
        t('VIRTUAL_ACCOUNT_DESC', 'Manage virtual bank accounts'),
      ),
      onPress: () =>
        navigation.navigate(screenTitle.BLINDPAY_VIRTUAL_ACCOUNTS),
    },
    {
      icon: 'arrow-up-circle-outline' as const,
      title: String(t('LIMIT_INCREASE', 'Request Limit Increase')),
      subtitle: String(
        t('LIMIT_INCREASE_DESC', 'Increase your transaction limits'),
      ),
      onPress: () =>
        navigation.navigate(screenTitle.BLINDPAY_LIMITS),
    },
    {
      icon: 'history' as const,
      title: String(t('TX_HISTORY', 'Transaction History')),
      subtitle: String(
        t('TX_HISTORY_DESC', 'View past transactions'),
      ),
      onPress: () =>
        navigation.navigate(screenTitle.BLINDPAY_PAYOUT_HISTORY),
    },
  ];

  return (
    <CyDScrollView className='flex-1' contentContainerClassName='pb-[24px]'>
      {/* Balance card */}
      <CyDView className='px-[16px] pt-[16px] pb-[20px]'>
        <CyDView className='bg-base400 rounded-[16px] p-[20px]'>
          <CyDText className='text-[13px] font-medium text-white/60 tracking-[-0.4px]'>
            {String(t('AVAILABLE_BALANCE', 'Available to send'))}
          </CyDText>
          <CyDView className='flex-row items-baseline gap-[4px] mt-[4px]'>
            {loading ? (
              <ActivityIndicator color='#FBC02D' size='small' />
            ) : (
              <CyDText className='text-[32px] font-semibold text-white tracking-[-1px]'>
                {`$${balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
              </CyDText>
            )}
          </CyDView>
          <CyDText className='text-[11px] font-medium text-white/40 mt-[6px]'>
            {String(
              t(
                'BALANCE_CHAINS',
                'USDC & USDT on Ethereum, Base, Polygon, Arbitrum, Solana',
              ),
            )}
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Title */}
      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[20px] font-semibold text-base400 tracking-[-0.8px]'>
          {String(t('QUICK_ACTIONS', 'Quick Actions'))}
        </CyDText>
      </CyDView>

      {/* Menu items */}
      <CyDView className='px-[16px] gap-[10px]'>
        {menuItems.map(item => (
          <CyDTouchView
            key={item.title}
            onPress={item.onPress}
            className='bg-n0 border border-n30 rounded-[12px] p-[16px] flex-row items-center gap-[12px]'>
            <CyDView className='w-[44px] h-[44px] rounded-[12px] bg-[#FDF3D8] items-center justify-center'>
              <CyDMaterialDesignIcons
                name={item.icon}
                size={22}
                className='text-n200'
              />
            </CyDView>
            <CyDView className='flex-1'>
              <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px]'>
                {item.title}
              </CyDText>
              <CyDText className='text-[13px] font-medium text-n200 tracking-[-0.4px] mt-[2px]'>
                {item.subtitle}
              </CyDText>
            </CyDView>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={22}
              className='text-n200'
            />
          </CyDTouchView>
        ))}
      </CyDView>
    </CyDScrollView>
  );
}

// ── Onboarding intro ────────────────────────────────────────────

interface StepRowProps {
  step: string;
  title: string;
  subtitle: string;
  imageUri: string;
}

const StepRow = ({ step, title, subtitle, imageUri }: StepRowProps) => (
  <CyDView className='flex-row items-center justify-between px-[16px] py-[20px]'>
    <CyDView className='flex-row items-start flex-1 gap-[12px] pr-[8px]'>
      <CyDText className='text-[20px] font-semibold text-base400 tracking-[-1px]'>
        {step}
      </CyDText>
      <CyDView className='flex-1 gap-[6px]'>
        <CyDText className='text-[20px] font-medium text-base400 tracking-[-1px]'>
          {title}
        </CyDText>
        <CyDText className='text-[14px] font-medium text-n200 leading-[1.45] tracking-[-0.6px]'>
          {subtitle}
        </CyDText>
      </CyDView>
    </CyDView>
    <CyDView className='w-[86px] h-[86px] items-center justify-center'>
      <CyDImage
        source={{ uri: imageUri }}
        className='h-[82px] w-[82px]'
        resizeMode='contain'
      />
    </CyDView>
  </CyDView>
);

// ── Main screen ─────────────────────────────────────────────────

type ScreenPhase = 'loading' | 'onboarding' | 'in_progress' | 'verifying' | 'rejected' | 'approved' | 'dashboard' | 'send_money' | 'fx_preview';

export default function BlindPayOnboardingScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  const { getStatus, getProfile, initiateTerms } = useBlindPayApi();
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;
  const getProfileRef = useRef(getProfile);
  getProfileRef.current = getProfile;

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectedReason, setRejectedReason] = useState<string | undefined>();

  const resolvePhase = useCallback(
    (data?: BlindpayUserConfig): ScreenPhase => {
      if (!data) return 'onboarding';
      const hasReceiver = Boolean(data.receiverId ?? data.id);
      if (!hasReceiver) return 'onboarding';
      const status = (
        data.receiverStatus ?? data.kycStatus ?? ''
      ).toLowerCase();
      if (status === 'approved') return 'approved';
      if (status === 'rejected') return 'rejected';
      if (status === 'verifying') return 'verifying';
      return 'in_progress';
    },
    [],
  );

  /** Extract warnings from both camelCase and snake_case response shapes. */
  const extractWarnings = useCallback(
    (data?: BlindpayUserConfig): string | undefined => {
      const kyc = data?.kycWarnings ?? [];
      const fraud = data?.fraudWarnings ?? [];
      const combined = [...kyc, ...fraud].join('\n');
      return combined || undefined;
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setScreenPhase('loading');

      getStatusRef
        .current()
        .then(result => {
          if (cancelled) return;
          if (result.isError) {
            // Error or 404 — treat as new user, show FX playground
            setScreenPhase('fx_preview');
            return;
          }
          const bp = result.data?.blindpay;
          const phase = resolvePhase(bp);
          if (phase === 'rejected') {
            setRejectedReason(extractWarnings(bp));
          }

          // No receiver and no TOS → show FX preview inline
          if (phase === 'onboarding') {
            const hasAcceptedTos = Boolean(bp?.tosId) || Boolean(bp?.tosAcceptedAt);
            if (!hasAcceptedTos) {
              setScreenPhase('fx_preview');
              return;
            }
          }

          // KYC approved → show send money inline
          if (phase === 'approved') {
            setScreenPhase('send_money');
            return;
          }

          setScreenPhase(phase);
        })
        .catch(() => {
          if (!cancelled) {
            showToast(
              t('UNEXPECTED_ERROR', 'Something went wrong'),
              'error',
            );
            setScreenPhase('onboarding');
          }
        });

      return () => {
        cancelled = true;
      };
    }, [resolvePhase]),
  );

  // Poll status every 30s while on the in_progress screen and focused
  const isFocused = useIsFocused();
  useEffect(() => {
    if (screenPhase !== 'in_progress' || !isFocused) return;

    const poll = async () => {
      try {
        const result = await getProfileRef.current();
        if (result.isError) return;
        const bp = result.data?.blindpay;
        const phase = resolvePhase(bp);
        if (phase === 'rejected') {
          setRejectedReason(extractWarnings(bp));
        }
        if (phase !== 'in_progress') {
          setScreenPhase(phase === 'approved' ? 'dashboard' : phase);
        }
      } catch {
        // silent — will retry on next interval
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, 30_000);

    return () => clearInterval(interval);
  }, [screenPhase, isFocused, resolvePhase]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getProfile();
      if (!result.isError) {
        const bp = result.data?.blindpay;
        const phase = resolvePhase(bp);
        if (phase === 'rejected') {
          setRejectedReason(extractWarnings(bp));
        }
        setScreenPhase(phase === 'approved' ? 'dashboard' : phase);
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [getProfile, resolvePhase, extractWarnings]);

  const handleGoHome = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNext = async () => {
    if (submitting || screenPhase !== 'onboarding') return;
    setSubmitting(true);
    try {
      const statusResult = await getStatus();
      if (statusResult.isError) {
        showToast(
          statusResult.errorMessage ??
            t('UNEXPECTED_ERROR', 'Something went wrong'),
          'error',
        );
        return;
      }
      const blindpay = statusResult.data?.blindpay;
      if (blindpay?.receiverId || blindpay?.id) {
        const phase = resolvePhase(blindpay);
        if (phase === 'approved') {
          setScreenPhase('dashboard');
          return;
        }
        if (phase === 'rejected') {
          setRejectedReason(extractWarnings(blindpay));
        }
        setScreenPhase(phase);
        return;
      }

      const hasAcceptedTos =
        Boolean(blindpay?.tosId) || Boolean(blindpay?.tosAcceptedAt);
      if (hasAcceptedTos) {
        queueMicrotask(() => {
          navigateToBlindPayKycStack(navigation);
        });
        return;
      }

      // No TOS accepted yet — show FX preview inline
      setScreenPhase('fx_preview');
      return;

    } catch (e) {
      showToast(parseErrorMessage(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Render inline screens (no navigation transition)
  if (screenPhase === 'send_money') {
    return <BlindPaySendMoneyScreen />;
  }
  if (screenPhase === 'fx_preview') {
    return <BlindPayFxPreviewScreen />;
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center px-[16px] py-[8px] h-[56px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      {screenPhase === 'loading' ? (
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FBC02D' />
        </CyDView>
      ) : screenPhase === 'in_progress' ? (
        <KycInProgressScreen
          onRefresh={handleRefresh}
          onGoHome={handleGoHome}
          refreshing={refreshing}
        />
      ) : screenPhase === 'verifying' ? (
        <KycVerifyingScreen
          onRefresh={handleRefresh}
          onGoHome={handleGoHome}
          refreshing={refreshing}
        />
      ) : screenPhase === 'rejected' ? (
        <KycRejectedScreen onGoHome={handleGoHome} reason={rejectedReason} />
      ) : screenPhase === 'approved' ? (
        <KycApprovedScreen
          onContinue={() => {
            setScreenPhase('dashboard');
          }}
        />
      ) : screenPhase === 'dashboard' ? (
        <DashboardScreen navigation={navigation} />
      ) : (
        <CyDView className='flex-1'>
          <CyDScrollView
            className='flex-1'
            contentContainerClassName='pb-[24px]'>
            <CyDText className='text-[28px] font-normal text-base400 px-[16px] pt-[24px] pb-[32px] tracking-[-1px] leading-[1.4]'>
              {String(
                t(
                  'BLINDPAY_ONBOARDING_HEADLINE',
                  'Start sending money in under 5 minutes!',
                ),
              )}
            </CyDText>

            <StepRow
              step='1'
              title={t(
                'BLINDPAY_STEP_1_TITLE',
                'Verify your Basic Details',
              )}
              subtitle={t(
                'BLINDPAY_STEP_1_SUBTITLE',
                'Share a few basic details to help us get to know you.',
              )}
              imageUri={BLINDPAY_FIGMA_ASSETS.step1Doc}
            />
            <CyDView className='h-px bg-n40 w-full' />
            <StepRow
              step='2'
              title={t('BLINDPAY_STEP_2_TITLE', 'Verify Your Identity')}
              subtitle={t(
                'BLINDPAY_STEP_2_SUBTITLE',
                'Upload a valid ID to complete your KYC verification.',
              )}
              imageUri={BLINDPAY_FIGMA_ASSETS.step2Id}
            />
            <CyDView className='h-px bg-n40 w-full' />
            <StepRow
              step='3'
              title={t('BLINDPAY_STEP_3_TITLE', 'Start Sending money')}
              subtitle={t(
                'BLINDPAY_STEP_3_SUBTITLE',
                'Receive your card and activate it in just a few taps!',
              )}
              imageUri={BLINDPAY_FIGMA_ASSETS.step3Cash}
            />
          </CyDScrollView>

          <CyDView className='px-[16px] py-[16px] border-t border-n40'>
            <CyDView className='flex-row justify-end'>
              <CyDTouchView
                onPress={() => {
                  handleNext().catch(() => undefined);
                }}
                disabled={submitting}
                className='bg-[#FBC02D] rounded-full min-h-[52px] min-w-[120px] px-[32px] flex-row items-center justify-center'>
                <CyDView className='relative min-w-[72px] items-center justify-center py-[2px]'>
                  <CyDText
                    className={`text-[20px] font-semibold text-black tracking-[-1px] leading-[1.3] ${
                      submitting ? 'opacity-0' : ''
                    }`}>
                    {String(t('NEXT', 'Next'))}
                  </CyDText>
                  {submitting ? (
                    <CyDView className='absolute inset-0 items-center justify-center'>
                      <ActivityIndicator color='#0D0D0D' />
                    </CyDView>
                  ) : null}
                </CyDView>
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>
      )}
    </CyDSafeAreaView>
  );
}
