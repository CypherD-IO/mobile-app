import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { t } from 'i18next';
import React, { useEffect } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleProp,
  TextStyle,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as C from '../constants/index';
import { screenTitle } from '../constants/index';
import ActivityScreen from '../containers/Activities/activity';
import ActivityFilter from '../containers/Activities/activityFilter';
import { CreateContact } from '../containers/AddressBook/createContact';
import { AddressBook } from '../containers/AddressBook/myAddress';
import { ChooseWalletIndex } from '../containers/Auth/ChooseWalletIndex';
import EnterKeyScreen from '../containers/Auth/EnterKey';
import EnterPrivateKey from '../containers/Auth/EnterPrivateKey';
import TransDetail from '../containers/Auth/TransDetail';
import Bridge from '../containers/Bridge';
import BrowserScreen from '../containers/Browser/Browser';
import CosmosAction from '../containers/CosmosStaking/action';
import CosmosSelectReValidator from '../containers/CosmosStaking/reValidator';
import CosmosUnboundings from '../containers/CosmosStaking/unboundings';
import CosmosValidators from '../containers/CosmosStaking/validators';
import { DEFIOverviewScreen } from '../containers/DeFi/DEFIOverview';
import CypherCardScreen from '../containers/DebitCard/CardV2';
import CryptoWithdrawal from '../containers/DebitCard/CardV2/cryptoWithdrawal/cryptoWithdrawal';
import WithDrawSuccess from '../containers/DebitCard/CardV2/cryptoWithdrawal/withDrawSuccess';
import WithdrawConfirmation from '../containers/DebitCard/CardV2/cryptoWithdrawal/withdrawConfirmation';
import WithdrawHistory from '../containers/DebitCard/CardV2/cryptoWithdrawal/withdrawHistory';
import FirstLoadCard from '../containers/DebitCard/CardV2/firstLoadCard';
import GlobalOptions from '../containers/DebitCard/CardV2/globalOptions';
import ManageSubscription from '../containers/DebitCard/CardV2/manageSubscription';
import MigratePCFunds from '../containers/DebitCard/CardV2/migrateFunds';
import CardApplicationV2 from '../containers/DebitCard/CardV2/signup/application';
import GetYourCardInfo from '../containers/DebitCard/CardV2/signup/getYourCardInfo';
import IHaveReferralCodeScreen from '../containers/DebitCard/CardV2/signup/iHaveReferralCodeScreen';
import KYCVerficicationV2 from '../containers/DebitCard/CardV2/signup/kycVerification';
import OTPVerification from '../containers/DebitCard/CardV2/signup/otpVerification';
import TelegramSetup from '../containers/DebitCard/CardV2/signup/telegramSetup';
import WelcomeSceens from '../containers/DebitCard/CardV2/signup/welcomeScreens';
import ActivateCardScreen from '../containers/DebitCard/bridgeCard/activateCard';
import AutoLoad from '../containers/DebitCard/bridgeCard/autoLoad';
import CardActivationConsent from '../containers/DebitCard/bridgeCard/cardActivationConsent';
import CardControlsMenu from '../containers/DebitCard/bridgeCard/cardControlsMenu';
import CardControlsSettings from '../containers/DebitCard/bridgeCard/cardControlsSettings';
import CardNotificationSettings from '../containers/DebitCard/bridgeCard/cardNotificationSettings';
import CardRevealAuthScreen from '../containers/DebitCard/bridgeCard/cardRevealAuth';
import CardUnlockAuth from '../containers/DebitCard/bridgeCard/cardUnlockAuth';
import EditLimits from '../containers/DebitCard/bridgeCard/editlimits';
import BridgeFundCardScreen from '../containers/DebitCard/bridgeCard/fundCard';
import LinkAnotherWallet from '../containers/DebitCard/bridgeCard/linkAnotherWallet';
import LinkWalletAuth from '../containers/DebitCard/bridgeCard/linkWalletAuth';
import { LinkedWallets } from '../containers/DebitCard/bridgeCard/linkedWallets';
import LockdownMode from '../containers/DebitCard/bridgeCard/lockdownMode';
import LockdownModeAuth from '../containers/DebitCard/bridgeCard/lockdownModeAuth';
import PreviewAutoLoad from '../containers/DebitCard/bridgeCard/previewAutoLoad';
import CardQuote from '../containers/DebitCard/bridgeCard/quote';
import SetPinScreen from '../containers/DebitCard/bridgeCard/setPin';
import SetTelegramPin from '../containers/DebitCard/bridgeCard/setTelegramPin';
import ThreeDSecure from '../containers/DebitCard/bridgeCard/threeDSecure';
import TransactionDetails from '../containers/DebitCard/bridgeCard/transactionDetails';
import CardTransactions from '../containers/DebitCard/bridgeCard/transactions';
import UpdateCardContactDetails from '../containers/DebitCard/bridgeCard/updateContactDetails';
import DebitCardScreen from '../containers/DebitCard/index';
import AddDeliveryAddress from '../containers/DebitCard/physicalCardUpgradation/addDeliveryAddress';
import ShippingCheckout from '../containers/DebitCard/physicalCardUpgradation/ckeckout';
import ShippingConfirmation from '../containers/DebitCard/physicalCardUpgradation/confirmation';
import NameOnCard from '../containers/DebitCard/physicalCardUpgradation/nameOnCard';
import OrderSteps from '../containers/DebitCard/physicalCardUpgradation/orderSteps';
import VerifyShippingAddress from '../containers/DebitCard/physicalCardUpgradation/verifyShippingAddress';
import CoinbasePay from '../containers/FundCardScreen/cbpay';
import Onmeta from '../containers/FundCardScreen/onmeta';
import IBC from '../containers/IBC';
import OpenLegalScreen from '../containers/InfoScreen/openLegalDoc';
import { NFTHoldingsScreen, NFTOverviewScreen } from '../containers/NFT';
import ManageWallet from '../containers/Options/ManageWallet';
import NotificationSettings from '../containers/Options/NotificationSettings';
import PrivateKey from '../containers/Options/PrivateKey';
import SecurityPrivacy from '../containers/Options/SecurityPrivacy';
import SeedPhrase from '../containers/Options/SeedPhrase';
import WalletConnectCamera from '../containers/Options/WalletConnectCamera';
import AdvancedSettings from '../containers/Options/advancedSettings';
import AppSettings from '../containers/Options/appSettings';
import HostsAndRPCScreen from '../containers/Options/hostsAndRPC';
import ImportWalletOptions from '../containers/Options/importWalletOptions';
import OptionsScreen from '../containers/Options/index';
import Referrals from '../containers/Options/referrals';
import Rewards from '../containers/Options/rewards';
import AppearanceSelector from '../containers/Options/theme';
import ChangePin from '../containers/PinAuthetication/changePin';
import ConfirmPin from '../containers/PinAuthetication/confirmPin';
import PinValidation from '../containers/PinAuthetication/pinValidation';
import SetPin from '../containers/PinAuthetication/setPin';
import PortfolioScreen from '../containers/Portfolio/index';
import QRScanner from '../containers/Qrcode/QRScanner';
import QRCode from '../containers/Qrcode/index';
import SendTo from '../containers/SendTo';
import EnterAmount from '../containers/SendTo/enterAmount';
import SocialMediaScreen from '../containers/SocialMedia/socialMedia';
import TokenOverviewV2 from '../containers/TokenOverview';
import LegalScreen from '../containers/legalDocs/legal';
import TransFiScreen from '../containers/ramp/transFi';
import { useKeyboard } from '../hooks/useKeyboard';
import {
  CyDIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';

const PortfolioStack = createNativeStackNavigator();
const BrowserStack = createNativeStackNavigator();
const FundCardStack = createNativeStackNavigator();
const SwapStack = createNativeStackNavigator();
const OptionsStack = createNativeStackNavigator();

const defaultHeaderLeft = (
  navigation: NavigationProp<ParamListBase>,
  keyboardHeight: number,
) => {
  return (
    <CyDTouchView
      className=' px-[12px] bg-n20'
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
      <CyDIcons name='arrow-left' size={24} className='text-base400' />
    </CyDTouchView>
  );
};

const CustomHeader = ({
  title,
  navigation,
  keyboardHeight,
}: {
  title: string;
  navigation: NavigationProp<ParamListBase>;
  keyboardHeight: number;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <CyDView
      className='bg-n20 flex-row justify-between pb-[10px]'
      style={{ paddingTop: insets.top }}>
      <CyDTouchView
        className='px-[12px]'
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
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
      </CyDTouchView>
      <CyDText className='text-base400 text-[20px] font-extrabold mr-[44px]'>
        {title}
      </CyDText>
      <CyDView className='' />
    </CyDView>
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
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFT_OVERVIEW_SCREEN}
        component={NFTOverviewScreen}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFT_HOLDINGS_SCREEN}
        component={NFTHoldingsScreen}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.TRANSFI_SCREEN}
        component={TransFiScreen}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('TRANSFI')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.TOKEN_OVERVIEW}
        component={TokenOverviewV2}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_VALIDATORS}
        component={CosmosValidators}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_UNBOUNDINGS}
        component={CosmosUnboundings}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={'Unboundings'}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_ACTION}
        component={CosmosAction}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.COSMOS_REVALIDATOR}
        component={CosmosSelectReValidator}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('RE_VALIDATE_TO')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.TRANS_DETAIL}
        component={TransDetail}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('TRAN_DETAIL')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFTS_DETAIL}
        component={TransDetail}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('NFT_DETAIL')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.GEN_WEBVIEW}
        component={TransDetail}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('GEN_WEBVIEW')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.CB_PAY}
        component={CoinbasePay}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('CB_PAY')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.ON_META}
        component={Onmeta}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('ON_META')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.ENTER_AMOUNT}
        component={EnterAmount}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('ENTER_AMOUNT')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.SEND_TO}
        component={SendTo}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('SEND_TO')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('SCAN QR CODE')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.IBC_SCREEN}
        component={IBC}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('IBC')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      {/* used in two stacks */}
      <PortfolioStack.Screen
        name={screenTitle.QRCODE}
        component={QRCode}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('RECEIVE')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
          header: () => (
            <CustomHeader
              title={t('CONFIRM_PIN')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      {/* <PortfolioStack.Screen
        name={screenTitle.LOCKDOWN_MODE}
        component={LockdownMode}
        options={({ navigation, route }) => ({
          headerShown: false,
        })} 
      /> */}

      {/* <PortfolioStack.Screen
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
      /> */}

      {/* <PortfolioStack.Screen
        name={screenTitle.INTERNATIONAL_CARD_CONTROLS}
        component={CardControlsSettings}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='International Transactions'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      /> */}

      {/* <PortfolioStack.Screen
        name={screenTitle.CARD_CONTROLS_MENU}
        component={CardControlsMenu}
        options={({ navigation, route }) => ({
          headerShown: false,
        })}
      /> */}

      {/* <PortfolioStack.Screen
        name={screenTitle.DOMESTIC_CARD_CONTROLS}
        component={CardControlsSettings}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title='Domestic Transactions'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      /> */}

      {/* <PortfolioStack.Screen
        name={screenTitle.EDIT_USAGE_LIMITS}
        component={EditLimits}
        options={() => ({
          headerShown: false,
        })}
      /> */}

      {/* <PortfolioStack.Screen
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
      /> */}

      {/* <PortfolioStack.Screen
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
      /> */}
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
          header: () => (
            <CustomHeader
              title='Lockdown Mode'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_UNLOCK_AUTH}
        component={CardUnlockAuth}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.THREE_D_SECURE}
        component={ThreeDSecure}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title='3D Secure'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.DOMESTIC_CARD_CONTROLS}
        component={CardControlsSettings}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title='Domestic Transactions'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.INTERNATIONAL_CARD_CONTROLS}
        component={CardControlsSettings}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='International Transactions'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.EDIT_USAGE_LIMITS}
        component={EditLimits}
        options={() => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.KYC_VERIFICATION}
        component={KYCVerficicationV2}
        options={() => ({ headerShown: false })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_SCREEN}
        component={CypherCardScreen}
        options={{
          headerShown: false,
        }}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_TRANSACTIONS_SCREEN}
        component={CardTransactions}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Card Transactions'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.CARD_TRANSACTION_DETAILS_SCREEN}
        component={TransactionDetails}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.BRIDGE_FUND_CARD_SCREEN}
        component={BridgeFundCardScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Load card'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_QUOTE_SCREEN}
        component={CardQuote}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Load card'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.AUTO_LOAD_SCREEN}
        component={AutoLoad}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Auto Load'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.PREVIEW_AUTO_LOAD_SCREEN}
        component={PreviewAutoLoad}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Auto Load'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_REVEAL_AUTH_SCREEN}
        component={CardRevealAuthScreen}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
      {/* not uses anywhere checka nd confirm */}
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
          header: () => (
            <CustomHeader
              title='Activate Card'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_SET_PIN_SCREEN}
        component={SetPinScreen}
        options={() => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.LINK_ANOTHER_WALLET}
        component={LinkAnotherWallet}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Link Another Wallet'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.LINKED_WALLETS}
        component={LinkedWallets}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Linked Wallets'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.LINK_WALLET_AUTH}
        component={LinkWalletAuth}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title='Link Wallet'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_NOTIFICATION_SETTINGS}
        component={CardNotificationSettings}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title='Notification Settings'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN}
        component={UpdateCardContactDetails}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Update Contact Details'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Terms and Conditions'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
          header: () => (
            <CustomHeader
              title='Explorer'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
          header: () => (
            <CustomHeader
              title='Move funds'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
      <FundCardStack.Screen
        name={screenTitle.MANAGE_SUBSCRIPTION}
        component={ManageSubscription}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.FIRST_LOAD_CARD}
        component={FirstLoadCard}
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
    <SwapStack.Navigator initialRouteName={screenTitle.SWAP_SCREEN}>
      <SwapStack.Screen
        name={screenTitle.SWAP_SCREEN}
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
          header: () => (
            <CustomHeader
              title='Activities'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
        name={screenTitle.PIN}
        component={PinValidation}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.SET_PIN}
        component={SetPin}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.CONFIRM_PIN}
        component={ConfirmPin}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('CONFIRM_PIN')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.ACTIVITYFILTER}
        component={ActivityFilter}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Activity Filter'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.MANAGE_WALLET}
        component={ManageWallet}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('MANAGE_WALLET')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.SECURITY_PRIVACY}
        component={SecurityPrivacy}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('SECURITY_PRIVACY')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.SEED_PHRASE}
        component={SeedPhrase}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('SEED_PHRASE')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.PRIVATE_KEY}
        component={PrivateKey}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('PRIVATE_KEY')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.NOTIFICATION_SETTINGS}
        component={NotificationSettings}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('NOTIFICATION_PREFERENCES')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.ADVANCED_SETTINGS}
        component={AdvancedSettings}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('ADVANCED_SETTINGS')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.CHANGE_PIN}
        component={ChangePin}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('CHANGE_PIN')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.CONFIRM_CHANGE_PIN}
        component={ConfirmPin}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('CONFIRM_PIN')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.SET_CHANGE_PIN}
        component={SetPin}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('SET_PIN')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
          header: () => (
            <CustomHeader
              title={t('CREATE_NEW_CONTACT')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.HOSTS_AND_RPC_SCREEN}
        component={HostsAndRPCScreen}
        options={({ navigation, route }) => ({
          header: () => (
            <CustomHeader
              title={t('HOSTS_AND_RPC_INIT_CAPS')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.QRCODE}
        component={QRCode}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('RECEIVE')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.APP_SETTINGS}
        component={AppSettings}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('APP_SETTINGS')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      {/* <OptionsStack.Screen
        name={screenTitle.IMPORT_ANOTHER_WALLET}
        component={ImportAnotherWallet}
        options={{ headerShown: false }}
      /> */}

      <OptionsStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('TERMS_AND_CONDITIONS')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.QR_CODE_SCANNER}
        component={QRScanner}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={'SCAN QR CODE'}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.IMPORT_WALLET_OPTIONS}
        component={ImportWalletOptions}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('IMPORT_WALLET')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.ENTER_KEY}
        component={EnterKeyScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={t('ENTER_SEED_PHRASE')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
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
          header: () => (
            <CustomHeader
              title={t('ENTER_PRIVATE_KEY')}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.WALLET_CONNECT}
        component={WalletConnectCamera}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      {/* <OptionsStack.Screen
        name={screenTitle.DEBIT_CARD_SCREEN}
        component={DebitCardScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={'Cypher Card'}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      /> */}

      <OptionsStack.Screen
        name={screenTitle.OPEN_LEGAL_SCREEN}
        component={OpenLegalScreen}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.SOCIAL_MEDIA_SCREEN}
        component={SocialMediaScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={'Social Media'}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.BROWSER}
        component={BrowserStackScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={'Browser'}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.THEME}
        component={AppearanceSelector}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={'Theme'}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
    </OptionsStack.Navigator>
  );
}
