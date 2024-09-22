import * as RNLocalize from 'react-native-localize';

export const getCountry = (): string => {
  return RNLocalize.getCountry();
};

export const getCountryNameFromISO2 = (countryCode: string) => {
  const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
  try {
    return countryNames.of(countryCode) ?? countryCode;
  } catch (error) {
    return countryCode;
  }
};

export const getDateFormatBasedOnLocaleForTimestamp = (
  timestamp: number,
): string => {
  const country = getCountry();
  const date = new Date(timestamp);
  return date.toLocaleString(`en-${country}`, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};
