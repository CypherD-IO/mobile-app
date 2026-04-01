import React, { useCallback } from 'react';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import PayoutDocumentUploadModal from './PayoutDocumentUploadModal';

/**
 * Hook to open the payout document upload modal from anywhere.
 *
 * Usage:
 *   const { openDocumentUpload } = usePayoutDocumentUpload();
 *   openDocumentUpload({ payoutId: 'po_xxx', onSuccess: () => refetch() });
 */
export default function usePayoutDocumentUpload() {
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  const openDocumentUpload = useCallback(({ payoutId, onSuccess }: {
    payoutId: string;
    onSuccess?: () => void;
  }) => {
    showBottomSheet({
      id: 'payout-doc-upload',
      snapPoints: ['65%', '95%'],
      showHandle: true,
      showCloseButton: false,
      scrollable: true,
      enableContentPanningGesture: false,
      onClose: () => hideBottomSheet('payout-doc-upload'),
      content: (
        <PayoutDocumentUploadModal
          payoutId={payoutId}
          onSuccess={() => {
            hideBottomSheet('payout-doc-upload');
            onSuccess?.();
          }}
        />
      ),
    });
  }, [showBottomSheet, hideBottomSheet]);

  return { openDocumentUpload };
}
