import type { BrickType } from "@/lib/types/brick-type";
import { Pencil, Trash2, FileText } from "lucide-react";
import { BrickTypeStats } from "./BrickTypeStats";
import {
  formatNumber,
  formatDate,
  getQualityBadgeClass,
  calculateContainerCapacity,
} from "./helpers";
import styles from "./BrickTypeDetail.module.css";

interface BrickTypeDetailProps {
  brick: BrickType;
  canUpdate: boolean;
  onEdit?: (brick: BrickType) => void;
  onDelete?: (id: number) => void;
  onViewStandards?: () => void;
}

export function BrickTypeDetail({
  brick,
  canUpdate,
  onEdit,
  onDelete,
  onViewStandards,
}: BrickTypeDetailProps) {
  const containerData = calculateContainerCapacity(brick);

  return (
    <div className={styles.detailContainer}>
      <header className={styles.detailHeader}>
        <div>
          <h1 className={styles.detailTitle}>{brick.name}</h1>
          <p className={styles.detailSubtitle}>
            Thông tin chi tiết cho dạng gạch ID #{brick.id}
          </p>
        </div>
        <div className={styles.detailActions}>
          {onViewStandards && (
            <button
              type="button"
              className={styles.standardsButton}
              onClick={onViewStandards}
              title="Xem thông số kỹ thuật đầy đủ"
            >
              <FileText size={14} />
              <span>Tiêu chuẩn</span>
            </button>
          )}
          {canUpdate && onEdit && (
            <button
              type="button"
              className={styles.editButton}
              onClick={() => onEdit(brick)}
            >
              <Pencil size={14} />
              <span>Chỉnh sửa</span>
            </button>
          )}
          {canUpdate && onDelete && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => onDelete(brick.id)}
            >
              <Trash2 size={14} />
              <span>Xoá</span>
            </button>
          )}
        </div>
      </header>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <h3>Chi tiết</h3>
          <div className={styles.summaryGrid}>
            <InfoItem label="Mã dạng gạch" value={brick.id} />
            <InfoItem label="Tên tiếng Anh" value={brick.nameEnglish} />
            <InfoItem label="Kích thước" value={brick.tileSize} />
            <InfoItem
              label="Độ dày (mm)"
              value={
                brick.thickness ? formatNumber(brick.thickness) : undefined
              }
            />
            <InfoItem label="Loại gạch" value={brick.brickType} />
            <InfoItem label="Đơn vị" value={brick.unit || "m²"} />
            <InfoItem label="Phân xưởng" value={brick.workshop} />
            <InfoItem label="Dây chuyền" value={brick.productionLine} />
            <InfoItem label="Dòng sản phẩm" value={brick.productLineName} />
            <InfoItem
              label="Tiêu chuẩn CL"
              value={
                brick.qualityStandard ? (
                  <span
                    className={
                      styles[getQualityBadgeClass(brick.qualityStandard)]
                    }
                  >
                    {brick.qualityStandard}
                  </span>
                ) : undefined
              }
            />
            <InfoItem
              label="Chu kỳ khoán (phút)"
              value={formatNumber(brick.contractCycle)}
            />
            <InfoItem
              label="SL ra lò (m²)"
              value={formatNumber(brick.kilnOutput)}
            />
            <InfoItem
              label="SL chính phẩm (m²)"
              value={formatNumber(brick.qualityProductOutput)}
            />
          </div>
          {brick.description && (
            <p className={styles.summaryDescription}>{brick.description}</p>
          )}
          {brick.notes && (
            <div className={styles.summaryDescription}>
              <strong>Ghi chú:</strong> {brick.notes}
            </div>
          )}
        </div>

        <div className={styles.summaryCard}>
          <h3>Thông tin đóng gói</h3>
          <div className={styles.summaryGrid}>
            <InfoItem
              label="Trọng lượng/m²"
              value={
                brick.weightPerM2
                  ? `${formatNumber(brick.weightPerM2)} kg`
                  : undefined
              }
            />
            <InfoItem
              label="Số viên/thùng"
              value={formatNumber(brick.piecesPerBox)}
            />
            <InfoItem
              label="m²/thùng"
              value={brick.m2PerBox ? formatNumber(brick.m2PerBox) : undefined}
            />
            <InfoItem
              label="Trọng lượng/thùng"
              value={
                brick.weightPerBox
                  ? `${formatNumber(brick.weightPerBox)} kg`
                  : undefined
              }
            />
            <InfoItem
              label="Số thùng/pallet"
              value={formatNumber(brick.boxesPerPallet)}
            />
            {brick.weightPerBox && brick.boxesPerPallet && (
              <InfoItem
                label="TL/pallet"
                value={`${formatNumber(
                  brick.weightPerBox * brick.boxesPerPallet
                )} kg`}
              />
            )}
            {brick.m2PerBox && brick.boxesPerPallet && (
              <InfoItem
                label="m²/pallet"
                value={`${formatNumber(
                  brick.m2PerBox * brick.boxesPerPallet
                )} m²`}
              />
            )}
          </div>
        </div>

        {containerData && (
          <div className={styles.summaryCard}>
            <h3>Logistics Container</h3>
            <div className={styles.summaryGrid}>
              <InfoItem
                label="Container 20ft"
                value={`${containerData.container20.pallets} pallet`}
              />
              <InfoItem
                label="Tổng thùng"
                value={`${formatNumber(containerData.container20.boxes)} thùng`}
              />
              <InfoItem
                label="Tổng khối lượng"
                value={`${containerData.container20.weightTon} tấn`}
              />
              <InfoItem
                label="Tổng diện tích"
                value={`${containerData.container20.m2} m²`}
              />
            </div>
          </div>
        )}

        <div className={styles.summaryCard}>
          <h3>Trạng thái</h3>
          <div className={styles.summaryGrid}>
            <InfoItem
              label="Trạng thái"
              value={
                brick.isActive !== false ? "Đang sử dụng" : "Ngưng sử dụng"
              }
            />
            <InfoItem
              label="Dây chuyền đang chạy"
              value={
                brick.activeProductionLineId
                  ? `ID #${brick.activeProductionLineId}`
                  : undefined
              }
            />
            <InfoItem
              label="Lần hoạt động gần nhất"
              value={formatDate(brick.lastActiveAt)}
            />
          </div>
        </div>
      </div>

      <BrickTypeStats brickId={brick.id} />
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | React.ReactNode;
}) {
  return (
    <div className={styles.summaryItem}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value || "-"}</span>
    </div>
  );
}
