import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  CyDIcons,
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { t } from 'i18next';
import AppImages from '../../../../assets/images/appImages';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Button from '../../../components/v2/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../../models/card.model';
import { CardProviders } from '../../../constants/enum';
import { capitalize, get, round } from 'lodash';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import CyDModalLayout from '../../../components/v2/modal';
import { StyleSheet } from 'react-native';
import Loading from '../../../components/v2/loading';
import Slider from '../../../components/v2/slider';
import { CyDIconsPack } from '../../../customFonts';
import SaveChangesModal from '../../../components/v2/saveChangesModal';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: Card;
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loader: {
    height: 22,
    width: 22,
  },
});

const ImpactModal = ({
  isModalVisible,
  setIsModalVisible,
  dailyLimit,
  changeLimits,
  setShowSaveChangesModal,
}: {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  dailyLimit: number;
  changeLimits?: () => Promise<void>;
  setShowSaveChangesModal?: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <CyDView className='bg-n0 p-[16px] rounded-t-[16px]'>
        <CyDView className='flex flex-row justify-between item-center'>
          <CyDImage
            source={AppImages.CYPHER_WARNING_RED}
            className='w-[28px] h-[28px]'
          />
          <CyDTouchView
            onPress={() => {
              setIsModalVisible(false);
            }}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDText className='mt-[4px] font-bold text-[20px]'>
          {'Impact Information'}
        </CyDText>
        <CyDText className='text-[14px] mt-[15px]'>
          {`Your domestic and international transaction limits will be limited to `}
          <CyDText className='font-bold'>{`$${dailyLimit}`}</CyDText>
          {` per transaction based on your daily spending limit `}
          <CyDText className='font-bold'>{`$${dailyLimit}.`}</CyDText>
          {`  Please plan your spending accordingly!`}
        </CyDText>
        <CyDView className='my-[16px]'>
          <Button
            title={'Confirm & Set Usage limit'}
            onPress={() => {
              setIsModalVisible(false);

              setTimeout(() => {
                if (setShowSaveChangesModal) {
                  setShowSaveChangesModal(true);
                }
              }, 300);
            }}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
};

export default function EditLimits() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { currentCardProvider, card } = route.params;
  const insets = useSafeAreaInsets();
  const { getWithAuth, patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const [limitsData, setLimitsData] = useState<any>({});
  const [dailyUsageLimit, setDailyUsageLimit] = useState(0);
  const [monthlyUsageLimit, setMonthlyUsageLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [showSaveChangesModal, setShowSaveChangesModal] = useState(false);

  const getLimits = async () => {
    setPageLoading(true);
    const { isError, error, data } = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
    );

    setPageLoading(false);
    if (!isError) {
      setLimitsData(data);
      if (get(data, 'advL')) {
        setDailyUsageLimit(get(data, ['advL', 'd']));
        setMonthlyUsageLimit(get(data, ['advL', 'm']));
      } else {
        setDailyUsageLimit(get(data, ['planLimit', 'd']));
        setMonthlyUsageLimit(get(data, ['planLimit', 'm']));
      }
    } else {
      showModal('state', {
        type: 'error',
        title: 'Error fetching limits',
        description: error?.message ?? t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: () => {
          hideModal();
          navigation.goBack();
        },
        onFailure: hideModal,
      });
    }
  };

  useEffect(() => {
    void getLimits();
  }, []);

  const changeLimits = async (applyToAllCards = false) => {
    setShowSaveChangesModal(false);
    setLoading(true);
    const { isError, error } = await patchWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
      {
        advL: {
          d: round(dailyUsageLimit),
          m: round(monthlyUsageLimit),
        },
        ...(applyToAllCards && {
          forAllCards: true,
        }),
      },
    );
    setLoading(false);

    console.log('payload : ', {
      advL: {
        d: round(dailyUsageLimit),
        m: round(monthlyUsageLimit),
      },
      ...(applyToAllCards && {
        forAllCards: true,
      }),
    });

    if (isError) {
      showModal('state', {
        type: 'error',
        title: 'Error changing limits',
        description: error?.message ?? t('PLEASE_CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      showModal('state', {
        type: 'success',
        title: 'Limits changed successfully',
        onSuccess: () => {
          void getLimits();
          hideModal();
        },
        onFailure: hideModal,
      });
    }
  };

  if (pageLoading) {
    return <Loading />;
  }

  return (
    <CyDView
      className='flex flex-col justify-between h-full bg-n0 text-base400'
      style={{ paddingTop: insets.top }}>
      <SaveChangesModal
        isModalVisible={showSaveChangesModal}
        setIsModalVisible={setShowSaveChangesModal}
        card={card}
        onApplyToAllCards={() => {
          void changeLimits(true);
        }}
        onApplyToCard={() => {
          void changeLimits();
        }}
      />
      <ImpactModal
        isModalVisible={showImpactModal}
        setIsModalVisible={setShowImpactModal}
        dailyLimit={dailyUsageLimit}
        setShowSaveChangesModal={setShowSaveChangesModal}
      />

      <CyDTouchView
        className='flex flex-row items-center p-[16px]'
        onPress={() => {
          navigation.goBack();
        }}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
        <CyDText className='text-[18px] font-bol ml-[8px]'>
          {t('Usage Limit Setting')}
        </CyDText>
      </CyDTouchView>

      <CyDKeyboardAwareScrollView className='flex-1 bg-n20 p-[16px]'>
        <CyDView>
          <CyDText className='text-[12px] text-normal'>
            {'Setting Usage limit for'}
          </CyDText>
          <CyDText className='text-[20px] font-bold'>
            {`${capitalize(card.type)} card ** ${card.last4}`}
          </CyDText>
        </CyDView>

        <CyDView className='mt-[16px]'>
          <CyDView className=' bg-n0 rounded-[10px] p-[16px]'>
            <CyDText className='text-[14px] font-bold text-center'>
              {t('Monthly Usage Limit')}
            </CyDText>
            <CyDTextInput
              className='bg-n0 border-none text-[44px] font-bold text-base400 mx-auto font-manrope'
              placeholder='$0'
              keyboardType='numeric'
              returnKeyType='done'
              onChangeText={text => {
                const numericText = text.replace(/[^0-9]/g, '');
                const parsedValue = parseInt(numericText, 10);
                setMonthlyUsageLimit(
                  isNaN(parsedValue) ? 0 : round(parsedValue),
                );
              }}
              value={`$${monthlyUsageLimit}`}
            />

            <CyDView className='mt-[4px] mb-[8px]'>
              <Slider
                minValue={0}
                maxValue={
                  get(limitsData, ['cydL', 'm']) ??
                  limitsData?.maxLimit?.m ??
                  1000
                }
                steps={4}
                onValueChange={value => {
                  setMonthlyUsageLimit(value);
                }}
                value={monthlyUsageLimit}
                showValues={true}
              />
            </CyDView>
          </CyDView>

          <CyDView className='mt-[24px] flex flex-row'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={18}
              className='text-base100'
            />
            <CyDText className='text-[12px] text-n200 pl-[8px]'>
              {
                'Total monthly usage limit for this Cypher card, applicable \n across multiple transactions.'
              }
            </CyDText>
          </CyDView>
        </CyDView>

        <CyDView className='mt-[24px]'>
          <CyDView className=' bg-n0 rounded-[10px] p-[16px]'>
            <CyDText className='text-[14px] font-bold text-center'>
              {t('Daily Usage Limit')}
            </CyDText>
            <CyDTextInput
              className='bg-n0 border-none text-[44px] font-bold text-base400 mx-auto font-manrope'
              placeholder='$0'
              keyboardType='numeric'
              returnKeyType='done'
              onChangeText={text => {
                const numericText = text.replace(/[^0-9]/g, '');
                const parsedValue = parseInt(numericText, 10);
                setDailyUsageLimit(isNaN(parsedValue) ? 0 : round(parsedValue));
              }}
              value={`$${dailyUsageLimit}`}
            />

            <CyDView className='mt-[4px] mb-[8px]'>
              <Slider
                minValue={0}
                maxValue={
                  get(limitsData, ['cydL', 'd']) ??
                  limitsData?.maxLimit?.d ??
                  1000
                }
                steps={4}
                onSlidingComplete={value => {
                  setDailyUsageLimit(value);
                }}
                value={dailyUsageLimit}
                showValues={true}
              />
            </CyDView>
          </CyDView>

          <CyDView className='mt-[24px] flex flex-row'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={18}
              className='text-base100'
            />
            <CyDText className='text-[12px] text-n200 ml-[8px]'>
              {
                'Total daily usage limit for this Cypher card, covering multiple transactions.'
              }
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDKeyboardAwareScrollView>

      <CyDView className='bg-n0 px-[16px] pb-[32px] pt-[24px] rounded-t-[16px]'>
        <Button
          title={t('SET_USAGE_LIMIT')}
          loading={loading}
          loaderStyle={styles.loader}
          onPress={() => {
            if (dailyUsageLimit < limitsData?.currentLimit?.d) {
              setShowImpactModal(true);
            } else {
              setShowSaveChangesModal(true);
            }
          }}
        />
      </CyDView>
    </CyDView>
  );
}
