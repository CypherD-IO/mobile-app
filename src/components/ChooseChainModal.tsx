import React, { useContext } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { HdWalletContext, PortfolioContext } from '../core/util';
import { ALL_CHAINS, ALL_CHAINS_WITH_COLLECTION } from '../constants/server';
import * as C from '../constants/index';
import { Colors } from '../constants/theme';
import { DynamicTouchView } from '../styles/viewStyle';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
const {
  CText,
  DynamicView,
  DynamicImage
} = require('../styles');

export const WHERE_BROWSER = 'BROWSER';
export const WHERE_PORTFOLIO = 'PORTFOLIO';

export function ChooseChainModal (props) {
  const { isModalVisible, onPress, where } = props;
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);

  const renderItem = (item) => {
    return (
      <>
        {where === WHERE_BROWSER
          ? (
          <DynamicTouchView sentry-label='browser-chain-choose-selection' dynamic dynamicWidth width={100} fD='row' mT={2} bR={15} pH={8} pV={8}
            bGC={item.item.id == hdWallet.state.selectedChain.id ? 'rgba(88, 173, 171, 0.09)' : Colors.whiteColor}
            onPress={() => {
              hdWallet.dispatch({ type: 'CHOOSE_CHAIN', value: { selectedChain: item.item } });
              onPress();
            }} jC={'flex-start'}>
            <DynamicImage dynamic source={item.item.logo_url} width={25} height={25} />
            <DynamicView dynamic dynamicWidth width={70} aLIT={'flex-start'}>
              <CyDText className='ml-[8px] font-bold text-[16px] text-secondaryTextColor'>{item.item.name}</CyDText>
              <CyDText className='ml-[8px] font-bold text-[12px] text-subTextColor'>{item.item.symbol}</CyDText>
            </DynamicView>
            {item.item.id == hdWallet.state.selectedChain.id &&
              <DynamicView dynamic dynamicWidth width={25} jC={'flex-end'}>
                <DynamicImage dynamic dynamicTintColor tC={Colors.toastColor} source={AppImages.CORRECT} width={15} height={10} />
              </DynamicView>
            }
          </DynamicTouchView>
            )
          : (
          <DynamicTouchView sentry-label='portfolio-chain-choose-selection' dynamic dynamicWidth width={100} fD='row' mT={2} bR={15} pH={8} pV={8}
            bGC={item.item.id == portfolioState.statePortfolio.selectedChain.id ? 'rgba(88, 173, 171, 0.09)' : Colors.whiteColor}
            onPress={() => {
              portfolioState.dispatchPortfolio({ value: { selectedChain: item.item } });
              onPress();
            }} jC={'flex-start'}>
            <DynamicImage dynamic source={item.item.logo_url} width={25} height={25} />
            <DynamicView dynamic dynamicWidth width={70} aLIT={'flex-start'}>
              <CyDText className='ml-[8px] font-bold text-[16px] text-secondaryTextColor'>{item.item.name}</CyDText>
              <CyDText className='ml-[8px] font-bold text-[12px] text-subTextColor'>{item.item.symbol}</CyDText>
            </DynamicView>
            {item.item.id == portfolioState.statePortfolio.selectedChain.id &&
              <DynamicView dynamic dynamicWidth width={25} jC={'flex-end'}>
                <DynamicImage dynamic dynamicTintColor tC={Colors.toastColor} source={AppImages.CORRECT} width={15} height={10} />
              </DynamicView>
            }
          </DynamicTouchView>
            )}
      </>
    );
  };

  return (
    <CyDModalLayout setModalVisible={() => {}} isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
      <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
        <CyDTouchView onPress={() => { onPress(); }} className={'z-[50]'}>
          <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
        </CyDTouchView>
        <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>{t('CHOOSE_CHAIN')}</CyDText>

              <FlatList
                data={where === WHERE_PORTFOLIO ? ALL_CHAINS_WITH_COLLECTION : ALL_CHAINS}
                renderItem={(item) => renderItem(item)}
                style={styles.chainList}
                showsVerticalScrollIndicator={true}
              />
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
    height: '50%'
  },
  chainList: {
    height: '50%',
    marginTop: '10%'
  }
});
