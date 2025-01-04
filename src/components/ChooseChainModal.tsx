import React, { useContext } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { HdWalletContext, getAvailableChains } from '../core/util';
import { ALL_CHAINS, Chain, ChainBackendNames } from '../constants/server';
import { Colors } from '../constants/theme';
import {
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
import clsx from 'clsx';
import LottieView from 'lottie-react-native';

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
            <CyDImage
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
              {item.backendName === ChainBackendNames.SOLANA && (
                <LottieView
                  source={AppImages.NEW}
                  autoPlay
                  loop
                  style={styles.lottieViewWidth}
                />
              )}
            </CyDView>
          </CyDView>
          {isSelected && (
            <CyDFastImage
              source={AppImages.CORRECT}
              tintColor={Colors.black}
              className='h-[16px] w-[16px] flex-shrink-0'
              resizeMode='contain'
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
          className={'z-[50]'}>
          <CyDImage
            source={AppImages.CLOSE}
            className={
              ' w-[22px] h-[22px] z-[50] absolute right-[4px] top-[4px] '
            }
          />
        </CyDTouchView>
        <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
          {t('CHOOSE_CHAIN')}
        </CyDText>
        <FlatList
          data={
            where === WHERE_PORTFOLIO
              ? getAvailableChains(hdWallet)
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
  lottieViewWidth: {
    width: 34,
    marginRight: 40,
  },
});
