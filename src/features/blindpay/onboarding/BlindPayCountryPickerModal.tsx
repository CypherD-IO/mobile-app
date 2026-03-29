import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal } from 'react-native';
import { t } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { BLINDPAY_COUNTRY_OPTIONS } from './blindpayCountryList';

interface BlindPayCountryPickerModalProps {
  visible: boolean;
  selectedCode?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function BlindPayCountryPickerModal({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: BlindPayCountryPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLINDPAY_COUNTRY_OPTIONS;
    return BLINDPAY_COUNTRY_OPTIONS.filter(
      c =>
        c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='fullScreen'
      onRequestClose={onClose}>
      <CyDView
        className='flex-1 bg-n0'
        style={{ paddingTop: insets.top }}>
        {/* Header */}
        <CyDView className='flex-row items-center justify-between px-[16px] h-[56px]'>
          <CyDTouchView onPress={onClose} hitSlop={12}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[18px] font-semibold text-base400 tracking-[-0.8px]'>
            {String(t('BLINDPAY_SELECT_COUNTRY', 'Select country'))}
          </CyDText>
          <CyDView className='w-[24px]' />
        </CyDView>

        {/* Search */}
        <CyDView className='px-[16px] pb-[8px]'>
          <CyDView className='flex-row items-center bg-n20 rounded-[8px] px-[12px] h-[44px] gap-[8px]'>
            <CyDMaterialDesignIcons
              name='magnify'
              size={20}
              className='text-n200'
            />
            <CyDTextInput
              className='flex-1 text-[16px] font-medium text-base400 py-0 bg-transparent'
              placeholder={String(t('SEARCH_COUNTRY', 'Search country...'))}
              placeholderTextColor='#8C8C8C'
              value={query}
              onChangeText={setQuery}
              autoCapitalize='none'
              autoCorrect={false}
              returnKeyType='done'
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {query ? (
              <CyDTouchView onPress={() => setQuery('')} hitSlop={8}>
                <CyDMaterialDesignIcons
                  name='close-circle'
                  size={18}
                  className='text-n200'
                />
              </CyDTouchView>
            ) : null}
          </CyDView>
        </CyDView>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => {
            const selected = item.code === selectedCode;
            return (
              <CyDTouchView
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
                className={`mx-[16px] px-[12px] py-[12px] flex-row items-center gap-[12px] border-b border-n40 ${
                  selected ? 'bg-n20 rounded-[8px]' : ''
                }`}>
                <CyDText className='text-[22px]'>{item.flag}</CyDText>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
                    {item.name}
                  </CyDText>
                  <CyDText className='text-[12px] font-medium text-n200 mt-[1px]'>
                    {item.code}
                  </CyDText>
                </CyDView>
                {selected ? (
                  <CyDMaterialDesignIcons
                    name='check-circle'
                    size={20}
                    className='text-[#FBC02D]'
                  />
                ) : null}
              </CyDTouchView>
            );
          }}
          ListEmptyComponent={
            <CyDView className='items-center py-[32px]'>
              <CyDText className='text-[14px] text-n200'>
                No countries found
              </CyDText>
            </CyDView>
          }
        />
      </CyDView>
    </Modal>
  );
}
