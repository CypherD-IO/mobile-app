import { getContactBookData } from '../../core/asyncStorage';
import * as Sentry from '@sentry/react-native';
export interface Contact {
  name: string;
  imageProfile: string;
  addresses: Record<string, string[]>;
}

export const getContactBookWithMultipleAddress = async () => {
  try {
    const tempContactBook = await getContactBookData();

    if (tempContactBook) {
      const parsedContactBook = JSON.parse(tempContactBook);
      if (
        Object.keys(parsedContactBook).length &&
        typeof Object.values(
          Object.values<Contact>(parsedContactBook)[0].addresses,
        )[0] === 'string'
      ) {
        const newFormatContactBook: Record<string, Contact> = {};

        for (const contact in parsedContactBook) {
          newFormatContactBook[contact] = {
            name: parsedContactBook[contact].name,
            imageProfile: parsedContactBook[contact].imageProfile,
            addresses: {},
          };
          for (const chainName in parsedContactBook[contact].addresses) {
            newFormatContactBook[contact].addresses[chainName] = [
              parsedContactBook[contact].addresses[chainName],
            ];
          }
        }
        return newFormatContactBook;
      }
      return parsedContactBook;
    }
  } catch (e) {
    Sentry.captureException(e);
  }
};
