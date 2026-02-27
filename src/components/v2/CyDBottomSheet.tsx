import React, {
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import { StyleSheet } from 'react-native';

export interface CyDBottomSheetRef {
  present: () => void;
  dismiss: () => void;
  snapToIndex: (index: number) => void;
  snapToPosition: (position: string | number) => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
}

interface CyDBottomSheetProps {
  children: React.ReactNode;
  snapPoints?: any[];
  initialSnapIndex?: number;
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  enableOverDrag?: boolean;
  backgroundColor?: string;
  handleStyle?: object;
  handleIndicatorStyle?: object;
  backdropComponent?: React.ComponentType<BottomSheetDefaultBackdropProps>;
  onClose?: () => void;
  onOpen?: () => void;
  onChange?: (index: number) => void;
  onAnimate?: (fromIndex: number, toIndex: number) => void;
  title?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  scrollable?: boolean;
  keyboardBehavior?: 'extend' | 'fillParent' | 'interactive';
  keyboardBlurBehavior?: 'none' | 'restore';
  androidKeyboardInputMode?: 'adjustPan' | 'adjustResize';
  /**
   * Optional color for the top bar of the bottom sheet. Convenience over using
   * `topBarStyle` when you only need to set a colour.
   */
  topBarColor?: string;
  borderRadius?: number;
  showBackdrop?: boolean;
  bottomInset?: number;
  fixedHeaderContent?: React.ReactNode;
  defaultPresentIndex?: number;
}

const CyDBottomSheet = forwardRef<CyDBottomSheetRef, CyDBottomSheetProps>(
  (
    {
      children,
      snapPoints = ['25%', '50%', '90%'],
      initialSnapIndex,
      enableDynamicSizing = false,
      enablePanDownToClose = true,
      enableOverDrag = true,
      backgroundColor,
      handleStyle,
      handleIndicatorStyle,
      backdropComponent,
      onClose,
      onOpen,
      onChange,
      onAnimate,
      title,
      showHandle = true,
      showCloseButton = false,
      scrollable = false,
      keyboardBehavior = 'interactive',
      keyboardBlurBehavior = 'restore',
      androidKeyboardInputMode = 'adjustResize',
      topBarColor,
      borderRadius = 16,
      showBackdrop = true,
      bottomInset = 0,
      fixedHeaderContent,
      defaultPresentIndex = 0,
    },
    ref,
  ) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { theme } = useTheme();
    const { colorScheme } = useColorScheme();

    const isDarkMode =
      theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

    // Memoize snap points
    const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

    // Track the previous index so we can differentiate between the initial `-1` callback that
    // happens on mount and a genuine close event. This prevents the provider from interpreting
    // the very first `-1` as a user-initiated dismissal, which could lead to the sheet being
    // removed from the React tree before it has a chance to present.
    const previousIndexRef = useRef<number | null>(null);

    // Auto-present the bottom sheet when component mounts if no initialSnapIndex is provided
    useEffect(() => {
      if (initialSnapIndex === undefined || initialSnapIndex === -1) {
        const timer = setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(defaultPresentIndex);
        }, 200);

        return () => clearTimeout(timer);
      }
    }, [initialSnapIndex, defaultPresentIndex]);

    // Expose methods through ref
    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          try {
            bottomSheetRef.current?.snapToIndex(defaultPresentIndex);
          } catch (error) {
            console.error('CyDBottomSheet: Error in present():', error);
          }
        },
        dismiss: () => {
          try {
            bottomSheetRef.current?.close();
          } catch (error) {
            console.error('CyDBottomSheet: Error in dismiss():', error);
          }
        },
        snapToIndex: (index: number) => {
          try {
            bottomSheetRef.current?.snapToIndex(index);
          } catch (error) {
            console.error('CyDBottomSheet: Error in snapToIndex():', error);
          }
        },
        snapToPosition: (position: string | number) => {
          try {
            return bottomSheetRef.current?.snapToPosition(position);
          } catch (error) {
            console.error('CyDBottomSheet: Error in snapToPosition():', error);
          }
        },
        expand: () => {
          try {
            return bottomSheetRef.current?.expand();
          } catch (error) {
            console.error('CyDBottomSheet: Error in expand():', error);
          }
        },
        collapse: () => {
          try {
            return bottomSheetRef.current?.collapse();
          } catch (error) {
            console.error('CyDBottomSheet: Error in collapse():', error);
          }
        },
        close: () => {
          try {
            bottomSheetRef.current?.close();
          } catch (error) {
            console.error('CyDBottomSheet: Error in close():', error);
          }
        },
      }),
      [defaultPresentIndex],
    );

    // Handle sheet changes
    const handleSheetChanges = useCallback(
      (index: number) => {
        const prevIndex = previousIndexRef.current;
        previousIndexRef.current = index;

        // We only want to fire onOpen/onClose when we actually transition between states.
        // 1. onOpen -> when we go from a closed state (-1) to any open index (>= 0)
        // 2. onClose -> when we go from an open state (>= 0) to closed (-1)
        if (index >= 0 && (prevIndex === -1 || prevIndex === null)) {
          onOpen?.();
        }

        if (index === -1 && prevIndex !== -1 && prevIndex !== null) {
          onClose?.();
        }

        // Always forward the raw value to the consumer
        onChange?.(index);
      },
      [onClose, onOpen, onChange],
    );

    // Custom backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetDefaultBackdropProps) => {
        if (backdropComponent) {
          return React.createElement(backdropComponent, props);
        }

        return (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.8}
            enableTouchThrough={false}
            pressBehavior='close'
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)', // Force visible backdrop
            }}
          />
        );
      },
      [backdropComponent],
    );

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    /**
     * When we want the handle to visually appear "inside" the content (e.g. inside a blurred header),
     * we hide the native handle area entirely and render a custom indicator inside the sheet content.
     *
     * Important: the sheet remains draggable because RNGH gestures can be handled by the content area.
     */
    const hiddenHandleComponent = useCallback(() => {
      return <CyDView style={{ height: 0 }} />;
    }, []);

    return (
      <CyDView
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          elevation: 1000,
          pointerEvents: 'box-none',
        }}>
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPointsMemo}
          index={initialSnapIndex ?? -1}
          enablePanDownToClose={enablePanDownToClose}
          enableOverDrag={enableOverDrag}
          enableDynamicSizing={enableDynamicSizing}
          bottomInset={bottomInset}
          containerStyle={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 1000,
            zIndex: 10000,
          }}
          backgroundStyle={{
            backgroundColor:
              backgroundColor ?? (isDarkMode ? '#161616' : '#F5F6F7'),
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          }}
          handleComponent={showHandle ? undefined : hiddenHandleComponent}
          handleIndicatorStyle={
            showHandle
              ? handleIndicatorStyle ?? {
                  backgroundColor: isDarkMode ? '#444' : '#ccc',
                  width: 34,
                }
              : { height: 0, width: 0 }
          }
          handleStyle={
            showHandle
              ? handleStyle ?? {
                  backgroundColor:
                    topBarColor ??
                    backgroundColor ??
                    (isDarkMode ? '#161616' : '#F5F6F7'),
                  borderTopLeftRadius: borderRadius,
                  borderTopRightRadius: borderRadius,
                }
              : { height: 0, padding: 0 }
          }
          backdropComponent={showBackdrop ? renderBackdrop : undefined}
          onChange={handleSheetChanges}
          onAnimate={onAnimate}
          keyboardBehavior={keyboardBehavior}
          keyboardBlurBehavior={keyboardBlurBehavior}
          android_keyboardInputMode={androidKeyboardInputMode}
          style={[
            styles.bottomSheet,
            {
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
              overflow: 'hidden',
            },
          ]}>
          <ContentWrapper
            style={{ flex: 1 }}
            contentContainerStyle={
              scrollable ? { flexGrow: 1, paddingBottom: 24 } : undefined
            }
            showsVerticalScrollIndicator={false}
            {...(scrollable && fixedHeaderContent
              ? { stickyHeaderIndices: [title ? 1 : 0] }
              : {})}>
            {/* Title bar */}
            {title && (
              <CyDView className='flex-row items-center justify-between px-4 py-3 border-b border-n40'>
                <CyDView className='flex-1'>
                  <CyDText className='text-[18px] font-bold'>{title}</CyDText>
                </CyDView>
              </CyDView>
            )}

            {/* Fixed header content (sticky when scrollable) */}
            {fixedHeaderContent && (
              <CyDView
                style={{
                  backgroundColor:
                    backgroundColor ?? (isDarkMode ? '#161616' : '#FFFFFF'),
                }}>
                {fixedHeaderContent}
              </CyDView>
            )}

            {/* Scrollable content */}
            <CyDView className='flex-1'>{children}</CyDView>
          </ContentWrapper>
        </BottomSheet>
      </CyDView>
    );
  },
);

const styles = StyleSheet.create({
  bottomSheet: {},
  contentContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});

CyDBottomSheet.displayName = 'CyDBottomSheet';

export default CyDBottomSheet;
