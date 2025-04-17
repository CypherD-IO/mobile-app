/* eslint-disable @typescript-eslint/no-shadow */
import { Theme } from '../../src/reducers/themeReducer';

/* eslint-disable @typescript-eslint/no-var-requires */
const S3_BUCKET_URL_ICONS = 'https://public.cypherd.io/icons';
export const CYPHER_CARD_IMAGES =
  'https://public.cypherd.io/assets/programs/common/cypher-card';
const S3_BUCKET_URL_DAPPS = 'https://public.cypherd.io/assets/dapps';

// need dm image
const EMPTY = require('./emptyImg.png');
const CYPHERD = require('./cypherD.png');
const POLYGON = require('./polygon.png');
const AVALANCHE = require('./avalanche.png');
const ARBITRUM = require('./arbitrum.png');
const OPTIMISM = require('./optimism.png');
const LOADING_IMAGE = require('./loading_animation_lottie.json');
const LOADING_SPINNER = require('./loadingSpinner.json');
const APP_LOGO = require('./appLogo.png');
const CARD = require('./card.png');
const ETHEREUM = require('./ethereum_logo.png');
const BINANCE = require('./binance_coin_bnb_logo.png');
const ADDITIONAL_CARD = require('./getNewCard.png');
// need dm image
const SENDTO_EMPTY = require('./sento_Empty.png');
const RED_COIN = require('./coinRed.png');
const GREEN_COIN = require('./coinGreen.png');
const PURPLE_COIN = require('./coinPurple.png');
const CYAN_COIN = require('./coinCyan.png');
const PINK_COIN = require('./coinPink.png');
const BLUE_COIN = require('./coinBlue.png');
const STARS_LEFT = require('./stars_left.png');
const STARS_RIGHT = require('./star_right.png');
const INSIGHT_BULB = require('./bulb.json');
const COINS = require('./coins.png');
const NEW = require('./new.json');
const GIFT_BOX_PNG = require('./giftBox.png');
const COSMOS_LOGO = require('./cosmos.png');
const OSMOSIS_LOGO = require('./osmo.png');
const COREUM_LOGO = require('./coreum.png');
const INJECTIVE_LOGO = require('./injective.png');
const BG_SETTINGS = require('./bg_settings.png');
const IBC = require('./ibc.png');
const SEND = require('./transactions_send.png');
const RECEIVE = require('./receive.png');
const QR_LOGO = require('./qr_logo.png');
const BRIDGE_GRAY = require('./bridge_gray.png');
const BRIDGE_SUCCESS = require('./bridge_success.png');
const BRIDGE_ERROR = require('./bridge_error.png');
const BRIDGE_PENDING = require('./bridge_pending.png');
const CARD_SUCCESS = require('./card_success.png');
const CARD_ERROR = require('./card_error.png');
const CARD_PENDING = require('./card_pending.png');
const SEND_SUCCESS = require('./send_success.png');
const SEND_ERROR = require('./send_error.png');
const SEND_PENDING = require('./send_pending.png');
const NETWORK_ERROR = require('./network_error.png');
const IBC_SUCCESS = require('./ibc_success.png');
const IBC_ERROR = require('./ibc_error.png');
const IBC_PENDING = require('./ibc_pending.png');
const BROWSERACTIVITY_SUCCESS = require('./browseract_success.png');
const BROWSERACTIVITY_ERROR = require('./browseract_error.png');
const BROWSERACTIVITY_PENDING = require('./browseract_pending.png');
const WALLETCONNECT_SUCCESS = require('./walletconnect_success.png');
const WALLETCONNECT_FAILED = require('./walletconnect_error.png');
const WALLETCONNECT_PENDING = require('./walletconnect_pending.png');
const IBC_GRAY = require('./ibc_label.png');
const NO_ACTIVITIES = require('./no_activites.png');
const NOBLE_LOGO = require('./noble.png');
const BRIDGE_SHORTCUT = require('./shortcutsBridge.png');
const SWAP_SHORTCUT = require('./shortcutsSwap.png');
const SEND_SHORTCUT = require('./shortcutsSend.png');
const RECEIVE_SHORTCUT = require('./shortcutsReceive.png');
const FUND_CARD_SHORTCUT = require('./shortcutsFundCard.png');
const BUY_SHORTCUT = require('./shortcutsBuy.png');
const IBC_SHORTCUT = require('./shortcutsIBC.png');
const SELL_SHORTCUT = require('./shortcutsSell.png');
const ONMETA = require('./onmeta.png');
const COINBASE = require('./coinbase.png');
const SHORTCUTS = require('./shortcuts.json');
// need dm image
const CARD_SEL = require('./card_selected.png');
const SCANNER_BG = require('./scannerBg.png');
const ALL_CHAINS = require('./allChains.png');
const DEBIT_SHOW_CARD = require('./debit_show_card.png');
const DOTS_ILLUSTRATION = require('./dots_illustration.png');
const TRANSACTION_APPROVAL = require('./transactionApproval.png');
const WALLET_PERMISSION = require('./walletPermission.png');
const ESTIMATED_TIME = require('./estimatedTime.json');
const PORTFOLIO_EMPTY = require('./portfolioEmpty.json');
const ON_BOARDING_1 = require('./onBoarding1.png');
const ON_BOARDING_2 = require('./onBoarding2.png');
const ON_BOARDING_3 = require('./onBoarding3.png');
const LOADER_TRANSPARENT = require('./loader_transparent.json');
const CROSS_PINK = require('./transactions_crossPink.png');
const DEPOSIT = require('./transactions_deposit.png');
const BROWSER_404 = require('./browser404.png');
const BROWSER_NOINTERNET = require('./browserNointernet.png');
const BROWSER_SSL = require('./browserSsl.png');
const WALLET_CONNECT_EMPTY = require('./walletConnectEmpty.png');
const CYPHER_WARNING = require('./cypher-warning.png');
const CYPHER_INFO = require('./cypher-info.png');
const CYPHER_SUCCESS = require('./cypher-success.png');
const CYPHER_ERROR = require('./cypher-error.png');
const MONEY_BAG = require('./money-bag.png');
const CYPHER_WARNING_RED = require('./CypherWarningRed.png');
const CYPHER_ENJOYING = require('./cypher-enjoying.png');
const CYPHER_LOVE = require('./cypher-love.png');
const REFER = require('./refer.png');
const CARD_KYC_BACKGROUND = require('./cardKYCBackground.png');
const DEBIT_CARD_BACKGROUND = require('./debit-card-background.png');
const LOAD_CARD_LOTTIE = require('./loadCardLottie.json');
const NO_TRANSACTIONS_YET = require('./noTransactions.png');
const NOBLE_PNG = require('./noble.png');
const APR_ICON = require('./apr.png');
const CELEBRATE = require('./celebrate.png');
const READ_ONLY_CARD_BACKGROUND = require('./readOnlyCardBackground.png');
const NFT_EMPTY_ILLUSTATION = require('./emptyNFTIllustration.png');
const DEFAULT_NFT = require('./defaultNftImage.png');
const UNLOCK_FROM_TRACKWALLET = require('./unlockFromTrackWallet.png');
const EMPTY_WALLET_CONNECT_SESSIONS = require('./emptyWalletConnectSessions.png');
const TXN_SEND_ERROR = require('./txn_send_error.png');
const TXN_RECEIVE_ERROR = require('./txn_receive_error.png');
const TXN_SWAP_ERROR = require('./txn_swap_error.png');
const TXN_DEFAULT_SUCCESS = require('./txn_default_success.png');
const TXN_DEFAULT_ERROR = require('./txn_default_error.png');
const UNKNOWN_TXN_TOKEN = require('./unknownToken.png');
const TXN_SELF_SUCCESS = require('./txn_self_success.png');
const TXN_SELF_ERROR = require('./txn_self_error.png');
const ZKSYNC_ERA_LOGO = require('./zksync_era.png');
const BASE_LOGO = require('./base.png');
const UPGRADE_TO_PHYSICAL_CARD_ARROW = require('./upgradeToPhysicalCardArrow.png');
const SEND_INVITE_CODE_BG = require('./sendInviteCodeBg.png');
const SEND_INVITE_CODE = require('./sendInviteCode.png');
const WALLET_ICONS = require('./walletIcons.png');
const VIRTUAL_TO_PHYSICAL = require('./virtualToPhysical.png');
const SOLANA_LOGO = require('./solana.png');
const CARD_ONBOARDING_1 = require('./cardOnBoarding1.png');
const CARD_ONBOARDING_2 = require('./cardOnBoarding2.png');
const CARD_ONBOARDING_3 = require('./cardOnBoarding3.png');
const CARD_ONBOARDING_4 = require('./cardOnBoarding4.png');
const ZRM_INTRO_1 = require('./zrmImage1.png');
const ZRM_INTRO_2 = require('./zrmImage2.png');
const RC_PHYSICAL_METAL = require('./cypherMetalCard.png');

// ICONS FROM S3
// const SWAP = { uri: `${S3_BUCKET_URL_ICONS}/swap.png` };
const SWAP_GRAY = { uri: `${S3_BUCKET_URL_ICONS}/swap_gray.png` };
const SWAP_SUCCESS = { uri: `${S3_BUCKET_URL_ICONS}/swap_success.png` };
const SWAP_PENDING = { uri: `${S3_BUCKET_URL_ICONS}/swap_pending.png` };
const SWAP_ERROR = { uri: `${S3_BUCKET_URL_ICONS}/swap_error.png` };
// const REFERRAL_REWARDS = { uri: `${S3_BUCKET_URL_ICONS}/referralRewards.png` };
// const CARD_BLOCKED = { uri: `${S3_BUCKET_URL_ICONS}/card-blocked.png` };
const DEFI_AIRDROP = { uri: `${S3_BUCKET_URL_ICONS}/defi_airdrop.png` };
const DEFI_DEPOSIT = { uri: `${S3_BUCKET_URL_ICONS}/defi_deposit.png` };
const DEFI_FARMING = { uri: `${S3_BUCKET_URL_ICONS}/defi_farming.png` };
const DEFI_LENDING = { uri: `${S3_BUCKET_URL_ICONS}/defi_lending.png` };
const DEFI_LEVERAGED_FARMING = {
  uri: `${S3_BUCKET_URL_ICONS}/defi_leveragedFarming.png`,
};
const DEFI_LIQUIDITY = { uri: `${S3_BUCKET_URL_ICONS}/defi_liquidity.png` };
const DEFI_LOCKED = { uri: `${S3_BUCKET_URL_ICONS}/defi_locked.png` };
const DEFI_NFT_STAKING = { uri: `${S3_BUCKET_URL_ICONS}/defi_nftStaking.png` };
const DEFI_OTHERS = { uri: `${S3_BUCKET_URL_ICONS}/defi_others.png` };
const DEFI_REWARDS = { uri: `${S3_BUCKET_URL_ICONS}/defi_rewards.png` };
const DEFI_STAKING = { uri: `${S3_BUCKET_URL_ICONS}/defi_staking.png` };
const DEFI_VESTING = { uri: `${S3_BUCKET_URL_ICONS}/defi_vesting.png` };
const DEFI_YEILD = { uri: `${S3_BUCKET_URL_ICONS}/defi_yeild.png` };
const DEFI_SUPPLY = { uri: `${S3_BUCKET_URL_ICONS}/defi_supply.png` };
const DEFI_DEBT = { uri: `${S3_BUCKET_URL_ICONS}/defi_debt.png` };
const DEFI_VALUE = { uri: `${S3_BUCKET_URL_ICONS}/defi_value.png` };
// need dm image
const PORTFOLIO_BG_S3 = {
  uri: `${S3_BUCKET_URL_ICONS}/portfolio-bg.png?${String(new Date().getDay())}`,
};
// need dm image
const NO_TRANSACTIONS = { uri: `${S3_BUCKET_URL_ICONS}/noTransactions.png` };
// const DECLINE = { uri: `${S3_BUCKET_URL_ICONS}/decline.png` };
// const PENDING = { uri: `${S3_BUCKET_URL_ICONS}/pending.png` };
// const CORRECT_WHEAT = { uri: `${S3_BUCKET_URL_ICONS}/correctWheat.png` };
const TELEGRAM_BLUE = { uri: `${S3_BUCKET_URL_ICONS}/telegram_blue.png` };
const CYPHER_TELEGRAM_BOT_LOGO = {
  uri: `${S3_BUCKET_URL_ICONS}/cypherTelegramBotLogo.png`,
};
const VIRTUAL_CARD_MASTER = {
  uri: `${S3_BUCKET_URL_ICONS}/virtualCardMaster.png`,
};
const PHYSICAL_CARD_MASTER = {
  uri: `${S3_BUCKET_URL_ICONS}/physicalCardMaster.png`,
};
// const CIRCLE_WITH_DOTS = { uri: `${S3_BUCKET_URL_ICONS}/circleWithDots.png` };
// const PERSON = { uri: `${S3_BUCKET_URL_ICONS}/person.png` };
// const WALLETS = { uri: `${S3_BUCKET_URL_ICONS}/wallets.png` };
// const NOTIFICATION_BELL = {
//   uri: `${S3_BUCKET_URL_ICONS}/notificationBell.png`,
// };
// const DOCUMENT = {
//   uri: `${S3_BUCKET_URL_ICONS}/document.png`,
// };
// const AUTOLOAD = {
//   uri: `${S3_BUCKET_URL_ICONS}/autoLoad.png`,
// };
// const COUNTRIES = {
//   uri: `${S3_BUCKET_URL_ICONS}/countries.png`,
// };
const MOBILE_WALLETS = {
  uri: `${S3_BUCKET_URL_ICONS}/mobileWallets.png`,
};
const CARD_AND_PIN_TRANSACTIONS = {
  uri: `${S3_BUCKET_URL_ICONS}/cardAndPinTransactions.png`,
};
const CONTACTLESS_TRANSACTIONS = {
  uri: `${S3_BUCKET_URL_ICONS}/contactlessTransactions.png`,
};
const ONLINE_TRANSACTIONS = {
  uri: `${S3_BUCKET_URL_ICONS}/onlineTransactions.png`,
};
const ATM_WITHDRAWALS = {
  uri: `${S3_BUCKET_URL_ICONS}/atmWithdrawals.png`,
};
const CHANGE_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/changeIcon.png`,
};
const THREE_D_SECURE = {
  uri: `${S3_BUCKET_URL_ICONS}/3DSecure.png`,
};
// const CARD_CONTROLS = {
//   uri: `${S3_BUCKET_URL_ICONS}/cardControls.png`,
// };
// const WHITE_CHECK_MARK = {
//   uri: `${S3_BUCKET_URL_ICONS}/whiteCheckMark.png`,
// };
// const GOLD_LINE_MEMBER = {
//   uri: `${S3_BUCKET_URL_ICONS}/goldLineMember.png`,
// };
const UPGRADE_CARD_TIMELINE = {
  uri: `${S3_BUCKET_URL_ICONS}/upgradeCardTimeline.png`,
};
// const BACK_ARROW_CIRCLE = {
//   uri: `${S3_BUCKET_URL_ICONS}/backArrowCircle.png`,
// };
// const QR_CODE_V2 = {
//   uri: `${S3_BUCKET_URL_ICONS}/qrScanner.png`,
// };
// const PASTE_FILL = {
//   uri: `${S3_BUCKET_URL_ICONS}/pasteFill.png`,
// };
// const AUDIT_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/auditIcon.png`,
// };
// const CANCEL_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/cancelIcon.png`,
// };
// const DOMESTIC_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/domesticIcon.png`,
// };
// const INTERNATIONAL_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/internationalIcon.png`,
// };
const RC_PHYSICAL = require('./rcPhysicalCard.png');
const RC_VIRTUAL = require('./rcVirtualCard.png');
const RC_VIRTUAL_DISABLED = require('./rcVirtualCardDisabled.png');
const RC_PHYSICAL_DISABLED = require('./rcPhysicalCardDisabled.png');
const RC_METAL_DISABLED = require('./rcMetalCardDisabled.png');
const APPLE_AND_GOOGLE_PAY = {
  uri: `${S3_BUCKET_URL_ICONS}/appleAndGoogleIcons.png`,
};
const ATM_FEE = {
  uri: `${S3_BUCKET_URL_ICONS}/atmFeeIcon.png`,
};
const CHARGE_BACK = {
  uri: `${S3_BUCKET_URL_ICONS}/chargeBackIcon.png`,
};
const CRYPTO_COINS = {
  uri: `${S3_BUCKET_URL_ICONS}/coinsIcon.png`,
};
// const CORRECT_BLACK = {
//   uri: `${S3_BUCKET_URL_ICONS}/correctBlack.png`,
// };
// const COUPON = {
//   uri: `${S3_BUCKET_URL_ICONS}/couponIcon.png`,
// };
const FOREX_FEE = {
  uri: `${S3_BUCKET_URL_ICONS}/forexFeeIcon.png`,
};

// const AT_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/atIcon.png`,
// };

// const COUNTRIES_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/countriesIcon.png`,
// };

// const PROFILE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/profileIcon.png`,
// };

// const TELEGRAM_ICON_BLACK = {
//   uri: `${S3_BUCKET_URL_ICONS}/telegramIconWhite.png`,
// };

const RADIO_CHECK = {
  uri: `${S3_BUCKET_URL_ICONS}/radioCheck.png`,
};

const RADIO_UNCHECK = {
  uri: `${S3_BUCKET_URL_ICONS}/radioUncheck.png`,
};
const RC_PLAIN_VIRTUAL_CARD = {
  uri: `${S3_BUCKET_URL_ICONS}/rcPlainVirtualCard.png`,
};
const REWARDS_YELLOW_STAR = {
  uri: `${S3_BUCKET_URL_ICONS}/rewardsYellowStar.png`,
};
const CARDS_AND_COINS = {
  uri: `${S3_BUCKET_URL_ICONS}/cardsAndCoins.png`,
};
const MAN_WITH_PHONE = {
  uri: `${S3_BUCKET_URL_ICONS}/manWithPhone.png`,
};
const COMING_SOON = {
  uri: `${S3_BUCKET_URL_ICONS}/comingSoon.png`,
};
// const ZERO_RESTRICTION_MODE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/zeroRestrictionModeIcon.png`,
// };
const MIGRATE_FUNDS_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/migrateFundsICon.png`,
};
// const CLOCK_OUTLINE = {
//   uri: `${S3_BUCKET_URL_ICONS}/clockOutline.png`,
// };
// const PLUS_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/plusIcon.png`,
// };
const SUCCESS_TICK_GREEN_BG = {
  uri: `${S3_BUCKET_URL_ICONS}/successTickGreenBg.png`,
};
const REFERRALS_HERO_IMG = {
  uri: `${S3_BUCKET_URL_ICONS}/referralsHeroImg.png`,
};
// const CIRCULAR_PLUS = {
//   uri: `${S3_BUCKET_URL_ICONS}/circularPlus.png`,
// };
const QR_CODE_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/qrIcon.png`,
};
const WHATSAPP_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/whatsappIcon.png`,
};
const TELEGRAM_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/telegramIcon.png`,
};
const X_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/xIcon.png`,
};
const SHARE_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/shareIcon.png`,
};
const REFERRAL_STAR = {
  uri: `${S3_BUCKET_URL_ICONS}/referralStar.png`,
};
const HOW_IT_WORKS_1 = {
  uri: `${S3_BUCKET_URL_ICONS}/howItWorks1.png`,
};
const HOW_IT_WORKS_2 = {
  uri: `${S3_BUCKET_URL_ICONS}/howItWorks2.png`,
};
const HOW_IT_WORKS_3 = {
  uri: `${S3_BUCKET_URL_ICONS}/howItWorks3.png`,
};
const HOW_IT_WORKS_4 = {
  uri: `${S3_BUCKET_URL_ICONS}/howItWorks4.png`,
};
const HOW_IT_WORKS_5 = {
  uri: `${S3_BUCKET_URL_ICONS}/howItWorks5.png`,
};
// const BLACK_CLOSE = {
//   uri: `${S3_BUCKET_URL_ICONS}/blackClose.png`,
// };
const GIFT_IN_HANDS = {
  uri: `${S3_BUCKET_URL_ICONS}/giftInHands.png`,
};
const VISA_CARDS_GROUP = {
  uri: `${S3_BUCKET_URL_ICONS}/visaCardsGroup.png`,
};
// const USER_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/userOutlineIcon.png`,
// };
// const HOUSE_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/houseOutlineIcon.png`,
// };
// const EMAIL_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/emailOutlineIcon.png`,
// };
// const TELEGRAM_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/telegramOutlineIcon.png`,
// };
// const ID_CARD_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/idCardOutlineIcon.png`,
// };
// const GLOBE_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/globeOutlineIcon.png`,
// };
// const CASH_OUTLINE_ICON = {
//   uri: `${S3_BUCKET_URL_ICONS}/cashOutlineIcon.png`,
// };
const TELEGRAM_BLUE_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/telegramBlueIcon.png`,
};
const MIGRATION_BANNER_BG = {
  uri: `${S3_BUCKET_URL_ICONS}/migrateBannerBg.png`,
};
const MIGRATION_PENDING = {
  uri: `${S3_BUCKET_URL_ICONS}/migrationPending.png`,
};
const MIGRATION_PENDING_GIF = {
  uri: `${S3_BUCKET_URL_ICONS}/migrationPendingGif.gif`,
};
const MIGRATION_SUCCESS = {
  uri: `${S3_BUCKET_URL_ICONS}/migrationSuccess.png`,
};
const PREMIUM_TEXT_GRADIENT = {
  uri: `${S3_BUCKET_URL_ICONS}/premiumGradient.png`,
};
const WITHDRAW_CRYPTO_SUCCESS = {
  uri: `${S3_BUCKET_URL_ICONS}/withdrawCryptoSuccess.png`,
};
const FLYING_MONEY = {
  uri: `${S3_BUCKET_URL_ICONS}/flyingMoney.png`,
};
const USDC_TOKEN = {
  uri: `${S3_BUCKET_URL_ICONS}/usdc.png`,
};
const CARD_SHIPMENT_ENVELOPE = {
  uri: `${S3_BUCKET_URL_ICONS}/cardShipmentEnvelope.png`,
};
const REPLACE_VIRTUAL_CARD = {
  uri: `${S3_BUCKET_URL_ICONS}/replaceVirtualCard.png`,
};

const MULTIPLE_CARDS = {
  uri: `${S3_BUCKET_URL_ICONS}/multipleCards.png`,
};
const PREMIUM_LABEL = {
  uri: `${S3_BUCKET_URL_ICONS}/premiumLabel.png`,
};
const KYC_VERIFICATION_PENDING = {
  uri: `${S3_BUCKET_URL_ICONS}/kycVerificationPending.png`,
};
const KYC_VERIFICATION_FAILED = {
  uri: `${S3_BUCKET_URL_ICONS}/kycVerificationFailed.png`,
};
const KYC_VERIFICATION_DELAYED = {
  uri: `${S3_BUCKET_URL_ICONS}/kycVerificationDelayed.png`,
};
const VERIFIED_BY_VISA_WHITE = {
  uri: `${S3_BUCKET_URL_ICONS}/verifiedByVisaWhite.png`,
};
const CONNENCT_DISCORD_HERO = {
  uri: `${S3_BUCKET_URL_ICONS}/connectDiscordHero.png`,
};
const ERROR_EXCLAMATION_RED_BG_ROUNDED = {
  uri: `${S3_BUCKET_URL_ICONS}/errorExclamationRedBgRounded.png`,
};
const SUCCESS_TICK_GREEN_BG_ROUNDED = {
  uri: `${S3_BUCKET_URL_ICONS}/successTickGreenBgRounded.png`,
};
const SUCCESS_TICK_GRAY_BG_ROUNDED = {
  uri: `${S3_BUCKET_URL_ICONS}/successTickGrayBgRounded.png`,
};
const SHIELD_3D = {
  uri: `${S3_BUCKET_URL_ICONS}/3DShield.png`,
};
const CARDS_FRONT_AND_BACK_3D = {
  uri: `${S3_BUCKET_URL_ICONS}/cardsFrontAndBack3D.png`,
};
const CASH_FLOW = {
  uri: `${S3_BUCKET_URL_ICONS}/cashFllow.png`,
};
const MOBILE_AND_COINS_3D = {
  uri: `${S3_BUCKET_URL_ICONS}/mobileAndCoins3D.png`,
};
const POST_CARD = {
  uri: `${S3_BUCKET_URL_ICONS}/postCard.png`,
};
const SHOPPING_WOMEN = {
  uri: `${S3_BUCKET_URL_ICONS}/shoppingWome.png`,
};
// want icon
const GREY_EXCLAMATION_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/greyExclamationIcon.png`,
};
// want icon
const DEBIT_TRANSACTION_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/creditTransactionIcon.png`,
};
// want icon
const CREDIT_TRANSACTION_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/debitTransactionIcon.png`,
};
// want icon
const GRAY_CIRCULAR_CROSS = {
  uri: `${S3_BUCKET_URL_ICONS}/grayCircularCross.png`,
};
// want icon
const PENDING_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/pendingGray.png`,
};
// want icon
const APPLE_LOGO_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/appleLogoGray.png`,
};
// want icon
const GOOGLE_LOGO_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/googleLogoGray.png`,
};
// want icon
const POS_ICON_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/posIconGray.png`,
};
// want icon
const WIRELESS_ICON_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/wirelessIconGray.png`,
};
// want icon
const ECOMMERCE_ICON_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/ecommerceIconGray.png`,
};
// want icon
const ATM_ICON_GRAY = {
  uri: `${S3_BUCKET_URL_ICONS}/atmIconGray.png`,
};
const UNBLOCK_CARD_QUICK_ACTION = {
  uri: `${S3_BUCKET_URL_DAPPS}/unblockCardQuickAction.png`,
};
const ACTIVATE_CARD_QUICK_ACTION = {
  uri: `${S3_BUCKET_URL_DAPPS}/activateCardQuickAction.png`,
};
const INTERNATIONAL_COUNTRIES_QUICK_ACTION = {
  uri: `${S3_BUCKET_URL_DAPPS}/intCountriesQuickAction.png`,
};
const METAL_CARDS_STACK = {
  uri: `${S3_BUCKET_URL_ICONS}/metalCardStack.png`,
};
// want icon
const FREEZE_ICON_BLACK = {
  uri: `${S3_BUCKET_URL_ICONS}/freezeIconBlack.png`,
};
// want icon
const UNFREEZE_ICON_BLACK = {
  uri: `${S3_BUCKET_URL_ICONS}/unfreezeIconBlack.png`,
};
const GET_PHYSICAL_CARD = {
  uri: `${S3_BUCKET_URL_ICONS}/getPhysicalCard.svg`,
};
const VISA_LOGO_GREY = {
  uri: `${S3_BUCKET_URL_ICONS}/visaLogoGrey.png`,
};
const SPEND_CONTROL_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/spendControlIcon.png`,
};
const ONLINE_TRANSACTIONS_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/onlineTransactionIcon.png`,
};
const TAP_AND_PAY_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/tapAndPayIcon.png`,
};
const ATM_WITHDRAWAL_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/atmWithdrawalIcon.png`,
};
const MERCHANT_OUTLET_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/merchantOutlet.png`,
};
const MOBILE_WALLETS_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/mobileWalletIcon.png`,
};
const SELECT_COUNTRIES_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/selectCountriesIcon.png`,
};
const AUTHENTICATION_METHOD_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/authenticationMethodIcon.png`,
};
const CARD_PIN_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/cardPinIcon.png`,
};
const BLUE_EDIT_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/blueEditIcon.png`,
};
const WHITE_SHIELD_ICON = {
  uri: `${S3_BUCKET_URL_ICONS}/whiteShieldIcon.png`,
};
const HYPERLIQUID_LOGO = {
  uri: `${S3_BUCKET_URL_ICONS}/hyperLiquidLogo.png`,
};
const HYPERLIQUID_LOGO_TEXT = {
  uri: `${S3_BUCKET_URL_ICONS}/hyperLiquidLogoText.png`,
};

export const AppImagesMap = {
  common: {
    INTERNATIONAL_COUNTRIES_QUICK_ACTION,
    UNBLOCK_CARD_QUICK_ACTION,
    ACTIVATE_CARD_QUICK_ACTION,
    SUCCESS_TICK_GREEN_BG_ROUNDED,
    SUCCESS_TICK_GRAY_BG_ROUNDED,
    ERROR_EXCLAMATION_RED_BG_ROUNDED,
    SHIELD_3D,
    CARDS_FRONT_AND_BACK_3D,
    CASH_FLOW,
    MOBILE_AND_COINS_3D,
    POST_CARD,
    SHOPPING_WOMEN,
    ZRM_INTRO_1,
    ZRM_INTRO_2,
    KYC_VERIFICATION_FAILED,
    KYC_VERIFICATION_DELAYED,
    KYC_VERIFICATION_PENDING,
    USDC_TOKEN,
    FLYING_MONEY,
    WITHDRAW_CRYPTO_SUCCESS,
    PREMIUM_TEXT_GRADIENT,
    MIGRATION_PENDING_GIF,
    MIGRATION_SUCCESS,
    MIGRATION_PENDING,
    MIGRATION_BANNER_BG,
    SUCCESS_TICK_GREEN_BG,
    MIGRATE_FUNDS_ICON,
    CARD_ONBOARDING_1,
    CARD_ONBOARDING_2,
    CARD_ONBOARDING_3,
    CARD_ONBOARDING_4,
    RADIO_UNCHECK,
    RADIO_CHECK,
    APPLE_AND_GOOGLE_PAY,
    ATM_FEE,
    FOREX_FEE,
    CHARGE_BACK,
    CRYPTO_COINS,
    CYPHER_TELEGRAM_BOT_LOGO,
    EMPTY,
    CYPHERD,
    PORTFOLIO_BG_S3,
    POLYGON,
    AVALANCHE,
    ARBITRUM,
    OPTIMISM,
    LOADING_IMAGE,
    APP_LOGO,
    CARD,
    ETHEREUM,
    BINANCE,
    SENDTO_EMPTY,
    BLUE_COIN,
    RED_COIN,
    PURPLE_COIN,
    CYAN_COIN,
    GREEN_COIN,
    PINK_COIN,
    STARS_LEFT,
    STARS_RIGHT,
    INSIGHT_BULB,
    LOADING_SPINNER,
    COINS,
    NEW,
    GIFT_BOX_PNG,
    COSMOS_LOGO,
    OSMOSIS_LOGO,
    BG_SETTINGS,
    BRIDGE_GRAY,
    SEND,
    IBC,
    RECEIVE,
    QR_LOGO,
    NETWORK_ERROR,
    IBC_GRAY,
    NO_ACTIVITIES,
    BRIDGE_SUCCESS,
    BRIDGE_ERROR,
    BRIDGE_PENDING,
    CARD_SUCCESS,
    CARD_ERROR,
    CARD_PENDING,
    SEND_SUCCESS,
    SEND_ERROR,
    SEND_PENDING,
    IBC_SUCCESS,
    IBC_ERROR,
    IBC_PENDING,
    WALLETCONNECT_SUCCESS,
    WALLETCONNECT_PENDING,
    WALLETCONNECT_FAILED,
    BRIDGE_SHORTCUT,
    SWAP_SHORTCUT,
    SEND_SHORTCUT,
    RECEIVE_SHORTCUT,
    FUND_CARD_SHORTCUT,
    BUY_SHORTCUT,
    IBC_SHORTCUT,
    SELL_SHORTCUT,
    COINBASE,
    ONMETA,
    SHORTCUTS,
    CARD_SEL,
    NOBLE_LOGO,
    BROWSERACTIVITY_SUCCESS,
    BROWSERACTIVITY_PENDING,
    BROWSERACTIVITY_ERROR,
    SCANNER_BG,
    ALL_CHAINS,
    DEBIT_SHOW_CARD,
    DOTS_ILLUSTRATION,
    TRANSACTION_APPROVAL,
    WALLET_PERMISSION,
    ESTIMATED_TIME,
    PORTFOLIO_EMPTY,
    ON_BOARDING_1,
    ON_BOARDING_2,
    ON_BOARDING_3,
    LOADER_TRANSPARENT,
    CROSS_PINK,
    DEPOSIT,
    BROWSER_404,
    BROWSER_NOINTERNET,
    BROWSER_SSL,
    WALLET_CONNECT_EMPTY,
    CYPHER_WARNING,
    CYPHER_INFO,
    CYPHER_SUCCESS,
    CYPHER_ERROR,
    MONEY_BAG,
    CYPHER_ENJOYING,
    CYPHER_LOVE,
    REFER,
    CARD_KYC_BACKGROUND,
    DEBIT_CARD_BACKGROUND,
    LOAD_CARD_LOTTIE,
    NO_TRANSACTIONS_YET,
    NOBLE_PNG,
    APR_ICON,
    CELEBRATE,
    READ_ONLY_CARD_BACKGROUND,
    NFT_EMPTY_ILLUSTATION,
    DEFAULT_NFT,
    UNLOCK_FROM_TRACKWALLET,
    CYPHER_WARNING_RED,
    EMPTY_WALLET_CONNECT_SESSIONS,
    SWAP_GRAY,
    SWAP_SUCCESS,
    SWAP_PENDING,
    SWAP_ERROR,
    ZKSYNC_ERA_LOGO,
    BASE_LOGO,
    NO_TRANSACTIONS,
    TXN_SEND_ERROR,
    TXN_RECEIVE_ERROR,
    TXN_SWAP_ERROR,
    TXN_DEFAULT_SUCCESS,
    TXN_DEFAULT_ERROR,
    UNKNOWN_TXN_TOKEN,
    TXN_SELF_SUCCESS,
    TXN_SELF_ERROR,
    DEFI_AIRDROP,
    DEFI_DEPOSIT,
    DEFI_FARMING,
    DEFI_LENDING,
    DEFI_LEVERAGED_FARMING,
    DEFI_LIQUIDITY,
    DEFI_LOCKED,
    DEFI_NFT_STAKING,
    DEFI_OTHERS,
    DEFI_REWARDS,
    DEFI_STAKING,
    DEFI_VESTING,
    DEFI_YEILD,
    DEFI_SUPPLY,
    DEFI_DEBT,
    DEFI_VALUE,
    UPGRADE_TO_PHYSICAL_CARD_ARROW,
    SEND_INVITE_CODE_BG,
    SEND_INVITE_CODE,
    WALLET_ICONS,
    VIRTUAL_TO_PHYSICAL,
    TELEGRAM_BLUE,
    COREUM_LOGO,
    INJECTIVE_LOGO,
    VIRTUAL_CARD_MASTER,
    PHYSICAL_CARD_MASTER,
    SOLANA_LOGO,
    MOBILE_WALLETS,
    CARD_AND_PIN_TRANSACTIONS,
    CONTACTLESS_TRANSACTIONS,
    ONLINE_TRANSACTIONS,
    ATM_WITHDRAWALS,
    CHANGE_ICON,
    THREE_D_SECURE,
    UPGRADE_CARD_TIMELINE,
    RC_PHYSICAL,
    RC_VIRTUAL,
    RC_VIRTUAL_DISABLED,
    RC_PLAIN_VIRTUAL_CARD,
    REWARDS_YELLOW_STAR,
    CARDS_AND_COINS,
    MAN_WITH_PHONE,
    COMING_SOON,
    REFERRALS_HERO_IMG,
    QR_CODE_ICON,
    WHATSAPP_ICON,
    TELEGRAM_ICON,
    X_ICON,
    SHARE_ICON,
    REFERRAL_STAR,
    HOW_IT_WORKS_1,
    HOW_IT_WORKS_2,
    HOW_IT_WORKS_3,
    HOW_IT_WORKS_4,
    HOW_IT_WORKS_5,
    GIFT_IN_HANDS,
    VISA_CARDS_GROUP,
    TELEGRAM_BLUE_ICON,
    CARD_SHIPMENT_ENVELOPE,
    REPLACE_VIRTUAL_CARD,
    MULTIPLE_CARDS,
    PREMIUM_LABEL,
    RC_PHYSICAL_METAL,
    VERIFIED_BY_VISA_WHITE,
    CONNENCT_DISCORD_HERO,
    GREY_EXCLAMATION_ICON,
    DEBIT_TRANSACTION_ICON,
    CREDIT_TRANSACTION_ICON,
    GRAY_CIRCULAR_CROSS,
    PENDING_GRAY,
    APPLE_LOGO_GRAY,
    GOOGLE_LOGO_GRAY,
    POS_ICON_GRAY,
    WIRELESS_ICON_GRAY,
    ECOMMERCE_ICON_GRAY,
    ATM_ICON_GRAY,
    METAL_CARDS_STACK,
    FREEZE_ICON_BLACK,
    UNFREEZE_ICON_BLACK,
    RC_PHYSICAL_DISABLED,
    RC_METAL_DISABLED,
    GET_PHYSICAL_CARD,
    VISA_LOGO_GREY,
    ADDITIONAL_CARD,
    SPEND_CONTROL_ICON,
    ONLINE_TRANSACTIONS_ICON,
    TAP_AND_PAY_ICON,
    ATM_WITHDRAWAL_ICON,
    MERCHANT_OUTLET_ICON,
    MOBILE_WALLETS_ICON,
    SELECT_COUNTRIES_ICON,
    AUTHENTICATION_METHOD_ICON,
    CARD_PIN_ICON,
    BLUE_EDIT_ICON,
    WHITE_SHIELD_ICON,
    HYPERLIQUID_LOGO,
    HYPERLIQUID_LOGO_TEXT,
  },
  [Theme.LIGHT]: {},
  [Theme.DARK]: {},
};

enum AppImages {
  ADDITIONAL_CARD = 'ADDITIONAL_CARD',
  INTERNATIONAL_COUNTRIES_QUICK_ACTION = 'INTERNATIONAL_COUNTRIES_QUICK_ACTION',
  UNBLOCK_CARD_QUICK_ACTION = 'UNBLOCK_CARD_QUICK_ACTION',
  ACTIVATE_CARD_QUICK_ACTION = 'ACTIVATE_CARD_QUICK_ACTION',
  SUCCESS_TICK_GREEN_BG_ROUNDED = 'SUCCESS_TICK_GREEN_BG_ROUNDED',
  SUCCESS_TICK_GRAY_BG_ROUNDED = 'SUCCESS_TICK_GRAY_BG_ROUNDED',
  ERROR_EXCLAMATION_RED_BG_ROUNDED = 'ERROR_EXCLAMATION_RED_BG_ROUNDED',
  SHIELD_3D = 'SHIELD_3D',
  CARDS_FRONT_AND_BACK_3D = 'CARDS_FRONT_AND_BACK_3D',
  CASH_FLOW = 'CASH_FLOW',
  MOBILE_AND_COINS_3D = 'MOBILE_AND_COINS_3D',
  POST_CARD = 'POST_CARD',
  SHOPPING_WOMEN = 'SHOPPING_WOMEN',
  ZRM_INTRO_1 = 'ZRM_INTRO_1',
  ZRM_INTRO_2 = 'ZRM_INTRO_2',
  KYC_VERIFICATION_FAILED = 'KYC_VERIFICATION_FAILED',
  KYC_VERIFICATION_DELAYED = 'KYC_VERIFICATION_DELAYED',
  KYC_VERIFICATION_PENDING = 'KYC_VERIFICATION_PENDING',
  USDC_TOKEN = 'USDC_TOKEN',
  FLYING_MONEY = 'FLYING_MONEY',
  WITHDRAW_CRYPTO_SUCCESS = 'WITHDRAW_CRYPTO_SUCCESS',
  PREMIUM_TEXT_GRADIENT = 'PREMIUM_TEXT_GRADIENT',
  MIGRATION_PENDING_GIF = 'MIGRATION_PENDING_GIF',
  MIGRATION_SUCCESS = 'MIGRATION_SUCCESS',
  MIGRATION_PENDING = 'MIGRATION_PENDING',
  MIGRATION_BANNER_BG = 'MIGRATION_BANNER_BG',
  SUCCESS_TICK_GREEN_BG = 'SUCCESS_TICK_GREEN_BG',
  MIGRATE_FUNDS_ICON = 'MIGRATE_FUNDS_ICON',
  CARD_ONBOARDING_1 = 'CARD_ONBOARDING_1',
  CARD_ONBOARDING_2 = 'CARD_ONBOARDING_2',
  CARD_ONBOARDING_3 = 'CARD_ONBOARDING_3',
  CARD_ONBOARDING_4 = 'CARD_ONBOARDING_4',
  RADIO_UNCHECK = 'RADIO_UNCHECK',
  RADIO_CHECK = 'RADIO_CHECK',
  APPLE_AND_GOOGLE_PAY = 'APPLE_AND_GOOGLE_PAY',
  ATM_FEE = 'ATM_FEE',
  FOREX_FEE = 'FOREX_FEE',
  CHARGE_BACK = 'CHARGE_BACK',
  CRYPTO_COINS = 'CRYPTO_COINS',
  CYPHER_TELEGRAM_BOT_LOGO = 'CYPHER_TELEGRAM_BOT_LOGO',
  EMPTY = 'EMPTY',
  CYPHERD = 'CYPHERD',
  PORTFOLIO_BG_S3 = 'PORTFOLIO_BG_S3',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  LOADING_IMAGE = 'LOADING_IMAGE',
  APP_LOGO = 'APP_LOGO',
  CARD = 'CARD',
  ETHEREUM = 'ETHEREUM',
  BINANCE = 'BINANCE',
  SENDTO_EMPTY = 'SENDTO_EMPTY',
  BLUE_COIN = 'BLUE_COIN',
  RED_COIN = 'RED_COIN',
  PURPLE_COIN = 'PURPLE_COIN',
  CYAN_COIN = 'CYAN_COIN',
  GREEN_COIN = 'GREEN_COIN',
  PINK_COIN = 'PINK_COIN',
  STARS_LEFT = 'STARS_LEFT',
  STARS_RIGHT = 'STARS_RIGHT',
  INSIGHT_BULB = 'INSIGHT_BULB',
  LOADING_SPINNER = 'LOADING_SPINNER',
  COINS = 'COINS',
  NEW = 'NEW',
  GIFT_BOX_PNG = 'GIFT_BOX_PNG',
  COSMOS_LOGO = 'COSMOS_LOGO',
  OSMOSIS_LOGO = 'OSMOSIS_LOGO',
  BG_SETTINGS = 'BG_SETTINGS',
  BRIDGE_GRAY = 'BRIDGE_GRAY',
  SEND = 'SEND',
  IBC = 'IBC',
  RECEIVE = 'RECEIVE',
  QR_LOGO = 'QR_LOGO',
  NETWORK_ERROR = 'NETWORK_ERROR',
  IBC_GRAY = 'IBC_GRAY',
  NO_ACTIVITIES = 'NO_ACTIVITIES',
  BRIDGE_SUCCESS = 'BRIDGE_SUCCESS',
  BRIDGE_ERROR = 'BRIDGE_ERROR',
  BRIDGE_PENDING = 'BRIDGE_PENDING',
  CARD_SUCCESS = 'CARD_SUCCESS',
  CARD_ERROR = 'CARD_ERROR',
  CARD_PENDING = 'CARD_PENDING',
  SEND_SUCCESS = 'SEND_SUCCESS',
  SEND_ERROR = 'SEND_ERROR',
  SEND_PENDING = 'SEND_PENDING',
  IBC_SUCCESS = 'IBC_SUCCESS',
  IBC_ERROR = 'IBC_ERROR',
  IBC_PENDING = 'IBC_PENDING',
  WALLETCONNECT_SUCCESS = 'WALLETCONNECT_SUCCESS',
  WALLETCONNECT_PENDING = 'WALLETCONNECT_PENDING',
  WALLETCONNECT_FAILED = 'WALLETCONNECT_FAILED',
  BRIDGE_SHORTCUT = 'BRIDGE_SHORTCUT',
  SWAP_SHORTCUT = 'SWAP_SHORTCUT',
  SEND_SHORTCUT = 'SEND_SHORTCUT',
  RECEIVE_SHORTCUT = 'RECEIVE_SHORTCUT',
  FUND_CARD_SHORTCUT = 'FUND_CARD_SHORTCUT',
  BUY_SHORTCUT = 'BUY_SHORTCUT',
  IBC_SHORTCUT = 'IBC_SHORTCUT',
  SELL_SHORTCUT = 'SELL_SHORTCUT',
  COINBASE = 'COINBASE',
  ONMETA = 'ONMETA',
  SHORTCUTS = 'SHORTCUTS',
  CARD_SEL = 'CARD_SEL',
  NOBLE_LOGO = 'NOBLE_LOGO',
  BROWSERACTIVITY_SUCCESS = 'BROWSERACTIVITY_SUCCESS',
  BROWSERACTIVITY_PENDING = 'BROWSERACTIVITY_PENDING',
  BROWSERACTIVITY_ERROR = 'BROWSERACTIVITY_ERROR',
  SCANNER_BG = 'SCANNER_BG',
  ALL_CHAINS = 'ALL_CHAINS',
  DEBIT_SHOW_CARD = 'DEBIT_SHOW_CARD',
  DOTS_ILLUSTRATION = 'DOTS_ILLUSTRATION',
  TRANSACTION_APPROVAL = 'TRANSACTION_APPROVAL',
  WALLET_PERMISSION = 'WALLET_PERMISSION',
  ESTIMATED_TIME = 'ESTIMATED_TIME',
  PORTFOLIO_EMPTY = 'PORTFOLIO_EMPTY',
  ON_BOARDING_1 = 'ON_BOARDING_1',
  ON_BOARDING_2 = 'ON_BOARDING_2',
  ON_BOARDING_3 = 'ON_BOARDING_3',
  LOADER_TRANSPARENT = 'LOADER_TRANSPARENT',
  CROSS_PINK = 'CROSS_PINK',
  DEPOSIT = 'DEPOSIT',
  BROWSER_404 = 'BROWSER_404',
  BROWSER_NOINTERNET = 'BROWSER_NOINTERNET',
  BROWSER_SSL = 'BROWSER_SSL',
  WALLET_CONNECT_EMPTY = 'WALLET_CONNECT_EMPTY',
  CYPHER_WARNING = 'CYPHER_WARNING',
  CYPHER_INFO = 'CYPHER_INFO',
  CYPHER_SUCCESS = 'CYPHER_SUCCESS',
  CYPHER_ERROR = 'CYPHER_ERROR',
  MONEY_BAG = 'MONEY_BAG',
  INFO_CIRCLE = 'INFO_CIRCLE',
  CYPHER_ENJOYING = 'CYPHER_ENJOYING',
  CYPHER_LOVE = 'CYPHER_LOVE',
  REFER = 'REFER',
  CARD_KYC_BACKGROUND = 'CARD_KYC_BACKGROUND',
  DEBIT_CARD_BACKGROUND = 'DEBIT_CARD_BACKGROUND',
  LOAD_CARD_LOTTIE = 'LOAD_CARD_LOTTIE',
  NO_TRANSACTIONS_YET = 'NO_TRANSACTIONS_YET',
  NOBLE_PNG = 'NOBLE_PNG',
  APR_ICON = 'APR_ICON',
  CELEBRATE = 'CELEBRATE',
  READ_ONLY_CARD_BACKGROUND = 'READ_ONLY_CARD_BACKGROUND',
  NFT_EMPTY_ILLUSTATION = 'NFT_EMPTY_ILLUSTATION',
  DEFAULT_NFT = 'DEFAULT_NFT',
  UNLOCK_FROM_TRACKWALLET = 'UNLOCK_FROM_TRACKWALLET',
  CYPHER_WARNING_RED = 'CYPHER_WARNING_RED',
  EMPTY_WALLET_CONNECT_SESSIONS = 'EMPTY_WALLET_CONNECT_SESSIONS',
  SWAP_GRAY = 'SWAP_GRAY',
  SWAP_SUCCESS = 'SWAP_SUCCESS',
  SWAP_PENDING = 'SWAP_PENDING',
  SWAP_ERROR = 'SWAP_ERROR',
  ZKSYNC_ERA_LOGO = 'ZKSYNC_ERA_LOGO',
  BASE_LOGO = 'BASE_LOGO',
  NO_TRANSACTIONS = 'NO_TRANSACTIONS',
  TXN_SEND_ERROR = 'TXN_SEND_ERROR',
  TXN_RECEIVE_ERROR = 'TXN_RECEIVE_ERROR',
  TXN_SWAP_ERROR = 'TXN_SWAP_ERROR',
  TXN_DEFAULT_SUCCESS = 'TXN_DEFAULT_SUCCESS',
  TXN_DEFAULT_ERROR = 'TXN_DEFAULT_ERROR',
  UNKNOWN_TXN_TOKEN = 'UNKNOWN_TXN_TOKEN',
  TXN_SELF_SUCCESS = 'TXN_SELF_SUCCESS',
  TXN_SELF_ERROR = 'TXN_SELF_ERROR',
  DEFI_AIRDROP = 'DEFI_AIRDROP',
  DEFI_DEPOSIT = 'DEFI_DEPOSIT',
  DEFI_FARMING = 'DEFI_FARMING',
  DEFI_LENDING = 'DEFI_LENDING',
  DEFI_LEVERAGED_FARMING = 'DEFI_LEVERAGED_FARMING',
  DEFI_LIQUIDITY = 'DEFI_LIQUIDITY',
  DEFI_LOCKED = 'DEFI_LOCKED',
  DEFI_NFT_STAKING = 'DEFI_NFT_STAKING',
  DEFI_OTHERS = 'DEFI_OTHERS',
  DEFI_REWARDS = 'DEFI_REWARDS',
  DEFI_STAKING = 'DEFI_STAKING',
  DEFI_VESTING = 'DEFI_VESTING',
  DEFI_YEILD = 'DEFI_YEILD',
  DEFI_SUPPLY = 'DEFI_SUPPLY',
  DEFI_DEBT = 'DEFI_DEBT',
  DEFI_VALUE = 'DEFI_VALUE',
  UPGRADE_TO_PHYSICAL_CARD_ARROW = 'UPGRADE_TO_PHYSICAL_CARD_ARROW',
  SEND_INVITE_CODE_BG = 'SEND_INVITE_CODE_BG',
  SEND_INVITE_CODE = 'SEND_INVITE_CODE',
  WALLET_ICONS = 'WALLET_ICONS',
  VIRTUAL_TO_PHYSICAL = 'VIRTUAL_TO_PHYSICAL',
  TELEGRAM_BLUE = 'TELEGRAM_BLUE',
  COREUM_LOGO = 'COREUM_LOGO',
  INJECTIVE_LOGO = 'INJECTIVE_LOGO',
  VIRTUAL_CARD_MASTER = 'VIRTUAL_CARD_MASTER',
  PHYSICAL_CARD_MASTER = 'PHYSICAL_CARD_MASTER',
  SOLANA_LOGO = 'SOLANA_LOGO',
  MOBILE_WALLETS = 'MOBILE_WALLETS',
  CARD_AND_PIN_TRANSACTIONS = 'CARD_AND_PIN_TRANSACTIONS',
  CONTACTLESS_TRANSACTIONS = 'CONTACTLESS_TRANSACTIONS',
  ONLINE_TRANSACTIONS = 'ONLINE_TRANSACTIONS',
  ATM_WITHDRAWALS = 'ATM_WITHDRAWALS',
  CHANGE_ICON = 'CHANGE_ICON',
  THREE_D_SECURE = 'THREE_D_SECURE',
  UPGRADE_CARD_TIMELINE = 'UPGRADE_CARD_TIMELINE',
  RC_PHYSICAL = 'RC_PHYSICAL',
  RC_VIRTUAL = 'RC_VIRTUAL',
  RC_VIRTUAL_DISABLED = 'RC_VIRTUAL_DISABLED',
  RC_PHYSICAL_DISABLED = 'RC_PHYSICAL_DISABLED',
  RC_METAL_DISABLED = 'RC_METAL_DISABLED',
  RC_PLAIN_VIRTUAL_CARD = 'RC_PLAIN_VIRTUAL_CARD',
  REWARDS_YELLOW_STAR = 'REWARDS_YELLOW_STAR',
  CARDS_AND_COINS = 'CARDS_AND_COINS',
  MAN_WITH_PHONE = 'MAN_WITH_PHONE',
  COMING_SOON = 'COMING_SOON',
  REFERRALS_HERO_IMG = 'REFERRALS_HERO_IMG',
  QR_CODE_ICON = 'QR_CODE_ICON',
  WHATSAPP_ICON = 'WHATSAPP_ICON',
  TELEGRAM_ICON = 'TELEGRAM_ICON',
  X_ICON = 'X_ICON',
  SHARE_ICON = 'SHARE_ICON',
  REFERRAL_STAR = 'REFERRAL_STAR',
  HOW_IT_WORKS_1 = 'HOW_IT_WORKS_1',
  HOW_IT_WORKS_2 = 'HOW_IT_WORKS_2',
  HOW_IT_WORKS_3 = 'HOW_IT_WORKS_3',
  HOW_IT_WORKS_4 = 'HOW_IT_WORKS_4',
  HOW_IT_WORKS_5 = 'HOW_IT_WORKS_5',
  GIFT_IN_HANDS = 'GIFT_IN_HANDS',
  VISA_CARDS_GROUP = 'VISA_CARDS_GROUP',
  TELEGRAM_BLUE_ICON = 'TELEGRAM_BLUE_ICON',
  CARD_SHIPMENT_ENVELOPE = 'CARD_SHIPMENT_ENVELOPE',
  REPLACE_VIRTUAL_CARD = 'REPLACE_VIRTUAL_CARD',
  MULTIPLE_CARDS = 'MULTIPLE_CARDS',
  PREMIUM_LABEL = 'PREMIUM_LABEL',
  RC_PHYSICAL_METAL = 'RC_PHYSICAL_METAL',
  VERIFIED_BY_VISA_WHITE = 'VERIFIED_BY_VISA_WHITE',
  CONNENCT_DISCORD_HERO = 'CONNENCT_DISCORD_HERO',
  GREY_EXCLAMATION_ICON = 'GREY_EXCLAMATION_ICON',
  DEBIT_TRANSACTION_ICON = 'DEBIT_TRANSACTION_ICON',
  CREDIT_TRANSACTION_ICON = 'CREDIT_TRANSACTION_ICON',
  GRAY_CIRCULAR_CROSS = 'GRAY_CIRCULAR_CROSS',
  PENDING_GRAY = 'PENDING_GRAY',
  APPLE_LOGO_GRAY = 'APPLE_LOGO_GRAY',
  GOOGLE_LOGO_GRAY = 'GOOGLE_LOGO_GRAY',
  POS_ICON_GRAY = 'POS_ICON_GRAY',
  WIRELESS_ICON_GRAY = 'WIRELESS_ICON_GRAY',
  ECOMMERCE_ICON_GRAY = 'ECOMMERCE_ICON_GRAY',
  ATM_ICON_GRAY = 'ATM_ICON_GRAY',
  METAL_CARDS_STACK = 'METAL_CARDS_STACK',
  FREEZE_ICON_BLACK = 'FREEZE_ICON_BLACK',
  UNFREEZE_ICON_BLACK = 'UNFREEZE_ICON_BLACK',
  GET_PHYSICAL_CARD = 'GET_PHYSICAL_CARD',
  VISA_LOGO_GREY = 'VISA_LOGO_GREY',
  SPEND_CONTROL_ICON = 'SPEND_CONTROL_ICON',
  ONLINE_TRANSACTIONS_ICON = 'ONLINE_TRANSACTIONS_ICON',
  TAP_AND_PAY_ICON = 'TAP_AND_PAY_ICON',
  ATM_WITHDRAWAL_ICON = 'ATM_WITHDRAWAL_ICON',
  MERCHANT_OUTLET_ICON = 'MERCHANT_OUTLET_ICON',
  MOBILE_WALLETS_ICON = 'MOBILE_WALLETS_ICON',
  SELECT_COUNTRIES_ICON = 'SELECT_COUNTRIES_ICON',
  AUTHENTICATION_METHOD_ICON = 'AUTHENTICATION_METHOD_ICON',
  CARD_PIN_ICON = 'CARD_PIN_ICON',
  BLUE_EDIT_ICON = 'BLUE_EDIT_ICON',
  WHITE_SHIELD_ICON = 'WHITE_SHIELD_ICON',
  HYPERLIQUID_LOGO = 'HYPERLIQUID_LOGO',
  HYPERLIQUID_LOGO_TEXT = 'HYPERLIQUID_LOGO_TEXT',
}

export default AppImages;
