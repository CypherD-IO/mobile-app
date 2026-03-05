import React from 'react';
import { CyDText, CyDView } from '../../styles/tailwindComponents';

const TokenInitialsIcon = ({
  symbol,
  size = 36,
}: {
  symbol: string;
  size?: number;
}) => {
  const initials = symbol.slice(0, 4).toUpperCase();
  const fontSize = size * 0.32;
  return (
    <CyDView
      className='rounded-full bg-n40 justify-center items-center'
      style={{ width: size, height: size }}>
      <CyDText
        className='font-bold text-activityFontColor'
        style={{ fontSize }}>
        {initials}
      </CyDText>
    </CyDView>
  );
};

export default TokenInitialsIcon;
