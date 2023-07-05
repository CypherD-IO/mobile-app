import { useNavigation } from '@react-navigation/native';
import { useContext } from 'react';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';
import { GlobalModalType } from '../../constants/enum';
import { MODAL_CLOSING_TIMEOUT } from '../../constants/timeOuts';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

export default function useIsSignable () {
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const navigation = useNavigation();
  const { ethereum } = hdWalletContext.state.wallet;
  const { isReadOnlyWallet } = hdWalletContext.state;
  const { showModal, hideModal } = useGlobalModalContext();
  const isSignableTransaction = (activityType: string, callback: any) => {
    if (isReadOnlyWallet) {
      setTimeout(() => {
        showModal(GlobalModalType.PROMPT_IMPORT_WALLET, {
          type: activityType,
          address: ethereum.address,
          description: '',
          onSuccess: () => {
            hideModal();
            callback();
          },
          onFailure: () => { setTimeout(() => { hideModal(); }, MODAL_CLOSING_TIMEOUT); navigation.navigate(screenTitle.PORTFOLIO_SCREEN); },
          onCancel: () => { hideModal(); }
        });
      }, MODAL_HIDE_TIMEOUT_250);
    } else {
      callback();
    }
  };

  return [isSignableTransaction];
}
