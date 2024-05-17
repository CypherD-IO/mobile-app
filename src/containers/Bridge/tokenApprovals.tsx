/**
 * @format
 * @flow
 */
import React, { useState, useEffect, useContext } from 'react';
import { Dimensions, FlatList, ImageBackground, Platform } from 'react-native';
import * as C from '../../constants/index';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import AppImages from '../../../assets/images/appImages';
import {
  ChooseChainModal,
  WHERE_PORTFOLIO,
} from '../../components/ChooseChainModal';
import EmptyView from '../../components/EmptyView';
import axios from '../../core/Http';
import { HdWalletContext, PortfolioContext } from '../../core/util';
import { ifIphoneX } from 'react-native-iphone-x-helper';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../global';
const {
  CText,
  SafeAreaView,
  DynamicView,
  DynamicImage,
  DynamicTouchView,
} = require('../../styles');

const window = Dimensions.get('window');

export default function TokenApprovals(props) {
  const { t } = useTranslation();
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [chooseChain, setChooseChain] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [tokenAllowances, setTokenAllowances] = useState<any>({
    ETH: [],
    MATIC: [],
    AVAX: [],
    BNB: [],
    SHM: [],
  });
  const [chainExposureBalanceUSD, setChainExposureBalanceUSD] = useState<any>({
    ETH: '0',
    MATIC: '0',
    AVAX: '0',
    BNB: '0',
    SHM: '0',
  });
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const ethereum = hdWallet.state.wallet.ethereum;
  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  useEffect(() => {
    async function fetchData() {
      const chain = portfolioState.statePortfolio.selectedChain.symbol;
      setIsLoading(true);
      const get_portfolio_url = `${PORTFOLIO_HOST}/v1/userholdings/token/approvals`;
      const out = [];
      await axios
        .get(get_portfolio_url, {
          params: {
            address: ethereum.address,
            chain: portfolioState.statePortfolio.selectedChain.backendName,
          },
          timeout: 3000,
        })
        .then(res => {
          let total_chain_exposure_balance_usd = 0;
          if (res.data.length > 0) {
            let i = 1;
            for (const holding of res.data) {
              holding.id = i;
              out.push(holding);
              i += 1;
              total_chain_exposure_balance_usd += holding.sum_exposure_usd;
            }
            tokenAllowances[chain] = out;
            setTokenAllowances(tokenAllowances);
            chainExposureBalanceUSD[chain] = total_chain_exposure_balance_usd;
            setChainExposureBalanceUSD(chainExposureBalanceUSD);
          }
        })
        .catch(error => {
          // TODO (user feedback): Give feedback to user.
          Sentry.captureException(error);
        });
      setIsLoading(false);
    }
    fetchData();
  }, [hdWallet, portfolioState]);

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎
  const Item = ({ item }) => (
    <>
      <DynamicTouchView
        sentry-label='token-approval-details'
        dynamic
        dynamicWidth
        width={100}
        fD={'row'}
        pV={10}
        onPress={() => {
          analytics().logEvent('token_approval_details_screen', {
            from: ethereum.address,
          });
          props.navigation.navigate(
            C.screenTitle.TOKEN_APPROVALS_DETAILS_SCREEN,
            {
              tokenData: item,
            },
          );
        }}>
        {item.logo_url ? (
          <DynamicImage
            dynamic
            dynamicWidthFix
            bGC={'red'}
            dynamicHeightFix
            height={40}
            width={40}
            resizemode='contain'
            source={{
              uri: item.logo_url,
            }}
          />
        ) : (
          <DynamicView
            dynamic
            dynamicWidthFix
            dynamicHeightFix
            height={54}
            width={54}
            aLIT='center'
            fD={'row'}
            jC='center'
            bGC='#627EEA'
            bR={20}>
            <CText
              tA={'center'}
              dynamicWidth
              width={100}
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={14}
              color={Colors.whiteColor}>
              {item.symbol.substring(0, 4)}
            </CText>
          </DynamicView>
        )}
        <DynamicView
          dynamic
          dynamicHeightFix
          height={54}
          width={100}
          fD={'row'}
          bR={20}
          jC={'flex-start'}
          aLIT={'flex-start'}>
          <DynamicView
            dynamic
            dynamicWidthFix
            width={100}
            dynamicHeightFix
            height={54}
            aLIT='flex-start'
            fD={'column'}
            jC='center'
            pH={8}>
            <CText
              numberOfLines={2}
              tA={'left'}
              dynamicWidth
              width={100}
              dynamic
              fF={C.fontsName.FONT_EXTRA_BOLD}
              fS={13}
              color={Colors.primaryTextColor}>
              {item.name}
            </CText>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={10}
              tA={'left'}
              color={Colors.subTextColor}>
              {item.symbol}
            </CText>
          </DynamicView>
        </DynamicView>
        <DynamicView
          dynamic
          dynamicHeightFix
          height={54}
          fD={'row'}
          jC='flex-end'>
          <DynamicView
            dynamic
            dynamicWidthFix
            width={125}
            dynamicHeightFix
            height={54}
            aLIT='flex-start'
            fD={'column'}
            jC='center'
            pH={8}>
            <CText
              dynamic
              fF={C.fontsName.FONT_EXTRA_BOLD}
              tA={'left'}
              fS={14}
              color={Colors.primaryTextColor}>
              {currencyFormatter.format(item.sum_exposure_usd)}
            </CText>
            <CText
              dynamic
              fF={C.fontsName.FONT_BOLD}
              fS={14}
              color={Colors.subTextColor}>
              {new Intl.NumberFormat('en-US', {
                maximumSignificantDigits: 4,
              }).format(item.exposure_balance)}
            </CText>
          </DynamicView>
        </DynamicView>
      </DynamicTouchView>
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeightFix
        height={1}
        width={100}
        bGC={Colors.portfolioBorderColor}
      />
    </>
  );

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
        {view === 'loading' ? (
          <EmptyView
            text={'Loading..'}
            image={AppImages.LOADING_IMAGE}
            buyVisible={false}
            marginTop={-50}
            isLottie={true}
          />
        ) : (
          <></>
        )}
        {view === 'empty' ? (
          <EmptyView
            text={t('NO_CURRENT_APPROVALS')}
            image={AppImages.EMPTY}
            buyVisible={false}
            marginTop={50}
          />
        ) : (
          <></>
        )}
      </DynamicView>
    );
  };

  const onRefresh = () => {
    // setISRefreshing true
    setIsRefreshing(true);

    // call API Method and fetch New Data
    // after fetch data call ----- setIsRefreshing(false)

    // For now i am handling statically by below code
    // Remove below code after implementing above things

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const renderItem = ({ item, index }) => <Item item={item} />;

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <ChooseChainModal
        isModalVisible={chooseChain}
        onPress={() => {
          setChooseChain(false);
        }}
        where={WHERE_PORTFOLIO}
      />
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={100}
        width={100}
        jC='flex-start'
        pH={15}
        bGC={Colors.whiteColor}>
        <DynamicView
          dynamic
          dynamicWidth
          dynamicHeight
          {...ifIphoneX(
            {
              height: 30,
            },
            {
              height: 35,
            },
          )}
          width={100}
          jC='flex-start'>
          <ImageBackground
            style={{
              position: 'absolute',
              right: 0,
              ...ifIphoneX(
                {
                  top: 50,
                },
                {
                  top: 0,
                },
              ),
              resizeMode: 'cover',
              justifyContent: 'center',
              ...ifIphoneX(
                {
                  height: 180,
                },
                {
                  height: 210,
                },
              ),
              width: 200,
              flexDirection: 'column',
            }}
            source={AppImages.PORTFOLIO_BG}></ImageBackground>
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeightFix
            height={50}
            width={100}
            aLIT='center'
            bR={8}
            fD={'row'}>
            <DynamicTouchView
              sentry-label='token-approval-back'
              style={{ width: 60 }}
              dynamic
              onPress={() => {
                props.navigation.goBack();
              }}
              fD={'row'}>
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode='cover'
                source={AppImages.BACK}
              />
            </DynamicTouchView>
            <DynamicTouchView
              sentry-label='token-approval-choose-chain'
              dynamic
              dynamicWidth
              dynamicHeightFix
              height={30}
              width={45}
              bGC={Colors.chainColor}
              mT={10}
              bR={15}
              pH={5}
              pV={5}
              fD={'row'}
              onPress={() => {
                setChooseChain(true);
              }}>
              <DynamicImage
                dynamic
                dynamicWidth
                height={20}
                width={20}
                resizemode='contain'
                source={portfolioState.statePortfolio.selectedChain.logo_url}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_EXTRA_BOLD}
                mL={3}
                fS={14}
                color={Colors.primaryTextColor}>
                {t('CHAIN')}:
              </CText>
              <CText
                dynamic
                fF={C.fontsName.FONT_REGULAR}
                fS={12}
                color={Colors.primaryTextColor}>
                {' '}
                {portfolioState.statePortfolio.selectedChain.symbol}
              </CText>
              <DynamicImage
                dynamic
                dynamicWidth
                marginHorizontal={6}
                height={8}
                width={8}
                resizemode='contain'
                source={AppImages.DOWN}
              />
            </DynamicTouchView>
          </DynamicView>
          <CText
            dynamic
            dynamicWidth
            mL={15}
            mT={20}
            fF={C.fontsName.FONT_EXTRA_BOLD}
            width={100}
            tA={'left'}
            fS={24}
            color={Colors.primaryTextColor}>
            Risk Exposure
          </CText>
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={20}
            mL={15}
            width={100}
            bR={8}
            fD={'row'}
            aLIT={'center'}
            jC={'flex-start'}>
            <CText
              dynamic
              fF={C.fontsName.FONT_EXTRA_BOLD}
              fS={24}
              color={Colors.primaryTextColor}>
              {currencyFormatter.format(
                chainExposureBalanceUSD[
                  portfolioState.statePortfolio.selectedChain.symbol
                ],
              )}
            </CText>
          </DynamicView>
          <DynamicView
            dynamic
            dynamicWidth
            width={100}
            fD={'row'}
            aLIT={'center'}
            jC={'flex-start'}>
            <DynamicTouchView
              sentry-label='token-approval-learn-more'
              dynamic
              bR={8}
              bGC={Colors.appColor}
              fD={'row'}
              pV={7}
              pH={9}
              onPress={() => {
                analytics().logEvent('token_approval_info_screen', {
                  from: ethereum.address,
                });
                props.navigation.navigate(
                  C.screenTitle.TOKEN_APPROVALS_INFO_SCREEN,
                  {
                    url: 'https://kalis.me/unlimited-erc20-allowances/',
                  },
                );
              }}>
              <CText
                dynamic
                fF={C.fontsName.FONT_BOLD}
                fS={12}
                color={Colors.primaryTextColor}>
                Learn more
              </CText>
            </DynamicTouchView>
            <DynamicTouchView
              sentry-label='token-approval-revoke'
              dynamic
              bR={8}
              bGC={Colors.redOffColor}
              fD={'row'}
              mL={8}
              pV={7}
              pH={9}
              onPress={() => {
                analytics().logEvent('token_approval_revoke_screen', {
                  from: ethereum.address,
                });
                props.navigation.navigate(C.screenTitle.BROWSER_SCREEN, {
                  params: { url: 'https://mycointool.com/en/ApprovalChecker' },
                  screen: C.screenTitle.BROWSER_SCREEN,
                });
              }}>
              <CText
                dynamic
                fF={C.fontsName.FONT_BOLD}
                fS={12}
                color={Colors.primaryTextColor}>
                Revoke
              </CText>
            </DynamicTouchView>
          </DynamicView>
        </DynamicView>
        <DynamicView
          dynamic
          dynamicWidth
          width={100}
          bGC={Colors.whiteColor}
          aLIT={'flex-end'}>
          {/* <CText dynamic dynamicWidth mL={15} mT={20} fF={C.fontsName.FONT_EXTRA_BOLD} width={100} tA={"left"} fS={12} color={Colors.subTextColor}>Refreshes every 5 minutes</CText> */}
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeightFix
            height={1}
            width={100}
            bGC={Colors.portfolioBorderColor}
          />
        </DynamicView>
        <DynamicView dynamic dynamicWidth width={55} mL={15} mT={10} fD={'row'}>
          <CText
            dynamic
            fF={C.fontsName.FONT_EXTRA_BOLD}
            fS={18}
            color={Colors.primaryTextColor}>
            Token
          </CText>
          <CText
            dynamic
            fF={C.fontsName.FONT_EXTRA_BOLD}
            fS={18}
            color={Colors.primaryTextColor}>
            At Risk
          </CText>
        </DynamicView>
        <FlatList
          nestedScrollEnabled
          data={
            tokenAllowances[portfolioState.statePortfolio.selectedChain.symbol]
          }
          renderItem={renderItem}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          style={{ width: '100%', backgroundColor: Colors.whiteColor }}
          keyExtractor={item => item.id}
          ListEmptyComponent={emptyView('empty')}
          showsVerticalScrollIndicator={false}
        />
      </DynamicView>
    </SafeAreaView>
  );
}
