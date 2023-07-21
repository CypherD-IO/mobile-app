import { ImageSourcePropType } from 'react-native';

export interface State {
  type: string
  title: string
  description: string | JSX.Element
  isModalVisible: boolean
  modalImage?: ImageSourcePropType
  modalButtonText?: {
    success: string
    failure: string
  }
  onSuccess: () => void
  onFailure: () => void
}

export interface PromptImportWalletDef {
  type: string
  address: string
  description: string | JSX.Element
  isModalVisible: boolean
  onSuccess: () => void
  onFailure: () => void
  onCancel: () => void
};

export interface CustomModalLayoutDef {
  isModalVisible: boolean
  customComponent: JSX.Element
  onSuccess: () => void
  onFailure: () => void
}
