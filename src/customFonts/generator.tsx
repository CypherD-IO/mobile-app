import { createIconSetFromIcoMoon } from 'react-native-vector-icons';
import icoMoonConfig from './selection.json';
import { IconNames } from './type';

// Create the icon component with type-safe name prop
export const CydIconsPack = createIconSetFromIcoMoon(
  icoMoonConfig,
  'CydFont',
  'CydFont.ttf',
) as React.ComponentType<{
  name: IconNames;
  [key: string]: any;
}>;
