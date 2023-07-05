import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, Text } from 'react-native';
import {
  PanGestureHandler
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig
} from 'react-native-reanimated';
import { CyDFastImage, CyDSafeAreaView, CyDView } from '../../styles/tailwindStyles';
import { BottomSheetPositions } from '../../constants/enum';
import AppImages from '../../../assets/images/appImages';

interface SheetProps {
  minHeight?: number
  maxHeight?: number
  expandedHeight?: number
  heightChanged: (val: string) => void
}

type SheetPositions = BottomSheetPositions.MINIMISED | BottomSheetPositions.MAXIMISED | BottomSheetPositions.EXPANDED;

const window = Dimensions.get('window');
const screen = Dimensions.get('screen');

const NAV_HEIGHT = 48;

const Sheet: React.FC<SheetProps> = (props) => {
  const [dimensions, setDimensions] = useState({ window, screen });

  useEffect(() => {
    // Watch for screen size changes and update the dimensions
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window, screen }) => {
        setDimensions({ window, screen });
      }
    );
    return () => subscription?.remove();
  });

  // Fixed values (for snap positions)
  const minHeight = props.minHeight ?? dimensions.screen.height;
  const maxHeight = props.maxHeight ?? dimensions.screen.height;
  const expandedHeight = props.expandedHeight ?? dimensions.screen.height;

  // Animated values
  const position = useSharedValue<SheetPositions>(BottomSheetPositions.MINIMISED);
  const sheetHeight = useSharedValue(-minHeight);
  const navHeight = useSharedValue(0);

  const springConfig: WithSpringConfig = {
    damping: 50,
    mass: 0.3,
    stiffness: 120,
    overshootClamping: true,
    restSpeedThreshold: 0.3,
    restDisplacementThreshold: 0.3
  };

  const DRAG_BUFFER = 40;

  const onGestureEvent = useAnimatedGestureHandler({
    // Set the context value to the sheet's current height value
    onStart: (_ev, ctx: any) => {
      ctx.offsetY = sheetHeight.value;
    },
    // Update the sheet's height value based on the gesture
    onActive: (ev, ctx: any) => {
      sheetHeight.value = ctx.offsetY + ev.translationY;
    },
    // Snap the sheet to the correct position once the gesture ends
    onEnd: () => {
      // 'worklet' directive is required for animations to work based on shared values
      'worklet';

      // Snap to expanded position if the sheet is dragged up from minimised position
      // or dragged down from maximised position
      const shouldExpand =
        (position.value === BottomSheetPositions.MAXIMISED &&
          -sheetHeight.value < maxHeight - DRAG_BUFFER) ||
        (position.value === BottomSheetPositions.MINIMISED &&
          -sheetHeight.value > minHeight + DRAG_BUFFER);

      // Snap to minimised position if the sheet is dragged down from expanded position
      const shouldMinimise =
        position.value === BottomSheetPositions.EXPANDED &&
        -sheetHeight.value < expandedHeight - DRAG_BUFFER;

      // Snap to maximised position if the sheet is dragged up from expanded position
      const shouldMaximise =
        position.value === BottomSheetPositions.EXPANDED &&
        -sheetHeight.value > expandedHeight + DRAG_BUFFER;

      // Update the sheet's position with spring animation
      if (shouldExpand) {
        navHeight.value = withSpring(0, springConfig);
        sheetHeight.value = withSpring(-expandedHeight, springConfig);
        position.value = BottomSheetPositions.EXPANDED;
      } else if (shouldMaximise) {
        navHeight.value = withSpring(NAV_HEIGHT + 10, springConfig);
        sheetHeight.value = withSpring(-expandedHeight, springConfig);
        position.value = BottomSheetPositions.MAXIMISED;
      } else if (shouldMinimise) {
        navHeight.value = withSpring(0, springConfig);
        sheetHeight.value = withSpring(-minHeight, springConfig);
        position.value = BottomSheetPositions.MINIMISED;
      } else {
        sheetHeight.value = withSpring(
          position.value === BottomSheetPositions.EXPANDED
            ? -expandedHeight
            : position.value === BottomSheetPositions.MAXIMISED
              ? -expandedHeight
              : -minHeight,
          springConfig
        );
      }
      runOnJS(props.heightChanged)(position.value);
    }
  });

  const sheetHeightAnimatedStyle = useAnimatedStyle(() => ({
    // The 'worklet' directive is included with useAnimatedStyle hook by default
    height: -sheetHeight.value
  }));

  const sheetContentAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: position.value === BottomSheetPositions.MAXIMISED ? 0 : 0,
    paddingTop: position.value === BottomSheetPositions.MAXIMISED ? 0 : 0,
    paddingHorizontal: 5
  }));

  const sheetNavigationAnimatedStyle = useAnimatedStyle(() => ({
    height: navHeight.value,
    overflow: 'hidden'
  }));

  return (
    <CyDView style={styles.container}>
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View style={[sheetHeightAnimatedStyle, styles.sheet]}>
          <CyDView style={styles.handleContainer}>
            <CyDFastImage source={position.value === BottomSheetPositions.MINIMISED ? AppImages.WIDE_UP_ARROW : AppImages.WIDE_DOWN_ARROW } className={'h-[25px] w-[55px]'} resizeMode={'stretch'}/>
          </CyDView>
          <Animated.View style={sheetContentAnimatedStyle}>
            <CyDSafeAreaView>
              {props.children}
            </CyDSafeAreaView>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  // The sheet is positioned absolutely to sit at the bottom of the screen
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  sheet: {
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    // Round the top corners
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    minHeight: 80,
    // Add a shadow to the top of the sheet
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10
  },
  // Add a small handle component to indicate the sheet can be dragged
  handle: {
    width: '15%',
    height: 4,
    borderRadius: 8,
    backgroundColor: '#CCCCCC'
  },
  closeButton: {
    width: NAV_HEIGHT,
    height: NAV_HEIGHT,
    borderRadius: NAV_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10
  }
});

export default Sheet;
