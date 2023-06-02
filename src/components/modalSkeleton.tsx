import * as React from 'react';
import Modal from 'react-native-modal';
import AppImages from '../../assets/images/appImages';
import { ifIphoneX } from 'react-native-iphone-x-helper';
import { Colors } from '../constants/theme';
import { DynamicTouchView } from '../styles/viewStyle';

const {
  DynamicView,
  DynamicImage,
  ModalView
} = require('../styles');

export function ModalSkeleton (props) {
  const { isModalVisible, setIsModalVisible, children, style, modalBottom, isCloseVisible } = props;

  return (
        <Modal isVisible={isModalVisible}
               onBackdropPress={() => {
                 setIsModalVisible(!isModalVisible);
               }
        }
               backdropOpacity={0.8}
               coverScreen={true}
        >
            <DynamicView dynamic dynamicWidth width={100} dynamicHeight height={100} jC={!modalBottom ? 'center' : 'flex-end'} >
                <ModalView dynamic dynamicWidth dynamicHeight height={50} width={100} style = {style}
                           bGC={Colors.whiteColor} bR={30} jC={'flex-start'} >
                    <DynamicView dynamic dynamicWidth width={100} mT={16} style={{ position: 'relative' }}>
                        {isCloseVisible && <DynamicTouchView sentry-label='bottom-confirm-cancel-icon' dynamic dynamicWidth width={100}
                                           mT={5} mB={5} aLIT={'flex-end'}
                                           onPress={() => {
                                             setIsModalVisible(!isModalVisible);
                                           }}
                                           style={{ position: 'absolute', right: 12, top: -16, zIndex: 999 }}
                        >
                            <DynamicImage dynamic dynamicWidth aLIT={'flex-end'} mT={15} mR={5} height={10} width={10}
                                          resizemode='contain'
                                          source={AppImages.CLOSE}/>
                        </DynamicTouchView>}
                        {children}
                    </DynamicView>
                </ModalView>

            </DynamicView>
        </Modal>
  );
}
