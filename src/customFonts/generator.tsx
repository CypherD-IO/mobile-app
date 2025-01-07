import { createIconSetFromIcoMoon } from 'react-native-vector-icons';
import icoMoonConfig from './selection.json';

// Extract icon names from icoMoonConfig to create a union type
type IconNames = (typeof icoMoonConfig.icons)[number]['properties']['name'];

// Create the icon component with type-safe name prop
const CydIconsPack = createIconSetFromIcoMoon(
  icoMoonConfig,
  'CydFont',
  'CydFont.ttf',
) as React.ComponentType<{
  name: IconNames;
  [key: string]: any;
}>;

export default CydIconsPack;
