import type { BrickType, CreateBrickTypeDto } from "@/lib/types/brick-type";
import { useState, type FormEvent } from "react";
import styles from "./BrickTypeForm.module.css";
import { Button } from "@/components/Button/Button";

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
    piecesPerBox: brick?.piecesPerBox || undefined,
    m2PerBox: brick?.m2PerBox || undefined,
    weightPerBox: brick?.weightPerBox || undefined,
    boxesPerPallet: brick?.boxesPerPallet || undefined,
    qualityStandard: brick?.qualityStandard || "",
    productLineName: brick?.productLineName || "",
    notes: brick?.notes || "",
    workshop: brick?.workshop || "",
    productionLine: brick?.productionLine || "",
    contractCycle: brick?.contractCycle || undefined,
    kilnOutput: brick?.kilnOutput || undefined,
    qualityProductOutput: brick?.qualityProductOutput || undefined,
    deductionDays: brick?.deductionDays || undefined,
    contractProduction: brick?.contractProduction || undefined,
    additionalContractWhenReducingCycle:
      brick?.additionalContractWhenReducingCycle || undefined,
    reducedContractWhenIncreasingCycle:
      brick?.reducedContractWhenIncreasingCycle || undefined,
    isActive: brick?.isActive !== false,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;

    if (type === "number") {
      finalValue = value === "" ? undefined : Number(value);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        {/* General Info */}
        <h4 className={styles.sectionTitle}>Thông tin chung</h4>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tên loại gạch *</label>
          <input
            className={styles.input}
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="VD: 6060TRANG"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tên tiếng Anh</label>
          <input
            className={styles.input}
            name="nameEnglish"
            value={formData.nameEnglish || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Phân loại</label>
          <select
            className={styles.select}
            name="brickType"
            value={formData.brickType || ""}
            onChange={handleChange}
          >
            <option value="">-- Chọn loại --</option>
            <option value="Granite">Granite</option>
            <option value="Porcelain">Porcelain</option>
            <option value="Ceramic">Ceramic</option>
            <option value="Semi-Porcelain">Semi-Porcelain</option>
            <option value="Granite/Porcelain">Granite/Porcelain</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Dòng sản phẩm</label>
          <input
            className={styles.input}
            name="productLineName"
            value={formData.productLineName || ""}
            onChange={handleChange}
            placeholder="VD: Dòng cao cấp"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Kích thước</label>
          <input
            className={styles.input}
            name="tileSize"
            value={formData.tileSize || ""}
            onChange={handleChange}
            placeholder="VD: 60x60"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Độ dày (mm)</label>
          <input
            className={styles.input}
            type="number"
            name="thickness"
            value={formData.thickness || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Đơn vị tính</label>
          <input
            className={styles.input}
            name="unit"
            value={formData.unit || "m²"}
            onChange={handleChange}
          />
        </div>

        {/* Logistics */}
        <h4 className={styles.sectionTitle}>Thông tin đóng gói & Logistics</h4>

        <div className={styles.formGroup}>
          <label className={styles.label}>Số viên/hộp</label>
          <input
            className={styles.input}
            type="number"
            name="piecesPerBox"
            value={formData.piecesPerBox || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>m²/hộp</label>
          <input
            className={styles.input}
            type="number"
            step="0.01"
            name="m2PerBox"
            value={formData.m2PerBox || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Trọng lượng/m² (kg)</label>
          <input
            className={styles.input}
            type="number"
            step="0.1"
            name="weightPerM2"
            value={formData.weightPerM2 || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Trọng lượng/hộp (kg)</label>
          <input
            className={styles.input}
            type="number"
            step="0.1"
            name="weightPerBox"
            value={formData.weightPerBox || ""}
            onChange={handleChange}
          />
        </div>

        {/* Production Info */}
        <h4 className={styles.sectionTitle}>Thông tin sản xuất</h4>

        <div className={styles.formGroup}>
          <label className={styles.label}>Xưởng</label>
          <input
            className={styles.input}
            name="workshop"
            value={formData.workshop || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Dây chuyền</label>
          <input
            className={styles.input}
            name="productionLine"
            value={formData.productionLine || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Chu kỳ hợp đồng (ngày)</label>
          <input
            className={styles.input}
            type="number"
            name="contractCycle"
            value={formData.contractCycle || ""}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Sản lượng lò (m²/ngày)</label>
          <input
            className={styles.input}
            type="number"
            name="kilnOutput"
            value={formData.kilnOutput || ""}
            onChange={handleChange}
          />
        </div>

        {/* Other */}
        <h4 className={styles.sectionTitle}>Khác</h4>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Mô tả</label>
          <textarea
            className={styles.textarea}
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
          />
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Ghi chú</label>
          <textarea
            className={styles.textarea}
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <Button
          type="button"
          typeBtn="secondaryButton"
          onClick={onCancel}
          disabled={loading}
        >
          Hủy bỏ
        </Button>
        <Button type="submit" loading={loading}>
          {brick ? "Cập nhật" : "Tạo mới"}
        </Button>
      </div>
    </form>
  );
}
