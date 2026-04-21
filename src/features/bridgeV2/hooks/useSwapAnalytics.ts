import { useCallback, useEffect, useRef } from 'react';
import useBridgeV2Api from '../api';
import { SwapEventDto } from '../types';
import { logAnalytics } from '../../../core/util';
import { AnalyticsType } from '../../../constants/enum';

function safeStringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function reportSwapAnalyticsFailure(event: SwapEventDto, err: unknown): void {
  logAnalytics({
    type: AnalyticsType.ERROR,
    chain: event.sourceChainId,
    message: 'swap analytics post failed',
    other: {
      txHash: event.txHash,
      provider: event.provider,
      destChainId: event.destChainId,
      error: safeStringifyError(err),
    },
  });
}

function reportSwapAnalyticsSuccess(event: SwapEventDto): void {
  const { txHash, sourceChainId, ...rest } = event;
  logAnalytics({
    type: AnalyticsType.SUCCESS,
    chain: sourceChainId,
    txnHash: txHash,
    other: rest,
  });
}

export default function useSwapAnalytics() {
  const { postSwapAnalytics } = useBridgeV2Api();
  const postRef = useRef(postSwapAnalytics);
  useEffect(() => {
    postRef.current = postSwapAnalytics;
  });

  const trackSwapSuccess = useCallback((event: SwapEventDto): void => {
    void postRef
      .current(event)
      .then(res => {
        if (res.isError) {
          reportSwapAnalyticsFailure(event, res.error);
          return;
        }
        reportSwapAnalyticsSuccess(event);
      })
      .catch(err => {
        reportSwapAnalyticsFailure(event, err);
      });
  }, []);

  return { trackSwapSuccess };
}
