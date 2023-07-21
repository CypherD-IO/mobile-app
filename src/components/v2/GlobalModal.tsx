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

interface GlobalModalContextInterface {
  showModal: (modalType: String, params: any) => void
  hideModal: () => void
  store: any
}

const initalState: GlobalModalContextInterface = {
  showModal: () => {},
  hideModal: () => {},
  store: {}
};

const GlobalModalContext = createContext(initalState);
export const useGlobalModalContext = () => useContext(GlobalModalContext);

export const GlobalModal: React.FC<any> = ({ children }) => {
  const [store, setStore] = useState<any>();
  const showModal = (modalType: String, props: any = {}) => {
    setStore({ ...props, modalType, isModalVisible: true });
    Keyboard.dismiss();
  };

  const hideModal = () => {
    setStore({ ...store, isModalVisible: false });
  };

  return (
    <GlobalModalContext.Provider value={{ store, showModal, hideModal }}>
      {store?.modalType === GlobalModalType.STATE && <StateModal {...store}/>}
      {store?.modalType === GlobalModalType.PROMPT_IMPORT_WALLET && <PromptImportWallet {...store}/>}
      {store?.modalType === GlobalModalType.WALLET_CONNECT_V2_PAIRING && <PairingModal {...store}/>}
      {store?.modalType === GlobalModalType.WALLET_CONNECT_V2_SIGNING && <SigningModal payloadFrom={SigningModalPayloadFrom.WALLETCONNECT} {...store}/>}
      {store?.modalType === GlobalModalType.WALLET_CONNECT_V2_COSMOS_SIGNING && <CosmosSigningModal {...store}/>}
      {store?.modalType === GlobalModalType.CUSTOM_LAYOUT && <CustomModalLayout {...store}/>}
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
      setModalVisible={ () => { store.onSuccess(); }}
    >
      <CyDView className={'bg-white rounded-t-[25px] pb-[15px]'}>
        {store.customComponent}
      </CyDView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
