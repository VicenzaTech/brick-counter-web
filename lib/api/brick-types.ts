import { apiFetch } from "@/lib/http/http";
import type {
  BrickType,
  CreateBrickTypeDto,
  UpdateBrickTypeDto,
  GetStatisticsDto,
  GetTrendDto,
  CompareBrickTypesDto,
  BrickTypeStatistics,
  BrickTypeTrend,
  CompareBrickTypesResponse,
  ActivateBrickTypeDto,
  DeactivateBrickTypeDto,
} from "@/lib/types/brick-type";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api";
const BRICK_TYPES_ENDPOINT = `${API_URL}/brick-types`;

// Service layer cho Brick Types API
export const brickTypesApi = {
  /**
   * Lay danh sach tat ca loai gach
   */
  async getAll(): Promise<BrickType[]> {
    const response = await apiFetch(BRICK_TYPES_ENDPOINT);
    if (!response.ok) {
      throw new Error("Failed to fetch brick types");
    }
    return response.json();
  },

  /**
   * Lay chi tiet mot loai gach
   */
  async getById(id: number): Promise<BrickType> {
    const response = await apiFetch(`${BRICK_TYPES_ENDPOINT}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch brick type ${id}`);
    }
    return response.json();
  },

  /**
   * Tao moi loai gach
   */
  async create(data: CreateBrickTypeDto): Promise<BrickType> {
    const response = await apiFetch(BRICK_TYPES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to create brick type");
    }
    const result = await response.json();
    return result.data || result;
  },

  /**
   * Cap nhat loai gach
   */
  async update(id: number, data: UpdateBrickTypeDto): Promise<BrickType> {
    const response = await apiFetch(`${BRICK_TYPES_ENDPOINT}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update brick type ${id}`);
    }
    const result = await response.json();
    return result.data || result;
  },

  /**
   * Xoa loai gach
   */
  async delete(id: number): Promise<void> {
    const response = await apiFetch(`${BRICK_TYPES_ENDPOINT}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Failed to delete brick type ${id}`);
    }
  },

  /**
   * Lay danh sach loai gach dang hoat dong
   */
  async getActive(): Promise<BrickType[]> {
    const response = await apiFetch(`${BRICK_TYPES_ENDPOINT}/active/all`);
    if (!response.ok) {
      throw new Error("Failed to fetch active brick types");
    }
    return response.json();
  },

  /**
   * Lay loai gach dang san xuat tren day chuyen
   */
  async getByProductionLine(lineId: number): Promise<BrickType[]> {
    const response = await apiFetch(
      `${BRICK_TYPES_ENDPOINT}/active/production-line/${lineId}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch brick types for production line ${lineId}`
      );
    }
    return response.json();
  },

  /**
   * Kich hoat loai gach tren day chuyen
   */
  async activate(id: number, data: ActivateBrickTypeDto): Promise<BrickType> {
    const response = await apiFetch(`${BRICK_TYPES_ENDPOINT}/${id}/activate`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to activate brick type ${id}`);
    }
    const result = await response.json();
    return result.data || result;
  },

  /**
   * Vo hieu hoa loai gach tren day chuyen
   */
  async deactivate(
    id: number,
    data: DeactivateBrickTypeDto
  ): Promise<BrickType> {
    const response = await apiFetch(
      `${BRICK_TYPES_ENDPOINT}/${id}/deactivate`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to deactivate brick type ${id}`);
    }
    const result = await response.json();
    return result.data || result;
  },

  /**
   * Lay thong ke tong hop cho mot loai gach
   */
  async getStatistics(
    id: number,
    params?: GetStatisticsDto
  ): Promise<BrickTypeStatistics> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const url = `${BRICK_TYPES_ENDPOINT}/${id}/statistics${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    const response = await apiFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch statistics for brick type ${id}`);
    }
    return response.json();
  },

  /**
   * Lay xu huong san luong theo thoi gian
   */
  async getTrend(id: number, params?: GetTrendDto): Promise<BrickTypeTrend> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.groupBy) queryParams.append("groupBy", params.groupBy);

    const url = `${BRICK_TYPES_ENDPOINT}/${id}/trend${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    const response = await apiFetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch trend for brick type ${id}`);
    }
    return response.json();
  },

  /**
   * So sanh nhieu loai gach
   */
  async compare(
    data: CompareBrickTypesDto
  ): Promise<CompareBrickTypesResponse> {
    const response = await apiFetch(`${BRICK_TYPES_ENDPOINT}/compare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to compare brick types");
    }
    return response.json();
  },
};

// Helper functions cho client-side filtering va sorting
export const brickTypeHelpers = {
  /**
   * Filter brick types theo cac tieu chi
   */
  filterBrickTypes(
    brickTypes: BrickType[],
    filters: {
      status?: "active" | "inactive" | "all";
      productionLine?: string;
      workshop?: string;
      brickType?: string;
      search?: string;
    }
  ): BrickType[] {
    let filtered = [...brickTypes];

    if (filters.status && filters.status !== "all") {
      const isActive = filters.status === "active";
      filtered = filtered.filter((bt) => bt.isActive === isActive);
    }

    if (filters.productionLine) {
      filtered = filtered.filter(
        (bt) => bt.productionLine === filters.productionLine
      );
    }

    if (filters.workshop) {
      filtered = filtered.filter((bt) => bt.workshop === filters.workshop);
    }

    if (filters.brickType) {
      filtered = filtered.filter((bt) => bt.brickType === filters.brickType);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (bt) =>
          bt.name.toLowerCase().includes(searchLower) ||
          bt.nameEnglish?.toLowerCase().includes(searchLower) ||
          bt.tileSize?.toLowerCase().includes(searchLower) ||
          bt.id.toString().includes(searchLower)
      );
    }

    return filtered;
  },

  /**
   * Sort brick types
   */
  sortBrickTypes(
    brickTypes: BrickType[],
    field: "name" | "tileSize" | "productionLine",
    order: "asc" | "desc" = "asc"
  ): BrickType[] {
    const sorted = [...brickTypes].sort((a, b) => {
      let aVal = a[field] || "";
      let bVal = b[field] || "";

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  },

  /**
   * Group brick types theo mot field
   */
  groupBrickTypes(
    brickTypes: BrickType[],
    groupBy: "workshop" | "productionLine" | "brickType"
  ): Record<string, BrickType[]> {
    const groups: Record<string, BrickType[]> = {};

    brickTypes.forEach((bt) => {
      const key = bt[groupBy] || "Unknown";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(bt);
    });

    return groups;
  },

  /**
   * Tinh toan cac thong so dong goi
   */
  calculatePackagingInfo(brickType: BrickType) {
    const { weightPerBox, boxesPerPallet, m2PerBox } = brickType;
    if (!weightPerBox || !boxesPerPallet || !m2PerBox) return null;

    const weightPerPallet = weightPerBox * boxesPerPallet;
    const m2PerPallet = m2PerBox * boxesPerPallet;

    // Container 20ft: 22-24 pallet (trung binh 23)
    // Container 40ft: 44-48 pallet (trung binh 46)
    const palletsPerContainer20 = 23;
    const palletsPerContainer40 = 46;

    return {
      weightPerPallet,
      m2PerPallet,
      container20: {
        pallets: palletsPerContainer20,
        weight: weightPerPallet * palletsPerContainer20,
        m2: m2PerPallet * palletsPerContainer20,
      },
      container40: {
        pallets: palletsPerContainer40,
        weight: weightPerPallet * palletsPerContainer40,
        m2: m2PerPallet * palletsPerContainer40,
      },
    };
  },

  /**
   * Format quality standard de hien thi
   */
  getQualityBadgeClass(standard: string | undefined): string {
    if (!standard) return "badge";
    const std = standard.toUpperCase();
    if (std === "BIA") return "badgeGreen";
    if (std === "BIB") return "badgeBlue";
    if (std === "BIIA") return "badgeYellow";
    if (std === "BIIB") return "badgeOrange";
    if (std.includes("ISO")) return "badgePurple";
    if (std.includes("TCVN")) return "badgeTeal";
    return "badgeGray";
  },
};
