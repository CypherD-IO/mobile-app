import { t } from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import { BarCodeReadEvent } from 'react-native-camera';
import AppImages from '../../../../assets/images/appImages';
import GradientText from '../../../components/gradientText';
import { screenTitle } from '../../../constants';
import { ConnectionTypes, CypherPlanId } from '../../../constants/enum';
import { QRScannerScreens } from '../../../constants/server';
import { showToast } from '../../../containers/utilities/toastUtility';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import {
  copyToClipboard,
  getMaskedAddress,
  HdWalletContext,
} from '../../../core/util';
import useConnectionManager from '../../../hooks/useConnectionManager';
import useEns from '../../../hooks/useEns';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import {
  CyDIcons,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';

interface HeaderBarProps {
  navigation: any;
  onWCSuccess: (e: BarCodeReadEvent) => void;
}

/**
 * Returns a time-based greeting based on the current hour
 * Morning: 5am - 12pm
 * Afternoon: 12pm - 5pm
 * Evening: 5pm - 5am
 */
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return t('GOOD_MORNING', 'Good Morning!');
  } else if (hour >= 12 && hour < 17) {
    return t('GOOD_AFTERNOON', 'Good Afternoon!');
  } else {
    return t('GOOD_EVENING', 'Good Evening!');
  }
};

export const HeaderBar = ({ navigation, onWCSuccess }: HeaderBarProps) => {
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { wallet } = hdWalletContext.state;
  const { ethereum, solana } = wallet;
  const address = ethereum?.address ?? solana?.address;
  const ethAddress = ethereum?.address;

  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalState.cardProfile;
  const planInfo = cardProfile?.planInfo;
  const isPremiumUser = planInfo?.planId === CypherPlanId.PRO_PLAN;

  const { connectionType } = useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);

  // ENS resolution state
  const [ensName, setEnsName] = useState<string | null>(null);
  const ensHook = useEns();
  const resolveDomain = ensHook[1] as (
    address: `0x${string}`,
  ) => Promise<string | null>;

  useEffect(() => {
    setConnectionTypeValue(connectionType);
  }, [connectionType]);

  /**
   * Resolves ENS name for the ethereum address
   * Only attempts resolution if we have a valid ethereum address
   */
  useEffect(() => {
    const resolveEnsName = async (): Promise<void> => {
      if (ethAddress) {
        try {
          const resolvedName = await resolveDomain(ethAddress as `0x${string}`);
          setEnsName(resolvedName);
        } catch {
          // ENS resolution failed, fallback to time-based greeting
          setEnsName(null);
        }
      }
    };

    void resolveEnsName();
  }, [ethAddress, resolveDomain]);

  /**
   * Handles copying the wallet address to clipboard
   * Shows a success toast notification after copying
   */
  const handleCopyAddress = (): void => {
    try {
      if (address) {
        copyToClipboard(address);
        showToast(
          t('ADDRESS_COPIED', 'Address copied to clipboard'),
          'success',
        );
      }
    } catch {
      showToast(t('FAILED_TO_COPY', 'Failed to copy address'), 'error');
    }
  };

  /**
   * Returns the greeting text - ENS name if available, otherwise time-based greeting
   */
  const getGreeting = (): string => {
    if (ensName) {
      return ensName;
    }
    return getTimeBasedGreeting();
  };

  const onSuccess = onWCSuccess;
  return (
    <CyDView
      className={
        'z-20 flex flex-row mx-[20px] justify-between items-center pb-[12px]'
      }>
      <CyDView className='flex flex-row items-center gap-[10px]'>
        <CyDImage
          source={AppImages.PROFILE_AVATAR}
          className='w-[32px] h-[32px]'
        />
        <CyDTouchView onPress={handleCopyAddress} activeOpacity={0.7}>
          <CyDView>
            <CyDText className='font-semibold text-[16px] text-base400'>
              {getGreeting()}
            </CyDText>
            <CyDView className='flex flex-row items-center'>
              <CyDText className='font-medium text-[12px] text-n100'>
                {getMaskedAddress(address ?? '', 4)}
              </CyDText>
              <CyDIcons name='copy' size={16} className='text-base400' />
            </CyDView>
          </CyDView>
        </CyDTouchView>
      </CyDView>

      <CyDView className='flex flex-row items-center gap-[10px]'>
        {isPremiumUser && (
          <CyDView
            className={
              'px-[12px] py-[6px] rounded-full bg-base250 flex flex-row items-center justify-center'
            }>
            <GradientText
              textElement={
                <CyDText className='font-extrabold text-[14px] text-center'>
                  {'Premium'}
                </CyDText>
              }
              gradientColors={['#FA9703', '#F89408', '#F6510A']}
              locations={[0, 0.3, 0.6]}
            />
          </CyDView>
        )}

        {connectionTypeValue !== ConnectionTypes.WALLET_CONNECT && (
          <CyDTouchView
            className={''}
            onPress={() => {
              navigation.navigate(screenTitle.QR_CODE_SCANNER, {
                navigation,
                fromPage: QRScannerScreens.WALLET_CONNECT,
                onSuccess,
              });
            }}>
            <CyDIcons name='qr-scanner' size={32} className='text-base400' />
          </CyDTouchView>
        )}
      </CyDView>
    </CyDView>
  );
};
