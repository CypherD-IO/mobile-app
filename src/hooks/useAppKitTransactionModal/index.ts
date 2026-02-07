import { useState, useCallback } from 'react';
import { AppKitTransactionState } from '../../components/v2/AppKitTransactionModal';

interface UseAppKitTransactionModalProps {
  walletName?: string;
  onTimeout?: () => void;
}

interface UseAppKitTransactionModalReturn {
  isModalVisible: boolean;
  modalState: AppKitTransactionState;
  showModal: () => void;
  hideModal: () => void;
  setTimedOut: () => void;
  handleResend: (resendFn: () => Promise<void>) => Promise<void>;
  handleCancel: () => void;
}

/**
 * Hook to manage AppKit transaction modal state
 * Handles showing/hiding modal and state transitions for transaction requests
 */
export function useAppKitTransactionModal({
  walletName,
  onTimeout,
}: UseAppKitTransactionModalProps = {}): UseAppKitTransactionModalReturn {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalState, setModalState] = useState<AppKitTransactionState>(
    AppKitTransactionState.WAITING,
  );

  const showModal = useCallback(() => {
    setModalState(AppKitTransactionState.WAITING);
    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsModalVisible(false);
    // Reset to WAITING state after animation completes
    setTimeout(() => {
      setModalState(AppKitTransactionState.WAITING);
    }, 300);
  }, []);

  const setTimedOut = useCallback(() => {
    setModalState(AppKitTransactionState.TIMED_OUT);
    onTimeout?.();
  }, [onTimeout]);

  const handleResend = useCallback(async (resendFn: () => Promise<void>) => {
    try {
      // Reset to waiting state
      setModalState(AppKitTransactionState.WAITING);
      // Execute the resend function
      await resendFn();
    } catch (error) {
      console.error('[useAppKitTransactionModal] Error resending:', error);
      // Keep modal open so user can try again
    }
  }, []);

  const handleCancel = useCallback(() => {
    hideModal();
  }, [hideModal]);

  return {
    isModalVisible,
    modalState,
    showModal,
    hideModal,
    setTimedOut,
    handleResend,
    handleCancel,
  };
}
