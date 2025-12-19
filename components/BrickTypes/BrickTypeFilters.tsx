import styles from "./BrickTypeFilters.module.css";

type GroupBy = "none" | "workshop" | "productionLine";

interface BrickTypeFiltersProps {
  statusFilter: "all" | "active" | "inactive";
  workshopFilter: string;
  lineFilter: string;
  brickTypeFilter: string;
  groupBy: GroupBy;
  workshops: string[];
  productionLines: string[];
  brickTypes: string[];
  onStatusChange: (value: "all" | "active" | "inactive") => void;
  onWorkshopChange: (value: string) => void;
  onLineChange: (value: string) => void;
  onBrickTypeChange: (value: string) => void;
  onGroupByChange: (value: GroupBy) => void;
  onClear: () => void;
}

export function BrickTypeFilters({
  statusFilter,
  workshopFilter,
  lineFilter,
  brickTypeFilter,
  groupBy,
  workshops,
  productionLines,
  brickTypes,
  onStatusChange,
  onWorkshopChange,
  onLineChange,
  onBrickTypeChange,
  onGroupByChange,
  onClear,
}: BrickTypeFiltersProps) {
  return (
    <div className={styles.filtersPanel}>
      <div className={styles.filterRow}>
        <label>Trạng thái</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as any)}
        >
          <option value="all">Tất cả</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Ngưng hoạt động</option>
        </select>
      </div>

      <div className={styles.filterRow}>
        <label>Phân xưởng</label>
        <select
          value={workshopFilter}
          onChange={(e) => onWorkshopChange(e.target.value)}
        >
          <option value="">Tất cả</option>
          {workshops.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterRow}>
        <label>Dây chuyền</label>
        <select
          value={lineFilter}
          onChange={(e) => onLineChange(e.target.value)}
        >
          <option value="">Tất cả</option>
          {productionLines.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterRow}>
        <label>Loại gạch</label>
        <select
          value={brickTypeFilter}
          onChange={(e) => onBrickTypeChange(e.target.value)}
        >
          <option value="">Tất cả</option>
          {brickTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterRow}>
        <label>Nhóm theo</label>
        <select
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
        >
          <option value="none">Không nhóm</option>
          <option value="workshop">Phân xưởng</option>
          <option value="productionLine">Dây chuyền</option>
        </select>
      </div>

      <button type="button" className={styles.clearFilters} onClick={onClear}>
        Xóa tất cả bộ lọc
      </button>
    </div>
  );
}
