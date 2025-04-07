import { HDWallet } from '../../reducers/hdwallet_reducer';
import analytics from '@react-native-firebase/analytics';
import Intercom from '@intercom/intercom-react-native';
import { get } from 'lodash';

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
  void analytics().logEvent(trkEvent, {
    walletaddress: ethereumAddress ?? solanaAddress,
  });
};

export const intercomAnalyticsLog = async (
  name: string,
  params?: { [key: string]: any },
) => {
  void analytics().logEvent(name, params);
  void Intercom.logEvent(name, params);
};
