export type AssetCategory =
  | 'Furniture & Fixture'
  | 'Office Equipment'
  | 'Computer & IT Accessories'
  | 'Vehicles'
  | 'Building & Land'
  | 'Machinery'
  | 'Other Fixed Assets';

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DIMINISHING_BALANCE'; // WDV

export interface FixedAsset {
  assetId: string;
  assetCode: string;
  name: string;
  nameNp: string;
  category: AssetCategory;
  purchaseDateAD: string;
  purchaseDateBS: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationRatePercent: number; // e.g., 25% for computers, 15% for furniture, 20% for vehicle, 5% for building
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  currentBookValue: number;
  lastDepreciationBSDate?: string;
  status: 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED';
  location?: string;
  remarks?: string;
  createdAt: string;
}

export interface DepreciationCalculation {
  assetId: string;
  assetCode: string;
  assetName: string;
  category: AssetCategory;
  cost: number;
  ratePercent: number;
  method: DepreciationMethod;
  accumulatedDepreciationBefore: number;
  bookValueBefore: number;
  depreciationAmount: number;
  bookValueAfter: number;
}

export interface PostAssetDepreciationVoucherRequest {
  periodBSDate: string;
  fiscalYear: string;
  narration?: string;
  selectedAssetIds?: string[]; // If empty, depreciate all active eligible assets
  user: string;
  depreciationExpenseAccountCode?: string; // Default: '150.18'
  fixedAssetAccountCode?: string; // Default: '130'
}
