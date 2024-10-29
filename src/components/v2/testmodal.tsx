import React, { useState, useRef } from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';
import {
  Swipeable,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const TestSwipeableModal = ({
  isModalVisible,
  setIsModalVisible,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
}) => {
  const swipeableRef = useRef<Swipeable | null>(null);

  const renderLeftActions = () => (
    <View style={styles.leftAction}>
      <Text style={styles.actionText}>Confirmed 🎉</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Button title='Show Modal' onPress={() => setIsModalVisible(true)} />
      <Modal visible={isModalVisible} transparent={true} animationType='slide'>
        <GestureHandlerRootView style={styles.modalContainer}>
          <Swipeable
            ref={swipeableRef}
            renderLeftActions={renderLeftActions}
            onSwipeableLeftOpen={() => console.log('Swiped!')}
            friction={2}
            leftThreshold={30}>
            <View style={styles.swipeableContent}>
              <Text style={styles.swipeText}>Swipe to confirm</Text>
            </View>
          </Swipeable>
          <Button
            title='Close Modal'
            onPress={() => setIsModalVisible(false)}
          />
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  swipeableContent: {
    width: 300,
    height: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeText: {
    color: 'white',
  },
  leftAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 240,
    height: '100%',
    backgroundColor: '#333',
  },
  actionText: {
    color: 'white',
  },
});

export default TestSwipeableModal;
