import { t } from 'i18next';

export function getBlindPayKycStepChrome(
  step: number,
  totalSteps: number,
): {
  title: string;
  subtitle?: string;
  helpText?: string;
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
        helpText: 'First Name & Last Name: Enter your legal name as it appears on your government ID.\n\nDate of Birth: Select your date of birth (you must be 18+).\n\nEmail: Your email address for verification and updates.',
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
        helpText: 'Tax ID: Enter your tax identification number for your country.\n\nExamples:\n• US: SSN (e.g. 123-45-6789) or ITIN\n• Brazil: CPF (11 digits)\n• India: PAN (e.g. ABCDE1234F)\n• Mexico: RFC',
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
        helpText: 'Country: Select your country of residence.\n\nStreet Address: Your full street address.\n\nApt/Suite: Apartment, suite, or unit number.\n\nCity: Your city of residence.\n\nState: 2-letter state code (e.g. CA, NY, TX).\n\nPostal Code: Your ZIP or postal code.\n\nPhone: Enter in international format with country code (e.g. +14155551234).',
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
        helpText: 'Photo Requirements:\n\n✅ Take a photo of the original physical document — do not photograph a screen, printed copy, or another photo.\n\n✅ Make sure all information is clear and readable, with no glare or reflections.\n\n✅ The entire document must be visible — do not crop any edges.\n\n✅ The image must be in focus and taken in good lighting.\n\n✅ Always send both the front and back of the document, if applicable.\n\n❌ Do Not Submit:\n• Photos of a screen or monitor\n• Screenshots or photocopies\n• Blurry, dark, cropped, or unclear images',
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
        helpText: 'Accepted Documents:\n\n• Utility bill (gas, electric, water, internet)\n• Bank statement\n• Rental agreement or lease\n• Tax document\n• Government correspondence\n\nRequirements:\n• Must be dated within the last 3 months\n• Must show your full name and address\n• Must match the address provided in the previous step',
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
