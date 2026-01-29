import React, { useState } from 'react';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { t } from 'i18next';
import Button from '../v2/button';
import clsx from 'clsx';
import CyDModalLayout from '../v2/modal';
import { screenTitle } from '../../constants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loaderStyle: {
    width: 19,
    height: 19,
  },
});

interface PremiumUpgradeConsentModalProps {
  /** Whether the modal is visible */
  isVisible: boolean;
  /** Function to set modal visibility */
  setIsVisible: (visible: boolean) => void;
  /** Pro plan cost in USD */
  planCost?: number;
  /** Whether the upgrade is loading */
  loading: boolean;
  /** Whether Rain card is out of stock */
  isRainOutOfStock: boolean;
  /** Whether Reap card is out of stock */
  isReapOutOfStock: boolean;
  /** Callback when user confirms upgrade */
  onConfirmUpgrade: () => void;
  /** Navigation object for legal screen */
  navigation: NavigationProp<ParamListBase>;
  /** Optional callback when modal is closed */
  onClose?: () => void;
}

/**
 * Premium Upgrade Consent Modal Component
 * Shows the consent checkbox and terms before upgrading to premium.
 */
export default function PremiumUpgradeConsentModal({
  isVisible,
  setIsVisible,
  planCost,
  loading,
  isRainOutOfStock,
  isReapOutOfStock,
  onConfirmUpgrade,
  navigation,
  onClose,
}: PremiumUpgradeConsentModalProps) {
  const [consent, setConsent] = useState(false);

  const handleClose = () => {
    setIsVisible(false);
    setConsent(false);
    onClose?.();
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setConsent(false);
    onConfirmUpgrade();
  };

  return (
    <CyDModalLayout
      setModalVisible={setIsVisible}
      isModalVisible={isVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className={'bg-n30 rounded-t-[20px] p-[16px]'}>
        <CyDView className='flex-row justify-between items-center'>
          <CyDView className='flex-row gap-x-[4px] items-center'>
            <CyDText className='text-[20px] font-bold'>{'Upgrading to'}</CyDText>
            <CyDFastImage
              source={AppImages.PREMIUM_LABEL}
              className='h-[30px] w-[100px]'
              resizeMode='contain'
            />
          </CyDView>
          <CyDTouchView onPress={handleClose}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDTouchView
          className='flex flex-row items-center mt-[16px]'
          onPress={() => {
            setConsent(!consent);
          }}>
          <CyDView
            className={clsx(
              'h-[20px] w-[20px] border-[1px] rounded-[4px] border-n50',
              {
                'bg-n0': consent,
              },
            )}>
            {consent && (
              <CyDMaterialDesignIcons
                name='check-bold'
                size={17}
                className='text-base400 '
              />
            )}
          </CyDView>
          <CyDText className='px-[12px] text-[14px]'>
            {`By proceeding, I acknowledge and authorize a $${planCost} USD deduction from my Cypher account for the premium upgrade and agree to the`}
            <CyDText
              className='font-bold text-[14px] underline'
              onPress={() => {
                handleClose();
                navigation.navigate(screenTitle.LEGAL_SCREEN);
              }}>
              {' terms and conditions.'}
            </CyDText>
          </CyDText>
        </CyDTouchView>

        {(isRainOutOfStock || isReapOutOfStock) && (
          <>
            <CyDText className='px-[12px] text-[14px] my-[8px]'>
              <CyDText className='font-bold underline'>
                {t('IMPORTANT')}:
              </CyDText>{' '}
              {t('METAL_OUT_OF_STOCK_WITH_EXTENTED_PREMIUM')}
            </CyDText>
            <CyDText className='px-[12px] text-[14px] my-[8px]'>
              {t('YOUR_PREMIUM_BENEFITS_WILL_START_IMMEDIATELY')}
            </CyDText>
          </>
        )}

        <Button
          title={t('GET_PREMIUM')}
          onPress={handleConfirm}
          disabled={!consent}
          loading={loading}
          loaderStyle={styles.loaderStyle}
          titleStyle='text-[14px] font-bold'
          style='p-[3%] my-[12px]'
        />
      </CyDView>
    </CyDModalLayout>
  );
}
