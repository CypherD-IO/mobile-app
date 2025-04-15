import React, { createContext, useContext, useState } from 'react';
import ThreeDSecureApprovalModal from './threeDSecureApprovalModal';
import TransactionDeclineHandlingModal from './transactionDeclineHandlingModal';
import CyDConfirmationModal from './cyDConfirmationModal';
import CyDSuccessModal from './cyDSuccessModal';
import { useTranslation } from 'react-i18next';

export interface ThreeDSecureData {
  data: {
    amount: number;
    currency: string;
    merchantName: string;
    cardLast4: string;
  };
}

export interface DeclineHandlingData {
  transactionAmount: number;
  currency: string;
  merchantName: string;
  last4: string;
  cardType: string;
  transactionId: string;
  date: Date;
  approveUrl: string;
  reportUrl: string;
}

interface TransactionModalContextType {
  show3DSecureModal: (data: ThreeDSecureData) => void;
  hide3DSecureModal: () => void;
  showDeclineHandlingModal: (data: DeclineHandlingData) => void;
  hideDeclineHandlingModal: () => void;
  is3DSecureVisible: boolean;
  isDeclineHandlingVisible: boolean;
  isConfirmationVisible: boolean;
  isSuccessVisible: boolean;
  threeDSecureData: ThreeDSecureData | null;
  declineHandlingData: DeclineHandlingData | null;
}

const TransactionModalContext = createContext<TransactionModalContextType>({
  show3DSecureModal: () => {},
  hide3DSecureModal: () => {},
  showDeclineHandlingModal: () => {},
  hideDeclineHandlingModal: () => {},
  is3DSecureVisible: false,
  isDeclineHandlingVisible: false,
  isConfirmationVisible: false,
  isSuccessVisible: false,
  threeDSecureData: null,
  declineHandlingData: null,
});

export const TransactionModalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { t } = useTranslation();
  const [is3DSecureVisible, setIs3DSecureVisible] = useState(false);
  const [isDeclineHandlingVisible, setIsDeclineHandlingVisible] =
    useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [threeDSecureData, setThreeDSecureData] =
    useState<ThreeDSecureData | null>(null);
  const [declineHandlingData, setDeclineHandlingData] =
    useState<DeclineHandlingData | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const show3DSecureModal = (data: ThreeDSecureData) => {
    setThreeDSecureData(data);
    setIs3DSecureVisible(true);
  };

  const hide3DSecureModal = () => {
    setIs3DSecureVisible(false);
    setThreeDSecureData(null);
  };

  const showDeclineHandlingModal = (data: DeclineHandlingData) => {
    setDeclineHandlingData(data);
    setIsDeclineHandlingVisible(true);
  };

  const hideDeclineHandlingModal = () => {
    setIsDeclineHandlingVisible(false);
    setDeclineHandlingData(null);
  };

  const handleThisIsntMe = () => {
    hideDeclineHandlingModal();
    setIsConfirmationVisible(true);
  };

  const handleConfirmReport = () => {
    setIsConfirmationVisible(false);
    setSuccessMessage(
      t(
        "Verified! Please retry the transaction. We've verified your purchase and updated your card's settings. Please try the transaction again now.",
      ),
    );
    setIsSuccessVisible(true);
  };

  const handleThisWasMe = () => {
    hideDeclineHandlingModal();
    setSuccessMessage(
      t(
        "Verified! Please retry the transaction. We've verified your purchase and updated your card's settings. Please try the transaction again now.",
      ),
    );
    setIsSuccessVisible(true);
  };

  return (
    <TransactionModalContext.Provider
      value={{
        show3DSecureModal,
        hide3DSecureModal,
        showDeclineHandlingModal,
        hideDeclineHandlingModal,
        is3DSecureVisible,
        isDeclineHandlingVisible,
        isConfirmationVisible,
        isSuccessVisible,
        threeDSecureData,
        declineHandlingData,
      }}>
      {children}
      {is3DSecureVisible && threeDSecureData && (
        <ThreeDSecureApprovalModal
          isModalVisible={is3DSecureVisible}
          data={threeDSecureData.data}
          closeModal={hide3DSecureModal}
        />
      )}
      {isDeclineHandlingVisible && declineHandlingData && (
        <TransactionDeclineHandlingModal
          isModalVisible={isDeclineHandlingVisible}
          data={declineHandlingData}
          onThisIsntMe={handleThisIsntMe}
          onThisWasMe={handleThisWasMe}
          closeModal={hideDeclineHandlingModal}
        />
      )}
      {isConfirmationVisible && declineHandlingData && (
        <CyDConfirmationModal
          isModalVisible={isConfirmationVisible}
          setModalVisible={setIsConfirmationVisible}
          title={t('Report Transaction')}
          description={t('CARD_WILL_BE_FROZEN_WARNING', {
            cardType: declineHandlingData.cardType,
            last4: declineHandlingData.last4,
          })}
          confirmText={t('Yes, Report Transaction')}
          cancelText={t('No, Cancel')}
          onConfirm={handleConfirmReport}
        />
      )}
      {isSuccessVisible && (
        <CyDSuccessModal
          isModalVisible={isSuccessVisible}
          setModalVisible={setIsSuccessVisible}
          title={t('Success')}
          description={successMessage}
        />
      )}
    </TransactionModalContext.Provider>
  );
};

export const useTransactionModals = () => useContext(TransactionModalContext);
