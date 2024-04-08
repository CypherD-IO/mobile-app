import Share from 'react-native-share';
import { recommendImageBase64 } from '../../../assets/images/recommendImage';

export const onShare = async (title: string, message: string, url: string) => {
  const shareOptions = {
    title,
    message,
    subject: title,
    url: url !== '' ? url : recommendImageBase64,
  };

  await Share.open(shareOptions)
    .then(res => {
      return res;
    })
    .catch(err => {
      return err;
    });
};
