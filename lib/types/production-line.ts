export interface ProductionLine {
  id: number;
  name: string;
  description?: string;
  capacity?: number;
  status: string;
  activeBrickTypeId?: number;
  productionStatus?: "producing" | "paused" | "stopped";
}
