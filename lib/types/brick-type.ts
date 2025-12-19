// Enums
export type BrickTypeStatus = "producing" | "paused" | "inactive";
export type BrickTypeCategory =
  | "Granite"
  | "Porcelain"
  | "Ceramic"
  | "Semi-Porcelain"
  | "Granite/Porcelain";
export type TrendGroupBy = "day" | "week" | "month";

// Main BrickType interface
export interface BrickType {
  id: number;
  name: string;
  description?: string;
  unit?: string;
  specs?: any;
  isActive: boolean;
  activeProductionLineId?: number;
  lastActiveAt?: Date | string;
  activeStatus?: BrickTypeStatus;

  // Thong tin san xuat
  workshop?: string;
  productionLine?: string;
  tileSize?: string;
  contractCycle?: number;
  kilnOutput?: number;
  qualityProductOutput?: number;
  deductionDays?: number;
  contractProduction?: number;
  additionalContractWhenReducingCycle?: number;
  reducedContractWhenIncreasingCycle?: number;

  // CSV Standard Fields - Thong tin san pham
  nameEnglish?: string;
  thickness?: number;
  brickType?: BrickTypeCategory;

  // CSV Standard Fields - Thong tin dong goi & logistics
  weightPerM2?: number;
  piecesPerBox?: number;
  m2PerBox?: number;
  weightPerBox?: number;
  boxesPerPallet?: number;

  // CSV Standard Fields - Tieu chuan & phan loai
  qualityStandard?: string;
  productLineName?: string;
  notes?: string;
}

// Create/Update DTOs
export interface CreateBrickTypeDto {
  name: string;
  description?: string;
  unit?: string;
  specs?: any;
  isActive?: boolean;
  activeProductionLineId?: number;
  activeStatus?: BrickTypeStatus;

  workshop?: string;
  productionLine?: string;
  tileSize?: string;
  contractCycle?: number;
  kilnOutput?: number;
  qualityProductOutput?: number;
  deductionDays?: number;
  contractProduction?: number;
  additionalContractWhenReducingCycle?: number;
  reducedContractWhenIncreasingCycle?: number;

  nameEnglish?: string;
  thickness?: number;
  brickType?: BrickTypeCategory;
  weightPerM2?: number;
  piecesPerBox?: number;
  m2PerBox?: number;
  weightPerBox?: number;
  boxesPerPallet?: number;
  qualityStandard?: string;
  productLineName?: string;
  notes?: string;
}

export type UpdateBrickTypeDto = Partial<CreateBrickTypeDto>;

// Statistics DTOs
export interface GetStatisticsDto {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface GetTrendDto {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  groupBy?: TrendGroupBy;
}

export interface CompareBrickTypesDto {
  brickTypeIds: number[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

// Statistics Response
export interface ProductionLineStats {
  lineId: number;
  lineName: string;
  daysProduced: number;
  totalProduction: number;
  averageEfficiency: number;
  averageWaste: number;
  lastProducedAt: string;
}

export interface WasteBreakdown {
  hp_moc: number;
  hp_lo: number;
  hp_tm: number;
  hp_ht: number;
  ty_le_hp_moc: number;
  ty_le_hp_lo: number;
  ty_le_hp_tm: number;
  ty_le_hp_ht: number;
}

export interface BrickTypeStatistics {
  totalProduction: number;
  monthlyProduction: number;
  productionDays: number;
  averageEfficiency: number;
  averageWaste: number;
  lastProducedAt: string | null;
  currentStatus: BrickTypeStatus;
  productionLines: ProductionLineStats[];
  wasteBreakdown: WasteBreakdown;
}

// Trend Response
export interface TrendDataPoint {
  date: string;
  production: number;
  efficiency: number;
  waste: number;
  productionDays: number;
}

export interface BrickTypeTrend {
  data: TrendDataPoint[];
}

// Comparison Response
export interface BrickTypeComparison {
  brickTypeId: number;
  name: string;
  tileSize: string;
  totalProduction: number;
  averageEfficiency: number;
  averageWaste: number;
  productionDays: number;
  contractCycle: number;
  kilnOutput: number;
  qualityProductOutput: number;
  contractProduction: number;
  monthlyProduction: number;
  completionRate: number;
}

export interface CompareBrickTypesResponse {
  comparison: BrickTypeComparison[];
}

// Activate/Deactivate DTOs
export interface ActivateBrickTypeDto {
  productionLineId: number;
  status?: "producing" | "paused";
}

export interface DeactivateBrickTypeDto {
  productionLineId: number;
}

// Filter and Search
export interface BrickTypeFilters {
  status?: "active" | "inactive" | "all";
  productionLine?: string;
  workshop?: string;
  brickType?: BrickTypeCategory;
  tileSize?: string;
  thickness?: number;
  qualityStandard?: string;
  search?: string;
}

export interface BrickTypeSortOptions {
  field:
    | "name"
    | "tileSize"
    | "productionLine"
    | "createdAt"
    | "lastProducedAt";
  order: "asc" | "desc";
}

// UI State
export interface BrickTypeFormState {
  name: string;
  description: string;
  unit: string;
  specs: string;
  workshop: string;
  productionLine: string;
  tileSize: string;
  contractCycle: string;
  kilnOutput: string;
  qualityProductOutput: string;
  deductionDays: string;
  contractProduction: string;
  additionalContractWhenReducingCycle: string;
  reducedContractWhenIncreasingCycle: string;
  nameEnglish: string;
  thickness: string;
  brickType: string;
  weightPerM2: string;
  piecesPerBox: string;
  m2PerBox: string;
  weightPerBox: string;
  boxesPerPallet: string;
  qualityStandard: string;
  productLineName: string;
  notes: string;
}
