import Web3Auth, { AuthUserInfo } from '@web3auth/react-native-sdk';
import { ConnectionTypes } from '../constants/enum';

export interface ISocialAuth {
  // evmProvider: EthereumPrivateKeyProvider;
  // solanaProvider: SolanaPrivateKeyProvider;
  connectionType: ConnectionTypes;
  userInfo: AuthUserInfo;
  web3Auth: Web3Auth;
}
