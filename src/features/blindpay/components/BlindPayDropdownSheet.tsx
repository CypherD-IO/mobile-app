import React, { useCallback } from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';

export interface DropdownOption {
  value: string;
  label: string;
  /** Optional icon/emoji shown in a circle on the left */
  icon?: string;
}

/**
 * Opens a pull-up bottom sheet dropdown matching the BlindPay Figma design.
 * Swipe down to close. Pull up to expand.
 *
 * Usage:
 *   const { openDropdown } = useBlindPayDropdown();
 *   openDropdown({ title: 'Payment Method', options, selected, onSelect });
 */
export default function useBlindPayDropdown() {
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  const openDropdown = useCallback(({
    title,
    options,
    selected,
    onSelect,
  }: {
    title: string;
    options: DropdownOption[];
    selected: string;
    onSelect: (value: string) => void;
  }) => {
    const sheetId = 'blindpay-dropdown';

    showBottomSheet({
      id: sheetId,
      snapPoints: ['65%', '95%'],
      showHandle: true,
      showCloseButton: false,
      scrollable: true,
      onClose: () => hideBottomSheet(sheetId),
      content: (
        <CyDView className='px-[16px] pb-[16px]'>
          {/* Title */}
          <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[12px]'>
            {title}
          </CyDText>

          {/* Options list */}
          <CyDView className='rounded-[16px] overflow-hidden'>
            {options.map((opt, idx) => (
              <CyDTouchView
                key={opt.value}
                onPress={() => {
                  onSelect(opt.value);
                  hideBottomSheet(sheetId);
                }}
                className={`bg-n0 p-[16px] flex-row items-center gap-[6px] ${
                  idx < options.length - 1 ? 'border-b border-n30' : ''
                }`}>
                {opt.icon ? (
                  <CyDView className='w-[32px] h-[32px] rounded-full bg-p0 items-center justify-center overflow-hidden'>
                    <CyDText className='text-[18px]'>{opt.icon}</CyDText>
                  </CyDView>
                ) : null}
                <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.4px] flex-1'>
                  {opt.label}
                </CyDText>
                {selected === opt.value ? (
                  <CyDMaterialDesignIcons name='check' size={20} className='text-[#FBC02D]' />
                ) : null}
              </CyDTouchView>
            ))}
          </CyDView>
        </CyDView>
      ),
    });
  }, [showBottomSheet, hideBottomSheet]);

  return { openDropdown };
}
