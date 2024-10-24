/**
 * @format
 * @flow
 */
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { t } from 'i18next';
import moment from 'moment';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import FastImage from 'react-native-fast-image';
import AppImages from '../../../assets/images/appImages';
import ActivityBridgeInfoModal from '../../components/v2/activityBridgeInfoModal';
import ActivityInfoModal from '../../components/v2/activityCardInfoModal';
import ActivitySendInfoModal from '../../components/v2/activitySendInfoModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import * as C from '../../constants/index';
import { ALL_CHAINS } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { ACTIVITIES_REFRESH_TIMEOUT } from '../../constants/timeOuts';
import axios from '../../core/Http';
import {
  ActivityContext,
  getMaskedAddress,
  HdWalletContext,
  limitDecimalPlaces,
} from '../../core/util';
import { hostWorker } from '../../global';
import {
  ActivityAny,
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  ExchangeTransaction,
  BrowserTransaction,
  DebitCardTransaction,
  IBCTransaction,
  OnmetaTransaction,
  SendTransactionActivity,
  WalletConnectTransaction,
} from '../../reducers/activity_reducer';
import {
  CyDFastImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { genId } from '../utilities/activityUtilities';
import { ACTIVITY_TYPES, STATUSES } from './activityFilter';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { TIME_GAPS } from '../../constants/data';
import { endsWith, get, round } from 'lodash';
import { SvgUri } from 'react-native-svg';

const IN_PROGRESS = 'IN_PROGRESS';
const PENDING = 'PENDING';
const COMPLETED = 'COMPLETED';
const FAILED = 'FAILED';
const DELAYED = 'DELAYED';
const NOT_FOUND = 'NOT_FOUND';

const statuses: Record<string, string> = {
  [ActivityStatus.PENDING]: 'PENDING',
  [ActivityStatus.SUCCESS]: 'SUCCESS',
  [ActivityStatus.FAILED]: 'FAILED',
  [ActivityStatus.INPROCESS]: 'IN PROCESS',
  [ActivityStatus.DELAYED]: 'DELAYED',
};

function SentItem(props: any) {
  const activity: SendTransactionActivity = props.activity;
  const { t } = useTranslation();

  const { showModal, hideModal } = useGlobalModalContext();

  const { setSendInfoParams } = props;
  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING
        ? Colors.activityPending
        : Colors.activitySuccess;
  const icon =
    activity.status === ActivityStatus.FAILED
      ? AppImages.SEND_ERROR
      : activity.status === ActivityStatus.PENDING
        ? AppImages.SEND_PENDING
        : AppImages.SEND_SUCCESS;
  const formatAddress = `To: ${getMaskedAddress(activity.toAddress)}`;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatAmount = `- ${limitDecimalPlaces(activity.amount, 6)} ${
    activity.tokenName
  }`;
  const showSendDetails = () => {
    if (
      [ActivityStatus.SUCCESS, ActivityStatus.INPROCESS].includes(
        activity.status,
      )
    ) {
      setSendInfoParams({
        datetime: activity.datetime,
        symbol: activity.symbol,
        chainName: activity.chainName,
        chainLogo: activity.logoUrl,
        amount: activity.amount,
        gasAmount: activity.gasAmount,
        transactionHash: activity.transactionHash,
        toAddress: activity.toAddress,
        fromAddress: activity.fromAddress,
        tokenName: activity.tokenName,
        tokenLogo: activity.tokenLogo,
      });
    } else {
      activity.reason
        ? showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: activity.reason,
            onSuccess: hideModal,
            onFailure: hideModal,
          })
        : activity.status === ActivityStatus.FAILED &&
          showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: t('TRANSACTION_FAILED_REASON_NA'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
    }
  };
  return (
    <CyDTouchView
      className='flex flex-1 flex-row items-center mb-[20px]'
      onPress={() => showSendDetails()}>
      <CyDFastImage
        className='h-[25px] w-[25px]'
        resizeMode='contain'
        source={icon}
      />
      <CyDView className='px-[10px] items-start justify-start'>
        <CyDView className='flex flex-row justify-center items-center'>
          <CyDText className='font-bold text-[16px]'>{'Send'}</CyDText>
          <CyDText
            className={'text-[10px] mt-[3px] font-bold ml-[12px]'}
            style={{ color: statusColor }}>
            {statuses[activity.status]}
          </CyDText>
        </CyDView>
        <CyDText className='mt-[3px]'>{formatAddress}</CyDText>
      </CyDView>
      <CyDView className='flex flex-1 items-end self-end'>
        <CyDText>{formatDate}</CyDText>
        <CyDText numberOfLines={1} className='text-red-500 mt-[3px]'>
          {formatAmount}
        </CyDText>
      </CyDView>
    </CyDTouchView>
  );
}

function BridgeItem(props: any) {
  const activity: ExchangeTransaction = props.activity;

  const { showModal, hideModal } = useGlobalModalContext();

  const {
    fromTokenAmount,
    toTokenAmount,
    quoteData,
    fromSymbol,
    toSymbol,
    status,
    type,
    transactionHash,
    fromChain,
    fromChainId,
    toChain,
    fromTokenLogoUrl,
    toTokenLogoUrl,
    fromChainLogoUrl,
    toChainLogoUrl,
  } = activity;
  const { setBridgeInfoParams } = props;

  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING ||
          activity.status === ActivityStatus.DELAYED
        ? Colors.activityPending
        : Colors.activitySuccess;
  const icon = {
    forBridge:
      activity.status === ActivityStatus.FAILED
        ? AppImages.BRIDGE_ERROR
        : activity.status === ActivityStatus.PENDING ||
            activity.status === ActivityStatus.DELAYED
          ? AppImages.BRIDGE_PENDING
          : AppImages.BRIDGE_SUCCESS,
    forSwap:
      activity.status === ActivityStatus.FAILED
        ? AppImages.SWAP_ERROR
        : activity.status === ActivityStatus.PENDING ||
            activity.status === ActivityStatus.DELAYED
          ? AppImages.SWAP_PENDING
          : AppImages.SWAP_SUCCESS,
  };
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatFromAmount = `- ${get(activity, ['fromTokenAmount'])} ${get(activity, 'fromSymbol')}`;
  const formatToAmount = `+ ${round(parseFloat(get(activity, ['toTokenAmount'], '0')), 4)} ${
    activity.toSymbol
  }`;

  const onPressBridgeItem = () => {
    if (
      quoteData &&
      [
        ActivityStatus.INPROCESS,
        ActivityStatus.SUCCESS,
        ActivityStatus.DELAYED,
      ].includes(status)
    ) {
      setBridgeInfoParams({
        type,
        fromTokenAmount,
        toTokenAmount,
        quoteData,
        fromSymbol,
        toSymbol,
        status,
        transactionHash,
        fromChain,
        fromChainId,
        toChain,
      });
    } else {
      activity.reason
        ? showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: activity.reason,
            onSuccess: hideModal,
            onFailure: hideModal,
          })
        : activity.status === ActivityStatus.FAILED &&
          showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: t('TRANSACTION_FAILED_REASON_NA'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
    }
  };

  return (
    <CyDTouchView className='mb-[20px] mt-[10px]' onPress={onPressBridgeItem}>
      <CyDView className='flex flex-row items-center'>
        <CyDView>
          {activity.fromChain === activity.toChain ? (
            <CyDFastImage
              className='h-[25px] w-[25px]'
              resizeMode='contain'
              source={icon.forSwap}
            />
          ) : (
            <CyDFastImage
              className='h-[25px] w-[25px]'
              resizeMode='contain'
              source={icon.forBridge}
            />
          )}
        </CyDView>
        <CyDView className='flex flex-1 flex-row justify-between items-center'>
          <CyDView className='flex flex-row items-center px-[10px]'>
            <CyDText className='font-bold text-[16px]'>
              {t<string>(
                type === ActivityType.BRIDGE ? 'BRIDGE' : 'SWAP_TITLE',
              )}
            </CyDText>
            <CyDText
              className={'text-[10px] font-bold mt-[3px] ml-[12px]'}
              style={{ color: statusColor }}>
              {statuses[activity.status]}
            </CyDText>
          </CyDView>
          <CyDText className='flex self-end items-end'>{formatDate}</CyDText>
        </CyDView>
      </CyDView>
      <CyDView className='py-[20px] px-[10px] mt-[10px] flex flex-row justify-between bg-ternaryBackgroundColor border-[1px] rounded-[15px] border-sepratorColor'>
        <CyDView className='flex flex-column justify-center items-center px-[10px]'>
          <CyDView>
            <CyDText className='text-red-500 font-extrabold'>
              {formatFromAmount}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row mt-[10px] justify-center items-center'>
            <CyDView>
              {endsWith(fromTokenLogoUrl, '.svg') ? (
                <SvgUri width='38' height='38' uri={fromTokenLogoUrl ?? ''} />
              ) : (
                <CyDFastImage
                  className={'h-[35px] w-[35px]'}
                  source={{
                    uri: fromTokenLogoUrl,
                  }}
                />
              )}
              <CyDView className='absolute top-[20px] right-[-7px]'>
                {endsWith(fromChainLogoUrl, '.svg') ? (
                  <SvgUri width='38' height='38' uri={fromChainLogoUrl ?? ''} />
                ) : (
                  <CyDFastImage
                    className={
                      'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'
                    }
                    source={{ uri: fromChainLogoUrl }}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                )}
              </CyDView>
            </CyDView>
            <CyDView className='px-[15px]'>
              <CyDText className='text-[14px] font-bold'>
                {activity.fromSymbol}
              </CyDText>
              <CyDText className='text-[12px]'>{activity.fromChain}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='flex justify-center items-center mt-[10px]'>
          {activity.fromChain === activity.toChain ? (
            <CyDFastImage
              className='h-[25px] w-[25px]'
              resizeMode='contain'
              source={AppImages.SWAP_GRAY}
            />
          ) : (
            <CyDFastImage
              className='h-[25px] w-[25px]'
              resizeMode='contain'
              source={AppImages.BRIDGE_GRAY}
            />
          )}
        </CyDView>
        <CyDView className='flex flex-column justify-center items-center px-[10px]'>
          <CyDView className='flex flex-1 justify-start'>
            <CyDText className='text-successTextGreen font-extrabold text-left'>
              {formatToAmount}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row mt-[10px] justify-center items-center'>
            <CyDView>
              {endsWith(toTokenLogoUrl, '.svg') ? (
                <SvgUri width='38' height='38' uri={toTokenLogoUrl ?? ''} />
              ) : (
                <CyDFastImage
                  className={'h-[35px] w-[35px]'}
                  source={{
                    uri: toTokenLogoUrl,
                  }}
                />
              )}

              <CyDView className='absolute top-[20px] right-[-7px]'>
                {endsWith(fromChainLogoUrl, '.svg') ? (
                  <SvgUri width='38' height='38' uri={toChainLogoUrl ?? ''} />
                ) : (
                  <CyDFastImage
                    className={
                      'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'
                    }
                    source={{ uri: toChainLogoUrl }}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                )}
              </CyDView>
            </CyDView>
            <CyDView className='px-[15px]'>
              <CyDText className='text-[14px] font-bold'>
                {activity.toSymbol}
              </CyDText>
              <CyDText className='text-[12px]'>{activity.toChain}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDTouchView>
  );
}

function IBCItem(props: any) {
  const activity: IBCTransaction = props.activity;

  const fromChainlogo = ALL_CHAINS.find(
    chain => chain.name === activity.fromChain,
  )?.logo_url;
  const toChainlogo = ALL_CHAINS.find(
    chain => chain.name === activity.toChain,
  )?.logo_url;
  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING
        ? Colors.activityPending
        : Colors.activitySuccess;
  const icon =
    activity.status === ActivityStatus.FAILED
      ? AppImages.IBC_ERROR
      : activity.status === ActivityStatus.PENDING
        ? AppImages.IBC_PENDING
        : AppImages.IBC_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatFromAmount = `- ${round(parseFloat(activity.amount), 4)} ${
    activity.symbol
  }`;
  const formatToAmount = `+ ${round(parseFloat(activity.amount), 4)} ${activity.symbol}`;

  return (
    <CyDTouchView className='mb-[20px] mt-[10px]'>
      <CyDView className='flex flex-row items-center'>
        <CyDView>
          <CyDFastImage
            className='h-[25px] w-[25px]'
            resizeMode='contain'
            source={icon}
          />
        </CyDView>
        <CyDView className='flex flex-1 flex-row justify-between items-center'>
          <CyDView className='flex flex-row items-center px-[10px]'>
            <CyDText className='font-bold text-[16px]'>
              {t<string>('IBC')}
            </CyDText>
            <CyDText
              className={'text-[10px] font-bold mt-[3px] ml-[12px]'}
              style={{ color: statusColor }}>
              {statuses[activity.status]}
            </CyDText>
          </CyDView>
          <CyDText className='flex self-end items-end'>{formatDate}</CyDText>
        </CyDView>
      </CyDView>
      <CyDView className='py-[20px] px-[10px] mt-[10px] flex flex-row justify-between bg-ternaryBackgroundColor border-[1px] rounded-[15px] border-sepratorColor'>
        <CyDView className='flex flex-column justify-center items-center px-[10px]'>
          <CyDView>
            <CyDText className='text-red-500 font-extrabold'>
              {formatFromAmount}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row mt-[10px] justify-center items-center'>
            <CyDView>
              <CyDFastImage
                className={'h-[35px] w-[35px]'}
                source={{
                  uri: activity.tokenLogoUrl,
                }}
              />
              <CyDView className='absolute top-[20px] right-[-7px]'>
                <CyDFastImage
                  className={
                    'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'
                  }
                  source={fromChainlogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </CyDView>
            </CyDView>
            <CyDView className='px-[15px]'>
              <CyDText className='text-[14px] font-bold'>
                {activity.token}
              </CyDText>
              <CyDText className='text-[12px]'>{activity.fromChain}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='flex justify-center items-center mt-[10px]'>
          <CyDFastImage
            className='h-[22px] w-[22px]'
            resizeMode='contain'
            source={AppImages.IBC_GRAY}
          />
        </CyDView>
        <CyDView className='flex flex-column justify-center items-center px-[10px]'>
          <CyDView className='flex flex-1 justify-start'>
            <CyDText className='text-successTextGreen font-extrabold text-left'>
              {formatToAmount}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row mt-[10px] justify-center items-center'>
            <CyDView>
              <CyDFastImage
                className={'h-[35px] w-[35px]'}
                source={{
                  uri: activity.tokenLogoUrl,
                }}
              />
              <CyDView className='absolute top-[20px] right-[-7px]'>
                <CyDFastImage
                  className={
                    'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'
                  }
                  source={toChainlogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </CyDView>
            </CyDView>
            <CyDView className='px-[15px]'>
              <CyDText className='text-[14px] font-bold'>
                {activity.token}
              </CyDText>
              <CyDText className='text-[12px]'>{activity.toChain}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDTouchView>
  );
}

function WalletConnectItem(props: any) {
  const activity: WalletConnectTransaction = props.activity;

  const { showModal, hideModal } = useGlobalModalContext();

  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING
        ? Colors.activityPending
        : Colors.activitySuccess;
  const icon =
    activity.status === ActivityStatus.FAILED
      ? AppImages.WALLETCONNECT_FAILED
      : activity.status === ActivityStatus.PENDING
        ? AppImages.WALLETCONNECT_PENDING
        : AppImages.WALLETCONNECT_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatAmount = `- ${round(parseFloat(activity.amount), 8)} ${activity.symbol}`;
  const webIconUrl = `https://www.google.com/s2/favicons?domain=${activity.websiteInfo.host}&sz=32`;

  const onPressWCItem = () => {
    if (activity.status === ActivityStatus.FAILED) {
      activity.reason
        ? showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: activity.reason,
            onSuccess: hideModal,
            onFailure: hideModal,
          })
        : showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: t('TRANSACTION_FAILED_REASON_NA'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
    }
  };
  return (
    <CyDTouchView
      className='flex flex-1 flex-row items-center mb-[20px] mt-[10px]'
      onPress={onPressWCItem}>
      <CyDFastImage
        className='h-[25px] w-[25px]'
        resizeMode='contain'
        source={icon}
      />
      <CyDView className='ml-[10px]'>
        <CyDView className='flex flex-row justify-start items-center'>
          <CyDText className='font-bold text-[16px]'>{'WalletConnect'}</CyDText>
          <CyDText
            className={'text-[10px] font-bold mt-[3px] ml-[10px]'}
            style={{ color: statusColor }}>
            {statuses[activity.status]}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-start items-center mt-[3px]'>
          <CyDFastImage
            className='h-[18px] w-[18px]'
            resizeMode='contain'
            source={{ uri: webIconUrl }}
          />
          <CyDText className='ml-[5px]'>{activity.websiteInfo.host}</CyDText>
        </CyDView>
      </CyDView>
      <CyDView className='flex flex-1 items-end self-end'>
        <CyDText>{formatDate}</CyDText>
        <CyDText className='text-red-500 mt-[3px]'>{formatAmount}</CyDText>
      </CyDView>
    </CyDTouchView>
  );
}

function BrowserItem(props: any) {
  const activity: BrowserTransaction = props.activity;

  const { showModal, hideModal } = useGlobalModalContext();

  const onPressBrowserItem = () => {
    if (activity.status === ActivityStatus.FAILED) {
      activity.reason
        ? showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: activity.reason,
            onSuccess: hideModal,
            onFailure: hideModal,
          })
        : showModal('state', {
            type: 'error',
            title: t('TRANSACTION_FAILED'),
            description: t('TRANSACTION_FAILED_REASON_NA'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
    }
  };

  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING
        ? Colors.activityPending
        : Colors.activitySuccess;
  const icon =
    activity.status === ActivityStatus.FAILED
      ? AppImages.BROWSERACTIVITY_ERROR
      : activity.status === ActivityStatus.PENDING
        ? AppImages.BROWSERACTIVITY_PENDING
        : AppImages.BROWSERACTIVITY_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatAmount = `- ${round(parseFloat(activity.amount), 8)} ${activity.symbol}`;
  const webIconUrl = `https://www.google.com/s2/favicons?domain=${activity.websiteInfo.host}&sz=32`;

  return (
    <CyDTouchView
      className='flex flex-1 flex-row items-center mb-[20px] mt-[10px]'
      onPress={onPressBrowserItem}>
      <CyDFastImage
        className='h-[25px] w-[25px]'
        resizeMode='contain'
        source={icon}
      />
      <CyDView className='ml-[10px]'>
        <CyDView className='flex flex-row justify-start items-center'>
          <CyDText className='text-[16px] font-bold'>{'Browser'}</CyDText>
          <CyDText
            className={'text-[10px] font-bold mt-[3px] ml-[10px]'}
            style={{ color: statusColor }}>
            {statuses[activity.status]}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-start items-center mt-[3px]'>
          <CyDFastImage
            className='h-[18px] w-[18px]'
            resizeMode='contain'
            source={{ uri: webIconUrl }}
          />
          <CyDText className='ml-[5px]'>{activity.websiteInfo.host}</CyDText>
        </CyDView>
      </CyDView>
      <CyDView className='flex flex-1 items-end self-end'>
        <CyDText>{formatDate}</CyDText>
        <CyDText className='text-red-500 mt-[3px]'>{formatAmount}</CyDText>
      </CyDView>
    </CyDTouchView>
  );
}

function CardItem(props: any) {
  const activity: DebitCardTransaction = props.activity;

  const { setCardInfoParams } = props;

  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING
        ? Colors.activityPending
        : Colors.activitySuccess;
  const icon =
    activity.status === ActivityStatus.FAILED
      ? AppImages.CARD_ERROR
      : activity.status === ActivityStatus.PENDING
        ? AppImages.CARD_PENDING
        : AppImages.CARD_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatAmount = `- ${limitDecimalPlaces(activity.amount, 6)} ${
    activity.tokenSymbol
  }`;
  const formatAmountUsd =
    activity.status === ActivityStatus.SUCCESS
      ? `+ $${activity.amountInUsd}`
      : '';

  const onPressCardItem = () => {
    [ActivityStatus.SUCCESS, ActivityStatus.INPROCESS].includes(
      activity.status,
    ) &&
      setCardInfoParams({
        datetime: activity.datetime,
        symbol: activity.tokenSymbol,
        amountInUsd: activity.amountInUsd,
        amount: activity.amount,
        gasAmount: activity.gasAmount,
        quoteId: activity.quoteId,
        txnHash: activity.transactionHash,
      });
  };

  return (
    <CyDTouchView
      className='flex flex-1 flex-row justify-start items-center mb-[20px] mt-[10px]'
      onPress={() => onPressCardItem()}>
      <CyDFastImage
        className='h-[25px] w-[25px]'
        resizeMode='contain'
        source={icon}
      />
      <CyDView className='ml-[10px]'>
        <CyDView className='flex flex-row justify-start items-center'>
          <CyDText className='text-[16px] font-bold'>
            {t<string>('CYPHERD_CARD')}
          </CyDText>
          <CyDText
            className={'text-[10px] font-bold ml-[10px] mt-[3px]'}
            style={{ color: statusColor }}>
            {statuses[activity.status]}
          </CyDText>
        </CyDView>
        <CyDText className='text-red-500 font-extrabold mt-[3px]'>
          {formatAmount}
        </CyDText>
      </CyDView>
      <CyDView className='flex-1 items-end self-end'>
        <CyDText>{formatDate}</CyDText>
        <CyDText className='text-successTextGreen font-extrabold mt-[3px]'>
          {formatAmountUsd}
        </CyDText>
      </CyDView>
    </CyDTouchView>
  );
}

function OnmetaPayItem(props: any) {
  const activity: OnmetaTransaction = props.activity;

  const statusColor =
    activity.status === ActivityStatus.FAILED
      ? Colors.activityFailed
      : activity.status === ActivityStatus.PENDING
        ? Colors.activityPending
        : Colors.activitySuccess;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day')
    ? moment(activity.datetime).format('MMM DD, h:mm a')
    : fromNow;
  const formatAmount = `- ${round(parseFloat(activity.amount), 8)} ${activity.symbol}`;
  const operation = activity.onmetaType.toUpperCase();

  return (
    <CyDTouchView className='flex flex-1 flex-row justify-start items-center my-[10px]'>
      <CyDFastImage
        className='h-[25px] w-[25px]'
        resizeMode='contain'
        source={AppImages.ONMETA}
      />
      <CyDView className='ml-[10px]'>
        <CyDView className='flex flex-row justify-start items-center'>
          <CyDText className='font-extrabold'>{'Onmeta'}</CyDText>
          <CyDText
            className={'ml-[10px] mt-[5px]'}
            style={{ color: statusColor }}>
            {statuses[activity.status]}
          </CyDText>
        </CyDView>
        <CyDText className='text-red-500 font-extrabold'>{operation}</CyDText>
      </CyDView>
      <CyDView className='flex-1 items-end self-end'>
        <CyDText>{formatDate}</CyDText>
        <CyDText className='text-successTextGreen font-extrabold mt-[5px]'>
          {formatAmount}
        </CyDText>
      </CyDView>
    </CyDTouchView>
  );
}

interface RouteParams {
  filter: { types: string[]; time: string; statuses: string[] };
}

export default function Activites() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const filter = route?.params?.filter ?? {
    time: TIME_GAPS[0].value,
    types: ACTIVITY_TYPES,
    statuses: STATUSES,
  };
  const activityContext = useContext<any>(ActivityContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [showCardInfo, setShowCardInfo] = useState(false);
  const [showBridgeInfo, setShowBridgeInfo] = useState(false);
  const [showSendInfo, setShowSendInfo] = useState(false);

  const [cardInfoParams, setCardInfoParams] = useState<{
    datetime: Date;
    amount: string;
    symbol: string;
    amountInUsd: string;
    gasAmount: string;
  } | null>(null);

  const [sendInfoParams, setSendInfoParams] = useState<{
    datetime: Date;
    amount: string;
    symbol: string;
    chainName: string;
    chainLogo: string;
    transactionHash: string;
    gasAmount: string;
    toAddress: string;
    fromAddress: string;
    tokenName: string;
    tokenLogo: string;
  } | null>(null);

  const [bridgeInfoParams, setBridgeInfoParams] = useState<any>(null);
  const [activities, setActivities] = useState<any>([]);
  const pendingActivities: ActivityAny[] = [];
  let refreshActivities: ReturnType<typeof setInterval>;
  const isFocussed = useIsFocused();

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    if (bridgeInfoParams !== null) {
      setShowBridgeInfo(true);
    }
  }, [bridgeInfoParams]);

  useEffect(() => {
    if (cardInfoParams !== null) {
      setShowCardInfo(true);
    }
  }, [cardInfoParams]);

  useEffect(() => {
    if (sendInfoParams !== null) {
      setShowSendInfo(true);
    }
  }, [sendInfoParams]);

  useEffect(() => {
    if (isFocussed) {
      spliceActivitiesByDate();
    }
    return () => {
      if (refreshActivities) {
        clearInterval(refreshActivities);
      }
    };
  }, [activityContext.state.activityObjects, isFocussed]);

  const activityTypesFilterMapping: Record<string, ActivityType> = {
    Bridge: ActivityType.BRIDGE,
    Swap: ActivityType.SWAP,
    'Debit Card': ActivityType.CARD,
    Sent: ActivityType.SEND,
    IBC: ActivityType.IBC,
    Browser: ActivityType.BROWSER,
    'Wallet Connect': ActivityType.WALLETCONNECT,
    Onmeta: ActivityType.ONMETA,
  };

  const statusFilterMapping: Record<string, ActivityStatus> = {
    PENDING: ActivityStatus.PENDING,
    FAILED: ActivityStatus.FAILED,
    SUCCESS: ActivityStatus.SUCCESS,
    'IN PROCESS': ActivityStatus.INPROCESS,
    DELAYED: ActivityStatus.DELAYED,
  };

  useEffect(() => {
    const {
      ethereum: { address },
    } = hdWalletContext.state.wallet;
    analytics()
      .logEvent('activity_screen_view', {
        fromEthAddress: address,
      })
      .catch(Sentry.captureException);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CyDTouchView
          onPress={() => navigation.navigate(C.screenTitle.ACTIVITYFILTER)}>
          <CyDFastImage
            className='w-[48px] h-[26px]'
            source={AppImages.FILTER}
            resizeMode='contain'
          />
        </CyDTouchView>
      ),
    });
  }, []);

  const getLowerLimitDate = (timeGap: string) => {
    const time = moment();
    switch (timeGap) {
      case TIME_GAPS[1].value:
        time.startOf('day');
        break;
      case TIME_GAPS[2].value:
        time.startOf('week');
        break;
      case TIME_GAPS[3].value:
        time.startOf('month');
        break;
    }

    return time;
  };

  const spliceActivitiesByDate = (): any => {
    if (activityContext.state.activityObjects.length === 0) {
      return [];
    }
    let activities: ActivityAny[] = [...activityContext.state.activityObjects]
      .filter((activity: ActivityAny) =>
        filter.types
          .map(fil => activityTypesFilterMapping[fil])
          .includes(activity.type),
      )
      .filter(
        (activity: ActivityAny) =>
          Array.isArray(filter.statuses) &&
          filter.statuses
            .map(stat => statusFilterMapping[stat])
            .includes(activity.status),
      );

    if (filter.time !== TIME_GAPS[0].value) {
      activities = activities.filter(
        (activity: ActivityAny) =>
          moment(activity.datetime) > getLowerLimitDate(filter.time),
      );
    }

    activities.sort(function (a, b) {
      const c = new Date(a.datetime);
      const d = new Date(b.datetime);
      return d.getTime() - c.getTime();
    });

    activities.forEach((activity, index) => {
      if ([ActivityType.SWAP, ActivityType.CARD].includes(activity.type)) {
        if (
          [
            ActivityStatus.DELAYED,
            ActivityStatus.INPROCESS,
            ActivityStatus.PENDING,
          ].includes(activity.status)
        ) {
          pendingActivities.push(activity);
        }
      }
    });
    if (refreshActivities) {
      clearInterval(refreshActivities);
    }
    // setPendingActivities(pendingActivities);
    refreshActivities = setInterval(() => {
      pendingActivities.forEach(pendingActivity => {
        updateStatusForCardOrBridge(pendingActivity);
      });
    }, ACTIVITIES_REFRESH_TIMEOUT);

    const activityByDate = activities.reduce((first: any, sec: any) => {
      const dateTime = moment(new Date(sec.datetime)).format('MMM DD, YYYY');
      if (!first[dateTime]) first[dateTime] = [];

      first[dateTime].push(sec);

      return first;
    }, {});

    const now = new Date();
    const today = moment(now).format('MMM DD, YYYY');
    now.setDate(now.getDate() - 1);

    const yesterday = moment(new Date(now)).format('MMM DD, YYYY');

    const tActivities = [];
    for (const date in activityByDate) {
      const tDate =
        (date === today
          ? 'Today - '
          : date === yesterday
            ? 'Yesterday - '
            : '') + date;
      tActivities.push({ dateString: tDate, entry: activityByDate[date] });
    }
    setActivities(tActivities);
  };

  const getUpdatedActivityStatus = (newStatus: string) => {
    switch (newStatus) {
      case COMPLETED:
        return ActivityStatus.SUCCESS;
      case DELAYED:
        return ActivityStatus.DELAYED;
      case IN_PROGRESS:
        return ActivityStatus.INPROCESS;
      case PENDING:
        return ActivityStatus.PENDING;
      case FAILED:
        return ActivityStatus.FAILED;
      default:
        return ActivityStatus.SUCCESS;
    }
  };

  const updateStatusForCardOrBridge = (activity: ActivityAny) => {
    const currentActivityStatus = activity.status;
    if (
      (currentActivityStatus === ActivityStatus.INPROCESS ||
        currentActivityStatus === ActivityStatus.DELAYED ||
        currentActivityStatus === ActivityStatus.PENDING) &&
      activity.quoteId
    ) {
      const activityStatusUrl = `${ARCH_HOST}/v1/activities/status/${activity.type}/${activity.quoteId}`;
      axios
        .get(activityStatusUrl, { timeout: 3000 })
        .then(res => {
          const {
            data: {
              activityStatus: { status, quoteId },
            },
          } = res;
          if (
            quoteId === activity.quoteId &&
            [IN_PROGRESS, PENDING, FAILED, COMPLETED, DELAYED].includes(status)
          ) {
            const updatedStatus = getUpdatedActivityStatus(status);
            if (updatedStatus !== currentActivityStatus) {
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activity.id,
                  status: updatedStatus,
                },
              });
            }
            if (
              status === DELAYED &&
              updatedStatus === ActivityStatus.DELAYED
            ) {
              const {
                data: {
                  activityStatus: { delayDuration },
                },
              } = res;
              if (delayDuration !== activity.delayDuration && delayDuration) {
                activityContext.dispatch({
                  type: ActivityReducerAction.PATCH,
                  value: {
                    id: activity.id,
                    status: updatedStatus,
                    delayDuration,
                  },
                });
              }
            }
          } else if (
            quoteId === activity.quoteId &&
            [NOT_FOUND].includes(status)
          ) {
            activityContext.dispatch({
              type: ActivityReducerAction.DELETE,
              value: {
                id: activity.id,
              },
            });
          } else {
            throw new Error(
              `Received invalid status: ${status} for quoteId:${quoteId}`,
            );
          }
        })
        .catch(e => {
          Sentry.captureException(e);
        });
    }
  };

  if (
    activityContext.state.activityObjects.length === 0 ||
    activities.length === 0
  ) {
    return (
      <CyDView className='h-full w-full bg-white justify-center items-center'>
        <CyDFastImage
          className='h-[150px] w-[150px]'
          resizeMode='contain'
          source={AppImages.NO_ACTIVITIES}
        />
      </CyDView>
    );
  }

  const RenderActivity = ({ activity }: { activity: ActivityAny }) => {
    const { id, type } = activity;
    switch (type) {
      case ActivityType.SEND:
        return (
          <SentItem
            key={id + 'sent'}
            activity={activity}
            setSendInfoParams={setSendInfoParams}
          />
        );
      case ActivityType.BRIDGE:
      case ActivityType.SWAP:
        return (
          <BridgeItem
            key={id + 'bridge'}
            activity={activity}
            setBridgeInfoParams={setBridgeInfoParams}
          />
        );
      case ActivityType.CARD:
        return (
          <CardItem
            key={id + 'card'}
            activity={activity as DebitCardTransaction}
            setCardInfoParams={setCardInfoParams}
          />
        );
      case ActivityType.IBC:
        return <IBCItem key={id + 'ibc'} activity={activity} />;
      case ActivityType.BROWSER:
        return (
          <BrowserItem key={id + genId() + 'browser'} activity={activity} />
        );
      case ActivityType.WALLETCONNECT:
        return (
          <WalletConnectItem
            key={id + genId() + 'browser'}
            activity={activity}
          />
        );
      default:
        return <CyDView />;
    }
  };

  const RenderActivities = () => {
    return activities.map((day: any, index: number) => {
      return (
        <CyDView className='mx-[10px]' key={index}>
          <CyDText numberOfLines={1} className='mb-[5px]'>
            {day.dateString}
          </CyDText>
          {day.entry.map((activity: ActivityAny, index: number) => {
            return <RenderActivity key={index} activity={activity} />;
          })}
        </CyDView>
      );
    });
  };

  return (
    <CyDScrollView className='bg-white'>
      <CyDView>
        <ActivityInfoModal
          setModalVisible={setShowCardInfo}
          isModalVisible={showCardInfo}
          params={cardInfoParams}
        />
        <ActivityBridgeInfoModal
          setModalVisible={setShowBridgeInfo}
          isModalVisible={showBridgeInfo}
          params={bridgeInfoParams}
          navigationRef={navigation}
        />
        <ActivitySendInfoModal
          setModalVisible={setShowSendInfo}
          isModalVisible={showSendInfo}
          params={sendInfoParams}
          navigationRef={navigation}
        />
        <RenderActivities />
      </CyDView>
    </CyDScrollView>
  );
}
