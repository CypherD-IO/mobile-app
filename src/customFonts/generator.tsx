import createIconSet from '@react-native-vector-icons/icomoon';
import rawConfig from './selection.json';
import { IconNames } from './type';

// v13 expects { icons: [{ properties: { name, code } }] } but the new IcoMoon App
// exports { glyphs: [{ extras: { name, codePoint } }] }. Transform if needed.
const raw = rawConfig as any;
const icoMoonConfig = raw.icons ? raw : {
  icons: (raw.glyphs ?? []).map((g: any) => ({
    properties: { name: g.extras?.name ?? '', code: g.extras?.codePoint ?? 0 },
  })),
  preferences: { fontPref: { metadata: { fontFamily: 'CydFont' } } },
};

export const iconNames = icoMoonConfig.icons.map((i: any) => i.properties.name);

export const CyDIconsPack = createIconSet(
  icoMoonConfig,
  'CydFont',
  'CydFont.ttf',
) as React.ComponentType<{
  name: IconNames;
  [key: string]: any;
}>;
