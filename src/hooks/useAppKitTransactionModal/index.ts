import { useState, useCallback, useRef } from 'react';
import { AppKitTransactionState } from '../../components/v2/AppKitTransactionModal';

interface UseAppKitTransactionModalProps {
  walletName?: string;
  onTimeout?: () => void;
}

interface UseAppKitTransactionModalReturn {
  isModalVisible: boolean;
  modalState: AppKitTransactionState;
  abortController: React.MutableRefObject<AbortController | null>;
  resendCount: number;
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
  const [resendCount, setResendCount] = useState(0);
  const abortController = useRef<AbortController | null>(null);

  const showModal = useCallback(() => {
    // Create a new AbortController for this transaction
    abortController.current = new AbortController();
    setModalState(AppKitTransactionState.WAITING);
    setResendCount(0); // Reset resend count for new transaction
    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsModalVisible(false);
    // Reset to WAITING state after bottom sheet unmounts
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
      // Increment resend count
      setResendCount(prev => prev + 1);
      // Create a new AbortController for the resend
      abortController.current = new AbortController();
      // Reset to waiting state
      setModalState(AppKitTransactionState.WAITING);
      // Execute the resend function
      await resendFn();
    } catch (error) {
      // Keep modal open so user can try again
    }
  }, []);

  const handleCancel = useCallback(() => {
    // Abort the ongoing transaction
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    hideModal();
  }, [hideModal]);

  return {
    isModalVisible,
    modalState,
    abortController,
    resendCount,
    showModal,
    hideModal,
    setTimedOut,
    handleResend,
    handleCancel,
  };
}
