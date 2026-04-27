/**
 * Unit tests for CardTagBadge component.
 * Verifies rendering behavior: null for empty tag, emoji + name display, truncation.
 */

// Mock tailwindComponents to basic RN primitives — bypasses nativewind/theme chain
jest.mock('../../styles/tailwindComponents', () => {
  const { View, Text } = require('react-native');
  return { CyDView: View, CyDText: Text };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CardTagBadge from '../CardTagBadge';

describe('CardTagBadge', () => {
  it('returns null when tag is empty string', () => {
    const { toJSON } = render(<CardTagBadge tag='' />);
    expect(toJSON()).toBeNull();
  });

  it('renders emoji and name from tag', () => {
    render(<CardTagBadge tag='🛍️ Shopping' />);
    expect(screen.getByText('🛍️')).toBeTruthy();
    expect(screen.getByText('Shopping')).toBeTruthy();
  });

  it('truncates long names to 11 characters', () => {
    render(<CardTagBadge tag='✈️ International Card' />);
    expect(screen.getByText('✈️')).toBeTruthy();
    // lodash truncate with length: 11 → "Internat..." (8 chars + 3 ellipsis = 11 total)
    expect(screen.getByText('Internat...')).toBeTruthy();
  });

  it('handles tag with no space (no emoji)', () => {
    render(<CardTagBadge tag='Shopping' />);
    // parseCardTag returns { emoji: '', name: 'Shopping' } when no space
    expect(screen.getByText('Shopping')).toBeTruthy();
  });

  it('renders with custom className without crashing', () => {
    const { toJSON } = render(
      <CardTagBadge tag='🛍️ Shopping' className='ml-2' />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
