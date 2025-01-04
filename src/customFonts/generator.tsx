import { createIconSetFromIcoMoon } from 'react-native-vector-icons';
import icoMoonConfig from './selection.json';

const CydIconsPack = createIconSetFromIcoMoon(
  icoMoonConfig,
  'CydFont',
  'CydFont.ttf',
);

export default CydIconsPack;
