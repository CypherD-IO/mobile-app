import * as RNLocalize from 'react-native-localize';

export const getCountry = (): string => {
  return RNLocalize.getCountry();
};

export const getDateFormatBasedOnLocaleForTimestamp = (timestamp: number): string => {
  const country = getCountry();
  const date = new Date(timestamp);
  return date.toLocaleString(`en-${country}`, { dateStyle: 'short', timeStyle: 'short' });
};
