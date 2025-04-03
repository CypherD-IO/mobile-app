export interface CardDesignCardMetaData {
  description: string;
  id: string;
  name: string;
  physicalCardType: string;
  secondaryName: string;
  isStockAvailable: boolean;
}

export interface CardDesignFeeDetails {
  metal: number;
  physical: number;
  virtual: number;
}

export interface CardDesignAllowedCount {
  metal: number;
  physical: number;
  virtual: number;
}

export interface CardDesign {
  allowedCount: CardDesignAllowedCount;
  feeDetails: CardDesignFeeDetails;
  metal: CardDesignCardMetaData[];
  physical: CardDesignCardMetaData[];
  virtual: CardDesignCardMetaData[];
}
