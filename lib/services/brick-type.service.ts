import type { BrickType, CreateBrickTypeDto } from "@/lib/types/brick-type";

// Service layer cho logic nghiep vu cua brick types
// Tuân thủ RULE.md: Tách biệt rõ các tầng Application/Service

export class BrickTypeService {
  /**
   * Validate du lieu brick type truoc khi tao hoac cap nhat
   */
  static validateBrickTypeData(data: Partial<CreateBrickTypeDto>): string[] {
    const errors: string[] = [];

    if (data.name !== undefined && !data.name.trim()) {
      errors.push("Ten dang gach khong duoc de trong");
    }

    if (data.thickness !== undefined) {
      if (data.thickness < 5 || data.thickness > 20) {
        errors.push("Do day phai nam trong khoang 5-20mm");
      }
    }

    if (data.weightPerM2 !== undefined) {
      if (data.weightPerM2 < 10 || data.weightPerM2 > 100) {
        errors.push("Trong luong/m2 phai nam trong khoang 10-100kg");
      }
    }

    if (data.piecesPerBox !== undefined) {
      if (data.piecesPerBox < 1 || data.piecesPerBox > 20) {
        errors.push("So luong vien/thung phai nam trong khoang 1-20");
      }
    }

    if (data.m2PerBox !== undefined) {
      if (data.m2PerBox < 0.5 || data.m2PerBox > 5) {
        errors.push("m2/thung phai nam trong khoang 0.5-5");
      }
    }

    return errors;
  }

  /**
   * Tao ban sao cua brick type
   */
  static createCopyData(
    original: BrickType,
    newName: string
  ): CreateBrickTypeDto {
    return {
      name: newName,
      nameEnglish: original.nameEnglish
        ? `${original.nameEnglish} (Copy)`
        : undefined,
      tileSize: original.tileSize,
      thickness: original.thickness,
      brickType: original.brickType,
      unit: original.unit,
      description: original.description,
      workshop: original.workshop,
      productionLine: original.productionLine,
      contractCycle: original.contractCycle,
      kilnOutput: original.kilnOutput,
      qualityProductOutput: original.qualityProductOutput,
      deductionDays: original.deductionDays,
      contractProduction: original.contractProduction,
      additionalContractWhenReducingCycle:
        original.additionalContractWhenReducingCycle,
      reducedContractWhenIncreasingCycle:
        original.reducedContractWhenIncreasingCycle,
      weightPerM2: original.weightPerM2,
      piecesPerBox: original.piecesPerBox,
      m2PerBox: original.m2PerBox,
      weightPerBox: original.weightPerBox,
      boxesPerPallet: original.boxesPerPallet,
      qualityStandard: original.qualityStandard,
      productLineName: original.productLineName,
      notes: original.notes,
      isActive: false,
    };
  }

  /**
   * Filter brick types theo cac tieu chi
   */
  static filterBrickTypes(
    brickTypes: BrickType[],
    filters: {
      productionLine?: string;
      workshop?: string;
      isActive?: boolean;
      searchQuery?: string;
    }
  ): BrickType[] {
    let filtered = [...brickTypes];

    if (filters.productionLine) {
      filtered = filtered.filter(
        (b) => b.productionLine === filters.productionLine
      );
    }

    if (filters.workshop) {
      filtered = filtered.filter((b) => b.workshop === filters.workshop);
    }

    if (filters.isActive !== undefined) {
      filtered = filtered.filter((b) => b.isActive === filters.isActive);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.nameEnglish?.toLowerCase().includes(query) ||
          b.tileSize?.toLowerCase().includes(query) ||
          b.id.toString().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Sort brick types theo field
   */
  static sortBrickTypes(
    brickTypes: BrickType[],
    field: keyof BrickType,
    order: "asc" | "desc" = "asc"
  ): BrickType[] {
    return [...brickTypes].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      }

      return order === "asc" ? comparison : -comparison;
    });
  }

  /**
   * Group brick types theo field
   */
  static groupBrickTypes(
    brickTypes: BrickType[],
    groupBy: "workshop" | "productionLine" | "brickType"
  ): Map<string, BrickType[]> {
    const groups = new Map<string, BrickType[]>();

    for (const brick of brickTypes) {
      const key = brick[groupBy] || "Khong xac dinh";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(brick);
    }

    return groups;
  }

  /**
   * Tinh toan thong tin container
   */
  static calculateContainerCapacity(brick: BrickType): {
    boxesPerContainer20: number;
    boxesPerContainer40: number;
    m2PerContainer20: number;
    m2PerContainer40: number;
  } | null {
    if (!brick.boxesPerPallet || !brick.m2PerBox) {
      return null;
    }

    const container20Capacity = 10;
    const container40Capacity = 20;

    const boxesPerContainer20 = brick.boxesPerPallet * container20Capacity;
    const boxesPerContainer40 = brick.boxesPerPallet * container40Capacity;

    return {
      boxesPerContainer20,
      boxesPerContainer40,
      m2PerContainer20: boxesPerContainer20 * brick.m2PerBox,
      m2PerContainer40: boxesPerContainer40 * brick.m2PerBox,
    };
  }

  /**
   * Format quality standard badge
   */
  static getQualityBadgeClass(standard: string): string {
    const upperStandard = standard.toUpperCase();
    if (upperStandard.includes("BIA")) return "qualityBIa";
    if (upperStandard.includes("BIB")) return "qualityBIb";
    if (upperStandard.includes("TCVN")) return "qualityTCVN";
    if (upperStandard.includes("ISO")) return "qualityISO";
    return "qualityDefault";
  }
}
