import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CyDText,
  CyDTouchView,
  CyDView,
  CyDTextInput,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDLottieView,
  CyDKeyboardAvoidingView,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import Button from './button';
import { ICardTransaction } from '../../models/card.model';
import { StyleSheet, Platform } from 'react-native';
import { pick } from '@react-native-documents/picker';
import clsx from 'clsx';
import {
  ComplaintReason,
  ButtonType,
  CardProviders,
} from '../../constants/enum';
import Toast from 'react-native-toast-message';
import AppImages from '../../../assets/images/appImages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAxios from '../../core/HttpRequest';
import { useGlobalModalContext } from './GlobalModal';
import axios, { AxiosRequestConfig } from 'axios';
import { hostWorker } from '../../global';

const REPORT_ISSUES = Object.entries(ComplaintReason).map(([key, value]) => ({
  value: key,
  label: value,
}));

interface SelectedFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size: number;
  isUploading: boolean;
}

interface ComplaintFormData {
  reason: string;
  transactionId: string;
  purchaseDescription: string;
  disputeDescription: string;
  lockCards: boolean;
  files?: SelectedFile[];
}

interface ReportTransactionModalProps {
  isModalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  transaction: ICardTransaction;
}

const MAX_CHARS = 1000;
const MAX_PURCHASE_CHARS = 100;
const SHOW_COUNTER_THRESHOLD = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_FILES = 10;

const styles = StyleSheet.create({
  modalStyle: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  spinner: {
    width: 20,
    height: 20,
  },
  scrollContent: {
    paddingBottom: 100, // Add extra padding to account for the fixed button
  },
  dropdownContainer: {
    // ...Platform.select({
    //   android: {
    //     position: 'relative',
    //     elevation: 5,
    //   },
    //   ios: {
    position: 'relative',
    zIndex: 999,
    //   },
    // }),
  },
  dropdownOptions: {
    // ...Platform.select({
    //   android: {
    //     position: 'relative',
    //     marginTop: -1,
    //     elevation: 5,
    //   },
    //   ios: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    // },
    // }),
  },
});

export default function ReportTransactionModal({
  isModalVisible,
  setModalVisible,
  transaction,
}: ReportTransactionModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showModal, hideModal } = useGlobalModalContext();
  const { postFormWithAuth } = useAxios();
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [description, setDescription] = useState('');
  const [purchaseDescription, setPurchaseDescription] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<SelectedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      console.log('Uploaded files before submit:', uploadedFiles);

      const formData = new FormData();

      // Add complaint data
      const complaintData = {
        reason: selectedIssue,
        transactionId: transaction.id,
        purchaseDescription: purchaseDescription.trim(),
        disputeDescription: description.trim(),
        cardId: transaction.cardId,
      };

      // Add files if they exist
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          formData.append('files[]', {
            uri: file.uri,
            type: file.type || 'application/octet-stream',
            name: file.name,
          } as any);
        });
      }

      // Add other form data
      Object.entries(complaintData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      console.log('FormData structure:', formData);
      const response = await postFormWithAuth(
        `/v1/cards/${CardProviders.REAP_CARD}/card/complain`,
        formData,
        30000, // 30 second timeout
      );

      console.log('response in reportTransactionModal : ', response);

      if (!response.isError) {
        setModalVisible(false);
        showModal('state', {
          type: 'success',
          title: t('TRANSACTION_REPORTED_SUCCESSFULLY'),
          description: t('TRANSACTION_REPORTED_DESCRIPTION'),
          onSuccess: () => {
            hideModal();
          },
          onFailure: hideModal,
        });
      } else {
        showModal('state', {
          type: 'error',
          title: t('Error'),
          description: response.error
            ? response.error.message
            : t('Please try again later'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      console.log('error in reportTransactionModal : ', error);
      showModal('state', {
        type: 'error',
        title: t('Error'),
        description: t('Please try again later'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueSelect = (value: string) => {
    setSelectedIssue(value);
    setIsDropdownOpen(false);
  };

  const handleFileSelect = async () => {
    try {
      // Check if we can add more files
      if (uploadedFiles.length >= MAX_FILES) {
        Toast.show({
          type: 'error',
          text1: t('Maximum 10 files allowed'),
          position: 'bottom',
        });
        return;
      }

      const results = await pick({
        allowMultiSelection: true,
        type: Platform.select({
          ios: [
            'public.image',
            'public.jpeg',
            'public.png',
            'public.pdf',
            'com.adobe.pdf',
          ],
          android: ['image/*', 'application/pdf'],
        }),
        // Limit selection to remaining slots
        maxFiles: MAX_FILES - uploadedFiles.length,
      });

      console.log('File pick results:', results);

      results.forEach(file => {
        // Skip files with missing required data
        if (!file.name || !file.uri || !file.size) {
          console.log('Invalid file data:', file);
          Toast.show({
            type: 'error',
            text1: t('Invalid file data'),
            position: 'bottom',
          });
          return;
        }

        // For iOS, we need to handle the file type differently
        const fileType =
          Platform.OS === 'ios'
            ? file.type ||
              (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
            : file.type;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          Toast.show({
            type: 'error',
            text1: t('FILE_SIZE_LIMIT_ERROR', { name: file.name }),
            position: 'bottom',
          });
          return;
        }

        // Add file to list with uploading state
        const fileId = Math.random().toString();
        const newFile: SelectedFile = {
          id: fileId,
          name: file.name,
          uri:
            Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          type: fileType,
          size: file.size,
          isUploading: true,
        };

        console.log('Adding new file:', newFile);

        setUploadedFiles(prev => [...prev, newFile]);

        // Simulate upload complete after 1 second
        setTimeout(() => {
          setUploadedFiles(prev =>
            prev.map(f => (f.id === fileId ? { ...f, isUploading: false } : f)),
          );
        }, 1000);
      });
    } catch (err) {
      console.log('File selection error:', err);
      Toast.show({
        type: 'error',
        text1: t('Error selecting files'),
        position: 'bottom',
      });
    }
  };

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileSelectPress = () => {
    void handleFileSelect();
  };

  const selectedIssueLabel =
    REPORT_ISSUES.find(issue => issue.value === selectedIssue)?.label ??
    t('Select your options');

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setModalVisible}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      style={styles.modalStyle}>
      <CyDKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        className='flex-1'>
        <CyDView className='bg-n20 h-full'>
          <CyDView style={{ paddingTop: insets.top }}>
            <CyDView className='flex-row justify-between items-center px-[24px] py-[16px]'>
              <CyDText className='text-[20px] font-bold mb-[2px]'>
                {t('Report an Issue')}
              </CyDText>
              <CyDTouchView
                onPress={() => setModalVisible(false)}
                className='p-[8px]'>
                <CyDMaterialDesignIcons
                  name='close'
                  size={24}
                  className='text-n200'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>

          <CyDView className='flex-1'>
            <CyDScrollView
              className='px-[24px]'
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps='handled'
              contentContainerStyle={styles.scrollContent}>
              <CyDText className='text-[12px] text-n200 mb-[16px]'>
                {t(
                  'Please provide details about any concerns with this transaction.',
                )}
              </CyDText>

              <CyDText className='text-[14px] text-n200 mb-[8px]'>
                {t('What is the issue you are facing?')}
              </CyDText>

              {/* Dropdown Container */}
              <CyDView className='mb-[24px]' style={styles.dropdownContainer}>
                {/* Dropdown Trigger */}
                <CyDTouchView
                  className={clsx(
                    'border border-n40 p-[16px] bg-n0',
                    isDropdownOpen
                      ? 'rounded-t-[12px] border-b-0'
                      : 'rounded-[12px]',
                  )}
                  onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
                  <CyDView className='flex-row justify-between items-center'>
                    <CyDText className='text-[14px] text-n200'>
                      {selectedIssueLabel}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      className='text-n200'
                    />
                  </CyDView>
                </CyDTouchView>

                {/* Dropdown Options */}
                {isDropdownOpen && (
                  <CyDView
                    className='bg-n0 border border-n40 rounded-b-[12px]'
                    style={styles.dropdownOptions}>
                    {REPORT_ISSUES.map(issue => (
                      <CyDTouchView
                        key={issue.value}
                        className='p-[16px] border-t border-n40'
                        onPress={() => handleIssueSelect(issue.value)}>
                        <CyDText className='text-[14px] text-n200'>
                          {issue.label}
                        </CyDText>
                      </CyDTouchView>
                    ))}
                  </CyDView>
                )}
              </CyDView>

              <CyDText className='text-[14px] text-n200 mb-[8px]'>
                {t('Describe your purchase in brief')}
              </CyDText>
              <CyDTextInput
                className='border border-n40 p-[16px] rounded-[12px] bg-n0 mb-[8px] h-[100px]'
                placeholder={t('Enter purchase description')}
                value={purchaseDescription}
                onChangeText={setPurchaseDescription}
                maxLength={MAX_PURCHASE_CHARS}
                multiline
              />
              <CyDText className='text-[12px] text-n200 text-right mb-[8px]'>
                {`${purchaseDescription.length}/${MAX_PURCHASE_CHARS}`}
              </CyDText>

              <CyDText className='text-[14px] text-n200 mb-[8px]'>
                {t('Describe your issue')}
              </CyDText>
              <CyDTextInput
                className='border border-n40 p-[16px] rounded-[12px] bg-n0 mb-[8px] h-[100px]'
                placeholder={t('Enter issue description')}
                value={description}
                onChangeText={setDescription}
                maxLength={MAX_CHARS}
                multiline
              />
              <CyDText className='text-[12px] text-n200 text-right mb-[8px]'>
                {`${description.length}/${MAX_CHARS}`}
              </CyDText>

              <CyDText className='text-[14px] text-n200 mb-[8px]'>
                {t('Upload supporting documents')}
              </CyDText>
              <CyDView className='mb-[24px]'>
                {uploadedFiles.map(file => (
                  <CyDView
                    key={file.id}
                    className='flex-row items-center justify-between bg-n0 border border-n40 rounded-[8px] p-[12px] mb-[8px]'>
                    <CyDText
                      className='flex-1 text-[14px] mr-[8px]'
                      numberOfLines={1}>
                      {file.name}
                    </CyDText>
                    {file.isUploading ? (
                      <CyDLottieView
                        source={AppImages.LOADING_SPINNER}
                        autoPlay
                        loop
                        style={styles.spinner}
                      />
                    ) : (
                      <CyDTouchView onPress={() => handleFileDelete(file.id)}>
                        <CyDMaterialDesignIcons
                          name='delete-outline'
                          size={20}
                          className='text-n200'
                        />
                      </CyDTouchView>
                    )}
                  </CyDView>
                ))}

                {/* Upload Button */}
                {uploadedFiles.length < MAX_FILES && (
                  <CyDTouchView
                    className='bg-n0 border border-dashed border-n40 rounded-[12px] p-[16px] items-center'
                    onPress={handleFileSelectPress}>
                    <CyDText className='text-[14px] text-n200'>
                      {t('Click to upload files')}
                    </CyDText>
                  </CyDTouchView>
                )}
              </CyDView>
            </CyDScrollView>

            {/* Submit Button - Fixed at bottom */}
            <CyDView
              style={{ paddingBottom: insets.bottom }}
              className='px-[24px] pt-[16px] bg-n20 border-t border-n40'>
              <Button
                title={t('Submit')}
                onPress={() => {
                  void handleSubmit();
                }}
                type={ButtonType.PRIMARY}
                disabled={
                  !selectedIssue ||
                  !description.trim() ||
                  !purchaseDescription.trim() ||
                  isSubmitting
                }
                style='py-[16px] rounded-full'
                loading={isSubmitting}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDKeyboardAvoidingView>
    </CyDModalLayout>
  );
}
