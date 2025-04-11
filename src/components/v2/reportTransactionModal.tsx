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
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import Button from './button';
import { ICardTransaction } from '../../models/card.model';
import { StyleSheet } from 'react-native';
import { pick } from '@react-native-documents/picker';
import clsx from 'clsx';
import { ComplaintReason, ButtonType } from '../../constants/enum';
import Toast from 'react-native-toast-message';
import AppImages from '../../../assets/images/appImages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAxios from '../../core/HttpRequest';
import { useGlobalModalContext } from './GlobalModal';
import { AxiosRequestConfig } from 'axios';

const REPORT_ISSUES = [
  {
    value: ComplaintReason.REFUND_NOT_RECEIVED,
    label: ComplaintReason.REFUND_NOT_RECEIVED,
  },
  {
    value: ComplaintReason.PRODUCT_NOT_RECEIVED,
    label: ComplaintReason.PRODUCT_NOT_RECEIVED,
  },
  {
    value: ComplaintReason.DISSATISFIED,
    label: ComplaintReason.DISSATISFIED,
  },
  {
    value: ComplaintReason.HIGHER_CHARGE,
    label: ComplaintReason.HIGHER_CHARGE,
  },
  {
    value: ComplaintReason.MULTIPLE_CHARGES,
    label: ComplaintReason.MULTIPLE_CHARGES,
  },
  {
    value: ComplaintReason.DECLINED_BUT_CHARGED,
    label: ComplaintReason.DECLINED_BUT_CHARGED,
  },
  {
    value: ComplaintReason.UNRECOGNIZED_TRANSACTION,
    label: ComplaintReason.UNRECOGNIZED_TRANSACTION,
  },
] as const;

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
});

export default function ReportTransactionModal({
  isModalVisible,
  setModalVisible,
  transaction,
}: ReportTransactionModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [description, setDescription] = useState('');
  const [purchaseDescription, setPurchaseDescription] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<SelectedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Create FormData instance
      const formData = new FormData();

      // Add complaint data as a JSON string in a field called 'body'
      const complaintData = {
        reason: selectedIssue,
        transactionId: transaction.id,
        purchaseDescription: purchaseDescription.trim(),
        disputeDescription: description.trim(),
        lockCards: false,
      };
      formData.append('body', JSON.stringify(complaintData));

      // Add files if any
      uploadedFiles.forEach(file => {
        formData.append('files', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        });
      });

      // Show loading state
      Toast.show({
        type: 'info',
        text1: t('Submitting complaint...'),
        position: 'bottom',
      });

      // Make API call with FormData
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: [(data: FormData) => data],
      };

      const response = await postWithAuth(
        '/v1/card/transaction/complaint',
        formData,
        undefined,
        config,
      );

      // Close the modal
      setModalVisible(false);

      if (!response.error) {
        // Show success modal
        showModal('state', {
          type: 'success',
          title: t('Report Submitted'),
          description: t(
            'We have received your report and will look into it. Our support team will contact you soon.',
          ),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      } else {
        showModal('state', {
          type: 'error',
          title: t('Report Submission Failed'),
          description: t('Please try again later'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      // Show error message
      showModal('state', {
        type: 'error',
        title: t('Report Submission Failed'),
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
        type: ['image/*', 'application/pdf'],
        // Limit selection to remaining slots
        maxFiles: MAX_FILES - uploadedFiles.length,
      });

      results.forEach(file => {
        // Skip files with missing required data
        if (!file.name || !file.uri || !file.type || !file.size) {
          Toast.show({
            type: 'error',
            text1: t('Invalid file data'),
            position: 'bottom',
          });
          return;
        }

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
          uri: file.uri,
          type: file.type,
          size: file.size,
          isUploading: true,
        };

        setUploadedFiles(prev => [...prev, newFile]);

        // Simulate upload complete after 1 second
        setTimeout(() => {
          setUploadedFiles(prev =>
            prev.map(f => (f.id === fileId ? { ...f, isUploading: false } : f)),
          );
        }, 1000);
      });
    } catch (err) {
      // The new package doesn't have isCancel, all errors should be handled
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
            <CyDView className='mb-[24px] relative z-[999]'>
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
                <CyDView className='absolute top-full left-0 right-0 bg-n0 border border-n40 rounded-b-[12px] z-[1000]'>
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
    </CyDModalLayout>
  );
}
