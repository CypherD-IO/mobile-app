import clsx from 'clsx';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet } from 'react-native';
import { ALL_CHAINS, Chain } from '../constants/server';
import { HdWalletContext, getAvailableChains } from '../core/util';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import CyDModalLayout from './v2/modal';
import { HdWalletContextDef } from '../reducers/hdwallet_reducer';

export const WHERE_BROWSER = 'BROWSER';
export const WHERE_PORTFOLIO = 'PORTFOLIO';

export function ChooseChainModal(props: {
  isModalVisible: boolean;
  onPress: () => void;
  where: string;
  selectedChain: Chain;
  setSelectedChain: React.Dispatch<React.SetStateAction<Chain>>;
}) {
  const { isModalVisible, onPress, where, selectedChain, setSelectedChain } =
    props;
  const { t } = useTranslation();
  const hdWallet = useContext(HdWalletContext);

  const onChainSelection = (chain: Chain) => {
    hdWallet?.dispatch({
      type: 'CHOOSE_CHAIN',
      value: { selectedChain: chain },
    });
    setSelectedChain(chain);
    onPress();
  };

  const renderItem = ({ item }: { item: Chain }) => {
    const { logo_url: logoUrl, name, symbol } = item;
    const selectedChainId =
      where === WHERE_BROWSER
        ? hdWallet?.state.selectedChain.id
        : selectedChain.id;
    const isSelected = item.id === selectedChainId;
    return (
      <CyDTouchView
        className={clsx('px-[12px] rounded-[8px] w-full bg-n20', {
          'bg-p10': isSelected,
        })}
        onPress={() => {
          onChainSelection(item);
        }}>
        <CyDView className='flex flex-row justify-between items-center my-[8px]'>
          <CyDView className='flex flex-row items-center flex-1'>
            <CyDFastImage
              source={logoUrl}
              className='h-[28px] w-[28px] flex-shrink-0'
              resizeMode='contain'
            />
            <CyDView className='flex flex-row flex-1 justify-between'>
              <CyDView>
                <CyDText className='ml-[8px] font-bold text-[16px] text-base400'>
                  {name}
                </CyDText>
                <CyDText className='ml-[8px] mt-[2px] font-bold text-[12px] text-n90'>
                  {symbol}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
          {isSelected && (
            <CyDMaterialDesignIcons
              name='check-outline'
              size={16}
              className='text-base400'
            />
          )}
        </CyDView>
      </CyDTouchView>
    );
  };

  return (
    <CyDModalLayout
      setModalVisible={() => {}}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView
        className={
          'bg-n20 pt-[12px] px-[12px] pb-[30px] rounded-t-[24px] relative'
        }>
        <CyDTouchView
          onPress={() => {
            onPress();
          }}
          className={'z-[50] self-end'}>
          <CyDMaterialDesignIcons
            name={'close'}
            size={24}
            className='text-base400 '
          />
        </CyDTouchView>
        <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
          {t('CHOOSE_CHAIN')}
        </CyDText>
        <FlatList
          data={
            where === WHERE_PORTFOLIO
              ? getAvailableChains(hdWallet as HdWalletContextDef)
              : ALL_CHAINS
          }
          renderItem={item => renderItem(item)}
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
    height: '50%',
  },
  chainList: {
    height: '50%',
    marginTop: '10%',
  },
});
