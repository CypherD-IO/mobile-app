import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BrowserScreen from '../containers/Browser/Browser';
import ActivityScreen from '../containers/Activities/activity';
import ActivityFilter from '../containers/Activities/activityFilter';
import PortfolioScreen from '../containers/Portfolio/index';
import DebitCardScreen from '../containers/DebitCard/index';
import * as C from '../constants/index';
import { screenTitle } from '../constants/index';
import { BackHandler, Button } from 'react-native';
import AppImages from '../../assets/images/appImages';
import BrowserTraHis from '../containers/Auth/BrowserTraHis';
import { CText } from '../styles/textStyle';
import { DynamicTouchView } from '../styles/viewStyle';
import { Colors } from '../constants/theme';
import TransDetail from '../containers/Auth/TransDetail';
import { useTranslation } from 'react-i18next';
import ImportWallet from '../containers/Auth/ImportWallet';
import EnterKeyScreen from '../containers/Auth/EnterKey';
import QRCode from '../containers/Qrcode/index';
import Backup from '../containers/Auth/Backup';
import BridgeTokenScreen from '../containers/Bridge/bridgeToken';
import EnterAmount from '../containers/Portfolio/enterAmount';
import SendTo from '../containers/Portfolio/sendTo';
import StakingValidators from '../containers/Staking/stakingValidators';
import StakingDelegation from '../containers/Staking/delegation';
import StakingReDelegate from '../containers/Staking/reDelegate';
import ReStake from '../containers/Staking/reStake';
import Unboundings from '../containers/Staking/unboundings';
import OptionsScreen from '../containers/Options/index';
import ImportAnotherWallet from '../containers/Options/ImportAnotherWallet';
import NotificationSettings from '../containers/Options/NotificationSettings';
import ManageWallet from '../containers/Options/ManageWallet';
import SecurityPrivacy from '../containers/Options/SecurityPrivacy';
import SeedPhrase from '../containers/Options/SeedPhrase';
import Bridge from '../containers/Bridge/bridge';
import IBC from '../containers/Portfolio/ibc';
import OpenLegalScreen from '../containers/InfoScreen/openLegalDoc';
import SocialMediaScreen from '../containers/SocialMedia/socialMedia';
import CosmosUnboundings from '../containers/CosmosStaking/unboundings';
import CosmosValidators from '../containers/CosmosStaking/validators';
import CosmosAction from '../containers/CosmosStaking/action';
import CosmosSelectReValidator from '../containers/CosmosStaking/reValidator';
import CoinbasePay from '../containers/FundCardScreen/cbpay';
import SardinePay from '../containers/FundCardScreen/sardinePay';
import QRScanner from '../containers/Qrcode/QRScanner';
import FundCardScreen from '../containers/FundCardScreen';
import AppSettings from '../containers/Options/appSettings';
import AdvancedSettings from '../containers/Options/advancedSettings';
import WalletConnectCamera from '../containers/Options/WalletConnectCamera';
import TokenOverview from '../containers/Portfolio/tokenOverview';
import PrivateKey from '../containers/Options/PrivateKey';
import BridgeStatus from '../containers/Bridge/bridgeStatus';
import Onmeta from '../containers/FundCardScreen/onmeta';
import CardSignupScreen from '../containers/DebitCard/cardSignUp';
import LegalScreen from '../containers/legalDocs/legal';
import { t } from 'i18next';
import OTPVerificationScreen from '../containers/DebitCard/OTPVerification';
import CardSignupCompleteScreen from '../containers/DebitCard/signUpComplete';
import CardKYCStatusScreen from '../containers/DebitCard/KYCStatus';
import SolidCardScreen from '../containers/DebitCard/solidCard/solidCard';
import CardRevealAuthScreen from '../containers/DebitCard/solidCard/cardRevealAuth';
import AptoCardScreen from '../containers/DebitCard/aptoCard';
import CardSignupLandingScreen from '../containers/DebitCard/cardSignupLanding';
import SolidFundCardScreen from '../containers/DebitCard/solidCard/fundCard';
import SolidCardOptionsScreen from '../containers/DebitCard/solidCard/cardOptions';
import ChangePin from '../containers/PinAuthetication/changePin';
import ConfirmPin from '../containers/PinAuthetication/confirmPin';
import SetPin from '../containers/PinAuthetication/setPin';
import PinValidation from '../containers/PinAuthetication/pinValidation';
import UpdateCardApplicationScreen from '../containers/DebitCard/updateCardApplication';
import HostsAndRPCScreen from '../containers/Options/hostsAndRPC';
import { CyDImage, CyDTouchView } from '../styles/tailwindStyles';
import TransactionDetails from '../containers/DebitCard/solidCard/transactionDetails';
import ReferralRewards from '../containers/ReferralRewards/referrals';
import TokenOverviewV2 from '../containers/TokenOverview';

const { DynamicImage, DynamicButton } = require('../styles');

const PortfolioStack = createNativeStackNavigator();
const BrowserStack = createNativeStackNavigator();
const FundCardStack = createNativeStackNavigator();
const OptionsStack = createNativeStackNavigator();
// const ActivityStack = createNativeStackNavigator();

export function PortfolioStackScreen ({ navigation, route }) {
  const { t } = useTranslation();

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
  return (
    <PortfolioStack.Navigator initialRouteName={screenTitle.PORTFOLIO_SCREEN}>
      <PortfolioStack.Screen
        name={screenTitle.PORTFOLIO_SCREEN}
        component={PortfolioScreen}
        options={{ headerShown: false }}
      />
      <PortfolioStack.Screen
        name={screenTitle.TOKEN_OVERVIEW}
        // component={TokenOverview}
        component={TokenOverviewV2}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.STAKING_VALIDATORS}
        component={StakingValidators}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.STAKING_MANAGEMENT}
        component={StakingDelegation}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.STAKING_REDELEGATE}
        component={StakingReDelegate}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.RESTAKE}
        component={ReStake}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Restake to',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.UNBOUNDING}
        component={Unboundings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Unboundings',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_VALIDATORS}
        component={CosmosValidators}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          title: '',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_UNBOUNDINGS}
        component={CosmosUnboundings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          title: '',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_ACTION}
        component={CosmosAction}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          title: '',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_REVALIDATOR}
        component={CosmosSelectReValidator}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          title: 'Re-Validate to',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.TRANS_DETAIL}
        component={TransDetail}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TRAN_DETAIL'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.NFTS_DETAIL}
        component={TransDetail}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('NFT_DETAIL'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.GEN_WEBVIEW}
        component={TransDetail}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('GEN_WEBVIEW'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.CB_PAY}
        component={CoinbasePay}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CB_PAY'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.CLOSE}
              />
            </DynamicTouchView>
          )
        })}
      />
      <PortfolioStack.Screen
      name={screenTitle.ON_META}
      component={Onmeta}
      options={({ navigation, route }) => ({
        headerTransparent: false,
        headerShadowVisible: true,
        title: t('ON_META'),
        navigationOptions: {
          tabBarVisible: false
        },
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: C.fontsName.FONT_BLACK,
          fontSize: 20
        },
        headerLeft: () => (
          <DynamicTouchView
            dynamic
            style={{ width: 60 }}
            onPress={() => {
              navigation.goBack();
            }}
            fD={'row'}
          >
            <DynamicImage
              dynamic
              height={18}
              width={14}
              resizemode="cover"
              source={AppImages.CLOSE}
            />
          </DynamicTouchView>
        )
      })}
    />
      <PortfolioStack.Screen
      name={screenTitle.SARD_PAY}
      component={SardinePay}
      options={({ navigation, route }) => ({
        headerTransparent: false,
        headerShadowVisible: false,
        title: t('SARD_PAY'),
        navigationOptions: {
          tabBarVisible: false
        },
        headerTitleAlign: 'center',
        headerTitleStyle: {
          fontFamily: C.fontsName.FONT_BLACK,
          fontSize: 20
        },
        headerLeft: () => (
          <DynamicTouchView
            dynamic
            style={{ width: 60 }}
            onPress={() => {
              navigation.goBack();
            }}
            fD={'row'}
          >
            <DynamicImage
              dynamic
              height={18}
              width={14}
              resizemode="cover"
              source={AppImages.CLOSE}
            />
          </DynamicTouchView>
        )
      })}
    />
      <PortfolioStack.Screen
        name={screenTitle.ENTER_AMOUNT}
        component={EnterAmount}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('ENTER_AMOUNT'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SEND_TO}
        component={SendTo}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('SEND_TO'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_BLACK}
                fS={16}
                color={Colors.primaryTextColor}
                mL={20}
              ></CText>
            </DynamicTouchView>
          )
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation, route }) => ({
          headerTransparent: true,
          headerShadowVisible: false,
          title: 'SCAN QR CODE',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20,
            color: Colors.whiteColor
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.IBC_SCREEN}
        component={IBC}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('IBC'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_BLACK}
                fS={16}
                color={Colors.primaryTextColor}
                mL={20}
              ></CText>
            </DynamicTouchView>
          )
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.IMPORT_WALLET}
        component={ImportWallet}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('IMPORT_WALLET'),
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
            </DynamicTouchView>
          )
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.BACKUP}
        component={Backup}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.QRCODE}
        component={QRCode}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('RECEIVE'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerStyle: {
            elevation: 0
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.BRIDGE_SCREEN}
        component={Bridge}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cross-Chain Token Bridge',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }}
      />

      <PortfolioStack.Screen
        name={screenTitle.BRIDGE_STATUS}
        component={BridgeStatus}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Bridge status',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }}
      />

      <PortfolioStack.Screen
        name={screenTitle.ACTIVITIES}
        component={ActivityScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          title: 'Activities',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.WALLET_CONNECT}
        component={WalletConnectCamera}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Wallet Connect',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.PIN}
        component={PinValidation}
        options={({ navigation, route }) => ({
          headerShown: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SET_PIN}
        component={SetPin}
        options={({ navigation, route }) => ({
          headerShown: false
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.CONFIRM_PIN}
        component={ConfirmPin}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CONFIRM_PIN'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
    </PortfolioStack.Navigator>
  );
}

export function DebitCardStackScreen ({ navigation }) {
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
  return (
    <FundCardStack.Navigator initialRouteName={screenTitle.DEBIT_CARD_SCREEN}>
      <FundCardStack.Screen
        name={screenTitle.DEBIT_CARD_SCREEN}
        component={DebitCardScreen}
        options={({ navigation, route }) => ({
          headerTransparent: true,
          headerShadowVisible: false,
          title: '',
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerBackVisible: false
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_LANDING_SCREEN}
        component={CardSignupLandingScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card Signup',
          headerStyle: {
            backgroundColor: Colors.appColor
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerBackVisible: false,
          headerLeft: () => (
            <CyDTouchView
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
            >
              <CyDImage
                className={'h-[20] w-[20]'}
                resizemode="cover"
                source={AppImages.BACK}
              />
            </CyDTouchView>
          )
        })} />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_SCREEN}
        component={CardSignupScreen}
        options={({ navigation, route }) => ({ headerShown: false })} />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_COMPLETE_SCREEN}
        component={CardSignupCompleteScreen}
        options={({ navigation }) => ({ headerShown: false })} />

      <FundCardStack.Screen
        name={screenTitle.CARD_KYC_STATUS_SCREEN}
        component={CardKYCStatusScreen}
        options={({ navigation }) => ({ headerShown: false })} />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_OTP_VERIFICATION_SCREEN}
        component={OTPVerificationScreen}
        options={({ navigation }) => ({ headerShown: false })} />

      <FundCardStack.Screen
        name={screenTitle.APTO_CARD_SCREEN}
        component={AptoCardScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerLeft: () => { return <></>; },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })} />

      <FundCardStack.Screen
        name={screenTitle.UPDATE_CARD_APPLICATION_SCREEN}
        component={UpdateCardApplicationScreen}
        options={({ navigation, route }) => ({ headerShown: false })} />

      <FundCardStack.Screen
        name={screenTitle.SOLID_CARD_SCREEN}
        component={SolidCardScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerLeft: () => { return <></>; },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />

      <FundCardStack.Screen
        name={screenTitle.SOLID_CARD_TRANSACTION_DETAILS_SCREEN}
        component={TransactionDetails}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />

      <FundCardStack.Screen
        name={screenTitle.SOLID_FUND_CARD_SCREEN}
        component={SolidFundCardScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Load card',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />

      <FundCardStack.Screen
        name={screenTitle.SOLID_CARD_REVEAL_AUTH_SCREEN}
        component={CardRevealAuthScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />

      <FundCardStack.Screen
        name={screenTitle.SOLID_CARD_OPTIONS_SCREEN}
        component={SolidCardOptionsScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerShown: true,
          title: 'Cypher Card',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />

      <FundCardStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TERMS_AND_CONDITIONS'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />

      <FundCardStack.Screen
        name={screenTitle.OPEN_LEGAL_SCREEN}
        component={OpenLegalScreen}
        options={{ headerShown: false }} />

      <FundCardStack.Screen
        name={screenTitle.FUND_CARD_SCREEN}
        component={FundCardScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }}
      />

    </FundCardStack.Navigator>

  );
}

export function BrowserStackScreen ({ navigation, route }) {
  const { t } = useTranslation();
  return (
    <BrowserStack.Navigator initialRouteName={screenTitle.BROWSER_SCREEN}>
      <BrowserStack.Screen
        name={screenTitle.BROWSER_SCREEN}
        component={BrowserScreen}
        options={{ headerShown: false }}
      />
      <BrowserStack.Screen
        name={screenTitle.IMPORT_ANOTHER_WALLET}
        component={ImportAnotherWallet}
        options={{ headerShown: false }}
      />
      <BrowserStack.Screen
        name={screenTitle.BRIDGE_TOKEN_SCREEN}
        component={BridgeTokenScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cross-Chain Token Bridge',
          headerStyle: {
            elevation: 0
          },
          headerLeft: () => (
            <DynamicButton
              onPress={() => {
                navigation.goBack();
              }}
            >
              <DynamicImage
                dynamic
                height={20}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
            </DynamicButton>
          )
        })}
      />

      <BrowserStack.Screen
        name={screenTitle.BROWSER_TRAN_HIS}
        component={BrowserTraHis}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          navigationOptions: {
            tabBarVisible: false
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_BLACK}
                fS={16}
                color={Colors.primaryTextColor}
                mL={20}
              >
                {t('BROWSER_TRA_DETAIL')}
              </CText>
            </DynamicTouchView>
          )
        })}
      />
      <BrowserStack.Screen
        name={screenTitle.TRANS_DETAIL}
        component={TransDetail}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          navigationOptions: {
            tabBarVisible: false
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_BLACK}
                fS={16}
                color={Colors.primaryTextColor}
                mL={20}
              >
                {t('TRAN_DETAIL')}
              </CText>
            </DynamicTouchView>
          )
        })}
      />
    </BrowserStack.Navigator>
  );
}

export function OptionsStackScreen ({ navigation, route }) {
  const { t } = useTranslation();

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
  return (
    <OptionsStack.Navigator initialRouteName={screenTitle.OPTIONS_SCREEN}>

      <OptionsStack.Screen
        name={screenTitle.OPTIONS_SCREEN}
        component={OptionsScreen}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.ACTIVITIES}
        component={ActivityScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.REFERRAL_REWARDS}
        component={ReferralRewards}
        options={({ navigation, route }) => ({
          headerShown: false

        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ACTIVITYFILTER}
        component={ActivityFilter}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          title: 'Activity Filter',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.MANAGE_WALLET}
        component={ManageWallet}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('MANAGE_WALLET'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.SECURITY_PRIVACY}
        component={SecurityPrivacy}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('SECURITY_PRIVACY'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.SEED_PHRASE}
        component={SeedPhrase}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('SEED_PHRASE'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
            </DynamicTouchView>
          )
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.PRIVATE_KEY}
        component={PrivateKey}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('PRIVATE_KEY'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              style={{ width: 60 }}
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}
            >
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode="cover"
                source={AppImages.BACK}
              />
            </DynamicTouchView>
          )
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.NOTIFICATION_SETTINGS}
        component={NotificationSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('NOTIFICATION_PREFERENCES'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ADVANCED_SETTINGS}
        component={AdvancedSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('ADVANCED_SETTINGS'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.CHANGE_PIN}
        component={ChangePin}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CHANGE_PIN'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.CONFIRM_CHANGE_PIN}
        component={ConfirmPin}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CONFIRM_PIN'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.SET_CHANGE_PIN}
        component={SetPin}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('SET_PIN'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.HOSTS_AND_RPC_SCREEN}
        component={HostsAndRPCScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('HOSTS_AND_RPC_INIT_CAPS'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.APP_SETTINGS}
        component={AppSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('APP_SETTINGS'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.IMPORT_ANOTHER_WALLET}
        component={ImportAnotherWallet}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TERMS_AND_CONDITIONS'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }} />
      <OptionsStack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation, route }) => ({
          headerTransparent: true,
          headerShadowVisible: false,
          title: 'SCAN QR CODE',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20,
            color: Colors.whiteColor
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ENTER_KEY}
        component={EnterKeyScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('ENTER_SEED_PHRASE'),
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          headerStyle: {
            elevation: 0
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.WALLET_CONNECT}
        component={WalletConnectCamera}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Wallet Connect',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },
          navigationOptions: {
            tabBarVisible: false
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.DEBIT_CARD_SCREEN}
        component={DebitCardScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card',
          navigationOptions: {
            tabBarVisible: false
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.OPEN_LEGAL_SCREEN}
        component={OpenLegalScreen}
        options={{ headerShown: false }} />
      <OptionsStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false
        }}
      />
    </OptionsStack.Navigator>
  );
}
