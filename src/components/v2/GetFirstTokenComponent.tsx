import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from './button';

interface GetFirstTokenProps {
  onGetTokenPress: () => void;
}

/**
 * GetFirstTokenComponent - A promotional component with gradient styling
 * to encourage users to get their first token by funding their wallet
 */
const GetFirstTokenComponent = ({ onGetTokenPress }: GetFirstTokenProps) => {
  const { t } = useTranslation();

  // Handle button press using callback prop
  const handleGetTokenPress = () => {
    onGetTokenPress();
  };

  /**
   * Render gradient icon with MaskedView for gradient effect
   */
  const renderGradientIcon = () => {
    return (
      <MaskedView
        maskElement={
          <CyDView className='flex items-center justify-center'>
            <CyDMaterialDesignIcons
              name='plus-circle-multiple-outline'
              size={24}
              className='text-white'
            />
          </CyDView>
        }>
        <LinearGradient
          colors={['#4575F6', '#A228EA', '#FCBA6C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}>
          <CyDView className='opacity-0'>
            <CyDMaterialDesignIcons
              name='plus-circle-multiple-outline'
              size={24}
              className='text-white'
            />
          </CyDView>
        </LinearGradient>
      </MaskedView>
    );
  };

  return (
    <CyDView className=''>
      {/* Gradient Border Container */}
      <LinearGradient
        colors={['#4575F6', '#A228EA', '#FCBA6C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}>
        {/* Inner Content Container with background */}
        <CyDView className='bg-n0 rounded-[16px] p-4'>
          {/* Header Section with Icon and Title */}
          <CyDView className='flex flex-row items-center mb-[6px]'>
            {renderGradientIcon()}
            <CyDText className='text-[18px] font-bold text-base400 ml-[12px]'>
              {t('GET_YOUR_FIRST_TOKEN') ?? 'Get your first token'}
            </CyDText>
          </CyDView>

          {/* Description Text */}
          <CyDText className='text-[14px] text-base300 mb-[16px] leading-[20px]'>
            {t('FUND_WALLET_DESCRIPTION') ??
              'Fund your wallet by buying crypto or transferring from another wallet'}
          </CyDText>

          {/* Get Token Button */}
          <Button
            title={t('GET_TOKEN') ?? 'Get Token'}
            onPress={handleGetTokenPress}
            disabled={false}
            paddingY={12}
            style='!rounded-full'
          />
        </CyDView>
      </LinearGradient>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 16,
    padding: 2, // This creates the border effect
  },
  iconGradient: {
    width: 24,
    height: 24,
  },
});

export default GetFirstTokenComponent;
