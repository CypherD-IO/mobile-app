import React, { useState, createContext, useContext } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import StateModal from './StateModal';
import { GlobalModalType, SigningModalPayloadFrom } from '../../constants/enum';
import PromptImportWallet from './promptImportWallet';
import PairingModal from './walletConnectV2Views/PairingModal';
import SigningModal from './walletConnectV2Views/SigningModal';
import CosmosSigningModal from './walletConnectV2Views/CosmosSigningModal';
import CyDModalLayout from './modal';
import { CyDView } from '../../styles/tailwindStyles';
import { CustomModalLayoutDef } from '../../models/globalModal.interface';
import RemoveWalletModal from './removeWalletModal';
import ThreeDSecureApprovalModal from './threeDSecureApprovalModal';
import AddCountryFromNotificationModal from './addCountryFromNotificationModal';

interface GlobalModalContextInterface {
  showModal: (modalType: string, params: any) => void;
  hideModal: () => void;
  store: any;
}
const initalState: GlobalModalContextInterface = {
  showModal: () => {},
  hideModal: () => {},
  store: {},
};
const GlobalModalContext = createContext(initalState);
export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal: React.FC<any> = ({ children }) => {
  const [store, setStore] = useState<any>();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const showModal = (modalType: string, props: any = {}) => {
    if (isTransitioning) return;

    if (store?.isModalVisible) {
      setIsTransitioning(true);
      setStore(prev => ({ ...prev, isModalVisible: false }));

      setTimeout(() => {
        setStore({ ...props, modalType, isModalVisible: true });
        Keyboard.dismiss();
        setIsTransitioning(false);
      }, 1000);
    } else {
      setStore({ ...props, modalType, isModalVisible: true });
      Keyboard.dismiss();
    }
  };

  const hideModal = () => {
    if (isTransitioning) return;
    setStore(prev => ({ ...prev, isModalVisible: false }));
  };

  return (
    <GlobalModalContext.Provider value={{ store, showModal, hideModal }}>
      {store?.modalType === GlobalModalType.STATE && <StateModal {...store} />}
      {store?.modalType === GlobalModalType.PROMPT_IMPORT_WALLET && (
        <PromptImportWallet {...store} />
      )}
      {store?.modalType === GlobalModalType.REMOVE_WALLET && (
        <RemoveWalletModal {...store} />
      )}
      {store?.modalType === GlobalModalType.WALLET_CONNECT_V2_PAIRING && (
        <PairingModal {...store} />
      )}
      {store?.modalType === GlobalModalType.WALLET_CONNECT_V2_SIGNING && (
        <SigningModal
          payloadFrom={SigningModalPayloadFrom.WALLETCONNECT}
          {...store}
        />
      )}
      {store?.modalType ===
        GlobalModalType.WALLET_CONNECT_V2_COSMOS_SIGNING && (
        <CosmosSigningModal {...store} />
      )}
      {store?.modalType === GlobalModalType.CUSTOM_LAYOUT && (
        <CustomModalLayout {...store} />
      )}
      {store?.modalType === GlobalModalType.THREE_D_SECURE_APPROVAL && (
        <ThreeDSecureApprovalModal {...store} />
      )}
      {store?.modalType === GlobalModalType.CARD_ACTIONS_FROM_NOTIFICATION && (
        <AddCountryFromNotificationModal {...store} />
      )}
      {children}
    </GlobalModalContext.Provider>
  );
};
const CustomModalLayout = (store: CustomModalLayoutDef) => {
  return (
    <CyDModalLayout
      isModalVisible={store.isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={() => {
        store.onSuccess();
      }}>
      <CyDView className={'bg-white rounded-t-[24px] min-h-[30%] pb-[15px]'}>
        {store.customComponent}
      </CyDView>
    </CyDModalLayout>
  );
};
const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
});
