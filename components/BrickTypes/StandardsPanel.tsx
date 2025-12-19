import { BrickType } from "@/lib/types/brick-type";
import { ArrowLeft, FileDown } from "lucide-react";
import { formatNumber } from "./helpers";
import styles from "./StandardsPanel.module.css";

interface StandardsPanelProps {
  brick: BrickType;
  onExit: () => void;
}

export function StandardsPanel({ brick, onExit }: StandardsPanelProps) {
  const handleExportPDF = () => {
    // Create printable content
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Vui lòng cho phép popup để xuất PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Tiêu chuẩn - ${brick.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
            }
            .header h1 {
              font-size: 24px;
              color: #1e40af;
              margin-bottom: 5px;
            }
            .header h2 {
              font-size: 18px;
              color: #64748b;
              font-weight: normal;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #1e40af;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #dbeafe;
            }
            .field {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .field:last-child {
              border-bottom: none;
            }
            .field-label {
              color: #64748b;
              font-weight: 500;
            }
            .field-value {
              color: #1e293b;
              font-weight: 600;
              text-align: right;
            }
            .full-width {
              grid-column: 1 / -1;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>THÔNG SỐ KỸ THUẬT SẢN PHẨM</h1>
            <h2>${brick.name}</h2>
          </div>

          <div class="grid">
            <div class="section">
              <div class="section-title">Thông tin cơ bản</div>
              <div class="field">
                <span class="field-label">Tên sản phẩm:</span>
                <span class="field-value">${brick.name || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Tên tiếng Anh:</span>
                <span class="field-value">${brick.nameEnglish || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Mã sản phẩm:</span>
                <span class="field-value">#${brick.id}</span>
              </div>
              <div class="field">
                <span class="field-label">Loại gạch:</span>
                <span class="field-value">${brick.brickType || "-"}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Kích thước & Quy cách</div>
              <div class="field">
                <span class="field-label">Kích thước:</span>
                <span class="field-value">${brick.tileSize || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Độ dày:</span>
                <span class="field-value">${brick.thickness || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Trọng lượng (kg/m²):</span>
                <span class="field-value">${formatNumber(
                  brick.weightPerM2
                )}</span>
              </div>
              <div class="field">
                <span class="field-label">Tiêu chuẩn chất lượng:</span>
                <span class="field-value">${brick.qualityStandard || "-"}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Thông tin đóng gói</div>
              <div class="field">
                <span class="field-label">Viên/thùng:</span>
                <span class="field-value">${formatNumber(
                  brick.piecesPerBox
                )}</span>
              </div>
              <div class="field">
                <span class="field-label">m²/thùng:</span>
                <span class="field-value">${formatNumber(brick.m2PerBox)}</span>
              </div>
              <div class="field">
                <span class="field-label">Trọng lượng/thùng (kg):</span>
                <span class="field-value">${formatNumber(
                  brick.weightPerBox
                )}</span>
              </div>
              <div class="field">
                <span class="field-label">Thùng/pallet:</span>
                <span class="field-value">${formatNumber(
                  brick.boxesPerPallet
                )}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Thông tin sản xuất</div>
              <div class="field">
                <span class="field-label">Phân xưởng:</span>
                <span class="field-value">${brick.workshop || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Dây chuyền:</span>
                <span class="field-value">${brick.productionLine || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Tên dây chuyền:</span>
                <span class="field-value">${brick.productLineName || "-"}</span>
              </div>
              <div class="field">
                <span class="field-label">Đơn vị tính:</span>
                <span class="field-value">${brick.unit || "m²"}</span>
              </div>
            </div>

            ${
              brick.notes
                ? `
            <div class="section full-width">
              <div class="section-title">Ghi chú</div>
              <div class="field-value" style="text-align: left; padding: 10px 0;">
                ${brick.notes}
              </div>
            </div>
            `
                : ""
            }
          </div>

          <div class="footer">
            <p>Tài liệu được tạo tự động từ hệ thống quản lý sản xuất</p>
            <p>Ngày xuất: ${new Date().toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Thông số kỹ thuật</h1>
          <p className={styles.subtitle}>{brick.name}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExportPDF}
            title="Xuất thành PDF để in"
          >
            <FileDown size={16} />
            <span>Xuất PDF</span>
          </button>
          <button type="button" className={styles.exitButton} onClick={onExit}>
            <ArrowLeft size={16} />
            <span>Quay lại chi tiết</span>
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Section 1: Thông tin cơ bản */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Thông tin cơ bản</h3>
          <div className={styles.fieldsList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Tên sản phẩm:</span>
              <span className={styles.fieldValue}>{brick.name}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Tên tiếng Anh:</span>
              <span className={styles.fieldValue}>
                {brick.nameEnglish || "-"}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Mã sản phẩm:</span>
              <span className={styles.fieldValue}>#{brick.id}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Loại gạch:</span>
              <span className={styles.fieldValue}>
                {brick.brickType || "-"}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Đơn vị tính:</span>
              <span className={styles.fieldValue}>{brick.unit || "m²"}</span>
            </div>
          </div>
        </section>

        {/* Section 2: Kích thước & Quy cách */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Kích thước & Quy cách</h3>
          <div className={styles.fieldsList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Kích thước:</span>
              <span className={styles.fieldValue}>{brick.tileSize || "-"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Độ dày:</span>
              <span className={styles.fieldValue}>
                {brick.thickness || "-"}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Trọng lượng (kg/m²):</span>
              <span className={styles.fieldValue}>
                {formatNumber(brick.weightPerM2)}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Tiêu chuẩn chất lượng:</span>
              <span className={styles.fieldValue}>
                {brick.qualityStandard || "-"}
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: Thông tin đóng gói */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Thông tin đóng gói</h3>
          <div className={styles.fieldsList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Viên/thùng:</span>
              <span className={styles.fieldValue}>
                {formatNumber(brick.piecesPerBox)}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>m²/thùng:</span>
              <span className={styles.fieldValue}>
                {formatNumber(brick.m2PerBox)}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Trọng lượng/thùng (kg):</span>
              <span className={styles.fieldValue}>
                {formatNumber(brick.weightPerBox)}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Thùng/pallet:</span>
              <span className={styles.fieldValue}>
                {formatNumber(brick.boxesPerPallet)}
              </span>
            </div>
          </div>
        </section>

        {/* Section 4: Thông tin sản xuất */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Thông tin sản xuất</h3>
          <div className={styles.fieldsList}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Phân xưởng:</span>
              <span className={styles.fieldValue}>{brick.workshop || "-"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Dây chuyền:</span>
              <span className={styles.fieldValue}>
                {brick.productionLine || "-"}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Tên dây chuyền:</span>
              <span className={styles.fieldValue}>
                {brick.productLineName || "-"}
              </span>
            </div>
          </div>
        </section>

        {/* Section 5: Ghi chú (full width if exists) */}
        {brick.notes && (
          <section className={`${styles.section} ${styles.fullWidth}`}>
            <h3 className={styles.sectionTitle}>Ghi chú</h3>
            <div className={styles.notesContent}>{brick.notes}</div>
          </section>
        )}
      </div>
    </div>
  );
}
