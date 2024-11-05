import React, { createContext, useContext, useState } from 'react';
import ThreeDSecureApprovalModal from './threeDSecureApprovalModal';

interface ThreeDSecureContextType {
  show3DSecureModal: (data: any) => void;
  hide3DSecureModal: () => void;
  isVisible: boolean;
  modalData: any;
}

const ThreeDSecureContext = createContext<ThreeDSecureContextType>({
  show3DSecureModal: () => {},
  hide3DSecureModal: () => {},
  isVisible: false,
  modalData: null,
});

export const ThreeDSecureProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const show3DSecureModal = (data: any) => {
    setModalData(data);
    setIsVisible(true);
  };

  const hide3DSecureModal = () => {
    setIsVisible(false);
    setModalData(null);
  };

  return (
    <ThreeDSecureContext.Provider
      value={{ show3DSecureModal, hide3DSecureModal, isVisible, modalData }}>
      {children}
      {isVisible && (
        <ThreeDSecureApprovalModal
          isModalVisible={isVisible}
          data={modalData.data}
          closeModal={hide3DSecureModal}
        />
      )}
    </ThreeDSecureContext.Provider>
  );
};

export const use3DSecure = () => useContext(ThreeDSecureContext);
