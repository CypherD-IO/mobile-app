/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/no-misused-promises */
/**
 * @format
 * @flow
*/
import Intercom from '@intercom/intercom-react-native';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, BackHandler, ImageBackground, Linking } from 'react-native';
import Accordion from 'react-native-collapsible/Accordion';
import DeviceInfo from 'react-native-device-info';
import { verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import AppImages from '../../../assets/images/appImages';
import { GlobalContextType } from '../../constants/enum';
import * as C from '../../constants/index';
import { CHAIN_ARBITRUM, CHAIN_AVALANCHE, CHAIN_BSC, CHAIN_COSMOS, CHAIN_ETH, CHAIN_EVMOS, CHAIN_FTM, CHAIN_JUNO, CHAIN_OPTIMISM, CHAIN_OSMOSIS, CHAIN_POLYGON, CHAIN_STARGAZE } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { showToast } from '../../containers/utilities/toastUtility';
import { setDeveloperMode, setQuoteCancelReasons } from '../../core/asyncStorage';
import { getCardProfile } from '../../core/card';
import { GlobalContext } from '../../core/globalContext';
import { ActivityContext, HdWalletContext, PortfolioContext } from '../../core/util';
import { hostWorker } from '../../global';
import useEns from '../../hooks/useEns';
import { isAndroid } from '../../misc/checkers';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import { CyDImage, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { AddressContainer, OptionsContainer } from '../Auth/Share';
import { onShare } from '../utilities/socialShareUtility';

const {
  DynamicView,
  CText,
  DynamicImage,
  DynamicTouchView
} = require('../../styles');

export interface Section {
  sentryLabel: string
  title: string
  logo: string
}

const SocialMedia = ({ screenTitle, uri, title, imageUri, navigationRef }: { screenTitle: string, uri: string, title: string, imageUri: string, navigationRef: any }) => {
  return (
    <CyDTouchView className={'flex items-center justify-center bg-[#FFDE59] h-[27px] w-[27px] rounded-[7px]'}
      onPress={() => {
        navigationRef.navigate(screenTitle, { uri, title });
      }}>
      <CyDImage
        source={{ uri: imageUri }}
        className={'w-[18px] h-[18px]'}
      />
    </CyDTouchView>
  );
};

export default function Options (props: { navigation: { goBack: () => void, navigate: (arg0: string) => void } }) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎
  const [clickCount, setClickCount] = useState(0);
  const [title, setTitle] = useState('');
  const [ens, setEns] = useState(false);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const evmos = hdWalletContext.state.wallet.evmos;
  const cosmos = hdWalletContext.state.wallet.cosmos;
  const osmosis = hdWalletContext.state.wallet.osmosis;
  const juno = hdWalletContext.state.wallet.juno;
  const { stargaze } = hdWalletContext.state.wallet;
  const [activeSections, setActiveSection] = useState<number[]>([]);
  const [rotateAnimation] = useState(new Animated.Value(0));
  const activityContext = useContext<any>(ActivityContext);
  const [updateModal, setUpdateModal] = useState<Boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(portfolioState.statePortfolio.developerMode);
  const inAppUpdates = new SpInAppUpdates(
    false // isDebug
  );

  const resolveDomain = useEns()[1];
  const handleAnimation = (toValue: number) => {
    Animated.timing(rotateAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const interpolateRotating = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  const animatedStyle = {
    transform: [
      {
        rotate: interpolateRotating
      }
    ],
    height: verticalScale(11),
    width: '11%',
    resizeMode: 'contain'
  };

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  useEffect(() => {
    void inAppUpdates.checkNeedsUpdate().then((result) => {
      if (result.shouldUpdate) {
        setUpdateModal(true);
      }
    });
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const SECTIONS: Section[] = [
    {
      sentryLabel: 'addresses',
      title: 'Addresses',
      logo: AppImages.ADDRESSES
    }
  ];

  const renderHeader = (section: Section) => {
    return (
      <DynamicView sentry-label={section.sentryLabel} dynamic dynamicWidth width={89} fD={'row'} mL={19}>
        <DynamicView dynamic dynamicHeightFix height={60} fD={'row'} pH={15}>
          <DynamicView dynamic dynamicWidthFix height={60} width={30} dynamicHeightFix aLIT='flex-start' fD={'column'} jC='center'>
            <DynamicView dynamic dynamicWidthFix width={17} fD={'row'} jC={'flex-start'}>
              <DynamicImage dynamic dynamicWidth height={20} width={100} source={section.logo} />
            </DynamicView>
          </DynamicView>
          <DynamicView dynamic dynamicWidthFix width={200} dynamicHeightFix height={60} aLIT='flex-start' fD={'column'} jC='center'>
            <DynamicView dynamic dynamicWidthFix width={200} fD={'row'} jC={'flex-start'}>
              <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={14} color={Colors.primaryTextColor}>{section.title}</CText>
            </DynamicView>
          </DynamicView>
        </DynamicView>
        <Animated.Image style={animatedStyle} source={AppImages.OPTIONS_ARROW} />
      </DynamicView>
    );
  };

  const renderContent = () => {
    const updateSections = (activeSections: number[] = []) => {
      setActiveSection(activeSections);
      if (activeSections.includes(0)) handleAnimation(1);
      else handleAnimation(0);
    };

    return (
      <DynamicView dynamic dynamicWidth width={100} fD={'column'} jC={'center'} aLIT={'center'} mB={10}>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_ETH.name}
          wallet={ethereum}
          logo={AppImages.ETHEREUM_NEW}
          bGC={'#F6F6F9'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_COSMOS.name}
          wallet={cosmos.wallets[cosmos.currentIndex]}
          logo={AppImages.COSMOS_LOGO}
          bGC={'#EFF0F5'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_OSMOSIS.name}
          wallet={osmosis.wallets[osmosis.currentIndex]}
          logo={AppImages.OSMOSIS_LOGO}
          bGC={'#f5edfa'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_JUNO.name}
          wallet={juno.wallets[juno.currentIndex]}
          logo={AppImages.JUNO_PNG}
          bGC={'#ebebeb'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_STARGAZE.name}
          wallet={stargaze.wallets[stargaze.currentIndex]}
          logo={AppImages.STARGAZE_LOGO}
          bGC={'#ebebeb'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_EVMOS.name}
          wallet={evmos.wallets[evmos.currentIndex]}
          logo={AppImages.EVMOS_LOGO_TRANSPARENT}
          bGC={'#FEF3F1'}
          updateSections={updateSections}
        ></AddressContainer>

        <AddressContainer
          chain={CHAIN_EVMOS.name}
          wallet={ethereum}
          logo={AppImages.EVMOS_LOGO_TRANSPARENT}
          bGC={'#FEF3F1'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_POLYGON.name}
          wallet={ethereum}
          logo={AppImages.POLYGON}
          bGC={'#F5EFFF'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_BSC.name}
          wallet={ethereum}
          logo={AppImages.BIANCE}
          bGC={'#FFF7E3'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_AVALANCHE.name}
          wallet={ethereum}
          logo={AppImages.AVALANCHE}
          bGC={'#FFF6F5'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_FTM.name}
          wallet={ethereum}
          logo={AppImages.FANTOM}
          bGC={'#F4FBFF'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_ARBITRUM.name}
          wallet={ethereum}
          logo={AppImages.ARBITRUM}
          bGC={'#F1F4FA'}
          updateSections={updateSections}
        ></AddressContainer>

        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={80} bGC={Colors.addressBorderColor} />

        <AddressContainer
          chain={CHAIN_OPTIMISM.name}
          wallet={ethereum}
          logo={AppImages.OPTIMISM}
          bGC={'#FFF0F0'}
          updateSections={updateSections}
        ></AddressContainer>

      </DynamicView>
    );
  };

  const updateSections = (activeSections: number[]) => {
    setActiveSection(activeSections);
    if (activeSections.includes(0)) handleAnimation(1);
    else handleAnimation(0);
  };

  const latestDate = (activities: any, lastVisited: Date) => {
    if (activities.length === 0) return false;
    const sortedAsc = activities.sort(
      (objA: any, objB: any) => Number(objA.datetime) - Number(objB.datetime)
    );
    return sortedAsc[sortedAsc.length - 1].datetime > lastVisited;
  };

  async function referFriend () {
    await onShare(t('RECOMMEND_TITLE'), t('RECOMMEND_MESSAGE'), t('RECOMMEND_URL'));
  }

  const deleteSolidCredentials = async () => {
    const deleteSolidDetailsUrl = `${ARCH_HOST}/v1/cards/application`;
    const config = {
      headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
    };
    try {
      await axios.delete(deleteSolidDetailsUrl, config);
      const data = await getCardProfile(globalContext.globalState.token);
      globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
      Toast.show({ type: t('TOAST_TYPE_SUCCESS'), text1: t('REMOVED_SOLID_CREDENTIALS'), position: 'bottom' });
    } catch (e) {
      Sentry.captureException(e);
      Toast.show({ type: t('TOAST_TYPE_ERROR'), text1: 'Solid Credentials', text2: e.response.data.message, position: 'bottom' });
    }
  };

  useEffect(() => {
    void resolveDomain(ethereum.address).then(ens => {
      setTitle(ens ?? 'My Wallet');
      setEns(!!ens);
    });
  });

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDScrollView className={'bg-white h-full w-full relative '}>
      <ImageBackground source={AppImages.BG_SETTINGS} resizeMode="cover" imageStyle={{ height: 450, width: '100%' }}>
        <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC={'space-between'} mT={25}>
          <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC={'flex-start'}>
            <DynamicImage dynamic dynamicWidth height={100} width={100} resizemode='contain' source={AppImages.CYPHERD_WALLET} mT={20} />
            <CyDView className='flex flex-row justify-center w-[80%] items-center' >
              <CyDText className='text-[18px] font-bold '>{title}</CyDText>
              {ens && <CyDText className='text-[10px] secondaryTextColor font-semibold  bg-appColor px-[2px] ml-[4px] '>ens</CyDText>}
            </CyDView>
            <Accordion
              sections={SECTIONS}
              activeSections={activeSections}
              renderHeader={renderHeader}
              renderContent={renderContent}
              onChange={updateSections}
              underlayColor={'transparent'}
            />

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
                sentryLabel={'referrals'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.REFERRAL_REWARDS);
                }}
                title={'Referral & rewards'}
                logo={AppImages.REFER_OUTLINE}
            />

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'activities'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.ACTIVITIES);
                activityContext.dispatch({ type: ActivityReducerAction.UPDATEVISITED, value: { lastVisited: new Date() } });
              }}
              shouldDot={latestDate(activityContext.state.activityObjects, activityContext.state.lastVisited)}
              title={'Activities'}
              logo={AppImages.ACTIVITIES}
            />

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'wallet-connect'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.WALLET_CONNECT);
              }}
              title={'Wallet Connect'}
              logo={AppImages.WALLET_CONNECT_LOGO}
            ></OptionsContainer>

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            {/* <OptionsContainer
                            sentryLabel={'debit-card'}
                            onPress={() => {
                              analytics().logEvent('shortcut_card', { from: ethereum.address });
                              props.navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, {
                                params: { url: 'https://app.cypherd.io?source=app&address=' + ethereum.address }
                              });
                            }}
                            title={'Manage Card'}
                            logo={AppImages.MANAGE_CARD}
                            iW={90}
                        ></OptionsContainer>

                        <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} /> */}

            <OptionsContainer
              sentryLabel={'security-privacy'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.SECURITY_PRIVACY);
              }}
              title={'Security & Privacy'}
              logo={AppImages.UNLOCK}
            ></OptionsContainer>

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'manage-wallet'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.MANAGE_WALLET);
              }}
              title={'Manage Wallet'}
              logo={AppImages.WALLET}
            ></OptionsContainer>

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'app-settings'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.APP_SETTINGS);
              }}
              title={'App Settings'}
              logo={AppImages.SETTINGS}
            ></OptionsContainer>

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'support-button'}
              onPress={async () => {
                await Intercom.displayMessenger();
                sendFirebaseEvent(hdWalletContext, 'support');
              }}
              title={'Support'}
              logo={AppImages.SUPPORT}
            ></OptionsContainer>

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'refer-button'}
              onPress={() => {
                void referFriend();
              }}
              title={t('MENU_RECOMMEND_FRIEND')}
              logo={AppImages.REFER_OUTLINE}
            ></OptionsContainer>

            <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} />

            <OptionsContainer
              sentryLabel={'terms-and-conditions-button'}
              onPress={() => {
                props.navigation.navigate(C.screenTitle.LEGAL_SCREEN);
              }}
              title={t('LEGAL')}
              logo={AppImages.TERMS_AND_CONDITIONS}
            ></OptionsContainer>

            {/* <DynamicView dynamic dynamicWidth dynamicHeightFix height={1} width={88} bGC={Colors.portfolioBorderColor} /> */}

            {/* <OptionsContainer */}
            {/*     sentryLabel={'whats-new'} */}
            {/*     onPress={() => { */}
            {/*       Intercom.displayMessenger(); */}
            {/*       sendFirebaseEvent(hdWalletContext, 'support'); */}
            {/*     }} */}
            {/*     title={'Whats new in the app?'} */}
            {/*     logo={AppImages.WHATS_NEW} */}
            {/* ></OptionsContainer> */}

            {updateModal && <CyDView className='flex-row justify-between py-[8] w-[80%] items-center border-[1px] border-[#EFEFEF] px-[18px] rounded-[8px] mb-[12px] bg-[#EFEFEF]'>
              <CyDText className='text-[14px] font-bold '>{t<string>('NEW_VERSION_AVAILABLE')}</CyDText>

              <CyDTouchView className='py-[4px] px-[6px] bg-appColor/[0.6] border-[1px] border-appColor rounded-[4px] '
                onPress={() => {
                  if (isAndroid()) {
                    void Linking.openURL(
                      'market://details?id=com.cypherd.androidwallet'
                    );
                  } else {
                    const link =
                      'itms-apps://apps.apple.com/app/cypherd-wallet/id1604120414';
                    Linking.canOpenURL(link).then(
                      (supported) => {
                        supported && Linking.openURL(link);
                      },
                      (err) => Sentry.captureException(err)
                    );
                  }
                }}
              >
                <CyDText className='text-[16px] font-semibold '>{t<string>('UPDATE')}</CyDText>
              </CyDTouchView >

            </CyDView>}

            <CyDTouchView className={'flex items-center justify-center h-[50] w-full'}
              onPress={async () => {
                setClickCount(clickCount + 1);
                if (clickCount === 4) {
                  const developerMode: boolean = portfolioState.statePortfolio.developerMode;
                  portfolioState.dispatchPortfolio({ value: { developerMode: !developerMode } });
                  await setDeveloperMode(!developerMode);
                  developerMode ? showToast('Developer Mode OFF') : showToast('Developer Mode ON');
                  setDevMode(!developerMode);
                  setClickCount(0);
                  await analytics().setAnalyticsCollectionEnabled(!developerMode);
                }
              }}>
              <DynamicImage dynamic dynamicWidth height={25} width={25} resizemode='contain' source={AppImages.CYPHER_TEXT} />
              <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={10} color={Colors.versionColor}>{t<string>('VERSION')} {DeviceInfo.getVersion()}</CText>
            </CyDTouchView>

            {devMode &&
              <>
                <CyDTouchView onPress={async () => await setQuoteCancelReasons(false)} className={'flex flex-row justify-center items-center my-[10px]'}>
                  <CyDText className={'underline underline-offset-2 text-blue-700 '}>
                    {t<string>('ENABLE_FEEDBACK')}
                  </CyDText>
                </CyDTouchView>
                <CyDTouchView onPress={async () => await deleteSolidCredentials()} className={'flex flex-row justify-center items-center my-[10px]'}>
                  <CyDText className={'underline underline-offset-2 text-blue-700 '}>
                    {t<string>('REMOVE_SOLID_CREDENTIALS')}
                  </CyDText>
                </CyDTouchView>
              </>
            }

            <CyDView className={'flex flex-row items-center justify-between mt-[10px] mb-[30px] w-[130]'}>
              <SocialMedia
                title={t('DISCORD')}
                uri={'https://discord.com/invite/S9tDGZ9hgT'}
                screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                imageUri={'https://public.cypherd.io/icons/discord.png'}
                navigationRef={props.navigation}
              />
              <SocialMedia
                title={t('TWITTER')}
                uri={'https://twitter.com/cypherwalletio'}
                screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                imageUri={'https://public.cypherd.io/icons/twitter.png'}
                navigationRef={props.navigation}
              />
              <SocialMedia
                title={t('MEDIUM')}
                uri={'https://medium.com/@CypherWallet'}
                screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                imageUri={'https://public.cypherd.io/icons/medium.png'}
                navigationRef={props.navigation}
              />
              <SocialMedia
                title={t('YOUTUBE')}
                uri={'https://youtube.com/@cypherwallet_'}
                screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                imageUri={'https://public.cypherd.io/icons/youtube.png'}
                navigationRef={props.navigation}
              />
            </CyDView>
          </DynamicView>
        </DynamicView>
      </ImageBackground>
    </CyDScrollView>
  );
}
