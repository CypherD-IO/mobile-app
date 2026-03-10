import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Modal } from 'react-native';
import EmojiPicker, { EmojiType } from 'rn-emoji-keyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import clsx from 'clsx';
import {
  CyDView,
  CyDText,
  CyDTouchView,
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
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

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
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  const [view, setView] = useState<ViewMode>('select');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [customEmoji, setCustomEmoji] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const isTransitioningToCreateRef = useRef(false);
  const snapPoints = useMemo(() => ['60%', '93%'], []);

  const sheetBgColor = isDarkMode ? '#161616' : '#F5F6F7';
  const sheetIndicatorColor = isDarkMode ? '#444' : '#ccc';

  const { patchWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  useEffect(() => {
    if (isModalVisible) {
      setView('select');
      setShowCreateModal(false);
    }
  }, [isModalVisible]);

  const handleClose = (): void => {
    setView('select');
    setShowCreateModal(false);
    setCustomEmoji('');
    setCustomName('');
    setShowEmojiPicker(false);
    setIsModalVisible(false);
  };

  const handleBottomSheetClose = (): void => {
    if (isTransitioningToCreateRef.current) {
      isTransitioningToCreateRef.current = false;
      setView('create');
      setShowCreateModal(true);
    } else {
      handleClose();
    }
  };

  const handleBackFromCreate = (): void => {
    setCustomEmoji('');
    setCustomName('');
    setShowEmojiPicker(false);
    setShowCreateModal(false);
  };

  const handleCreateModalHidden = (): void => {
    if (view === 'create') {
      setView('select');
    }
  };

  const onEmojiClick = (emojiData: EmojiType): void => {
    setCustomEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const submitTag = async (tagValue: string): Promise<void> => {
    setIsLoading(true);

    void logAnalyticsToFirebase(AnalyticEvent.CARD_TAG_UPDATED, {
      category: 'card_customization',
      action: 'update_card_tag',
      label: 'card_tag_updated',
      card_id: cardId,
      provider,
      tag_length: tagValue.length,
      is_custom: view === 'create',
    });

    try {
      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${cardId}/metadata`,
        { cardTag: tagValue },
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

  const handleSelectTag = (tagValue: string): void => {
    if (isLoading) return;
    void submitTag(tagValue);
  };

  const handleRemoveTag = (): void => {
    if (isLoading) return;
    void submitTag('');
  };

  const handleNavigateToCreate = (): void => {
    isTransitioningToCreateRef.current = true;
    bottomSheetRef.current?.close();
  };

  const handleCreateSubmit = (): void => {
    if (customName.trim()) {
      const tagValue = formatCardTag(customEmoji, customName.trim());
      void submitTag(tagValue);
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior='close'
      />
    ),
    [],
  );

  const customTags = availableCards
    .map((card: Card) => card.cardTag)
    .filter((tag): tag is string => !!tag && tag.trim() !== '')
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .filter(
      tag =>
        !PREDEFINED_CARD_TAGS.some(
          predefined =>
            formatCardTag(predefined.emoji, predefined.name) === tag,
        ),
    );

  const predefinedTagValues = PREDEFINED_CARD_TAGS.map(tag =>
    formatCardTag(tag.emoji, tag.name),
  );
  const allDisplayTags = [...customTags, ...predefinedTagValues];

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
              className={clsx('font-normal text-[14px]', {
                'text-primaryText': customEmoji,
                'text-n200': !customEmoji,
              })}>
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
          onPress={handleCreateSubmit}
          loading={isLoading}
          type={ButtonType.PRIMARY}
          disabled={!customName.trim()}
          style='rounded-full h-[60px]'
          titleStyle='font-semibold text-[18px]'
        />
      </CyDView>
    </CyDView>
  );

  return (
    <>
      <Modal
        visible={isModalVisible && view === 'select'}
        transparent
        animationType='none'
        statusBarTranslucent
        onRequestClose={handleClose}>
        <GestureHandlerRootView style={styles.flex1}>
          <BottomSheet
            ref={bottomSheetRef}
            snapPoints={snapPoints}
            index={0}
            enableDynamicSizing={false}
            enablePanDownToClose
            enableOverDrag={false}
            onClose={handleBottomSheetClose}
            backdropComponent={renderBackdrop}
            backgroundStyle={[
              styles.sheetBackground,
              { backgroundColor: sheetBgColor },
            ]}
            handleIndicatorStyle={[
              styles.handleIndicator,
              { backgroundColor: sheetIndicatorColor },
            ]}
            handleStyle={[styles.handleBar, { backgroundColor: sheetBgColor }]}>
            <BottomSheetScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 24 },
              ]}
              showsVerticalScrollIndicator={false}>
              <CyDView className='px-[20px] pt-[4px] pb-[16px]'>
                <CyDText className='font-manrope text-[18px] font-bold'>
                  {t('SELECT_TAG')}
                </CyDText>
              </CyDView>
              <CyDView className='mx-[16px] bg-n0 rounded-[12px] overflow-hidden'>
                {allDisplayTags.map((tagValue, index) => {
                  const parsed = parseCardTag(tagValue);
                  const isActive = currentTag === tagValue;
                  const isLast = index === allDisplayTags.length - 1;

                  return (
                    <CyDTouchView
                      key={`tag-${index}`}
                      onPress={() => handleSelectTag(tagValue)}
                      className={clsx(
                        'flex-row items-center justify-between px-[16px] py-[14px]',
                        { 'border-b border-n40': !isLast },
                      )}>
                      <CyDView className='flex-row items-center flex-1 mr-[12px]'>
                        {parsed.emoji ? (
                          <CyDText className='text-[24px]'>
                            {parsed.emoji}
                          </CyDText>
                        ) : null}
                        <CyDText className='ml-[10px] font-manrope font-semibold text-[16px] flex-1'>
                          {parsed.name || tagValue}
                        </CyDText>
                      </CyDView>
                      {isActive && (
                        <CyDMaterialDesignIcons
                          name='check-circle'
                          size={24}
                          className='text-appColor'
                        />
                      )}
                    </CyDTouchView>
                  );
                })}
              </CyDView>

              <CyDView className='mx-[16px] mt-[16px] bg-n0 rounded-[12px] overflow-hidden'>
                <CyDView className='px-[16px] pt-[16px] pb-[12px]'>
                  <CyDText style={styles.descriptionText} className='text-n200'>
                    {currentTag
                      ? t(
                          'CARD_TAG_CREATE_OR_REMOVE_DESC',
                          'Create a custom tag with your own name, or you can easily remove a tag in this card.',
                        )
                      : t(
                          'CARD_TAG_CREATE_DESC',
                          'Create a custom tag with your own name',
                        )}
                  </CyDText>
                </CyDView>

                <CyDView className='h-[1px] bg-n40' />

                <CyDTouchView
                  onPress={handleNavigateToCreate}
                  className='flex-row items-center px-[16px] py-[14px]'>
                  <CyDMaterialDesignIcons
                    name='plus-circle-outline'
                    size={24}
                    className='text-base400'
                  />
                  <CyDText style={styles.actionText} className='ml-[10px]'>
                    {t('CREATE_NEW')}
                  </CyDText>
                </CyDTouchView>

                {currentTag ? (
                  <>
                    <CyDView className='h-[1px] bg-n40' />
                    <CyDTouchView
                      onPress={handleRemoveTag}
                      className='flex-row items-center px-[16px] py-[14px]'>
                      <CyDMaterialDesignIcons
                        name='minus-circle-outline'
                        size={24}
                        className='text-red400'
                      />
                      <CyDText
                        style={styles.actionText}
                        className='ml-[10px] text-red400'>
                        {t('REMOVE_CARD_TAG', 'Remove card tag')}
                      </CyDText>
                    </CyDTouchView>
                  </>
                ) : null}
              </CyDView>
            </BottomSheetScrollView>
          </BottomSheet>
        </GestureHandlerRootView>
      </Modal>

      <CyDModalLayout
        isModalVisible={showCreateModal}
        setModalVisible={handleBackFromCreate}
        style={styles.createModal}
        animationIn='slideInRight'
        animationOut='slideOutRight'
        swipeDirection={[]}
        statusBarTranslucent={true}
        onModalHide={handleCreateModalHidden}>
        {renderCreateContent()}
      </CyDModalLayout>
    </>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  handleBar: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  createModal: {
    margin: 0,
  },
  descriptionText: {
    fontFamily: 'Manrope',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
  actionText: {
    fontFamily: 'Manrope',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 22.4,
    letterSpacing: -0.4,
  },
});
