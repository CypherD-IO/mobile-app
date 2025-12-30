import React from 'react';
import { StyleSheet } from 'react-native';
import { CyDIcons, CyDText, CyDView } from '../../styles/tailwindComponents';
import { BaseToastProps } from 'react-native-toast-message';
import { IconNames } from '../../customFonts';

/**
 * Toast type configuration for icon and styling
 * Maps toast types to their respective icons and color classes
 */
interface ToastTypeConfig {
  icon: IconNames;
  iconColor: string;
  bgColor: string;
}

/**
 * Extended toast props with type support
 */
interface ModernToastProps extends BaseToastProps {
  toastType?: 'success' | 'error' | 'info';
}

const TOAST_TYPE_CONFIG: Record<string, ToastTypeConfig> = {
  success: {
    icon: 'tick',
    iconColor: 'text-green300',
    bgColor: 'bg-n20',
  },
  error: {
    icon: 'close',
    iconColor: 'text-red300',
    bgColor: 'bg-n20',
  },
  info: {
    icon: 'information',
    iconColor: 'text-blue300',
    bgColor: 'bg-n20',
  },
};

/**
 * Styles for toast shadow effects
 */
const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});

/**
 * Modern toast component with clean design and smooth appearance
 * Supports success, error, and info types with appropriate icons
 */
const ModernToast = ({
  text1,
  toastType = 'success',
}: ModernToastProps): JSX.Element => {
  const config = TOAST_TYPE_CONFIG[toastType] ?? TOAST_TYPE_CONFIG.success;

  return (
    <CyDView
      className={`
        ${config.bgColor}
        flex-row items-center
        px-[16px] py-[12px]
        rounded-full
        shadow-lg
        mx-[24px]
      `}
      style={styles.shadow}>
      {/* Icon container */}
      <CyDView
        className={`
          w-[24px] h-[24px]
          rounded-full
          items-center justify-center
          mr-[10px]
        `}>
        <CyDIcons name={config.icon} size={18} className={config.iconColor} />
      </CyDView>

      {/* Toast message */}
      <CyDText
        className='text-[14px] font-medium text-base400 flex-1'
        numberOfLines={2}>
        {text1}
      </CyDText>
    </CyDView>
  );
};

/**
 * Toast configuration for react-native-toast-message
 * Exports custom toast types: success, error, info
 */
export const toastConfig = {
  success: (props: BaseToastProps) => (
    <ModernToast {...props} toastType='success' />
  ),
  error: (props: BaseToastProps) => (
    <ModernToast {...props} toastType='error' />
  ),
  info: (props: BaseToastProps) => <ModernToast {...props} toastType='info' />,

  // Legacy simple toast for backwards compatibility
  simpleToast: ({ props }: { props: { text: string } }) => (
    <CyDView className='h-[36px] w-[80px] flex flex-row justify-center items-center'>
      <CyDIcons name='tick' size={16} className='text-base400' />
      <CyDText>{props.text}</CyDText>
    </CyDView>
  ),
};
