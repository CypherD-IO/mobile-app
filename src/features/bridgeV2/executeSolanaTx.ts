import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import useSolanaSigner from '../../hooks/useSolana';
import { BridgeV2ExecutionResult } from './types';

export default function useSolanaExecution() {
  const { getSolanWallet, getSolanaRpc } = useSolanaSigner();

  async function executeSolanaTransaction(
    serializedTransaction: string,
  ): Promise<BridgeV2ExecutionResult> {
    const fromKeypair = await getSolanWallet();
    if (!fromKeypair) {
      return { isError: true, error: 'Unable to generate Solana wallet' };
    }

    const rpc = getSolanaRpc();
    if (!rpc) {
      return { isError: true, error: 'Solana RPC endpoint not configured' };
    }

    const connection = new Connection(rpc, 'confirmed');
    const decodedTxn = Buffer.from(serializedTransaction, 'base64');
    const u8 = Uint8Array.from(decodedTxn);

    let rawSigned: Uint8Array;
    let versionedTx: VersionedTransaction | null = null;
    try {
      versionedTx = VersionedTransaction.deserialize(u8);
    } catch {
      // Not a versioned transaction — fall through to legacy path
    }

    if (versionedTx) {
      try {
        versionedTx.sign([fromKeypair]);
        rawSigned = versionedTx.serialize();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to sign versioned Solana transaction';
        return { isError: true, error: msg };
      }
    } else {
      try {
        const tx = Transaction.from(decodedTxn);
        tx.partialSign(fromKeypair);
        rawSigned = tx.serialize();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to parse Solana transaction';
        return { isError: true, error: msg };
      }
    }

    try {
      const signature = await connection.sendRawTransaction(rawSigned, {
        skipPreflight: false,
        maxRetries: 2,
      });
      const signedBase64 = Buffer.from(rawSigned).toString('base64');
      return {
        isError: false,
        /** Base58 tx id for LiFi `/bridge/status` and explorers */
        hash: signature,
        txn: signedBase64,
        chainId: 'solana',
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to submit Solana transaction';
      return { isError: true, error: msg };
    }
  }

  return { executeSolanaTransaction };
}
