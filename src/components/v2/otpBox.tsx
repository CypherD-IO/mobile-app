import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { CyDView } from '../../styles/tailwindStyles';

interface OTPVerificationProps {
  pinCount?: number;
  onOTPFilled: (otp: string) => void;
  value: string; // Add this line
}

const OTPInput: React.FC<OTPVerificationProps> = ({
  pinCount = 6,
  onOTPFilled,
  value, // Add this line
}) => {
  const [otp, setOtp] = useState<string[]>(value.split('').slice(0, pinCount));
  const inputRefs = useRef<TextInput[]>([]);

  const handlePaste = (clipboardContent: string, index: number) => {
    if (
      clipboardContent.length === pinCount &&
      /^\d+$/.test(clipboardContent)
    ) {
      const newOtp = clipboardContent.split('');
      setOtp(newOtp);
      onOTPFilled(clipboardContent);
    } else if (clipboardContent.length === 1 && /^\d$/.test(clipboardContent)) {
      handleChange(clipboardContent, index);
    }
  };

  const handleSelectionChange = async (index: number) => {
    if (Platform.OS === 'ios') {
      const clipboardContent = await Clipboard.getString();
      handlePaste(clipboardContent, index);
    }
  };

  useEffect(() => {
    const newOtp = value.split('').slice(0, pinCount);
    setOtp(newOtp.concat(Array(pinCount - newOtp.length).fill('')));
  }, [value, pinCount]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text.length === 1 && index < pinCount - 1) {
      inputRefs.current[index + 1].focus();
    }

    const updatedOtp = newOtp.join('');
    onOTPFilled(updatedOtp);
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <CyDView className='flex flex-col items-center'>
      <CyDView className='flex flex-row items-center'>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => ref && (inputRefs.current[index] = ref)}
            style={styles.input}
            value={digit}
            onChangeText={text => handleChange(text, index)}
            onKeyPress={e => handleKeyPress(e, index)}
            onSelectionChange={() => {
              void handleSelectionChange(index);
            }}
            keyboardType='numeric'
            maxLength={1}
            returnKeyType='done'
            selectTextOnFocus
          />
        ))}
      </CyDView>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  input: {
    width: 50,
    height: 64,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#C2C7D0',
    textAlign: 'center',
    fontSize: 22,
    padding: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
});

export default OTPInput;
