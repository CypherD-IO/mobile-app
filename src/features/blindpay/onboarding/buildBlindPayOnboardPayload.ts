import type { CreateReceiverRequest } from '../types';
import { BlindpayReceiverType } from '../types';

/**
 * Builds the JSON body for POST /v1/blindpay/onboard from the wizard draft.
 * Only includes fields present in `CreateReceiverRequest` (no IP).
 */
export function buildBlindPayOnboardPayload(
  draft: Partial<CreateReceiverRequest>,
): CreateReceiverRequest {
  if (!draft.country) {
    throw new Error('BlindPay onboard: country is required');
  }
  return {
    type: draft.type ?? BlindpayReceiverType.INDIVIDUAL,
    country: draft.country,
    firstName: draft.firstName,
    lastName: draft.lastName,
    dateOfBirth: draft.dateOfBirth
      ? new Date(`${draft.dateOfBirth}T00:00:00.000Z`).toISOString()
      : undefined,
    email: draft.email,
    phoneNumber: draft.phoneNumber,
    imageUrl: draft.imageUrl,
    taxId: draft.taxId,
    addressLine1: draft.addressLine1,
    addressLine2: draft.addressLine2,
    city: draft.city,
    stateProvinceRegion: draft.stateProvinceRegion,
    postalCode: draft.postalCode,
    idDocCountry: draft.idDocCountry,
    idDocType: draft.idDocType,
    idDocFrontFile: draft.idDocFrontFile,
    idDocBackFile: draft.idDocBackFile,
    proofOfAddressDocType: draft.proofOfAddressDocType,
    proofOfAddressDocFile: draft.proofOfAddressDocFile,
    selfieFile: draft.selfieFile,
    sourceOfFundsDocType: draft.sourceOfFundsDocType,
    sourceOfFundsDocFile: draft.sourceOfFundsDocFile,
    purposeOfTransactions: draft.purposeOfTransactions,
    purposeOfTransactionsExplanation: draft.purposeOfTransactionsExplanation,
    accountPurpose: draft.accountPurpose,
    accountPurposeOther: draft.accountPurposeOther,
    legalName: draft.legalName,
    alternateName: draft.alternateName,
    formationDate: draft.formationDate,
    website: draft.website,
    businessType: draft.businessType,
    businessDescription: draft.businessDescription,
    businessIndustry: draft.businessIndustry,
    estimatedAnnualRevenue: draft.estimatedAnnualRevenue,
    sourceOfWealth: draft.sourceOfWealth,
    publiclyTraded: draft.publiclyTraded,
    incorporationDocFile: draft.incorporationDocFile,
    proofOfOwnershipDocFile: draft.proofOfOwnershipDocFile,
    owners: draft.owners,
  };
}
