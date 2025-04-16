import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardDesignCardMetaData } from '../../../../models/cardDesign.interface';
import {
  CardProviders,
  CardType,
  CypherPlanId,
} from '../../../../constants/enum';
import { CardProfile } from '../../../../models/cardProfile.model';
import { get } from 'lodash';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../../assets/images/appImages';
import LinearGradient from 'react-native-linear-gradient';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import { screenTitle } from '../../../../constants';
import { MODAL_HIDE_TIMEOUT } from '../../../../core/Http';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import SelectPlanModal from '../../../../components/selectPlanModal';
import {
  AnalyticEvent,
  logAnalyticsToFirebase,
} from '../../../../core/analytics';
import useCardUtilities from '../../../../hooks/useCardUtilities';
import { IPlanData } from '../../../../models/planData.interface';
import Loading from '../../../../containers/Loading';

interface RouteParams {
  cardMetaData: CardDesignCardMetaData;
  currentCardProvider: CardProviders;
  cardType: CardType;
  price: number;
  cardBalance: number;
}

const getCardImage = (type: CardType, designId: string) => {
  const cardType = type === CardType.VIRTUAL ? 'virtual' : 'physical';
  const cardImage = `${CYPHER_CARD_IMAGES}/${cardType}-${designId}.png`;
  return {
    uri: cardImage,
  };
};

const GetCardArrivingDuration = ({ cardType }: { cardType: CardType }) => {
  if (cardType === CardType.VIRTUAL) {
    return (
      <CyDText className='text-green400 font-semibold text-[14px]'>
        {t('GET_INSTANTLY')}
      </CyDText>
    );
  }
  return (
    <CyDText className='text-n200 font-normal text-[14px]'>
      {t('ARRIVES_IN_WEEKS')}
    </CyDText>
  );
};

const getCardDescription = (cardType: CardType) => {
  if (cardType === CardType.VIRTUAL) {
    return t('VIRTUAL_CARD_DESCRIPTION');
  } else if (cardType === CardType.PHYSICAL) {
    return t('PHYSICAL_CARD_DESCRIPTION');
  } else if (cardType === CardType.METAL) {
    return t('METAL_CARD_DESCRIPTION');
  }
  return '';
};

const GetWeightAndCardType = ({ cardType }: { cardType: CardType }) => {
  if (cardType === CardType.VIRTUAL) {
    return (
      <CyDView className='py-[16px] self-center flex flex-row items-center gap-x-[4px]'>
        <CyDIcons name='card-filled' size={20} className='text-base400' />
        <CyDText className='text-[12px] font-medium text-base400'>
          {'Virtual Card'}
        </CyDText>
      </CyDView>
    );
  } else {
    return (
      <CyDView className='flex flex-row justify-evenly'>
        <CyDView className='flex flex-row items-center gap-x-[4px] justify-center py-[16px] '>
          <CyDIcons name='balance-scale' size={20} className='text-base400' />
          <CyDText className='text-[12px] font-medium text-base400'>
            {cardType === CardType.PHYSICAL ? '5.2 grams' : '12 grams'}
          </CyDText>
        </CyDView>
        <CyDView className='w-[1px] h-full bg-n30' />
        <CyDView className='flex flex-row items-center gap-x-[4px] justify-center py-[16px] '>
          <CyDIcons name='card-filled' size={20} className='text-base400' />
          <CyDText className='text-[12px] font-medium text-base400'>
            {cardType === CardType.PHYSICAL
              ? t('PHYSICAL_CARD')
              : t('METAL_CARD')}
          </CyDText>
        </CyDView>
      </CyDView>
    );
  }
};

const RenderPremiumScale = ({
  premiumScale = 25,
}: {
  premiumScale: number;
}) => {
  return (
    <CyDView className=''>
      <CyDText className='text-[14px] font-medium text-base400'>
        {t('PREMIUM_SCALE')}
      </CyDText>
      <CyDView className='flex-1 flex-row h-[10px] w-full mt-[32px]'>
        <LinearGradient
          colors={['#D9D9D9', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}>
          <CyDView className={`w-[${(300 * premiumScale) / 100}px]`} />
        </LinearGradient>
        <CyDView className={`w-[${100 - premiumScale}%] bg-[#EBEDF0]`} />
      </CyDView>
      <CyDView className='flex-1 flex-row justify-between mt-[6px]'>
        <CyDText className='text-n200 font-normal text-[12px]'>
          {t('CORE_PREMIUM')}
        </CyDText>
        <CyDText className='text-n200 font-normal text-[12px]'>
          {t('ULTRA_HIGH_END')}
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default function CardDescription() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { top } = useSafeAreaInsets();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const { showModal, hideModal } = useGlobalModalContext();
  const { getPlanData } = useCardUtilities();

  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [openComparePlans, setOpenComparePlans] = useState(false);
  const [planData, setPlanData] = useState<IPlanData | null>(null);

  const cardProfile: CardProfile | undefined = globalState?.cardProfile;
  const proPlanData = useMemo(
    () => get(planData, ['default', CypherPlanId.PRO_PLAN]),
    [planData],
  );
  const [loading, setLoading] = useState(false);

  const { currentCardProvider, cardMetaData, cardType, price, cardBalance } =
    route.params;
  const isPremiumPlan =
    get(cardProfile, ['planInfo', 'planId'], '') === CypherPlanId.PRO_PLAN;
  const cardId = get(cardProfile, [currentCardProvider, 'cards', 0, 'cardId']);

  useEffect(() => {
    void loadPlanData();
  }, []);

  const loadPlanData = async () => {
    setLoading(true);
    const data = await getPlanData(globalState.token);
    setPlanData(data);
    setLoading(false);
  };

  const onPressFundCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      navigation,
      currentCardProvider,
      currentCardIndex: 0,
    });
  };

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      onPressFundCard();
    }, MODAL_HIDE_TIMEOUT);
  }

  const onSelectCard = () => {
    if (Number(cardBalance) < Number(price)) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: `You do not have $${String(price)} balance to get this card. Please load now to get this card`,
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
    } else {
      logAnalyticsToFirebase(AnalyticEvent.GET_NEW_CARD, {
        from: 'get_new_card',
        type: cardType,
        price,
        address: cardProfile?.primaryEthAddress,
      });
      const screenName =
        cardType === CardType.VIRTUAL
          ? screenTitle.SHIPPING_CHECKOUT_SCREEN
          : screenTitle.VERIFY_SHIPPING_ADDRESS_SCREEN;
      navigation.navigate(screenName, {
        currentCardProvider,
        cardType,
      });
    }
  };

  return loading ? (
    <Loading loadingText='' />
  ) : (
    <CyDView className='bg-n20 flex-1' style={{ paddingTop: top }}>
      <CyDTouchView
        onPress={() => navigation.goBack()}
        className='w-[32px] h-[32px] bg-n40 rounded-full flex items-center justify-center mx-[16px]'>
        <CyDMaterialDesignIcons
          name='arrow-left'
          size={20}
          className='text-base400 '
        />
      </CyDTouchView>

      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        openComparePlans={openComparePlans}
        cardProvider={currentCardProvider}
        cardId={cardId}
        onPlanChangeSuccess={() => {
          navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
        }}
      />

      <CyDView className='mt-[15px] mb-[16px] rounded-xl shadow-xl px-[16px]'>
        <CyDFastImage
          source={getCardImage(cardType, cardMetaData.id)}
          className='w-full h-[250px]'
          resizeMode='contain'
        />
      </CyDView>

      <CyDView className='flex-1 flex flex-col justify-between'>
        <CyDView className='flex-1 px-[16px]'>
          <CyDScrollView
            className='h-full'
            showsVerticalScrollIndicator={false}>
            <CyDView className='bg-n0 rounded-xl'>
              <CyDView className='px-[24px] py-[12px]'>
                <CyDText className='text-[13px] font-medium text-n200'>
                  {getCardDescription(cardType)}
                </CyDText>
              </CyDView>
              <CyDView className='w-full h-[1px] bg-n30' />
              <GetWeightAndCardType cardType={cardType} />
            </CyDView>
            {cardType === CardType.METAL && (
              <CyDView className='bg-n0 rounded-xl mt-[16px] p-[24px]'>
                <RenderPremiumScale premiumScale={35} />
              </CyDView>
            )}

            <CyDView className='mt-[16px] '>
              <CyDText className='text-[14px] font-bold mb-[8px]'>
                {t('FEATURES')}
              </CyDText>
              <CyDView className='bg-n0 rounded-t-xl p-[24px]'>
                {/* apple and google pay */}
                <CyDView className='flex flex-row gap-x-[4px]'>
                  <CyDIcons
                    name='apple-google-icon'
                    size={24}
                    className='text-base400'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-[14px] font-semibold text-base400'>
                      {t('APPLE_GOOGLE_PAY')}
                    </CyDText>
                    <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                      {t('APPLE_GOOGLE_PAY_DESCRIPTION')}
                    </CyDText>
                  </CyDView>
                </CyDView>
                {/* atm withdraw */}
                <CyDView className='flex flex-row  gap-x-[4px] mt-[16px]'>
                  <CyDIcons
                    name='atm-cash'
                    size={24}
                    className='text-base400'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-[14px] font-semibold text-base400'>
                      {t('ATM_WITHDRAWALS')}
                    </CyDText>
                    <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                      {t('ATM_WITHDRAWALS_DESCRIPTION')}
                    </CyDText>
                  </CyDView>
                </CyDView>
                {/* multiple countries */}
                <CyDView className='flex flex-row gap-x-[4px] mt-[16px]'>
                  <CyDMaterialDesignIcons
                    name='earth'
                    size={24}
                    className='text-base400'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-[14px] font-semibold text-base400'>
                      {t('MULTIPLE_COUNTRIES')}
                    </CyDText>
                    <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                      {t('MULTIPLE_COUNTRIES_DESCRIPTION')}
                    </CyDText>
                  </CyDView>
                </CyDView>
                {/* multiple countries */}
                {/* <CyDView className='flex flex-row  gap-x-[4px] mt-[16px]'>
                  <CyDIcons
                    name='paypal-icon'
                    size={24}
                    className='text-base400'
                  />
                  <CyDView className='flex-1'>
                    <CyDText className='text-[14px] font-semibold text-base400'>
                      {t('PAY_PAL_VISA_DIRECT')}
                    </CyDText>
                    <CyDText className='text-[12px] font-normal text-n100 flex-wrap'>
                      {t('PAY_PAL_VISA_DIRECT_DESCRIPTION')}
                    </CyDText>
                  </CyDView>
                </CyDView> */}
              </CyDView>
            </CyDView>
          </CyDScrollView>
        </CyDView>
        <CyDView className='justify-end'>
          {!isPremiumPlan && cardType === CardType.METAL ? (
            <>
              <CyDView className='bg-p10 shadow-lg rounded-t-[18px] pb-[32px] px-[16px] pt-[16px]'>
                <CyDText className='text-[12px] font-bold text-center mx-[20px]'>
                  {`Unlock this metal card with our premium plan! Sign up now for just $${proPlanData?.cost} and get the metal card for free.`}
                </CyDText>
                <CyDView className='mt-[12px] flex flex-row justify-evenly items-center'>
                  <CyDTouchView
                    className='flex flex-row items-center justify-center bg-n0 px-[10px] py-[6px] rounded-full w-[45%] mr-[12px]'
                    onPress={() => setPlanChangeModalVisible(true)}>
                    <CyDText className='text-[14px] font-extrabold mr-[2px]'>
                      {'Go'}
                    </CyDText>
                    <CyDFastImage
                      source={AppImages.PREMIUM_TEXT_GRADIENT}
                      className='w-[60px] h-[10px]'
                    />
                  </CyDTouchView>
                  <CyDTouchView
                    className=' bg-n0 px-[10px] py-[6px] rounded-full w-[45%]'
                    onPress={() => {
                      setOpenComparePlans(true);
                      setPlanChangeModalVisible(true);
                    }}>
                    <CyDText className=' text-center text-[14px] font-semibold text-n100 mr-[2px]'>
                      {t('COMPARE_PLANS')}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </>
          ) : (
            <>
              <CyDView className='bg-n0 items-center shadow-lg rounded-t-[18px] pb-[32px] px-[16px] pt-[16px] w-full'>
                <CyDView className='flex flex-row justify-between items-center w-full'>
                  <CyDView className='flex flex-row items-center gap-x-[4px]'>
                    <CyDText className='font-bold text-[28px]'>{`$${price}`}</CyDText>
                    <CyDText className='font-semibold text-[14px] text-n200'>
                      {t('PER_CARD')}
                    </CyDText>
                  </CyDView>
                  <GetCardArrivingDuration cardType={cardType} />
                </CyDView>
                <CyDView className='w-full mt-[8px]'>
                  <Button
                    onPress={onSelectCard}
                    title={
                      cardType === CardType.METAL && price > 0
                        ? t('COMING_SOON')
                        : t('GET_THIS_CARD')
                    }
                    disabled={cardType === CardType.METAL && price > 0}
                  />
                </CyDView>
              </CyDView>
            </>
          )}
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
