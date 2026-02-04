# WalletConnect V2 "No Matching Key" Error - Debug Summary

**Date:** February 4, 2026  
**Branch:** CYQ-847  
**Related PR:** #825 (AppKit v2 migration)

---

## Problem Statement

After upgrading React Native from 0.72 to 0.83 and migrating to AppKit v2 (PR #825), WalletConnect dApp connections started failing with:

```
Error: No matching key. session topic doesn't exist: <session_topic>
```

### Symptoms

1. Connection modal appears correctly when scanning dApp QR code
2. Session approval succeeds (shows in active sessions)
3. **Error appears immediately after approval**: "No matching key"
4. When dApp sends `personal_sign` request:
   - dApp shows failure immediately
   - Wallet DOES receive the request (delayed)
5. Warning in console: `WalletConnect Core is already initialized. Init() was called 2 times.`

---

## Root Cause Analysis

### The Core Issue: Dual WalletConnect Core Instances

The app uses two WalletConnect SDKs simultaneously:

| SDK           | Purpose                                        | Package                      |
| ------------- | ---------------------------------------------- | ---------------------------- |
| **WalletKit** | Receive connections FROM dApps (be a wallet)   | `@reown/walletkit`           |
| **AppKit**    | Connect TO external wallets (as a dApp client) | `@reown/appkit-react-native` |

Both SDKs internally create their own `@walletconnect/core` instance:

```
App Startup
    │
    ├─► WalletConnectV2Provider initializes
    │       └─► createWeb3Wallet()
    │               └─► new Core({ projectId: "535eb..." })  ← Core #1
    │
    └─► WagmiConfigBuilder initializes
            └─► new WagmiAdapter({ projectId: "535eb..." })
                    └─► internally creates new Core()  ← Core #2 (CONFLICT!)
```

### Why This Causes "No Matching Key" Errors

1. **Both Cores subscribe to the WalletConnect relay** with the same projectId
2. **When a dApp sends an encrypted message**, both Cores receive it
3. **Only WalletKit's Core has the session keys** (it established the pairing)
4. **AppKit's Core tries to decrypt** → fails → logs "No matching key"
5. **The error propagates** and breaks the session handling

### Evidence

The `@walletconnect/core` package uses a global singleton pattern:

```javascript
// Inside @walletconnect/core
globalThis._walletConnectCore_<projectId> = coreInstance;
```

But `new Core()` ALWAYS creates a new instance (with a warning), it doesn't actually reuse the existing one.

---

## Technical Investigation Details

### Package Versions (Aligned)

All WalletConnect packages were aligned to version `2.23.4` (required by `@reown/walletkit@1.5.0`):

```json
// package.json
{
  "dependencies": {
    "@walletconnect/core": "2.23.4",
    "@walletconnect/jsonrpc-types": "1.0.4",
    "@walletconnect/jsonrpc-utils": "1.0.8",
    "@walletconnect/keyvaluestorage": "1.1.1",
    "@walletconnect/react-native-compat": "2.23.4",
    "@walletconnect/types": "2.23.4",
    "@walletconnect/utils": "2.23.4"
  },
  "overrides": {
    "@walletconnect/core": "2.23.4",
    "@walletconnect/jsonrpc-types": "1.0.4",
    "@walletconnect/types": "2.23.4",
    "@walletconnect/utils": "2.23.4"
  }
}
```

### Verification Command

```bash
grep -o '"@walletconnect/core": "[^"]*"' package-lock.json | sort | uniq -c
# Should show: 3 "@walletconnect/core": "2.23.4"
```

---

## Key Files Involved

### 1. WalletKit Initialization

**File:** `src/core/walletConnectV2Utils.ts`

Creates the WalletKit instance with its Core:

```typescript
export async function createWeb3Wallet(projectId: string) {
  const core = new Core({
    projectId,
    relayUrl: 'wss://relay.walletconnect.com',
  });

  web3wallet = await WalletKit.init({
    core,
    metadata: {
      /* ... */
    },
  });
}
```

### 2. AppKit/Wagmi Initialization

**File:** `src/components/wagmiConfigBuilder/index.tsx`

Creates AppKit with WagmiAdapter (which internally creates another Core):

```typescript
const wagmiAdapter = new WagmiAdapter({
  projectId, // Same projectId = CONFLICT
  networks,
});

const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  // ...
});
```

### 3. WalletKit Event Handlers

**File:** `src/hooks/useWalletConnectV2EventsManager/index.ts`

Handles `session_proposal`, `session_request`, `session_delete` events.

### 4. Session Approval UI

**File:** `src/components/v2/walletConnectV2Views/PairingModal.tsx`

Shows the approval modal and calls `web3wallet.approveSession()`.

### 5. QR Scanning & Pairing

**File:** `src/containers/Options/WalletConnectCamera.tsx`

Scans QR codes and initiates pairing via `web3WalletPair()`.

### 6. useWalletConnectMobile Hook

**File:** `src/hooks/useWalletConnectMobile/index.tsx`

Uses AppKit hooks (`useAppKit`, `useAccount`) for connecting to external wallets.

---

## Proof of Concept: Disabling AppKit

We confirmed the root cause by temporarily disabling AppKit:

### Changes Made for Testing

**File:** `src/components/wagmiConfigBuilder/index.tsx`

```typescript
// Added at top of file
export const DISABLE_APPKIT_FOR_TESTING = true;

// In useEffect - skip initialization
if (DISABLE_APPKIT_FOR_TESTING) {
  console.log('[AppKit] DISABLED FOR TESTING');
  setIsReady(true);
  return;
}

// In render - bypass providers
if (DISABLE_APPKIT_FOR_TESTING) {
  return <>{children}</>;
}
```

**File:** `src/hooks/useWalletConnectMobile/index.tsx`

```typescript
// Return safe defaults when AppKit is disabled
if (DISABLE_APPKIT_FOR_TESTING) {
  return {
    openWalletConnectModal: async () => {
      /* no-op */
    },
    disconnectWalletConnect: async () => {
      /* no-op */
    },
    isConnected: false,
    isConnecting: false,
    address: undefined,
  };
}
```

### Test Result

✅ **With AppKit disabled, WalletKit dApp connections work correctly!**

- No "Core already initialized" warning
- No "No matching key" errors
- Session approval works
- Signing requests work end-to-end

---

## Recommended Solution: Lazy AppKit Initialization

### Approach

Instead of initializing AppKit at app startup, only initialize it when the user explicitly wants to connect to an external wallet.

### Architecture

```
App Startup:
  └─► WalletKit initializes (always active for dApp connections)
      └─► Single Core instance

User clicks "Connect to External Wallet":
  └─► AppKit initializes on-demand
      └─► Creates second Core (acceptable because user initiated)
      └─► Show connection modal

User leaves connect flow:
  └─► AppKit can remain or be cleaned up
```

### Benefits

1. **WalletKit always works** - Primary use case (receiving dApp connections) is never broken
2. **No startup conflicts** - Only one Core at startup
3. **User-initiated only** - AppKit loads when user explicitly needs it
4. **Matches industry pattern** - MetaMask/Rainbow only use WalletKit

### Trade-offs

- Slight delay (~1-2s) when first opening external wallet connection
- Need to handle initialization state in UI

---

## Alternative Solution: Different Project IDs

Use separate WalletConnect project IDs for each SDK:

```typescript
// WalletKit
const walletKitProjectId = 'abc123...'; // For receiving dApp connections

// AppKit
const appKitProjectId = 'xyz789...'; // For connecting to external wallets
```

### Benefits

- Complete isolation at relay level
- Both can be active simultaneously

### Trade-offs

- Need to register/manage two project IDs
- Two WebSocket connections always open
- Separate billing/analytics

---

## Files Modified During Investigation

| File                                                      | Changes                                                  |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `package.json`                                            | Aligned WalletConnect package versions to 2.23.4         |
| `src/core/walletConnectV2Utils.ts`                        | Added debug logging, attempted Core singleton pattern    |
| `src/components/wagmiConfigBuilder/index.tsx`             | Added `DISABLE_APPKIT_FOR_TESTING` flag, dynamic imports |
| `src/hooks/useWalletConnectMobile/index.tsx`              | Handle disabled AppKit gracefully                        |
| `src/hooks/useWalletConnectV2EventsManager/index.ts`      | Added debug logging, retry logic                         |
| `src/components/v2/walletConnectV2Views/PairingModal.tsx` | Added session availability wait, debug logging           |

---

## Next Steps

1. **Implement lazy AppKit initialization:**

   - Create AppKit context that initializes on-demand
   - Update `WagmiConfigBuilder` to not auto-initialize
   - Add loading state to external wallet connection flow
   - Update `useWalletConnectMobile` to trigger initialization

2. **Test thoroughly:**

   - WalletKit dApp connections (primary flow)
   - AppKit external wallet connections (secondary flow)
   - Both flows used in same session

3. **Clean up debug code:**

   - Remove `DISABLE_APPKIT_FOR_TESTING` flag
   - Remove excessive console.log statements
   - Remove retry/wait logic that was added for debugging

4. **Consider long-term:**
   - Whether AppKit feature is needed at all
   - If users primarily use CypherD as their wallet, external wallet connection may be low priority

---

## Reference: Industry Patterns

### MetaMask Mobile

- Only uses WalletKit
- Does NOT use AppKit
- Focuses on being a wallet, not connecting to other wallets

### Rainbow Wallet

- Only uses WalletKit
- No AppKit integration
- Same pattern as MetaMask

### Conclusion

Major wallet apps don't try to do both. They focus on being a great wallet (WalletKit) rather than also being a dApp that connects to other wallets (AppKit).

---

## Useful Debug Commands

```bash
# Check WalletConnect package versions
grep -o '"@walletconnect/core": "[^"]*"' package-lock.json | sort | uniq -c

# Clear Metro cache
npx react-native start --reset-cache

# Clean rebuild iOS
cd ios && pod install && cd .. && npx react-native run-ios

# Clean rebuild Android
cd android && ./gradlew clean && cd .. && npx react-native run-android
```

---

## Console Log Patterns to Watch

**Good (single Core):**

```
[WalletKit] Creating Core with projectId: 535eb...
[WalletKit] Initializing WalletKit...
[WalletKit] WalletKit initialized successfully
```

**Bad (dual Core conflict):**

```
[WalletKit] Creating Core with projectId: 535eb...
WalletConnect Core is already initialized. Init() was called 2 times.
[AppKit] Creating WagmiAdapter...
```

**Error pattern:**

```
{time: ..., level: 50, msg: 'No matching key. session: <topic>'}
{time: ..., level: 50, msg: 'onRelayMessage() -> failed to process an inbound message: <encrypted>'}
```
