import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Animated } from 'react-native';
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import clsx from 'clsx';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDScrollView,
  CyDMaterialDesignIcons,
  CyDIcons,
  CyDTextInput,
} from '../../../styles/tailwindComponents';
import Button from '../../../components/v2/button';
import CyDModalLayout from '../../../components/v2/modal';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { parseErrorMessage } from '../../../core/util';
import { CardProviders, ButtonType } from '../../../constants/enum';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';
import { showToast } from '../../utilities/toastUtility';
import {
  PREDEFINED_CARD_TAGS,
  formatCardTag,
  parseCardTag,
} from '../../../constants/cardTags';
import { Card } from '../../../models/card.model';

const MAX_TAG_NAME_LENGTH = 48;

type ViewMode = 'select' | 'create';

export default function EditCardTag({
  isModalVisible,
  setIsModalVisible,
  currentTag,
  provider,
  cardId,
  availableCards,
  onRefreshCards,
  onUpdateCardTag,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  currentTag?: string;
  provider: CardProviders;
  cardId: string;
  availableCards: Card[];
  onRefreshCards?: () => void;
  onUpdateCardTag: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ViewMode>('select');
  const [selectedTag, setSelectedTag] = useState<string | null>(
    currentTag ?? null,
  );
  const [customEmoji, setCustomEmoji] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isFullHeight, setIsFullHeight] = useState(false);
  const heightAnim = useRef(new Animated.Value(80)).current;

  const { patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    if (isModalVisible) {
      setSelectedTag(currentTag ?? null);
    }
  }, [isModalVisible, currentTag]);

  const handleClose = (): void => {
    setSelectedTag(currentTag ?? null);
    setView('select');
    setCustomEmoji('');
    setCustomName('');
    setShowEmojiPicker(false);
    setIsFullHeight(false);
    heightAnim.setValue(80);
    setIsModalVisible(false);
  };

  const handleBackFromCreate = (): void => {
    setView('select');
    setCustomEmoji('');
    setCustomName('');
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiData: EmojiType): void => {
    setCustomEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSelectPredefined = (emoji: string, name: string): void => {
    setSelectedTag(formatCardTag(emoji, name));
  };

  const animateToFullHeight = (): void => {
    if (!isFullHeight) {
      setIsFullHeight(true);
      Animated.timing(heightAnim, {
        toValue: 95,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleScroll = (event: any): void => {
    if (event.nativeEvent.contentOffset.y > 0) {
      animateToFullHeight();
    }
  };

  const submitTag = async (tagValue: string): Promise<void> => {
    setIsLoading(true);

    void logAnalyticsToFirebase(AnalyticEvent.CARD_TAG_UPDATED, {
      category: 'card_customization',
      action: 'update_card_tag',
      label: 'card_tag_updated',
      card_id: cardId,
      provider: provider,
      tag_length: tagValue.length,
      is_custom: view === 'create',
    });

    try {
      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${cardId}/metadata`,
        {
          cardTag: tagValue,
        },
      );

      if (!response.isError) {
        onUpdateCardTag();
        onRefreshCards?.();
        handleClose();
        showToast(t('CARD_TAG_UPDATED'));
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

  const handleSubmit = (): void => {
    if (view === 'select' && selectedTag) {
      void submitTag(selectedTag);
    } else if (view === 'create' && customName.trim()) {
      const tagValue = formatCardTag(customEmoji, customName.trim());
      void submitTag(tagValue);
    }
  };

  const customTags = availableCards
    .map((card: Card) => card.cardTag)
    .filter((tag): tag is string => !!tag && tag.trim() !== '')
    .filter((tag, index, self) => self.indexOf(tag) === index);

  const renderSelectContent = (): React.ReactElement => (
    <CyDView className='flex flex-col justify-end h-full'>
      <Animated.View
        style={[
          styles.modalContainer,
          {
            height: heightAnim.interpolate({
              inputRange: [80, 95],
              outputRange: ['80%', '100%'],
            }),
          },
        ]}
        className={clsx('bg-n20', {
          'rounded-t-[24px]': !isFullHeight,
        })}>
        <CyDView className='w-[32px] h-[4px] bg-n100 self-center mt-[16px] mb-[8px] rounded-full' />

        <CyDView className='flex flex-row justify-between mt-[16px] mx-[5%] items-center'>
          <CyDText className='text-[16px] font-bold'>{t('SELECT_TAG')}</CyDText>
          <CyDTouchView onPress={handleClose} className='ml-[18px]'>
            <CyDMaterialDesignIcons
              name='close'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDView className='h-[1px] bg-n40 mt-[12px]' />

        <CyDScrollView
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className='flex-1'
          contentContainerClassName='pb-[100px]'>
          {customTags.map((tag, index) => {
            const parsed = parseCardTag(tag);
            const isPredefinedTag = PREDEFINED_CARD_TAGS.some(
              predefined =>
                formatCardTag(predefined.emoji, predefined.name) === tag,
            );
            if (isPredefinedTag) return null;
            const isSelected = selectedTag === tag;
            return (
              <CyDTouchView
                key={`custom-${index}`}
                onPress={() => setSelectedTag(tag)}
                className={clsx(
                  'flex flex-row items-center px-[16px] py-[12px] my-[4px] mx-[12px] rounded-[8px] bg-n10/80',
                  { 'border-[2px] border-appColor': isSelected },
                )}>
                {parsed.emoji && (
                  <CyDText className='text-[24px]'>{parsed.emoji}</CyDText>
                )}
                <CyDText className='ml-[10px] font-semibold text-[16px]'>
                  {parsed.name || tag}
                </CyDText>
              </CyDTouchView>
            );
          })}

          {PREDEFINED_CARD_TAGS.map((tag, index) => {
            const tagValue = formatCardTag(tag.emoji, tag.name);
            const isSelected = selectedTag === tagValue;

            return (
              <CyDTouchView
                key={`predefined-${index}`}
                onPress={() => handleSelectPredefined(tag.emoji, tag.name)}
                className={clsx(
                  'flex flex-row items-center px-[16px] py-[12px] my-[4px] mx-[12px] rounded-[8px] bg-n10/80',
                  { 'border-[2px] border-appColor': isSelected },
                )}>
                <CyDText className='text-[24px]'>{tag.emoji}</CyDText>
                <CyDText className='ml-[10px] font-semibold text-[16px]'>
                  {tag.name}
                </CyDText>
              </CyDTouchView>
            );
          })}

          <CyDTouchView
            className='flex flex-row items-center px-[16px] py-[12px] my-[4px] mx-[12px] rounded-[8px] bg-n10/80'
            onPress={() => setView('create')}>
            <CyDMaterialDesignIcons
              name='plus-circle'
              size={24}
              className='text-base400'
            />
            <CyDText className='ml-[10px] font-semibold text-[16px]'>
              {t('CREATE_NEW')}
            </CyDText>
          </CyDTouchView>
        </CyDScrollView>

        <CyDView className='absolute bottom-0 left-0 right-0 px-[16px] py-[16px] bg-n20 border-t-[1px] border-n40 pb-[32px]'>
          <Button
            title={t('SET_TAG')}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!selectedTag}
            style='rounded-full h-[54px]'
          />
        </CyDView>
      </Animated.View>
    </CyDView>
  );

  const renderCreateContent = (): React.ReactElement => (
    <CyDView className='flex-1 bg-n20' style={{ paddingTop: insets.top }}>
      <CyDView className='flex-row items-center px-[16px] py-[16px]'>
        <CyDTouchView onPress={handleBackFromCreate} className='p-2'>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[20px] font-semibold text-left flex-1 ml-[8px]'>
          {t('CREATE_NEW_TAG')}
        </CyDText>
      </CyDView>

      <CyDView className='px-[16px] flex-1'>
        <CyDText className='font-medium text-[12px] text-n200 mt-[4px]'>
          {t('CARD_TAG_DESCRIPTION')}
        </CyDText>

        <CyDView className='mt-[20px]'>
          <CyDText className='text-n200 text-[12px] mb-[6px]'>
            {t('SELECT_AN_EMOJI')}
          </CyDText>
          <CyDTouchView
            className='flex-row justify-between items-center px-[16px] py-[14px] bg-n0 rounded-[10px] border border-n40'
            onPress={() => setShowEmojiPicker(true)}>
            <CyDText
              className={`font-normal text-[14px] ${
                customEmoji ? 'text-primaryText' : 'text-n200'
              }`}>
              {customEmoji || t('SELECT_AN_EMOJI')}
            </CyDText>
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={20}
              className='text-n200'
            />
          </CyDTouchView>

          <EmojiPicker
            onEmojiSelected={onEmojiClick}
            open={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
          />
        </CyDView>

        <CyDView className='mt-[16px]'>
          <CyDText className='text-n200 text-[12px] mb-[6px]'>
            {t('TAG_NAME')}
          </CyDText>
          <CyDView className='relative'>
            <CyDTextInput
              placeholder={t('NAME_YOUR_CARD')}
              className='py-[14px] px-[16px] rounded-[10px] w-full font-normal text-[14px] text-primaryText border border-n40'
              placeholderTextColor='#999999'
              value={customName}
              onChangeText={text => {
                if (text.length <= MAX_TAG_NAME_LENGTH) {
                  setCustomName(text);
                }
              }}
              maxLength={MAX_TAG_NAME_LENGTH}
            />
            <CyDText className='absolute right-[16px] top-[14px] text-n200 text-[12px]'>
              {customName.length}/{MAX_TAG_NAME_LENGTH}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView
        className='px-[16px]'
        style={{ paddingBottom: insets.bottom + 16 }}>
        <Button
          title={t('SET_TAG')}
          onPress={handleSubmit}
          loading={isLoading}
          type={ButtonType.PRIMARY}
          disabled={!customName.trim()}
          style='rounded-full h-[54px]'
          titleStyle='font-semibold text-[18px]'
        />
      </CyDView>
    </CyDView>
  );

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={view === 'create' ? handleBackFromCreate : handleClose}
      style={view === 'create' ? { margin: 0 } : styles.modalLayout}
      animationIn={view === 'create' ? 'slideInRight' : 'slideInUp'}
      animationOut={view === 'create' ? 'slideOutRight' : 'slideOutDown'}
      swipeDirection={view === 'select' ? ['down'] : []}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down' && view === 'select') {
          handleClose();
        }
      }}
      propagateSwipe={true}>
      {view === 'select' ? renderSelectContent() : renderCreateContent()}
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
  },
});
