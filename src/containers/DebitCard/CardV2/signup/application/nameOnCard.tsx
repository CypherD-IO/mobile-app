import React, { useState, useEffect, useContext } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDSafeAreaView,
  CyDImage,
  CyDScrollView,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDImageBackground,
} from '../../../../../styles/tailwindComponents';
import CardApplicationHeader from '../../../../../components/v2/CardApplicationHeader';
import CardApplicationFooter from '../../../../../components/v2/CardApplicationFooter';
import { screenTitle } from '../../../../../constants';
import AppImages from '../../../../../../assets/images/appImages';
import PreferredNameModal from '../../../physicalCardUpgradation/preferredNameModal';
import { useTranslation } from 'react-i18next';
import useAxios from '../../../../../core/HttpRequest';
import { CardProfile } from '../../../../../models/cardProfile.model';
import {
  GlobalContextDef,
  GlobalContext,
} from '../../../../../core/globalContext';
import { CardProviders } from '../../../../../constants/enum';
import { showToast } from '../../../../utilities/toastUtility';

const NameOnCard = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [selectedNameId, setSelectedNameId] = useState<number>(2);
  const [isPreferredNameModalVisible, setIsPreferredNameModalVisible] =
    useState<boolean>(false);
  const [nameOptions, setNameOptions] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const { t } = useTranslation();
  const { postWithAuth, getWithAuth } = useAxios();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const MAX_NAME_LENGTH = 27;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await getWithAuth(
          `/v1/cards/${CardProviders.REAP_CARD}/user-data`,
        );
        if (!response.isError && response.data) {
          setFirstName(response.data.firstName || '');
          setLastName(response.data.lastName || '');
        }
      } catch (error) {
        showToast('Could not fetch user data', 'error');
        console.error('Error fetching user data:', error);
      }
    };

    void fetchUserData();
  }, []);

  useEffect(() => {
    // Initialize name options with combinations
    const nameCombinations = [
      `${firstName} ${lastName}`.slice(0, MAX_NAME_LENGTH),
      firstName?.slice(0, MAX_NAME_LENGTH),
      lastName?.slice(0, MAX_NAME_LENGTH),
      `${lastName} ${firstName}`.slice(0, MAX_NAME_LENGTH),
    ].filter(name => name.trim() !== '');

    // Use Set to remove duplicates while preserving order
    const uniqueNames = Array.from(new Set(nameCombinations));

    const initialOptions = uniqueNames.map((name, index) => ({
      id: index + 1,
      name,
    }));

    setNameOptions(initialOptions);
  }, [firstName, lastName]);

  const handleNext = async () => {
    const selectedName = nameOptions.find(
      opt => opt.id === selectedNameId,
    )?.name;
    try {
      const response = await postWithAuth(`/v1/cards/virtual-preferred-name`, {
        name: selectedName,
      });
      if (!response.isError && response.data) {
        navigation.navigate(screenTitle.CARD_CREATION, { name: selectedName });
      } else {
        showToast('Could not set preferred name', 'error');
      }
    } catch (error) {
      showToast('Could not set preferred name', 'error');
      console.error('Error setting preferred name:', error);
    }
  };

  const handleCustomName = () => {
    setIsPreferredNameModalVisible(true);
  };

  const addCustomName = (name: string) => {
    const trimmedName = name.slice(0, MAX_NAME_LENGTH);
    // Check if name already exists in options
    const nameExists = nameOptions.some(option => option.name === trimmedName);

    if (!nameExists) {
      const newNameOption = {
        id: nameOptions.length + 1,
        name: trimmedName,
      };
      setNameOptions(prevOptions => [...prevOptions, newNameOption]);
      setSelectedNameId(newNameOption.id);
    } else {
      // If name exists, just select the existing option
      const existingOption = nameOptions.find(
        option => option.name === trimmedName,
      );
      if (existingOption) {
        setSelectedNameId(existingOption.id);
      }
    }
    setIsPreferredNameModalVisible(false);
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <CardApplicationHeader />
      <PreferredNameModal
        isModalVisible={isPreferredNameModalVisible}
        setShowModal={setIsPreferredNameModalVisible}
        onSetPreferredName={addCustomName}
      />

      <CyDScrollView className='flex-1 px-5'>
        {/* Card Preview */}
        <CyDView className='mt-6 rounded-[12px] overflow-hidden w-full aspect-[380/239]'>
          <CyDImageBackground
            source={AppImages.CYPHER_VIRTUAL_CARD}
            className='w-full h-full'
            resizeMode='contain'>
            <CyDView className='flex-1 p-5'>
              <CyDView className='mt-auto'>
                <CyDText className='text-white font-semibold text-[18px]'>
                  {nameOptions.find(opt => opt.id === selectedNameId)?.name ??
                    ''}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDImageBackground>
        </CyDView>

        {/* Title and Description */}
        <CyDText className='text-[32px] mt-6'>Name on Card</CyDText>
        <CyDText className='text-[14px] text-n200 mt-2'>
          Choose how your name will appear on the card!
        </CyDText>

        {/* Name Options */}
        <CyDView className='my-4 bg-n0 rounded-[12px] border-[1px] border-n40'>
          {nameOptions.map((option, index) => (
            <CyDTouchView
              key={option.id}
              onPress={() => setSelectedNameId(option.id)}
              className={`flex-row items-center justify-between p-4 border-b-[1px] border-n40`}>
              <CyDText className='text-[16px] text-base400'>
                {option.name}
              </CyDText>
              <CyDView
                className={`w-5 h-5 rounded-full border-[1.5px] items-center justify-center ${
                  selectedNameId === option.id
                    ? 'border-p300 bg-p300'
                    : 'border-n100'
                }`}>
                {selectedNameId === option.id && (
                  <CyDMaterialDesignIcons
                    name='check'
                    size={16}
                    className='text-white'
                  />
                )}
              </CyDView>
            </CyDTouchView>
          ))}

          {/* Custom Name Option */}
          <CyDTouchView
            onPress={handleCustomName}
            className='flex-row items-center justify-between p-4'>
            <CyDText className='text-[16px] text-base400'>
              {t('PREFERRED_NAME')}
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
      </CyDScrollView>

      <CardApplicationFooter
        currentStep={3}
        totalSteps={3}
        currentSectionProgress={80}
        buttonConfig={{
          title: t('NEXT'),
          onPress: () => {
            void handleNext();
          },
        }}
      />
    </CyDSafeAreaView>
  );
};

export default NameOnCard;
