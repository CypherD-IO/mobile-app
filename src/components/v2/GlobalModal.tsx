import React, { useState, createContext, useContext } from 'react';
import { Keyboard } from 'react-native';
import StateModal from './StateModal';

interface GlobalModalContext {
  showModal: (modalType: String, params: any) => void
  hideModal: () => void
  store: any
}

const initalState: GlobalModalContext = {
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
      <StateModal {...store}/>
      {children}
    </GlobalModalContext.Provider>
  );
};
