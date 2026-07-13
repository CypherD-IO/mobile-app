/**
 * Unit tests for WinddownStepCard — verifies the presentational contract:
 * badge, description, detail line and the optional action button render from
 * the view-model props alone (no internal logic).
 */

// Mock tailwindComponents to RN primitives — bypasses nativewind/theme chain.
// CyDTouchView → TouchableOpacity so the action button's onPress is testable.
jest.mock('../../../../styles/tailwindComponents', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    CyDView: View,
    CyDText: Text,
    CyDMaterialDesignIcons: View,
    CyDIcons: View,
    CyDTouchView: TouchableOpacity,
  };
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WinddownStepCard from '../WinddownStepCard';
import { WinddownStepStatus, WinddownStepViewModel } from '../../types';

const baseStep: WinddownStepViewModel = {
  id: 'withdraw',
  icon: 'arrow-up-right',
  iconType: 'cyd',
  title: 'Withdraw card balance',
  status: WinddownStepStatus.ACTIONABLE,
  isPrimary: true,
  description: 'Move any remaining card balance to your wallet before Oct 6.',
  detailLine: 'Balance $642.18',
  primaryAction: {
    label: 'Withdraw',
    variant: 'primary',
    onPress: jest.fn(),
  },
};

describe('WinddownStepCard', () => {
  it('renders title, description and detail line', () => {
    render(<WinddownStepCard step={baseStep} />);
    expect(screen.getByText('Withdraw card balance')).toBeTruthy();
    expect(
      screen.getByText(
        'Move any remaining card balance to your wallet before Oct 6.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Balance $642.18')).toBeTruthy();
  });

  it('renders the action button and fires its handler', () => {
    const onPress = jest.fn();
    render(
      <WinddownStepCard
        step={{
          ...baseStep,
          primaryAction: { label: 'Withdraw', variant: 'primary', onPress },
        }}
      />,
    );
    expect(screen.getByText('Withdraw')).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a badge when provided', () => {
    render(
      <WinddownStepCard
        step={{
          ...baseStep,
          status: WinddownStepStatus.COMPLETED,
          badge: { label: 'Completed', tone: 'green' },
          primaryAction: undefined,
        }}
      />,
    );
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('omits the action button when there is no primaryAction', () => {
    render(
      <WinddownStepCard
        step={{ ...baseStep, primaryAction: undefined, detailLine: undefined }}
      />,
    );
    expect(screen.queryByText('Withdraw')).toBeNull();
  });

  it('renders the not-backed-up red badge state with a material icon', () => {
    render(
      <WinddownStepCard
        step={{
          id: 'backup',
          icon: 'archive-outline',
          iconType: 'material',
          title: 'Backup Wallet',
          status: WinddownStepStatus.ACTIONABLE,
          isPrimary: false,
          badge: { label: 'Not backed up', tone: 'red' },
          description: 'Back up your seed phrase.',
        }}
      />,
    );
    expect(screen.getByText('Not backed up')).toBeTruthy();
    expect(screen.getByText('Backup Wallet')).toBeTruthy();
  });
});
