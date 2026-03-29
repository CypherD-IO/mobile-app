import React from 'react';
import { t } from 'i18next';
import { CyDText, CyDView } from '../../../styles/tailwindComponents';

const REQUIREMENTS = [
  'Take a photo of the original physical document - do not take a photo of a screen, printed copy, or another photo.',
  'Make sure all information is clear and readable, with no glare or reflections.',
  'The entire document must be visible - do not crop any edges.',
  'The image must be in focus and taken in good lighting.',
  'Always send both the front and back of the document, if applicable.',
];

const DO_NOT_SUBMIT = [
  'Photos of a screen, monitor, or another device.',
  'Screenshots or pictures of printed or photocopied documents.',
  'Blurry, dark, cropped, or unclear images.',
];

export default function BlindPayPhotoRequirements() {
  return (
    <CyDView className='gap-[16px] mt-[8px]'>
      {/* Photo Requirements */}
      <CyDView className='gap-[8px]'>
        <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
          {String(
            t('BLINDPAY_PHOTO_REQ_TITLE', 'Photo Requirements'),
          )}
        </CyDText>
        {REQUIREMENTS.map((text, i) => (
          <CyDView key={`req-${i}`} className='flex-row gap-[8px]'>
            <CyDText className='text-[13px] leading-[1.45]'>
              {'\u2705'}
            </CyDText>
            <CyDText className='text-[13px] font-medium text-n200 leading-[1.45] tracking-[-0.4px] flex-1'>
              {String(t(`BLINDPAY_PHOTO_REQ_${i}`, text))}
            </CyDText>
          </CyDView>
        ))}
      </CyDView>

      {/* Do Not Submit */}
      <CyDView className='gap-[8px]'>
        <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
          {String(t('BLINDPAY_DO_NOT_TITLE', 'Do Not Submit'))}
        </CyDText>
        {DO_NOT_SUBMIT.map((text, i) => (
          <CyDView key={`dont-${i}`} className='flex-row gap-[8px]'>
            <CyDText className='text-[13px] leading-[1.45]'>
              {'\u274C'}
            </CyDText>
            <CyDText className='text-[13px] font-medium text-n200 leading-[1.45] tracking-[-0.4px] flex-1'>
              {String(t(`BLINDPAY_DO_NOT_${i}`, text))}
            </CyDText>
          </CyDView>
        ))}
      </CyDView>
    </CyDView>
  );
}
