import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDImage,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import AppImages from '../../../assets/images/appImages';

interface AgentErrorStateProps {
  onRetry: () => void;
}

export default function AgentErrorState({ onRetry }: AgentErrorStateProps) {
  const { t } = useTranslation();

  // Cypher Agent screen forces a dark theme to keep the native shell visually
  // continuous with the dApp WebView. The hex colors below (#0D0D0D background
  // and #8A8A8A muted text, plus `text-white` for the title) are pinned on
  // purpose so this surface stays dark regardless of the user's theme choice.
  return (
    <CyDView className='absolute top-0 left-0 right-0 bottom-0 bg-[#0D0D0D] z-10 flex items-center justify-center px-[32px]'>
      <CyDImage
        source={AppImages.BROWSER_NOINTERNET}
        className='w-[120px] h-[120px] mb-[24px]'
        resizeMode='contain'
      />
      <CyDText className='text-white text-[18px] font-bold text-center mb-[8px]'>
        {t('AGENT_UNAVAILABLE', 'Unable to load Cypher Agent')}
      </CyDText>
      <CyDText className='text-[#8A8A8A] text-[14px] text-center mb-[32px]'>
        {t(
          'AGENT_UNAVAILABLE_DESC',
          'Please check your internet connection and try again.',
        )}
      </CyDText>
      <CyDView className='w-full'>
        <Button
          title={t('RETRY', 'Retry')}
          type={ButtonType.PRIMARY}
          onPress={onRetry}
        />
      </CyDView>
    </CyDView>
  );
}
