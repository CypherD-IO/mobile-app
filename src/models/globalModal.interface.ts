import { Dispatch, SetStateAction } from 'react';
import { ImageSourcePropType } from 'react-native';

export interface State {
  type: string;
  title: string;
  description: string | React.JSX.Element;
  isModalVisible: boolean;
  modalImage?: ImageSourcePropType;
  modalButtonText?: {
    success: string;
    failure: string;
  };
  onSuccess: () => void;
  onFailure: () => void;
}

export interface PromptImportWalletDef {
  type: string;
  address: string;
  description: string | React.JSX.Element;
  isModalVisible: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  onCancel: () => void;
}

export interface SetPinModalDef {
  type: string;
  pin: string;
  setPin: Dispatch<SetStateAction<string>>;
  isModalVisible: boolean;
}

export interface CustomModalLayoutDef {
  isModalVisible: boolean;
  customComponent: React.JSX.Element;
  onSuccess: () => void;
  onFailure: () => void;
}
