import { HDWallet } from '../../reducers/hdwallet_reducer';
import analytics from '@react-native-firebase/analytics';
import Intercom from '@intercom/intercom-react-native';

export const sendFirebaseEvent = (
  hdWalletContext: { state: HDWallet },
  trkEvent: string,
) => {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  void analytics().logEvent(trkEvent, {
    walletaddress: ethereum.address,
  });
};

export const intercomAnalyticsLog = async (
  name: string,
  params?: { [key: string]: any },
) => {
  void analytics().logEvent(name, params);
  void Intercom.logEvent(name, params);
};
