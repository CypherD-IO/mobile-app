/**
 * Unit tests for DeleteCardModal component.
 */

jest.mock('../../../styles/tailwindComponents', () => {
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    CyDView: View,
    CyDText: Text,
    CyDTextInput: TextInput,
    CyDTouchView: TouchableOpacity,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        DELETE_CARD_TITLE: 'Are you sure?',
        DELETE_CARD_WARNING:
          'This action is permanent. Type "delete" to confirm.',
        DELETE_CARD_PLACEHOLDER: 'Type "delete" to confirm',
        DELETE_CARD_CANCEL: 'Cancel',
        DELETE_CARD: 'Delete Card',
      };
      return map[key] ?? key;
    },
  }),
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
import DeleteCardModal from '../deleteCardModal';

const defaultProps = {
  isModalVisible: true,
  setIsModalVisible: jest.fn(),
  onDeleteCard: jest.fn(),
};

const renderModal = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<DeleteCardModal {...defaultProps} {...overrides} />);

describe('DeleteCardModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default props (active card deletion)', () => {
    it('renders the default title, warning, and placeholder', () => {
      renderModal();

      expect(screen.getByText('Are you sure?')).toBeTruthy();
      expect(
        screen.getByText('This action is permanent. Type "delete" to confirm.'),
      ).toBeTruthy();
      expect(
        screen.getByPlaceholderText('Type "delete" to confirm'),
      ).toBeTruthy();
    });

    it('renders default cancel and action labels', () => {
      renderModal();

      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Delete Card')).toBeTruthy();
    });

    it('keeps the action button disabled until the user types "delete"', () => {
      const onDeleteCard = jest.fn();
      renderModal({ onDeleteCard });
      fireEvent.press(screen.getByText('Delete Card'));
      expect(onDeleteCard).not.toHaveBeenCalled();
    });

    it('enables the action button when user types the exact word "delete"', () => {
      const onDeleteCard = jest.fn();
      renderModal({ onDeleteCard });
      const input = screen.getByPlaceholderText('Type "delete" to confirm');
      fireEvent.changeText(input, 'delete');
      fireEvent.press(screen.getByText('Delete Card'));

      expect(onDeleteCard).toHaveBeenCalledTimes(1);
    });

    it('does NOT enable the button for case-mismatched input "Delete"', () => {
      const onDeleteCard = jest.fn();
      renderModal({ onDeleteCard });
      const input = screen.getByPlaceholderText('Type "delete" to confirm');
      fireEvent.changeText(input, 'Delete');
      fireEvent.press(screen.getByText('Delete Card'));

      expect(onDeleteCard).not.toHaveBeenCalled();
    });

    it('calls onDeleteCard when the enabled action button is pressed', () => {
      const onDeleteCard = jest.fn();
      renderModal({ onDeleteCard });
      const input = screen.getByPlaceholderText('Type "delete" to confirm');
      fireEvent.changeText(input, 'delete');
      fireEvent.press(screen.getByText('Delete Card'));

      expect(onDeleteCard).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onDeleteCard when the button is still disabled', () => {
      const onDeleteCard = jest.fn();
      renderModal({ onDeleteCard });
      fireEvent.press(screen.getByText('Delete Card'));

      expect(onDeleteCard).not.toHaveBeenCalled();
    });
  });

  describe('custom props (physical card cancellation)', () => {
    const cancelProps = {
      ...defaultProps,
      confirmWord: 'confirm',
      title: 'Cancel this order?',
      warning: 'Your physical card order will be cancelled.',
      placeholder: 'Type "confirm" to proceed',
      actionLabel: 'Confirm Cancellation',
      cancelLabel: 'Go Back',
    };

    it('renders custom title, warning, and placeholder', () => {
      render(<DeleteCardModal {...cancelProps} />);

      expect(screen.getByText('Cancel this order?')).toBeTruthy();
      expect(
        screen.getByText('Your physical card order will be cancelled.'),
      ).toBeTruthy();
      expect(
        screen.getByPlaceholderText('Type "confirm" to proceed'),
      ).toBeTruthy();
    });

    it('renders custom cancel and action labels', () => {
      render(<DeleteCardModal {...cancelProps} />);

      expect(screen.getByText('Go Back')).toBeTruthy();
      expect(screen.getByText('Confirm Cancellation')).toBeTruthy();
    });

    it('enables the action button when user types the custom confirmWord', () => {
      render(<DeleteCardModal {...cancelProps} />);
      const input = screen.getByPlaceholderText('Type "confirm" to proceed');
      fireEvent.changeText(input, 'confirm');

      const actionButton = screen.getByText('Confirm Cancellation').parent!;
      expect(actionButton.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('stays disabled for the wrong word', () => {
      const onDeleteCard = jest.fn();
      render(<DeleteCardModal {...cancelProps} onDeleteCard={onDeleteCard} />);
      const input = screen.getByPlaceholderText('Type "confirm" to proceed');
      fireEvent.changeText(input, 'delete');
      fireEvent.press(screen.getByText('Confirm Cancellation'));

      expect(onDeleteCard).not.toHaveBeenCalled();
    });
  });

  describe('cancel and dismiss', () => {
    it('calls setIsModalVisible(false) when Cancel is pressed', () => {
      const setIsModalVisible = jest.fn();
      renderModal({ setIsModalVisible });
      fireEvent.press(screen.getByText('Cancel'));

      expect(setIsModalVisible).toHaveBeenCalledWith(false);
    });

    it('clears the text input when the modal is dismissed', () => {
      const setIsModalVisible = jest.fn();
      renderModal({ setIsModalVisible });

      const input = screen.getByPlaceholderText('Type "delete" to confirm');
      fireEvent.changeText(input, 'del');
      fireEvent.press(screen.getByText('Cancel'));

      expect(setIsModalVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('visibility', () => {
    it('renders nothing when isModalVisible is false', () => {
      const { toJSON } = render(
        <DeleteCardModal {...defaultProps} isModalVisible={false} />,
      );
      expect(toJSON()).toBeNull();
    });
  });
});
