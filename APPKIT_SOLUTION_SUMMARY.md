# AppKit Transaction Expiry Solution - Implementation Summary

## Problem Solved
When your wallet (acting as dApp via AppKit) connects to external wallets (MetaMask, Trust Wallet), transaction requests would timeout locally after 60 seconds, but remain active in the connected wallet. This created a discrepancy where users could sign "expired" transactions.

## Solution Overview

### 1. Extended Timeout (60s → 240s)
**Files Modified:**
- `src/constants/timeOuts.ts` - Added `WALLET_CONNECT_SIGNING_TIMEOUT = 240 * 1000`
- `src/hooks/useEthSigner/index.tsx` - Updated both `sendNativeCoin` and `sendToken` timeout
- `src/core/analytics.ts` - Added `WALLET_CONNECT_SIGNING_TIMEOUT` event

### 2. User-Facing Transaction Modal
**Files Created:**
- `src/components/v2/AppKitTransactionModal.tsx` - Main modal component
- `src/hooks/useAppKitTransactionModal/index.ts` - State management hook
- `APPKIT_MODAL_INTEGRATION.md` - Integration guide

**Modal Features:**
- ✅ Countdown timer (4:00 → 0:00) with color coding
- ✅ "Check your wallet" blinking message
- ✅ Resend button (for cases where request doesn't appear)
- ✅ Cancel button
- ✅ Timeout state with cleanup instructions
- ✅ Retry button after timeout
- ✅ Matches WalletConnectStatus.tsx theme

### 3. Translation Keys Added
```typescript
APPKIT_TX_PENDING: 'Transaction Pending'
APPKIT_TX_CHECK_WALLET: 'Please check {{walletName}} and approve...'
APPKIT_TX_TIME_REMAINING: 'Time remaining: {{time}}'
APPKIT_TX_CONNECTED_TO: 'Connected to: {{walletName}}'
APPKIT_TX_RESEND_REQUEST: 'Resend Request (if not showing)'
APPKIT_TX_TIMEOUT: 'Request Expired'
APPKIT_TX_TIMEOUT_DESC: 'The transaction request timed out...'
APPKIT_TX_TIMEOUT_ACTION: 'Important: Please open {{walletName}} and REJECT...'
APPKIT_TX_RETRY: 'Retry Transaction'
```

## Architecture

```
User Action (Send Transaction)
          ↓
    Show Modal (WAITING state)
          ↓
    sendTransactionAsync() ← 4 min timeout
          ↓
    ┌─────────────────┐
    │   User Signs    │
    │    in Time      │
    └────────┬────────┘
             ↓
    Hide Modal + Success
    
    ┌──────────────────┐
    │  Timeout (240s)  │
    └────────┬─────────┘
             ↓
    Modal → TIMED_OUT state
             ↓
    Show cleanup instructions
```

## What We CAN'T Do (Protocol Limitation)
❌ **Cannot cancel the request on the external wallet side**
- WalletConnect doesn't provide cancel mechanism for dApps
- Only wallets can reject their own pending requests
- This is why we provide user instructions to manually reject

## Integration Required

The modal component is ready but needs to be integrated at transaction initiation points. See `APPKIT_MODAL_INTEGRATION.md` for:
- Option A: Wrapper at SendTo screen (recommended)
- Option B: Global context provider
- Code examples
- Best practices

### Quick Integration Snippet

```typescript
import { AppKitTransactionModal } from '../../components/v2/AppKitTransactionModal';
import { useAppKitTransactionModal } from '../../hooks/useAppKitTransactionModal';

// In your component:
const { isModalVisible, modalState, showModal, hideModal, setTimedOut } = 
  useAppKitTransactionModal({ walletName: walletInfo?.name });

// Before sending transaction:
showModal();

// On timeout error:
setTimedOut();

// On success:
hideModal();

// Render:
<AppKitTransactionModal
  isVisible={isModalVisible}
  walletName={walletInfo?.name}
  onResend={handleResend}
  onCancel={hideModal}
  onRetry={handleRetry}
  state={modalState}
/>
```

## Files Changed

### Core Changes (Already Integrated)
1. ✅ `src/constants/timeOuts.ts`
2. ✅ `src/hooks/useEthSigner/index.tsx`
3. ✅ `src/i18n/index.tsx`
4. ✅ `src/core/analytics.ts`

### New Files (Ready to Use)
5. ✅ `src/components/v2/AppKitTransactionModal.tsx`
6. ✅ `src/hooks/useAppKitTransactionModal/index.ts`
7. ✅ `APPKIT_MODAL_INTEGRATION.md`

### Reverted (Incorrect WalletKit Changes)
- ❌ `src/components/v2/walletConnectV2Views/SigningModal.tsx` - Reverted (was for wrong use case)

## Testing Checklist

### Timeout Extension
- [ ] Transaction requests now have 4 minutes before local timeout
- [ ] Verify longer timeout gives users adequate time

### Modal Display
- [ ] Modal appears immediately when transaction is initiated
- [ ] Countdown timer works correctly (4:00 → 0:00)
- [ ] Timer color changes: gray → yellow (30s) → red (10s)
- [ ] Blinking "check wallet" message animates properly

### Resend Functionality
- [ ] Resend button triggers new transaction request
- [ ] Timer resets after resend
- [ ] Works when external wallet doesn't show first request

### Timeout State
- [ ] Modal transitions to TIMED_OUT after 4 minutes
- [ ] Shows appropriate error message
- [ ] Displays cleanup instructions
- [ ] Retry button works (if provided)

### Cancel/Close
- [ ] Cancel button during WAITING closes modal
- [ ] Close button in TIMED_OUT state works
- [ ] Modal cleanup happens properly

## Next Steps

1. **Choose Integration Point**: Likely `src/containers/SendTo/index.tsx`
2. **Add Modal to UI**: Follow integration guide
3. **Test Flows**: Normal, timeout, resend
4. **Iterate on UX**: Based on user feedback

## Benefits

1. ✅ **Users know what's happening** - Clear countdown and status
2. ✅ **Graceful timeout handling** - Instructions instead of confusion
3. ✅ **Resend capability** - Handles WalletConnect glitches
4. ✅ **More time to review** - 4 minutes vs 1 minute
5. ✅ **Professional UX** - Matches app theme and patterns
6. ✅ **Post-timeout guidance** - Tells users to clean up external wallet

## Notes

- Theme matches `WalletConnectStatus.tsx` for consistency
- Uses existing modal system (`CyDModalLayout`)
- Leverages Animated API for smooth blinking effect
- Fully typed with TypeScript
- No linter errors in new files
- Ready for integration and testing
