import type { BrickType } from "@/lib/types/brick-type";
import styles from "./BrickTypeCard.module.css";
import { getQualityBadgeClass, formatNumber } from "./helpers";

interface BrickTypeCardProps {
  brick: BrickType;
  isSelected: boolean;
  isCompareMode: boolean;
  isSelectedForCompare: boolean;
  onSelect: (id: number) => void;
  onToggleCompare: (id: number) => void;
  onEdit?: (brick: BrickType) => void;
  onDelete?: (id: number) => void;
  onCopy?: (brick: BrickType) => void;
  onToggleActive?: (id: number, isActive: boolean) => void;
  canUpdate: boolean;
}

export function BrickTypeCard({
  brick,
  isSelected,
  isCompareMode,
  isSelectedForCompare,
  onSelect,
  onToggleCompare,
  onEdit,
  onDelete,
  onCopy,
  onToggleActive,
  canUpdate,
}: BrickTypeCardProps) {
  return (
    <div
      className={`${styles.brickCard} ${isSelected ? styles.selected : ""}`}
      onClick={() => onSelect(brick.id)}
    >
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.brickName}>{brick.name}</h3>
          {brick.tileSize && (
            <span className={styles.brickSize}>{brick.tileSize}</span>
          )}
        </div>
        {isCompareMode && (
          <input
            type="checkbox"
            checked={isSelectedForCompare}
            onChange={(e) => {
              e.stopPropagation();
              onToggleCompare(brick.id);
            }}
            className={styles.compareCheckbox}
          />
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Dây chuyền:</span>
          <span className={styles.infoValue}>
            {brick.productionLine || "-"}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Chu kỳ khoán:</span>
          <span className={styles.infoValue}>
            {brick.contractCycle !== undefined
              ? `${brick.contractCycle} phút`
              : "-"}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>SL ra lò:</span>
          <span className={styles.infoValue}>
            {brick.kilnOutput !== undefined
              ? `${formatNumber(brick.kilnOutput)} m²`
              : "-"}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Tiêu chuẩn:</span>
          {brick.qualityStandard ? (
            <span
              className={`${styles.badge} ${
                styles[getQualityBadgeClass(brick.qualityStandard)]
              }`}
            >
              {brick.qualityStandard}
            </span>
          ) : (
            <span className={styles.infoValue}>-</span>
          )}
        </div>

        <div className={styles.statusBadgeRow}>
          {brick.isActive ? (
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              Đang sản xuất
            </div>
          ) : (
            <div className={styles.statusBadgeInactive}>
              <span className={styles.statusDotInactive} />
              Ngừng sản xuất
            </div>
          )}
        </div>
      </div>

      {canUpdate && (
        <div className={styles.cardActions}>
          {onEdit && (
            <button
              type="button"
              className={styles.editButton}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(brick);
              }}
              title="Chỉnh sửa"
            >
              Sửa
            </button>
          )}
          {onCopy && (
            <button
              type="button"
              className={styles.copyButton}
              onClick={(e) => {
                e.stopPropagation();
                onCopy(brick);
              }}
              title="Sao chép"
            >
              Sao chép
            </button>
          )}
          {onToggleActive && (
            <button
              type="button"
              className={
                brick.isActive ? styles.deactivateButton : styles.activateButton
              }
              onClick={(e) => {
                e.stopPropagation();
                onToggleActive(brick.id, !brick.isActive);
              }}
              title={brick.isActive ? "Ngừng sản xuất" : "Kích hoạt"}
            >
              {brick.isActive ? "Ngừng" : "Kích hoạt"}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(brick.id);
              }}
              title="Xóa"
            >
              Xóa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
