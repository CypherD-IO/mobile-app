import React from 'react';
import { CyDText } from '../../../styles/tailwindComponents';

export default function BlindPayKycFieldError({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }
  return (
    <CyDText className='text-[12px] font-medium text-errorText mt-[4px] leading-[1.35]'>
      {message}
    </CyDText>
  );
}
