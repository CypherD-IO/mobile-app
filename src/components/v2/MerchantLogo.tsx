import React, { useState } from 'react';
import { CyDView, CyDText, CyDImage } from '../../styles/tailwindComponents';
import { MerchantLogoProps } from '../../models/merchantLogo.interface';
import { getMerchantLogoProps } from '../../utils/merchantUtils';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import { SvgUri } from 'react-native-svg';
import { isSvgUrl, toProxyUrl } from '../../core/util';

export const MerchantLogo: React.FC<MerchantLogoProps> = ({
  merchant,
  size = 64,
  className = '',
  showBorder = true,
  hasUserVoted = false,
}) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const { hasLogo, logoUrl, fallbackText, fontSize } = getMerchantLogoProps(
    merchant,
    size,
  );

  const baseClasses =
    'bg-white rounded-full items-center justify-center relative overflow-hidden p-1';
  const borderClasses = hasUserVoted
    ? 'border-[3px] border-orange500'
    : showBorder && !isDarkMode
      ? 'border-[1px] border-n40'
      : 'border-0';

  const [loadFailed, setLoadFailed] = useState(false);
  const [usedProxy, setUsedProxy] = useState(false);
  const [mode, setMode] = useState<'svg' | 'img'>(
    isSvgUrl(String(logoUrl)) ? 'svg' : 'img',
  );
  const [currentUri, setCurrentUri] = useState<string>(String(logoUrl ?? ''));
  const showImage = hasLogo && !!currentUri && !loadFailed;
  const isSvg = showImage && mode === 'svg';

  return (
    <CyDView
      className={`${baseClasses} ${borderClasses} ${className}`}
      style={{ width: size, height: size }}>
      {showImage ? (
        isSvg ? (
          <SvgUri
            uri={currentUri}
            width={size - size / 3}
            height={size - size / 3}
            onError={() => {
              // Fall back to raster rendering path
              setMode('img');
            }}
          />
        ) : (
          // Use CyDImage for broader compatibility with PNG/JPG
          <CyDImage
            source={{ uri: currentUri }}
            className='w-full h-full rounded-full'
            resizeMode='contain'
            onError={() => {
              if (!usedProxy && currentUri) {
                setUsedProxy(true);
                setCurrentUri(toProxyUrl(currentUri));
              } else {
                setLoadFailed(true);
              }
            }}
          />
        )
      ) : (
        <CyDText
          className='font-bold text-gray-800 text-center leading-none'
          style={{ fontSize }}>
          {fallbackText}
        </CyDText>
      )}
    </CyDView>
  );
};

export default MerchantLogo;
