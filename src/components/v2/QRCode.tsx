import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import QRCodeSvg from 'react-native-qrcode-svg';

/**
 * Thin wrapper around `react-native-qrcode-svg` to keep our app-level API stable.
 *
 * Why:
 * - `react-native-custom-qr-codes` is unmaintained and breaks on RN 0.83 (uses Image.propTypes).
 * - `react-native-qrcode-svg` is widely used, JS-only, and works fine with Fabric/New Architecture.
 *
 * Note:
 * - We intentionally ignore the old `codeStyle` prop (dot/square/etc). If you need
 *   styled QR codes later, we can extend this wrapper without touching callsites.
 */
export type CyDQRCodeProps = Readonly<{
  content: string;
  size?: number;
  logo?: ImageSourcePropType;
  logoSize?: number;
  /**
   * Optional access to the underlying `react-native-qrcode-svg` instance.
   *
   * Why:
   * - Android Fabric can be flaky when snapshotting arbitrary view tags via `react-native-view-shot`.
   * - `react-native-qrcode-svg` can export a PNG base64 directly via `toDataURL()`, which is more
   *   reliable for sharing.
   *
   * Note:
   * - The exported PNG is generated from the SVG QR layer; our overlaid RN <Image> logo (workaround)
   *   is NOT included in the export. This is acceptable for scan reliability (the QR has a logo hole),
   *   and avoids Android snapshot flakes.
   */
  onQRCodeRef?: (ref: unknown | null) => void;
  /**
   * Backwards-compat prop from the old library. Not used by `react-native-qrcode-svg`.
   */
  codeStyle?: string;
  /**
   * Optional container styling for layout alignment.
   */
  style?: StyleProp<ViewStyle>;
}>;

// NOTE:
// `react-native-qrcode-svg` renders the logo via `react-native-svg`'s <Image href={...} />.
// With newer RN + react-native-svg versions, local PNG logos can fail to render even though
// the "hole" (logo background) is drawn (you end up with an empty cutout).
//
// Workaround:
// - Use `logoSVG` with an "empty" SVG to preserve the *hole* (important for scan reliability),
// - Overlay a normal RN <Image> above the QR to display the actual logo.
const EMPTY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';

export default function QRCode(props: CyDQRCodeProps): React.ReactElement {
  const {
    content,
    size = 250,
    logo,
    logoSize = 60,
    style,
    onQRCodeRef,
  } = props;

  const logoContainerSize = Math.max(0, logoSize);
  const logoPos = (size - logoContainerSize) / 2;

  // `react-native-qrcode-svg` expects `value` not `content`.
  return (
    <View style={[{ width: size, height: size }, style]}>
      <QRCodeSvg
        value={content ?? ''}
        size={size}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getRef={onQRCodeRef as any}
        // Keep the old behavior of reserving a center area (hole) for the logo.
        // Using an empty SVG avoids the react-native-svg <Image> rendering edge cases.
        logoSVG={logo ? EMPTY_SVG : undefined}
        logoSize={logoSize}
        logoBackgroundColor='white'
        logoMargin={4}
        logoBorderRadius={12}
        // Increase error correction to keep QR scannable with a center logo.
        ecl='H'
      />

      {logo ? (
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            left: logoPos,
            top: logoPos,
            width: logoContainerSize,
            height: logoContainerSize,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: 'white',
          }}>
          <Image
            source={logo}
            style={{
              width: logoContainerSize,
              height: logoContainerSize,
              resizeMode: 'contain',
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
