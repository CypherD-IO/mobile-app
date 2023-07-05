import { HDWallet } from '../../reducers/hdwallet_reducer';
import analytics from '@react-native-firebase/analytics';
import Intercom from '@intercom/intercom-react-native';
import appsFlyer from 'react-native-appsflyer';

export const sendFirebaseEvent = (hdWalletContext: { state: HDWallet }, trk_event: string) => {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  void analytics().logEvent(trk_event, {
    walletaddress: ethereum.address
  });
  void appsFlyer.logEvent(trk_event, {
    walletaddress: ethereum.address
  });
};

export const intercomAnalyticsLog = async (name: string, params?: { [key: string]: any }) => {
  void appsFlyer.logEvent(name, params ?? {});
  void analytics().logEvent(name, params);
  void Intercom.logEvent(name, params);
};
