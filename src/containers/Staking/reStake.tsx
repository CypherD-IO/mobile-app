import analytics from '@react-native-firebase/analytics';
import { useRoute } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { ethers } from 'ethers';
import { random } from 'lodash';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, FlatList, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import AppImages from '../../../assets/images/appImages';
import EmptyView from '../../components/EmptyView';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import Button from '../../components/v2/button';
import Loading from '../../components/v2/loading';
import CyDModalLayout from '../../components/v2/modal';
import * as C from '../../constants';
import { AnalyticsType, TokenOverviewTabIndices } from '../../constants/enum';
import { Colors } from '../../constants/theme';
import { MODAL_HIDE_TIMEOUT, MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { stakeValidators } from '../../core/Staking';
import {
  HdWalletContext,
  PortfolioContext,
  StakingContext,
  convertToEvmosFromAevmos,
  logAnalytics,
} from '../../core/util';
import useTransactionManager from '../../hooks/useTransactionManager';
import { PORTFOLIO_REFRESH } from '../../reducers/portfolio_reducer';
import { RESET, STAKING_EMPTY } from '../../reducers/stakingReducer';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView,
} = require('../../styles');

export default function ReStake({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { t } = useTranslation();
  const { tokenData, reward } = route.params;
  const [allValidatorsData, setAllValidatorsList] = useState<stakeValidators[]>(
    [],
  );
  const stakingValidators = useContext<any>(StakingContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [itemData, setItemData] = useState<any>({ description: { name: '' } });
  const [delegateModalVisible, setDelegateModalVisible] =
    useState<boolean>(false);
  const [finalDelegateGasFee, setFinalDelegateGasFee] = useState<number>(0);
  const { showModal, hideModal } = useGlobalModalContext();
  const { delegateEvmosToken } = useTransactionManager();

  const useroute = useRoute();

  function onTransModalHide() {
    hideModal();
    setTimeout(() => {
      // This is to refresh the staking page again on navigating back to Token overview staking page below to dissatisfy isStakingDispatched() condition there
      stakingValidators.dispatchStaking({
        value: {
          allValidatorsListState: STAKING_EMPTY,
        },
      });
    }, MODAL_HIDE_TIMEOUT);
    setTimeout(() => {
      navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
        tokenData,
        navigateTo: TokenOverviewTabIndices.STAKING,
      });
    }, MODAL_HIDE_TIMEOUT);
  }

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const renderSuccessTransaction = (hash: string) => {
    return (
      <SuccessTransaction
        hash={hash}
        symbol={tokenData?.chainDetails?.symbol}
        name={tokenData.chainDetails.name}
        navigation={navigation}
        hideModal={hideModal}
      />
    );
  };

  const delegateFinalTxn = async () => {
    try {
      setIsLoading(true);
      void analytics().logEvent('evmos_redelegation_started');
      const txnResponse = await delegateEvmosToken({
        validatorAddress: itemData.address,
        amountToDelegate: ethers.formatUnits(reward, 18),
      });
      if (!txnResponse?.isError) {
        setIsLoading(false);
        setDelegateModalVisible(false);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.SUCCESS,
          txnHash: txnResponse?.hash,
          chain: tokenData.chainDetails.name ?? '',
        });
        void analytics().logEvent('evmos_redelgation_completed');
        Toast.show({
          type: 'success',
          text1: 'Transaction',
          text2: 'Transaction Receipt Received',
          position: 'bottom',
        });
        setTimeout(() => {
          portfolioState.dispatchPortfolio({
            type: PORTFOLIO_REFRESH,
            value: {
              hdWallet,
              portfolioState,
            },
          });
          stakingValidators.dispatchStaking({
            type: RESET,
          });
        }, 3000);
        setTimeout(() => {
          showModal('state', {
            type: t('TOAST_TYPE_SUCCESS'),
            title: t('TRANSACTION_SUCCESS'),
            description: renderSuccessTransaction(txnResponse?.hash ?? ''),
            onSuccess: onTransModalHide,
            onFailure: hideModal,
          });
        }, MODAL_HIDE_TIMEOUT_250);
      } else {
        setIsLoading(false);
        setDelegateModalVisible(false);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData.chainDetails.name ?? '',
          message: `error while broadcasting the transaction in evmos staking/delegation.tsx : ${txnResponse.data.tx_response.raw_log}`,
          screen: useroute.name,
        });
        Sentry.captureException(txnResponse);
        setTimeout(() => {
          showModal('state', {
            type: 'error',
            title: 'Transaction Failed',
            description: txnResponse?.error,
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }, MODAL_HIDE_TIMEOUT_250);
      }
    } catch (error: any) {
      setIsLoading(false);
      setDelegateModalVisible(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: tokenData.chainDetails.name ?? '',
        message: `error while ${stakingValidators.stateStaking.typeOfDelegation as string} in evmos staking/restake.tsx`,
        screen: useroute.name,
      });
      Sentry.captureException(error);
      setTimeout(() => {
        showModal('state', {
          type: 'error',
          title: 'Transaction failed',
          description: error.message,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }, MODAL_HIDE_TIMEOUT_250);
    }

    setIsLoading(true);
  };

  const onDelegate = async () => {
    setFinalDelegateGasFee(random(0.001, 0.01, true));
    setDelegateModalVisible(true);
  };

  useEffect(() => {
    if (itemData.description.name !== '') {
      void onDelegate();
    }
  }, [itemData]);

  useEffect(() => {
    const allData: stakeValidators[] = [];
    for (const item of stakingValidators.stateStaking.allValidators.values()) {
      allData.push(item);
    }
    allData?.sort((a, b) =>
      parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1,
    );
    setAllValidatorsList(allData);
  }, []);

  const convert = (n: number) => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return (n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  };

  const Item = ({ item }) => (
    <DynamicTouchView
      dynamic
      fD={'row'}
      dynamicWidth
      width={100}
      pV={16}
      pH={16}
      bGC={
        item.description.name ===
        stakingValidators.stateStaking.reValidator.description.name
          ? 'rgba(88, 173, 171, 0.09)'
          : Colors.whiteColor
      }
      onPress={async () => {
        setItemData(item);
      }}>
      <DynamicView dynamic jC={'flex-start'} aLIT={'flex-start'}>
        <CText
          dynamic
          fF={C.fontsName.FONT_SEMI_BOLD}
          fS={14}
          pV={5}
          tA={'left'}
          color={Colors.primaryTextColor}>
          {item.description.name}
        </CText>
        <DynamicView dynamic fD={'row'}>
          {item.apr !== '0.00' && (
            <CyDImage
              source={AppImages.APR_ICON}
              className={'w-[20px] h-[16px]'}
            />
          )}
          {item.apr !== '0.00' && (
            <CText
              dynamic
              mL={4}
              fF={C.fontsName.FONT_SEMI_BOLD}
              fS={12}
              tA={'left'}
              color={Colors.subTextColor}>{`APR ${item.apr}`}</CText>
          )}
          <DynamicImage
            dynamic
            mL={10}
            source={AppImages.COINS}
            width={14}
            height={12}
          />
          <CText
            dynamic
            mL={4}
            fF={C.fontsName.FONT_SEMI_BOLD}
            fS={12}
            tA={'left'}
            color={Colors.subTextColor}>
            {convert(convertToEvmosFromAevmos(item.tokens)) + ' EVMOS'}
          </CText>
        </DynamicView>
      </DynamicView>
    </DynamicTouchView>
  );

  const renderItem = ({ item }) => <Item item={item} />;

  const memoizedValue = useMemo(() => renderItem, [allValidatorsData]);

  const emptyView = (view: any) => {
    return (
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={80}
        width={100}
        mT={0}
        bGC={Colors.whiteColor}
        aLIT={'center'}>
        {view === 'empty' ? (
          <EmptyView
            text={t('NO_CURRENT_HOLDINGS')}
            image={AppImages.EMPTY}
            buyVisible={false}
            marginTop={80}
          />
        ) : (
          <></>
        )}
      </DynamicView>
    );
  };

  return (
    <>
      <CyDModalLayout
        setModalVisible={setDelegateModalVisible}
        isModalVisible={delegateModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => {
              setDelegateModalVisible(false);
              setItemData({ description: { name: '' } });
            }}
            className={'z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={
                ' w-[22px] h-[22px] z-[50] absolute right-[0px] top-[-10px] '
              }
            />
          </CyDTouchView>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {t('DELEGATE')}
          </CyDText>
          <CyDView className={'flex flex-row mt-[40px]'}>
            <CyDImage
              source={AppImages[tokenData.chainDetails.backendName + '_LOGO']}
              className={'h-[20px] w-[20px]'}
            />
            <CyDView className={' flex flex-row'}>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>
                {(parseFloat(reward) * 10 ** -18).toFixed(6).toString() +
                  ' EVMOS '}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row mt-[20px]'}>
            <CyDImage
              source={AppImages.GAS_FEES}
              className={'w-[16px] h-[16px] mt-[3px]'}
              resizeMode='contain'
            />
            <CyDView className={' flex flex-row mt-[3px]'}>
              <CyDText
                className={
                  ' font-medium text-[16px] ml-[10px] text-primaryTextColor'
                }>
                {t('GAS_FEE')}
              </CyDText>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>
                {finalDelegateGasFee.toFixed(6) + ' EVMOS'}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
            <Button
              onPress={() => {
                void delegateFinalTxn();
              }}
              title={t('APPROVE')}
              style={'py-[5%] min-h-[60px]'}
              loading={isLoading}
              loaderStyle={{ height: 24 }}
            />
            <Button
              onPress={() => {
                setDelegateModalVisible(false);
                setItemData({ description: { name: '' } });
              }}
              title={t('REJECT')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      {loading && <Loading />}

      {!loading && (
        <DynamicView dynamic>
          <FlatList
            removeClippedSubviews
            nestedScrollEnabled
            data={allValidatorsData}
            renderItem={memoizedValue}
            style={{ width: '100%', backgroundColor: Colors.whiteColor }}
            keyExtractor={item => item.description.name}
            ListEmptyComponent={emptyView('empty')}
            showsVerticalScrollIndicator={true}
          />
        </DynamicView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
