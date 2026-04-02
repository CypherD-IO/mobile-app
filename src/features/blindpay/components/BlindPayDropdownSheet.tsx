import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';

export interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ITEM_HEIGHT = 58;
const HEADER_HEIGHT = 70; // handle + title + margin
const BOTTOM_PADDING = 40; // safe area + card padding

/** Shared dropdown content — used inside the bottom sheet */
function DropdownContent({
  title,
  options,
  selected,
  onSelect,
  searchable,
}: {
  title: string;
  options: DropdownOption[];
  selected: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query, searchable]);

  return (
    <CyDView className='flex-1'>
      <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] px-[16px] mb-[12px]'>
        {title}
      </CyDText>

      {searchable ? (
        <CyDView className='px-[16px] pb-[8px]'>
          <CyDView className='flex-row items-center bg-n0 rounded-[8px] px-[12px] h-[44px] gap-[8px]'>
            <CyDMaterialDesignIcons name='magnify' size={20} className='text-n200' />
            <CyDTextInput
              className='flex-1 text-[16px] font-medium text-base400 py-0 bg-transparent'
              placeholder='Search...'
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
                <CyDMaterialDesignIcons name='close-circle' size={18} className='text-n200' />
              </CyDTouchView>
            ) : null}
          </CyDView>
        </CyDView>
      ) : null}

      <CyDView className='px-[16px] pb-[16px]'>
        <CyDView className='rounded-[16px] overflow-hidden'>
          {filtered.length === 0 ? (
            <CyDView className='items-center py-[32px]'>
              <CyDText className='text-[14px] text-n200'>No results found</CyDText>
            </CyDView>
          ) : filtered.map((item, index) => (
            <CyDTouchView
              key={item.value}
              onPress={() => onSelect(item.value)}
              className={`bg-n0 p-[16px] flex-row items-center gap-[6px] ${
                index < filtered.length - 1 ? 'border-b border-n30' : ''
              }`}>
              {item.icon ? (
                <CyDView className='w-[32px] h-[32px] rounded-full bg-p0 items-center justify-center overflow-hidden'>
                  <CyDText className='text-[18px]'>{item.icon}</CyDText>
                </CyDView>
              ) : null}
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.4px]'>
                  {item.label}
                </CyDText>
                {item.subtitle ? (
                  <CyDText className='text-[12px] font-medium text-n200 mt-[1px]'>
                    {item.subtitle}
                  </CyDText>
                ) : null}
              </CyDView>
              {selected === item.value ? (
                <CyDMaterialDesignIcons name='check' size={20} className='text-[#FBC02D]' />
              ) : null}
            </CyDTouchView>
          ))}
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

/**
 * Single hook for ALL BlindPay bottom sheets.
 *
 * Usage:
 *   const sheet = useBlindPaySheet();
 *   sheet.openDropdown({ title, options, selected, onSelect, searchable });
 *   sheet.openHelpSheet({ title, text });
 *   sheet.openSheet({ content, snapPoints });
 *   sheet.close();
 */
export default function useBlindPaySheet() {
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  const close = useCallback(() => {
    hideBottomSheet('blindpay-sheet');
  }, [hideBottomSheet]);

  const openDropdown = useCallback(({
    title,
    options,
    selected,
    onSelect,
    searchable = false,
  }: {
    title: string;
    options: DropdownOption[];
    selected: string;
    onSelect: (value: string) => void;
    searchable?: boolean;
  }) => {
    const contentHeight = HEADER_HEIGHT + (options.length * ITEM_HEIGHT) + BOTTOM_PADDING + (searchable ? 60 : 0);
    const contentPercent = Math.round((contentHeight / SCREEN_HEIGHT) * 100);
    const minSnap = contentPercent > 50 ? 65 : contentPercent;

    showBottomSheet({
      id: 'blindpay-sheet',
      snapPoints: [`${minSnap}%`, '95%'],
      showHandle: true,
      showCloseButton: false,
      scrollable: true,
      onClose: close,
      content: (
        <DropdownContent
          title={title}
          options={options}
          selected={selected}
          searchable={searchable}
          onSelect={(value) => { onSelect(value); close(); }}
        />
      ),
    });
  }, [showBottomSheet, close]);

  const openHelpSheet = useCallback(({
    title,
    text,
  }: {
    title: string;
    text: string;
  }) => {
    const estimatedLines = Math.ceil(text.length / 45);
    const textHeight = estimatedLines * 22;
    const contentHeight = HEADER_HEIGHT + textHeight + 60;
    const contentPercent = Math.round((contentHeight / SCREEN_HEIGHT) * 100);
    const minSnap = contentPercent > 50 ? 65 : contentPercent;

    showBottomSheet({
      id: 'blindpay-sheet',
      snapPoints: [`${minSnap}%`, '95%'],
      showHandle: true,
      showCloseButton: false,
      scrollable: true,
      onClose: close,
      content: (
        <CyDView className='px-[16px] pb-[16px] gap-[12px]'>
          <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3]'>
            {title}
          </CyDText>
          <CyDView className='bg-n0 rounded-[16px] p-[16px]'>
            <CyDText className='text-[14px] font-medium text-n200 leading-[1.5] tracking-[-0.4px]'>
              {text}
            </CyDText>
          </CyDView>
        </CyDView>
      ),
    });
  }, [showBottomSheet, close]);

  const openSheet = useCallback(({
    content,
    snapPoints = ['70%', '95%'],
    scrollable = false,
  }: {
    content: React.ReactNode;
    snapPoints?: Array<string | number>;
    scrollable?: boolean;
  }) => {
    showBottomSheet({
      id: 'blindpay-sheet',
      snapPoints,
      showHandle: true,
      showCloseButton: false,
      scrollable,
      onClose: close,
      content,
    });
  }, [showBottomSheet, close]);

  return { openDropdown, openHelpSheet, openSheet, close };
}
