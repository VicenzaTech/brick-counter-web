import { apiFetch } from "@/lib/http/http";
import type { ProductionLine } from "@/lib/types/production-line";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api";
const PRODUCTION_LINES_ENDPOINT = `${API_URL}/production-lines`;

export const productionLinesApi = {
  /**
   * Lay danh sach tat ca production lines
   */
  async getAll(): Promise<ProductionLine[]> {
    const response = await apiFetch(PRODUCTION_LINES_ENDPOINT);
    if (!response.ok) {
      throw new Error("Failed to fetch production lines");
    }
    return response.json();
  },

  /**
   * Lay chi tiet mot production line
   */
  async getById(id: number): Promise<ProductionLine> {
    const response = await apiFetch(`${PRODUCTION_LINES_ENDPOINT}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch production line ${id}`);
    }
    return response.json();
  },
};
