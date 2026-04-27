import { pick } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import { showToast } from '../../../containers/utilities/toastUtility';
import type { BlindPayUploadFilePart } from '../api';

const MAX_BYTES = 15 * 1024 * 1024;

export async function pickBlindPaySingleFile(): Promise<
  (BlindPayUploadFilePart & { size?: number }) | null
> {
  let results;
  try {
    results = await pick({
      allowMultiSelection: false,
      type: Platform.select({
        ios: [
          'public.image',
          'public.jpeg',
          'public.png',
          'public.pdf',
          'com.adobe.pdf',
        ],
        android: ['image/*', 'application/pdf'],
        default: ['image/*', 'application/pdf'],
      }),
    });
  } catch {
    // User cancelled the picker or picker error
    return null;
  }
  const file = results[0];
  if (!file?.uri || !file.name) {
    return null;
  }
  if (typeof file.size === 'number' && file.size > MAX_BYTES) {
    showToast('File must be smaller than 15 MB', 'error');
    return null;
  }
  const inferredType = file.name.endsWith('.pdf')
    ? 'application/pdf'
    : file.name.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';
  const fileType =
    file.type && file.type.includes('/') ? file.type : inferredType;
  return {
    uri: file.uri,
    name: file.name,
    type: fileType,
    size: file.size ?? undefined,
  };
}
