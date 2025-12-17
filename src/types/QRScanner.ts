/**
 * QRScanner Types
 *
 * This file contains type definitions for QR code scanning functionality.
 * These types provide compatibility with the previous react-native-camera
 * BarCodeReadEvent interface while using react-native-vision-camera.
 */

/**
 * Event object returned when a QR code is successfully scanned.
 * This interface mirrors the shape of the old BarCodeReadEvent from react-native-camera
 * to maintain backwards compatibility with existing callback handlers.
 */
export interface QRCodeReadEvent {
  /** The decoded data/content from the scanned QR code */
  data: string;
}
