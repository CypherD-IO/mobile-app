# useRewardsDistributor Hook

Custom React hook for interacting with the Rewards Distributor smart contract on Base Sepolia chain.

## Contract Details

- **Address**: `0x355a548FE06ba5CBa40d3e011179B67bb553f9A9`
- **Chain**: Base Sepolia (Chain ID: 84532 / 0x14a34)
- **Network**: Testnet

## Features

- ✅ Claim multiple rewards with Merkle proofs
- ✅ Automatic chain switching to Base Sepolia
- ✅ Support for both WalletConnect and native wallet
- ✅ Gas estimation with 20% buffer
- ✅ Transaction receipt confirmation
- ✅ Comprehensive error handling
- ✅ User-friendly modals for errors and warnings
- ✅ Full TypeScript support

## Usage

### Basic Import

```typescript
import useRewardsDistributor from '../../hooks/useRewardsDistributor';
```

### Initialize Hook

```typescript
const { claimRewards, estimateClaimGas, encodeClaimMultiple } =
  useRewardsDistributor();
```

### Claim Rewards

```typescript
const handleClaimRewards = async () => {
  try {
    // Prepare claim parameters
    const claimParams = {
      proofs: [
        // Array of Merkle proofs (each proof is an array of bytes32 hashes)
        ['0x...', '0x...', '0x...'],
        ['0x...', '0x...'],
      ],
      rootIds: [
        1n, // First root ID (as BigInt)
        2n, // Second root ID
      ],
      values: [
        1000000000000000000n, // Amount to claim for first root (1 token with 18 decimals)
        2000000000000000000n, // Amount to claim for second root (2 tokens)
      ],
      fromAddress: '0xYourEthereumAddress' as `0x${string}`,
    };

    // Execute claim
    const result = await claimRewards(claimParams);

    if (result.success) {
      console.log('✅ Rewards claimed successfully!');
      console.log('Transaction hash:', result.hash);
    } else {
      console.error('❌ Claim failed:', result.error);
    }
  } catch (error) {
    console.error('Error claiming rewards:', error);
  }
};
```

### Estimate Gas (Optional)

```typescript
const estimateGas = async () => {
  const claimParams = {
    proofs: [...],
    rootIds: [1n, 2n],
    values: [1000000000000000000n, 2000000000000000000n],
    fromAddress: '0xYourAddress' as `0x${string}`,
  };

  const gasEstimate = await estimateClaimGas(claimParams);
  console.log('Estimated gas:', gasEstimate.toString());
};
```

### Encode Function Call (For Testing)

```typescript
const encoded = encodeClaimMultiple({
  proofs: [...],
  rootIds: [1n, 2n],
  values: [1000000000000000000n, 2000000000000000000n],
  fromAddress: '0xYourAddress' as `0x${string}`,
});

console.log('Encoded function call:', encoded);
```

## API Reference

### `claimRewards(params: ClaimRewardsParams): Promise<ClaimResult>`

Main function to claim rewards with Merkle proofs.

**Parameters:**

- `params.proofs` - Array of Merkle proofs (array of arrays of bytes32 hashes)
- `params.rootIds` - Array of root IDs (BigInt[])
- `params.values` - Array of token amounts to claim (BigInt[])
- `params.fromAddress` - User's Ethereum address

**Returns:**

```typescript
{
  hash: `0x${string}`,  // Transaction hash
  success: boolean,      // Whether claim was successful
  error?: string         // Error message if failed
}
```

### `estimateClaimGas(params: ClaimRewardsParams): Promise<bigint>`

Estimates gas required for the claim transaction (with 20% buffer).

### `encodeClaimMultiple(params: ClaimRewardsParams): `0x${string}`

Encodes the claimMultiple function call data (useful for testing or manual transactions).

### Properties

- `contractAddress` - The Rewards Distributor contract address
- `chain` - Base Sepolia chain configuration

## Types

### `ClaimRewardsParams`

```typescript
interface ClaimRewardsParams {
  proofs: `0x${string}`[][]; // Array of Merkle proofs
  rootIds: bigint[]; // Array of root IDs
  values: bigint[]; // Array of claim amounts
  fromAddress: `0x${string}`; // User's address
}
```

### `ClaimResult`

```typescript
interface ClaimResult {
  hash: `0x${string}`; // Transaction hash
  success: boolean; // Success status
  error?: string; // Error message if failed
}
```

## Error Handling

The hook includes comprehensive error handling:

1. **Parameter Validation** - Ensures all arrays have the same length
2. **Chain Switching** - Automatically switches to Base Sepolia if needed
3. **Gas Estimation** - Falls back to reasonable default if estimation fails
4. **Transaction Timeout** - 60-second timeout for user signing
5. **User Modals** - Shows user-friendly error messages
6. **Sentry Logging** - Captures exceptions for monitoring

## Common Issues

### Chain Not Switching

If the chain doesn't switch automatically:

1. Check that your wallet supports Base Sepolia
2. Manually switch to Base Sepolia in your wallet
3. Try the transaction again

### Transaction Timeout

If transaction times out:

1. Check your wallet app is open and responsive
2. Ensure you have sufficient ETH for gas on Base Sepolia
3. Try again with a shorter claim array

### Gas Estimation Failed

If gas estimation fails:

- The hook uses a default of 500,000 gas units
- You can manually adjust gas in the contract call if needed

## Example: Complete Implementation

```typescript
import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import useRewardsDistributor from '../../hooks/useRewardsDistributor';

const ClaimRewardsScreen = () => {
  const { claimRewards } = useRewardsDistributor();
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleClaim = async () => {
    setClaiming(true);

    try {
      const result = await claimRewards({
        proofs: [
          ['0xproof1hash1', '0xproof1hash2'],
          ['0xproof2hash1', '0xproof2hash2', '0xproof2hash3'],
        ],
        rootIds: [1n, 2n],
        values: [
          BigInt('1000000000000000000'), // 1 token
          BigInt('2000000000000000000'), // 2 tokens
        ],
        fromAddress: '0xYourEthereumAddress' as `0x${string}`,
      });

      if (result.success) {
        setTxHash(result.hash);
        console.log('Success! Transaction:', result.hash);
      } else {
        console.error('Claim failed:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <View>
      <Button
        title={claiming ? 'Claiming...' : 'Claim Rewards'}
        onPress={handleClaim}
        disabled={claiming}
      />
      {txHash && <Text>Transaction: {txHash}</Text>}
    </View>
  );
};

export default ClaimRewardsScreen;
```

## Testing

To test the hook:

1. **Testnet ETH**: Ensure you have testnet ETH on Base Sepolia
2. **Valid Proofs**: Use valid Merkle proofs from the contract
3. **Correct Root IDs**: Ensure root IDs match the contract's Merkle roots
4. **Full Amounts**: You must claim the full amount for each root ID

## Dependencies

- `wagmi` - Ethereum wallet integration
- `viem` - Ethereum utilities and ABI encoding
- `@reown/appkit-react-native` - AppKit for WalletConnect integration
- `@sentry/react-native` - Error tracking

## Notes

- The hook automatically adds a 20% buffer to gas estimates for safety
- Transactions timeout after 60 seconds if not signed
- Chain switching is handled automatically for WalletConnect users
- All amounts are in Wei (1 token = 1e18 Wei for 18-decimal tokens)
- Merkle proofs must be provided as arrays of bytes32 hashes in hex format

## Support

For issues or questions:

1. Check the console logs for detailed error messages
2. Verify contract address and chain ID are correct
3. Ensure you have valid Merkle proofs
4. Check Sentry for captured exceptions
