/* eslint-disable react-native/no-raw-text */
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
import { StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import AppImages from '../../../assets/images/appImages';
import ActivityBridgeInfoModal from '../../components/v2/activityBridgeInfoModal';
import ActivityInfoModal from '../../components/v2/activityCardInfoModal';
import ActivitySendInfoModal from '../../components/v2/activitySendInfoModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import * as C from '../../constants/index';
import { ALL_CHAINS } from '../../constants/server';
import { Colors } from '../../constants/theme';
import axios from '../../core/Http';
import { ActivityContext, getMaskedAddress, HdWalletContext } from '../../core/util';
import { hostWorker } from '../../global';
import { ActivityAny, ActivityReducerAction, ActivityStatus, ActivityType, BridgeTransaction, BrowserTransaction, DebitCardTransaction, IBCTransaction, OnmetaTransaction, SardinePayTransaction, SendTransactionActivity, WalletConnectTransaction } from '../../reducers/activity_reducer';
import { DynamicImage } from '../../styles/imageStyle';
import { CyDFastImage, CyDImage, CyDTouchView } from '../../styles/tailwindStyles';
import { DynamicScrollView, DynamicTouchView } from '../../styles/viewStyle';
import { genId } from '../utilities/activityUtilities';
import { ACTIVITY_TYPES, STATUSES, TIME_GAPS } from './activityFilter';

const {
  DynamicView,
  CText
} = require('../../styles');

const IN_PROGRESS = 'IN_PROGRESS';
const PENDING = 'PENDING';
const COMPLETED = 'COMPLETED';
const FAILED = 'FAILED';
const DELAYED = 'DELAYED';

const statuses: Record<string, string> = {
  [ActivityStatus.PENDING]: 'PENDING',
  [ActivityStatus.SUCCESS]: 'SUCCESS',
  [ActivityStatus.FAILED]: 'FAILED',
  [ActivityStatus.INPROCESS]: 'IN PROCESS',
  [ActivityStatus.DELAYED]: 'DELAYED'
};

function SentItem (props: any) {
  const activity: SendTransactionActivity = props.activity;
  const { t } = useTranslation();

  const { showModal, hideModal } = useGlobalModalContext();

  const { setSendInfoParams } = props;
  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.SEND_ERROR : activity.status === ActivityStatus.PENDING ? AppImages.SEND_PENDING : AppImages.SEND_SUCCESS;
  const formatAddress = `To: ${getMaskedAddress(activity.toAddress)}`;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatAmount = `- ${activity.amount.slice(0, 8)} ${activity.symbol}`;

  return (
      <DynamicTouchView dynamic dynamicWidth width={100} pH={10} mB={7} fD='row' pB={9} alIT='flex-start' jC='flex-start' style={{ borderBottomColor: '#eeeeee' }}
      onPress={() => {
        if ([ActivityStatus.SUCCESS, ActivityStatus.INPROCESS].includes(activity.status)) {
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
            tokenLogo: activity.tokenLogo
          });
        } else {
          activity.reason
            ? showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: activity.reason, onSuccess: hideModal, onFailure: hideModal })
            : activity.status === ActivityStatus.FAILED && showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: t('TRANSACTION_FAILED_REASON_NA'), onSuccess: hideModal, onFailure: hideModal });
        }
      }
      }
    >
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={icon} />
      <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={60} pH={10} aLIT={'flex-start'} jC='flex-start'>
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mT={10} color={Colors.primaryTextColor}>{'Send'}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={12} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} color={Colors.primaryTextColor}>{formatAddress}</CText>
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'flex-end'} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.primaryTextColor}>{formatDate}</CText>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} mT={5} color={Colors.activityNegativeAmount}>{formatAmount}</CText>
      </DynamicView>

    </DynamicTouchView>
  );
}

function BridgeItem (props: any) {
  const activity: BridgeTransaction = props.activity;

  const { showModal, hideModal } = useGlobalModalContext();

  const { fromTokenAmount, toTokenAmount, quoteData, fromSymbol, toSymbol, status, delayDuration } = activity;
  const { setBridgeInfoParams } = props;

  const fromChainlogo = ALL_CHAINS.find(chain => chain.name === activity.fromChain)?.logo_url;
  const toChainlogo = ALL_CHAINS.find(chain => chain.name === activity.toChain)?.logo_url;
  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : (activity.status === ActivityStatus.PENDING || activity.status === ActivityStatus.DELAYED) ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.BRIDGE_ERROR : (activity.status === ActivityStatus.PENDING || activity.status === ActivityStatus.DELAYED) ? AppImages.BRIDGE_PENDING : AppImages.BRIDGE_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatFromAmount = `- ${activity.fromTokenAmount} ${activity.fromSymbol}`;
  const formatToAmount = `+ ${activity?.toTokenAmount?.slice(0, 4)} ${activity.toSymbol}`;

  const onPressBridgeItem = () => {
    if (quoteData && [ActivityStatus.INPROCESS, ActivityStatus.SUCCESS, ActivityStatus.DELAYED].includes(status)) {
      setBridgeInfoParams({
        fromTokenAmount,
        toTokenAmount,
        quoteData,
        fromSymbol,
        toSymbol,
        status
      });
    } else {
      activity.reason
        ? showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: activity.reason, onSuccess: hideModal, onFailure: hideModal })
        : activity.status === ActivityStatus.FAILED && showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: t('TRANSACTION_FAILED_REASON_NA'), onSuccess: hideModal, onFailure: hideModal });
    }
  };

  return (<>
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} fD='row' mB={10} mT={10} alIT='center' jC='flex-start'
      onPress={onPressBridgeItem}>
      <DynamicView dynamic style={styles.activitiesParent}>
        <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={icon} />
        {activity.status === ActivityStatus.DELAYED && delayDuration && <DynamicImage dynamic dynamicWidthFix height={12} width={12} resizemode='contain' source={AppImages.CLOCK} style={styles.activitiesLogoAbsolute}/> }
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={96} fD='row' alIT='flex-start' jC='space-between' >
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mL={10} color={Colors.primaryTextColor}>{String('Bridge')}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={3} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
          {activity.status === ActivityStatus.DELAYED && delayDuration && <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={3} tA={'center'}
                  color={statusColor}>{` BY ${delayDuration} mins`}</CText>}
        </DynamicView>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} color={Colors.primaryTextColor}>{formatDate}</CText>
      </DynamicView>
    </DynamicTouchView>
    <DynamicTouchView dynamic dynamicHeightFix height={85} dynamicWidth pB={5} width={100} pH={10} mB={10} fD='row' alIT='flex-start' jC='space-between' bGC='	#F8F8F8' style={{ color: Colors.primaryTextColor, borderWidth: 1, borderColor: '#dddddd', borderRadius: 10 }}
      onPress={onPressBridgeItem} >
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'center'} jC='center'>
        <DynamicView dynamic dynamicHeight height={20} jC='center' style={{ borderRadius: 10 }}>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} color={'red'}>{formatFromAmount}</CText>
        </DynamicView>
        <DynamicView dynamic dynamicWidth width={100} mL={15} mT={5} pH={10} fD='row' alIT='flex-start' jC='center'>
          <DynamicView dynamic pos={'relative'}>
            <CyDFastImage
              className={'h-[40px] w-[40px]'}
              source={{
                uri: activity.fromTokenLogoUrl
              }}
            />
            <DynamicView
                dynamic
                style={{ position: 'absolute', top: 23, right: -10 }}
              >
                <CyDFastImage
                  className={'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'}
                  source={fromChainlogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </DynamicView>
          </DynamicView>
          <DynamicView dynamic dynamicWidth width={100} pH={10} aLIT={'flex-start'} jC='center'>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={11} color={Colors.primaryTextColor} style={{ height: 20 }} >{activity.fromChain}</CText>
            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={11} color={Colors.primaryTextColor}>{activity.fromChain}</CText>
          </DynamicView>
        </DynamicView>
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={20} jC={'center'} aLIT={'center'}>
        <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={10} marginHorizontal={6} height={20} width={20} resizemode='contain'
          source={AppImages.BRIDGE_GRAY} style={{ tintColor: '#666666' }} />
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'center'} jC='center'>
        <DynamicView dynamic mT={8} jC='center' style={{ borderRadius: 10 }}>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} color={Colors.activityPositiveAmount}>{formatToAmount}</CText>
        </DynamicView>
        <DynamicView dynamic dynamicWidth mL={15} width={100} mT={5} pH={10} fD='row' aLIT='center' jC='center'>
        <DynamicView dynamic pos={'relative'}>
            <CyDFastImage
              className={'h-[40px] w-[40px]'}
              source={{
                uri: activity.toTokenLogoUrl
              }}
            />
            <DynamicView
                dynamic
                style={{ position: 'absolute', top: 23, right: -10 }}
              >
                <CyDFastImage
                  className={'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'}
                  source={toChainlogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </DynamicView>
          </DynamicView>
          <DynamicView dynamic dynamicWidth width={100} pH={10} aLIT={'flex-start'} jC='center'>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={11} color={Colors.primaryTextColor} style={{ height: 20 }} >{activity.toChain}</CText>
            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={11} color={Colors.primaryTextColor}>{activity.toChain}</CText>
          </DynamicView>
        </DynamicView>
      </DynamicView>
    </DynamicTouchView>
  </>);
}

function IBCItem (props: any) {
  const activity: IBCTransaction = props.activity;

  const fromChainlogo = ALL_CHAINS.find(chain => chain.name === activity.fromChain)?.logo_url;
  const toChainlogo = ALL_CHAINS.find(chain => chain.name === activity.toChain)?.logo_url;
  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.IBC_ERROR : activity.status === ActivityStatus.PENDING ? AppImages.IBC_PENDING : AppImages.IBC_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatFromAmount = `- ${activity.amount.slice(0, 4)} ${activity.symbol}`;
  const formatToAmount = `+ ${activity.amount.slice(0, 4)} ${activity.symbol}`;
  return (<>
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} fD='row' mB={10} mT={10} alIT='center' jC='flex-start'>
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={icon} />
      <DynamicView dynamic dynamicWidth width={96} fD='row' alIT='flex-start' jC='space-between' >
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mL={10} color={Colors.primaryTextColor}>{'IBC'}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={3} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} color={Colors.primaryTextColor}>{formatDate}</CText>
      </DynamicView>
    </DynamicTouchView>
    <DynamicTouchView dynamic dynamicHeightFix height={85} dynamicWidth pB={5} width={100} pH={10} mB={10} fD='row' alIT='flex-start' jC='flex-start' bGC='	#F8F8F8' style={{ color: Colors.primaryTextColor, borderWidth: 1, borderColor: '#dddddd', borderRadius: 10 }} >
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'center'} jC='center'>
        <DynamicView dynamic dynamicHeight height={20} jC='center' style={{ borderRadius: 10 }}>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} color={'red'}>{formatFromAmount}</CText>
        </DynamicView>
        <DynamicView dynamic dynamicWidth width={100} mL={15} mT={5} pH={10} fD='row' alIT='flex-start' jC='center'>
        <DynamicView dynamic pos={'relative'}>
            <CyDFastImage
              className={'h-[40px] w-[40px]'}
              source={{
                uri: activity.tokenLogoUrl
              }}
            />
            <DynamicView
                dynamic
                style={{ position: 'absolute', top: 23, right: -10 }}
              >
                <CyDFastImage
                  className={'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'}
                  source={fromChainlogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </DynamicView>
          </DynamicView>
          <DynamicView dynamic dynamicWidth width={100} pH={10} aLIT={'flex-start'} jC='center'>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={11} color={Colors.primaryTextColor} style={{ height: 20 }} >{activity.token}</CText>
            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={11} color={Colors.primaryTextColor}>{activity.fromChain}</CText>
          </DynamicView>
        </DynamicView>
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={20} jC={'center'} aLIT={'center'}>
        <DynamicImage dynamic dynamicWidthFix aLIT={'flex-end'} mT={10} marginHorizontal={6} height={17} width={17} resizemode='contain'
          source={AppImages.IBC_GRAY} style={{ tintColor: '#666666' }} />
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'center'} jC='center'>
        <DynamicView dynamic mT={8} jC='center' style={{ borderRadius: 10 }}>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} color={Colors.activityPositiveAmount}>{formatToAmount}</CText>
        </DynamicView>
        <DynamicView dynamic dynamicWidth mL={15} width={100} mT={5} pH={10} fD='row' aLIT='center' jC='center'>
        <DynamicView dynamic pos={'relative'}>
            <CyDFastImage
              className={'h-[40px] w-[40px]'}
              source={{
                uri: activity.tokenLogoUrl
              }}
            />
            <DynamicView
                dynamic
                style={{ position: 'absolute', top: 23, right: -10 }}
              >
                <CyDFastImage
                  className={'h-[18px] w-[18px] rounded-[50px] border-[1px] border-white bg-white'}
                  source={toChainlogo}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </DynamicView>
          </DynamicView>
          <DynamicView dynamic dynamicWidth width={100} pH={10} aLIT={'flex-start'} jC='center'>
            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={11} color={Colors.primaryTextColor} style={{ height: 20 }} >{activity.token}</CText>
            <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={11} color={Colors.primaryTextColor}>{activity.toChain}</CText>
          </DynamicView>
        </DynamicView>
      </DynamicView>
    </DynamicTouchView>
  </>);
}

function WalletConnectItem (props: any) {
  const activity: WalletConnectTransaction = props.activity;

  const { showModal, hideModal } = useGlobalModalContext();

  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.WALLETCONNECT_FAILED : activity.status === ActivityStatus.PENDING ? AppImages.WALLETCONNECT_PENDING : AppImages.WALLETCONNECT_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatAmount = `- ${activity.amount.slice(0, 8)} ${activity.symbol}`;
  const webIconUrl = `https://www.google.com/s2/favicons?domain=${activity.websiteInfo.host}&sz=32`;

  const onPressWCItem = () => {
    if (activity.status === ActivityStatus.FAILED) {
      activity.reason
        ? showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: activity.reason, onSuccess: hideModal, onFailure: hideModal })
        : showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: t('TRANSACTION_FAILED_REASON_NA'), onSuccess: hideModal, onFailure: hideModal });
    }
  };
  return (
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} mB={7} fD='row' pB={9} alIT='flex-start' jC='flex-start' onPress={onPressWCItem}>
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={icon} />
      <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={60} pH={10} aLIT={'flex-start'} jC='flex-start'>
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mT={10} color={Colors.primaryTextColor}>{'WalletConnect'}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={12} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <DynamicView dynamic fD='row' jC='flex-start' aLIT='center'>
          <DynamicImage dynamic dynamicWidthFix height={16} width={18} resizemode='contain' source={{ uri: webIconUrl }} />
          <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mL={5} tA={'left'} color={Colors.primaryTextColor}>{activity.websiteInfo.host}</CText>
        </DynamicView>
        {/* <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} color={Colors.primaryTextColor}>{formatAddress}</CText> */}
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'flex-end'} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.primaryTextColor}>{formatDate}</CText>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} mT={5} color={Colors.activityNegativeAmount}>{formatAmount}</CText>
      </DynamicView>
    </DynamicTouchView>);
}

function BrowserItem (props: any) {
  const activity: BrowserTransaction = props.activity;

  const { showModal, hideModal } = useGlobalModalContext();

  const onPressBrowserItem = () => {
    if (activity.status === ActivityStatus.FAILED) {
      activity.reason
        ? showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: activity.reason, onSuccess: hideModal, onFailure: hideModal })
        : showModal('state', { type: 'error', title: t('TRANSACTION_FAILED'), description: t('TRANSACTION_FAILED_REASON_NA'), onSuccess: hideModal, onFailure: hideModal });
    }
  };

  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.BROWSERACTIVITY_ERROR : activity.status === ActivityStatus.PENDING ? AppImages.BROWSERACTIVITY_PENDING : AppImages.BROWSERACTIVITY_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatAmount = `- ${activity.amount.slice(0, 8)} ${activity.symbol}`;
  const webIconUrl = `https://www.google.com/s2/favicons?domain=${activity.websiteInfo.host}&sz=32`;

  return (
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} mB={7} fD='row' pB={9} alIT='flex-start' jC='flex-start' onPress={onPressBrowserItem}>
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={icon} />
      <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={60} pH={10} aLIT={'flex-start'} jC='flex-start'>
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mT={10} color={Colors.primaryTextColor}>{'Browser'}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={12} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <DynamicView dynamic fD='row' jC='flex-start' aLIT='center'>
          <DynamicImage dynamic dynamicWidthFix height={16} width={18} resizemode='contain' source={{ uri: webIconUrl }} />
          <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mL={5} tA={'left'} color={Colors.primaryTextColor}>{activity.websiteInfo.host}</CText>
        </DynamicView>
        {/* <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} color={Colors.primaryTextColor}>{formatAddress}</CText> */}
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'flex-end'} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.primaryTextColor}>{formatDate}</CText>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={12} mT={5} color={Colors.activityNegativeAmount}>{formatAmount}</CText>
      </DynamicView>
    </DynamicTouchView>);
}

function CardItem (props: any) {
  const activity: DebitCardTransaction = props.activity;

  const { setCardInfoParams } = props;

  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.CARD_ERROR : activity.status === ActivityStatus.PENDING ? AppImages.CARD_PENDING : AppImages.CARD_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatAmount = `- ${activity.amount.slice(0, 8)} ${activity.tokenSymbol}`;
  const formatAmountUsd = activity.status === ActivityStatus.SUCCESS ? `+ $${activity.amountInUsd}` : '';

  return (
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} fD='row' mB={7} pB={9} alIT='flex-start' jC='flex-start'
      onPress={() => {
        [ActivityStatus.SUCCESS, ActivityStatus.INPROCESS].includes(activity.status) &&
          setCardInfoParams({
            datetime: activity.datetime,
            symbol: activity.tokenSymbol,
            amountInUsd: activity.amountInUsd,
            amount: activity.amount,
            gasAmount: activity.gasAmount,
            quoteId: activity.quoteId,
            txnHash: activity.transactionHash
          });
      }
      }
    >
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={icon} />
      <DynamicView dynamic dynamicWidth width={60} pH={10} aLIT={'flex-start'} jC='flex-start'>
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mT={10} color={Colors.primaryTextColor}>{t<string>('CYPHERD_CARD')}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={12} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} color={Colors.activityNegativeAmount}>{formatAmount}</CText>
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'flex-end'} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.primaryTextColor}>{formatDate}</CText>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} mT={5} color={Colors.activityPositiveAmount}>{formatAmountUsd}</CText>
      </DynamicView>
    </DynamicTouchView>);
}

function SardinePayItem (props: any) {
  const activity: DebitCardTransaction = props.activity;

  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const icon = activity.status === ActivityStatus.FAILED ? AppImages.CARD_ERROR : activity.status === ActivityStatus.PENDING ? AppImages.CARD_PENDING : AppImages.CARD_SUCCESS;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatAmount = `+ ${activity.amount} ${activity.tokenSymbol}`;
  const formatAmountUsd = activity.status === ActivityStatus.SUCCESS ? `- $${activity.amountInUsd}` : '';

  return (
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} fD='row' mB={7} pB={9} alIT='flex-start' jC='flex-start'
    >
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={AppImages.SARDINE} />
      <DynamicView dynamic dynamicWidth width={60} pH={10} aLIT={'flex-start'} jC='flex-start'>
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mT={10} color={Colors.primaryTextColor}>{'Sardine Pay'}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={12} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} color={Colors.activityPositiveAmount}>{formatAmount}</CText>
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'flex-end'} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.primaryTextColor}>{formatDate}</CText>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} mT={5} color={Colors.activityNegativeAmount}>{formatAmountUsd}</CText>
      </DynamicView>
    </DynamicTouchView>);
}

function OnmetaPayItem (props: any) {
  const activity: OnmetaTransaction = props.activity;

  const statusColor = activity.status === ActivityStatus.FAILED ? Colors.activityFailed : activity.status === ActivityStatus.PENDING ? Colors.activityPending : Colors.activitySuccess;
  const fromNow = moment(activity.datetime).fromNow();
  const formatDate = fromNow.includes('day') ? moment(activity.datetime).format('MMM DD, h:mm a') : fromNow;
  const formatAmount = `- ${activity.amount.slice(0, 8)} ${activity.symbol}`;
  const operation = activity.onmetaType.toUpperCase();

  return (
    <DynamicTouchView dynamic dynamicWidth width={100} pH={10} fD='row' mB={7} pB={9} alIT='flex-start' jC='flex-start'
    >
      <DynamicImage dynamic dynamicWidthFix height={22} width={22} resizemode='contain' source={AppImages.ONMETA} />
      <DynamicView dynamic dynamicWidth width={60} pH={10} aLIT={'flex-start'} jC='flex-start'>
        <DynamicView dynamic fD='row' alIT='center' jC='flex-start'>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={16} mT={10} color={Colors.primaryTextColor}>{'Onmeta'}</CText>
          <CText dynamic fF={C.fontsName.FONT_BOLD} fS={8} mT={12} mL={6} tA={'center'} color={statusColor}>{statuses[activity.status]}</CText>
        </DynamicView>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} color={Colors.primaryTextColor}>{operation}</CText>
      </DynamicView>
      <DynamicView dynamic dynamicWidth width={40} pH={10} aLIT={'flex-end'} jC='flex-start'>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={12} mT={10} color={Colors.primaryTextColor}>{formatDate}</CText>
        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={13} mT={5} color={Colors.activityNegativeAmount}>{formatAmount}</CText>
      </DynamicView>
    </DynamicTouchView>);
}

export default function Activites (props:
{ navigation: any
  route:
  { params:
  { filter: { types: string[], time: string, statuses: string[] } }
  }
}) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { navigation, route } = props;
  const filter = route?.params?.filter ?? { time: TIME_GAPS[0], types: ACTIVITY_TYPES, statuses: STATUSES };

  const { t } = useTranslation();
  const activityContext = useContext<any>(ActivityContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [showCardInfo, setShowCardInfo] = useState(false);
  const [showBridgeInfo, setShowBridgeInfo] = useState(false);
  const [showSendInfo, setShowSendInfo] = useState(false);

  const [cardInfoParams, setCardInfoParams] = useState<{
    datetime: Date
    amount: string
    symbol: string
    amountInUsd: string
    gasAmount: string
  } | null>(null);

  const [sendInfoParams, setSendInfoParams] = useState<{
    datetime: Date
    amount: string
    symbol: string
    chainName: string
    chainLogo: string
    transactionHash: string
    gasAmount: string
    toAddress: string
    fromAddress: string
    tokenName: string
    tokenLogo: string
  } | null>(null);

  const [bridgeInfoParams, setBridgeInfoParams] = useState<any>(null);

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

  const activityTypesFilterMapping: Record<string, ActivityType> = {
    Bridge: ActivityType.BRIDGE,
    'Debit Card': ActivityType.CARD,
    Sent: ActivityType.SEND,
    IBC: ActivityType.IBC,
    Browser: ActivityType.BROWSER,
    'Wallet Connect': ActivityType.WALLETCONNECT,
    'Sardine Pay': ActivityType.SARDINEPAY,
    Onmeta: ActivityType.ONMETA
  };

  const statusFilterMapping: Record<string, ActivityStatus> = {
    PENDING: ActivityStatus.PENDING,
    FAILED: ActivityStatus.FAILED,
    SUCCESS: ActivityStatus.SUCCESS,
    'IN PROCESS': ActivityStatus.INPROCESS,
    DELAYED: ActivityStatus.DELAYED
  };

  useEffect(() => {
    const { ethereum: { address } } = hdWalletContext.state.wallet;
    analytics().logEvent('activity_screen_view', {
      fromEthAddress: address
    }).catch(Sentry.captureException);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CyDTouchView onPress={() => navigation.navigate(C.screenTitle.ACTIVITYFILTER)}>
          <CyDImage className='w-[78px] h-[25px]' source={AppImages.ACTIVITY_FILTER} />
        </CyDTouchView>
      )
    });
  }, [props.navigation]);

  const getLowerLimitDate = (timeGap: string) => {
    const time = moment();
    switch (timeGap) {
      case TIME_GAPS[1]:
        time.startOf('day');
        break;
      case TIME_GAPS[2]:
        time.startOf('week');
        break;
      case TIME_GAPS[3]:
        time.startOf('month');
        break;
    }

    return time;
  };

  const spliceActivitiesByDate = (): any => {
    if (activityContext.state.activityObjects.length === 0) { return []; }

    let activities: ActivityAny[] = [...activityContext.state.activityObjects]
      .filter((activity: ActivityAny) => filter.types.map((fil) => activityTypesFilterMapping[fil]).includes(activity.type))
      .filter((activity: ActivityAny) => filter.statuses.map((stat) => statusFilterMapping[stat]).includes(activity.status));

    if (filter.time !== TIME_GAPS[0]) {
      activities = activities.filter((activity: ActivityAny) => moment(activity.datetime) > getLowerLimitDate(filter.time));
    }

    activities.sort(function (a, b) {
      const c = new Date(a.datetime);
      const d = new Date(b.datetime);
      return d.getTime() - c.getTime();
    });

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
      const tDate = (date === today ? 'Today - ' : date === yesterday ? 'Yesterday - ' : '') + date;
      tActivities.push({ dateString: tDate, entry: activityByDate[date] });
    }

    return tActivities;
  };

  const updateStatusForCardOrBridge = (activity: BridgeTransaction | DebitCardTransaction | SardinePayTransaction) => {
    if ((activity.status === ActivityStatus.INPROCESS || activity.status === ActivityStatus.DELAYED || activity.status === ActivityStatus.PENDING) && activity.quoteId) {
      const activityStatusUrl = `${ARCH_HOST}/v1/activities/status/${activity.type}/${activity.quoteId}`;
      axios.get(activityStatusUrl, { timeout: 3000 })
        .then(res => {
          const { data: { activityStatus: { status, quoteId } } } = res;
          if (quoteId === activity.quoteId && [IN_PROGRESS, PENDING, FAILED, COMPLETED, DELAYED].includes(status)) {
            let updateStatus;
            if (status === DELAYED) {
              const { data: { activityStatus: { delayDuration } } } = res;
              updateStatus = ActivityStatus.DELAYED;
              if (activity.status === ActivityStatus.DELAYED) {
                if (delayDuration !== activity.delayDuration && delayDuration) {
                  activityContext.dispatch({
                    type: ActivityReducerAction.PATCH,
                    value: {
                      id: activity.id,
                      status: updateStatus,
                      delayDuration
                    }
                  });
                }
              } else {
                activityContext.dispatch({
                  type: ActivityReducerAction.PATCH,
                  value: {
                    id: activity.id,
                    status: updateStatus
                  }
                });
              }
            } else if (status === COMPLETED) {
              updateStatus = ActivityStatus.SUCCESS;
              activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activity.id, status: updateStatus } });
            } else if (status === IN_PROGRESS || status === PENDING) {
              updateStatus = status === IN_PROGRESS ? ActivityStatus.INPROCESS : ActivityStatus.PENDING;
              activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activity.id, status: updateStatus } });
            } else if (status !== IN_PROGRESS && status !== PENDING) {
              updateStatus = status === FAILED ? ActivityStatus.FAILED : ActivityStatus.SUCCESS;
              activityContext.dispatch({ type: ActivityReducerAction.PATCH, value: { id: activity.id, status: updateStatus } });
            }
          } else {
            throw new Error(`Received invalid status: ${status} for quoteId:${quoteId}`);
          }
        })
        .catch(e => {
          Sentry.captureException(e);
        });
    }
  };

  if (activityContext.state.activityObjects.length === 0 || spliceActivitiesByDate().length === 0) {
    return (<DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} pH={10} jC='center' bGC={'white'}>
      <DynamicImage dynamic dynamicWidth height={130} width={130} resizemode='contain' source={AppImages.NO_ACTIVITIES} />
    </DynamicView>);
  }
  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (<DynamicScrollView dynamic bGC='white'>
      <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} pH={10} jC='flex-start'>
          <ActivityInfoModal
            setModalVisible={setShowCardInfo}
            isModalVisible={showCardInfo}
            params={cardInfoParams}
          />
          <ActivityBridgeInfoModal
            setModalVisible={setShowBridgeInfo}
            isModalVisible={showBridgeInfo}
            params={bridgeInfoParams}
          />
          <ActivitySendInfoModal
            setModalVisible={setShowSendInfo}
            isModalVisible={showSendInfo}
            params={sendInfoParams}
            navigationRef={navigation}
          />
          {spliceActivitiesByDate().map((day: any) => (
            <DynamicView dynamic dynamicWidth width={100} mL={3} mR={3} key={day.dateString} >
              <CText dynamic dynamicWidth width={90} numberOfLines={1} fF={C.fontsName.FONT_REGULAR} tA={'left'} mL={-30} fS={13} style={{ color: Colors.primaryTextColor }}>{day.dateString}</CText>
              {day.entry.map((activity: ActivityAny, index: any) => {
                switch (activity.type) {
                  case ActivityType.SEND:
                    return (<SentItem key={activity.id + 'sent'} activity={activity} setSendInfoParams={setSendInfoParams} />);
                  case ActivityType.BRIDGE:
                    (activity.status === ActivityStatus.INPROCESS || activity.status === ActivityStatus.DELAYED || activity.status === ActivityStatus.PENDING) && updateStatusForCardOrBridge(activity as BridgeTransaction);
                    return (<BridgeItem key={activity.id + 'bridge'} activity={activity}
                                        setBridgeInfoParams={setBridgeInfoParams}/>);
                  case ActivityType.CARD:
                    activity.status === ActivityStatus.INPROCESS && updateStatusForCardOrBridge(activity as DebitCardTransaction);
                    return (<CardItem key={activity.id + 'card'} activity={activity as DebitCardTransaction} setCardInfoParams={setCardInfoParams} />);
                  case ActivityType.IBC:
                    return (<IBCItem key={activity.id + 'ibc'} activity={activity} />);
                  case ActivityType.BROWSER:
                    return (<BrowserItem key={activity.id + genId() + 'browser'} activity={activity} />);
                  case ActivityType.WALLETCONNECT:
                    return (<WalletConnectItem key={activity.id + genId() + 'browser'} activity={activity} />);
                  case ActivityType.SARDINEPAY:
                    activity.status === ActivityStatus.INPROCESS && updateStatusForCardOrBridge(activity as SardinePayTransaction);
                    return (<SardinePayItem key={activity.id + 'sardinepay'} activity={activity} />);
                }
              })}
            </DynamicView>
          ))}
        </DynamicView>
    </DynamicScrollView>);
}

const styles = StyleSheet.create({
  activitiesParent: {
    position: 'relative'
  },
  activitiesLogoAbsolute: {
    position: 'absolute',
    bottom: 0,
    right: -6
  }
});
