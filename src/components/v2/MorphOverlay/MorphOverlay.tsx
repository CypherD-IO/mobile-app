import React, { useState, useEffect, useRef } from 'react';
import { TextInput, Keyboard, Platform, ScrollView } from 'react-native';
import {
  CyDView,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDText,
} from '../../../styles/tailwindComponents';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  FadeInLeft,
  FadeInRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParticleTransition } from './ParticleTransition';
import { SwapWidget } from './SwapWidget';
import { ApprovalWidget } from './ApprovalWidget';
import LinearGradient from 'react-native-linear-gradient';

// Chat message interface
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

// Random agent responses for demo purposes
const AGENT_RESPONSES = [
  'I understand! Let me help you with that.',
  "Great question! Here's what I can do for you.",
  'Processing your request now...',
  'Sure thing! Give me a moment to work on that.',
  "I'm on it! This should be quick.",
  'Interesting! Let me check that for you.',
  "Got it! Here's what I found.",
  'Absolutely! Working on your request.',
  'Let me pull that up for you.',
  "That's a great idea! Let me handle that.",
];

// Get a random agent response
const getRandomAgentResponse = (): string => {
  const randomIndex = Math.floor(Math.random() * AGENT_RESPONSES.length);
  return AGENT_RESPONSES[randomIndex];
};

// Generate unique message ID
const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

interface MorphOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  fabPosition: { x: number; y: number };
  /**
   * Notifies the parent about the overlay's *mounted* state (not just visibility).
   * This is important because the overlay keeps rendering for a short time while
   * the closing animation plays, and the trigger FAB should stay hidden then.
   */
  onRenderStateChange?: (isRendered: boolean) => void;
}

const AnimatedView = Animated.createAnimatedComponent(CyDView);

// Animated view for chat bubbles
const AnimatedCyDView = Animated.createAnimatedComponent(CyDView);

export const MorphOverlay: React.FC<MorphOverlayProps> = ({
  isVisible,
  onClose,
  fabPosition,
  onRenderStateChange,
}) => {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const chatBarOpacity = useSharedValue(0);
  const chatBarTranslateY = useSharedValue(100);
  const [shouldRender, setShouldRender] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSwapWidget, setShowSwapWidget] = useState(false);
  const [showApprovalWidget, setShowApprovalWidget] = useState(false);

  // Chat messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to bottom when new messages are added
  const scrollToBottom = (): void => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Add a new message to the chat
  const addMessage = (text: string, sender: 'user' | 'agent'): void => {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    scrollToBottom();
  };

  // Simulate agent response with random delay
  const simulateAgentResponse = (): void => {
    // Random delay between 500ms and 1500ms for realistic feel
    const delay = 500 + Math.random() * 1000;
    setTimeout(() => {
      const response = getRandomAgentResponse();
      addMessage(response, 'agent');
    }, delay);
  };

  // Handle send action - detect commands and add to chat
  const handleSend = (): void => {
    const text = inputText.trim();
    if (!text) return;

    // Add user message to chat
    addMessage(text, 'user');

    const lowerText = text.toLowerCase();
    console.log('Send:', text);

    if (lowerText.includes('swap')) {
      // Start new widget immediately - particles will morph from approval to swap
      setShowApprovalWidget(false);
      setShowSwapWidget(true);
      Keyboard.dismiss();
    } else if (lowerText.includes('approve')) {
      // Start new widget immediately - particles will morph from swap to approval
      setShowSwapWidget(false);
      setShowApprovalWidget(true);
      Keyboard.dismiss();
    }

    // Simulate agent response for all messages
    simulateAgentResponse();

    setInputText('');
  };

  // Keyboard event listeners
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      onRenderStateChange?.(true);
      // Chat bar slides up from bottom after particles form
      chatBarOpacity.value = withDelay(350, withTiming(1, { duration: 350 }));
      chatBarTranslateY.value = withDelay(
        300,
        withTiming(0, { duration: 350 }),
      );
    } else {
      // Chat bar slides down first
      chatBarOpacity.value = withTiming(0, { duration: 200 });
      chatBarTranslateY.value = withTiming(100, { duration: 250 });
      setInputText('');
      setMessages([]); // Clear chat messages when overlay closes
      setShowSwapWidget(false); // Trigger widget collapse animation
      setShowApprovalWidget(false);

      // Wait for reverse animation to complete before unmounting
      setTimeout(() => {
        setShouldRender(false);
        onRenderStateChange?.(false);
      }, 500);
    }
  }, [isVisible]);

  const chatBarStyle = useAnimatedStyle(() => ({
    opacity: chatBarOpacity.value,
    transform: [{ translateY: chatBarTranslateY.value }],
  }));

  if (!shouldRender) return null;

  return (
    <>
      <ParticleTransition isVisible={isVisible} fabPosition={fabPosition} />

      {/* Swap Widget - Appears when user types 'swap' */}
      <CyDView
        className='absolute left-0 right-0 z-[55]'
        style={{ top: insets.top + 50 }}>
        <SwapWidget
          isVisible={showSwapWidget}
          onClose={() => setShowSwapWidget(false)}
        />
      </CyDView>

      {/* Approval Widget - Appears when user types 'approve' */}
      <CyDView
        className='absolute left-0 right-0 z-[55]'
        style={{ top: insets.top + 50 }}>
        <ApprovalWidget
          isVisible={showApprovalWidget}
          onClose={() => setShowApprovalWidget(false)}
          onApprove={() => console.log('Approved!')}
          onReject={() => console.log('Rejected!')}
        />
      </CyDView>

      {/* Close Button - Top Right (floats above everything) */}
      <CyDView
        className='absolute z-[60]'
        style={{ top: insets.top + 16, right: 20 }}>
        <CyDTouchView
          onPress={onClose}
          className='w-[40px] h-[40px] rounded-full bg-n0/80 items-center justify-center'>
          <CyDMaterialDesignIcons
            name='close'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDView>

      {/* Unified Chat Area - Conversation + Input Bar with single gradient */}
      <AnimatedView
        className='absolute left-0 right-0 z-[52]'
        style={[
          { bottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0 },
          chatBarStyle,
        ]}>
        {/* Unified smooth linear gradient from transparent to white - covers both conversation and input */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.2)',
            'rgba(255,255,255,0.5)',
            'rgba(255,255,255,0.75)',
            'rgba(255,255,255,0.9)',
            'rgba(255,255,255,1)',
            'rgba(255,255,255,1)',
          ]}
          locations={[0, 0.08, 0.18, 0.32, 0.5, 0.65, 1]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        {/* Chat Conversation Area - Shows messages above input bar */}
        {messages.length > 0 && (
          <CyDView className='px-[16px]'>
            {/* Scrollable chat messages container */}
            <ScrollView
              ref={scrollViewRef}
              style={{ maxHeight: 320 }}
              contentContainerStyle={{
                paddingHorizontal: 4,
                paddingVertical: 12,
              }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}>
              {messages.map(message => (
                <AnimatedCyDView
                  key={message.id}
                  entering={
                    message.sender === 'user'
                      ? FadeInRight.duration(300).delay(50)
                      : FadeInLeft.duration(300).delay(50)
                  }
                  className={`mb-[10px] ${
                    message.sender === 'user'
                      ? 'items-end' // User messages on right
                      : 'items-start' // Agent messages on left
                  }`}>
                  {/* Chat bubble */}
                  <CyDView
                    className={`max-w-[80%] px-[14px] py-[10px] ${
                      message.sender === 'user'
                        ? 'bg-p400 rounded-[18px] rounded-br-[4px]' // User: purple, right corner sharp
                        : 'bg-n30 rounded-[18px] rounded-bl-[4px]' // Agent: gray, left corner sharp
                    }`}>
                    <CyDText
                      className={`text-[15px] leading-[20px] font-manrope ${
                        message.sender === 'user'
                          ? 'text-white' // User text: white
                          : 'text-base400' // Agent text: dark
                      }`}>
                      {message.text}
                    </CyDText>
                  </CyDView>

                  {/* Timestamp - subtle under the bubble */}
                  <CyDText className='text-[10px] text-base200 mt-[2px] mx-[4px]'>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </CyDText>
                </AnimatedCyDView>
              ))}
            </ScrollView>
          </CyDView>
        )}

        {/* Chat input content */}
        <CyDView
          className='flex-row items-center px-[20px]'
          style={{
            paddingTop: messages.length > 0 ? 8 : 60,
            paddingBottom: insets.bottom + 16,
          }}>
          <CyDView className='flex-1 bg-n30 rounded-[24px] px-[16px] py-[12px] mr-[12px] flex-row items-center'>
            <TextInput
              className='flex-1 text-[16px] text-base400 font-manrope'
              placeholder='Type your command...'
              placeholderTextColor='#7A8699'
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
              style={{ maxHeight: 100 }}
            />
          </CyDView>
          <CyDTouchView
            className={`w-[48px] h-[48px] rounded-full items-center justify-center ${
              inputText.trim() ? 'bg-p400' : 'bg-n40'
            }`}
            disabled={!inputText.trim()}
            onPress={handleSend}>
            <CyDMaterialDesignIcons
              name='send'
              size={24}
              className={inputText.trim() ? 'text-white' : 'text-base200'}
            />
          </CyDTouchView>
        </CyDView>
      </AnimatedView>
    </>
  );
};
