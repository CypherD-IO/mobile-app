import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDFastImage,
  CyDIcons,
} from '../../../styles/tailwindComponents';
import Button from '../../../components/v2/button';
import CyDModalLayout from '../../../components/v2/modal';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { parseErrorMessage } from '../../../core/util';
import { CardProviders, ButtonType } from '../../../constants/enum';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';
import CardTagBadge from '../../../components/CardTagBadge';
import { showToast } from '../../utilities/toastUtility';
import {
  CARD_COLOURS,
  getCardColorByHex,
} from '../../../constants/cardColours';

export default function EditCardColor({
  isModalVisible,
  setIsModalVisible,
  currentColor,
  currentTag,
  last4,
  provider,
  cardId,
  onUpdateCardColor,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  currentColor?: string;
  currentTag?: string;
  last4: string;
  provider: CardProviders;
  cardId: string;
  onUpdateCardColor: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const [selectedColor, setSelectedColor] = useState<string>(
    getCardColorByHex(currentColor)?.id ?? 'mimosa',
  );
  // Tracks which color's image has finished loading so text color stays in sync with the card image
  const [loadedColor, setLoadedColor] = useState<string>(
    getCardColorByHex(currentColor)?.id ?? 'mimosa',
  );

  const selectedColorData = CARD_COLOURS.find(c => c.id === selectedColor);
  const loadedColorData = CARD_COLOURS.find(c => c.id === loadedColor);

  const onCardImageLoad = useCallback((): void => {
    setLoadedColor(selectedColor);
  }, [selectedColor]);

  const updateCardColor = async (): Promise<void> => {
    setIsLoading(true);

    void logAnalyticsToFirebase(AnalyticEvent.CARD_COLOUR_UPDATED, {
      category: 'card_customization',
      action: 'update_CARD_COLOUR',
      label: selectedColor,
      card_id: cardId,
      provider: provider,
      new_color: selectedColor,
    });

    try {
      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${cardId}/metadata`,
        {
          cardColor: selectedColorData?.hex,
        },
      );

      if (!response.isError) {
        setIsModalVisible(false);
        onUpdateCardColor();
        showToast(t('CARD_COLOUR_UPDATED'));
      } else {
        showModal('state', {
          type: 'error',
          title: t('ERROR'),
          description: parseErrorMessage(response.error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('ERROR'),
        description: t('SOMETHING_WENT_WRONG'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderColorGrid = (colors: (typeof CARD_COLOURS)[number][]) => {
    return (
      <CyDView className='flex-row flex-wrap justify-between'>
        {colors.map(color => {
          const isSelected = selectedColor === color.id;
          return (
            <CyDTouchView
              key={color.id}
              className='items-center mb-[16px] w-[30%]'
              onPress={() => setSelectedColor(color.id)}>
              <CyDText className='text-[12px] font-medium text-center text-primaryText mb-2'>
                {color.name}
              </CyDText>
              <CyDView
                className={clsx(
                  'w-full rounded-full',
                  isSelected ? 'border-4 border-base400' : '',
                )}
                style={{ backgroundColor: color.hex, aspectRatio: 2 }}
              />
            </CyDTouchView>
          );
        })}
      </CyDView>
    );
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setIsModalVisible}
      style={{ margin: 0 }}
      animationIn='slideInRight'
      animationOut='slideOutRight'>
      <CyDView className='flex-1 bg-n20' style={{ paddingTop: insets.top }}>
        <CyDView className='flex-row items-center px-[16px] py-[16px]'>
          <CyDTouchView
            onPress={() => setIsModalVisible(false)}
            className='p-2'>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>

        <CyDView className='mt-[2px] items-center justify-center px-[16px]'>
          <CyDView className='relative w-full' style={{ aspectRatio: 1.6 }}>
            {selectedColorData?.cardImage && (
              <CyDFastImage
                source={selectedColorData.cardImage}
                className='w-full h-full rounded-[16px]'
                resizeMode='contain'
                onLoad={onCardImageLoad}
              />
            )}
            {last4 && (
              <CyDView className='absolute bottom-[14px] left-[14px]'>
                <CyDText
                  className='font-semibold text-[14px]'
                  style={{ color: loadedColorData?.textColor ?? '#FFFFFF' }}>
                  {' xxxx ' + last4}
                </CyDText>
              </CyDView>
            )}
            {currentTag && (
              <CyDView className='absolute top-[45%] right-[5%]'>
                <CardTagBadge tag={currentTag} />
              </CyDView>
            )}
          </CyDView>
        </CyDView>

        <CyDView className='mt-[12px] px-[24px]'>
          <CyDText className='text-[26px] font-normal'>
            {t('SELECT_CARD_COLOUR')}
          </CyDText>
          <CyDText className='text-[14px] font-medium text-n200 mt-1'>
            {t('SELECT_COLOUR_DESC')}
          </CyDText>
        </CyDView>

        <CyDView className='mt-[16px] mx-[16px] p-[16px] border border-n40 rounded-xl bg-n0'>
          {renderColorGrid(CARD_COLOURS.slice(0, 3))}

          <CyDView className='w-full h-[1px] bg-n40 my-[16px] self-center' />

          {renderColorGrid(CARD_COLOURS.slice(3, 6))}
        </CyDView>

        <CyDView
          className='mt-auto px-[24px]'
          style={{ paddingBottom: insets.bottom + 16 }}>
          <Button
            title={t('UPDATE_CARD_COLOUR')}
            onPress={() => void updateCardColor()}
            loading={isLoading}
            type={ButtonType.PRIMARY}
            style='rounded-full h-[54px]'
            titleStyle='text-[18px] font-semibold'
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
