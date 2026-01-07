/**
 * Barcode scan event type - compatible with the legacy react-native-camera API
 * Used as a callback parameter when QR codes are scanned
 */
export interface BarCodeReadEvent {
  /** The scanned barcode/QR code data string */
  data: string;
  /** The type of barcode (e.g., 'qr', 'ean-13', etc.) */
  type?: string;
}

