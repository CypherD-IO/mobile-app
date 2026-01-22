/**
 * Common QR/barcode scan event shape used across the app.
 *
 * Historically this came from `react-native-camera` as `BarCodeReadEvent`.
 * As part of the migration to `react-native-vision-camera`, we keep the minimal
 * contract we actually use everywhere: a single `data` string payload.
 */
export interface QRScanEvent {
  data: string;
}

