import * as React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import BrowserScreen from '../containers/Browser/Browser';
import ActivityScreen from '../containers/Activities/activity';
import ActivityFilter from '../containers/Activities/activityFilter';
import PortfolioScreen from '../containers/Portfolio/index';
import DebitCardScreen from '../containers/DebitCard/index';
import * as C from '../constants/index';
import { screenTitle } from '../constants/index';
import AppImages from '../../assets/images/appImages';
import { Colors } from '../constants/theme';
import TransDetail from '../containers/Auth/TransDetail';
import ImportWallet from '../containers/Auth/ImportWallet';
import EnterKeyScreen from '../containers/Auth/EnterKey';
import QRCode from '../containers/Qrcode/index';
import Backup from '../containers/Auth/Backup';
import EnterAmount from '../containers/SendTo/enterAmount';
import SendTo from '../containers/SendTo';
import OptionsScreen from '../containers/Options/index';
import ImportAnotherWallet from '../containers/Options/ImportAnotherWallet';
import NotificationSettings from '../containers/Options/NotificationSettings';
import ManageWallet from '../containers/Options/ManageWallet';
import SecurityPrivacy from '../containers/Options/SecurityPrivacy';
import SeedPhrase from '../containers/Options/SeedPhrase';
import IBC from '../containers/IBC';
import OpenLegalScreen from '../containers/InfoScreen/openLegalDoc';
import SocialMediaScreen from '../containers/SocialMedia/socialMedia';
import CosmosUnboundings from '../containers/CosmosStaking/unboundings';
import CosmosValidators from '../containers/CosmosStaking/validators';
import CosmosAction from '../containers/CosmosStaking/action';
import CosmosSelectReValidator from '../containers/CosmosStaking/reValidator';
import CoinbasePay from '../containers/FundCardScreen/cbpay';
import QRScanner from '../containers/Qrcode/QRScanner';
import AppSettings from '../containers/Options/appSettings';
import AdvancedSettings from '../containers/Options/advancedSettings';
import WalletConnectCamera from '../containers/Options/WalletConnectCamera';
import PrivateKey from '../containers/Options/PrivateKey';
import Onmeta from '../containers/FundCardScreen/onmeta';
import LegalScreen from '../containers/legalDocs/legal';
import { t } from 'i18next';
import OTPVerificationScreen from '../containers/DebitCard/OTPVerification';
import CypherCardScreen from '../containers/DebitCard/CardV2';
import CardRevealAuthScreen from '../containers/DebitCard/bridgeCard/cardRevealAuth';
import BridgeFundCardScreen from '../containers/DebitCard/bridgeCard/fundCard';
import ChangePin from '../containers/PinAuthetication/changePin';
import ConfirmPin from '../containers/PinAuthetication/confirmPin';
import SetPin from '../containers/PinAuthetication/setPin';
import PinValidation from '../containers/PinAuthetication/pinValidation';
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
import UpdateCardContactDetails from '../containers/DebitCard/bridgeCard/updateContactDetails';
import { LinkedWallets } from '../containers/DebitCard/bridgeCard/linkedWallets';
import LinkAnotherWallet from '../containers/DebitCard/bridgeCard/linkAnotherWallet';
import LinkWalletAuth from '../containers/DebitCard/bridgeCard/linkWalletAuth';
import ImportWalletOptions from '../containers/Options/importWalletOptions';
import CardNotificationSettings from '../containers/DebitCard/bridgeCard/cardNotificationSettings';
import EnterPrivateKey from '../containers/Auth/EnterPrivateKey';
import { ChooseWalletIndex } from '../containers/Auth/ChooseWalletIndex';
import CardTransactions from '../containers/DebitCard/bridgeCard/transactions';
import TelegramSetupSettings from '../containers/DebitCard/bridgeCard/cardTelegramSetup';
import CardQuote from '../containers/DebitCard/bridgeCard/quote';
import AutoLoad from '../containers/DebitCard/bridgeCard/autoLoad';
import PreviewAutoLoad from '../containers/DebitCard/bridgeCard/previewAutoLoad';
import CardControlsMenu from '../containers/DebitCard/bridgeCard/cardControlsMenu';
import CardControlsSettings from '../containers/DebitCard/bridgeCard/cardControlsSettings';
import ThreeDSecure from '../containers/DebitCard/bridgeCard/threeDSecure';
import LockdownMode from '../containers/DebitCard/bridgeCard/lockdownMode';
import LockdownModeAuth from '../containers/DebitCard/bridgeCard/lockdownModeAuth';
import CardUnlockAuth from '../containers/DebitCard/bridgeCard/cardUnlockAuth';
import SelectPlan from '../containers/DebitCard/CardV2/signup/selectPlan';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import GetYourCardInfo from '../containers/DebitCard/CardV2/signup/getYourCardInfo';
import CardApplicationV2 from '../containers/DebitCard/CardV2/signup/application';
import WelcomeSceens from '../containers/DebitCard/CardV2/signup/welcomeScreens';
import Rewards from '../containers/Options/rewards';
import OTPVerification from '../containers/DebitCard/CardV2/signup/otpVerification';
import TelegramSetup from '../containers/DebitCard/CardV2/signup/telegramSetup';
import KYCVerficicationV2 from '../containers/DebitCard/CardV2/signup/kycVerification';
import MigratePCFunds from '../containers/DebitCard/CardV2/migrateFunds';
import Bridge from '../containers/Bridge';
import Referrals from '../containers/Options/referrals';
import IHaveReferralCodeScreen from '../containers/DebitCard/CardV2/signup/iHaveReferralCodeScreen';
import CryptoWithdrawal from '../containers/DebitCard/CardV2/cryptoWithdrawal/cryptoWithdrawal';
import WithdrawConfirmation from '../containers/DebitCard/CardV2/cryptoWithdrawal/withdrawConfirmation';
import WithDrawSuccess from '../containers/DebitCard/CardV2/cryptoWithdrawal/withDrawSuccess';
import WithdrawHistory from '../containers/DebitCard/CardV2/cryptoWithdrawal/withdrawHistory';
import OrderSteps from '../containers/DebitCard/physicalCardUpgradation/orderSteps';
import VerifyShippingAddress from '../containers/DebitCard/physicalCardUpgradation/verifyShippingAddress';
import AddDeliveryAddress from '../containers/DebitCard/physicalCardUpgradation/addDeliveryAddress';
import NameOnCard from '../containers/DebitCard/physicalCardUpgradation/nameOnCard';
import ShippingConfirmation from '../containers/DebitCard/physicalCardUpgradation/confirmation';
import ShippingCheckout from '../containers/DebitCard/physicalCardUpgradation/ckeckout';
import CardActivationConsent from '../containers/DebitCard/bridgeCard/cardActivationConsent';
import GlobalOptions from '../containers/DebitCard/CardV2/globalOptions';
import SetTelegramPin from '../containers/DebitCard/bridgeCard/setTelegramPin';

const PortfolioStack = createNativeStackNavigator();
const BrowserStack = createNativeStackNavigator();
const FundCardStack = createNativeStackNavigator();
const SwapStack = createNativeStackNavigator();
const OptionsStack = createNativeStackNavigator();
// const ActivityStack = createNativeStackNavigator();

const defaultHeaderLeft = (
  navigation: NavigationProp<ParamListBase>,
  keyboardHeight: number,
) => {
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
        className={'w-[32px] h-[32px]'}
        resizeMode='cover'
        source={AppImages.BACK_ARROW_GRAY}
      />
    </CyDTouchView>
  );
};

export function PortfolioStackScreen() {
  const { keyboardHeight } = useKeyboard();

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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFT_OVERVIEW_SCREEN}
        component={NFTOverviewScreen}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.QRCODE}
        component={QRCode}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('RECEIVE'),
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.BRIDGE_SKIP_API_SCREEN}
        component={Bridge}
        options={() => ({
          headerShown: false,
        })}
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
    </PortfolioStack.Navigator>
  );
}

export function DebitCardStackScreen({ route }) {
  const { keyboardHeight } = useKeyboard();
  const portfolioStackScreenHeaderTitleStyles: StyleProp<
    Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'> & {
      color?: string | undefined;
      backgroundColor?: string | undefined;
    }
  > = {
    fontFamily: C.fontsName.FONT_BLACK,
    fontSize: 20,
    fontWeight: '800',
  };
  const initialRouteName =
    route.params?.screenToNavigate || screenTitle.DEBIT_CARD_SCREEN;

  return (
    <FundCardStack.Navigator initialRouteName={initialRouteName}>
      <FundCardStack.Screen
        name={screenTitle.DEBIT_CARD_SCREEN}
        component={DebitCardScreen}
        options={{ headerShown: false }}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_CONTROLS_MENU}
        component={CardControlsMenu}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LOCKDOWN_MODE}
        component={LockdownMode}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.TELEGRAM_PIN_SETUP}
        component={SetTelegramPin}
        options={() => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LOCKDOWN_MODE_AUTH}
        component={LockdownModeAuth}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_UNLOCK_AUTH}
        component={CardUnlockAuth}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.THREE_D_SECURE}
        component={ThreeDSecure}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '3D Secure',
          headerTitleAlign: 'left',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.DOMESTIC_CARD_CONTROLS}
        component={CardControlsSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Domestic Transactions',
          headerTitleAlign: 'left',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.INTERNATIONAL_CARD_CONTROLS}
        component={CardControlsSettings}
        options={({ navigation, route }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'International Transactions',
          headerTitleAlign: 'left',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.KYC_VERIFICATION}
        component={KYCVerficicationV2}
        options={() => ({ headerShown: false })}
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.BRIDGE_CARD_TRANSACTION_DETAILS_SCREEN}
        component={TransactionDetails}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.BRIDGE_FUND_CARD_SCREEN}
        component={BridgeFundCardScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Load card',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            ...portfolioStackScreenHeaderTitleStyles,
          },
          headerStyle: {
            backgroundColor: '#F5F6F7',
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_ACTIVATION_CONSENT_SCREEN}
        component={CardActivationConsent}
        options={({ navigation }) => ({
          headerShown: false,
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TERMS_AND_CONDITIONS'),
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.OPEN_LEGAL_SCREEN}
        component={OpenLegalScreen}
        options={{ headerShown: false }}
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.ORDER_STEPS_SCREEN}
        component={OrderSteps}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.VERIFY_SHIPPING_ADDRESS_SCREEN}
        component={VerifyShippingAddress}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.NAME_ON_CARD_SCREEN}
        component={NameOnCard}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.ADD_DELIVERY_ADDRESS_SCREEN}
        component={AddDeliveryAddress}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SHIPPING_CHECKOUT_SCREEN}
        component={ShippingCheckout}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SHIPPING_CONFIRMATION_SCREEN}
        component={ShippingConfirmation}
        options={({ navigation }) => ({
          headerShown: false,
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SHIPPING_DETAILS_OTP_SCREEN}
        component={ShippingDetailsOTPScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleShown: false,
          title: '',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: portfolioStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_WELCOME_SCREEN}
        component={WelcomeSceens}
        options={{
          headerShown: false,
        }}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_SIGNUP_OTP_VERIFICATION}
        component={OTPVerification}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.TELEGRAM_SETUP}
        component={TelegramSetup}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.GET_YOUR_CARD}
        component={GetYourCardInfo}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_APPLICATION}
        component={CardApplicationV2}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.SELECT_PLAN}
        component={SelectPlan}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.I_HAVE_REFERRAL_CODE_SCREEN}
        component={IHaveReferralCodeScreen}
        options={{
          headerShown: false,
        }}
      />

      <FundCardStack.Screen
        name={screenTitle.MIGRATE_FUNDS}
        component={MigratePCFunds}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerTransparent: true,
          headerShadowVisible: false,
          headerTitle: 'Move funds',
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: 'bold',
          },
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CRYPTO_WITHDRAWAL}
        component={CryptoWithdrawal}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.WITHDRAW_CONFIRMATION}
        component={WithdrawConfirmation}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.WITHDRAW_SUCCESS}
        component={WithDrawSuccess}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.WITHDRAW_HISTORY}
        component={WithdrawHistory}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.GLOBAL_CARD_OPTIONS}
        component={GlobalOptions}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
    </FundCardStack.Navigator>
  );
}

export function BrowserStackScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const { keyboardHeight } = useKeyboard();
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
        name={screenTitle.TRANS_DETAIL}
        component={TransDetail}
        options={({ navigation: _navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: '',
          navigationOptions: {
            tabBarVisible: false,
          },
          headerLeft: () => defaultHeaderLeft(_navigation, keyboardHeight),
        })}
      />
    </BrowserStack.Navigator>
  );
}

export function SwapStackScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  // const { keyboardHeight } = useKeyboard();
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
    <SwapStack.Navigator initialRouteName={screenTitle.BRIDGE_SKIP_API_SCREEN}>
      <SwapStack.Screen
        name={screenTitle.BRIDGE_SKIP_API_SCREEN}
        component={Bridge}
        options={() => ({
          headerShown: false,
        })}
      />
    </SwapStack.Navigator>
  );
}

export function OptionsStackScreen({
  navigation: _navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
  const { keyboardHeight } = useKeyboard();
  let backPressCount = 0;
  const handleBackButton = () => {
    _navigation.navigate(screenTitle.PORTFOLIO);
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
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.REWARDS}
        component={Rewards}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.REFERRALS}
        component={Referrals}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.REFERRAL_REWARDS}
        component={ReferralRewards}
        options={() => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.PIN}
        component={PinValidation}
        options={() => ({
          headerShown: false,
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.SET_PIN}
        component={SetPin}
        options={() => ({
          headerShown: false,
        })}
      />
      <PortfolioStack.Screen
        name={screenTitle.CONFIRM_PIN}
        component={ConfirmPin}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ACTIVITYFILTER}
        component={ActivityFilter}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.SEED_PHRASE}
        component={SeedPhrase}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('SEED_PHRASE'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ADVANCED_SETTINGS}
        component={AdvancedSettings}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          navigationOptions: {
            tabBarVisible: false,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.QRCODE}
        component={QRCode}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('RECEIVE'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
          },

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.APP_SETTINGS}
        component={AppSettings}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('TERMS_AND_CONDITIONS'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.IMPORT_WALLET_OPTIONS}
        component={ImportWalletOptions}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('IMPORT_WALLET'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ENTER_KEY}
        component={EnterKeyScreen}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.CHOOSE_WALLET_INDEX}
        component={ChooseWalletIndex}
        options={() => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.ENTER_PRIVATE_KEY}
        component={EnterPrivateKey}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: t('ENTER_PRIVATE_KEY'),
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
          },
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.WALLET_CONNECT}
        component={WalletConnectCamera}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.DEBIT_CARD_SCREEN}
        component={DebitCardScreen}
        options={({ navigation }) => ({
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
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
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
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,

          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.BROWSER}
        component={BrowserStackScreen}
        options={({ navigation }) => ({
          headerTransparent: false,
          headerShadowVisible: false,
          title: 'Browser',
          headerTitleAlign: 'center',
          headerTitleStyle: optionsStackScreenHeaderTitleStyles,
          headerTintColor: Colors.primaryTextColor,
          headerBackTitleVisible: false,
          headerLeft: () => defaultHeaderLeft(navigation, keyboardHeight),
        })}
      />
    </OptionsStack.Navigator>
  );
}
