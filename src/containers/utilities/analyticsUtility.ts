import { HDWallet } from '../../reducers/hdwallet_reducer';
import { get } from 'lodash';
import { logAnalyticsToFirebase } from '../../core/analytics';
import { intercomLogEvent } from '../../core/intercom';

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
  // Intercom is best-effort; never allow it to crash the app on startup.
  void intercomLogEvent(name, params);
};
