import { t } from 'i18next';
import React from 'react';
import {
  CyDImage,
  CyDText,
  CyDView
} from '../../styles/tailwindStyles';
import CyDTokenAmount from './tokenAmount';
import CyDTokenValue from './tokenValue';

interface TokenSummaryProps {
  tokenImage: string
  totalTokens: string
  tokenName: string
  totalBalance: string
  isStakingAvailable: boolean
  tokenPrice: string
}

const TokenSummary = ({ tokenImage, totalTokens, tokenName, totalBalance, isStakingAvailable, tokenPrice }: TokenSummaryProps) => {
  return (
        <CyDView>
            <CyDView className={'flex flex-row justify-center'}>
                <CyDImage source={{ uri: tokenImage }} className={' w-[68px] h-[68px]'} />
            </CyDView>
            <CyDView>
              <CyDText className={'text-center mt-[14px] text-[16px] color-[#929292]'}>{tokenPrice}</CyDText>
            </CyDView>
            <CyDView>
                <CyDText className={'text-center text-[18px] mt-[8px] font-semibold'}>{t<string>('TOTAL_BALANCE')}</CyDText>
            </CyDView>
            {isStakingAvailable && <CyDView><CyDText className={'text-center text-[16px] color-[#929292]'}>{`(${t('INCLUDING_STAKED_TOKENS')})`}</CyDText></CyDView>}
            <CyDView className='flex flex-row flex-wrap justify-center px-[18px]'>
                <CyDTokenAmount className={'text-[30px] mt-[14px] font-bold'} decimalPlaces={5}>{totalTokens}</CyDTokenAmount>
                <CyDText className={'text-[30px] mt-[14px] ml-[7px] font-bold'}>{tokenName}</CyDText>
            </CyDView>
            <CyDView>
              <CyDTokenValue className={'text-center font-semibold text-[20px] mt-[8px]'}>{totalBalance}</CyDTokenValue>
            </CyDView>
        </CyDView>
  );
};

export default TokenSummary;
