# AppKit Transaction Modal Integration Guide

## Overview
This guide shows how to integrate the AppKitTransactionModal into your transaction flow.

## Files Created

### 1. `/src/components/v2/AppKitTransactionModal.tsx`
The main modal component that displays transaction status with countdown timer.

**States:**
- `WAITING`: Shows countdown timer, wallet info, and resend/cancel buttons
- `TIMED_OUT`: Shows error message with instructions to reject in external wallet

### 2. `/src/hooks/useAppKitTransactionModal/index.ts`
Hook to manage modal state transitions.

## Integration Example

### Option A: Wrap Transaction Call (Recommended)

Create a wrapper at the point where you initiate transactions (e.g., SendTo screen):

```typescript
import { AppKitTransactionModal, AppKitTransactionState } from '../../components/v2/AppKitTransactionModal';
import { useAppKitTransactionModal } from '../../hooks/useAppKitTransactionModal';
import { useWalletInfo } from '@reown/appkit-react-native';

function SendToScreen() {
  const [sendTransaction] = useEthSigner();
  const { walletInfo } = useWalletInfo();
  
  const {
    isModalVisible,
    modalState,
    showModal,
    hideModal,
    setTimedOut,
    handleResend,
    handleCancel,
  } = useAppKitTransactionModal({
    walletName: walletInfo?.name,
    onTimeout: () => {
      console.log('Transaction timed out');
    },
  });

  // Store transaction params for resend
  const txParamsRef = useRef(null);

  const executeSendTransaction = async (params) => {
    try {
      // Show modal immediately
      showModal();
      
      // Store params for resend
      txParamsRef.current = params;
      
      // Execute transaction with timeout
      const result = await sendTransaction(params);
      
      // Success - hide modal
      hideModal();
      
      return result;
    } catch (error) {
      // Check if it's a timeout error
      if (error.message?.includes('timed out')) {
        setTimedOut();
      } else {
        hideModal();
        // Handle other errors
      }
      throw error;
    }
  };

  const handleResendTransaction = async () => {
    if (!txParamsRef.current) return;
    
    await handleResend(async () => {
      const result = await sendTransaction(txParamsRef.current);
      hideModal();
      return result;
    });
  };

  return (
    <>
      {/* Your UI */}
      <Button onPress={() => executeSendTransaction(txParams)} />
      
      {/* Modal */}
      <AppKitTransactionModal
        isVisible={isModalVisible}
        walletName={walletInfo?.name || 'your wallet'}
        onResend={handleResendTransaction}
        onCancel={handleCancel}
        onRetry={() => executeSendTransaction(txParamsRef.current)}
        state={modalState}
      />
    </>
  );
}
```

### Option B: Global Context Provider

For app-wide transaction modal management:

1. Create context provider in `src/contexts/AppKitTransactionContext.tsx`
2. Wrap app with provider
3. Use context hook anywhere transactions are initiated

## Features

### Countdown Timer
- 4-minute countdown (240 seconds)
- Color-coded warnings:
  - Gray: > 30 seconds
  - Yellow: ≤ 30 seconds  
  - Red: ≤ 10 seconds

### Resend Button
- Allows user to resend request if it didn't show in external wallet
- Useful for WalletConnect connection issues
- Resets timer and sends request again

### State Management
- **WAITING**: Active countdown, awaiting user action in external wallet
- **TIMED_OUT**: Shows error with cleanup instructions

### Timeout Handling
The timeout is managed in two places:
1. **`useEthSigner`**: Promise.race with WALLET_CONNECT_SIGNING_TIMEOUT
2. **Modal**: Visual countdown timer for user awareness

## Translation Keys Added

```typescript
APPKIT_TX_PENDING: 'Transaction Pending',
APPKIT_TX_CHECK_WALLET: 'Please check {{walletName}} and approve the transaction request',
APPKIT_TX_TIME_REMAINING: 'Time remaining: {{time}}',
APPKIT_TX_CONNECTED_TO: 'Connected to: {{walletName}}',
APPKIT_TX_RESEND_REQUEST: 'Resend Request (if not showing)',
APPKIT_TX_TIMEOUT: 'Request Expired',
APPKIT_TX_TIMEOUT_DESC: 'The transaction request timed out and was not signed.',
APPKIT_TX_TIMEOUT_ACTION: 'Important: Please open {{walletName}} and REJECT any pending requests to avoid confusion.',
APPKIT_TX_RETRY: 'Retry Transaction',
```

## Next Steps

1. Choose integration approach (Option A recommended for SendTo screen)
2. Add modal to transaction initiation points
3. Test timeout flow
4. Test resend functionality
5. Verify UI matches WalletConnectStatus theme

## Notes

- Modal theme matches `src/containers/OnBoarding/WalletConnectStatus.tsx`
- Uses blinking animation for "check wallet" message
- Handles edge case where request doesn't appear in external wallet
- Provides user guidance for cleanup after timeout
