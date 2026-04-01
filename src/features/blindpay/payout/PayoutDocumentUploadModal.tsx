import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import { BlindpayUploadBucket } from '../types';
import { pickBlindPaySingleFile } from '../onboarding/pickBlindPayFile';
import type { BlindPayUploadFilePart } from '../api';

const DOC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'delivery_slip', label: 'Delivery Slip' },
  { value: 'contract', label: 'Contract' },
  { value: 'customs_declaration', label: 'Customs Declaration' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'others', label: 'Others' },
];

interface Props {
  payoutId: string;
  onSuccess?: () => void;
}

export default function PayoutDocumentUploadModal({ payoutId, onSuccess }: Props) {
  const { uploadDocument, submitPayoutDocuments } = useBlindPayApi();

  const [docType, setDocType] = useState('invoice');
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<(BlindPayUploadFilePart & { size?: number }) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedLabel = DOC_TYPE_OPTIONS.find(o => o.value === docType)?.label ?? 'Invoice';

  const handlePickFile = useCallback(async () => {
    const picked = await pickBlindPaySingleFile();
    if (picked) setFile(picked);
  }, []);

  const handleRemoveFile = useCallback(() => setFile(null), []);

  const handleSubmit = useCallback(async () => {
    if (!file) {
      showToast('Please upload a file', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please enter a description', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Upload file
      setUploading(true);
      const uploadRes = await uploadDocument(file, BlindpayUploadBucket.ONBOARDING);
      setUploading(false);

      if (uploadRes.isError || !uploadRes.data?.fileUrl) {
        showToast(uploadRes.errorMessage ?? 'Upload failed', 'error');
        setSubmitting(false);
        return;
      }

      // Step 2: Submit to payout with auto-generated UUID
      const submitRes = await submitPayoutDocuments(payoutId, {
        transactionDocumentType: docType as any,
        transactionDocumentId: uuidv4(),
        transactionDocumentFile: uploadRes.data.fileUrl,
        description: description.trim(),
      });

      if (submitRes.isError) {
        showToast(submitRes.errorMessage ?? 'Failed to submit document', 'error');
        setSubmitting(false);
        return;
      }

      showToast('Document submitted successfully');
      onSuccess?.();
    } catch (e: any) {
      showToast(e?.message ?? 'Something went wrong', 'error');
    }
    setSubmitting(false);
  }, [file, docType, description, payoutId, uploadDocument, submitPayoutDocuments, onSuccess]);

  const canSubmit = !!file && !!description.trim() && !submitting;

  return (
    <CyDView className='px-[16px] pb-[24px] gap-[16px]'>
      {/* Title */}
      <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px]'>
        Additional Documents Required
      </CyDText>

      {/* Info */}
      <CyDView className='flex-row items-center gap-[5px]'>
        <CyDMaterialDesignIcons name='shield-check-outline' size={20} className='text-n90' />
        <CyDText className='text-[12px] font-medium text-n90 flex-1'>
          Upload compliance documents to proceed with your payout
        </CyDText>
      </CyDView>

      {/* Document type dropdown */}
      <CyDView className='bg-n0 rounded-[10px] border border-n30 overflow-hidden'>
        <CyDText className='text-[12px] font-medium text-n200 px-[12px] pt-[10px]'>Document Type</CyDText>
        <CyDTouchView
          onPress={() => setDocTypeOpen(!docTypeOpen)}
          className='px-[12px] py-[10px] flex-row items-center justify-between'>
          <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
            {selectedLabel}
          </CyDText>
          <CyDMaterialDesignIcons name={docTypeOpen ? 'chevron-up' : 'chevron-down'} size={20} className='text-base400' />
        </CyDTouchView>
        {docTypeOpen ? (
          <CyDView className='border-t border-n30'>
            {DOC_TYPE_OPTIONS.map(opt => (
              <CyDTouchView
                key={opt.value}
                onPress={() => { setDocType(opt.value); setDocTypeOpen(false); }}
                className={`px-[12px] py-[10px] flex-row items-center justify-between ${opt.value === docType ? 'bg-n20' : ''}`}>
                <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>{opt.label}</CyDText>
                {opt.value === docType ? <CyDMaterialDesignIcons name='check' size={18} className='text-[#FBC02D]' /> : null}
              </CyDTouchView>
            ))}
          </CyDView>
        ) : null}
      </CyDView>

      {/* Description */}
      <CyDView className='bg-n0 rounded-[10px] border border-n30 px-[12px] py-[10px]'>
        <CyDText className='text-[12px] font-medium text-n200 mb-[4px]'>Description</CyDText>
        <CyDTextInput
          className='text-[14px] font-medium text-base400 tracking-[-0.6px] py-0 bg-transparent'
          placeholder='Brief description of the document'
          placeholderTextColor='#C2C7D0'
          value={description}
          onChangeText={setDescription}
          maxLength={128}
        />
      </CyDView>

      {/* File upload card */}
      <CyDView className='bg-n0 rounded-[10px] p-[12px] gap-[10px]'>
        {/* Header: icon + upload button */}
        <CyDView className='flex-row items-start justify-between'>
          <CyDMaterialDesignIcons name='cloud-upload' size={36} className='text-[#2685CA]' />
          <CyDTouchView onPress={handlePickFile}
            className='bg-n10 border border-[#D3D3D3] rounded-full px-[12px] py-[6px]'>
            <CyDText className='text-[12px] font-bold text-base400'>
              Upload File
            </CyDText>
          </CyDTouchView>
        </CyDView>

        <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
          Upload Required Files
        </CyDText>

        {/* Uploading state */}
        {uploading ? (
          <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[8px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDView className='flex-1 gap-[2px]'>
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>Uploading...</CyDText>
              </CyDView>
              <CyDMaterialDesignIcons name='delete-outline' size={24} className='text-red-400' />
            </CyDView>
            <CyDView className='h-[8px] bg-n20 rounded-full overflow-hidden'>
              <CyDView className='h-full w-[20%] bg-[#2685CA] rounded-full' />
            </CyDView>
          </CyDView>
        ) : file ? (
          /* File selected */
          <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px]'>
            <CyDView className='flex-row items-center gap-[8px]'>
              <CyDMaterialDesignIcons name='file-document-outline' size={24} className='text-base400' />
              <CyDView className='flex-1 gap-[2px]'>
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]' numberOfLines={1}>
                  {file.name}
                </CyDText>
                {file.size ? (
                  <CyDText className='text-[12px] font-medium text-n200'>
                    {(file.size / (1024 * 1024)).toFixed(1)}MB
                  </CyDText>
                ) : null}
              </CyDView>
              <CyDTouchView onPress={handleRemoveFile} hitSlop={8}>
                <CyDMaterialDesignIcons name='delete-outline' size={24} className='text-red-400' />
              </CyDTouchView>
            </CyDView>
          </CyDView>
        ) : (
          <CyDText className='text-[12px] font-medium text-n200'>
            Max 5MB. Accepts .jpeg, .png, .pdf
          </CyDText>
        )}
      </CyDView>

      {/* Submit button */}
      <CyDTouchView
        onPress={handleSubmit}
        disabled={!canSubmit}
        className={`rounded-full h-[44px] items-center justify-center ${canSubmit ? 'bg-[#FFDE59]' : 'bg-n40'}`}>
        <CyDView className='relative items-center justify-center'>
          <CyDText className={`text-[16px] font-semibold text-black tracking-[-0.4px] ${submitting ? 'opacity-0' : ''}`}>
            Submit Documents
          </CyDText>
          {submitting ? (
            <CyDView className='absolute inset-0 items-center justify-center'>
              <ActivityIndicator color='#0D0D0D' />
            </CyDView>
          ) : null}
        </CyDView>
      </CyDTouchView>
    </CyDView>
  );
}
