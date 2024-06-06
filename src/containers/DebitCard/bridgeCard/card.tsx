import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { GlobalContext } from '../../../core/globalContext';
import { screenTitle } from '../../../constants';
import { copyToClipboard, limitDecimalPlaces } from '../../../core/util';
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
  CyDImage,
  CyDImageBackground,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import useAxios from '../../../core/HttpRequest';
import { CardProviders, CardStatus, CardType } from '../../../constants/enum';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { Card } from '../../../models/card.model';
import { get, orderBy } from 'lodash';
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
import CardDetailsModal from '../../../components/v2/card/cardDetailsModal';

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
  setCurrentCardProvider,
  onPressUpgradeNow,
  onPressActivateCard,
}: {
  navigation: any;
  currentCardProvider: string;
  setCurrentCardProvider: Dispatch<SetStateAction<string>>;
  onPressUpgradeNow: () => void;
  onPressActivateCard: (card: any) => void;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const {
    lifetimeAmountUsd: lifetimeLoadUSD,
    pc: {
      isPhysicalCardEligible: upgradeToPhysicalAvailable = false,
      physicalCardUpgradationFee,
    } = {},
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
  const isUpgradeToPhysicalCardStatusShown =
    currentCardProvider === CardProviders.PAYCADDY &&
    lifetimeLoadUSD < physicalCardEligibilityLimit &&
    !cardProfile[currentCardProvider]?.cards
      ?.map(card => card.type)
      .includes(CardType.PHYSICAL);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(
    isUpgradeToPhysicalCardStatusShown || upgradeToPhysicalAvailable ? 1 : 0,
  );
  const setUpgradeCorrectedCardIndex = (index: number) => {
    // is upgradeToPhysicalAvailable is true, the prompting card will be at index -1.
    // const newIndex =
    //   upgradeToPhysicalAvailable || isUpgradeToPhysicalCardStatusShown
    //     ? index - 1
    //     : index;
    console.log(cardsWithUpgrade, index);
    setCurrentCardIndex(index);
  };
  const { postWithAuth } = useAxios();
  const currentTimestamp = String(new Date().getDay());

  useEffect(() => {
    if (isFocused && currentCardProvider !== '') {
      const { type }: { last4: string; type: string } =
        cardProfile[currentCardProvider].cards[0];
      setUserCardDetails({
        ...userCardDetails,
        hideCardDetails: true,
        showCVVAndExpiry: false,
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
      setUserCardDetails({
        ...userCardDetails,
        isFetchingCardDetails: true,
      });
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
    if (
      currentCardProvider === CardProviders.PAYCADDY &&
      card.type === CardType.PHYSICAL
    ) {
      if (card.status === 'upgradeAvailable' && upgradeToPhysicalAvailable) {
        return (
          'https://public.cypherd.io/icons/upgradeToPhysicalCardAvailableCardLayout.png?t=' +
          currentTimestamp
        );
      }
      return (
        'https://public.cypherd.io/icons/masterCardLayoutPhysical.png?t=' +
        currentTimestamp
      );
    }
    if (card.type === CardType.VIRTUAL) {
      if (
        card.status === 'upgradeAvailable' &&
        isUpgradeToPhysicalCardStatusShown
      ) {
        return (
          'https://public.cypherd.io/icons/isUpgradeToPhysicalCardStatusShownCardLayout.png?t=' +
          currentTimestamp
        );
      }
      return (
        'https://public.cypherd.io/icons/masterCardLayout.png?t=' +
        currentTimestamp
      );
    }
  };

  const RenderCVVAndExpiry = useCallback(
    ({ card }: { card: Card }) => {
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
        const {
          currentCardRevealedDetails,
          hideCardDetails,
          showCVVAndExpiry,
        } = userCardDetails;
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
    },
    [userCardDetails],
  );

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
    const card = item;
    return (
      <CyDImageBackground
        className='h-[200px] w-[300px] ml-[45px]'
        resizeMode='stretch'
        source={
          card.type === CardType.VIRTUAL
            ? AppImages.VIRTUAL_CARD_MASTER
            : AppImages.PHYSICAL_CARD_MASTER
        }
      />
    );
  };

  // const RenderCard = ({
  //   item,
  //   index,
  //   boxWidth,
  //   halfBoxDistance,
  //   panX,
  // }: {
  //   item: Card;
  //   index: number;
  //   boxWidth: number;
  //   halfBoxDistance: number;
  //   panX: SharedValue<number>;
  // }) => {
  //   const card = item;
  //   const {
  //     isFetchingCardDetails,
  //     currentCardRevealedDetails,
  //     hideCardDetails,
  //   } = userCardDetails;

  //   if (card.type === 'physical' && card.status === 'pendingActivation') {
  //     return (
  //       <CyDAnimatedView className='mb-[10px]'>
  //         <CyDFastImage
  //           className={clsx('absolute w-[300px] h-[200px]')}
  //           source={{ uri: getCardBackgroundLayout(card) }}
  //           resizeMode='stretch'
  //         />
  //         <CyDView className='flex flex-col justify-center h-[200px] w-[300px] border-[1px] border-inputBorderColor rounded-[12px]'>
  //           <CyDTouchView
  //             onPress={() => onPressActivateCard(card)}
  //             className='flex flex-row justify-center items-center border-[2px] border-inputBorderColor bg-inputBorderColor mx-[30px] p-[5px] rounded-[10px]'>
  //             <CyDFastImage
  //               source={AppImages.ACTIVATE_PHYSICAL_CARD}
  //               className='h-[30px] w-[30px] mr-[10px]'
  //             />
  //             <CyDText className='font-nunito font-extrabold'>
  //               {t<string>('ACTIVATE_PYHSICAL_CARD')}
  //             </CyDText>
  //           </CyDTouchView>
  //           <CyDText className='text-center pt-[6px] font-bold'>
  //             {'XXXX XXXX XXXX ' + card.last4}
  //           </CyDText>
  //         </CyDView>
  //       </CyDAnimatedView>
  //     );
  //   }

  //   if (card.status === 'upgradeAvailable') {
  //     if (card.type === CardType.VIRTUAL) {
  //       return (
  //         <CyDAnimatedView className='mb-[12px]'>
  //           <CyDFastImage
  //             className={clsx('absolute w-full h-full')}
  //             source={{ uri: getCardBackgroundLayout(card) }}
  //             resizeMode='stretch'
  //           />
  //           <CyDView className='flex flex-col items-center justify-center h-[200px] w-[300px] border-[1px] border-inputBorderColor rounded-[12px]'>
  //             <CyDView className='flex flex-row my-[5px]'>
  //               <CyDText className='bottom-[16px] text-white text-[18px] font-extrabold rounded-[8px]'>
  //                 {t('UPGRADE_TO_PHYSICAL_CARD')}
  //               </CyDText>
  //             </CyDView>
  //             <CyDView className='flex flex-row w-[75%] justify-between items-center mx-[30px]'>
  //               <CyDText className='text-white text-[12px] font-semibold rounded-[8px]'>
  //                 {`$${lifetimeLoadUSD}`}
  //               </CyDText>
  //               <CyDText className='text-white text-[18px] font-extrabold rounded-[8px]'>
  //                 {`$${physicalCardEligibilityLimit}`}
  //               </CyDText>
  //             </CyDView>
  //             <CyDView className='flex flex-row h-[8px] w-[75%] justify-start items-center border border-inputBorderColor bg-white mx-[30px] rounded-[8px]'>
  //               <CyDView
  //                 className={clsx(
  //                   'absolute bg-toastColor h-full rounded-[8px] my-[5px]',
  //                   {
  //                     'bg-appColor':
  //                       parseFloat(physicalCardEligibilityProgress) <= 60,
  //                   },
  //                   {
  //                     'bg-redColor':
  //                       parseFloat(physicalCardEligibilityProgress) <= 30,
  //                   },
  //                 )}
  //                 style={{
  //                   width: `${physicalCardEligibilityProgress}%`,
  //                 }}
  //               />
  //             </CyDView>
  //             {lifetimeLoadUSD < physicalCardEligibilityLimit && (
  //               <CyDView className='flex flex-row my-[5px] top-[20px]'>
  //                 <CyDText className='mb-[4px] text-white'>{`Load `}</CyDText>
  //                 <CyDText className='mb-[4px] font-extrabold text-appColor'>
  //                   {limitDecimalPlaces(
  //                     physicalCardEligibilityLimit - lifetimeLoadUSD,
  //                     2,
  //                   )}
  //                 </CyDText>
  //                 <CyDText className='mb-[4px] font-extrabold text-appColor'>{` USD`}</CyDText>
  //                 <CyDText className='mb-[4px] text-white'>{` more to upgrade`}</CyDText>
  //               </CyDView>
  //             )}
  //           </CyDView>
  //         </CyDAnimatedView>
  //       );
  //     } else if (card.type === CardType.PHYSICAL) {
  //       return (
  //         <CyDAnimatedView className='mb-[12px]'>
  //           <CyDFastImage
  //             className={clsx('absolute w-[300px] h-full object-cover')}
  //             source={{ uri: getCardBackgroundLayout(card) }}
  //           />
  //           <CyDView className='flex flex-col items-center justify-end py-[10px] h-[200px] w-[300px] border-[1px] border-inputBorderColor rounded-[12px] shadow shadow-slate-200'>
  //             <CyDTouchView
  //               disabled={!upgradeToPhysicalAvailable}
  //               onPress={() => {
  //                 onPressUpgradeNow();
  //               }}
  //               className={clsx(
  //                 'flex flex-row justify-center items-center border border-inputBorderColor bg-white rounded-[8px] px-[12px]',
  //               )}>
  //               <CyDFastImage
  //                 source={AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW}
  //                 className='h-[30px] w-[30px] mr-[8px] my-[5px]'
  //               />
  //               <CyDText className='font-nunito font-extrabold my-[5px]'>
  //                 {t<string>('UPGRADE_PHYSICAL_CARD')}
  //                 {' for '}
  //                 {'$' + String(physicalCardUpgradationFee ?? 0)}
  //               </CyDText>
  //             </CyDTouchView>
  //           </CyDView>
  //         </CyDAnimatedView>
  //       );
  //     }
  //   }

  //   return (
  //     <CyDAnimatedView
  //       className={clsx(
  //         'flex flex-col justify-center h-[200px] rounded-[8px] mb-[10px] w-[300px]',
  //         {
  //           'border border-inputBorderColor': card.type === 'physical',
  //         },
  //       )}>
  //       <CyDFastImage
  //         className={clsx('absolute w-full h-full')}
  //         source={{ uri: getCardBackgroundLayout(card) }}
  //         resizeMode='stretch'
  //       />
  //       {isFetchingCardDetails &&
  //       card.cardId === currentCardRevealedDetails.cardId ? (
  //         <CyDFastImage
  //           source={{
  //             uri: 'https://public.cypherd.io/icons/details_loading.png',
  //           }}
  //           className='h-[50px] w-[50px] self-center'
  //           resizeMode='contain'
  //         />
  //       ) : card.status === CardStatus.ACTIVE ? (
  //         <CyDView className='flex-1 flex-col justify-between'>
  //           <CyDView>
  //             <CyDText
  //               className={clsx('font-nunito font-bold text-[16px] m-[10px]', {
  //                 'text-white': card.type !== 'physical',
  //               })}>
  //               {card.type.toUpperCase()}
  //             </CyDText>
  //           </CyDView>
  //           <CyDView className='flex flex-row justify-between items-center'>
  //             <CyDView className='flex flex-row items-center'>
  //               <CyDView>
  //                 <CyDText
  //                   className={clsx(
  //                     'font-nunito font-bold text-[16px] m-[10px]',
  //                     { 'text-white': card.type !== 'physical' },
  //                   )}>
  //                   {getCardNumber(card)}
  //                 </CyDText>
  //               </CyDView>
  //               {!hideCardDetails &&
  //                 currentCardRevealedDetails.cardId === card.cardId && (
  //                   <CyDTouchView onPress={() => copyCardNumber()}>
  //                     <CyDFastImage
  //                       source={{
  //                         uri: `https://public.cypherd.io/icons/${
  //                           card.type === 'physical'
  //                             ? 'copyBlack.png'
  //                             : 'copy.png'
  //                         }`,
  //                       }}
  //                       className='h-[20px] w-[20px] ml-[5px]'
  //                       resizeMode='contain'
  //                     />
  //                   </CyDTouchView>
  //                 )}
  //             </CyDView>
  //             <CyDView className='flex flex-row justify-start bg-black border-[1px] border-black p-[5px] rounded-l-[50px] mr-[0.7px]'>
  //               {card.type === CardType.VIRTUAL && (
  //                 <CyDTouchView onPress={toggleCardDetails}>
  //                   <CyDFastImage
  //                     source={{
  //                       uri: `https://public.cypherd.io/icons/${
  //                         !hideCardDetails &&
  //                         currentCardRevealedDetails.cardId === card.cardId
  //                           ? 'reveal.png'
  //                           : 'hide.png'
  //                       }`,
  //                     }}
  //                     className='h-[21px] w-[21px] ml-[5px] mr-[10px]'
  //                     resizeMode='contain'
  //                   />
  //                 </CyDTouchView>
  //               )}
  //               {['physical', 'virtual'].includes(card.type) && (
  //                 <CyDTouchView
  //                   onPress={() =>
  //                     navigation.navigate(screenTitle.CARD_SETTINGS_SCREEN, {
  //                       currentCardProvider,
  //                       card,
  //                     })
  //                   }>
  //                   <CyDFastImage
  //                     source={{
  //                       uri: 'https://public.cypherd.io/icons/settings_outline.png',
  //                     }}
  //                     className='h-[20px] w-[20px] mx-[3px]'
  //                   />
  //                 </CyDTouchView>
  //               )}
  //             </CyDView>
  //           </CyDView>
  //           <RenderCVVAndExpiry card={card} />
  //         </CyDView>
  //       ) : (
  //         <CyDView className='w-full h-full'>
  //           <CyDView>
  //             <CyDText
  //               className={clsx('font-nunito font-bold text-[16px] m-[10px]', {
  //                 'text-white': card.type !== 'physical',
  //               })}>
  //               {card.type.toUpperCase()}
  //             </CyDText>
  //           </CyDView>

  //           <CyDView className='pt-[15px]'>
  //             <CyDFastImage
  //               source={AppImages.CARD_BLOCKED}
  //               className='h-[50px] w-[50px] mx-auto'
  //             />
  //             <CyDText
  //               className={clsx(
  //                 'font-nunito font-bold text-[16px] m-[10px] blur-md text-center',
  //                 { 'text-white': card.type !== 'physical' },
  //               )}>
  //               {t<string>('CARD_LOCKED')}
  //             </CyDText>
  //           </CyDView>
  //           <CyDView className=' bg-black border-[1px] border-black p-[5px] rounded-l-[50px] mr-[0.7px] w-[45px] absolute right-0 top-[41%]'>
  //             <CyDTouchView
  //               onPress={() =>
  //                 navigation.navigate(screenTitle.CARD_SETTINGS_SCREEN, {
  //                   currentCardProvider,
  //                   card,
  //                 })
  //               }>
  //               <CyDFastImage
  //                 source={{
  //                   uri: 'https://public.cypherd.io/icons/settings_outline.png',
  //                 }}
  //                 className='h-[20px] w-[20px] mx-[3px]'
  //               />
  //             </CyDTouchView>
  //           </CyDView>
  //         </CyDView>
  //       )}
  //     </CyDAnimatedView>
  //   );
  // };

  const cardsWithUpgrade = useMemo(() => {
    const actualCards = userCardDetails.cards.map(card => card);
    if (upgradeToPhysicalAvailable) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'pc',
        status: 'upgradeAvailable',
        type: CardType.PHYSICAL,
      });
    } else if (isUpgradeToPhysicalCardStatusShown) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'pc',
        status: 'upgradeAvailable',
        type: CardType.VIRTUAL,
      });
    }
    return actualCards;
  }, [currentCardProvider, upgradeToPhysicalAvailable, userCardDetails.cards]);

  return (
    <CyDView>
      <CardCarousel
        boxWidthMultiplier={0.8}
        cardsData={cardsWithUpgrade}
        renderItem={renderItem}
        onCardChange={setUpgradeCorrectedCardIndex}
      />
      {cardsWithUpgrade && (
        <RenderCardActions
          card={get(cardsWithUpgrade, currentCardIndex)}
          cardProvider={currentCardProvider}
          navigation={navigation}
        />
      )}
    </CyDView>
  );
}

const RenderCardActions = ({
  card,
  cardProvider,
  navigation,
}: {
  card: Card;
  cardProvider: string;
  navigation: any;
}) => {
  const { t } = useTranslation();
  const { postWithAuth } = useAxios();
  const [cardDetails, setCardDetails] =
    useState<CardSecrets>(initialCardDetails);
  const [showCardDetailsModal, setShowCardDetailsModal] =
    useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();

  if (card) {
    const { type, last4, status, cardId } = card;

    const validateReuseToken = async () => {
      const cardRevealReuseToken = await getCardRevealReuseToken(cardId);
      if (cardRevealReuseToken) {
        const verifyReuseTokenUrl = `/v1/cards/${cardProvider}/card/${String(
          cardId,
        )}/verify/reuse-token`;
        const payload = { reuseToken: cardRevealReuseToken };
        try {
          const response = await postWithAuth(verifyReuseTokenUrl, payload);
          if (!response.isError) {
            void sendCardDetails(response.data);
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

    const verifyWithOTP = () => {
      navigation.navigate(screenTitle.BRIDGE_CARD_REVEAL_AUTH_SCREEN, {
        onSuccess: (data: any, cardProvider: CardProviders) => {
          void sendCardDetails(data);
        },
        currentCardProvider: cardProvider,
        card,
        triggerOTPParam: 'verify/show-token',
        verifyOTPPayload: { isMobile: true },
      });
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
        if (response?.data.result) {
          const { result } = response.data;
          const cardDetails = {
            cvv: result.cvv,
            expiryMonth: result.expDate.slice(-2),
            expiryYear: result.expDate.slice(0, 4),
            cardNumber: result.pan.match(/.{1,4}/g).join(' '),
          };
          setCardDetails(cardDetails);
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
    return (
      <CyDView>
        <CardDetailsModal
          isModalVisible={showCardDetailsModal}
          setShowModal={setShowCardDetailsModal}
          cardDetails={cardDetails}
        />

        <CyDView className='flex flex-row justify-center items-center mb-[12px] mt-[-32px]'>
          <CyDText className='font-bold text-[18px]'>
            {t<string>(
              type === CardType.VIRTUAL ? 'VIRTUAL_CARD' : 'PHYSICAL_CARD',
            )}
          </CyDText>
          <CyDText className='font-bold text-[18px]'>
            {' xxxx ' + last4}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row justify-around items-center'>
          <CyDTouchView
            className='flex lfex-col justify-center items-center'
            onPress={() => {
              void validateReuseToken();
            }}>
            <CyDView className='bg-appColor p-[12px] rounded-[50px]'>
              <CyDImage
                source={AppImages.MANAGE_CARD}
                className='h-[26px] w-[26px]'
                resizeMode='contain'
              />
            </CyDView>
            <CyDView className='mt-[4px]'>
              <CyDText className='font-semibold'>{'Card Details'}</CyDText>
            </CyDView>
          </CyDTouchView>
          <CyDView className='flex lfex-col justify-center items-center'>
            <CyDView className='bg-appColor p-[12px] rounded-[50px]'>
              <CyDImage
                source={
                  status === CardStatus.ACTIVE
                    ? AppImages.CYPHER_LOCKED
                    : AppImages.UNLOCK
                }
                className='h-[26px] w-[26px]'
                resizeMode='contain'
              />
            </CyDView>
            <CyDView className='mt-[4px]'>
              <CyDText className='font-semibold'>
                {status === CardStatus.ACTIVE ? 'Lock' : 'Unlock'}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex lfex-col justify-center items-center'>
            <CyDView className='bg-appColor p-[12px] rounded-[50px]'>
              <CyDImage
                source={AppImages.MORE}
                className='h-[26px] w-[26px] accent-black rotate-90'
                resizeMode='contain'
              />
            </CyDView>
            <CyDView className='mt-[4px]'>
              <CyDText className='font-semibold'>{'Options'}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    );
  }
  return <></>;
};
