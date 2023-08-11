import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';
import { getMaskedAddress, copyToClipboard } from '../../core/util';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import * as C from '../../constants';
import Toast from 'react-native-toast-message';
import { TransactionType } from '../../constants/transactions';
import { APPLICATION_ADDRESS_NAME_MAP } from '../../constants/data';

export const chainExplorerMapping: Record<string, string> = {
  ETH: 'https://etherscan.io/tx/',
  POLYGON: 'https://polygonscan.com/tx/',
  BSC: 'https://bscscan.com/tx/',
  AVALANCHE: 'https://explorer.avax.network/tx/',
  ARBITRUM: 'https://arbiscan.io/tx/',
  OPTIMISM: 'https://optimistic.etherscan.io/tx/',
  FANTOM: 'https://ftmscan.com/tx/',
  EVMOS: 'https://escan.live/tx/',
  COSMOS: 'https://www.mintscan.io/cosmos/txs/',
  OSMOSIS: 'https://www.mintscan.io/osmosis/txs/',
  JUNO: 'https://www.mintscan.io/juno/txs/',
  STARGAZE: 'https://www.mintscan.io/stargaze/txs/',
  NOBLE: 'https://www.mintscan.io/noble/txs/'
};

const getTransactionDestinationDetails = (type: string, from: string, to: string) => {
  let destination = 'Application';
  let transactionAddress;
  switch (type) {
    case TransactionType.SELF:
    case TransactionType.SEND:
      destination = 'To';
      transactionAddress = getMaskedAddress(to);
      break;
    case TransactionType.RECEIVE:
      destination = 'From';
      transactionAddress = getMaskedAddress(from);
      break;
    default:
      transactionAddress = to;
      if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
        transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(transactionAddress) as string;
      } else {
        transactionAddress = getMaskedAddress(transactionAddress);
      }
  }

  return [destination, transactionAddress];
};

export default function TransactionInfoModal ({
  isModalVisible,
  setModalVisible,
  params,
  navigationRef
}: {
  isModalVisible: boolean
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>
  params: {
    timestamp: string
    blockchain: string
    hash: string
    gas: string
    type: string
    from: string
    to: string
    value: string
    token: string | null
    tokenIcon: string | null
    fromToken: string | null
    fromTokenValue: string | null
    toToken: string | null
    fromTokenIcon: string | null
    toTokenIcon: string | null
    status: string
  } | null
  navigationRef: any
}) {
  const viewRef = useRef();
  const { t } = useTranslation();

  const copyHash = (url: string) => {
    copyToClipboard(url);
    Toast.show(t('COPIED_TO_CLIPBOARD'));
  };

  if (params !== null) {
    const { timestamp, blockchain, hash, gas, type, from, to, value, token, tokenIcon, fromToken, fromTokenValue, toToken, fromTokenIcon, toTokenIcon, status } = params;
    const [destination, transactionAddress] = getTransactionDestinationDetails(type, from, to);
    const chain = blockchain.charAt(0).toUpperCase() + blockchain.slice(1).toLowerCase();

    const RenderTransactionHeader = () => {
      const title = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Unknown';
      const displayTitle = title || 'Unknown Transaction';
      return (
        <CyDView>
          <CyDText className='text-center font-nunito text-[20px] font-extrabold text-activityFontColor'>
            {displayTitle}
          </CyDText>
          <CyDText className='text-center font-nunito text-[12px] ml-[5px] text-primarsubTextColor'>
            {`${timestamp}`}
          </CyDText>
        </CyDView>
      );
    };

    const RenderTransactionInfo = () => {
      if (type === 'swap') {
        return (
        <CyDView className='flex flex-row justify-evenly items-center w-full '>
            <CyDView className='flex flex-row items-center '>
                {fromTokenIcon
                  ? <CyDImage
                    source={{ uri: fromTokenIcon }}
                    className={'w-[25px] h-[25px]'}
                />
                  : <CyDImage
                source= {AppImages.UNKNOWN_TXN_TOKEN}
                className={'w-[25px] h-[25px]'}
            />}
                {fromToken
                  ? (
                  <CyDView className='flex flex-col item-start'>
                    <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{fromToken}</CyDText>
                    {blockchain && (
                      <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>
                        {chain}
                      </CyDText>
                    )}
                  </CyDView>
                    )
                  : <CyDView className='flex flex-col item-start'>
                <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{'Unknown'}</CyDText>
                {blockchain && (
                  <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>
                    {chain}
                  </CyDText>
                )}
              </CyDView> }
            </CyDView>
            <CyDImage
                  source={ AppImages.SWAP_SUCCESS}
                  className={'w-[24px] h-[24px]'}
            />
            <CyDView className='flex flex-row items-center '>
                {toTokenIcon
                  ? <CyDImage
                    source={{ uri: toTokenIcon }}
                    className={'w-[25px] h-[25px]'}
                />
                  : <CyDImage
                source= {AppImages.UNKNOWN_TXN_TOKEN}
                className={'w-[25px] h-[25px]'}
            />}
                {toToken
                  ? (
                  <CyDView className='flex flex-col item-start'>
                    <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{toToken}</CyDText>
                    {blockchain && (
                      <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>
                        {chain}
                      </CyDText>
                    )}
                  </CyDView>
                    )
                  : <CyDView className='flex flex-col item-start'>
                <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{'Unknown'}</CyDText>
                {blockchain && (
                  <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>
                    {chain}
                  </CyDText>
                )}
              </CyDView> }
            </CyDView>
        </CyDView>
        );
      } else if (type === 'approve' || type === 'revoke') {
        return (
          <CyDView className={clsx('flex flex-row flex-wrap w-[100%] my-[3%] item-center justify-center')}>
              <CyDView className='flex flex-row items-center'>
                {tokenIcon && <CyDImage
                    source={{ uri: tokenIcon }}
                    className={'w-[25px] h-[25px]'}
                />}
                {token
                  ? (
                  <CyDView className='flex flex-col'>
                    <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{token}</CyDText>
                    {blockchain && <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>{chain}</CyDText>}
                  </CyDView>
                    )
                  : (
                  <CyDView className='flex flex-col'>
                    <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{'Unknown'}</CyDText>
                    {blockchain && <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>{chain}</CyDText>}
                  </CyDView>
                    )}
              </CyDView>
          </CyDView>
        );
      } else {
        return (
          <CyDView className={clsx('flex flex-row flex-wrap w-[100%] my-[3%] item-center justify-between')}>
              <CyDView className='flex flex-row items-center ml-[20px]'>
                {tokenIcon
                  ? <CyDImage
                    source={{ uri: tokenIcon }}
                    className={'w-[25px] h-[25px]'}
                />
                  : <CyDImage
                source= {AppImages.UNKNOWN_TXN_TOKEN}
                className={'w-[25px] h-[25px]'}
            />}
                {token
                  ? (
                  <CyDView className='flex flex-col'>
                    <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{token}</CyDText>
                    {blockchain && <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>{chain}</CyDText>}
                  </CyDView>
                    )
                  : <CyDView className='flex flex-col'>
                <CyDText className='font-nunito text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>{'Unknown'}</CyDText>
                {blockchain && <CyDText className='font-nunito text-[12px] ml-[10px] mt-[2px]'>{chain}</CyDText>}
              </CyDView> }
              </CyDView>
              <CyDView className='w-[40%] flex justify-center items-end pr-[18px]'>
                  <CyDText numberOfLines={1} className=' font-nunito text-[14px] font-bold text-activityFontColor'>{`${parseFloat(value).toFixed(4)}`}</CyDText>
              </CyDView>
          </CyDView>
        );
      }
    };

    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style = {styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
      >
        <CyDView className={'bg-white pb-[30px] rounded-t-[20px]'} ref={viewRef}>
          <CyDTouchView className={'flex flex-row justify-end z-10'}
            onPress={() => { setModalVisible(false); }}
          >

            <CyDImage
              source={ AppImages.CLOSE }
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView className='flex mt-[5%] justify-center items-center '>
              <RenderTransactionHeader/>
          </CyDView>
          <CyDView className='flex flex-col px-[40px]' >
            <CyDView className='flex flex-row justify-start align-center'>
              <CyDView className='w-[100%] justify-between items-center bg-secondaryBackgroundColor rounded-[8px] my-[8px] py-[8px]'>
                  <RenderTransactionInfo/>
              </CyDView>
            </CyDView>
              <CyDView className = 'flex flex-col bg-secondaryBackgroundColor rounded-[8px] mt-[5px]'>
                  <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-sepratorColor ml-[20px]'>
                        <CyDText className='font-nunito text-[16px] w-[40%] text-activityFontColor'>
                          {destination}
                        </CyDText>
                        <CyDText className='font-nunito text-[16px] font-bold  text-activityFontColor'>
                        {transactionAddress }
                        </CyDText>
                  </CyDView>
                  <CyDView>
                        {type === 'swap' && <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-sepratorColor ml-[20px]'>
                              <CyDText className='font-nunito text-[16px] w-[40%] text-activityFontColor'>
                                {'Value'}
                              </CyDText>
                              <CyDText className='font-nunito text-[16px] font-bold  text-activityFontColor'>
                              {fromTokenValue ? parseFloat(fromTokenValue).toFixed(4) : 'unknown'} {fromToken}
                              </CyDText>
                        </CyDView>}
                  </CyDView>
                  <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-sepratorColor ml-[20px]'>
                        <CyDText className='font-nunito text-[16px] w-[40%] text-activityFontColor'>
                        {t<string>('GAS')}
                        </CyDText>
                        <CyDText className='font-nunito text-[16px] font-bold text-activityFontColor'>
                          {parseFloat(gas).toFixed(4)}
                        </CyDText>
                  </CyDView>

                  <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-sepratorColor ml-[20px]'
                    >
                      <CyDText className='font-nunito text-[16px] w-[40%] text-activityFontColor'>{t<string>('HASH')}</CyDText>
                      <CyDView className='flex flex-row'>
                          <CyDText onPress={() => {
                            setModalVisible(false);
                            navigationRef.navigate(C.screenTitle.TRANS_DETAIL, {
                              url: `${chainExplorerMapping[blockchain]}${hash}`
                            });
                          }} className='font-nunito text-[14px] w-[65%] text-blue-500 underline font-bold'>{getMaskedAddress(hash)}</CyDText>
                          <CyDTouchView onPress={() => copyHash(String(`${chainExplorerMapping[blockchain]}${hash}`))}>
                            <CyDImage source={AppImages.COPY}/>
                          </CyDTouchView>
                      </CyDView>

                    </CyDView>

                  <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-sepratorColor ml-[20px]'>
                        <CyDText className='font-nunito text-[16px] w-[40%] text-activityFontColor'>
                          {t<string>('STATUS')}
                        </CyDText>
                        <CyDText className='font-nunito text-[16px] font-bold text-[#048A81]'>
                          {status}
                        </CyDText>
                  </CyDView>
              </CyDView>
         </CyDView>
        </CyDView>
      </CyDModalLayout>
    );
  }
  return <></>;
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
