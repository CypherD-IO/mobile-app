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
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, ImageBackground, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import AppImages from '../../../assets/images/appImages';
import { ConnectionTypes } from '../../constants/enum';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import { showToast } from '../../containers/utilities/toastUtility';
import { getDeveloperMode, setDeveloperMode } from '../../core/asyncStorage';
import { GlobalContext } from '../../core/globalContext';
import { ActivityContext, HdWalletContext } from '../../core/util';
import useEns from '../../hooks/useEns';
import { isAndroid } from '../../misc/checkers';
import { ActivityReducerAction } from '../../reducers/activity_reducer';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { OptionsContainer } from '../Auth/Share';
import { onShare } from '../utilities/socialShareUtility';
import { screenTitle } from '../../constants/index';
import useConnectionManager from '../../hooks/useConnectionManager';
import { get } from 'lodash';
import { CHAIN_ETH } from '../../constants/server';
import { logAnalytics } from '../../core/analytics';
import useCardUtilities from '../../hooks/useCardUtilities';

const { DynamicView, CText, DynamicImage } = require('../../styles');

export interface Section {
  sentryLabel: string;
  title: string;
  logo: string;
}

const SocialMedia = ({
  screenTitle,
  uri,
  title,
  imageUri,
  navigationRef,
}: {
  screenTitle: string;
  uri: string;
  title: string;
  imageUri: string;
  navigationRef: any;
}) => {
  return (
    <CyDTouchView
      className={'flex items-center justify-center rounded-[7px] mx-[5px]'}
      onPress={() => {
        navigationRef.navigate(screenTitle, { uri, title });
      }}>
      <CyDImage
        source={{ uri: imageUri }}
        className={'w-[32px] h-[32px]'}
        resizeMode='contain'
      />
    </CyDTouchView>
  );
};

export default function Options(props: {
  navigation: {
    goBack: () => void;
    popToTop: () => void;
    navigate: (arg0: string, arg1?: any) => void;
  };
}) {
  const { t } = useTranslation();

  const [clickCount, setClickCount] = useState(0);
  const [title, setTitle] = useState('');
  const [ens, setEns] = useState(false);
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const { isReadOnlyWallet }: { isReadOnlyWallet: boolean } =
    hdWalletContext.state;
  const activityContext = useContext<any>(ActivityContext);
  const [updateModal, setUpdateModal] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );
  const { connectionType } = useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);
  const resolveDomain = useEns()[1];
  const { getWalletProfile } = useCardUtilities();

  useEffect(() => {
    setConnectionTypeValue(connectionType);
    void fetchDevMode();
  }, [connectionType]);

  const fetchDevMode = async () => {
    const tempDevMode = await getDeveloperMode();
    setDevMode(tempDevMode);
  };

  const handleBackButton = () => {
    props.navigation.navigate(screenTitle.PORTFOLIO);
    return true;
  };

  useEffect(() => {
    void inAppUpdates.checkNeedsUpdate().then(result => {
      if (result.shouldUpdate) {
        setUpdateModal(true);
      }
    });
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const latestDate = (activities: any, lastVisited: Date) => {
    if (activities.length === 0) return false;
    const sortedAsc = activities.sort(
      (objA: any, objB: any) => Number(objA.datetime) - Number(objB.datetime),
    );
    return sortedAsc[sortedAsc.length - 1].datetime > lastVisited;
  };

  useEffect(() => {
    const getTitleValue = async () => {
      const profileData = await getWalletProfile(
        globalContext.globalState.token,
      );
      const ens = await resolveDomain(ethereum.address, CHAIN_ETH.backendName);
      if (get(profileData, ['child'])) {
        setTitle(t('LINKED_WALLET'));
      } else if (ens) {
        setTitle(ens);
      } else if (isReadOnlyWallet) {
        setTitle(t('WALLET'));
      } else {
        setTitle(t('MY_WALLET'));
      }
    };

    void getTitleValue();
  });

  // const referToFriend = () => {
  //   onShare(t('RECOMMEND_TITLE'), t('RECOMMEND_MESSAGE'), t('RECOMMEND_URL'))
  //     .then(() => {})
  //     .catch(error => {});
  // };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDView className='flex-1 bg-white'>
      <CyDScrollView className={'bg-white w-full relative'}>
        <ImageBackground
          source={AppImages.BG_SETTINGS}
          resizeMode='cover'
          imageStyle={{ height: 450, width: '100%' }}>
          <DynamicView
            dynamic
            dynamicWidth
            dynamicHeight
            height={100}
            width={100}
            jC={'space-between'}
            mT={25}>
            <DynamicView
              dynamic
              dynamicWidth
              dynamicHeight
              height={100}
              width={100}
              jC={'flex-start'}>
              <CyDFastImage
                className='h-[100px] w-[100px] m-[15px]'
                source={AppImages.CYPHERD_WALLET}
                resizeMode='cover'
              />

              <CyDView className='flex flex-row justify-center w-[80%] items-center pb-[25px]'>
                {isReadOnlyWallet && (
                  <CyDImage
                    source={AppImages.CYPHER_LOCK}
                    className='h-[18px] w-[18px] mr-[5px]'
                    resizeMode='contain'
                  />
                )}
                <CyDText className='text-[18px] font-bold'>{title}</CyDText>
                {ens && (
                  <CyDText className='text-[10px] secondaryTextColor font-semibold  bg-appColor px-[2px] mt-[3px] ml-[4px]'>
                    ens
                  </CyDText>
                )}
              </CyDView>

              <OptionsContainer
                sentryLabel={'address-book'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.MY_ADDRESS, {
                    indexValue: 0,
                  });
                }}
                title={t('ADDRESS_BOOK')}
                iW={75}
                logo={AppImages.ADDRESS_BOOK_ICON}
              />

              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={1}
                width={88}
                bGC={Colors.portfolioBorderColor}
              />

              <OptionsContainer
                sentryLabel={'activities'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.ACTIVITIES);
                  activityContext.dispatch({
                    type: ActivityReducerAction.UPDATEVISITED,
                    value: { lastVisited: new Date() },
                  });
                }}
                shouldDot={latestDate(
                  activityContext.state.activityObjects,
                  activityContext.state.lastVisited,
                )}
                title={'Activities'}
                logo={AppImages.ACTIVITIES}
              />

              {!isReadOnlyWallet && (
                <DynamicView
                  dynamic
                  dynamicWidth
                  dynamicHeightFix
                  height={1}
                  width={88}
                  bGC={Colors.portfolioBorderColor}
                />
              )}

              {!isReadOnlyWallet && (
                <>
                  <OptionsContainer
                    sentryLabel={'referrals'}
                    onPress={() => {
                      props.navigation.navigate(C.screenTitle.REFERRALS, {
                        fromOptionsStack: true,
                      });
                    }}
                    title={t('CYPHER_CARD_REFERRALS')}
                    logo={AppImages.REFER_OUTLINE}
                  />
                  <DynamicView
                    dynamic
                    dynamicWidth
                    dynamicHeightFix
                    height={1}
                    width={88}
                    bGC={Colors.portfolioBorderColor}
                  />
                </>
              )}

              {!isReadOnlyWallet && (
                <>
                  <OptionsContainer
                    sentryLabel={'referrals'}
                    onPress={() => {
                      props.navigation.navigate(C.screenTitle.REWARDS, {
                        fromOptionsStack: true,
                      });
                    }}
                    title={t('CYPHER_CARD_REWARDS')}
                    logo={AppImages.REWARDS_ICON}
                    iW={150}
                    imageStyle={'-ml-[4px]'}
                  />
                  <DynamicView
                    dynamic
                    dynamicWidth
                    dynamicHeightFix
                    height={1}
                    width={88}
                    bGC={Colors.portfolioBorderColor}
                  />
                </>
              )}

              {!isReadOnlyWallet &&
                connectionTypeValue !== ConnectionTypes.WALLET_CONNECT && (
                  <OptionsContainer
                    sentryLabel={'wallet-connect'}
                    onPress={() => {
                      props.navigation.navigate(C.screenTitle.WALLET_CONNECT);
                    }}
                    title={'Wallet Connect'}
                    logo={AppImages.WALLET_CONNECT_LOGO}
                  />
                )}

              {!isReadOnlyWallet &&
                connectionTypeValue !== ConnectionTypes.WALLET_CONNECT && (
                  <DynamicView
                    dynamic
                    dynamicWidth
                    dynamicHeightFix
                    height={1}
                    width={88}
                    bGC={Colors.portfolioBorderColor}
                  />
                )}

              <OptionsContainer
                sentryLabel={'security-privacy'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.SECURITY_PRIVACY);
                }}
                title={'Security & Privacy'}
                logo={AppImages.CYPHER_LOCKED}
              />

              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={1}
                width={88}
                bGC={Colors.portfolioBorderColor}
              />

              <OptionsContainer
                sentryLabel={'manage-wallet'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.MANAGE_WALLET);
                }}
                title={'Manage Wallet'}
                logo={AppImages.WALLET}
              />

              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={1}
                width={88}
                bGC={Colors.portfolioBorderColor}
              />

              <OptionsContainer
                sentryLabel={'app-settings'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.APP_SETTINGS);
                }}
                title={'App Settings'}
                logo={AppImages.SETTINGS}
              />

              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={1}
                width={88}
                bGC={Colors.portfolioBorderColor}
              />

              <OptionsContainer
                sentryLabel={'support-button'}
                onPress={async () => {
                  void Intercom.present();
                  sendFirebaseEvent(hdWalletContext, 'support');
                }}
                title={'Support'}
                logo={AppImages.SUPPORT}
              />

              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={1}
                width={88}
                bGC={Colors.portfolioBorderColor}
              />

              {/* {!isReadOnlyWallet && (
                <OptionsContainer
                  sentryLabel={'referrals'}
                  onPress={() => {
                    referToFriend();
                  }}
                  title={t('MENU_RECOMMEND_FRIEND')}
                  logo={AppImages.REFER_OUTLINE}
                />
              )} */}

              <OptionsContainer
                sentryLabel={'browser'}
                onPress={() => {
                  logAnalytics('broswerClick', {});
                  props.navigation.navigate(C.screenTitle.BROWSER);
                }}
                title={t('BROWSER')}
                logo={AppImages.BROWSER_UNSEL}
              />

              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeightFix
                height={1}
                width={88}
                bGC={Colors.portfolioBorderColor}
              />

              <OptionsContainer
                sentryLabel={'terms-and-conditions-button'}
                onPress={() => {
                  props.navigation.navigate(C.screenTitle.LEGAL_SCREEN);
                }}
                title={t('LEGAL')}
                logo={AppImages.TERMS_AND_CONDITIONS}
              />

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

              {updateModal && (
                <CyDView className='flex-row justify-between py-[8px] w-[80%] items-center border-[1px] border-[#EFEFEF] px-[18px] rounded-[8px] mb-[12px] bg-[#EFEFEF]'>
                  <CyDText className='text-[14px] font-bold '>
                    {t<string>('NEW_VERSION_AVAILABLE')}
                  </CyDText>

                  <CyDTouchView
                    className='py-[4px] px-[6px] bg-appColor/[0.6] border-[1px] border-appColor rounded-[4px] '
                    onPress={() => {
                      if (isAndroid()) {
                        void Linking.openURL(
                          'market://details?id=com.cypherd.androidwallet',
                        );
                      } else {
                        const link =
                          'itms-apps://apps.apple.com/app/cypherd-wallet/id1604120414';
                        Linking.canOpenURL(link).then(
                          supported => {
                            supported && Linking.openURL(link);
                          },
                          err => Sentry.captureException(err),
                        );
                      }
                    }}>
                    <CyDText className='text-[16px] font-semibold '>
                      {t<string>('UPDATE')}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              )}

              <CyDTouchView
                className={'flex items-center justify-center h-[50px] w-full'}
                onPress={async () => {
                  setClickCount(clickCount + 1);
                  if (clickCount === 4) {
                    devMode
                      ? showToast('Developer Mode OFF')
                      : showToast('Developer Mode ON');
                    await setDeveloperMode(!devMode);
                    setDevMode(!devMode);
                    setClickCount(0);
                    await analytics().setAnalyticsCollectionEnabled(!devMode);
                  }
                }}>
                <DynamicImage
                  dynamic
                  dynamicWidth
                  height={25}
                  width={25}
                  resizemode='contain'
                  source={AppImages.CYPHER_TEXT}
                />
                <CText
                  dynamic
                  fF={C.fontsName.FONT_REGULAR}
                  fS={10}
                  color={Colors.versionColor}>
                  {t<string>('VERSION')} {DeviceInfo.getVersion()}
                </CText>
              </CyDTouchView>
              <CyDView
                className={
                  'flex flex-row items-center justify-between mt-[10px] mb-[30px]'
                }>
                <SocialMedia
                  title={t('DISCORD')}
                  uri={'https://cypherhq.io/discord'}
                  screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                  imageUri={'https://public.cypherd.io/icons/discord.png'}
                  navigationRef={props.navigation}
                />
                <SocialMedia
                  title={t('TWITTER')}
                  uri={'https://cypherhq.io/twitter'}
                  screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                  imageUri={'https://public.cypherd.io/icons/twitter.png'}
                  navigationRef={props.navigation}
                />
                <SocialMedia
                  title={t('REDDIT')}
                  uri={'https://cypherhq.io/reddit'}
                  screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                  imageUri={'https://public.cypherd.io/icons/reddit.png'}
                  navigationRef={props.navigation}
                />
                <SocialMedia
                  title={t('MEDIUM')}
                  uri={'https://cypherhq.io/medium'}
                  screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                  imageUri={'https://public.cypherd.io/icons/medium.png'}
                  navigationRef={props.navigation}
                />
                <SocialMedia
                  title={t('YOUTUBE')}
                  uri={'https://cypherhq.io/youtube'}
                  screenTitle={C.screenTitle.SOCIAL_MEDIA_SCREEN}
                  imageUri={'https://public.cypherd.io/icons/youtube.png'}
                  navigationRef={props.navigation}
                />
              </CyDView>
            </DynamicView>
          </DynamicView>
        </ImageBackground>
      </CyDScrollView>
    </CyDView>
  );
}
