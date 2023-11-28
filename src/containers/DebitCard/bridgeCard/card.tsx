import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { GlobalContext } from '../../../core/globalContext';
import { screenTitle } from '../../../constants';
import { copyToClipboard } from '../../../core/util';
import { showToast } from '../../utilities/toastUtility';
import { useTranslation } from 'react-i18next';
import {
  setCardRevealReuseToken,
  getCardRevealReuseToken,
} from '../../../core/asyncStorage';
import axios from '../../../core/Http';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import useAxios from '../../../core/HttpRequest';
import { CardProviders, CardStatus } from '../../../constants/enum';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { Card } from '../../../models/card.model';
import { orderBy } from 'lodash';
import { UserCardDetails } from '../../../models/userCardDetails.interface';
import { CardProfile } from '../../../models/cardProfile.model';
import { useIsFocused } from '@react-navigation/native';
import CardCarousel from '../../../components/v2/CardCarousel';
import {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

export default function CardScreen({
  navigation,
  currentCardProvider,
  setCurrentCardProvider,
}: {
  navigation: any;
  currentCardProvider: string;
  setCurrentCardProvider: Dispatch<SetStateAction<string>>;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const {
    lifetimeAmountUsd: lifetimeLoadUSD,
    pc: { isPhysicalCardEligible: upgradeToPhysicalAvailable },
    physicalCardEligibilityLimit,
  } = cardProfile;

  const physicalCardEligibilityProgress =
    parseFloat(
      ((lifetimeLoadUSD / physicalCardEligibilityLimit) * 100).toFixed(2),
    ) > 100
      ? '100'
      : ((lifetimeLoadUSD / physicalCardEligibilityLimit) * 100).toFixed(2);

  const { t } = useTranslation();
  const isFocused = useIsFocused();
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
  const { showModal, hideModal } = useGlobalModalContext();
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(
    upgradeToPhysicalAvailable ? 1 : 0,
  );
  const setUpgradeCorrectedCardIndex = (index: number) => {
    // is upgradeToPhysicalAvailable is true, the prompting card will be at index -1.
    const newIndex = upgradeToPhysicalAvailable ? index - 1 : index;
    setCurrentCardIndex(newIndex);
  };
  const { postWithAuth } = useAxios();
  const currentTimestamp = String(new Date().getDay());

  useEffect(() => {
    if (isFocused && currentCardProvider !== '') {
      const { type }: { last4: string; type: string } =
        cardProfile[currentCardProvider].cards[0];
      setUserCardDetails({
        hideCardDetails: true,
        showCVVAndExpiry: false,
        isFetchingCardDetails: false,
        cards: orderBy(cardProfile[currentCardProvider].cards, 'type', 'asc'),
        personId: cardProfile[currentCardProvider].personId,
        currentCardRevealedDetails: {
          cardNumber: 'XXXX XXXX XXXX ',
          type,
          cvv: 'XXX',
          expiryMonth: 'XX',
          expiryYear: 'XX',
          cardId: '',
        },
      });
    }
  }, [currentCardProvider, isFocused]);

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, {
      onSuccess: (data: any, cardProvider: CardProviders) => {
        void sendCardDetails(data, cardProvider);
      },
      currentCardProvider,
      card: userCardDetails.cards[currentCardIndex],
      triggerOTPParam: 'verify/show-token',
      verifyOTPPayload: { isMobile: true },
    });
  };

  const validateReuseToken = async () => {
    const { currentCardRevealedDetails } = userCardDetails;
    const cardId = userCardDetails.cards[currentCardIndex].cardId;
    setUserCardDetails({
      ...userCardDetails,
      isFetchingCardDetails: true,
      currentCardRevealedDetails: { ...currentCardRevealedDetails, cardId },
    });
    const cardRevealReuseToken = await getCardRevealReuseToken(cardId);
    if (cardRevealReuseToken) {
      const verifyReuseTokenUrl = `/v1/cards/${currentCardProvider}/card/${String(
        cardId,
      )}/verify/reuse-token`;
      const payload = { reuseToken: cardRevealReuseToken };
      try {
        const response = await postWithAuth(verifyReuseTokenUrl, payload);
        if (!response.isError) {
          void sendCardDetails(response.data, currentCardProvider);
        } else {
          verifyWithOTP();
        }
      } catch (e: any) {
        verifyWithOTP();
      }
    } else {
      verifyWithOTP();
    }
  };

  const sendCardDetails = async (
    {
      vaultId,
      cardId,
      token,
      reuseToken,
    }: { vaultId: string; cardId: string; token: string; reuseToken?: string },
    cardProvider: string,
  ) => {
    const { currentCardRevealedDetails } = userCardDetails;
    setCurrentCardProvider(cardProvider);
    if (reuseToken) {
      await setCardRevealReuseToken(cardId, reuseToken);
    }
    let response;
    if (cardProvider === CardProviders.BRIDGE_CARD) {
      response = await axios.get(vaultId + token);
    } else if (cardProvider === CardProviders.PAYCADDY) {
      response = await axios.post(
        vaultId,
        { cardId, isProd: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    }
    if (response?.data) {
      if (cardProvider === CardProviders.BRIDGE_CARD) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { card_number, cvv, expiry_month, expiry_year } =
          response.data.data;
        setUserCardDetails({
          ...userCardDetails,
          currentCardRevealedDetails: {
            ...currentCardRevealedDetails,
            cardNumber: card_number.match(/.{1,4}/g).join(' '),
            cvv,
            expiryMonth: expiry_month,
            expiryYear: expiry_year,
            cardId,
          },
          hideCardDetails: false,
          showCVVAndExpiry: false,
          isFetchingCardDetails: false,
        });
      } else if (
        cardProvider === CardProviders.PAYCADDY &&
        response?.data.result
      ) {
        const { pan, cvv, expDate } = response.data.result;
        setUserCardDetails({
          ...userCardDetails,
          currentCardRevealedDetails: {
            ...currentCardRevealedDetails,
            cardNumber: pan.match(/.{1,4}/g).join(' '),
            cvv,
            expiryMonth: String(expDate).substring(4, 6),
            expiryYear: String(expDate).substring(0, 4),
            cardId,
          },
          hideCardDetails: false,
          showCVVAndExpiry: false,
          isFetchingCardDetails: false,
        });
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

  const copyCardNumber = () => {
    copyToClipboard(userCardDetails.currentCardRevealedDetails.cardNumber);
    showToast(t('CARD_NUMBER_COPY'));
  };

  const toggleCardDetails = () => {
    if (userCardDetails.hideCardDetails) {
      void validateReuseToken();
    } else {
      const { last4, type, cardId } =
        cardProfile[currentCardProvider].cards[currentCardIndex];
      setUserCardDetails({
        ...userCardDetails,
        currentCardRevealedDetails: {
          cardNumber: 'XXXX XXXX XXXX ' + String(last4) ?? 'XXXX',
          type,
          cvv: 'XXX',
          expiryMonth: 'XX',
          expiryYear: 'XX',
          cardId,
        },
        hideCardDetails: true,
      });
    }
  };

  const getCardBackgroundLayout = (card: Card) => {
    if (currentCardProvider === CardProviders.BRIDGE_CARD) {
      return (
        'https://public.cypherd.io/icons/cardLayout.png?t=' + currentTimestamp
      );
    } else if (
      currentCardProvider === CardProviders.PAYCADDY &&
      card.type === 'physical'
    ) {
      return (
        'https://public.cypherd.io/icons/masterCardLayoutPhysical.png?t=' +
        currentTimestamp
      );
    }
    return (
      'https://public.cypherd.io/icons/masterCardLayout.png?t=' +
      currentTimestamp
    );
  };

  const RenderCVVAndExpiry = ({ card }: { card: Card }) => {
    const { hideCardDetails, showCVVAndExpiry, currentCardRevealedDetails } =
      userCardDetails;
    const revealCVVAndExpiry = () => {
      setUserCardDetails({
        ...userCardDetails,
        currentCardRevealedDetails: {
          ...currentCardRevealedDetails,
          cardNumber:
            'XXXX XXXX XXXX ' + String(card.last4).toUpperCase() ?? 'XXXX',
        },
        showCVVAndExpiry: true,
      });
    };
    const getCVV = () => {
      if (
        card.cardId === userCardDetails.currentCardRevealedDetails.cardId &&
        !userCardDetails.hideCardDetails &&
        userCardDetails.showCVVAndExpiry
      ) {
        return userCardDetails.currentCardRevealedDetails.cvv;
      } else {
        return 'XXX';
      }
    };
    const getExpiry = () => {
      const { currentCardRevealedDetails, hideCardDetails, showCVVAndExpiry } =
        userCardDetails;
      const { expiryMonth, expiryYear } = currentCardRevealedDetails;
      if (
        card.cardId === currentCardRevealedDetails.cardId &&
        !hideCardDetails &&
        showCVVAndExpiry
      ) {
        return expiryMonth + ' / ' + expiryYear;
      } else {
        return 'XX / XX';
      }
    };
    if (
      !hideCardDetails &&
      !showCVVAndExpiry &&
      card.cardId === userCardDetails.currentCardRevealedDetails.cardId
    ) {
      return (
        <CyDTouchView
          className='flex justify-center items-center self-center bg-fadedDarkBackgroundColor p-[10px] rounded-[20px] mb-[15px]'
          onPress={() => revealCVVAndExpiry()}>
          <CyDText className='text-white text-center font-bold'>
            {t('SHOW_CVV_EXPIRY')}
          </CyDText>
        </CyDTouchView>
      );
    }
    return (
      <CyDView className='flex flex-row mb-[10px]'>
        <CyDView className='ml-[10px]'>
          <CyDText
            className={clsx('font-nunito font-bold text-[12px] mx-[10px]', {
              'text-white': card.type !== 'physical',
            })}>
            {t('CVV')}
          </CyDText>
          <CyDText
            className={clsx(
              'font-nunito font-bold text-[12px] mx-[10px] mt-[5px]',
              { 'text-white': card.type !== 'physical' },
            )}>
            {getCVV()}
          </CyDText>
        </CyDView>
        <CyDView className='flex-1 items-center ml-[-50px]'>
          <CyDText
            className={clsx('font-nunito font-bold text-[12px] mx-[10px]', {
              'text-white': card.type !== 'physical',
            })}>
            {t('VALID_THRU')}
          </CyDText>
          <CyDText
            className={clsx(
              'font-nunito font-bold text-[12px] mx-[10px] mt-[5px]',
              { 'text-white': card.type !== 'physical' },
            )}>
            {getExpiry()}
          </CyDText>
        </CyDView>
      </CyDView>
    );
  };

  const getCardNumber = (card: Card) => {
    if (
      card.cardId === userCardDetails.currentCardRevealedDetails.cardId &&
      !userCardDetails.hideCardDetails
    ) {
      return userCardDetails.currentCardRevealedDetails.cardNumber;
    } else {
      return 'XXXX XXXX XXXX ' + String(card.last4).toUpperCase();
    }
  };

  const renderItem = ({
    item,
    index,
    boxWidth,
    halfBoxDistance,
    panX,
  }: {
    item: Card;
    index: number;
    boxWidth: number;
    halfBoxDistance: number;
    panX: SharedValue<number>;
  }) => {
    return (
      <RenderCard
        item={item}
        index={index}
        boxWidth={boxWidth}
        halfBoxDistance={halfBoxDistance}
        panX={panX}
      />
    );
  };

  const RenderCard = ({
    item,
    index,
    boxWidth,
    halfBoxDistance,
    panX,
  }: {
    item: Card;
    index: number;
    boxWidth: number;
    halfBoxDistance: number;
    panX: SharedValue<number>;
  }) => {
    const card = item;
    const {
      isFetchingCardDetails,
      currentCardRevealedDetails,
      hideCardDetails,
    } = userCardDetails;

    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        panX.value,
        [
          (index - 1) * boxWidth - halfBoxDistance,
          index * boxWidth - halfBoxDistance,
          (index + 1) * boxWidth - halfBoxDistance, // adjust positioning
        ],
        [0.88, 1, 0.88], // scale down when out of scope
        Extrapolation.CLAMP,
      );
      return {
        transform: [{ scale }],
      };
    });
    if (card.type === 'physical' && card.status === 'pendingActivation') {
      return (
        <CyDAnimatedView className='mb-[10px]' style={animatedStyle}>
          <CyDFastImage
            className={clsx('absolute w-full h-full')}
            source={{ uri: getCardBackgroundLayout(card) }}
            resizeMode='stretch'
          />
          <CyDView className='flex flex-col justify-center h-[200px] w-[300px] border-[1px] border-inputBorderColor rounded-[12px]'>
            <CyDTouchView
              onPress={() =>
                navigation.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, {
                  onSuccess: (data: any, cardProvider: CardProviders) => {
                    void sendCardDetails(data, cardProvider);
                  },
                  currentCardProvider,
                  card,
                })
              }
              className='flex flex-row justify-center items-center border-[2px] border-inputBorderColor bg-inputBorderColor mx-[30px] p-[5px] rounded-[10px]'>
              <CyDFastImage
                source={AppImages.ACTIVATE_PHYSICAL_CARD}
                className='h-[30px] w-[30px] mr-[10px]'
              />
              <CyDText className='font-nunito font-extrabold'>
                {t<string>('ACTIVATE_PYHSICAL_CARD')}
              </CyDText>
            </CyDTouchView>
            <CyDText className='text-center pt-[6px] font-bold'>
              {'XXXX XXXX XXXX ' + card.last4}
            </CyDText>
          </CyDView>
        </CyDAnimatedView>
      );
    }

    if (card.type === 'physical' && card.status === 'upgradeAvailable') {
      return (
        <CyDAnimatedView className='mb-[10px]' style={animatedStyle}>
          <CyDFastImage
            className={clsx('absolute w-full h-full')}
            source={{ uri: getCardBackgroundLayout(card) }}
            resizeMode='stretch'
          />
          <CyDView className='flex flex-col items-center justify-center h-[200px] w-[300px] border-[1px] border-inputBorderColor rounded-[12px]'>
            <CyDTouchView
              disabled={!upgradeToPhysicalAvailable}
              onPress={() =>
                navigation.navigate(
                  screenTitle.UPGRADE_TO_PHYSICAL_CARD_SCREEN,
                  {
                    currentCardProvider,
                  },
                )
              }
              className={clsx(
                'flex flex-row w-[75%] justify-start items-center border border-inputBorderColor bg-privacyMessageBackgroundColor mx-[30px] rounded-[8px]',
                { 'bg-white': upgradeToPhysicalAvailable },
              )}>
              <CyDView
                className={clsx(
                  'absolute h-full bg-toastColor rounded-[8px] my-[5px]',
                  { 'bg-white': upgradeToPhysicalAvailable },
                )}
                style={{
                  width: `${physicalCardEligibilityProgress}%`,
                }}
              />
              <CyDFastImage
                source={AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW}
                className='h-[30px] w-[30px] mx-[8px] my-[5px]'
              />
              <CyDText className='font-nunito font-extrabold my-[5px]'>
                {t<string>('UPGRADE_TO_PHYSICAL_CARD')}
              </CyDText>
            </CyDTouchView>
            <CyDView className='flex flex-row my-[5px]'>
              {!upgradeToPhysicalAvailable ? (
                <>
                  <CyDText className='mb-[4px]'>{`Load `}</CyDText>
                  <CyDText className='mb-[4px] font-extrabold'>
                    {physicalCardEligibilityLimit - lifetimeLoadUSD}
                  </CyDText>
                  <CyDText className='mb-[4px] font-extrabold'>{` USD`}</CyDText>
                  <CyDText className='mb-[4px]'>{` more to upgrade`}</CyDText>
                </>
              ) : (
                <CyDText className='mb-[4px] font-extrabold rounded-[8px]'>{`You're now eligible for a physical card!`}</CyDText>
              )}
            </CyDView>
          </CyDView>
        </CyDAnimatedView>
      );
    }

    return (
      <CyDAnimatedView
        className={clsx(
          'flex flex-col justify-center h-[200px] rounded-[8px] mb-[10px] w-[300px]',
          {
            'border border-inputBorderColor': card.type === 'physical',
          },
        )}
        style={animatedStyle}>
        <CyDFastImage
          className={clsx('absolute w-full h-full')}
          source={{ uri: getCardBackgroundLayout(card) }}
          resizeMode='stretch'
        />
        {isFetchingCardDetails &&
        card.cardId === currentCardRevealedDetails.cardId ? (
          <CyDFastImage
            source={{
              uri: 'https://public.cypherd.io/icons/details_loading.png',
            }}
            className='h-[50px] w-[50px] self-center'
            resizeMode='contain'
          />
        ) : card.status === CardStatus.ACTIVE ? (
          <CyDView className='flex-1 flex-col justify-between'>
            <CyDView>
              <CyDText
                className={clsx('font-nunito font-bold text-[16px] m-[10px]', {
                  'text-white': card.type !== 'physical',
                })}>
                {card.type.toUpperCase()}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row justify-between items-center'>
              <CyDView className='flex flex-row items-center'>
                <CyDTouchView onPress={toggleCardDetails}>
                  <CyDText
                    className={clsx(
                      'font-nunito font-bold text-[16px] m-[10px]',
                      { 'text-white': card.type !== 'physical' },
                    )}>
                    {getCardNumber(card)}
                  </CyDText>
                </CyDTouchView>
                {!hideCardDetails &&
                  currentCardRevealedDetails.cardId === card.cardId && (
                    <CyDTouchView onPress={() => copyCardNumber()}>
                      <CyDFastImage
                        source={{
                          uri: `https://public.cypherd.io/icons/${
                            card.type === 'physical'
                              ? 'copyBlack.png'
                              : 'copy.png'
                          }`,
                        }}
                        className='h-[20px] w-[20px] ml-[5px]'
                        resizeMode='contain'
                      />
                    </CyDTouchView>
                  )}
              </CyDView>
              <CyDView className='flex flex-row justify-start bg-black border-[1px] border-black p-[5px] rounded-l-[50px] mr-[0.7px]'>
                <CyDTouchView onPress={toggleCardDetails}>
                  <CyDFastImage
                    source={{
                      uri: `https://public.cypherd.io/icons/${
                        !hideCardDetails &&
                        currentCardRevealedDetails.cardId === card.cardId
                          ? 'reveal.png'
                          : 'hide.png'
                      }`,
                    }}
                    className='h-[21px] w-[21px] ml-[5px] mr-[10px]'
                    resizeMode='contain'
                  />
                </CyDTouchView>
                {['physical', 'virtual'].includes(card.type) && (
                  <CyDTouchView
                    onPress={() =>
                      navigation.navigate(screenTitle.CARD_SETTINGS_SCREEN, {
                        onSuccess: (data: any, cardProvider: CardProviders) => {
                          void sendCardDetails(data, cardProvider);
                        },
                        currentCardProvider,
                        card,
                      })
                    }>
                    <CyDFastImage
                      source={{
                        uri: 'https://public.cypherd.io/icons/settings_outline.png',
                      }}
                      className='h-[20px] w-[20px] mx-[3px]'
                    />
                  </CyDTouchView>
                )}
              </CyDView>
            </CyDView>
            <RenderCVVAndExpiry card={card} />
          </CyDView>
        ) : (
          <CyDView className='w-full h-full'>
            <CyDView>
              <CyDText
                className={clsx('font-nunito font-bold text-[16px] m-[10px]', {
                  'text-white': card.type !== 'physical',
                })}>
                {card.type.toUpperCase()}
              </CyDText>
            </CyDView>

            <CyDView className='pt-[15px]'>
              <CyDFastImage
                source={AppImages.CARD_BLOCKED}
                className='h-[50px] w-[50px] mx-auto'
              />
              <CyDText
                className={clsx(
                  'font-nunito font-bold text-[16px] m-[10px] blur-md text-center',
                  { 'text-white': card.type !== 'physical' },
                )}>
                {t<string>('CARD_LOCKED')}
              </CyDText>
            </CyDView>
            <CyDView className=' bg-black border-[1px] border-black p-[5px] rounded-l-[50px] mr-[0.7px] w-[45px] absolute right-0 top-[41%]'>
              <CyDTouchView
                onPress={() =>
                  navigation.navigate(screenTitle.CARD_SETTINGS_SCREEN, {
                    onSuccess: (data: any, cardProvider: CardProviders) => {
                      void sendCardDetails(data, cardProvider);
                    },
                    currentCardProvider,
                    card,
                  })
                }>
                <CyDFastImage
                  source={{
                    uri: 'https://public.cypherd.io/icons/settings_outline.png',
                  }}
                  className='h-[20px] w-[20px] mx-[3px]'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
        )}
      </CyDAnimatedView>
    );
  };

  const cardsWithUpgrade = useMemo(() => {
    const actualCards = userCardDetails.cards.map(card => card);
    if (
      (currentCardProvider === CardProviders.PAYCADDY &&
        lifetimeLoadUSD < physicalCardEligibilityLimit) ||
      upgradeToPhysicalAvailable
    ) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'pc',
        status: 'upgradeAvailable',
        type: 'physical',
      });
    }
    return actualCards;
  }, [currentCardProvider, upgradeToPhysicalAvailable, userCardDetails.cards]);

  return (
    <CardCarousel
      boxWidthMultiplier={0.8}
      cardsData={cardsWithUpgrade}
      renderItem={renderItem}
      onCardChange={setUpgradeCorrectedCardIndex}
    />
  );
}
