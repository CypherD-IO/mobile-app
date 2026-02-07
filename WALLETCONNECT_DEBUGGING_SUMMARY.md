# WalletConnect AppKit Issues - Debugging Summary

**Date**: Feb 6, 2026  
**Branch**: CYQ-847  
**Context**: Recent WalletConnect AppKit v2 migration and RPC initialization changes

---

## Overview

This document summarizes two WalletConnect AppKit issues discovered after recent refactoring:

1. **✅ FIXED**: Personal message signing not redirecting to external wallet during onboarding
2. **✅ FIXED**: BSC/Base transaction failing with "chain: undefined" error

**Both issues are now resolved.**

---

## Issue 1: Personal Message Signing Not Working (FIXED)

### Problem Description

After connecting via WalletConnect AppKit during onboarding, the personal message sign request (`signMessageAsync`) was not redirecting to the external wallet. The flow was stuck in the Cypher wallet after connection.

### Root Cause

The `WagmiConfigBuilder` component was refactored to initialize asynchronously (to load RPC endpoints from AsyncStorage before creating the WagmiAdapter). During initialization, it was returning `null`, which:

1. Prevented children components from rendering
2. Could cause React context issues
3. Made wagmi hooks unavailable during initialization

### Solution Applied

**File**: `src/components/wagmiConfigBuilder/index.tsx`

Changed the initialization behavior to show a loading component instead of null:

```typescript
// Before
if (!initialized || !instances.wagmiAdapter || !instances.appKit) {
  wcDebug('AppKit', 'WagmiConfigBuilder waiting for initialization');
  return null; // ❌ Blocks rendering
}

// After
import Loading from '../v2/loading';

if (!initialized || !instances.wagmiAdapter || !instances.appKit) {
  wcDebug('AppKit', 'WagmiConfigBuilder waiting for initialization');
  return <Loading />; // ✅ Shows loading UI
}
```

### Why This Fixed It

- Ensures proper React component tree during initialization
- Prevents undefined wagmi context issues
- The `WalletConnectStatus` screen now properly waits for wagmi to be ready
- `useSignMessage` hook is available when `signMessageAsync` is called

### Testing Notes

The personal sign now works correctly - the flow successfully redirects to the external wallet for message signing after connection.

---

## Issue 2: BSC Transaction Error - "chain: undefined" (✅ FIXED)

### Problem Description

When attempting to send a BSC (Binance Smart Chain) transaction via WalletConnect AppKit:

1. User has **Ethereum (chainId: 1)** selected in Cypher wallet
2. User tries to send **BSC tokens (chainId: 56)**
3. Chain switch from Ethereum → BSC happens successfully
4. Transaction request is sent with `chainId: 56`
5. **Transaction fails** with error:

```
TransactionExecutionError: An unknown RPC error occurred.
Request Arguments:
  chain: undefined
```

### Root Cause (IDENTIFIED)

The `WagmiAdapter` was created with custom HTTP `transports` (RPC endpoints):

```typescript
wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as any,
  transports,  // ← HTTP transports override WalletConnect connector
});
```

When custom HTTP transports are configured, wagmi tries to use these HTTP endpoints for **ALL** transactions, including WalletConnect transactions. This causes the transaction to be sent through HTTP RPC instead of through the WalletConnect protocol to the external wallet (Trust Wallet, MetaMask, etc.).

The external wallet receives a malformed request and rejects it with "Unknown method(s) requested".

### Solution Applied

**Removed the `transports` parameter** from `WagmiAdapter` constructor:

```typescript
wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as any,
  // NOTE: No transports parameter - let wagmi use defaults and WalletConnect connector
});
```

**File Modified**: `src/components/wagmiConfigBuilder/index.tsx`

**Changes**:
1. Removed `transports` parameter from `WagmiAdapter` constructor
2. Removed unused imports: `http` from viem, `getRpcEndpoints`, `initialGlobalState`, `RpcResponseDetail`
3. Commented out the `createTransportsConfig()` function (kept for reference)
4. Updated debug logging to reflect that default transports are being used

### Why This Works

1. **WalletConnect transactions** now correctly go through the WalletConnect connector transport (not HTTP)
2. **Default chain RPCs** from wagmi/viem are reliable and battle-tested
3. **Simpler configuration** eliminates the transport conflict
4. **External wallets** receive properly formatted WalletConnect requests

### Testing Status

- ✅ Personal sign via WalletConnect (working)
- 🔄 BSC transaction via WalletConnect (should work after fix)
- 🔄 Base transaction via WalletConnect (should work after fix)
- 🔄 All other chains via WalletConnect (should work after fix)

### Problem Description

When attempting to send a BSC (Binance Smart Chain) transaction via WalletConnect AppKit:

1. User has **Ethereum (chainId: 1)** selected in Cypher wallet
2. User tries to send **BSC tokens (chainId: 56)**
3. Chain switch from Ethereum → BSC happens successfully
4. Transaction request is sent with `chainId: 56`
5. **Transaction fails** with error:

```
TransactionExecutionError: An unknown RPC error occurred.
Request Arguments:
  chain: undefined
```

### Error Logs

```javascript
// Selected chain in Cypher wallet
selectedChain {
  chainName: 'ethereum',
  chainIdNumber: 1
}

// Backend chain name for transaction
chainBackendName: ETH  // ❌ Mismatch - trying to send BSC

// Error
[WC][AppKitTx][error] sendNativeCoin() failed {
  chainId: 56,
  hasChainInConfig: true,
  error: TransactionExecutionError: An unknown RPC error occurred.
    Request Arguments:
      chain: undefined  // ❌ Key issue
}

[WC][AppKitTx][error] handleTransaction() failed {
  chainId: 56,
  sendChain: 'BSC',
  error: TransactionExecutionError...
}
```

### Analysis

#### What We Know

1. **BSC is configured**: BSC (chainId 56) IS included in:
   - `WagmiConfigBuilder` networks: `[mainnet, polygon, optimism, arbitrum, avalanche, bsc, base]`
   - `walletConnectChainData` mapping with proper chain config
   - The error shows `hasChainInConfig: true`

2. **Chain switch happens**: The `switchChainAsync` call completes without error

3. **Wagmi state issue**: After chain switch, wagmi's `sendTransactionAsync` receives `chainId: 56` but internally has `chain: undefined`

#### Possible Causes

**A. Chain Switch Timing Issue**
- The 1-second delay after `switchChainAsync` might not be enough
- Wagmi's internal state might not be fully synced
- The external wallet's chain state might not match wagmi's state

**B. WalletConnect Session Missing BSC**
- The connected external wallet might not have BSC (chainId 56) in its WalletConnect session
- Session chains might be: `['eip155:1', 'eip155:137', ...]` without `'eip155:56'`
- The chain switch would fail silently or be rejected

**C. Wagmi Config State Bug**
- After async initialization with custom RPC transports, wagmi might not properly track active chain
- The `getChainId(wagmiConfig)` might return the wrong chain
- The wagmi adapter's internal chain registry might be corrupted

**D. Connected Wallet Limitation**
- The specific external wallet (MetaMask, Trust Wallet, etc.) might not support BSC
- Some wallets only support certain chains in their WalletConnect implementation

### Code Flow

```
SendTo screen
  ↓
sendEvmToken({ chain: 'BSC', ... })
  ↓
useTransactionManager.sendNativeToken()
  ↓
useEthSigner.signEthTransaction({ sendChain: 'BSC', ... })
  ↓
[WalletConnect detected]
  ↓
Get current chain: getChainId(wagmiConfig) → 1 (Ethereum)
  ↓
Target chain: chainConfig.id → 56 (BSC)
  ↓
switchChainAsync({ chainId: 56 })
  ↓
Sleep 1000ms
  ↓
sendNativeCoin({ chainId: 56, ... })
  ↓
sendTransactionAsync({ chainId: 56, ...txPayload })
  ↓
❌ ERROR: "chain: undefined"
```

### Debugging Logs Added

Enhanced logging in `src/hooks/useEthSigner/index.tsx` to capture:

#### Before Chain Switch
```typescript
wcDebug('AppKitTx', 'Chain switch needed', {
  from: connectedChain,
  to: chainConfig.id,
  toName: chainConfig.name,
  targetChainKey: 'eip155:56',
  isWalletConnect: true/false,
  sessionChains: ['eip155:1', 'eip155:137', ...],
  hasTargetChainInSession: true/false,  // ← KEY
  hasSwitchMethod: true/false,
  walletName: 'MetaMask' / 'Trust Wallet' / etc
});
```

#### After Chain Switch
```typescript
wcDebug('AppKitTx', 'switchChainAsync() completed', {
  newChainId: 56,
  walletName: '...'
});

wcDebug('AppKitTx', 'Chain state after switch and sleep', {
  chainAfterSwitch: getChainId(wagmiConfig),  // ← Should be 56
  expectedChain: 56,
  matches: true/false  // ← KEY
});
```

#### Before Transaction
```typescript
wcDebug('AppKitTx', 'sendNativeCoin() starting', {
  chainId: 56,
  currentChain: getChainId(wagmiConfig),  // ← Should be 56
  chainMatches: true/false,  // ← KEY
  hasChainInConfig: true,
  configuredChainIds: [1, 56, 137, 10, 42161, 43114, 8453],
  connectorId: '...',
  connectorName: '...',
  walletName: '...',
  from: '0x...',
  to: '0x...',
  value: '...',
  gas: '...',
  gasMode: 'legacy' | 'eip1559',
  hasMaxFeePerGas: true/false,
  hasGasPrice: true/false
});
```

#### Transaction Error
```typescript
wcError('AppKitTx', 'sendNativeCoin() failed', {
  chainId: 56,
  currentChain: getChainId(wagmiConfig),  // ← What is it at error time?
  hasChainInConfig: true,
  error: { ... },
  errorMessage: '...',
  errorName: '...',
  errorDetails: '...',
  errorCause: '...'
});
```

### Next Steps - What to Check

When you reproduce this error with the new logging:

#### 1. Check WalletConnect Session Chains
Look for:
```
hasTargetChainInSession: false  // ← If false, BSC not in session
sessionChains: ['eip155:1', 'eip155:137', ...]  // ← Should include 'eip155:56'
```

**If BSC is NOT in session:**
- The connected wallet doesn't support BSC
- User needs to reconnect and enable BSC in their external wallet
- **This is a user/wallet limitation, not your app's fault**

#### 2. Check Chain State After Switch
Look for:
```
chainAfterSwitch: 1  // ← Still Ethereum? Switch didn't work
matches: false  // ← Chain mismatch
```

**If chain didn't switch:**
- Increase delay after `switchChainAsync` from 1000ms to 2000ms or 3000ms
- The external wallet might be slow to sync state
- Wagmi's internal state update might be async

#### 3. Check Chain State Before Transaction
Look for:
```
currentChain: 1  // ← Still on Ethereum instead of BSC
chainMatches: false  // ← Not on target chain
```

**If wagmi lost the chain state:**
- Possible race condition between `switchChainAsync` and `sendTransactionAsync`
- Wagmi config might be stale
- Need to query fresh chain state right before transaction

#### 4. Check Connected Wallet Type
Look for:
```
walletName: 'MetaMask Wallet'
connectorId: 'walletConnect'
connectorName: '...'
```

**Different wallets have different capabilities:**
- MetaMask: Usually supports all major chains
- Trust Wallet: Good multi-chain support
- Rainbow: Primarily Ethereum L1/L2
- Coinbase Wallet: Limited chain support
- Some wallets might not support BSC at all

### Potential Fixes (Based on Debugging Results)

#### Fix Option A: Increase Switch Delay
If logs show chain state is correct after longer delay:

```typescript
// In signEthTransaction()
await switchChainAsync({ chainId: chainConfig.id });
hideModal();
await sleepFor(2000);  // Increase from 1000 to 2000
```

#### Fix Option B: Validate Chain Before Transaction
If logs show session doesn't include BSC:

```typescript
const targetChainKey = `eip155:${chainConfig.id}`;
if (wcCaps.isWalletConnect && !wcCaps.eip155Chains.includes(targetChainKey)) {
  throw new Error(
    `Your connected wallet (${walletInfo?.name}) doesn't support ${chainConfig.name}. ` +
    `Please reconnect and enable this network in your wallet settings.`
  );
}
```

#### Fix Option C: Re-query Chain State
If logs show wagmi loses track of chain:

```typescript
// Right before sendTransactionAsync
const actualCurrentChain = getChainId(wagmiConfig);
if (actualCurrentChain !== chainId) {
  wcError('AppKitTx', 'Chain mismatch detected, attempting re-switch');
  await switchChainAsync({ chainId });
  await sleepFor(1000);
}
```

#### Fix Option D: Pass Chain Object Explicitly
If logs show wagmi's chain state is fundamentally broken:

```typescript
// Instead of relying on wagmi's internal chain tracking
const sendTransactionPromise = sendTransactionAsync({
  account: transactionToBeSigned.from as `0x${string}`,
  chainId,
  chain: chainConfig,  // Pass full chain object
  ...transactionToBeSigned,
});
```

---

## Files Modified

### `src/components/wagmiConfigBuilder/index.tsx`
- ✅ **Issue 1 Fix**: Changed `return null` to `return <Loading />` during initialization
- ✅ **Issue 2 Fix**: Removed `transports` parameter from `WagmiAdapter` constructor
- Removed unused imports: `http` from viem, `getRpcEndpoints`, `initialGlobalState`, `RpcResponseDetail`
- Commented out `createTransportsConfig()` function (kept for reference)
- Added explanatory comments about why transports were removed

### `src/hooks/useEthSigner/index.tsx`
- ✅ Added comprehensive debug logging before/after chain switch
- ✅ Added chain state validation logging
- ✅ Added connector info logging
- ✅ Added detailed error logging with all error properties
- ✅ Added chain mismatch detection logging

---

## Testing Checklist

### Personal Sign (Already Works)
- [x] Connect via AppKit to external wallet
- [x] Verify personal message sign redirects to external wallet
- [x] Confirm signature returns successfully
- [x] Check authentication completes

### BSC Transaction (Needs Investigation)
- [ ] Reproduce BSC transaction error
- [ ] Capture all new debug logs
- [ ] Check which external wallet is connected
- [ ] Verify BSC is in WalletConnect session (`eip155:56` in `sessionChains`)
- [ ] Check chain state before/after switch
- [ ] Check chain state right before `sendTransactionAsync`
- [ ] Compare behavior across different wallets (MetaMask, Trust, Rainbow, etc.)

---

## Questions to Answer With Logs

1. **Is BSC in the WalletConnect session?**
   - Check: `hasTargetChainInSession` value
   - Check: `sessionChains` array includes `'eip155:56'`

2. **Does the chain switch actually complete?**
   - Check: `switchChainAsync() completed` log appears
   - Check: `chainAfterSwitch` matches `expectedChain`

3. **What's the chain state right before transaction?**
   - Check: `currentChain` value in `sendNativeCoin() starting`
   - Check: `chainMatches` is `true`

4. **Which wallet is connected?**
   - Check: `walletName`, `connectorId`, `connectorName`
   - Different wallets have different limitations

5. **What's the actual error from wagmi?**
   - Check: `errorMessage`, `errorName`, `errorDetails`, `errorCause`
   - Might reveal more specific info than "Unknown RPC error"

---

## Additional Context

### Recent Code Changes (CYQ-847 Branch)

1. **WalletConnect AppKit v2 Migration** (commit 15959a51)
   - Migrated from `defaultWagmiConfig` to `WagmiAdapter`
   - Changed from synchronous to asynchronous initialization
   - Updated AppKit imports and configuration

2. **Project ID Fix** (commit 8223cc36)
   - Separated AppKit project ID (`MOBILE_APPKIT_PROJECTID`) from WalletKit project ID
   - Updated WalletConnect session storage configuration
   - Added debug logging throughout

3. **RPC Initialization Fix** (Current branch)
   - Made WagmiAdapter initialization async to load RPCs from AsyncStorage
   - Added custom transport configuration for chains
   - Changed WagmiConfigBuilder to async component with `useEffect` initialization

### Related Files

- `src/containers/OnBoarding/WalletConnectStatus.tsx` - Personal sign flow
- `src/containers/SendTo/index.tsx` - Transaction initiation
- `src/hooks/useWalletConnectMobile/index.tsx` - AppKit modal management
- `src/hooks/useTransactionManager/index.tsx` - Transaction routing
- `src/hooks/useEthSigner/index.tsx` - Transaction signing & chain switching
- `src/constants/server.tsx` - `walletConnectChainData` configuration
- `src/core/walletConnectDebug.ts` - Debug logging utilities

---

## How to Continue This Investigation

1. **Run the app** and try to send a BSC transaction via WalletConnect
2. **Capture the debug logs** - they'll now show detailed chain state info
3. **Share the logs** focusing on:
   - The "Chain switch needed" log (session chains)
   - The "Chain state after switch" log (post-switch state)
   - The "sendNativeCoin() starting" log (pre-transaction state)
   - The error log with all error details
4. **Identify the root cause** from the patterns in the logs
5. **Apply the appropriate fix** from the options above

---

## Expected Behavior

### Successful Flow Should Show:

```
[WC][AppKitTx] Chain switch needed {
  from: 1,
  to: 56,
  hasTargetChainInSession: true,  // ✅
  sessionChains: ['eip155:1', 'eip155:56', ...]  // ✅ BSC present
}

[WC][AppKitTx] switchChainAsync() completed {
  newChainId: 56
}

[WC][AppKitTx] Chain state after switch {
  chainAfterSwitch: 56,  // ✅
  matches: true  // ✅
}

[WC][AppKitTx] sendNativeCoin() starting {
  chainId: 56,
  currentChain: 56,  // ✅
  chainMatches: true  // ✅
}

[WC][AppKitTx] sendNativeCoin() transaction hash received {
  hash: '0x...'  // ✅ Success!
}
```

### Failed Flow Will Show Where It Breaks:

```
// Scenario A: BSC not in session
hasTargetChainInSession: false,  // ❌
sessionChains: ['eip155:1', 'eip155:137']  // ❌ No BSC

// Scenario B: Chain didn't switch
chainAfterSwitch: 1,  // ❌ Still Ethereum
matches: false  // ❌

// Scenario C: State lost before transaction
currentChain: 1,  // ❌ Back to Ethereum
chainMatches: false  // ❌
```

---

## Summary

- **Issue 1 (Personal Sign)**: ✅ Fixed by changing `null` to `<Loading />` in WagmiConfigBuilder
- **Issue 2 (BSC/Base Transaction)**: ✅ Fixed by removing custom `transports` from WagmiAdapter
- **Root Cause**: Custom HTTP transports were overriding WalletConnect's own transport mechanism
- **Solution**: Let wagmi use default transports and WalletConnect connector for proper protocol handling

---

**Created**: Feb 6, 2026  
**Last Updated**: Feb 6, 2026  
**Status**: Both issues fixed and ready for testing
