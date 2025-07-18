import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
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
import { StyleSheet, Platform, StatusBar } from 'react-native';

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
  snapPoints?: Array<string | number>;
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
      title,
      showHandle = true,
      showCloseButton = false,
      scrollable = false,
      keyboardBehavior = 'interactive',
      keyboardBlurBehavior = 'restore',
      androidKeyboardInputMode = 'adjustResize',
      topBarColor,
    },
    ref,
  ) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { theme } = useTheme();
    const { colorScheme } = useColorScheme();

    const isDarkMode =
      theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

    console.log('isDarkMode', isDarkMode);

    // Memoize snap points
    const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

    // Expose methods through ref
    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          bottomSheetRef.current?.snapToIndex(0);
        },
        dismiss: () => {
          bottomSheetRef.current?.close();
        },
        snapToIndex: (index: number) => {
          bottomSheetRef.current?.snapToIndex(index);
        },
        snapToPosition: (position: string | number) =>
          bottomSheetRef.current?.snapToPosition(position),
        expand: () => bottomSheetRef.current?.expand(),
        collapse: () => bottomSheetRef.current?.collapse(),
        close: () => {
          bottomSheetRef.current?.close();
        },
      }),
      [],
    );

    // Handle sheet changes
    const handleSheetChanges = useCallback(
      (index: number) => {
        console.log('Bottom sheet index changed to:', index);

        // Update status bar based on sheet state
        // if (Platform.OS === 'android') {
        //   const isFullScreen = index === snapPointsMemo.length - 1;
        //   const bgColor = isFullScreen
        //     ? theme === 'dark'
        //       ? '#000000ff'
        //       : '#ffffffff'
        //     : 'transparent';
        //   StatusBar.setBackgroundColor(bgColor);
        // }

        // Handle callbacks
        if (index === -1) {
          onClose?.();
        } else if (index >= 0) {
          onOpen?.();
        }

        onChange?.(index);
      },
      [theme, snapPointsMemo.length, onClose, onOpen, onChange],
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
          backgroundStyle={{
            backgroundColor:
              backgroundColor ?? (isDarkMode ? '#161616' : '#F5F6F7'), // Force dark background
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
          handleIndicatorStyle={
            handleIndicatorStyle ?? {
              backgroundColor: isDarkMode ? '#444' : '#ccc',
              width: 34,
            }
          }
          handleStyle={
            handleStyle ?? {
              backgroundColor:
                topBarColor ??
                backgroundColor ??
                (isDarkMode ? '#161616' : '#F5F6F7'),
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }
          }
          backdropComponent={renderBackdrop}
          onChange={handleSheetChanges}
          keyboardBehavior={keyboardBehavior}
          keyboardBlurBehavior={keyboardBlurBehavior}
          android_keyboardInputMode={androidKeyboardInputMode}
          style={[
            styles.bottomSheet,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 1000,
              zIndex: 10000,
            },
          ]}>
          <ContentWrapper
            style={{ flex: 1 }}
            contentContainerStyle={
              scrollable ? { flexGrow: 1, paddingBottom: 24 } : undefined
            }
            showsVerticalScrollIndicator={false}>
            {/* Header with title and close button */}
            {title && (
              <CyDView className='flex-row items-center justify-between px-4 py-3 border-b border-n40'>
                <CyDView className='flex-1'>
                  {title && (
                    <CyDText className='text-[18px] font-bold'>{title}</CyDText>
                  )}
                </CyDView>
              </CyDView>
            )}

            {/* Content */}
            <CyDView className='flex-1'>{children}</CyDView>
          </ContentWrapper>
        </BottomSheet>
      </CyDView>
    );
  },
);

const styles = StyleSheet.create({
  bottomSheet: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 1000,
    zIndex: 10000,
  },
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
