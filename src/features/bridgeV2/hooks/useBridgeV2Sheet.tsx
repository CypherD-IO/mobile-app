import React, { useCallback } from 'react';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import BridgeV2Content from '../screens/BridgeV2Screen';
import { getBridgeExecutors } from '../executionBridge';
import { Holding } from '../../../core/portfolio';

export const BRIDGE_V2_SHEET_ID = 'bridgeV2';

/** @deprecated Prefer {@link OpenBridgeV2Params} object form for `onBridgeSuccess`. */
export type OpenBridgeV2LegacyArg = Holding[];

export type OpenBridgeV2Params = {
  portfolioHoldings?: Holding[];
  /** Token Overview / deep link: pre-fill From chain + token. */
  initialFromHolding?: Holding;
  /** Called once when a bridge/swap reaches the success state (after execution + polling). */
  onBridgeSuccess?: () => void | Promise<void>;
};

export type OpenBridgeV2Arg = OpenBridgeV2LegacyArg | OpenBridgeV2Params | undefined;

function normalizeOpenBridgeV2Arg(
  arg: OpenBridgeV2Arg,
): {
  portfolioHoldings?: Holding[];
  initialFromHolding?: Holding;
  onBridgeSuccess?: () => void | Promise<void>;
} {
  if (arg === undefined) return {};
  if (Array.isArray(arg)) return { portfolioHoldings: arg };
  return {
    portfolioHoldings: arg.portfolioHoldings,
    initialFromHolding: arg.initialFromHolding,
    onBridgeSuccess: arg.onBridgeSuccess,
  };
}

export default function useBridgeV2Sheet() {
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  const openBridgeV2 = useCallback(
    (arg?: OpenBridgeV2Arg) => {
      const executors = getBridgeExecutors();
      if (!executors) {
        console.warn('[BridgeV2] Execution hooks not registered yet');
        return;
      }

      const { portfolioHoldings, initialFromHolding, onBridgeSuccess } =
        normalizeOpenBridgeV2Arg(arg);

      showBottomSheet({
        id: BRIDGE_V2_SHEET_ID,
        snapPoints: ['55%', '95%'],
        showCloseButton: false,
        showHandle: true,
        scrollable: false,
        enableContentPanningGesture: false,
        content: (
          <BridgeV2Content
            executors={executors}
            portfolioHoldings={portfolioHoldings}
            initialFromHolding={initialFromHolding}
            onBridgeSuccess={onBridgeSuccess}
          />
        ),
        onClose: () => hideBottomSheet(BRIDGE_V2_SHEET_ID),
      });
    },
    [showBottomSheet, hideBottomSheet],
  );

  const closeBridgeV2 = useCallback(() => {
    hideBottomSheet(BRIDGE_V2_SHEET_ID);
  }, [hideBottomSheet]);

  return { openBridgeV2, closeBridgeV2 };
}
