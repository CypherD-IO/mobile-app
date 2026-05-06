/**
 * Unit tests for DeleteCardSuccessModal component.
 */

jest.mock('../../../styles/tailwindComponents', () => {
  const { View, Text, TouchableOpacity, Image } = require('react-native');
  return {
    CyDView: View,
    CyDText: Text,
    CyDTouchView: TouchableOpacity,
    CyDImage: Image,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        DELETE_CARD_SUCCESS_TITLE: 'Your card has been deleted',
        DELETE_CARD_SUCCESS_DESC: `Your ${params?.cardType ?? ''} card ending in ${params?.last4 ?? ''} has been deleted.`,
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('../../../../assets/images/appImages', () => ({
  SUCCESS_TICK_GREEN_BG_ROUNDED: 'success-tick-mock',
}));

jest.mock('../modal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      isModalVisible,
    }: {
      children: React.ReactNode;
      isModalVisible: boolean;
    }) => (isModalVisible ? <View>{children}</View> : null),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DeleteCardSuccessModal from '../deleteCardSuccessModal';

const defaultProps = {
  isModalVisible: true,
  cardType: 'Virtual',
  last4: '1234',
  onOkay: jest.fn(),
};

describe('DeleteCardSuccessModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default props (active card deletion success)', () => {
    it('renders the default success title', () => {
      render(<DeleteCardSuccessModal {...defaultProps} />);
      expect(screen.getByText('Your card has been deleted')).toBeTruthy();
    });

    it('renders the default description with card type and last4', () => {
      render(<DeleteCardSuccessModal {...defaultProps} />);
      expect(
        screen.getByText(
          'Your Virtual card ending in 1234 has been deleted.',
        ),
      ).toBeTruthy();
    });

    it('renders the Okay button', () => {
      render(<DeleteCardSuccessModal {...defaultProps} />);
      expect(screen.getByText('Okay')).toBeTruthy();
    });

    it('calls onOkay when Okay button is pressed', () => {
      const onOkay = jest.fn();
      render(<DeleteCardSuccessModal {...defaultProps} onOkay={onOkay} />);
      fireEvent.press(screen.getByText('Okay'));

      expect(onOkay).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom props (order cancellation success)', () => {
    it('renders custom title and description when provided', () => {
      render(
        <DeleteCardSuccessModal
          {...defaultProps}
          title='Your card order has been cancelled'
          description='The Physical card order ending in 5678 was cancelled.'
        />,
      );

      expect(
        screen.getByText('Your card order has been cancelled'),
      ).toBeTruthy();
      expect(
        screen.getByText(
          'The Physical card order ending in 5678 was cancelled.',
        ),
      ).toBeTruthy();
    });

    it('still renders the Okay button with custom props', () => {
      render(
        <DeleteCardSuccessModal
          {...defaultProps}
          title='Custom title'
          description='Custom desc'
        />,
      );
      expect(screen.getByText('Okay')).toBeTruthy();
    });
  });
  
  describe('visibility', () => {
    it('renders nothing when isModalVisible is false', () => {
      const { toJSON } = render(
        <DeleteCardSuccessModal {...defaultProps} isModalVisible={false} />,
      );
      expect(toJSON()).toBeNull();
    });
  });
});
