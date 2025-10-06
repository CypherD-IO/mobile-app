import {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from '@react-navigation/native';
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
import TransDetail from '../containers/Auth/TransDetail';
import Bridge from '../containers/Bridge';
import BrowserScreen from '../containers/Browser/Browser';
import { DEFIOverviewScreen } from '../containers/DeFi/DEFIOverview';
import CypherCardScreen from '../containers/DebitCard/CardV2';
import CryptoWithdrawal from '../containers/DebitCard/CardV2/cryptoWithdrawal/cryptoWithdrawal';
import WithDrawSuccess from '../containers/DebitCard/CardV2/cryptoWithdrawal/withDrawSuccess';
import WithdrawConfirmation from '../containers/DebitCard/CardV2/cryptoWithdrawal/withdrawConfirmation';
import WithdrawHistory from '../containers/DebitCard/CardV2/cryptoWithdrawal/withdrawHistory';
import FirstLoadCard from '../containers/DebitCard/CardV2/firstLoadCard';
import ManageSubscription from '../containers/DebitCard/CardV2/manageSubscription';
import MigratePCFunds from '../containers/DebitCard/CardV2/migrateFunds';
import TelegramSetup from '../containers/DebitCard/CardV2/signup/telegramSetup';
import WelcomeSceens from '../containers/DebitCard/CardV2/signup/welcomeScreens';
import ActivateCardScreen from '../containers/DebitCard/bridgeCard/activateCard';
import AutoLoad from '../containers/DebitCard/bridgeCard/autoLoad';
import CardActivationConsent from '../containers/DebitCard/bridgeCard/cardActivationConsent';
import CardNotificationSettings from '../containers/DebitCard/bridgeCard/cardNotificationSettings';
import CardRevealAuthScreen from '../containers/DebitCard/bridgeCard/cardRevealAuth';
import CardUnlockAuth from '../containers/DebitCard/bridgeCard/cardUnlockAuth';
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
import ShippingCheckout from '../containers/DebitCard/physicalCardUpgradation/checkout';
import ShippingConfirmation from '../containers/DebitCard/physicalCardUpgradation/confirmation';
import NameOnCardScreen from '../containers/DebitCard/physicalCardUpgradation/nameOnCard';
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
import SeedPhrase from '../containers/Options/SeedPhrase';
import WalletConnectCamera from '../containers/Options/WalletConnectCamera';
import AdvancedSettings from '../containers/Options/advancedSettings';
import AppSettings from '../containers/Options/appSettings';
import HostsAndRPCScreen from '../containers/Options/hostsAndRPC';
import ImportWalletOptions from '../containers/Options/importWalletOptions';
import OptionsScreen from '../containers/Options/index';
import Referrals from '../containers/Referrals';
import Rewards from '../containers/Rewards';
import ClaimReward from '../containers/Rewards/claimReward';
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
} from '../styles/tailwindComponents';
import SelectAdditionalCardType from '../containers/DebitCard/CardV2/additionalCard/selectAdditionalCardType';
import CardDescription from '../containers/DebitCard/CardV2/additionalCard/cardDescription';
import CardControls from '../containers/DebitCard/bridgeCard/cardControls';
import ApplicationWelcome from '../containers/DebitCard/CardV2/signup/applicationWelcome';
import EnterReferralCode from '../containers/DebitCard/CardV2/signup/enterReferralCode';
import OffersAndPromotion from '../containers/DebitCard/CardV2/signup/offersAndPromotion';
import BasicDetails from '../containers/DebitCard/CardV2/signup/application/basicDetails';
import ShippingAddress from '../containers/DebitCard/CardV2/signup/application/shippingAddress';
import AdditionalDetails from '../containers/DebitCard/CardV2/signup/application/additionalDetails';
import EmailVerification from '../containers/DebitCard/CardV2/signup/application/emailVerification';
import KYCWebView from '../containers/DebitCard/CardV2/signup/application/kycWebView';
import NameOnCard from '../containers/DebitCard/CardV2/signup/application/nameOnCard';
import CardCreation from '../containers/DebitCard/CardV2/signup/application/cardCreation';
import CardApplicationStack from './CardApplicationStack';
import KYCVerification from '../containers/DebitCard/CardV2/signup/application/kyc/kycVerification';
import AirdropEligibility from '../containers/airdrop/eligibility';
import AirdropClaim from '../containers/airdrop/claim';
import AirdropClaimSuccess from '../containers/airdrop/claimSuccess';
import CountryTemporarilyUnsupported from '../containers/DebitCard/CardV2/signup/application/countryTemporarilyUnsupported';
import OptionsHub from '../containers/Options';
import TokenRewardEarned from '../containers/DebitCard/CardV2/signup/application/tokenRewardEarned';
import ReferralsViewAll from '../containers/Rewards/ReferralsViewAll';
import AllReferralCodes from '../containers/Referrals/AllReferralCodes';
import MerchantRewardListScreen from '../containers/DebitCard/CardV2/MerchantRewardListScreen';

const PortfolioStack = createNativeStackNavigator();
const BrowserStack = createNativeStackNavigator();
const FundCardStack = createNativeStackNavigator();
const SwapStack = createNativeStackNavigator();
const RewardsStack = createNativeStackNavigator();
const OptionsStack = createNativeStackNavigator();

const CustomHeader = ({
  title,
  navigation,
  keyboardHeight,
  textAlign = 'center',
  textStyle,
  backgroundColor,
}: {
  title: string;
  navigation: NavigationProp<ParamListBase>;
  keyboardHeight: number;
  textAlign?: 'center' | 'start';
  textStyle?: string;
  backgroundColor?: string;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <CyDView
      className={`flex-row ${textAlign === 'center' ? 'justify-between' : 'items-center'} pb-[10px] ${backgroundColor ?? 'bg-n20'}`}
      style={{ paddingTop: insets.top }}>
      <CyDTouchView
        className='px-[12px] mx-[4px]'
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
      <CyDText
        className={`text-base400 text-[20px] font-extrabold ${textAlign === 'center' ? 'mr-[44px]' : ''} ${textStyle ?? ''}`}>
        {title}
      </CyDText>
      {textAlign === 'center' && <CyDView className='' />}
    </CyDView>
  );
};

const CustomHeaderWithoutBack = ({
  title,
  keyboardHeight,
  style,
}: {
  title: string;
  keyboardHeight: number;
  style?: string;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <CyDView
      className={`bg-n20 flex-row justify-center pb-[10px] ${style}`}
      style={{ paddingTop: insets.top }}>
      <CyDText className='text-base400 text-[20px] font-extrabold'>
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
        name={screenTitle.TRANS_DETAIL}
        component={TransDetail}
        options={{ headerShown: false }}
      />

      <PortfolioStack.Screen
        name={screenTitle.NFTS_DETAIL}
        component={TransDetail}
        options={{ headerShown: false }}
      />

      <PortfolioStack.Screen
        name={screenTitle.GEN_WEBVIEW}
        component={TransDetail}
        options={{ headerShown: false }}
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
        options={{ headerShown: false }}
      />

      <PortfolioStack.Screen
        name={screenTitle.SEND_TO}
        component={SendTo}
        options={
          {
            headerShown: false,
          }
          //   ({ navigation, route }) => ({
          //   header: () => (
          //     <CustomHeader
          //       title={t('SEND_TO')}
          //       navigation={navigation}
          //       keyboardHeight={keyboardHeight}
          //     />
          //   ),
          // })
        }
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
        options={{ headerShown: false }}
      />

      <PortfolioStack.Screen
        name={screenTitle.PIN}
        component={PinValidation}
        options={() => ({
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

      <PortfolioStack.Screen
        name={screenTitle.BROWSER}
        component={BrowserScreen}
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

      <PortfolioStack.Screen
        name={screenTitle.AIRDROP_ELIGIBILITY}
        component={AirdropEligibility}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.AIRDROP_CLAIM}
        component={AirdropClaim}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <PortfolioStack.Screen
        name={screenTitle.AIRDROP_CLAIM_SUCCESS}
        component={AirdropClaimSuccess}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />
    </PortfolioStack.Navigator>
  );
}

type AnyRoute = RouteProp<
  Record<string, { screenToNavigate?: string } | undefined>,
  string
>;

export function DebitCardStackScreen({ route }: { route: AnyRoute }) {
  const { keyboardHeight } = useKeyboard();
  const initialRouteName =
    route.params?.screenToNavigate ?? screenTitle.DEBIT_CARD_SCREEN;

  return (
    <FundCardStack.Navigator initialRouteName={initialRouteName}>
      <FundCardStack.Screen
        name={screenTitle.DEBIT_CARD_SCREEN}
        component={DebitCardScreen}
        options={{ headerShown: false }}
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
        name={screenTitle.CARD_CONTROLS}
        component={CardControls}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title='Card Controls'
              navigation={navigation}
              keyboardHeight={keyboardHeight}
              textAlign='start'
              textStyle='text-[20px] font-medium'
              backgroundColor='bg-n0'
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.MERCHANT_REWARD_LIST}
        component={MerchantRewardListScreen}
        options={{
          headerShown: false,
        }}
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
        options={{
          headerShown: false,
        }}
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
              title='Load Card'
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
              title='Load Card'
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
        options={{ headerShown: false }}
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
        component={NameOnCardScreen}
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
        name={screenTitle.BASIC_DETAILS}
        component={BasicDetails}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_APPLICATION_WELCOME}
        component={ApplicationWelcome}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SHIPPING_ADDRESS}
        component={ShippingAddress}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.ADDITIONAL_DETAILS}
        component={AdditionalDetails}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />

      <FundCardStack.Screen
        name={screenTitle.EMAIL_VERIFICATION}
        component={EmailVerification}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.COUNTRY_TEMPORARILY_UNSUPPORTED}
        component={CountryTemporarilyUnsupported}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_FAQ_SCREEN}
        component={SocialMediaScreen}
        options={({ navigation }) => ({
          header: () => (
            <CustomHeader
              title={''}
              navigation={navigation}
              keyboardHeight={keyboardHeight}
            />
          ),
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.KYC_VERIFICATION_INTRO}
        component={KYCVerification}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.KYC_WEBVIEW}
        component={KYCWebView}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.NAME_ON_CARD}
        component={NameOnCard}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.CARD_CREATION}
        component={CardCreation}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.TOKEN_REWARD_EARNED}
        component={TokenRewardEarned}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
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
        name={screenTitle.FIRST_LOAD_CARD}
        component={FirstLoadCard}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.SELECT_ADDITIONAL_CARD}
        component={SelectAdditionalCardType}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.ADDITIONAL_CARD_DESCRIPTION}
        component={CardDescription}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.ENTER_REFERRAL_CODE}
        component={EnterReferralCode}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name={screenTitle.OFFERS_AND_PROMOTION}
        component={OffersAndPromotion}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <FundCardStack.Screen
        name='CardApplicationStack'
        component={CardApplicationStack}
        options={{
          headerShown: false,
        }}
      />
    </FundCardStack.Navigator>
  );
}

export function BrowserStackScreen({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) {
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
        options={{ headerShown: false }}
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

export function RewardsStackScreen() {
  return (
    <RewardsStack.Navigator initialRouteName={screenTitle.REWARDS_SCREEN}>
      <RewardsStack.Screen
        name={screenTitle.REWARDS_SCREEN}
        component={Rewards}
        options={{ headerShown: false }}
      />
      <RewardsStack.Screen
        name={screenTitle.CLAIM_REWARD}
        component={ClaimReward}
        options={{ headerShown: false }}
      />
      <RewardsStack.Screen
        name={screenTitle.REFERRALS_VIEW_ALL}
        component={ReferralsViewAll}
        options={{ headerShown: false }}
      />
      <RewardsStack.Screen
        name={screenTitle.REFERRALS}
        component={Referrals}
        options={{ headerShown: false }}
      />
      <RewardsStack.Screen
        name={screenTitle.ALL_REFERRAL_CODES}
        component={AllReferralCodes}
        options={() => ({
          headerShown: false,
        })}
      />
      <RewardsStack.Screen
        name={screenTitle.TOKEN_REWARD_EARNED}
        component={TokenRewardEarned}
        options={{ headerShown: false }}
      />
    </RewardsStack.Navigator>
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
        component={OptionsHub}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.ACTIVITIES}
        component={ActivityScreen}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.REWARDS}
        component={Rewards}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.CLAIM_REWARD}
        component={ClaimReward}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.REFERRALS_VIEW_ALL}
        component={ReferralsViewAll}
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
        name={screenTitle.ALL_REFERRAL_CODES}
        component={AllReferralCodes}
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
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.SEED_PHRASE}
        component={SeedPhrase}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.PRIVATE_KEY}
        component={PrivateKey}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.NOTIFICATION_SETTINGS}
        component={NotificationSettings}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.ADVANCED_SETTINGS}
        component={AdvancedSettings}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.CHANGE_PIN}
        component={ChangePin}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.CONFIRM_CHANGE_PIN}
        component={ConfirmPin}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.SET_CHANGE_PIN}
        component={SetPin}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.MY_ADDRESS}
        component={AddressBook}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.CREATE_CONTACT}
        component={CreateContact}
        options={{ headerShown: false }}
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
        options={{ headerShown: false }}
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

      <OptionsStack.Screen
        name={screenTitle.LEGAL_SCREEN}
        component={LegalScreen}
        options={{ headerShown: false }}
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
        name={screenTitle.WALLET_CONNECT}
        component={WalletConnectCamera}
        options={({ navigation }) => ({
          headerShown: false,
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
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.BROWSER}
        component={BrowserStackScreen}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.THEME}
        component={AppearanceSelector}
        options={{ headerShown: false }}
      />

      {/* new options route changes  */}

      <OptionsStack.Screen
        name={screenTitle.LOCKDOWN_MODE}
        component={LockdownMode}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.LOCKDOWN_MODE_AUTH}
        component={LockdownModeAuth}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.TELEGRAM_SETUP}
        component={TelegramSetup}
        options={({ navigation }) => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.TELEGRAM_PIN_SETUP}
        component={SetTelegramPin}
        options={() => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.AUTO_LOAD_SCREEN}
        component={AutoLoad}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.PREVIEW_AUTO_LOAD_SCREEN}
        component={PreviewAutoLoad}
        options={{ headerShown: false }}
      />

      <OptionsStack.Screen
        name={screenTitle.CRYPTO_WITHDRAWAL}
        component={CryptoWithdrawal}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.WITHDRAW_CONFIRMATION}
        component={WithdrawConfirmation}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.WITHDRAW_SUCCESS}
        component={WithDrawSuccess}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.WITHDRAW_HISTORY}
        component={WithdrawHistory}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />
      <OptionsStack.Screen
        name={screenTitle.MANAGE_SUBSCRIPTION}
        component={ManageSubscription}
        options={({ navigation }): NativeStackNavigationOptions => ({
          headerShown: false,
        })}
      />

      <OptionsStack.Screen
        name={screenTitle.LINK_ANOTHER_WALLET}
        component={LinkAnotherWallet}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.LINKED_WALLETS}
        component={LinkedWallets}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.LINK_WALLET_AUTH}
        component={LinkWalletAuth}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.CARD_NOTIFICATION_SETTINGS}
        component={CardNotificationSettings}
        options={{ headerShown: false }}
      />
      <OptionsStack.Screen
        name={screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN}
        component={UpdateCardContactDetails}
        options={{ headerShown: false }}
      />
    </OptionsStack.Navigator>
  );
}
