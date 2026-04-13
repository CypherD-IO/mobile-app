/**
 * Unit tests for Empty component.
 * Verifies it renders the empty state message.
 */

jest.mock('../../../styles/tailwindComponents', () => {
  const { View, Text, Image } = require('react-native');
  return { CyDView: View, CyDText: Text, CyDImage: Image };
});
jest.mock('../../../../assets/images/appImages', () => ({
  __esModule: true,
  default: { EMPTY: 'empty_placeholder' },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Empty from '../empty';

describe('Empty', () => {
  it('renders the empty state message', () => {
    render(<Empty />);
    expect(screen.getByText('Oops is empty !')).toBeTruthy();
  });

  it('renders an image', () => {
    const { toJSON } = render(<Empty />);
    // Component tree should have an Image node
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('empty_placeholder');
  });

  it('produces a non-null render tree', () => {
    const { toJSON } = render(<Empty />);
    expect(toJSON()).not.toBeNull();
  });
});
