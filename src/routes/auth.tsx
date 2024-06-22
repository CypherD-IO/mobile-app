import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BrowserScreen from '../containers/Browser/Browser';
import ActivityScreen from '../containers/Activities/activity';
import ActivityFilter from '../containers/Activities/activityFilter';
import PortfolioScreen from '../containers/Portfolio/index';
import DebitCardScreen from '../containers/DebitCard/index';
import * as C from '../constants/index';
import { screenTitle } from '../constants/index';
import AppImages from '../../assets/images/appImages';
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
import EnterAmount from '../containers/SendTo/enterAmount';
import SendTo from '../containers/SendTo';
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
import IBC from '../containers/IBC';
import OpenLegalScreen from '../containers/InfoScreen/openLegalDoc';
import SocialMediaScreen from '../containers/SocialMedia/socialMedia';
import CosmosUnboundings from '../containers/CosmosStaking/unboundings';
import CosmosValidators from '../containers/CosmosStaking/validators';
import CosmosAction from '../containers/CosmosStaking/action';
import CosmosSelectReValidator from '../containers/CosmosStaking/reValidator';
import CoinbasePay from '../containers/FundCardScreen/cbpay';
import QRScanner from '../containers/Qrcode/QRScanner';
import FundCardScreen from '../containers/FundCardScreen';
import AppSettings from '../containers/Options/appSettings';
import AdvancedSettings from '../containers/Options/advancedSettings';
import WalletConnectCamera from '../containers/Options/WalletConnectCamera';
import PrivateKey from '../containers/Options/PrivateKey';
import BridgeStatus from '../containers/Bridge/bridgeStatus';
import Onmeta from '../containers/FundCardScreen/onmeta';
import CardSignupScreen from '../containers/DebitCard/cardSignUp';
import LegalScreen from '../containers/legalDocs/legal';
import { t } from 'i18next';
import OTPVerificationScreen from '../containers/DebitCard/OTPVerification';
import CardSignupCompleteScreen from '../containers/DebitCard/signUpComplete';
import CardKYCStatusScreen from '../containers/DebitCard/KYCStatus';
import CypherCardScreen from '../containers/DebitCard/CardV2';
import CardRevealAuthScreen from '../containers/DebitCard/bridgeCard/cardRevealAuth';
import CardSignupLandingScreen from '../containers/DebitCard/cardSignupLanding';
import BridgeFundCardScreen from '../containers/DebitCard/bridgeCard/fundCard';
import ChangePin from '../containers/PinAuthetication/changePin';
import ConfirmPin from '../containers/PinAuthetication/confirmPin';
import SetPin from '../containers/PinAuthetication/setPin';
import PinValidation from '../containers/PinAuthetication/pinValidation';
import UpdateCardApplicationScreen from '../containers/DebitCard/updateCardApplication';
import HostsAndRPCScreen from '../containers/Options/hostsAndRPC';
import { CyDFastImage, CyDTouchView } from '../styles/tailwindStyles';
import TransactionDetails from '../containers/DebitCard/bridgeCard/transactionDetails';
import ReferralRewards from '../containers/ReferralRewards/referrals';
import TokenOverviewV2 from '../containers/TokenOverview';
import { NFTOverviewScreen, NFTHoldingsScreen } from '../containers/NFT';
import { AddressBook } from '../containers/AddressBook/myAddress';
import { CreateContact } from '../containers/AddressBook/createContact';
import TransFiScreen from '../containers/ramp/transFi';
import UpgradeToPhysicalCardScreen from '../containers/DebitCard/CardV2/UpgradeToPhysicalCardScreen';
import { useEffect } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleProp,
  TextStyle,
  ToastAndroid,
} from 'react-native';
import ActivateCardScreen from '../containers/DebitCard/bridgeCard/activateCard';
import SetPinScreen from '../containers/DebitCard/bridgeCard/setPin';
import { useKeyboard } from '../hooks/useKeyboard';
import { DEFIOverviewScreen } from '../containers/DeFi/DEFIOverview';
import ShippingDetailsOTPScreen from '../containers/DebitCard/CardV2/ShippingDetailsOTPScreen';
import CardSignupConfirmation from '../containers/DebitCard/cardSignupConfirmation';
import UpdateCardContactDetails from '../containers/DebitCard/bridgeCard/updateContactDetails';
import SendInviteCode from '../containers/DebitCard/sendInviteCode';
import { LinkedWallets } from '../containers/DebitCard/bridgeCard/linkedWallets';
import LinkAnotherWallet from '../containers/DebitCard/bridgeCard/linkAnotherWallet';
import LinkWalletAuth from '../containers/DebitCard/bridgeCard/linkWalletAuth';
import ImportWalletOptions from '../containers/Options/importWalletOptions';
import CardNotificationSettings from '../containers/DebitCard/bridgeCard/cardNotificationSettings';
import EnterPrivateKey from '../containers/Auth/EnterPrivateKey';
import { ChooseWalletIndex } from '../containers/Auth/ChooseWalletIndex';
import PhoneNumberVerificationScreen from '../containers/DebitCard/bridgeCard/verifyPhoneNumber';
import CardTransactions from '../containers/DebitCard/bridgeCard/transactions';
import TelegramSetupSettings from '../containers/DebitCard/bridgeCard/cardTelegramSetup';
import CardQuote from '../containers/DebitCard/bridgeCard/quote';
import AutoLoad from '../containers/DebitCard/bridgeCard/autoLoad';
import PreviewAutoLoad from '../containers/DebitCard/bridgeCard/previewAutoLoad';

const { DynamicImage, DynamicButton } = require('../styles');

const PortfolioStack = createNativeStackNavigator();
const BrowserStack = createNativeStackNavigator();
const FundCardStack = createNativeStackNavigator();
const SwapStack = createNativeStackNavigator();
const OptionsStack = createNativeStackNavigator();
// const ActivityStack = createNativeStackNavigator();

const defaultHeaderLeft = navigation => {
  const { keyboardHeight } = useKeyboard();
  return (
    <CyDTouchView
      className='w-[60px] py-[10px] pl-[5px] pr-[20px]'
      onPress={() => {
        if (keyboardHeight) {
          Keyboard.dismiss();
          setTimeout(() => {
            navigation.goBack();
          }, 100);
        } else {
          navigation.goBack();
        }
      }}>
      <CyDFastImage
        className={'h-[20px] w-[20px]'}
        resizeMode='cover'
        source={AppImages.BACK}
      />
    </CyDTouchView>
  );
};

export function PortfolioStackScreen({ navigation, route }) {
  let backPressCount = 0;
  const handleBackButton = () => {
    if (backPressCount === 0) {
      setTimeout(() => {
        backPressCount = 0;
      }, 2000);
      ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
    } else if (backPressCount === 2) {
      backPressCount = 0;
      BackHandler.exitApp();
    }
    backPressCount++;
    return true;
  };

  const portfolioStackScreenHeaderTitleStyles: StyleProp<
    Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'> & {
      color?: string | undefined;
    }
  > = {
    fontFamily: C.fontsName.FONT_BLACK,
    fontSize: 20,
    fontWeight: '800',
  };

  useEffect(() => {
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
        name={screenTitle.DEFI_PROTOCOL_OVERVIEW_SCREEN}
        component={DEFIOverviewScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFT_OVERVIEW_SCREEN}
        component={NFTOverviewScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        }}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFT_HOLDINGS_SCREEN}
        component={NFTHoldingsScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.TRANSFI_SCREEN}
        component={TransFiScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TRANSFI'),
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.TOKEN_OVERVIEW}
        component={TokenOverviewV2}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20,
            fontWeight: '800',
          },
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerStyle: {
            backgroundColor: Colors.secondaryBackgroundColor,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 20,
            fontWeight: '700',
            color: Colors.primaryTextColor,
          },
          headerLeft: props => defaultHeaderLeft(navigation),
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
            fontWeight: '800',
            fontSize: 22,
            color: Colors.whiteColor,
          },
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerLeft: props => defaultHeaderLeft(navigation),
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerStyle: {
            elevation: 0,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.BRIDGE_SCREEN}
        component={Bridge}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Bridge',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 18,
            fontWeight: '800',
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.PIN}
        component={PinValidation}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SET_PIN}
        component={SetPin}
        options={({ navigation, route }) => ({
          headerShown: false,
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
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />
    </PortfolioStack.Navigator>
  );
}

export function DebitCardStackScreen({ navigation }) {
  const portfolioStackScreenHeaderTitleStyles: StyleProp<
    Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'> & {
      color?: string | undefined;
    }
  > = {
    fontFamily: C.fontsName.FONT_BLACK,
    fontSize: 20,
    fontWeight: '800',
  };
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerBackVisible: false,
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
            backgroundColor: Colors.appColor,
          },
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerBackVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_CONFIRMATION}
        component={CardSignupConfirmation}
        options={({ navigation }) => ({
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card Signup',
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerBackVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_SCREEN}
        component={CardSignupScreen}
        options={({ navigation, route }) => ({ headerShown: false })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_COMPLETE_SCREEN}
        component={CardSignupCompleteScreen}
        options={({ navigation }) => ({ headerShown: false })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_KYC_STATUS_SCREEN}
        component={CardKYCStatusScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Application Status',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => {
            return <></>;
          },
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.SEND_INVITE_CODE_SCREEN}
        component={SendInviteCode}
        options={({ navigation }) => ({ headerShown: false })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_OTP_VERIFICATION_SCREEN}
        component={OTPVerificationScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Verify OTP',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.PHONE_NUMBER_VERIFICATION_SCREEN}
        component={PhoneNumberVerificationScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Verify Phone Number',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.UPDATE_CARD_APPLICATION_SCREEN}
        component={UpdateCardApplicationScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Update Application',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.BRIDGE_CARD_SCREEN}
        component={CypherCardScreen}
        options={{
          headerShown: false,
        }}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_TRANSACTIONS_SCREEN}
        component={CardTransactions}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Card Transactions',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.BRIDGE_CARD_TRANSACTION_DETAILS_SCREEN}
        component={TransactionDetails}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />

      <FundCardStack.Screen
        name={screenTitle.BRIDGE_FUND_CARD_SCREEN}
        component={BridgeFundCardScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Load card',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_QUOTE_SCREEN}
        component={CardQuote}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Load card',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.AUTO_LOAD_SCREEN}
        component={AutoLoad}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Auto Load',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.PREVIEW_AUTO_LOAD_SCREEN}
        component={PreviewAutoLoad}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Auto Load',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN}
        component={CardRevealAuthScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_ACTIAVTION_SCREEN}
        component={ActivateCardScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SET_PIN_SCREEN}
        component={SetPinScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LINK_ANOTHER_WALLET}
        component={LinkAnotherWallet}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Link Another Wallet',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LINKED_WALLETS}
        component={LinkedWallets}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Linked Wallets',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LINK_WALLET_AUTH}
        component={LinkWalletAuth}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_NOTIFICATION_SETTINGS}
        component={CardNotificationSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Notification Settings',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.TELEGRAM_SETUP_SETTINGS}
        component={TelegramSetupSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Connect Telegram',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN}
        component={UpdateCardContactDetails}
        options={({ navigation }) => ({
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Update Contact Details',
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerBackVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TERMS_AND_CONDITIONS'),
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />

      <FundCardStack.Screen
        name={screenTitle.OPEN_LEGAL_SCREEN}
        component={OpenLegalScreen}
        options={{ headerShown: false }}
      />

      <FundCardStack.Screen
        name={screenTitle.FUND_CARD_SCREEN}
        component={FundCardScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Cypher Card',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />
      <FundCardStack.Screen
        name={screenTitle.TRANS_DETAIL}
        component={TransDetail}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitle: 'Explorer',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.UPGRADE_TO_PHYSICAL_CARD_SCREEN}
        component={UpgradeToPhysicalCardScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleShown: false,
          title: 'Add Shipping details',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SHIPPING_DETAILS_OTP_SCREEN}
        component={ShippingDetailsOTPScreen}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleShown: false,
          title: '',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />
    </FundCardStack.Navigator>
  );
}

export function BrowserStackScreen({ navigation, route }) {
  const { t } = useTranslation();

  let backPressCount = 0;
  const handleBackButton = () => {
    navigation.navigate(screenTitle.PORTFOLIO);
    if (backPressCount === 1) {
      setTimeout(() => {
        backPressCount = 0;
      }, 2000);
      ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
    } else if (backPressCount === 2) {
      backPressCount = 0;
      BackHandler.exitApp();
    }
    backPressCount++;
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

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
            elevation: 0,
          },
          headerLeft: () => (
            <DynamicButton
              onPress={() => {
                navigation.goBack();
              }}>
              <DynamicImage
                dynamic
                height={20}
                width={14}
                resizemode='cover'
                source={AppImages.BACK}
              />
            </DynamicButton>
          ),
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
            tabBarVisible: false,
          },
          headerLeft: () => (
            <DynamicTouchView
              dynamic
              onPress={() => {
                navigation.goBack();
              }}
              fD={'row'}>
              <DynamicImage
                dynamic
                height={18}
                width={14}
                resizemode='cover'
                source={AppImages.BACK}
              />
              <CText
                dynamic
                fF={C.fontsName.FONT_BLACK}
                fS={16}
                color={Colors.primaryTextColor}
                mL={20}>
                {t('TRAN_DETAIL')}
              </CText>
            </DynamicTouchView>
          ),
        })}
      />
    </BrowserStack.Navigator>
  );
}

export function SwapStackScreen({ navigation }) {
  let backPressCount = 0;
  const handleBackButton = () => {
    navigation.navigate(screenTitle.PORTFOLIO);
    if (backPressCount === 1) {
      setTimeout(() => {
        backPressCount = 0;
      }, 2000);
      ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
    } else if (backPressCount === 2) {
      backPressCount = 0;
      BackHandler.exitApp();
    }
    backPressCount++;
    return true;
  };

  const optionsStackScreenHeaderTitleStyles: StyleProp<
    Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'> & {
      color?: string | undefined;
    }
  > = {
    fontFamily: C.fontsName.FONT_BLACK,
    fontSize: 22,
    fontWeight: '800',
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);
  return (
    <SwapStack.Navigator initialRouteName={screenTitle.BRIDGE_SCREEN}>
      <SwapStack.Screen
        name={screenTitle.BRIDGE_SCREEN}
        component={Bridge}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Bridge',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 18,
            fontWeight: '800',
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        }}
      />
      <SwapStack.Screen
        name={screenTitle.BRIDGE_STATUS}
        component={BridgeStatus}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Bridge status',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: C.fontsName.FONT_BLACK,
            fontSize: 18,
            fontWeight: '800',
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />
    </SwapStack.Navigator>
  );
}
export function OptionsStackScreen({ navigation, route }) {
  const { t } = useTranslation();
  let backPressCount = 0;
  const handleBackButton = () => {
    navigation.navigate(screenTitle.PORTFOLIO);
    if (backPressCount === 1) {
      setTimeout(() => {
        backPressCount = 0;
      }, 2000);
      ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
    } else if (backPressCount === 2) {
      backPressCount = 0;
      BackHandler.exitApp();
    }
    backPressCount++;
    return true;
  };

  const optionsStackScreenHeaderTitleStyles: StyleProp<
    Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'> & {
      color?: string | undefined;
    }
  > = {
    fontFamily: C.fontsName.FONT_BLACK,
    fontSize: 22,
    fontWeight: '800',
  };

  useEffect(() => {
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.REFERRAL_REWARDS}
        component={ReferralRewards}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.PIN}
        component={PinValidation}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SET_PIN}
        component={SetPin}
        options={({ navigation, route }) => ({
          headerShown: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.SEND_INVITE_CODE_SCREEN}
        component={SendInviteCode}
        options={({ navigation }) => ({ headerShown: false })}
      />
      <OptionsStack.Screen
        name={screenTitle.CHANGE_PIN}
        component={ChangePin}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CHANGE_PIN'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.MY_ADDRESS}
        component={AddressBook}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.CREATE_CONTACT}
        component={CreateContact}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CREATE_NEW_CONTACT'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.QRCODE}
        component={QRCode}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('RECEIVE'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerStyle: {
            elevation: 0,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />
      <OptionsStack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation, route }) => ({
          headerTransparent: true,
          headerShadowVisible: false,
          title: 'SCAN QR CODE',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            ...optionsStackScreenHeaderTitleStyles,
            color: Colors.whiteColor,
          },
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.IMPORT_WALLET_OPTIONS}
        component={ImportWalletOptions}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('IMPORT_WALLET'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerStyle: {
            elevation: 0,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.CHOOSE_WALLET_INDEX}
        component={ChooseWalletIndex}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('CHOOSE_WALLET_TO_IMPORT'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerStyle: {
            elevation: 0,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ENTER_PRIVATE_KEY}
        component={EnterPrivateKey}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('ENTER_PRIVATE_KEY'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerStyle: {
            elevation: 0,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: props => defaultHeaderLeft(navigation),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
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
            tabBarVisible: false,
          },
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.OPEN_LEGAL_SCREEN}
        component={OpenLegalScreen}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={{
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
        }}
      />
    </OptionsStack.Navigator>
  );
}
