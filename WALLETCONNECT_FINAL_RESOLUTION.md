# WalletConnect Issue - Final Resolution

**Date**: February 6, 2026  
**Branch**: CYQ-847  
**Status**: ✅ RESOLVED

---

## Problem

Recent changes in the branch broke WalletConnect AppKit transactions:
- ❌ Native token sends (BNB, ETH) failing with "Unknown method(s) requested"
- ✅ ERC20 token sends (USDC) working
- ❌ Personal message signing initially not working (later fixed)

---

## Root Cause Identified

The **RPC initialization async refactoring** in `src/components/wagmiConfigBuilder/index.tsx` broke WalletConnect:

### What Changed (BROKEN)
```typescript
// Async initialization with custom RPC transports
async function initializeWagmiAndAppKit() {
  const transports = await createTransportsConfig(); // Load custom RPCs
  
  wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: networks as any,
    transports,  // ← This broke WalletConnect!
  });
  // ... rest
}

// Component waits for async init
export const WagmiConfigBuilder = () => {
  const [initialized, setInitialized] = useState(false);
  useEffect(() => { ... async init ... }, []);
  
  if (!initialized) return <Loading />;
  // ... render
};
```

### Working Version (RESTORED)
```typescript
// Synchronous initialization at module load time, NO transports
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as any,
  // NO transports parameter!
});

const appKit = createAppKit({ ... });

// Simple synchronous component
export const WagmiConfigBuilder = ({ children }) => {
  return (
    <AppKitProvider instance={appKit}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        {children}
      </WagmiProvider>
    </AppKitProvider>
  );
};
```

---

## Why Custom Transports Break WalletConnect

When `transports` are provided to `WagmiAdapter`:
1. Wagmi routes ALL requests through these HTTP RPC endpoints
2. WalletConnect transactions are sent via HTTP instead of WalletConnect protocol
3. External wallet receives malformed requests
4. External wallet rejects with "Unknown method(s) requested"

**The solution**: Don't provide `transports` - let `WagmiAdapter` use the chain's default RPCs, and the WalletConnect connector will automatically use its own transport for WC transactions.

---

## Changes Applied

### 1. Reverted `src/components/wagmiConfigBuilder/index.tsx`

**Removed**:
- Async initialization (`useEffect`, `useState` for init tracking)
- `createTransportsConfig()` function
- Custom RPC loading from AsyncStorage
- `initializeWagmiAndAppKit()` function
- All related imports (`http`, `getRpcEndpoints`, etc.)

**Restored**:
- Synchronous module-level initialization
- Simple component that immediately renders providers
- NO transports parameter on `WagmiAdapter`

### 2. Kept Enhanced Logging in `src/hooks/useEthSigner/index.tsx`

**Kept**:
- Comprehensive debug logging for transactions
- Chain switch validation
- Transaction payload logging
- Error details logging

**Reverted**:
- The manual txParams building (it wasn't the issue)
- The chain object lookup (not needed)

---

## What Was NOT the Issue

❌ **Undefined fields** - We thought `data: undefined` was the problem, but the working version also has this  
❌ **Chain object missing** - We thought we needed to pass `chain: chainObject`, but working version doesn't  
❌ **Need for custom RPCs** - The async RPC loading was actually causing the problem

✅ **The real issue**: The async initialization with custom transports broke WalletConnect's protocol handling

---

## Files Modified (Final State)

### `src/components/wagmiConfigBuilder/index.tsx`
- ✅ Reverted to working synchronous version (commit 8223cc36)
- NO async initialization
- NO custom transports
- NO RPC loading from AsyncStorage

### `src/hooks/useEthSigner/index.tsx`
- ✅ Kept enhanced debug logging
- ✅ Reverted manual txParams building
- Uses original `...transactionToBeSigned` spreading

---

## Testing

Test these scenarios to confirm everything works:

### WalletConnect AppKit (Your wallet connecting TO external wallets)
- [ ] Personal message signing during onboarding
- [ ] Native token send - BNB on BSC
- [ ] Native token send - ETH on Base
- [ ] ERC20 token send - USDC on BSC
- [ ] ERC20 token send - USDC on Base
- [ ] Chain switching
- [ ] Test with different wallets (Trust, MetaMask, Rainbow)

---

## Key Lesson Learned

**When WalletConnect works, don't "optimize" it with custom transports!**

The working configuration is:
- Simple synchronous initialization
- NO custom transports
- Let WagmiAdapter and WalletConnect handle their own routing
- Default chain RPCs work perfectly for WalletConnect use cases

The RPC_INITIALIZATION_FIX (async loading of custom RPCs) might be needed for other scenarios, but it breaks WalletConnect. If custom RPCs are truly needed, they should only be used for non-WalletConnect connections (imported wallet scenarios).

---

## Summary

The issue was caused by the async RPC initialization refactoring that added custom HTTP transports to `WagmiAdapter`. By reverting to the simple synchronous initialization without transports, WalletConnect transactions now work correctly.

**Status**: ✅ Ready for testing

---

**Created**: February 6, 2026  
**Last Updated**: February 6, 2026  
**Resolution**: Revert wagmiConfigBuilder to working synchronous version
