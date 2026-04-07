import React from 'react';
import { t } from 'i18next';
import useBlindPaySheet from '../components/BlindPayDropdownSheet';
import { BLINDPAY_COUNTRY_OPTIONS } from './blindpayCountryList';

interface BlindPayCountryPickerModalProps {
  visible: boolean;
  selectedCode?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

const COUNTRY_OPTIONS = BLINDPAY_COUNTRY_OPTIONS.map(c => ({
  value: c.code,
  label: c.name,
  icon: c.flag,
}));

export default function BlindPayCountryPickerModal({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: BlindPayCountryPickerModalProps) {
  const { openDropdown, close } = useBlindPaySheet();

  React.useEffect(() => {
    if (visible) {
      openDropdown({
        title: String(t('BLINDPAY_SELECT_COUNTRY', 'Select country')),
        options: COUNTRY_OPTIONS,
        selected: selectedCode ?? '',
        searchable: true,
        onSelect: (code) => {
          onSelect(code);
          onClose();
        },
      });
    }
  }, [visible]);

  return null;
}
