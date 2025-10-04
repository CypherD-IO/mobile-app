export interface MerchantLike {
  brand?: string;
  canonicalName?: string;
  name?: string;
  logoUrl?: string;
}

export interface MerchantLogoProps {
  merchant: MerchantLike;
  size?: number; // diameter in px
  className?: string;
  showBorder?: boolean;
  hasUserVoted?: boolean;
}
