import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import { View } from 'react-native';
import { vars, useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

export enum Theme {
  SYSTEM = 'system',
  LIGHT = 'light',
  DARK = 'dark',
}

interface ThemeContextType {
  theme: Theme;
  changeTheme: (newTheme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: Record<
  Exclude<Theme, Theme.SYSTEM>,
  ReturnType<typeof vars>
> = {
  [Theme.LIGHT]: vars({
    '--color-n0': '#ffffff',
    '--color-n10': '#fafbfb',
    '--color-n20': '#F5F6F7',
    '--color-n30': '#EBEDF0',
    '--color-n40': '#dfe2e6',
    '--color-n50': '#C2C7D0',
    '--color-n60': '#b3b9c4',
    '--color-n70': '#a6aebb',
    '--color-n80': '#98a1b0',
    '--color-n90': '#8993A4',
    '--color-n100': '#7a8699',
    '--color-n200': '#6b788e',
    '--color-n300': '#5d6b82',
    '--color-n400': '#505f79',
    '--color-n500': '#42526d',
    '--color-n600': '#354764',
    '--color-n700': '#243757',
    '--color-n800': '#15294B',
    '--color-n900': '#091e42',
    '--color-p0': '#FFF9EA',
    '--color-p10': '#FDF3D8',
    '--color-p20': '#FCECBF',
    '--color-p30': '#FBE19D',
    '--color-p40': '#F9D26C',
    '--color-p50': '#F7C645',
    '--color-p100': '#FFBF15',
    '--color-p150': '#FFB900',
    '--color-p200': '#ECAB00',
    '--color-p300': '#C99200',
    '--color-p400': '#846000',
    '--color-base20': '#F4F4F4',
    '--color-base40': '#ECECEC',
    '--color-base80': '#CACACA',
    '--color-base100': '#999999',
    '--color-base150': '#666666',
    '--color-base200': '#444444',
    '--color-base250': '#CFCFCF',
    '--color-base300': '#222222',
    '--color-base350': '#1E1E1E',
    '--color-base400': '#000000',
    '--color-red20': '#F9DEDE',
    '--color-red40': '#F3BEBE',
    '--color-red80': '#EE9D9D',
    '--color-red100': '#E87D7D',
    '--color-red150': '#E25C5C',
    '--color-red200': '#C03838',
    '--color-red300': '#BE1818',
    '--color-red400': '#A00000',
    '--color-green20': '#F1FDF7',
    '--color-green40': '#ACD5BF',
    '--color-green80': '#B2CEBF',
    '--color-green100': '#8CB59F',
    '--color-green200': '#8CF2CD',
    '--color-green250': '#79cfc1',
    '--color-green300': '#3F845F',
    '--color-green350': '#20804C',
    '--color-green400': '#006A31',
    '--color-blue20': '#F1FDF7',
    '--color-blue40': '#A8CEEA',
    '--color-blue60': '#7DB6DF',
    '--color-blue100': '#519DD5',
    '--color-blue200': '#2685CA',
    '--color-blue300': '#0061A7',
    '--color-orange500': '#FF8C00',
  }),
  [Theme.DARK]: vars({
    '--color-n0': '#0D0D0D',
    '--color-n10': '#111111',
    '--color-n20': '#161616',
    '--color-n30': '#1A1D23',
    '--color-n40': '#24292E',
    '--color-n50': '#C2C7D0',
    '--color-n60': '#1B1B1B',
    '--color-n70': '#A6AEBB',
    '--color-n80': '#98A1B0',
    '--color-n90': '#8993A4',
    '--color-n100': '#7A8699',
    '--color-n200': '#6B788E',
    '--color-n300': '#5D6B82',
    '--color-n400': '#505F79',
    '--color-n500': '#42526D',
    '--color-n600': '#3E5375',
    '--color-n700': '#2B4269',
    '--color-n800': '#B4C8EA',
    '--color-n900': '#BDD2F6',
    '--color-p0': '#171717',
    '--color-p10': '#3F2F03',
    '--color-p20': '#584204',
    '--color-p30': '#7A5905',
    '--color-p40': '#F9D16C',
    '--color-p50': '#F7C645',
    '--color-p100': '#FFC72F',
    '--color-p150': '#FFC21A',
    '--color-p200': '#FFB906',
    '--color-p300': '#E3A600',
    '--color-p400': '#9E7400',
    '--color-base20': '#171717',
    '--color-base40': '#202020',
    '--color-base80': '#CACACA',
    '--color-base100': '#999999',
    '--color-base150': '#666666',
    '--color-base200': '#444444',
    '--color-base250': '#303030',
    '--color-base300': '#E1E1E1',
    '--color-base350': '#1E1E1E',
    '--color-base400': '#FFFFFF',
    '--color-red20': '#370A0A',
    '--color-red40': '#571010',
    '--color-red80': '#EE9D9D',
    '--color-red100': '#E87D7D',
    '--color-red150': '#E67272',
    '--color-red200': '#C94848',
    '--color-red300': '#D41B1B',
    '--color-red400': '#BA0000',
    '--color-green20': '#0E2713',
    '--color-green40': '#ACD5BF',
    '--color-green80': '#B2CEBF',
    '--color-green100': '#8CB59F',
    '--color-green200': '#659D7F',
    '--color-green250': '#79cfc1',
    '--color-green300': '#47956C',
    '--color-green350': '#259459',
    '--color-green400': '#00843E',
    '--color-blue20': '#102C3F',
    '--color-blue40': '#A8CFEA',
    '--color-blue60': '#91C2E4',
    '--color-blue100': '#66A9DA',
    '--color-blue200': '#3193D8',
    '--color-blue300': '#0070C0',
    '--color-orange500': '#FF8C00',
  }),
};

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@app_theme';

const isValidTheme = (theme: unknown): theme is Theme => {
  return (
    theme === Theme.LIGHT || theme === Theme.DARK || theme === Theme.SYSTEM
  );
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { colorScheme } = useColorScheme();
  const [theme, setTheme] = useState<Theme>(Theme.SYSTEM);

  useEffect(() => {
    void loadSavedTheme();
  }, []);

  const loadSavedTheme = async (): Promise<void> => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && isValidTheme(savedTheme)) {
        setTheme(savedTheme);
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const changeTheme = async (newTheme: Theme): Promise<void> => {
    if (!isValidTheme(newTheme)) {
      throw new Error(`Invalid theme: ${String(newTheme)}`);
    }

    try {
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const getThemeToInject = (): Exclude<Theme, Theme.SYSTEM> => {
    if (theme === Theme.SYSTEM) {
      return colorScheme === 'dark' ? Theme.DARK : Theme.LIGHT;
    }
    return theme;
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        changeTheme: (newTheme: Theme) => {
          void changeTheme(newTheme);
        },
      }}>
      <View style={themes[getThemeToInject()]} className='flex-1'>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
