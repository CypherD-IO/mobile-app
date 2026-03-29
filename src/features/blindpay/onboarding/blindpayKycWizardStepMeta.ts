import { t } from 'i18next';

export function getBlindPayKycStepChrome(
  step: number,
  totalSteps: number,
): {
  title: string;
  subtitle?: string;
} {
  // The last step is always Review
  if (step === totalSteps - 1) {
    return {
      title: String(t('BLINDPAY_REVIEW_TITLE', 'Review & submit')),
      subtitle: String(
        t(
          'BLINDPAY_REVIEW_SUB',
          'Check your details before submitting.',
        ),
      ),
    };
  }

  switch (step) {
    case 0:
      return {
        title: String(t('BLINDPAY_BASIC_DETAILS_TITLE', 'Basic Details')),
        subtitle: String(
          t(
            'BLINDPAY_BASIC_DETAILS_SUB',
            'Please provide a few details about yourself so we can get your account set up smoothly.',
          ),
        ),
      };
    case 1:
      return {
        title: String(t('BLINDPAY_TAX_TITLE', 'Tax information')),
        subtitle: String(
          t(
            'BLINDPAY_TAX_SUB',
            'Enter your tax identification number for your country (e.g. SSN, CPF, RFC).',
          ),
        ),
      };
    case 2:
      return {
        title: String(
          t('BLINDPAY_ADDRESS_TITLE', 'Verify your address'),
        ),
        subtitle: String(
          t(
            'BLINDPAY_ADDRESS_SUB',
            'Use the address same as in your documents',
          ),
        ),
      };
    case 3:
      return {
        title: '',
        subtitle: undefined,
      };
    case 4:
      return {
        title: String(t('BLINDPAY_DOC_TYPE_TITLE', 'Document Type')),
        subtitle: String(
          t(
            'BLINDPAY_DOC_TYPE_SUB',
            'This input helps us get to know our users better and ensures the cypher stays secure for everyone.',
          ),
        ),
      };
    case 5:
      return {
        title: String(t('BLINDPAY_ID_TITLE', 'Government ID')),
        subtitle: String(
          t(
            'BLINDPAY_ID_SUB',
            'Upload clear photos or PDFs. Passport only needs the photo page.',
          ),
        ),
      };
    case 6:
      return {
        title: String(t('BLINDPAY_POA_TITLE', 'Proof of address')),
        subtitle: String(
          t(
            'BLINDPAY_POA_SUB',
            'Please upload one document that serves as proof of address. This needs to be the same address as the one provided above.',
          ),
        ),
      };
    case 7:
      return {
        title: '',
        subtitle: undefined,
      };
    case 8:
      return {
        title: String(t('BLINDPAY_SELFIE_TITLE', 'Selfie')),
        subtitle: String(
          t(
            'BLINDPAY_SELFIE_SUB',
            'Upload a clear photo of your face. Remove hats or sunglasses.',
          ),
        ),
      };
    // Steps 9+ only appear for high-risk countries
    case 9:
      return {
        title: String(t('BLINDPAY_SOF_TITLE', 'Source of Funds')),
        subtitle: String(
          t(
            'BLINDPAY_SOF_SUB',
            'Upload a document that verifies your source of funds for enhanced verification.',
          ),
        ),
      };
    case 10:
      return {
        title: String(
          t('BLINDPAY_PURPOSE_TX_TITLE', 'Purpose of Transactions'),
        ),
        subtitle: String(
          t(
            'BLINDPAY_PURPOSE_TX_SUB',
            'Tell us the primary purpose for your transactions.',
          ),
        ),
      };
    default:
      return { title: '', subtitle: undefined };
  }
}
