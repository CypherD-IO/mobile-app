/**
 * Unit tests for CyDContainer component.
 * Verifies default rendering vs background-image rendering.
 */

jest.mock('../../../styles/tailwindComponents', () => {
  const { View, ImageBackground } = require('react-native');
  return {
    CyDView: View,
    CyDSafeAreaView: View,
    CyDImageBackground: ImageBackground,
  };
});
jest.mock('../../../constants/theme', () => ({
  Colors: { white: '#FFFFFF' },
}));

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import CyDContainer from '../container';

describe('CyDContainer', () => {
  it('renders children in default mode (no background image)', () => {
    render(
      <CyDContainer>
        {[<Text key='a'>Hello</Text>]}
      </CyDContainer>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('renders children with background image', () => {
    render(
      <CyDContainer backgroundImage={{ uri: 'https://example.com/bg.png' }}>
        {[<Text key='a'>World</Text>]}
      </CyDContainer>,
    );
    expect(screen.getByText('World')).toBeTruthy();
  });

  it('applies accent color when provided with background image', () => {
    const { toJSON } = render(
      <CyDContainer
        backgroundImage={{ uri: 'https://example.com/bg.png' }}
        accentColor='#FF0000'>
        {[<Text key='a'>Styled</Text>]}
      </CyDContainer>,
    );
    const tree = JSON.stringify(toJSON());
    // accentColor is passed as inline backgroundColor
    expect(tree).toContain('#FF0000');
  });

  it('uses white as default background when no accentColor', () => {
    const { toJSON } = render(
      <CyDContainer backgroundImage={{ uri: 'https://example.com/bg.png' }}>
        {[<Text key='a'>Default</Text>]}
      </CyDContainer>,
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('#FFFFFF');
  });
});
