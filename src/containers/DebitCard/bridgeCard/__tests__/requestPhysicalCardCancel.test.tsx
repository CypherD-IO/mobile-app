/**
 * Unit tests for RequestPhysicalCardCancel screen.
 *
 */

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockShowModal = jest.fn();
const mockHideModal = jest.fn();
const mockDeleteWithAuth = jest.fn();

jest.mock('../../../../styles/tailwindComponents', () => {
  const {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
  } = require('react-native');
  return {
    CyDView: View,
    CyDText: Text,
    CyDTextInput: TextInput,
    CyDTouchView: TouchableOpacity,
    CyDImage: Image,
    CyDScrollView: ScrollView,
    CyDIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        PHYSICAL_CARD_CANCELLATION: 'Physical card Cancellation',
        PHYSICAL_CARD_CANCEL_CONFIRMATION: 'Physical card Confirmation',
        PHYSICAL_CARD_CANCEL_SUBTITLE:
          'The following charges and refunds apply to this cancellation.',
        PHYSICAL_CARD_CANCELLATION_CHARGES:
          'Physical card cancellation charges',
        FREE_LABEL: 'Free',
        TOTAL_REFUND_AMOUNT: 'Total Refund Amount',
        CANCELLING_CARD: 'Cancelling card',
        REFUNDING_TO: 'Refunding to',
        CYPHER_CARD_BALANCE: 'Cypher Card Balance',
        CARD_SPENDING_BALANCE: 'Card spending balance',
        CANCEL_ORDER_TITLE: 'Are you sure?',
        CANCEL_ORDER_WARNING: 'This cancellation cannot be undone.',
        CANCEL_ORDER_PLACEHOLDER: 'Type "confirm" to proceed',
        CANCEL_ORDER_ACTION: 'Confirm',
        CANCEL_ORDER_FAILED: 'Cancellation Failed',
        CANCEL_ORDER_SOMETHING_WENT_WRONG:
          'Something went wrong. Please try again.',
        CANCEL_ORDER_SUCCESS_TITLE: 'Your card order has been cancelled',
        CANCEL_ORDER_SUCCESS_DESC: `Your Physical card ending in ${params?.last4 ?? ''} has been cancelled.`,
        DELETE_CARD_CANCEL: 'Cancel',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('../../../../reducers/themeReducer', () => ({
  Theme: { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' },
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../../core/HttpRequest', () => ({
  __esModule: true,
  default: () => ({ deleteWithAuth: mockDeleteWithAuth }),
}));

jest.mock('../../../../components/v2/GlobalModal', () => ({
  useGlobalModalContext: () => ({
    showModal: mockShowModal,
    hideModal: mockHideModal,
  }),
}));

jest.mock('../../../../../assets/images/appImages', () => ({
  APP_LOGO: 'app-logo-mock',
}));

jest.mock('../../../../components/v2/deleteCardModal', () => {
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({
      isModalVisible,
      onDeleteCard,
      confirmWord,
    }: {
      isModalVisible: boolean;
      onDeleteCard: () => void;
      confirmWord?: string;
    }) =>
      isModalVisible ? (
        <View>
          <Text>MockDeleteCardModal</Text>
          <TextInput
            testID='confirm-input'
            placeholder={`Type "${confirmWord ?? 'delete'}"`}
          />
          <TouchableOpacity testID='modal-action-btn' onPress={onDeleteCard}>
            <Text>ModalAction</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

jest.mock('../../../../components/v2/deleteCardSuccessModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({
      isModalVisible,
      onOkay,
      title,
    }: {
      isModalVisible: boolean;
      onOkay: () => void;
      title?: string;
    }) =>
      isModalVisible ? (
        <View>
          <Text>{title ?? 'MockSuccessTitle'}</Text>
          <TouchableOpacity testID='success-okay-btn' onPress={onOkay}>
            <Text>Okay</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';
import RequestPhysicalCardCancel from '../requestPhysicalCardCancel';

const baseCard = {
  cardId: 'card-001',
  last4: '9876',
  status: 'ACTIVE',
  type: 'physical',
};

const eligibleOrder = {
  cardType: 'physical',
  orderStatus: 'IN_PRODUCTION',
  activityStatus: 'ACTIVE',
  cancellationEligible: true,
  amountCharged: 25,
};

/** Order that is NOT eligible for cancellation (already shipped) */
const nonEligibleOrder = {
  cardType: 'physical',
  orderStatus: 'SHIPPED',
  activityStatus: 'ACTIVE',
  cancellationEligible: false,
  amountCharged: 10,
};

let mockRouteParams: Record<string, unknown>;

const setRouteParams = (
  orderStatus: typeof eligibleOrder | typeof nonEligibleOrder,
  cardBalance = '150',
) => {
  mockRouteParams = {
    card: baseCard,
    cardBalance,
    orderStatus,
  };
};

describe('RequestPhysicalCardCancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRouteParams(eligibleOrder);
  });

  describe('cancellation-eligible order', () => {
    it('shows the "Cancellation" title', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('Physical card Cancellation')).toBeTruthy();
    });

    it('shows cancellation charges as "Free"', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('Free')).toBeTruthy();
    });

    it('shows the correct refund amount from amountCharged', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('$25.00')).toBeTruthy();
    });

    it('shows the "Refunding to" section with card balance', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('Refunding to')).toBeTruthy();
      expect(screen.getByText('Cypher Card Balance')).toBeTruthy();
      expect(screen.getByText('$150')).toBeTruthy();
    });

    it('shows the masked last 4 digits of the card', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('** 98**')).toBeTruthy();
    });
  });

  describe('non-eligible order (shipped)', () => {
    beforeEach(() => {
      setRouteParams(nonEligibleOrder);
    });

    it('shows the "Confirmation" title', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('Physical card Confirmation')).toBeTruthy();
    });

    it('shows the cancellation charge amount', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('$10.00')).toBeTruthy();
    });

    it('shows $0.00 refund', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.getByText('$0.00')).toBeTruthy();
    });

    it('does NOT show the "Refunding to" section', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.queryByText('Refunding to')).toBeNull();
    });
  });

  describe('confirm button', () => {
    it('opens the confirmation modal on press', () => {
      render(<RequestPhysicalCardCancel />);
      expect(screen.queryByText('MockDeleteCardModal')).toBeNull();

      fireEvent.press(screen.getByText('Confirm'));
      expect(screen.getByText('MockDeleteCardModal')).toBeTruthy();
    });
  });

  describe('DELETE API — success', () => {
    it('shows the success modal after a successful cancellation', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: false,
        data: { success: true },
      });

      render(<RequestPhysicalCardCancel />);

      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('Your card order has been cancelled'),
        ).toBeTruthy();
      });
    });

    it('sends the correct request body for an eligible order', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: false,
        data: { success: true },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      expect(mockDeleteWithAuth).toHaveBeenCalledWith(
        '/v1/cards/physical-card-order',
        undefined,
        undefined,
        {
          cardId: 'card-001',
          reason: 'User requested cancellation',
        },
      );
    });

    it('sends forceCancel: true for a non-eligible order', async () => {
      setRouteParams(nonEligibleOrder);
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: false,
        data: { success: true },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      expect(mockDeleteWithAuth).toHaveBeenCalledWith(
        '/v1/cards/physical-card-order',
        undefined,
        undefined,
        {
          cardId: 'card-001',
          reason: 'User requested cancellation',
          forceCancel: true,
        },
      );
    });

    it('navigates back when the success modal Okay is pressed', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: false,
        data: { success: true },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('success-okay-btn')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('success-okay-btn'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE API — error responses', () => {
    it('shows error modal with specific message from errors array (400 bulk shipment)', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: true,
        data: {
          errors: [
            {
              message:
                'Cannot cancel individual cards in a bulk shipment',
            },
          ],
        },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalledWith('state', {
          type: 'error',
          title: 'Cancellation Failed',
          description:
            'Cannot cancel individual cards in a bulk shipment',
          onSuccess: expect.any(Function),
          onFailure: expect.any(Function),
        });
      });
    });

    it('shows error modal for 401 Unauthorized', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: true,
        data: {
          errors: [
            {
              message: 'You are not authorized to cancel this card order',
            },
          ],
        },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalledWith('state', {
          type: 'error',
          title: 'Cancellation Failed',
          description: 'You are not authorized to cancel this card order',
          onSuccess: expect.any(Function),
          onFailure: expect.any(Function),
        });
      });
    });

    it('shows error modal for 404 Not Found', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: true,
        data: {
          errors: [
            {
              message:
                'Card order not found in the order management system',
            },
          ],
        },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalledWith('state', {
          type: 'error',
          title: 'Cancellation Failed',
          description:
            'Card order not found in the order management system',
          onSuccess: expect.any(Function),
          onFailure: expect.any(Function),
        });
      });
    });

    it('shows error modal for 500 Internal Server Error', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: true,
        data: {
          message: 'Internal server error',
        },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalledWith('state', {
          type: 'error',
          title: 'Cancellation Failed',
          description: 'Internal server error',
          onSuccess: expect.any(Function),
          onFailure: expect.any(Function),
        });
      });
    });

    it('falls back to generic message when no specific error info', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: true,
        data: {},
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalledWith('state', {
          type: 'error',
          title: 'Cancellation Failed',
          description: 'Something went wrong. Please try again.',
          onSuccess: expect.any(Function),
          onFailure: expect.any(Function),
        });
      });
    });

    it('navigates back when error modal onSuccess is triggered', async () => {
      mockDeleteWithAuth.mockResolvedValueOnce({
        isError: true,
        data: {
          errors: [{ message: 'Some error' }],
        },
      });

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalled();
      });

      // Invoke the onSuccess callback the component passed to showModal
      const showModalCall = mockShowModal.mock.calls[0];
      const modalParams = showModalCall[1];
      modalParams.onSuccess();

      expect(mockHideModal).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('DELETE API — network/unexpected error', () => {
    it('captures exception with Sentry and shows generic error modal', async () => {
      mockDeleteWithAuth.mockRejectedValueOnce(new Error('Network failure'));

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalledWith(
          expect.any(Error),
        );
        expect(mockShowModal).toHaveBeenCalledWith('state', {
          type: 'error',
          title: 'Cancellation Failed',
          description: 'Something went wrong. Please try again.',
          onSuccess: expect.any(Function),
          onFailure: expect.any(Function),
        });
      });
    });

    it('navigates back when error modal onFailure is triggered (catch branch)', async () => {
      mockDeleteWithAuth.mockRejectedValueOnce(new Error('Timeout'));

      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('Confirm'));

      await act(async () => {
        fireEvent.press(screen.getByTestId('modal-action-btn'));
      });

      await waitFor(() => {
        expect(mockShowModal).toHaveBeenCalled();
      });

      const modalParams = mockShowModal.mock.calls[0][1];
      modalParams.onFailure();

      expect(mockHideModal).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('back navigation', () => {
    it('calls goBack when the back arrow is pressed', () => {
      render(<RequestPhysicalCardCancel />);
      fireEvent.press(screen.getByText('arrow-left'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
