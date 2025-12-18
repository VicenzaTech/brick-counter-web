import type { BrickType, CreateBrickTypeDto } from "@/lib/types/brick-type";
import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import styles from "./BrickTypeForm.module.css";

interface BrickTypeFormProps {
  brick?: BrickType;
  onSubmit: (data: CreateBrickTypeDto) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function BrickTypeForm({
  brick,
  onSubmit,
  onCancel,
  loading = false,
}: BrickTypeFormProps) {
  const [formData, setFormData] = useState<CreateBrickTypeDto>({
    name: brick?.name || "",
    nameEnglish: brick?.nameEnglish || "",
    tileSize: brick?.tileSize || "",
    thickness: brick?.thickness || undefined,
    brickType: brick?.brickType || undefined,
    unit: brick?.unit || "m²",
    description: brick?.description || "",
    weightPerM2: brick?.weightPerM2 || undefined,
    piecesPerBox: brick?.piecesPerBox || 0,
    m2PerBox: brick?.m2PerBox || undefined,
    weightPerBox: brick?.weightPerBox || undefined,
    boxesPerPallet: brick?.boxesPerPallet || 0,
    qualityStandard: brick?.qualityStandard || "",
    productLineName: brick?.productLineName || "",
    notes: brick?.notes || "",
    workshop: brick?.workshop || "",
    productionLine: brick?.productionLine || "",
    contractCycle: brick?.contractCycle || 0,
    kilnOutput: brick?.kilnOutput || 0,
    qualityProductOutput: brick?.qualityProductOutput || 0,
    deductionDays: brick?.deductionDays || undefined,
    contractProduction: brick?.contractProduction || undefined,
    additionalContractWhenReducingCycle:
      brick?.additionalContractWhenReducingCycle || undefined,
    reducedContractWhenIncreasingCycle:
      brick?.reducedContractWhenIncreasingCycle || undefined,
    isActive: brick?.isActive !== false,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <header className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              {brick ? "Chỉnh sửa dạng gạch" : "Thêm dạng gạch mới"}
            </h2>
            <p className={styles.modalSubtitle}>
              {brick
                ? `Cập nhật thông tin cho ${brick.name}`
                : "Điền thông tin để tạo dạng gạch mới"}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onCancel}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Thông tin cơ bản</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="name">Tên sản phẩm (VN) *</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="nameEnglish">Tên sản phẩm (EN)</label>
                <input
                  id="nameEnglish"
                  type="text"
                  value={formData.nameEnglish}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEnglish: e.target.value })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="tileSize">Kích thước (mm)</label>
                <input
                  id="tileSize"
                  type="text"
                  placeholder="600x600"
                  value={formData.tileSize}
                  onChange={(e) =>
                    setFormData({ ...formData, tileSize: e.target.value })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="thickness">Độ dày (mm)</label>
                <input
                  id="thickness"
                  type="number"
                  step="0.1"
                  placeholder="9.5"
                  value={formData.thickness ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      thickness: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="brickType">Loại gạch</label>
                <select
                  id="brickType"
                  value={formData.brickType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brickType: e.target.value as any,
                    })
                  }
                >
                  <option value="">-- Chọn loại --</option>
                  <option value="Granite">Granite</option>
                  <option value="Porcelain">Porcelain</option>
                  <option value="Ceramic">Ceramic</option>
                  <option value="Semi-Porcelain">Semi-Porcelain</option>
                  <option value="Granite/Porcelain">Granite/Porcelain</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="unit">Đơn vị</label>
                <input
                  id="unit"
                  type="text"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                />
              </div>
            </div>
            <div className={styles.formField}>
              <label htmlFor="description">Mô tả</label>
              <textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Thông tin đóng gói</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="weightPerM2">Trọng lượng/m² (kg)</label>
                <input
                  id="weightPerM2"
                  type="number"
                  step="0.1"
                  placeholder="30"
                  value={formData.weightPerM2 ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weightPerM2: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="piecesPerBox">Số viên/thùng</label>
                <input
                  id="piecesPerBox"
                  type="number"
                  placeholder="4"
                  value={formData.piecesPerBox}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      piecesPerBox: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="m2PerBox">m²/thùng</label>
                <input
                  id="m2PerBox"
                  type="number"
                  step="0.01"
                  placeholder="1.44"
                  value={formData.m2PerBox ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      m2PerBox: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="weightPerBox">Trọng lượng/thùng (kg)</label>
                <input
                  id="weightPerBox"
                  type="number"
                  step="0.1"
                  placeholder="30"
                  value={formData.weightPerBox ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weightPerBox: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="boxesPerPallet">Số thùng/pallet</label>
                <input
                  id="boxesPerPallet"
                  type="number"
                  placeholder="80"
                  value={formData.boxesPerPallet}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      boxesPerPallet: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Tiêu chuẩn & Phân loại</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="qualityStandard">Tiêu chuẩn chất lượng</label>
                <select
                  id="qualityStandard"
                  value={formData.qualityStandard}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      qualityStandard: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn tiêu chuẩn --</option>
                  <option value="BIa">BIa</option>
                  <option value="BIb">BIb</option>
                  <option value="BIIa">BIIa</option>
                  <option value="BIIb">BIIb</option>
                  <option value="TCVN 7132:2002">TCVN 7132:2002</option>
                  <option value="ISO 13006">ISO 13006</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label htmlFor="productLineName">Dòng sản phẩm</label>
                <input
                  id="productLineName"
                  type="text"
                  placeholder="Gạch Granite/Porcelain men matt"
                  value={formData.productLineName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productLineName: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className={styles.formField}>
              <label htmlFor="notes">Ghi chú</label>
              <textarea
                id="notes"
                rows={2}
                placeholder="KIMSA full body, siêu dày..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Phân xưởng & Dây chuyền</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="workshop">Phân xưởng</label>
                <input
                  id="workshop"
                  type="text"
                  value={formData.workshop}
                  onChange={(e) =>
                    setFormData({ ...formData, workshop: e.target.value })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="productionLine">Dây chuyền</label>
                <input
                  id="productionLine"
                  type="text"
                  value={formData.productionLine}
                  onChange={(e) =>
                    setFormData({ ...formData, productionLine: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Thông tin sản xuất</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="contractCycle">Chu kỳ khoán (phút)</label>
                <input
                  id="contractCycle"
                  type="number"
                  value={formData.contractCycle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contractCycle: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="kilnOutput">Sản lượng ra lò (m²)</label>
                <input
                  id="kilnOutput"
                  type="number"
                  value={formData.kilnOutput}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      kilnOutput: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="qualityProductOutput">
                  Sản lượng chính phẩm (m²)
                </label>
                <input
                  id="qualityProductOutput"
                  type="number"
                  value={formData.qualityProductOutput}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      qualityProductOutput: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="deductionDays">Số ngày trừ khoán</label>
                <input
                  id="deductionDays"
                  type="number"
                  step="0.1"
                  value={formData.deductionDays ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deductionDays: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="contractProduction">
                  Sản lượng khoán (m²/tháng)
                </label>
                <input
                  id="contractProduction"
                  type="number"
                  value={formData.contractProduction ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contractProduction: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="additionalContractWhenReducingCycle">
                  Cộng khoán khi giảm chu kỳ
                </label>
                <input
                  id="additionalContractWhenReducingCycle"
                  type="number"
                  value={formData.additionalContractWhenReducingCycle ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      additionalContractWhenReducingCycle: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="reducedContractWhenIncreasingCycle">
                  Giảm khoán khi tăng chu kỳ
                </label>
                <input
                  id="reducedContractWhenIncreasingCycle"
                  type="number"
                  value={formData.reducedContractWhenIncreasingCycle ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reducedContractWhenIncreasingCycle: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onCancel}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loading}
            >
              {loading ? "Đang lưu..." : brick ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
