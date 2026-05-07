/**
 * Unit tests for DeleteCardResultModal component.
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
        DELETE_CARD_SUCCESS_DESC: `Your ${params?.cardType ?? ''} card ending ** ${params?.last4 ?? ''} has been permanently removed from your account.`,
        DELETE_CARD_FAILED: 'Card deletion failed',
        DELETE_CARD_SOMETHING_WENT_WRONG:
          'Something went wrong while deleting. Please contact support.',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('../../../../assets/images/appImages', () => ({
  SUCCESS_TICK_GREEN_BG_ROUNDED: 'success-tick-mock',
  ERROR_EXCLAMATION_RED_BG_ROUNDED: 'error-exclamation-mock',
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
import DeleteCardResultModal from '../deleteCardResultModal';

const defaultProps = {
  isModalVisible: true,
  cardType: 'Virtual',
  last4: '1234',
  onOkay: jest.fn(),
};

describe('DeleteCardResultModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('success type (default)', () => {
    it('renders the default success title', () => {
      render(<DeleteCardResultModal {...defaultProps} />);
      expect(screen.getByText('Your card has been deleted')).toBeTruthy();
    });

    it('renders the default description with card type and last4', () => {
      render(<DeleteCardResultModal {...defaultProps} />);
      expect(
        screen.getByText(
          'Your Virtual card ending ** 1234 has been permanently removed from your account.',
        ),
      ).toBeTruthy();
    });

    it('renders the Okay button', () => {
      render(<DeleteCardResultModal {...defaultProps} />);
      expect(screen.getByText('Okay')).toBeTruthy();
    });

    it('calls onOkay when Okay button is pressed', () => {
      const onOkay = jest.fn();
      render(<DeleteCardResultModal {...defaultProps} onOkay={onOkay} />);
      fireEvent.press(screen.getByText('Okay'));

      expect(onOkay).toHaveBeenCalledTimes(1);
    });
  });

  describe('error type', () => {
    it('renders the default error title', () => {
      render(<DeleteCardResultModal {...defaultProps} type='error' />);
      expect(screen.getByText('Card deletion failed')).toBeTruthy();
    });

    it('renders the default error description', () => {
      render(<DeleteCardResultModal {...defaultProps} type='error' />);
      expect(
        screen.getByText(
          'Something went wrong while deleting. Please contact support.',
        ),
      ).toBeTruthy();
    });

    it('renders custom error title and description when provided', () => {
      render(
        <DeleteCardResultModal
          {...defaultProps}
          type='error'
          title='Custom error title'
          description='Custom error description'
        />,
      );

      expect(screen.getByText('Custom error title')).toBeTruthy();
      expect(screen.getByText('Custom error description')).toBeTruthy();
    });

    it('calls onOkay when Okay button is pressed on error modal', () => {
      const onOkay = jest.fn();
      render(
        <DeleteCardResultModal {...defaultProps} type='error' onOkay={onOkay} />,
      );
      fireEvent.press(screen.getByText('Okay'));

      expect(onOkay).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom props (order cancellation success)', () => {
    it('renders custom title and description when provided', () => {
      render(
        <DeleteCardResultModal
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
        <DeleteCardResultModal
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
        <DeleteCardResultModal {...defaultProps} isModalVisible={false} />,
      );
      expect(toJSON()).toBeNull();
    });
  });
});
