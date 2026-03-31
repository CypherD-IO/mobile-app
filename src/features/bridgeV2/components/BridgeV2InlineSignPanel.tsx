import React from 'react';
import { CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindComponents';
import type { BridgeV2SignReviewPayload } from '../types';
import BridgeV2SwipeToSignBar from './BridgeV2SwipeToSignBar';

type Props = {
  payload: BridgeV2SignReviewPayload;
  onSwipeSign: () => void;
  onReject: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <CyDView className='flex-row justify-between py-[5px] border-b border-n20 last:border-b-0'>
      <CyDText className='text-[11px] font-medium text-base150 flex-shrink mr-[8px]'>{label}</CyDText>
      <CyDText className='text-[11px] font-semibold text-base400 flex-1 text-right' numberOfLines={4}>
        {value}
      </CyDText>
    </CyDView>
  );
}

/**
 * Compact sign confirmation embedded in the bridge processing screen (no modal).
 */
export default function BridgeV2InlineSignPanel({ payload, onSwipeSign, onReject }: Props) {
  const { inline } = payload;

  return (
    <CyDView className='mx-[16px] mb-[10px]'>
      <CyDText className='text-[15px] font-semibold text-base400 mb-[8px]' numberOfLines={2}>
        {inline.headline}
      </CyDText>

      <CyDView className='bg-n40 rounded-[10px] overflow-hidden px-[12px] py-[8px] mb-[10px]'>
        <Row label='Network' value={inline.network} />
        {inline.youSendLine ? <Row label='You send' value={inline.youSendLine} /> : null}
        {inline.youReceiveLine ? <Row label='Est. receive' value={inline.youReceiveLine} /> : null}
        {inline.signer ? <Row label='Signer' value={inline.signer} /> : null}
        <Row label='Message' value={inline.message} />
        <Row label={inline.amountLabel} value={inline.amountValue} />
        {inline.recipientLabel && inline.recipientValue ? (
          <Row label={inline.recipientLabel} value={inline.recipientValue} />
        ) : null}
        {inline.extraLabel && inline.extraValue ? (
          <Row label={inline.extraLabel} value={inline.extraValue} />
        ) : null}
      </CyDView>

      <CyDView className='flex-row items-center gap-[10px]'>
        <CyDView className='flex-1 min-w-0'>
          <BridgeV2SwipeToSignBar visible onSwipeComplete={onSwipeSign} />
        </CyDView>
        <CyDTouchView
          onPress={onReject}
          className='h-[44px] w-[72px] shrink-0 rounded-[8px] items-center justify-center bg-transparent border border-red300 active:opacity-70'>
          <CyDText className='text-[13px] font-semibold text-base400'>Reject</CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
}
