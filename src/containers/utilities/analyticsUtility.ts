import { HDWallet } from '../../reducers/hdwallet_reducer';
import Intercom from '@intercom/intercom-react-native';
import { get } from 'lodash';
import { logAnalyticsToFirebase } from '../../core/analytics';

export const sendFirebaseEvent = (
  hdWalletContext: { state: HDWallet },
  trkEvent: string,
) => {
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    '',
  );
  const solanaAddress = get(hdWalletContext, 'state.wallet.solana.address', '');
  void logAnalyticsToFirebase(trkEvent, {
    walletaddress: ethereumAddress ?? solanaAddress,
  });
};

export const intercomAnalyticsLog = async (
  name: string,
  params?: { [key: string]: any },
) => {
  void logAnalyticsToFirebase(name, params);
  void Intercom.logEvent(name, params);
};
