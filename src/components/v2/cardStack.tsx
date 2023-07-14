import React, { PureComponent, useEffect, useState } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Dimensions
} from 'react-native';
import { CyDText } from '../../styles/tailwindStyles';

interface SwipeableViewStackState {
  viewPan: Object
  viewStackedAnim: Object
  currentStackedViewIndex: number
}

interface SwipeableViewStackProps {
  onSwipe?: Function
  initialSelectedIndex?: number
  data: Object[]
  onItemClicked: Function
  renderItem: Function
  stackSpacing?: number
}

const HORIZONTAL_SWIPE_THRESHOLD = 40;
const SCROLL_DISABLE_THRESHOLD = 5;
const CLICK_THRESHOLD = 10;
const SWIPE_ANIM_DURATION = 300;

export default function SwipeableViewStack (props: SwipeableViewStackProps) {
  const dataArray = props.data;
  const viewPan = new Animated.ValueXY();
  const viewStackedAnim = new Animated.Value(0);
  const [currentStackedViewIndex, setCurrentStackedViewIndex] = useState(props.initialSelectedIndex ? props.initialSelectedIndex : 0);
  const [viewPanResponder, setViewPanResponder] = useState<Object>();

  const onItemClicked = () => {
    props.onItemClicked(dataArray[currentStackedViewIndex]);
  };

  useEffect(() => {
    createviewPanResponder();
  }, []);

  const createviewPanResponder = () => {
    setViewPanResponder(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (event, gestureState) => {
        console.log('move:', gestureState);
        viewPan.setValue({ x: gestureState.dx, y: viewPan.y });
      },

      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (event, gestureState) => {
        console.log('release:', gestureState);
        if (props.data.length > 0) {
          if ((gestureState.dx > HORIZONTAL_SWIPE_THRESHOLD ||
            gestureState.dx < -HORIZONTAL_SWIPE_THRESHOLD) && props.data.length > 1) {
            Animated.timing(viewPan, {
              toValue: 0,
              duration: SWIPE_ANIM_DURATION,
              useNativeDriver: true
            }).start();

            Animated.timing(viewStackedAnim, {
              toValue: 1,
              duration: SWIPE_ANIM_DURATION,
              useNativeDriver: true
            }).start(() => {
              viewStackedAnim.setValue(0);
              const tempCurrentStackedViewIndex = currentStackedViewIndex === dataArray.length - 1
                ? 0
                : currentStackedViewIndex + 1;
              setCurrentStackedViewIndex(tempCurrentStackedViewIndex);
              props.onSwipe(tempCurrentStackedViewIndex);
              // this.setState({
              //   currentStackedViewIndex:
              //     this.state.currentStackedViewIndex === this.dataArray.length - 1
              //       ? 0
              //       : this.state.currentStackedViewIndex + 1
              // }, () => {
              //   if (this.props.onSwipe) {
              //     this.props.onSwipe(this.state.currentStackedViewIndex);
              //   }
              // });
            });
          } else if (gestureState.dx > -CLICK_THRESHOLD && gestureState.dx < CLICK_THRESHOLD) {
            onItemClicked();
          } else {
            Animated.timing(viewPan, {
              toValue: 0,
              duration: SWIPE_ANIM_DURATION,
              useNativeDriver: true
            }).start();
          }
        } else if (gestureState.dx > -CLICK_THRESHOLD && gestureState.dx < CLICK_THRESHOLD) {
          onItemClicked();
        } else {
          Animated.timing(viewPan, {
            toValue: 0,
            duration: SWIPE_ANIM_DURATION,
            useNativeDriver: true
          }).start();
        }
      },

      onPanResponderTerminate: (event, gestureState) => {
        console.log('ter:', gestureState);
        if (props.data.length > 1) {
          if ((gestureState.dx > HORIZONTAL_SWIPE_THRESHOLD ||
            gestureState.dx < -HORIZONTAL_SWIPE_THRESHOLD) && props.data.length > 1) {
            Animated.timing(viewPan, {
              toValue: 0,
              duration: SWIPE_ANIM_DURATION,
              useNativeDriver: true
            }).start();

            Animated.timing(viewStackedAnim, {
              toValue: 1,
              duration: SWIPE_ANIM_DURATION,
              useNativeDriver: true
            }).start(() => {
              viewStackedAnim.setValue(0);
              const tempCurrentStackedViewIndex = currentStackedViewIndex === dataArray.length - 1
                ? 0
                : currentStackedViewIndex + 1;
              setCurrentStackedViewIndex(tempCurrentStackedViewIndex);
              props.onSwipe(tempCurrentStackedViewIndex);
              // this.setState({
              //   currentStackedViewIndex:
              //     this.state.currentStackedViewIndex === this.dataArray.length - 1
              //       ? 0
              //       : this.state.currentStackedViewIndex + 1
              // }, () => {
              //   if (this.props.onSwipe) {
              //     this.props.onSwipe(this.state.currentStackedViewIndex);
              //   }
              // });
            });
          } else {
            Animated.timing(viewPan, {
              toValue: 0,
              duration: SWIPE_ANIM_DURATION,
              useNativeDriver: true
            }).start();
          }
        } else {
          Animated.timing(viewPan, {
            toValue: 0,
            duration: SWIPE_ANIM_DURATION,
            useNativeDriver: true
          }).start();
        }
      },
      onShouldBlockNativeResponder: () => false
    })
    );
  };

  const getLastViewIndex = () => {
    let index = 0;

    if (currentStackedViewIndex === dataArray.length - 2) {
      index = 0;
    } else if (currentStackedViewIndex === dataArray.length - 1) {
      index = 1;
    } else {
      index = currentStackedViewIndex + 2;
    }

    return index;
  };

  const getLastDummyViewIndex = () => {
    let index;

    if (props.data.length <= 2) {
      index = currentStackedViewIndex;
    } else {
      index = getLastViewIndex() + 1;
      if (index === dataArray.length) {
        index = 0;
      }
    }

    return index;
  };

  const RenderLastView = () => {
    const { stackSpacing } = props;
    if (props.data.length > 2) {
      return (
        <Animated.View
          key={ JSON.stringify(dataArray[getLastViewIndex()]) }
          style={ {
            zIndex: 1,
            width: '100%',
            bottom: viewStackedAnim
              .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 3, stackSpacing * 2] }),
            transform: [{
              scale: viewStackedAnim.interpolate({ inputRange: [0, 1], outputRange: [0.80, 0.90] })
            }],
            opacity: viewStackedAnim
              .interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] })
          } }
        >
          { props.renderItem(dataArray[getLastViewIndex()]) }
        </Animated.View>
      );
    }

    return (
      <Animated.View
          key={ 'lastView' }
          style={ {
            zIndex: 1,
            width: '100%',
            bottom: viewStackedAnim
              .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 3, stackSpacing * 2] }),
            transform: [{
              scale: viewStackedAnim
                .interpolate({ inputRange: [0, 1], outputRange: [0.80, 0.90] })
            }],
            opacity: viewStackedAnim
              .interpolate({ inputRange: [0, 1], outputRange: [0, 0] })
          } }
        >
          { props.renderItem(currentStackedViewIndex) }
        </Animated.View>
    );
  };

  const getFrontmostViewTransformation = (isDummy: boolean) => {
    const { stackSpacing } = props;

    if (props.data.length === 2) {
      return ({
        transform: [
          { translateX: viewPan.x },
          {
            scale: viewStackedAnim
              .interpolate({ inputRange: [0, 1], outputRange: [1, 0.90] })
          }
        ],
        bottom: viewStackedAnim
          .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 1, stackSpacing * 2] }),
        opacity: viewStackedAnim
          .interpolate({ inputRange: [0, 1], outputRange: isDummy ? [0, 0.6] : [1, 0] })
      });
    }

    return ({
      transform: [
        { translateX: viewPan.x },
        {
          scale: viewStackedAnim
            .interpolate({ inputRange: [0, 1], outputRange: [1, 0.80] })
        }
      ],
      bottom: viewStackedAnim
        .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 1, stackSpacing * 3] }),
      opacity: viewStackedAnim
        .interpolate({ inputRange: [0, 1], outputRange: isDummy ? [0, 0.3] : [1, 0] })
    });
  };

  const RenderSwipeableViews = () => {
    const { stackSpacing } = props;
    console.log(viewPanResponder);
    // return (
    //   <View>
    //     <CyDText>Hi...</CyDText>
    //   </View>
    // );
    return (
      <View
        style={ { paddingTop: stackSpacing * 3, alignItems: 'center' } }
      >
        <RenderLastView/>

        { props.data.length > 1 &&
          <Animated.View
            key={ dataArray[currentStackedViewIndex ===
              dataArray.length - 1
              ? 0
              : currentStackedViewIndex + 1] }
            style={ {
              zIndex: 2,
              width: '100%',
              position: 'absolute',
              bottom: viewStackedAnim
                .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 2, stackSpacing * 1] }),
              transform: [{
                scale: viewStackedAnim
                  .interpolate({ inputRange: [0, 1], outputRange: [0.90, 1] })
              }],
              opacity: viewStackedAnim
                .interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })
            } }
          >
            { props.renderItem(dataArray[currentStackedViewIndex ===
              dataArray.length - 1
              ? 0
              : currentStackedViewIndex + 1]) }
              <CyDText>Hi...</CyDText>

          </Animated.View> }

        <Animated.View
          key={ JSON.stringify(dataArray[getLastViewIndex()]) + 'lastDummyView' }
          style={ [{
            width: '100%',
            zIndex: viewStackedAnim
              .interpolate({ inputRange: [0, 0.5, 1], outputRange: [3, 2, 0] }),
            position: 'absolute',
            opacity: viewStackedAnim
              .interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })
          }, getFrontmostViewTransformation(true)] }
        >
          { props.renderItem(dataArray[getLastDummyViewIndex()]) }
        </Animated.View>

        <Animated.View
          key={ JSON.stringify(dataArray[currentStackedViewIndex]) }
          { ...viewPanResponder.panHandlers }
          style={ [{
            width: '100%',
            zIndex: viewStackedAnim
              .interpolate({ inputRange: [0, 0.5, 1], outputRange: [3, 2, 0] }),
            position: 'absolute'
          }, getFrontmostViewTransformation(false)] }
        >
          { props.renderItem(dataArray[currentStackedViewIndex]) }
        </Animated.View>
      </View>
    );
  };

  return (
    <View>
      {viewPanResponder && <RenderSwipeableViews/>}
    </View>
  );
}

// class SwipeableViewStack extends PureComponent<SwipeableViewStackProps, SwipeableViewStackState> {
//   state: SwipeableViewStackState;
//   props: SwipeableViewStackProps;
//   viewPanResponder: Object;
//   dataArray: Object[];

//   static defaultProps = {
//     initialSelectedIndex: 0,
//     onSwipe: undefined,
//     stackSpacing: 20
//   };

//   constructor (props: Object) {
//     super(props);

//     this.state = {
//       viewPan: new Animated.ValueXY(),
//       viewStackedAnim: new Animated.Value(0),
//       currentStackedViewIndex: props.initialSelectedIndex ? props.initialSelectedIndex : 0
//     };

//     this.dataArray = props.data;
//     this.createviewPanResponder = this.createviewPanResponder.bind(this);
//     this.renderSwipeableViews = this.renderSwipeableViews.bind(this);
//     this.onItemClicked = this.onItemClicked.bind(this);

//     this.createviewPanResponder();
//   }

//   onItemClicked () {
//     this.props.onItemClicked(this.dataArray[this.state.currentStackedViewIndex]);
//   }

//   createviewPanResponder () {
//     this.viewPanResponder = PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onStartShouldSetPanResponderCapture: () => true,
//       onMoveShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponderCapture: () => true,
//       onPanResponderMove: (event, gestureState) => {
//         this.state.viewPan.setValue({ x: gestureState.dx, y: this.state.viewPan.y });
//       },

//       onPanResponderTerminationRequest: () => false,
//       onPanResponderRelease: (event, gestureState) => {
//         if (this.props.data.length > 0) {
//           if ((gestureState.dx > HORIZONTAL_SWIPE_THRESHOLD ||
//             gestureState.dx < -HORIZONTAL_SWIPE_THRESHOLD) && this.props.data.length > 1) {
//             Animated.timing(this.state.viewPan, {
//               toValue: 0,
//               duration: SWIPE_ANIM_DURATION
//             }).start();

//             Animated.timing(this.state.viewStackedAnim, {
//               toValue: 1,
//               duration: SWIPE_ANIM_DURATION
//             }).start(() => {
//               this.state.viewStackedAnim.setValue(0);

//               this.setState({
//                 currentStackedViewIndex:
//                   this.state.currentStackedViewIndex === this.dataArray.length - 1
//                     ? 0
//                     : this.state.currentStackedViewIndex + 1
//               }, () => {
//                 if (this.props.onSwipe) {
//                   this.props.onSwipe(this.state.currentStackedViewIndex);
//                 }
//               });
//             });
//           } else if (gestureState.dx > -CLICK_THRESHOLD && gestureState.dx < CLICK_THRESHOLD) {
//             this.onItemClicked();
//           } else {
//             Animated.timing(this.state.viewPan, {
//               toValue: 0,
//               duration: SWIPE_ANIM_DURATION
//             }).start();
//           }
//         } else if (gestureState.dx > -CLICK_THRESHOLD && gestureState.dx < CLICK_THRESHOLD) {
//           this.onItemClicked();
//         } else {
//           Animated.timing(this.state.viewPan, {
//             toValue: 0,
//             duration: SWIPE_ANIM_DURATION
//           }).start();
//         }
//       },

//       onPanResponderTerminate: (event, gestureState) => {
//         if (this.props.data.length > 1) {
//           if ((gestureState.dx > HORIZONTAL_SWIPE_THRESHOLD ||
//             gestureState.dx < -HORIZONTAL_SWIPE_THRESHOLD) && this.props.data.length > 1) {
//             Animated.timing(this.state.viewPan, {
//               toValue: 0,
//               duration: SWIPE_ANIM_DURATION
//             }).start();

//             Animated.timing(this.state.viewStackedAnim, {
//               toValue: 1,
//               duration: SWIPE_ANIM_DURATION
//             }).start(() => {
//               this.state.viewStackedAnim.setValue(0);

//               this.setState({
//                 currentStackedViewIndex:
//                   this.state.currentStackedViewIndex === this.dataArray.length - 1
//                     ? 0
//                     : this.state.currentStackedViewIndex + 1
//               }, () => {
//                 if (this.props.onSwipe) {
//                   this.props.onSwipe(this.state.currentStackedViewIndex);
//                 }
//               });
//             });
//           } else {
//             Animated.timing(this.state.viewPan, {
//               toValue: 0,
//               duration: SWIPE_ANIM_DURATION
//             }).start();
//           }
//         } else {
//           Animated.timing(this.state.viewPan, {
//             toValue: 0,
//             duration: SWIPE_ANIM_DURATION
//           }).start();
//         }
//       },
//       onShouldBlockNativeResponder: () => false
//     });
//   }

//   getLastDummyViewIndex () {
//     let index;

//     if (this.props.data.length <= 2) {
//       index = this.state.currentStackedViewIndex;
//     } else {
//       index = this.getLastViewIndex() + 1;
//       if (index === this.dataArray.length) {
//         index = 0;
//       }
//     }

//     return index;
//   }

//   getLastViewIndex () {
//     let index = 0;

//     if (this.state.currentStackedViewIndex === this.dataArray.length - 2) {
//       index = 0;
//     } else if (this.state.currentStackedViewIndex === this.dataArray.length - 1) {
//       index = 1;
//     } else {
//       index = this.state.currentStackedViewIndex + 2;
//     }

//     return index;
//   }

//   const RenderLastView = () => {
//     const { stackSpacing } = this.props;
//     if (this.props.data.length > 2) {
//       return (
//         <Animated.View
//           key={ JSON.stringify(this.dataArray[this.getLastViewIndex()]) }
//           style={ {
//             zIndex: 1,
//             bottom: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 3, stackSpacing * 2] }),
//             transform: [{
//               scale: this.state.viewStackedAnim
//                 .interpolate({ inputRange: [0, 1], outputRange: [0.80, 0.90] })
//             }],
//             opacity: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] })
//           } }
//         >
//           <CyDText>Hi...</CyDText>
//           { this.props.renderItem(this.dataArray[this.getLastViewIndex()]) }
//         </Animated.View>
//       );
//     }

//     return (
//       <Animated.View
//           key={ 'lastView' }
//           style={ {
//             zIndex: 1,
//             bottom: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 3, stackSpacing * 2] }),
//             transform: [{
//               scale: this.state.viewStackedAnim
//                 .interpolate({ inputRange: [0, 1], outputRange: [0.80, 0.90] })
//             }],
//             opacity: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 1], outputRange: [0, 0] })
//           } }
//         >
//           { this.props.renderItem(this.state.currentStackedViewIndex) }
//         </Animated.View>
//     );
//   };

//   renderSwipeableViews () {
//     const { stackSpacing } = this.props;
//     // return (
//     //   <View>
//     //     <CyDText>Hi...</CyDText>
//     //   </View>
//     // );
//     return (
//       <View
//         style={ { paddingTop: stackSpacing * 3, alignItems: 'center' } }
//       >
//         <RenderLastView/>

//         { this.props.data.length > 1 &&
//           <Animated.View
//             key={ this.dataArray[this.state.currentStackedViewIndex ===
//               this.dataArray.length - 1
//               ? 0
//               : this.state.currentStackedViewIndex + 1] }
//             style={ {
//               zIndex: 2,
//               position: 'absolute',
//               bottom: this.state.viewStackedAnim
//                 .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 2, stackSpacing * 1] }),
//               transform: [{
//                 scale: this.state.viewStackedAnim
//                   .interpolate({ inputRange: [0, 1], outputRange: [0.90, 1] })
//               }],
//               opacity: this.state.viewStackedAnim
//                 .interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })
//             } }
//           >
//             { this.props.renderItem(this.dataArray[this.state.currentStackedViewIndex ===
//               this.dataArray.length - 1
//               ? 0
//               : this.state.currentStackedViewIndex + 1]) }

//           </Animated.View> }

//         <Animated.View
//           key={ JSON.stringify(this.dataArray[this.getLastViewIndex()]) + 'lastDummyView' }
//           style={ [{
//             zIndex: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 0.5, 1], outputRange: [3, 2, 0] }),
//             position: 'absolute',
//             opacity: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })
//           }, this.getFrontmostViewTransformation(true)] }
//         >
//           { this.props.renderItem(this.dataArray[this.getLastDummyViewIndex()]) }
//         </Animated.View>

//         <Animated.View
//           key={ JSON.stringify(this.dataArray[this.state.currentStackedViewIndex]) }
//           { ...this.viewPanResponder.panHandlers }
//           style={ [{
//             zIndex: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 0.5, 1], outputRange: [3, 2, 0] }),
//             position: 'absolute'
//           }, this.getFrontmostViewTransformation(false)] }
//         >
//           { this.props.renderItem(this.dataArray[this.state.currentStackedViewIndex]) }
//         </Animated.View>
//       </View>
//     );
//   }

//   getFrontmostViewTransformation (isDummy: boolean) {
//     const { stackSpacing } = this.props;

//     if (this.props.data.length === 2) {
//       return ({
//         transform: [
//           { translateX: this.state.viewPan.x },
//           {
//             scale: this.state.viewStackedAnim
//               .interpolate({ inputRange: [0, 1], outputRange: [1, 0.90] })
//           }
//         ],
//         bottom: this.state.viewStackedAnim
//           .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 1, stackSpacing * 2] }),
//         opacity: this.state.viewStackedAnim
//           .interpolate({ inputRange: [0, 1], outputRange: isDummy ? [0, 0.6] : [1, 0] })
//       });
//     }

//     return ({
//       transform: [
//         { translateX: this.state.viewPan.x },
//         {
//           scale: this.state.viewStackedAnim
//             .interpolate({ inputRange: [0, 1], outputRange: [1, 0.80] })
//         }
//       ],
//       bottom: this.state.viewStackedAnim
//         .interpolate({ inputRange: [0, 1], outputRange: [stackSpacing * 1, stackSpacing * 3] }),
//       opacity: this.state.viewStackedAnim
//         .interpolate({ inputRange: [0, 1], outputRange: isDummy ? [0, 0.3] : [1, 0] })
//     });
//   }

//   render () {
//     return (
//       <View>
//         { this.renderSwipeableViews() }
//       </View>
//     );
//   }
// }

// export default SwipeableViewStack;
