import { Platform, TextStyle } from 'react-native';

export type AppFontFamily = 'manrope' | 'gambetta';
export type AppFontWeight = '200' | '300' | '400' | '500' | '600' | '700' | '800';

type FontMap = Record<AppFontWeight, string>;

const FONT_FAMILIES: Record<AppFontFamily, { ios: FontMap; android: FontMap }> = {
  manrope: {
    ios: {
      '200': 'Manrope-ExtraLight',
      '300': 'Manrope-Light',
      '400': 'Manrope-Regular',
      '500': 'Manrope-Medium',
      '600': 'Manrope-SemiBold',
      '700': 'Manrope-Bold',
      '800': 'Manrope-ExtraBold',
    },
    android: {
      '200': 'manrope_extralight',
      '300': 'manrope_light',
      '400': 'manrope_regular',
      '500': 'manrope_medium',
      '600': 'manrope_semibold',
      '700': 'manrope_bold',
      '800': 'manrope_extrabold',
    },
  },
  gambetta: {
    ios: {
      '200': 'Gambetta-Light',
      '300': 'Gambetta-Light',
      '400': 'Gambetta-Regular',
      '500': 'Gambetta-Medium',
      '600': 'Gambetta-Semibold',
      '700': 'Gambetta-Bold',
      '800': 'Gambetta-Bold',
    },
    android: {
      '200': 'gambetta_light',
      '300': 'gambetta_light',
      '400': 'gambetta_regular',
      '500': 'gambetta_medium',
      '600': 'gambetta_semibold',
      '700': 'gambetta_bold',
      '800': 'gambetta_bold',
    },
  },
};

const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';

const fontFamily = (
  family: AppFontFamily = 'manrope',
  weight: AppFontWeight = '400',
): string => {
  return FONT_FAMILIES[family][platformKey][weight];
};

const text = (
  family: AppFontFamily = 'manrope',
  weight: AppFontWeight = '400',
): Pick<TextStyle, 'fontFamily'> => {
  return { fontFamily: fontFamily(family, weight) };
};

export const typography = {
  fontFamily,
  text,
  manrope: (weight: AppFontWeight = '400') => text('manrope', weight),
  gambetta: (weight: AppFontWeight = '400') => text('gambetta', weight),
  icon: Platform.select({ ios: 'CydFont', android: 'cydfont' }) ?? 'CydFont',
} as const;
