import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import crypto from 'crypto';
import { get, has, isEmpty, isUndefined, orderBy, some, trim } from 'lodash';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import WebView from 'react-native-webview';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import CardDetailsModal from '../../../components/v2/card/cardDetailsModal';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import CyDModalLayout from '../../../components/v2/modal';
import { screenTitle } from '../../../constants';
import {
  ACCOUNT_STATUS,
  CardOperationsAuthType,
  CardProviders,
  CardStatus,
  CardType,
  GlobalContextType,
} from '../../../constants/enum';
import {
  getCardRevealReuseToken,
  setCardRevealReuseToken,
} from '../../../core/asyncStorage';
import { GlobalContext } from '../../../core/globalContext';
import axios from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import {
  copyToClipboard,
  limitDecimalPlaces,
  sleepFor,
} from '../../../core/util';
import { Card } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';
import { UserCardDetails } from '../../../models/userCardDetails.interface';
import {
  CyDImage,
  CyDImageBackground,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { showToast } from '../../utilities/toastUtility';
import CardOptionsModal from './cardOptions';
import useCardUtilities from '../../../hooks/useCardUtilities';

interface CardSecrets {
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardNumber: string;
}

const initialCardDetails: CardSecrets = {
  cvv: 'xxx',
  expiryMonth: 'xx',
  expiryYear: 'xxxx',
  cardNumber: 'xxxx xxxx xxxx xxxx',
};

export default function CardScreen({
  navigation,
  currentCardProvider,
  onPressUpgradeNow,
  onPressActivateCard,
  refreshProfile,
  onPressPlanChange,
}: {
  navigation: any;
  currentCardProvider: CardProviders;
  onPressUpgradeNow: () => void;
  onPressActivateCard: (card: any) => void;
  refreshProfile: () => void;
  onPressPlanChange: () => void;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const {
    lifetimeAmountUsd: lifetimeLoadUSD,
    rc: { isPhysicalCardEligible: upgradeToPhysicalAvailable = false } = {},
    physicalCardEligibilityLimit,
  } = cardProfile;

  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { getWithAuth } = useAxios();
  const [userCardDetails, setUserCardDetails] = useState<UserCardDetails>({
    cards: [],
    personId: '',
    currentCardRevealedDetails: {
      cardNumber: 'XXXX XXXX XXXX',
      type: t('VIRTUAL'),
      cvv: 'XXX',
      expiryMonth: 'XX',
      expiryYear: 'XX',
      cardId: '',
    },
    hideCardDetails: true,
    showCVVAndExpiry: false,
    isFetchingCardDetails: false,
  });
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [trackingDetails, setTrackingDetails] = useState({});
  const [isRcUpgradableCardShown, setIsRcUpgradableCardShown] = useState(false);

  const isHiddenCard = () => {
    return some(userCardDetails?.cards, { status: CardStatus.HIDDEN });
  };

  // physical card upgrade only shown for paycaddy pc cards
  const isUpgradeToPhysicalCardStatusShown =
    currentCardProvider === CardProviders.PAYCADDY &&
    lifetimeLoadUSD < physicalCardEligibilityLimit &&
    !cardProfile[currentCardProvider]?.cards
      ?.map(card => card.type)
      .includes(CardType.PHYSICAL) &&
    !isHiddenCard();

  const setUpgradeCorrectedCardIndex = (index: number) => {
    setCurrentCardIndex(index);
  };

  useEffect(() => {
    const checkIsRcUpgradableCardShown = async () => {
      setIsRcUpgradableCardShown(
        !has(cardProfile, CardProviders.REAP_CARD) &&
          has(cardProfile, CardProviders.PAYCADDY),
      );
    };

    void checkIsRcUpgradableCardShown();

    if (isFocused && !isEmpty(currentCardProvider)) {
      const cardConfig = get(cardProfile, currentCardProvider);
      if (cardConfig?.cards) {
        const { type }: { last4: string; type: string } = cardConfig.cards[0];
        setUserCardDetails({
          ...userCardDetails,
          hideCardDetails: true,
          showCVVAndExpiry: false,
          cards: orderBy(cardConfig.cards, 'type', 'asc'),
          personId: cardConfig.personId,
          currentCardRevealedDetails: {
            cardNumber: 'XXXX XXXX XXXX ',
            type,
            cvv: 'XXX',
            expiryMonth: 'XX',
            expiryYear: 'XX',
            cardId: '',
          },
        });
        void getTrackingDetails();
      }
    }
  }, [currentCardProvider, isFocused, cardProfile]);

  const getCardImage = (card: Card) => {
    if (currentCardProvider === CardProviders.REAP_CARD) {
      if (card.type === CardType.PHYSICAL) {
        return AppImages.RC_PHYSICAL;
      } else {
        return AppImages.RC_VIRTUAL;
      }
    } else {
      if (card.status === 'rcUpgradable') {
        return AppImages.RC_VIRTUAL;
      } else if (card.type === CardType.PHYSICAL) {
        return AppImages.PHYSICAL_CARD_MASTER;
      } else {
        return AppImages.VIRTUAL_CARD_MASTER;
      }
    }
  };

  const renderItem = ({ item }: { item: Card }) => {
    const card = item;
    return (
      <CyDImageBackground
        className={clsx('flex flex-col h-[190px] w-[300px] self-center', {
          'justify-center items-center':
            card.status === CardStatus.IN_ACTIVE ||
            card.status === CardStatus.HIDDEN ||
            card.status === CardStatus.BLOCKED ||
            card.status === 'rcUpgradable',
          'justify-end':
            card.status !== CardStatus.IN_ACTIVE &&
            card.status !== CardStatus.HIDDEN &&
            card.status !== CardStatus.BLOCKED &&
            card.status !== 'rcUpgradable',
        })}
        resizeMode='stretch'
        source={getCardImage(card)}>
        {(card.status === CardStatus.IN_ACTIVE ||
          card.status === CardStatus.BLOCKED) && (
          <CyDView className='flex flex-row items-center bg-cardBg px-[12px] py-[6px] rounded-[6px]'>
            <CyDImage
              source={AppImages.CYPHER_LOCKED}
              className='h-[18px] w-[18px]'
              resizeMode='contain'
            />
            <CyDText className='font-extrabold mt-[1px] ml-[2px]'>
              Locked
            </CyDText>
          </CyDView>
        )}
        {card.status === CardStatus.HIDDEN && (
          <CyDView className='flex flex-row items-center bg-cardBg px-[12px] py-[6px] rounded-[6px]'>
            <CyDImage
              source={AppImages.CYPHER_LOCKED}
              className='h-[18px] w-[18px]'
              resizeMode='contain'
            />
            <CyDText className='font-extrabold mt-[1px] ml-[2px]'>
              {t('LOAD_TO_ACTIVATE')}
            </CyDText>
          </CyDView>
        )}
        {card.status === 'rcUpgradable' && (
          <CyDView className='flex flex-row items-center bg-cardBg px-[12px] py-[6px] rounded-[6px]'>
            <CyDImage
              source={AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW}
              className='h-[24px] w-[24px]'
              resizeMode='contain'
            />
            <CyDText className='font-extrabold mt-[1px] ml-[2px]'>
              {'Upgrade to a new card'}
            </CyDText>
          </CyDView>
        )}
        {card.status !== CardStatus.HIDDEN &&
          card.status !== 'rcUpgradable' &&
          cardProfile.provider === CardProviders.REAP_CARD && (
            <CyDView className='absolute bottom-[12px] left-[12px]'>
              <CyDText className='font-semibold text-[18px]'>
                {' xxxx ' + card.last4}
              </CyDText>
            </CyDView>
          )}
      </CyDImageBackground>
    );
  };

  const cardsWithUpgrade = useMemo(() => {
    const actualCards = userCardDetails.cards.map(card => card);
    if (upgradeToPhysicalAvailable && !isHiddenCard()) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'rc',
        status: 'upgradeAvailable',
        type: CardType.PHYSICAL,
      });
    } else if (isUpgradeToPhysicalCardStatusShown) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'rc',
        status: 'upgradeAvailable',
        type: CardType.PHYSICAL,
      });
    }
    if (isRcUpgradableCardShown) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'pc',
        status: 'rcUpgradable',
        type: CardType.VIRTUAL,
      });
    }
    return actualCards;
  }, [
    currentCardProvider,
    upgradeToPhysicalAvailable,
    userCardDetails.cards,
    cardProfile,
  ]);

  const getTrackingDetails = async () => {
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/tracking`,
    );
    if (!response.error) {
      const tempTrackingDetails = response.data;
      setTrackingDetails(tempTrackingDetails);
    }
    return response;
  };

  return (
    <CyDView>
      <Carousel
        loop={false}
        width={width}
        height={cardProfile.provider === CardProviders.REAP_CARD ? 210 : 250}
        autoPlay={false}
        data={cardsWithUpgrade}
        snapEnabled={true}
        pagingEnabled={true}
        mode='parallax'
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 110,
        }}
        scrollAnimationDuration={0}
        onSnapToItem={setUpgradeCorrectedCardIndex}
        renderItem={renderItem as any}
      />
      {cardsWithUpgrade && get(cardsWithUpgrade, currentCardIndex) && (
        <RenderCardActions
          card={get(cardsWithUpgrade, currentCardIndex)}
          cardProvider={currentCardProvider}
          navigation={navigation}
          refreshProfile={refreshProfile}
          onPressUpgradeNow={onPressUpgradeNow}
          onPressActivateCard={onPressActivateCard}
          cardProfile={cardProfile}
          trackingDetails={trackingDetails}
          onPressPlanChange={onPressPlanChange}
        />
      )}
    </CyDView>
  );
}

const RenderCardActions = ({
  card,
  cardProvider,
  navigation,
  refreshProfile,
  onPressUpgradeNow,
  onPressActivateCard,
  cardProfile,
  trackingDetails,
  onPressPlanChange,
}: {
  card: Card;
  cardProvider: CardProviders;
  navigation: any;
  refreshProfile: () => void;
  onPressUpgradeNow: () => void;
  onPressActivateCard: (card: Card) => void;
  cardProfile: CardProfile;
  trackingDetails: any;
  onPressPlanChange: () => void;
}) => {
  const { t } = useTranslation();
  const { postWithAuth, patchWithAuth } = useAxios();
  const [cardDetails, setCardDetails] =
    useState<CardSecrets>(initialCardDetails);
  const [showCardDetailsModal, setShowCardDetailsModal] =
    useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [isFetchingCardDetails, setIsFetchingCardDetails] =
    useState<boolean>(false);
  const [isStatusLoading, setIsStatusLoading] = useState<boolean>(false);
  const { type, last4, status, cardId } = card;
  const isFocused = useIsFocused();
  const [showRCCardDetailsModal, setShowRCCardDetailsModal] = useState(false);
  const [webviewUrl, setWebviewUrl] = useState('');
  const [userName, setUserName] = useState('');
  const {
    lifetimeAmountUsd: lifetimeLoadUSD,
    rc: { isPhysicalCardEligible: upgradeToPhysicalAvailable = false } = {},
    physicalCardEligibilityLimit,
  } = cardProfile;
  const globalContext = useContext<any>(GlobalContext);
  const physicalCardEligibilityProgress =
    parseFloat(
      ((lifetimeLoadUSD / physicalCardEligibilityLimit) * 100).toFixed(2),
    ) > 100
      ? '100'
      : ((lifetimeLoadUSD / physicalCardEligibilityLimit) * 100).toFixed(2);
  const [hideTimer, setHideTimer] = useState(0);
  const [hideInterval, setHideInterval] = useState<NodeJS.Timeout>();
  const detailsAutoCloseTime = 120;
  const [isRcUpgradableCardShown, setIsRcUpgradableCardShown] = useState(false);

  useEffect(() => {
    if (showRCCardDetailsModal) {
      let hideTime = detailsAutoCloseTime;
      setHideInterval(
        setInterval(() => {
          hideTime--;
          setHideTimer(hideTime);
        }, 1000),
      );
    }
    if (!showRCCardDetailsModal) {
      clearInterval(hideInterval);
    }
    return () => {
      clearInterval(hideInterval);
    };
  }, [showRCCardDetailsModal]);

  useEffect(() => {
    if (hideTimer === 0) {
      clearInterval(hideInterval);
      setShowRCCardDetailsModal(false);
    }
  }, [hideTimer]);

  const isLockdownModeEnabled = get(
    cardProfile,
    ['accountStatus'],
    ACCOUNT_STATUS.ACTIVE,
  );

  const shouldBlockAction = () => {
    if (
      isLockdownModeEnabled === ACCOUNT_STATUS.LOCKED &&
      cardProvider === CardProviders.REAP_CARD
    ) {
      return true;
    }
    return false;
  };

  // physical card upgrade only shown for paycaddy pc cards
  const isUpgradeToPhysicalCardStatusShown =
    cardProvider === CardProviders.PAYCADDY &&
    lifetimeLoadUSD < physicalCardEligibilityLimit &&
    !cardProfile[cardProvider]?.cards
      ?.map(card => card.type)
      .includes(CardType.PHYSICAL);

  useEffect(() => {
    const checkIsRcUpgradableCardShown = async () => {
      setIsRcUpgradableCardShown(
        !has(cardProfile, CardProviders.REAP_CARD) &&
          has(cardProfile, CardProviders.PAYCADDY),
      );
    };

    void checkIsRcUpgradableCardShown();

    if (isFocused && isFetchingCardDetails) {
      setIsFetchingCardDetails(false);
    }
  }, [isFocused]);

  const copyTrackingNumber = (trackingNumber: string) => {
    copyToClipboard(trackingNumber);
    showToast('Tracking number copied to clipboard');
  };

  const RenderTrackingItem = useCallback(() => {
    const physicalCard = get(trackingDetails, cardId);
    const trackingNumber = get(trackingDetails, cardId)?.trackingId;
    return (
      <CyDView className='flex flex-row items-start w-[350px] mx-[20px] px-[10px] mb-[12px] bg-highlightBg rounded-[12px] self-center'>
        <CyDView className='py-[10px]'>
          <CyDImage source={AppImages.MAIL} className='h-[32px] w-[32px]' />
        </CyDView>
        <CyDView className='py-[10px] flex justify-center ml-[12px] w-[90%]'>
          <CyDView className='flex flex-row items-center'>
            <CyDText className='font-bold text-[16px]'>
              {t('CARD_ON_WAY')}
            </CyDText>
            <CyDImage
              source={AppImages.CELEBRATE}
              className='h-[24px] w-[24px] ml-[8px]'
            />
          </CyDView>
          <CyDText className='mt-[6px]'>
            {trackingDetails &&
            isUndefined(get(trackingDetails, physicalCard.cardId)?.trackingId)
              ? t('CARD_PRINTING_DESCRIPTION_SUB1') +
                String(physicalCard.last4) +
                t('CARD_PRINTING_DESCRIPTION_SUB2')
              : t('CARD_SHIP_DESCRIPTION_SUB1') +
                String(physicalCard.last4) +
                t('CARD_SHIP_DESCRIPTION_SUB2')}
          </CyDText>
          {trackingNumber && (
            <CyDView className='flex flex-row items-center mt-[6px]'>
              <CyDText className=''>{t('FEDEX_TRACKING_NO')}</CyDText>
              <CyDText className='max-w-[50%] text-highlightText ml-[8px]'>
                {trackingNumber}
              </CyDText>
              <CyDTouchView onPress={() => copyTrackingNumber(trackingNumber)}>
                <CyDImage
                  source={AppImages.COPY}
                  className='h-[14px] w-[14px] ml-[12px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    );
  }, [trackingDetails, cardId]);

  const validateReuseToken = async () => {
    if (card.type === CardType.VIRTUAL) {
      setIsFetchingCardDetails(true);
      const cardRevealReuseToken = await getCardRevealReuseToken(cardId);
      if (cardProfile.provider && cardRevealReuseToken) {
        const verifyReuseTokenUrl = `/v1/cards/${cardProvider}/card/${String(
          cardId,
        )}/verify/reuse-token`;
        const payload = {
          reuseToken: cardRevealReuseToken,
          stylesheetUrl: 'https://public.cypherd.io/css/cardRevealMobile.css',
        };
        try {
          const response = await postWithAuth(verifyReuseTokenUrl, payload);
          setIsFetchingCardDetails(false);
          if (!response.isError) {
            if (cardProvider === CardProviders.REAP_CARD) {
              setWebviewUrl(trim(response.data.token, '"'));
              setUserName(response.data.userName);
              setShowRCCardDetailsModal(true);
            } else {
              void sendCardDetails(response.data);
            }
          } else {
            verifyWithOTP();
          }
        } catch (e: any) {
          verifyWithOTP();
        }
      } else {
        verifyWithOTP();
      }
    } else {
      showModal('state', {
        type: 'error',
        title: ' ',
        description:
          'Reveal card feature for physical card has been disabled for your safety. Refer to your physical card for card details',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, {
      onSuccess: (data: any, cardProvider: CardProviders) => {
        if (cardProvider === CardProviders.REAP_CARD) {
          void decryptMessage(data);
        } else if (cardProvider === CardProviders.PAYCADDY) {
          void sendCardDetails(data);
        }
      },
      currentCardProvider: cardProvider,
      card,
      triggerOTPParam: 'verify/show-token',
      verifyOTPPayload: { isMobile: true },
    });
  };

  const decryptMessage = async ({
    privateKey,
    base64Message,
    reuseToken,
    userNameValue,
  }) => {
    try {
      await sleepFor(1000);
      setIsFetchingCardDetails(true);
      if (reuseToken) {
        await setCardRevealReuseToken(cardId, reuseToken);
      }
      const buffer = Buffer.from(base64Message, 'base64');

      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: 4,
        },
        buffer,
      );
      const decryptedBuffer = decrypted.toString('utf8');
      setWebviewUrl(trim(decryptedBuffer, '"'));
      setUserName(userNameValue);
      setShowRCCardDetailsModal(true);
      setIsFetchingCardDetails(false);
      return decryptedBuffer;
    } catch (error) {
      console.error('Decryption error:', error);
    }
  };

  const sendCardDetails = async ({
    vaultId,
    cardId,
    token,
    reuseToken,
  }: {
    vaultId: string;
    cardId: string;
    token: string;
    reuseToken?: string;
  }) => {
    await sleepFor(1000);
    setIsFetchingCardDetails(true);
    if (reuseToken) {
      await setCardRevealReuseToken(cardId, reuseToken);
    }
    const response = await axios.post(
      vaultId,
      { cardId, isProd: true },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setIsFetchingCardDetails(false);
    if (response?.data) {
      if (response?.data.result) {
        const { result } = response.data;
        const tempCardDetails = {
          cvv: result.cvv,
          expiryMonth: result.expDate.slice(-2),
          expiryYear: result.expDate.slice(0, 4),
          cardNumber: result.pan.match(/.{1,4}/g).join(' '),
        };
        setCardDetails(tempCardDetails);
        setShowCardDetailsModal(true);
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_REVEAL_CARD_DETAILS'),
        description: t('CONTACT_CYPHERD_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const verifyCardUnlock = () => {
    hideModal();
    navigation.navigate(screenTitle.CARD_UNLOCK_AUTH, {
      onSuccess: () => {
        showModal('state', {
          type: 'success',
          title: t('CHANGE_CARD_STATUS_SUCCESS'),
          description: `Successfully unlocked your card!`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      },
      currentCardProvider: cardProvider,
      card,
      authType:
        card.status === CardStatus.BLOCKED
          ? CardOperationsAuthType.UNBLOCK
          : CardOperationsAuthType.UNLOCK,
    });
  };

  const onCardStatusChange = async () => {
    hideModal();
    setIsStatusLoading(true);
    const url = `/v1/cards/${cardProvider}/card/${cardId}/status`;
    const payload = {
      status:
        status === CardStatus.ACTIVE ? CardStatus.IN_ACTIVE : CardStatus.ACTIVE,
    };

    try {
      const response = await patchWithAuth(url, payload);
      if (!response.isError) {
        setIsStatusLoading(false);

        showModal('state', {
          type: 'success',
          title: t('CHANGE_CARD_STATUS_SUCCESS'),
          description: `Successfully ${
            status === CardStatus.ACTIVE ? 'locked' : 'unlocked'
          } your card!`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void refreshProfile();
      } else {
        setIsStatusLoading(false);
        showModal('state', {
          type: 'error',
          title: t('CHANGE_CARD_STATUS_FAIL'),
          description:
            response.error.message ?? t('UNABLE_TO_CHANGE_CARD_STATUE'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      setIsStatusLoading(false);
      showModal('state', {
        type: 'error',
        title: t('CHANGE_CARD_STATUS_FAIL'),
        description: t('UNABLE_TO_CHANGE_CARD_STATUE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const toggleCardStatus = () => {
    showModal('state', {
      type: 'warning',
      title: `Are you sure you want to ${
        status === CardStatus.ACTIVE ? 'lock' : 'unlock'
      } your card?`,
      description: CardStatus.ACTIVE
        ? 'This is just a temporary lock. You can unlock it anytime'
        : '',
      onSuccess: onCardStatusChange,
      onFailure: hideModal,
    });
  };

  if (card.status === CardStatus.HIDDEN) {
    return <></>;
  } else if (card.status === 'upgradeAvailable') {
    if (upgradeToPhysicalAvailable) {
      return (
        <CyDView className='flex flex-col justify-center items-center mx-[20px] mt-[-20px]'>
          <CyDText className='text-[22px] font-bold'>Get Physical Card</CyDText>
          <CyDText className='text-[14px] font-semibold text-center mb-[12px] mt-[6px]'>
            Obtain a Physical card and enjoy the convenience of making purchases
            worldwide.
          </CyDText>
          <Button
            title='GET PHYSICAL CARD'
            style='px-[28px]'
            onPress={onPressUpgradeNow}
          />
        </CyDView>
      );
    } else if (isUpgradeToPhysicalCardStatusShown) {
      return (
        <CyDView className='flex flex-col items-center justify-center mt-[-32px]'>
          <CyDView className='flex flex-row'>
            <CyDText className='bottom-[16px] text-[18px] font-extrabold rounded-[8px]'>
              {t('UPGRADE_TO_PHYSICAL_CARD')}
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-col w-[90%] justify-center items-center bg-white pt-[12px] rounded-[12px]'>
            <CyDView className='flex flex-row h-[8px] w-[90%] items-center border border-inputBorderColor bg-white mx-[4px] rounded-[8px]'>
              <CyDView
                className={clsx(
                  'absolute bg-toastColor h-full rounded-[8px] my-[5px]',
                  {
                    'bg-appColor':
                      parseFloat(physicalCardEligibilityProgress) <= 60,
                  },
                  {
                    'bg-redColor':
                      parseFloat(physicalCardEligibilityProgress) <= 30,
                  },
                )}
                style={{
                  width: `${physicalCardEligibilityProgress}%`,
                }}
              />
            </CyDView>
            <CyDView className='flex flex-row w-[90%] justify-between items-center mx-[30px] mt-[2px]'>
              <CyDText className='text-[16px] font-semibold rounded-[8px]'>
                {`$${lifetimeLoadUSD}`}
              </CyDText>
              <CyDText className='text-[18px] font-extrabold rounded-[8px]'>
                {`$${physicalCardEligibilityLimit}`}
              </CyDText>
            </CyDView>
            {lifetimeLoadUSD < physicalCardEligibilityLimit && (
              <CyDView className='flex flex-row my-[5px] mt-[12px]'>
                <CyDText className='mb-[4px]'>{`Load `}</CyDText>
                <CyDText className='mb-[4px] font-extrabold text-appColor'>
                  {limitDecimalPlaces(
                    physicalCardEligibilityLimit - lifetimeLoadUSD,
                    2,
                  )}
                </CyDText>
                <CyDText className='mb-[4px] font-extrabold text-appColor'>{` USD`}</CyDText>
                <CyDText className='mb-[4px]'>{` more to upgrade`}</CyDText>
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      );
    }
  } else if (status === CardStatus.PENDING_ACTIVATION) {
    return (
      <CyDView className='flex flex-col justify-center items-center mx-[20px] mt-[-20px]'>
        {get(trackingDetails, cardId) ? (
          <RenderTrackingItem />
        ) : (
          <CyDView className='flex lfex-col justify-center items-center'>
            <CyDText className='text-[22px] font-bold'>
              Activate Physical Card
            </CyDText>
            <CyDText className='text-[14px] font-semibold text-center my-[12px]'>
              Activate Physical card and enjoy the convenience of making
              purchases worldwide.
            </CyDText>
          </CyDView>
        )}
        <Button
          title='ACTIVATE PHYSICAL CARD'
          style='px-[28px]'
          onPress={() => {
            void onPressActivateCard(card);
          }}
        />
      </CyDView>
    );
  } else if (isRcUpgradableCardShown && !card.cardId) {
    return (
      <CyDView className='flex flex-col justify-center items-center mx-[20px] mt-[-32px]'>
        <CyDView className='flex flex-col justify-center items-center mb-[24px]'>
          <CyDText className='text-[16px] font-bold text-center my-[12px]'>
            Now get access to the much awaited {'\n'} Apple and Google pay
          </CyDText>
          <CyDImage
            source={AppImages.UPGRADE_CARD_TIMELINE}
            className='w-[272px] h-[12px] mb-[8px]'
          />
          <CyDView className='flex flex-row'>
            <CyDText className='text-[12px] ml-[15px]'>{'Register'}</CyDText>
            <CyDText className='text-[12px] ml-[55px] mr-[45px]'>
              {'Complete your KYC'}
            </CyDText>
            <CyDText className='text-[12px]'>{'Get your card'}</CyDText>
          </CyDView>
        </CyDView>
        <Button
          title='UPGRADE'
          style='px-[88px]'
          onPress={() => {
            const tempProfile = cardProfile;
            tempProfile.provider = CardProviders.REAP_CARD;
            globalContext.globalDispatch({
              type: GlobalContextType.CARD_PROFILE,
              cardProfile: tempProfile,
            });
            navigation.navigate(screenTitle.SELECT_PLAN, {
              deductAmountNow: false,
              toPage: screenTitle.CARD_SIGNUP_SCREEN,
            });
          }}
        />
      </CyDView>
    );
  }

  return (
    <CyDView className='w-full'>
      <CardDetailsModal
        isModalVisible={showCardDetailsModal}
        setShowModal={setShowCardDetailsModal}
        cardDetails={cardDetails}
      />

      {showRCCardDetailsModal && (
        <CyDModalLayout
          isModalVisible={showRCCardDetailsModal}
          setModalVisible={setShowRCCardDetailsModal}
          animationIn={'slideInUp'}
          animationOut={'slideOutDown'}
          animationInTiming={300}
          animationOutTiming={300}
          style={styles.modalLayout}>
          <CyDView className='bg-cardBgTo py-[8px] mb-[12px] h-[412px] w-[90%] rounded-[16px]'>
            <CyDTouchView onPress={() => setShowRCCardDetailsModal(false)}>
              <CyDImage
                source={AppImages.CLOSE_CIRCLE}
                className='h-[22px] w-[22px] ml-[90%] mb-[5px]'
                resizeMode='contain'
              />
            </CyDTouchView>
            <CyDView className='flex flex-row justify-between items-center w-full mb-[12px]'>
              <CyDText className='text-center text-[14px] text-lightThemeGrayText w-full'>
                Details will be hidden in {hideTimer} sec
              </CyDText>
            </CyDView>
            <WebView
              source={{
                html: `
                <!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
                    <link href='https://fonts.googleapis.com/css?family=Manrope' rel='stylesheet'>
                    <style>
                      #nameDiv {
                        display: none;
                        background-color: white;
                        border-radius: 8px;
                        font-family: 'Manrope';
                        margin: 6px;
                        padding: 12px;
                        margin-bottom: 12px;
                      }
                      #nameTitle {
                        font-weight: 900;
                        font-size: 16px;
                      }
                      #nameValue {
                        margin-top: 4px;
                        font-weight: bold;
                        font-size: 16px;
                      }
                    </style>
                  </head>
                  <body style="background:#EBEDF0;overflow:hidden">
                    <div id="nameDiv">
                      <div id="nameTitle">Name:</div>
                      <div id="nameValue">${userName}</div>
                    </div>
                    <iframe 
                      id="contentFrame"
                      scrolling="no" 
                      src="${webviewUrl}" 
                      allow="clipboard-read; clipboard-write" 
                      style="height:250px;overflow:hidden;width:100%;margin:0;padding:0;border:none;background:#EBEDF0;border-radius:16px"
                      onload="document.getElementById('nameDiv').style.display = 'block';"
                    ></iframe>
                    <script>
                      document.getElementById('contentFrame').onload = function() {
                        document.getElementById('nameDiv').style.display = 'block';
                      }
                    </script>
                  </body>
                </html>
              `,
              }}
              scalesPageToFit={true}
              style={{
                height: '100%',
                width: '100%',
                background: '#EBEDF0',
                padding: 0,
                margin: 0,
                borderRadius: 16,
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
            />
          </CyDView>
        </CyDModalLayout>
      )}

      <CardOptionsModal
        isModalVisible={showOptionsModal}
        setShowModal={setShowOptionsModal}
        cardProvider={cardProvider}
        card={card}
        navigation={navigation}
        onPressPlanChange={onPressPlanChange}
      />

      {cardProfile.provider === CardProviders.PAYCADDY && (
        <CyDView className='flex flex-row justify-center items-center mb-[14px] mt-[-42px]'>
          <CyDText className='font-bold text-[14px]'>
            {t<string>(
              type === CardType.VIRTUAL ? 'VIRTUAL_CARD' : 'PHYSICAL_CARD',
            )}
          </CyDText>
          <CyDText className='font-bold text-[14px]'>
            {' xxxx ' + last4}
          </CyDText>
        </CyDView>
      )}

      <CyDView className='flex flex-row justify-center items-center'>
        <CyDTouchView
          className='flex flex-col justify-center items-center w-[72px]'
          disabled={shouldBlockAction()}
          onPress={() => {
            if (status === CardStatus.IN_ACTIVE) {
              showModal('state', {
                type: 'error',
                title: t('UNLOCK_CARD_TO_REVEAL_CARD_DETAILS'),
                onSuccess: hideModal,
                onFailure: hideModal,
              });
            } else {
              void validateReuseToken();
            }
          }}>
          <CyDView
            className={`${shouldBlockAction() ? 'bg-n40' : 'bg-appColor'} h-[52px] w-[52px] items-center justify-center rounded-[50px]`}>
            {isFetchingCardDetails ? (
              <LottieView source={AppImages.LOADER_TRANSPARENT} autoPlay loop />
            ) : (
              <CyDImage
                source={AppImages.MANAGE_CARD}
                className='h-[24px] w-[24px]'
                resizeMode='contain'
              />
            )}
          </CyDView>
          <CyDView className='mt-[6px]'>
            <CyDText className='font-semibold text-[12px]'>
              {'Reveal Card'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
        <CyDTouchView
          className='flex flex-col justify-center items-center w-[72px]  ml-[24px] mr-[21px]'
          disabled={shouldBlockAction()}
          onPress={() => {
            if (status === CardStatus.ACTIVE) {
              toggleCardStatus();
            } else {
              verifyCardUnlock();
            }
          }}>
          <CyDView
            className={`${shouldBlockAction() ? 'bg-n40' : 'bg-appColor'} h-[52px] w-[52px] items-center justify-center rounded-[50px]`}>
            {isStatusLoading ? (
              <LottieView source={AppImages.LOADER_TRANSPARENT} autoPlay loop />
            ) : (
              <CyDImage
                source={
                  status === CardStatus.ACTIVE
                    ? AppImages.CYPHER_LOCKED
                    : AppImages.UNLOCK
                }
                className='h-[24px] w-[24px]'
                resizeMode='contain'
              />
            )}
          </CyDView>
          <CyDView className='mt-[6px]'>
            <CyDText className='font-semibold text-[12px]'>
              {status === CardStatus.ACTIVE ? 'Lock Card' : 'Unlock Card'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
        <CyDTouchView
          className='flex flex-col justify-center items-center'
          disabled={shouldBlockAction()}
          onPress={() => {
            setShowOptionsModal(true);
          }}>
          <CyDView
            className={`${shouldBlockAction() ? 'bg-n40' : 'bg-appColor'} p-[12px] rounded-[50px]`}>
            <CyDImage
              source={AppImages.MORE}
              className='h-[24px] w-[24px] accent-black rotate-90'
              resizeMode='contain'
            />
          </CyDView>
          <CyDView className='mt-[6px]'>
            <CyDText className='font-semibold text-[12px]'>
              {'Card Options'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    marginBottom: 50,
    justifyContent: 'flex-end',
    width: '100%',
  },
});
