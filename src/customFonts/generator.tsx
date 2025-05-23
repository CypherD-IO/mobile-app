import createIconSet from '@react-native-vector-icons/icomoon';
import icoMoonConfig from './selection.json';
import { IconNames } from './type';

export const iconNames = icoMoonConfig.icons.map(icon => icon.properties.name);

// Create the icon component with type-safe name prop
export const CyDIconsPack = createIconSet(
  icoMoonConfig,
  'CydFont',
  'CydFont.ttf',
) as React.ComponentType<{
  name: IconNames;
  [key: string]: any;
}>;
