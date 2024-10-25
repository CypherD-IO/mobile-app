import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

const SlideToConfirm = () => {
  const [confirmed, setConfirmed] = useState(false);

  const renderLeftActions = () => (
    <View style={styles.action}>
      <Text style={styles.actionText}>Confirm</Text>
    </View>
  );

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      onSwipeableLeftOpen={() => setConfirmed(true)}
    >
      <View style={styles.container}>
        <View style={styles.slider}>
          <Text style={styles.iconText}>{'>'}</Text>
        </View>
        <Text style={styles.text}>
          {confirmed ? 'Confirmed' : 'Swipe to confirm'}
        </Text>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 50,
    backgroundColor: '#333',
    borderRadius: 25,
    justifyContent: 'center',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  slider: {
    width: 50,
    height: 50,
    backgroundColor: '#f0a500',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: '#333',
    fontSize: 24,
  },
  action: {
    backgroundColor: '#f0a500',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SlideToConfirm;
