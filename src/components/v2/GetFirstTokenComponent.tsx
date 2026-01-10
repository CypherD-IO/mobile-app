import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, ViewStyle } from 'react-native';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from './button';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

interface GetFirstTokenProps {
  onGetTokenPress: () => void;
}

/**
 * GetFirstTokenComponent - A promotional component with gradient styling
 * to encourage users to get their first token by funding their wallet
 */
const GetFirstTokenComponent = ({ onGetTokenPress }: GetFirstTokenProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode: boolean =
    theme === Theme.DARK || (theme === Theme.SYSTEM && colorScheme === 'dark');

  // Handle button press using callback prop
  const handleGetTokenPress = (): void => {
    onGetTokenPress();
  };

  /**
   * Theme-aware inner card styling.
   *
   * RN 0.83 + Fabric:
   * Gradient borders + masked gradients can be brittle. To keep this UI stable, we use a
   * simple `border-n40` and a solid `text-n40` icon color instead of gradients.
   *
   * Composition is kept the same as the old card:
   * - Rounded corners ~16
   * - Padding p-4
   * - 24x24 icon
   */
  const cardBgClassName: string = isDarkMode ? 'bg-black' : 'bg-n0';
  const titleTextClassName: string = isDarkMode ? 'text-white' : 'text-base400';
  const bodyTextClassName: string = isDarkMode ? 'text-white' : 'text-base300';

  return (
    <CyDView style={styles.root}>
      {/* Basic stable card (no gradients) */}
      <CyDView
        className={`${cardBgClassName} rounded-[16px] border border-n40 p-4`}>
        {/* Header Section: icon + title on the same row */}
        <CyDView style={styles.headerRow}>
          <CyDMaterialDesignIcons
            name='plus-circle-multiple-outline'
            size={24}
            className='text-n40'
          />
          <CyDText
            numberOfLines={1}
            className={`text-[18px] font-bold ml-[12px] ${titleTextClassName}`}
            style={styles.headerTitle}>
            {t('GET_YOUR_FIRST_TOKEN') ?? 'Get your first token'}
          </CyDText>
        </CyDView>

        {/* Description Text */}
        <CyDText
          className={`text-[14px] mb-[16px] leading-[20px] ${bodyTextClassName}`}>
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
    </CyDView>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignSelf: 'stretch',
  } as ViewStyle,
  iconSize: {
    width: 24,
    height: 24,
    flexShrink: 0,
  } as ViewStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  } as ViewStyle,
  headerTitle: {
    flexShrink: 1,
  } as ViewStyle,
});

export default GetFirstTokenComponent;
