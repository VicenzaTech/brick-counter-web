import type { BrickType, CreateBrickTypeDto } from "@/lib/types/brick-type";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import styles from "./BrickTypeFormWizard.module.css";

interface BrickTypeFormWizardProps {
  brick?: BrickType;
  onSubmit: (data: CreateBrickTypeDto) => void;
  onCancel: () => void;
  loading?: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface StepValidation {
  isValid: boolean;
  errors: string[];
}

export function BrickTypeFormWizard({
  brick,
  onSubmit,
  onCancel,
  loading = false,
}: BrickTypeFormWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<CreateBrickTypeDto>(() => {
    // Try to load from localStorage
    const draftKey = `brickTypeFormDraft_${brick?.id || "new"}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch {
        // Fall through to default
      }
    }

    return {
      name: brick?.name || "",
      nameEnglish: brick?.nameEnglish || "",
      tileSize: brick?.tileSize || "",
      thickness: brick?.thickness || undefined,
      brickType: brick?.brickType || undefined,
      unit: brick?.unit || "m²",
      description: brick?.description || "",
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
      weightPerM2: brick?.weightPerM2 || undefined,
      piecesPerBox: brick?.piecesPerBox || 0,
      m2PerBox: brick?.m2PerBox || undefined,
      weightPerBox: brick?.weightPerBox || undefined,
      boxesPerPallet: brick?.boxesPerPallet || 0,
      qualityStandard: brick?.qualityStandard || "",
      productLineName: brick?.productLineName || "",
      notes: brick?.notes || "",
      isActive: brick?.isActive !== false,
    };
  });

  // Auto-save to localStorage
  useEffect(() => {
    const draftKey = `brickTypeFormDraft_${brick?.id || "new"}`;
    const timeoutId = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, brick?.id]);

  const computeM2PerBox = (tileSize: string, piecesPerBox: number) => {
    const match = tileSize.match(/(\d+)\s*[xX×]\s*(\d+)/);
    if (!match) return null;
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    const areaPerPiece = (width * height) / 1_000_000; // Convert mm² to m²
    return areaPerPiece * piecesPerBox;
  };

  const updateField = <K extends keyof CreateBrickTypeDto>(
    field: K,
    value: CreateBrickTypeDto[K]
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-calculate m2PerBox from tileSize + piecesPerBox
      let nextM2PerBox = next.m2PerBox;
      if (next.tileSize && next.piecesPerBox) {
        const calculatedM2 = computeM2PerBox(next.tileSize, next.piecesPerBox);
        if (
          calculatedM2 != null &&
          Math.abs((next.m2PerBox || 0) - calculatedM2) > 0.001
        ) {
          nextM2PerBox = calculatedM2;
        }
      }

      // Auto-calculate weightPerBox from weightPerM2 + m2PerBox
      let nextWeightPerBox = next.weightPerBox;
      const effectiveM2 = nextM2PerBox ?? next.m2PerBox;
      if (next.weightPerM2 && effectiveM2) {
        const calculatedWeight = next.weightPerM2 * effectiveM2;
        if (Math.abs((next.weightPerBox || 0) - calculatedWeight) > 0.1) {
          nextWeightPerBox = calculatedWeight;
        }
      }

      return {
        ...next,
        ...(nextM2PerBox !== next.m2PerBox ? { m2PerBox: nextM2PerBox } : null),
        ...(nextWeightPerBox !== next.weightPerBox
          ? { weightPerBox: nextWeightPerBox }
          : null),
      };
    });
  };

  const validateStep = (step: Step): StepValidation => {
    const errors: string[] = [];

    switch (step) {
      case 1: // Basic Info
        if (!formData.name?.trim()) errors.push("Tên dạng gạch là bắt buộc");
        if (!formData.tileSize?.trim())
          errors.push("Kích thước gạch là bắt buộc");
        if (!formData.brickType?.trim()) errors.push("Loại gạch là bắt buộc");
        break;

      case 2: // Production
        if (!formData.workshop?.trim()) errors.push("Phân xưởng là bắt buộc");
        if (!formData.productionLine?.trim())
          errors.push("Dây chuyền là bắt buộc");
        if (!formData.contractCycle || formData.contractCycle <= 0) {
          errors.push("Chu kỳ khoán phải lớn hơn 0");
        }
        break;

      case 3: // Packaging
        if (formData.piecesPerBox && formData.piecesPerBox <= 0) {
          errors.push("Số viên/hộp phải lớn hơn 0");
        }
        if (formData.boxesPerPallet && formData.boxesPerPallet <= 0) {
          errors.push("Số hộp/pallet phải lớn hơn 0");
        }
        break;

      case 4: // Standards
        // Optional fields, no strict validation
        break;

      case 5: // Preview
        // Final check - all required fields
        if (!formData.name?.trim()) errors.push("Tên dạng gạch là bắt buộc");
        if (!formData.tileSize?.trim())
          errors.push("Kích thước gạch là bắt buộc");
        if (!formData.brickType?.trim()) errors.push("Loại gạch là bắt buộc");
        if (!formData.workshop?.trim()) errors.push("Phân xưởng là bắt buộc");
        if (!formData.productionLine?.trim())
          errors.push("Dây chuyền là bắt buộc");
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleNext = () => {
    const validation = validateStep(currentStep);
    if (!validation.isValid) {
      alert(`Vui lòng kiểm tra lại:\n${validation.errors.join("\n")}`);
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateStep(5);

    if (!validation.isValid) {
      alert(`Không thể lưu:\n${validation.errors.join("\n")}`);
      return;
    }

    onSubmit(formData);

    // Clear draft from localStorage
    const draftKey = `brickTypeFormDraft_${brick?.id || "new"}`;
    localStorage.removeItem(draftKey);
  };

  const handleCancel = () => {
    if (confirm("Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ được lưu tự động.")) {
      onCancel();
    }
  };

  const stepValidations = [1, 2, 3, 4, 5].map((s) =>
    validateStep(s as Step)
  ) as [
    StepValidation,
    StepValidation,
    StepValidation,
    StepValidation,
    StepValidation
  ];

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{brick ? "Chỉnh sửa dạng gạch" : "Thêm dạng gạch mới"}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleCancel}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          {[
            { step: 1, label: "Thông tin cơ bản" },
            { step: 2, label: "Sản xuất" },
            { step: 3, label: "Đóng gói" },
            { step: 4, label: "Tiêu chuẩn" },
            { step: 5, label: "Xem trước" },
          ].map(({ step, label }) => (
            <div
              key={step}
              className={`${styles.stepItem} ${
                currentStep === step ? styles.active : ""
              } ${currentStep > step ? styles.completed : ""} ${
                !stepValidations[step - 1].isValid ? styles.invalid : ""
              }`}
              onClick={() => {
                if (step < currentStep) setCurrentStep(step as Step);
              }}
            >
              <div className={styles.stepNumber}>
                {currentStep > step ? <Check size={16} /> : step}
              </div>
              <span className={styles.stepLabel}>{label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Thông tin cơ bản</h3>

                <div className={styles.formGroup}>
                  <label className={styles.required}>Tên dạng gạch</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="VD: Gạch Granite 600x600"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Tên tiếng Anh</label>
                  <input
                    type="text"
                    value={formData.nameEnglish || ""}
                    onChange={(e) => updateField("nameEnglish", e.target.value)}
                    placeholder="VD: Granite Tile 600x600"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.required}>Kích thước</label>
                    <input
                      type="text"
                      value={formData.tileSize}
                      onChange={(e) => updateField("tileSize", e.target.value)}
                      placeholder="VD: 600x600"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Độ dày (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.thickness || ""}
                      onChange={(e) =>
                        updateField(
                          "thickness",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="VD: 9.5"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.required}>Loại gạch</label>
                    <input
                      type="text"
                      value={formData.brickType}
                      onChange={(e) =>
                        updateField("brickType", e.target.value as any)
                      }
                      placeholder="VD: Granite, Ceramic"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Đơn vị</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => updateField("unit", e.target.value)}
                    >
                      <option value="m²">m²</option>
                      <option value="viên">viên</option>
                      <option value="hộp">hộp</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Mô tả</label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Mô tả chi tiết về dạng gạch"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Production */}
            {currentStep === 2 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Thông tin sản xuất</h3>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.required}>Phân xưởng</label>
                    <input
                      type="text"
                      value={formData.workshop}
                      onChange={(e) => updateField("workshop", e.target.value)}
                      placeholder="VD: PX1, PX2"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.required}>Dây chuyền</label>
                    <input
                      type="text"
                      value={formData.productionLine}
                      onChange={(e) =>
                        updateField("productionLine", e.target.value)
                      }
                      placeholder="VD: Line 1, Line 2"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.required}>
                      Chu kỳ khoán (phút)
                    </label>
                    <input
                      type="number"
                      value={formData.contractCycle || ""}
                      onChange={(e) =>
                        updateField(
                          "contractCycle",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="VD: 45"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Sản lượng ra lò (m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.kilnOutput || ""}
                      onChange={(e) =>
                        updateField(
                          "kilnOutput",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="VD: 100"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Sản phẩm phẩm chất (m²)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.qualityProductOutput || ""}
                      onChange={(e) =>
                        updateField(
                          "qualityProductOutput",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="VD: 95"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Số ngày trừ</label>
                    <input
                      type="number"
                      value={formData.deductionDays || ""}
                      onChange={(e) =>
                        updateField(
                          "deductionDays",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="VD: 2"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Sản lượng khoán</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.contractProduction || ""}
                      onChange={(e) =>
                        updateField(
                          "contractProduction",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="VD: 90"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Bổ sung khi giảm chu kỳ</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.additionalContractWhenReducingCycle || ""}
                      onChange={(e) =>
                        updateField(
                          "additionalContractWhenReducingCycle",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="VD: 5"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Giảm khoán khi tăng chu kỳ</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reducedContractWhenIncreasingCycle || ""}
                      onChange={(e) =>
                        updateField(
                          "reducedContractWhenIncreasingCycle",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="VD: 2.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Packaging */}
            {currentStep === 3 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Thông tin đóng gói</h3>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Trọng lượng/m² (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weightPerM2 || ""}
                      onChange={(e) =>
                        updateField(
                          "weightPerM2",
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                      placeholder="VD: 20.5"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Số viên/hộp</label>
                    <input
                      type="number"
                      value={formData.piecesPerBox || ""}
                      onChange={(e) =>
                        updateField(
                          "piecesPerBox",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="VD: 4"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>m²/hộp (tự động)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.m2PerBox?.toFixed(4) || ""}
                      readOnly
                      className={styles.readOnly}
                      placeholder="Tính tự động"
                    />
                    <small className={styles.helpText}>
                      Tự động tính từ kích thước và số viên/hộp
                    </small>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Trọng lượng/hộp (kg, tự động)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weightPerBox?.toFixed(2) || ""}
                      readOnly
                      className={styles.readOnly}
                      placeholder="Tính tự động"
                    />
                    <small className={styles.helpText}>
                      Tự động tính từ trọng lượng/m² và m²/hộp
                    </small>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Số hộp/pallet</label>
                  <input
                    type="number"
                    value={formData.boxesPerPallet || ""}
                    onChange={(e) =>
                      updateField(
                        "boxesPerPallet",
                        parseInt(e.target.value) || 0
                      )
                    }
                    placeholder="VD: 48"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Standards */}
            {currentStep === 4 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Tiêu chuẩn & Ghi chú</h3>

                <div className={styles.formGroup}>
                  <label>Tiêu chuẩn chất lượng</label>
                  <input
                    type="text"
                    value={formData.qualityStandard || ""}
                    onChange={(e) =>
                      updateField("qualityStandard", e.target.value)
                    }
                    placeholder="VD: TCVN 6355:2009"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Tên dây chuyền sản xuất</label>
                  <input
                    type="text"
                    value={formData.productLineName || ""}
                    onChange={(e) =>
                      updateField("productLineName", e.target.value)
                    }
                    placeholder="VD: Dây chuyền Granite tự động"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Ghi chú</label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Ghi chú bổ sung..."
                    rows={4}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={(e) =>
                        updateField("isActive", e.target.checked)
                      }
                    />
                    <span>Đang hoạt động</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 5: Preview */}
            {currentStep === 5 && (
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Xem trước thông tin</h3>

                <div className={styles.previewSection}>
                  <h4>Thông tin cơ bản</h4>
                  <div className={styles.previewGrid}>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Tên:</span>
                      <span className={styles.previewValue}>
                        {formData.name}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>
                        Tên tiếng Anh:
                      </span>
                      <span className={styles.previewValue}>
                        {formData.nameEnglish || "—"}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Kích thước:</span>
                      <span className={styles.previewValue}>
                        {formData.tileSize}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Độ dày:</span>
                      <span className={styles.previewValue}>
                        {formData.thickness ? `${formData.thickness} mm` : "—"}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Loại gạch:</span>
                      <span className={styles.previewValue}>
                        {formData.brickType}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Đơn vị:</span>
                      <span className={styles.previewValue}>
                        {formData.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.previewSection}>
                  <h4>Sản xuất</h4>
                  <div className={styles.previewGrid}>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Phân xưởng:</span>
                      <span className={styles.previewValue}>
                        {formData.workshop}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Dây chuyền:</span>
                      <span className={styles.previewValue}>
                        {formData.productionLine}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Chu kỳ khoán:</span>
                      <span className={styles.previewValue}>
                        {formData.contractCycle} phút
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>
                        Sản lượng ra lò:
                      </span>
                      <span className={styles.previewValue}>
                        {formData.kilnOutput} m²
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.previewSection}>
                  <h4>Đóng gói</h4>
                  <div className={styles.previewGrid}>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>
                        Trọng lượng/m²:
                      </span>
                      <span className={styles.previewValue}>
                        {formData.weightPerM2
                          ? `${formData.weightPerM2} kg`
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Số viên/hộp:</span>
                      <span className={styles.previewValue}>
                        {formData.piecesPerBox}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>m²/hộp:</span>
                      <span className={styles.previewValue}>
                        {formData.m2PerBox ? formData.m2PerBox.toFixed(4) : "—"}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>
                        Trọng lượng/hộp:
                      </span>
                      <span className={styles.previewValue}>
                        {formData.weightPerBox
                          ? `${formData.weightPerBox.toFixed(2)} kg`
                          : "—"}
                      </span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>
                        Số hộp/pallet:
                      </span>
                      <span className={styles.previewValue}>
                        {formData.boxesPerPallet}
                      </span>
                    </div>
                  </div>
                </div>

                {(formData.qualityStandard ||
                  formData.productLineName ||
                  formData.notes) && (
                  <div className={styles.previewSection}>
                    <h4>Tiêu chuẩn & Ghi chú</h4>
                    <div className={styles.previewGrid}>
                      {formData.qualityStandard && (
                        <div className={styles.previewItem}>
                          <span className={styles.previewLabel}>
                            Tiêu chuẩn:
                          </span>
                          <span className={styles.previewValue}>
                            {formData.qualityStandard}
                          </span>
                        </div>
                      )}
                      {formData.productLineName && (
                        <div className={styles.previewItem}>
                          <span className={styles.previewLabel}>
                            Tên dây chuyền:
                          </span>
                          <span className={styles.previewValue}>
                            {formData.productLineName}
                          </span>
                        </div>
                      )}
                      {formData.notes && (
                        <div
                          className={styles.previewItem}
                          style={{ gridColumn: "1 / -1" }}
                        >
                          <span className={styles.previewLabel}>Ghi chú:</span>
                          <span className={styles.previewValue}>
                            {formData.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.previewSection}>
                  <div className={styles.previewItem}>
                    <span className={styles.previewLabel}>Trạng thái:</span>
                    <span
                      className={`${styles.previewValue} ${
                        formData.isActive ? styles.active : styles.inactive
                      }`}
                    >
                      {formData.isActive ? "Đang hoạt động" : "Tạm ngừng"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <div className={styles.footerLeft}>
              {currentStep > 1 && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handlePrevious}
                  disabled={loading}
                >
                  <ChevronLeft size={16} />
                  Quay lại
                </button>
              )}
            </div>

            <div className={styles.footerRight}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={loading}
              >
                Hủy
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleNext}
                  disabled={loading}
                >
                  Tiếp theo
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={loading}
                >
                  {loading ? "Đang lưu..." : brick ? "Cập nhật" : "Tạo mới"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
