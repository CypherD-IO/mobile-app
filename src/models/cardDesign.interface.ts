export interface cardDesign {
  allowedCount: {
    metal: number;
    physical: number;
    virtual: number;
  };
  feeDetails: {
    metal: number;
    physical: number;
    virtual: number;
  };
  metal: Array<{
    description: string;
    id: string;
    name: string;
    physicalCardType: string;
    secondaryName: string;
  }>;
  physical: Array<{
    description: string;
    id: string;
    name: string;
    physicalCardType: string;
    secondaryName: string;
  }>;
  virtual: Array<{
    description: string;
    id: string;
    name: string;
    physicalCardType: string;
    secondaryName: string;
  }>;
}
