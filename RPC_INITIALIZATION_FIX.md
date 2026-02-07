# WalletConnect RPC Initialization Fix

## Problem Description

When connecting with WalletConnect for the first time (not after wallet import), the app was using default hardcoded RPC endpoints instead of the custom RPCs fetched from the backend. The custom RPCs would only take effect on the next app launch.

## Root Cause

The issue occurred due to a **race condition** in the initialization sequence:

1. **WagmiAdapter** was created at **module load time** (synchronously) in `wagmiConfigBuilder/index.tsx`
2. The WagmiAdapter was initialized with only network definitions but **no custom transports**
3. Custom **RPC endpoints were fetched asynchronously** later in `initializeAppProvider/index.tsx` via `fetchRPCEndpointsFromServer()`
4. By the time RPCs were fetched, the WagmiAdapter had already been created with default chain RPC endpoints
5. The fetched RPCs were stored in global state and AsyncStorage but **WagmiAdapter was never updated** with these new endpoints

### Timeline

```
App Start
  ↓
Module Load → WagmiAdapter created with DEFAULT RPCs (hardcoded in wagmi/chains)
  ↓
Component Mount → WalletConnectV2Provider renders → WagmiConfigBuilder renders
  ↓
Async Init → fetchRPCEndpointsFromServer() called
  ↓
RPCs fetched and stored in GlobalContext + AsyncStorage
  ↓
BUT: WagmiAdapter already created, continues using default RPCs
  ↓
Next App Launch → RPCs loaded from AsyncStorage early → Works correctly
```

## Solution

The fix involves making the WagmiAdapter initialization **asynchronous** and loading RPC endpoints from AsyncStorage **before** creating the adapter:

### Key Changes

1. **Load RPCs from AsyncStorage** before WagmiAdapter creation
2. **Pass custom transports** to WagmiAdapter using the `transports` configuration parameter
3. Make **WagmiConfigBuilder component asynchronous** to wait for initialization

### Implementation Details

#### 1. Created `createTransportsConfig()` function
- Loads RPC endpoints from AsyncStorage
- Falls back to `initialGlobalState.rpcEndpoints` if no stored RPCs
- Returns transport configuration object keyed by chain ID

#### 2. Created `initializeWagmiAndAppKit()` function
- Calls `createTransportsConfig()` to get custom RPCs
- Creates WagmiAdapter with custom transports
- Uses singleton pattern to prevent re-initialization
- Returns both adapter and appKit instances

#### 3. Updated `WagmiConfigBuilder` component
- Now uses `useEffect` to initialize asynchronously
- Waits for initialization before rendering providers
- Returns `null` during initialization (can be replaced with a loading component)

### Code Structure

```typescript
// Before: Synchronous initialization at module load
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as any,
  // No transports - uses defaults!
});

// After: Asynchronous initialization with custom transports
async function initializeWagmiAndAppKit() {
  const transports = await createTransportsConfig(); // Loads from AsyncStorage
  
  wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: networks as any,
    transports, // Custom RPCs applied!
  });
  
  return { wagmiAdapter, appKit };
}
```

## Benefits

1. **First connection uses correct RPCs** - No need to wait for next app launch
2. **No race condition** - RPCs are loaded before WagmiAdapter creation
3. **Backward compatible** - Falls back to defaults if no stored RPCs exist
4. **Works on fresh install** - Uses initialGlobalState defaults until backend RPCs are fetched
5. **Works after import** - Already had stored RPCs, so this maintains that behavior

## Testing Considerations

1. **Fresh install** - Should use default RPCs from initialGlobalState on first WC connection
2. **After backend fetch** - Should use backend RPCs immediately on WC connection
3. **App restart** - Should continue using stored RPCs from AsyncStorage
4. **No network** - Should fall back gracefully to hardcoded defaults

## Files Modified

- `src/components/wagmiConfigBuilder/index.tsx` - Main changes
  - Added async initialization
  - Added RPC loading from AsyncStorage
  - Added transport configuration
  - Made component wait for initialization

## Related Issues

This fix specifically addresses the scenario where:
- User imports wallet → backend RPCs are fetched → stored → app restart → works ✅
- User connects WalletConnect first time → default RPCs used → backend fetched → stored → next app restart → works ✅ ❌
- After fix: User connects WalletConnect → stored/default RPCs used immediately ✅

The issue did NOT occur during wallet import because:
1. Import process waits for backend initialization
2. RPCs are fetched and stored
3. App is restarted/reloaded
4. On next launch, RPCs are already in AsyncStorage
5. WagmiAdapter (after fix) loads them before creation

## Additional Notes

- The `transports` configuration in WagmiAdapter is a documented feature by Reown/WalletConnect
- This approach follows the recommended pattern from Reown's documentation
- The singleton pattern ensures WagmiAdapter is only created once per app session
