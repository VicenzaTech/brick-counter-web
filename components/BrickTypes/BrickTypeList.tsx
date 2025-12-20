import type { BrickType } from "@/lib/types/brick-type";
import { Plus, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { BrickTypeCard } from "./BrickTypeCard";
import { BrickTypeFilters } from "./BrickTypeFilters";
import styles from "./BrickTypeList.module.css";

type SortField = "name" | "production" | "date" | "status";
type SortOrder = "asc" | "desc";
type GroupBy = "none" | "workshop" | "productionLine";

interface BrickTypeListProps {
  brickTypes: BrickType[];
  selectedBrickId: number | null;
  compareMode: boolean;
  selectedForCompare: Set<number>;
  canUpdate: boolean;
  onSelectBrick: (id: number) => void;
  onToggleCompare: (id: number) => void;
  onCreateNew?: () => void;
  onEdit?: (brick: BrickType) => void;
  onDelete?: (id: number) => void;
  onCopy?: (brick: BrickType) => void;
  onToggleActive?: (id: number, isActive: boolean) => void;
  onEnterCompareMode?: () => void;
  onExitCompareMode?: () => void;
}

export function BrickTypeList({
  brickTypes,
  selectedBrickId,
  compareMode,
  selectedForCompare,
  canUpdate,
  onSelectBrick,
  onToggleCompare,
  onCreateNew,
  onEdit,
  onDelete,
  onCopy,
  onToggleActive,
  onEnterCompareMode,
  onExitCompareMode,
}: BrickTypeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [workshopFilter, setWorkshopFilter] = useState<string>("");
  const [lineFilter, setLineFilter] = useState<string>("");
  const [brickTypeFilter, setBrickTypeFilter] = useState<string>("");

  const filteredAndSortedBricks = useMemo(() => {
    let filtered = brickTypes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.nameEnglish?.toLowerCase().includes(query) ||
          b.tileSize?.toLowerCase().includes(query) ||
          b.id.toString().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((b) =>
        statusFilter === "active" ? b.isActive !== false : b.isActive === false
      );
    }

    if (workshopFilter) {
      filtered = filtered.filter((b) => b.workshop === workshopFilter);
    }

    if (lineFilter) {
      filtered = filtered.filter((b) => b.productionLine === lineFilter);
    }

    if (brickTypeFilter) {
      filtered = filtered.filter((b) => b.brickType === brickTypeFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;
      switch (sortField) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "date":
          compareValue =
            new Date(a.lastActiveAt || 0).getTime() -
            new Date(b.lastActiveAt || 0).getTime();
          break;
        case "status":
          compareValue = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        default:
          compareValue = 0;
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return sorted;
  }, [
    brickTypes,
    searchQuery,
    statusFilter,
    workshopFilter,
    lineFilter,
    brickTypeFilter,
    sortField,
    sortOrder,
  ]);

  const groupedBricks = useMemo(() => {
    if (groupBy === "none") {
      return { "": filteredAndSortedBricks };
    }

    const groups: Record<string, BrickType[]> = {};
    filteredAndSortedBricks.forEach((brick) => {
      const key =
        groupBy === "workshop"
          ? brick.workshop || "Chưa phân loại"
          : brick.productionLine || "Chưa phân loại";
      if (!groups[key]) groups[key] = [];
      groups[key].push(brick);
    });
    return groups;
  }, [filteredAndSortedBricks, groupBy]);

  const totalActive = brickTypes.filter((b) => b.isActive).length;
  const uniqueWorkshops = Array.from(
    new Set(
      brickTypes.map((b) => b.workshop).filter((v): v is string => Boolean(v))
    )
  );
  const uniqueLines = Array.from(
    new Set(
      brickTypes
        .map((b) => b.productionLine)
        .filter((v): v is string => Boolean(v))
    )
  );
  const uniqueBrickTypes = Array.from(
    new Set(
      brickTypes.map((b) => b.brickType).filter((v): v is string => Boolean(v))
    )
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setWorkshopFilter("");
    setLineFilter("");
    setBrickTypeFilter("");
    setGroupBy("none");
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    workshopFilter ||
    lineFilter ||
    brickTypeFilter;

  return (
    <div className={styles.listPanel}>
      <header className={styles.listHeader}>
        <div>
          <h2 className={styles.listTitle}>Dạng gạch</h2>
          <p className={styles.listSubtitle}>
            {brickTypes.length} dạng gạch · {totalActive} đang hoạt động
          </p>
        </div>
        {canUpdate && onCreateNew && (
          <button
            type="button"
            className={styles.createButton}
            onClick={onCreateNew}
          >
            <Plus size={16} />
            <span>Thêm mới</span>
          </button>
        )}
      </header>

      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã, kích thước..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`${styles.iconButton} ${showFilters ? styles.active : ""}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Bộ lọc"
        >
          <SlidersHorizontal size={16} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => handleSort(sortField)}
          title="Sắp xếp"
        >
          <ArrowUpDown size={16} />
        </button>
      </div>

      {showFilters && (
        <BrickTypeFilters
          statusFilter={statusFilter}
          workshopFilter={workshopFilter}
          lineFilter={lineFilter}
          brickTypeFilter={brickTypeFilter}
          groupBy={groupBy}
          workshops={uniqueWorkshops}
          productionLines={uniqueLines}
          brickTypes={uniqueBrickTypes}
          onStatusChange={setStatusFilter}
          onWorkshopChange={setWorkshopFilter}
          onLineChange={setLineFilter}
          onBrickTypeChange={setBrickTypeFilter}
          onGroupByChange={setGroupBy}
          onClear={clearFilters}
        />
      )}

      {filteredAndSortedBricks.length === 0 ? (
        <div className={styles.emptyState}>
          {brickTypes.length === 0 ? (
            <>
              <p>Chưa có dạng gạch nào</p>
              {canUpdate && onCreateNew && (
                <button
                  type="button"
                  className={styles.createButton}
                  onClick={onCreateNew}
                >
                  <Plus size={16} />
                  Thêm mới
                </button>
              )}
            </>
          ) : (
            <>
              <p>Không tìm thấy kết quả phù hợp</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={clearFilters}
                >
                  Xóa bộ lọc
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className={styles.brickList}>
          {groupBy === "none"
            ? // Render cards directly without group wrapper
              (() => {
                console.log(
                  "Rendering direct cards, count:",
                  filteredAndSortedBricks.length
                );
                return filteredAndSortedBricks.map((brick) => (
                  <BrickTypeCard
                    key={brick.id}
                    brick={brick}
                    isSelected={brick.id === selectedBrickId}
                    isCompareMode={compareMode}
                    isSelectedForCompare={selectedForCompare.has(brick.id)}
                    onSelect={onSelectBrick}
                    onToggleCompare={onToggleCompare}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCopy={onCopy}
                    onToggleActive={onToggleActive}
                    canUpdate={canUpdate}
                  />
                ));
              })()
            : // Render with groups
              (() => {
                console.log(
                  "Rendering grouped cards, groups:",
                  Object.keys(groupedBricks)
                );
                return Object.entries(groupedBricks).map(
                  ([groupName, bricks]) => (
                    <div key={groupName} className={styles.brickGroup}>
                      <div className={styles.groupHeader}>
                        <h3>{groupName}</h3>
                        <span className={styles.groupCount}>
                          {bricks.length}
                        </span>
                      </div>
                      {bricks.map((brick) => (
                        <BrickTypeCard
                          key={brick.id}
                          brick={brick}
                          isSelected={brick.id === selectedBrickId}
                          isCompareMode={compareMode}
                          isSelectedForCompare={selectedForCompare.has(
                            brick.id
                          )}
                          onSelect={onSelectBrick}
                          onToggleCompare={onToggleCompare}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onCopy={onCopy}
                          onToggleActive={onToggleActive}
                          canUpdate={canUpdate}
                        />
                      ))}
                    </div>
                  )
                );
              })()}
        </div>
      )}

      {selectedForCompare.size >= 2 && (
        <div className={styles.compareBar}>
          <span>Đã chọn {selectedForCompare.size} dạng gạch</span>
          <div>
            {compareMode
              ? onExitCompareMode && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onExitCompareMode}
                  >
                    ← Quay lại chi tiết
                  </button>
                )
              : onEnterCompareMode && (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={onEnterCompareMode}
                  >
                    So sánh đã chọn
                  </button>
                )}
          </div>
        </div>
      )}
    </div>
  );
}
