import { HDWallet } from '../../reducers/hdwallet_reducer';
import analytics from '@react-native-firebase/analytics';
import Intercom from '@intercom/intercom-react-native';

export const sendFirebaseEvent = (hdWalletContext: { state: HDWallet }, trk_event: string) => {
  const ethereum = hdWalletContext.state.wallet.ethereum;
  analytics().logEvent(trk_event, {
    walletaddress: ethereum.address
  });
};

export const intercomAnalyticsLog = async (name: string, params?: { [key: string]: any }) => {
  await analytics().logEvent(name, params);
  await Intercom.logEvent(name, params);
};
