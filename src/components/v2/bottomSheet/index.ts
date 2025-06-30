// Export the main bottom sheet component and its types
export { default as CyDBottomSheet } from '../CyDBottomSheet';
export type { CyDBottomSheetRef } from '../CyDBottomSheet';

// Note: No provider needed - GestureHandlerRootView is already in App.tsx

// Example component has been removed

// Re-export useful types from the original library for convenience
export type {
  BottomSheetBackdropProps,
  BottomSheetFooterProps,
  BottomSheetHandleProps,
  BottomSheetModalProps,
  BottomSheetProps,
} from '@gorhom/bottom-sheet';

// Re-export useful components from the original library
export {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetSectionList,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetView,
  useBottomSheet,
  useBottomSheetModal,
  useBottomSheetSpringConfigs,
  useBottomSheetTimingConfigs,
  useBottomSheetInternal,
} from '@gorhom/bottom-sheet';
