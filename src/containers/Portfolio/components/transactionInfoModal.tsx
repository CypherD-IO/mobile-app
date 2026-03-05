import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from '../../../components/v2/modal';
import {
  CyDFastImage,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import {
  getMaskedAddress,
  copyToClipboard,
  formatAmount,
  getExplorerUrlFromBackendNames,
} from '../../../core/util';
import { useTranslation } from 'react-i18next';
import * as C from '../../../constants';
import { showToast } from '../../utilities/toastUtility';
import { TransactionType } from '../../../constants/enum';
import { APPLICATION_ADDRESS_NAME_MAP } from '../../../constants/data';
import { ChainConfigMapping } from '../../../constants/server';
import { TransactionObj } from '../../../models/transaction.model';
import { get } from 'lodash';
import moment from 'moment';
import TokenInitialsIcon from '../../../components/v2/TokenInitialsIcon';

const getTransactionDestinationDetails = (
  type: string,
  from: string,
  to: string,
  transferFrom?: string,
  transferTo?: string,
  protocolName?: string | null,
) => {
  let destination = 'To';
  let transactionAddress;
  switch (type) {
    case TransactionType.SELF:
      destination = 'To';
      transactionAddress = getMaskedAddress(transferTo ?? to);
      break;
    case TransactionType.SEND:
      destination = 'To';
      transactionAddress = getMaskedAddress(transferTo ?? to);
      break;
    case TransactionType.RECEIVE:
      destination = 'From';
      transactionAddress = getMaskedAddress(transferFrom ?? from);
      break;
    default:
      if (protocolName) {
        transactionAddress = protocolName;
      } else if (to) {
        transactionAddress = to;
        if (APPLICATION_ADDRESS_NAME_MAP.has(transactionAddress)) {
          transactionAddress = APPLICATION_ADDRESS_NAME_MAP.get(
            transactionAddress,
          ) as string;
        } else {
          transactionAddress = getMaskedAddress(transactionAddress);
        }
      } else {
        transactionAddress = null;
      }
  }

  return [destination, transactionAddress];
};

export default function TransactionInfoModal({
  isModalVisible,
  setModalVisible,
  params,
  navigationRef,
}: {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  params: TransactionObj | null;
  navigationRef: any;
}) {
  const viewRef = useRef();
  const { t } = useTranslation();

  const copyHash = (url: string) => {
    copyToClipboard(url);
    showToast(t('COPIED_TO_CLIPBOARD'));
  };

  if (params !== null) {
    const {
      chain: blockchain,
      hash,
      fee,
      operationType: type,
      from,
      to,
      transfers,
      timestamp,
    } = params;

    const formattedTimestamp = moment.unix(timestamp).format('MMM D, YYYY HH:mm');

    const outTransfer = transfers.find(tr => tr.direction === 'out') ?? transfers[0];
    const inTransfer = transfers.find(tr => tr.direction === 'in') ?? (transfers[1] ?? transfers[0]);
    const primaryTransfer = transfers[0];

    const fromToken = outTransfer?.tokenSymbol ?? null;
    const fromTokenValue = outTransfer ? String(outTransfer.amount) : null;

    const approval = params.approvals?.[0];
    const primaryToken = primaryTransfer?.tokenSymbol ?? approval?.tokenSymbol ?? null;
    const primaryTokenIcon = primaryTransfer?.tokenIcon ?? approval?.tokenIcon ?? null;
    const primaryValue = primaryTransfer
      ? String(primaryTransfer.amount)
      : approval
        ? String(approval.amount)
        : '0';

    const token =
      type === TransactionType.SEND
        ? (outTransfer ?? primaryTransfer)?.tokenSymbol ?? null
        : type === TransactionType.RECEIVE
          ? (inTransfer ?? primaryTransfer)?.tokenSymbol ?? null
          : primaryToken;
    const tokenIcon =
      type === TransactionType.SEND
        ? (outTransfer ?? primaryTransfer)?.tokenIcon ?? null
        : type === TransactionType.RECEIVE
          ? (inTransfer ?? primaryTransfer)?.tokenIcon ?? null
          : primaryTokenIcon;
    const value =
      type === TransactionType.SEND
        ? String((outTransfer ?? primaryTransfer)?.amount ?? '0')
        : type === TransactionType.RECEIVE
          ? String((inTransfer ?? primaryTransfer)?.amount ?? '0')
          : primaryValue;

    const gas = String(fee?.amount ?? '0');

    const relevantTransfer = outTransfer ?? inTransfer ?? primaryTransfer;
    const [destination, transactionAddress] = getTransactionDestinationDetails(
      type,
      from,
      to,
      relevantTransfer?.from,
      relevantTransfer?.to,
      params.protocol?.name,
    );
    const chainDisplay =
      blockchain.charAt(0).toUpperCase() + blockchain.slice(1).toLowerCase();
    const chainConfig = get(ChainConfigMapping, blockchain.toLowerCase());
    const chainImg = chainConfig?.logo_url;
    const feeTokenImg = chainConfig?.nativeTokenLogoUrl;

    const RenderTransactionHeader = () => {
      const title = type
        ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
        : 'Unknown';
      const displayTitle = title || 'Unknown Transaction';
      return (
        <CyDView className='px-[20px]'>
          <CyDText className='text-[20px] font-extrabold text-activityFontColor'>
            {displayTitle}
          </CyDText>
          <CyDText className='text-[12px] text-subTextColor'>
            {formattedTimestamp}
          </CyDText>
        </CyDView>
      );
    };

    const isSwapOrTrade =
      type === TransactionType.SWAP || type === TransactionType.TRADE;

    const RenderTransactionInfo = () => {
      if (isSwapOrTrade) {
        const inAmount = inTransfer ? formatAmount(String(inTransfer.amount)) : '0';
        const outAmount = outTransfer ? formatAmount(String(outTransfer.amount)) : '0';
        const inIcon = inTransfer?.tokenIcon;
        const outIcon = outTransfer?.tokenIcon;
        const inSymbol = inTransfer?.tokenSymbol ?? t('UNKNOWN');
        const outSymbol = outTransfer?.tokenSymbol ?? t('UNKNOWN');
        return (
          <CyDView className='flex flex-col w-full px-[16px] py-[12px]'>
            {/* Sent (out) on top */}
            <CyDText className='text-[12px] text-subTextColor mb-[4px]'>
              {'Sent'}
            </CyDText>
            <CyDView className='flex flex-row items-center justify-between'>
              <CyDView className='flex flex-row items-center flex-1'>
                {outIcon ? (
                  <CyDImage
                    source={{ uri: outIcon }}
                    className={'w-[36px] h-[36px] rounded-full'}
                  />
                ) : (
                  <TokenInitialsIcon symbol={outSymbol ?? '?'} />
                )}
                <CyDView className='flex flex-col ml-[10px]'>
                  <CyDText className='text-[18px] font-bold text-activityFontColor'>
                    -{outAmount} {outSymbol}
                  </CyDText>
                  {outTransfer?.valueUsd != null && (
                    <CyDText className='text-[12px] text-subTextColor'>
                      ${outTransfer.valueUsd.toFixed(2)}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>
              <CyDMaterialDesignIcons
                name={'chevron-right'}
                size={24}
                className='text-base400'
              />
            </CyDView>
            {/* Received (in) on bottom */}
            <CyDText className='text-[12px] text-subTextColor mt-[12px] mb-[4px]'>
              {'Received'}
            </CyDText>
            <CyDView className='flex flex-row items-center'>
              {inIcon ? (
                <CyDImage
                  source={{ uri: inIcon }}
                  className={'w-[36px] h-[36px] rounded-full'}
                />
              ) : (
                <TokenInitialsIcon symbol={inSymbol ?? '?'} />
              )}
              <CyDView className='flex flex-col ml-[10px]'>
                <CyDText className='text-[18px] font-bold text-[#048A81]'>
                  +{inAmount} {inSymbol}
                </CyDText>
                {inTransfer?.valueUsd != null && (
                  <CyDText className='text-[12px] text-subTextColor'>
                    ${inTransfer.valueUsd.toFixed(2)}
                  </CyDText>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        );
      } else {
        if (!token) return null;
        const displayValue = `${formatAmount(value)} ${token}`;
        const relevantForUsd =
          type === TransactionType.SEND
            ? outTransfer ?? primaryTransfer
            : type === TransactionType.RECEIVE
              ? inTransfer ?? primaryTransfer
              : primaryTransfer;
        const usdValue = relevantForUsd?.valueUsd;
        return (
          <CyDView className='flex flex-row w-full items-center justify-between px-[16px] py-[12px]'>
            <CyDView className='flex flex-row items-center flex-1'>
              {tokenIcon ? (
                <CyDImage
                  source={{ uri: tokenIcon }}
                  className={'w-[36px] h-[36px] rounded-full'}
                />
              ) : (
                <TokenInitialsIcon symbol={token ?? '?'} />
              )}
              <CyDView className='flex flex-col ml-[10px]'>
                <CyDText className='text-[18px] font-bold text-activityFontColor'>
                  {displayValue}
                </CyDText>
                {usdValue != null && (
                  <CyDText className='text-[12px] text-subTextColor'>
                    ${usdValue.toFixed(2)}
                  </CyDText>
                )}
              </CyDView>
            </CyDView>
            <CyDMaterialDesignIcons
              name={'chevron-right'}
              size={24}
              className='text-base400'
            />
          </CyDView>
        );
      }
    };

    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-n20 pb-[30px] rounded-t-[20px]'} ref={viewRef}>
          <CyDView className='mt-[24px]'>
            <RenderTransactionHeader />
          </CyDView>
          <CyDView className='flex flex-col px-[20px] mt-[16px]'>
            <CyDView className='bg-n0 rounded-[12px] my-[8px]'>
              <RenderTransactionInfo />
            </CyDView>
            <CyDView className='flex flex-col bg-n0 rounded-[12px] mt-[5px] px-[16px]'>
              {/* To / From row */}
              {transactionAddress && (
                <CyDView className='py-[14px] border-b-[1px] border-n40'>
                  <CyDText className='text-[12px] text-subTextColor mb-[4px]'>
                    {destination}
                  </CyDText>
                  <CyDView className='flex flex-row items-center justify-between'>
                    <CyDView className='flex flex-row items-center flex-1'>
                      <CyDText className='text-[15px] font-bold text-activityFontColor'>
                        {transactionAddress}
                      </CyDText>
                    </CyDView>
                    <CyDTouchView
                      onPress={() => {
                        setModalVisible(false);
                        const addr = type === TransactionType.RECEIVE
                          ? (relevantTransfer?.from ?? from)
                          : (relevantTransfer?.to ?? to);
                        navigationRef.navigate(C.screenTitle.TRANS_DETAIL, {
                          url: getExplorerUrlFromBackendNames(blockchain, addr),
                        });
                      }}>
                      <CyDMaterialDesignIcons
                        name={'open-in-new'}
                        size={18}
                        className='text-base400'
                      />
                    </CyDTouchView>
                  </CyDView>
                </CyDView>
              )}

              {/* Value row (swap/trade only) */}
              {isSwapOrTrade && (
                <CyDView className='py-[14px] border-b-[1px] border-n40'>
                  <CyDText className='text-[12px] text-subTextColor mb-[4px]'>
                    {t('VALUE')}
                  </CyDText>
                  <CyDText className='text-[15px] font-bold text-activityFontColor'>
                    {fromTokenValue
                      ? formatAmount(fromTokenValue)
                      : t('UNKNOWN')}{' '}
                    {fromToken}
                  </CyDText>
                </CyDView>
              )}

              {/* Network row */}
              <CyDView className='py-[14px] border-b-[1px] border-n40'>
                <CyDText className='text-[12px] text-subTextColor mb-[4px]'>
                  {'Network'}
                </CyDText>
                <CyDView className='flex flex-row items-center'>
                  {chainImg && (
                    <CyDFastImage
                      className='h-[16px] w-[16px] mr-[6px] rounded-full'
                      resizeMode='contain'
                      source={chainImg}
                    />
                  )}
                  <CyDText className='text-[15px] font-bold text-activityFontColor'>
                    {chainDisplay}
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* Network Fee row */}
              <CyDView className='py-[14px] border-b-[1px] border-n40'>
                <CyDText className='text-[12px] text-subTextColor mb-[4px]'>
                  {'Network Fee'}
                </CyDText>
                <CyDView className='flex flex-row items-center'>
                  {feeTokenImg ? (
                    <CyDImage
                      className='h-[16px] w-[16px] mr-[6px] rounded-full'
                      resizeMode='contain'
                      source={{ uri: feeTokenImg }}
                    />
                  ) : chainImg ? (
                    <CyDFastImage
                      className='h-[16px] w-[16px] mr-[6px] rounded-full'
                      resizeMode='contain'
                      source={chainImg}
                    />
                  ) : null}
                  <CyDText className='text-[15px] font-bold text-activityFontColor'>
                    {formatAmount(gas)} {fee?.tokenSymbol ?? ''}
                    {fee?.valueUsd != null ? ` (<$${fee.valueUsd < 0.01 ? '0.01' : fee.valueUsd.toFixed(2)})` : ''}
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* Hash row */}
              <CyDView className='py-[14px]'>
                <CyDText className='text-[12px] text-subTextColor mb-[4px]'>
                  {'Hash'}
                </CyDText>
                <CyDView className='flex flex-row items-center justify-between'>
                  <CyDText className='text-[15px] font-bold text-activityFontColor'>
                    {getMaskedAddress(hash)}
                  </CyDText>
                  <CyDView className='flex flex-row items-center'>
                    <CyDTouchView
                      className='mr-[12px]'
                      onPress={() =>
                        copyHash(hash)
                      }>
                      <CyDMaterialDesignIcons
                        name={'content-copy'}
                        size={18}
                        className='text-base400'
                      />
                    </CyDTouchView>
                    <CyDTouchView
                      onPress={() => {
                        setModalVisible(false);
                        navigationRef.navigate(C.screenTitle.TRANS_DETAIL, {
                          url: getExplorerUrlFromBackendNames(blockchain, hash),
                        });
                      }}>
                      <CyDMaterialDesignIcons
                        name={'open-in-new'}
                        size={18}
                        className='text-base400'
                      />
                    </CyDTouchView>
                  </CyDView>
                </CyDView>
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
    justifyContent: 'flex-end',
  },
});
