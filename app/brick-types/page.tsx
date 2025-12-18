"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/auth/rbarc";
import { PERMISSIONS } from "@/lib/auth/permission.constant";
import {
  useBrickTypes,
  useCreateBrickType,
  useUpdateBrickType,
  useDeleteBrickType,
  useActivateBrickType,
  useDeactivateBrickType,
} from "@/hooks/useBrickTypes";
import type { BrickType, CreateBrickTypeDto } from "@/lib/types/brick-type";
import { BrickTypeForm } from "@/components/BrickTypes/BrickTypeForm";
import { BrickTypeList } from "@/components/BrickTypes/BrickTypeList";
import { ComparePanel } from "@/components/BrickTypes/ComparePanel";
import { BrickTypeStats } from "@/components/BrickTypes/BrickTypeStats";
import { Button } from "@/components/Button/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  GitCompare,
} from "lucide-react";
import styles from "./BrickTypesPage.module.css";

export default function BrickTypesPage() {
  const user = useAuthStore((s) => s.user);
  const canUpdate = user
    ? hasPermission(user, PERMISSIONS.BRICK_TYPE_UPDATE)
    : false;
  const canDelete = user
    ? hasPermission(user, PERMISSIONS.BRICK_TYPE_DELETE)
    : false;
  const canCreate = user
    ? hasPermission(user, PERMISSIONS.BRICK_TYPE_CREATE)
    : false;

  const { data, loading, refetch } = useBrickTypes();
  const brickTypes = useMemo(() => data || [], [data]);

  const createMutation = useCreateBrickType();
  const updateMutation = useUpdateBrickType();
  const deleteMutation = useDeleteBrickType();
  const activateMutation = useActivateBrickType();
  const deactivateMutation = useDeactivateBrickType();

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [thicknessFilter, setThicknessFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrick, setEditingBrick] = useState<BrickType | undefined>(
    undefined
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [brickToDelete, setBrickToDelete] = useState<BrickType | null>(null);

  // View Mode States
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<number>>(
    new Set()
  );
  const [selectedBrickId, setSelectedBrickId] = useState<number | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [chartMode, setChartMode] = useState<"day" | "month">("day");

  // Derived Data for Filters
  const uniqueSizes = useMemo(() => {
    const sizes = new Set(brickTypes.map((b) => b.tileSize).filter(Boolean));
    return Array.from(sizes).sort();
  }, [brickTypes]);

  const uniqueThicknesses = useMemo(() => {
    const thicknesses = new Set(
      brickTypes.map((b) => b.thickness).filter(Boolean)
    );
    return Array.from(thicknesses).sort((a, b) => (a || 0) - (b || 0));
  }, [brickTypes]);

  const uniqueQualities = useMemo(() => {
    const qualities = new Set(
      brickTypes.map((b) => b.qualityStandard).filter(Boolean)
    );
    return Array.from(qualities).sort();
  }, [brickTypes]);

  // Filtering Logic
  const filteredBricks = useMemo(() => {
    return brickTypes.filter((brick) => {
      const matchesSearch =
        brick.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (brick.nameEnglish &&
          brick.nameEnglish.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType =
        typeFilter === "all" || brick.brickType === typeFilter;
      const matchesSize = sizeFilter === "all" || brick.tileSize === sizeFilter;
      const matchesThickness =
        thicknessFilter === "all" ||
        brick.thickness?.toString() === thicknessFilter;
      const matchesQuality =
        qualityFilter === "all" || brick.qualityStandard === qualityFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesSize &&
        matchesThickness &&
        matchesQuality
      );
    });
  }, [
    brickTypes,
    searchTerm,
    typeFilter,
    sizeFilter,
    thicknessFilter,
    qualityFilter,
  ]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredBricks.length / pageSize);
  const paginatedBricks = filteredBricks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handlers
  const handleCreate = () => {
    setEditingBrick(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (brick: BrickType) => {
    setEditingBrick(brick);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (brick: BrickType) => {
    setBrickToDelete(brick);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (brickToDelete) {
      try {
        await deleteMutation.mutate(brickToDelete.id);
        setIsDeleteModalOpen(false);
        setBrickToDelete(null);
        refetch();
      } catch (error) {
        console.error("Failed to delete brick type", error);
      }
    }
  };

  const handleSubmitForm = async (data: CreateBrickTypeDto) => {
    try {
      if (editingBrick) {
        await updateMutation.mutate(editingBrick.id, data);
      } else {
        await createMutation.mutate(data);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to save brick type", error);
      alert(
        `Lỗi: ${
          error instanceof Error ? error.message : "Không thể lưu dữ liệu"
        }`
      );
    }
  };

  const handleSelectBrick = (id: number) => {
    setSelectedBrickId(id);
    setShowDetailPanel(true);
  };

  const handleToggleCompare = (id: number) => {
    const newSet = new Set(selectedForCompare);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size < 5) {
        newSet.add(id);
      }
    }
    setSelectedForCompare(newSet);
  };

  const handleEnterCompareMode = () => {
    setCompareMode(false); // Exit compare mode to show comparison panel
  };

  const handleExitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare(new Set());
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    const brick = brickTypes.find((b) => b.id === id);
    if (!brick) return;

    console.log("Toggle active - brick data:", {
      id: brick.id,
      name: brick.name,
      productionLine: brick.productionLine,
      activeProductionLineId: brick.activeProductionLineId,
      isActive: brick.isActive,
      newIsActive: isActive,
    });

    // Kiểm tra xem có activeProductionLineId không
    if (!brick.activeProductionLineId) {
      console.error("Missing activeProductionLineId for brick:", brick);
      alert(
        `Không thể ${
          isActive ? "kích hoạt" : "ngừng sản xuất"
        }: Chưa có ID dây chuyền sản xuất được gán.\n\n` +
          `Thông tin hiện tại:\n` +
          `- Tên dây chuyền: ${brick.productionLine || "Chưa có"}\n` +
          `- ID dây chuyền: ${brick.activeProductionLineId || "Chưa có"}\n\n` +
          `Vui lòng chỉnh sửa dòng gạch và gán ID dây chuyền sản xuất.`
      );
      return;
    }

    try {
      if (isActive) {
        // Activating
        const result = await activateMutation.mutate(id, {
          productionLineId: brick.activeProductionLineId,
          status: "producing",
        });
        console.log("Activate result:", result);
      } else {
        // Deactivating
        const result = await deactivateMutation.mutate(id, {
          productionLineId: brick.activeProductionLineId,
        });
        console.log("Deactivate result:", result);
      }
      refetch();
    } catch (error) {
      console.error("Failed to toggle brick type status:", error);
      alert(
        `Lỗi: ${
          error instanceof Error
            ? error.message
            : "Không thể thay đổi trạng thái"
        }`
      );
    }
  };

  const handleCopy = (brick: BrickType) => {
    const newBrick = { ...brick, name: `${brick.name} (Copy)` };
    setEditingBrick(newBrick as BrickType);
    setIsModalOpen(true);
  };

  const getBadgeClass = (type?: string) => {
    switch (type) {
      case "Porcelain":
        return styles.badgePorcelain;
      case "Granite":
        return styles.badgeGranite;
      case "Ceramic":
        return styles.badgeCeramic;
      default:
        return styles.badgeDefault;
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Compare Mode View */}
      {!compareMode && selectedForCompare.size > 0 ? (
        <ComparePanel
          brickIds={Array.from(selectedForCompare)}
          bricks={brickTypes}
          chartMode={chartMode}
          onChartModeChange={setChartMode}
          onExit={handleExitCompareMode}
        />
      ) : (
        <>
          {/* Header */}
          <div className={styles.headerRow}>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>Quản lý dòng gạch</h1>
            </div>
            <div className={styles.topActions}>
              {/* View Mode Toggle */}
              <div className={styles.viewModeToggle}>
                <button
                  className={`${styles.viewModeBtn} ${
                    viewMode === "table" ? styles.active : ""
                  }`}
                  onClick={() => setViewMode("table")}
                  title="Xem dạng bảng"
                >
                  <LayoutList size={18} />
                </button>
                <button
                  className={`${styles.viewModeBtn} ${
                    viewMode === "grid" ? styles.active : ""
                  }`}
                  onClick={() => setViewMode("grid")}
                  title="Xem dạng lưới"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>

              {/* Compare Button - Works for both table and grid */}
              <label className={styles.compareToggle}>
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCompareMode(true);
                    } else {
                      handleExitCompareMode();
                    }
                  }}
                />
                <span>Chế độ so sánh</span>
              </label>
              {compareMode && selectedForCompare.size >= 2 && (
                <Button onClick={handleEnterCompareMode}>
                  <GitCompare size={18} style={{ marginRight: "0.5rem" }} />
                  Xem so sánh ({selectedForCompare.size})
                </Button>
              )}

              <Button typeBtn="secondaryButton">
                <Download size={18} style={{ marginRight: "0.5rem" }} />
                Xuất dữ liệu
              </Button>

              {/* Always show create button, with permission check */}
              <Button onClick={handleCreate} disabled={!canCreate}>
                <Plus size={18} style={{ marginRight: "0.5rem" }} />
                Thêm dòng gạch
              </Button>
            </div>
          </div>

          {/* Grid View with BrickTypeList */}
          {viewMode === "grid" ? (
            <div className={styles.gridContainer}>
              <div className={styles.gridMain}>
                <BrickTypeList
                  brickTypes={brickTypes}
                  selectedBrickId={selectedBrickId}
                  compareMode={compareMode}
                  selectedForCompare={selectedForCompare}
                  canUpdate={canUpdate}
                  onSelectBrick={handleSelectBrick}
                  onToggleCompare={handleToggleCompare}
                  onCreateNew={canCreate ? handleCreate : undefined}
                  onEdit={canUpdate ? handleEdit : undefined}
                  onDelete={
                    canDelete
                      ? (id) => {
                          const brick = brickTypes.find((b) => b.id === id);
                          if (brick) handleDeleteClick(brick);
                        }
                      : undefined
                  }
                  onCopy={canUpdate ? handleCopy : undefined}
                  onToggleActive={handleToggleActive}
                  onEnterCompareMode={handleEnterCompareMode}
                  onExitCompareMode={handleExitCompareMode}
                />
              </div>

              {/* Detail Panel */}
              {showDetailPanel && selectedBrickId && (
                <div className={styles.detailPanel}>
                  <div className={styles.detailPanelHeader}>
                    <h3>Chi tiết dòng gạch</h3>
                    <button
                      className={styles.closeDetailBtn}
                      onClick={() => setShowDetailPanel(false)}
                    >
                      ×
                    </button>
                  </div>
                  <BrickTypeStats brickId={selectedBrickId} />
                </div>
              )}
            </div>
          ) : (
            /* Table View - Original Implementation */
            <>
              {/* Filter Panel */}
              <div className={styles.filterPanel}>
                <div className={styles.searchRow}>
                  <div className={styles.searchInputWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm mã sản phẩm, tên..."
                      className={styles.searchInput}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.filtersGrid}>
                  <div className={styles.filterItem}>
                    <label className={styles.filterLabel}>Loại gạch</label>
                    <select
                      className={styles.filterSelect}
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      <option value="Granite">Granite</option>
                      <option value="Porcelain">Porcelain</option>
                      <option value="Ceramic">Ceramic</option>
                      <option value="Semi-Porcelain">Semi-Porcelain</option>
                    </select>
                  </div>

                  <div className={styles.filterItem}>
                    <label className={styles.filterLabel}>
                      Kích thước (mm)
                    </label>
                    <select
                      className={styles.filterSelect}
                      value={sizeFilter}
                      onChange={(e) => setSizeFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      {uniqueSizes.map((size) => (
                        <option key={size} value={size as string}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.filterItem}>
                    <label className={styles.filterLabel}>Độ dày (mm)</label>
                    <select
                      className={styles.filterSelect}
                      value={thicknessFilter}
                      onChange={(e) => setThicknessFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      {uniqueThicknesses.map((t) => (
                        <option key={t} value={t}>
                          {t} mm
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.filterItem}>
                    <label className={styles.filterLabel}>Chất lượng</label>
                    <select
                      className={styles.filterSelect}
                      value={qualityFilter}
                      onChange={(e) => setQualityFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      {uniqueQualities.map((q) => (
                        <option key={q} value={q as string}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className={styles.card}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {compareMode && (
                          <th style={{ width: "50px" }}>
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const idsToSelect = paginatedBricks
                                    .slice(0, 5)
                                    .map((b) => b.id);
                                  setSelectedForCompare(new Set(idsToSelect));
                                } else {
                                  setSelectedForCompare(new Set());
                                }
                              }}
                              title="Chọn tất cả"
                            />
                          </th>
                        )}
                        <th style={{ width: "60px" }}>STT</th>
                        <th>Tên sản phẩm (EN)</th>
                        <th>Kích thước</th>
                        <th>Độ dày</th>
                        <th>Loại gạch</th>
                        <th>Trọng lượng (kg/m²)</th>
                        <th>Viên/Thùng</th>
                        <th style={{ textAlign: "right" }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={compareMode ? 9 : 8}
                            style={{ textAlign: "center", padding: "3rem" }}
                          >
                            Đang tải dữ liệu...
                          </td>
                        </tr>
                      ) : paginatedBricks.length === 0 ? (
                        <tr>
                          <td
                            colSpan={compareMode ? 9 : 8}
                            style={{ textAlign: "center", padding: "3rem" }}
                          >
                            Không tìm thấy dữ liệu phù hợp
                          </td>
                        </tr>
                      ) : (
                        paginatedBricks.map((brick, index) => (
                          <tr
                            key={brick.id}
                            className={
                              selectedForCompare.has(brick.id)
                                ? styles.selectedRow
                                : ""
                            }
                          >
                            {compareMode && (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedForCompare.has(brick.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleCompare(brick.id);
                                  }}
                                  disabled={
                                    !selectedForCompare.has(brick.id) &&
                                    selectedForCompare.size >= 5
                                  }
                                />
                              </td>
                            )}
                            <td className={styles.colIndex}>
                              {String(
                                (currentPage - 1) * pageSize + index + 1
                              ).padStart(2, "0")}
                            </td>
                            <td>
                              <div className={styles.productName}>
                                {brick.name}
                              </div>
                              {brick.nameEnglish && (
                                <div className={styles.productCode}>
                                  {brick.nameEnglish}
                                </div>
                              )}
                            </td>
                            <td className={styles.specText}>
                              {brick.tileSize}
                            </td>
                            <td className={styles.specText}>
                              {brick.thickness ? `${brick.thickness} mm` : "-"}
                            </td>
                            <td>
                              {brick.brickType && (
                                <span
                                  className={`${styles.badge} ${getBadgeClass(
                                    brick.brickType
                                  )}`}
                                >
                                  {brick.brickType}
                                </span>
                              )}
                            </td>
                            <td className={styles.specText}>
                              {brick.weightPerM2 || "-"}
                            </td>
                            <td className={styles.specText}>
                              {brick.piecesPerBox || "-"}
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button
                                  className={`${styles.iconButton} ${styles.view}`}
                                  onClick={() => handleEdit(brick)}
                                  title="Xem chi tiết"
                                >
                                  <Eye size={18} />
                                </button>
                                {canUpdate && (
                                  <button
                                    className={`${styles.iconButton} ${styles.edit}`}
                                    onClick={() => handleEdit(brick)}
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className={`${styles.iconButton} ${styles.delete}`}
                                    onClick={() => handleDeleteClick(brick)}
                                    title="Xóa"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className={styles.pagination}>
                  <div className={styles.paginationInfo}>
                    Hiển thị {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, filteredBricks.length)}{" "}
                    của {filteredBricks.length} tiêu chuẩn
                  </div>
                  <div className={styles.paginationControls}>
                    <button
                      className={styles.pageButton}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          className={`${styles.pageButton} ${
                            currentPage === page ? styles.active : ""
                          }`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      className={styles.pageButton}
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Modals */}
          <Dialog
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingBrick ? "Cập nhật dòng gạch" : "Thêm dòng gạch mới"}
          >
            <BrickTypeForm
              brick={editingBrick}
              onSubmit={handleSubmitForm}
              onCancel={() => setIsModalOpen(false)}
              loading={createMutation.loading || updateMutation.loading}
            />
          </Dialog>

          <Dialog
            open={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title="Xác nhận xóa"
          >
            <div style={{ padding: "1rem 0" }}>
              <p>
                Bạn có chắc chắn muốn xóa dòng gạch{" "}
                <strong>{brickToDelete?.name}</strong> không?
              </p>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                Hành động này không thể hoàn tác.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "1.5rem",
                }}
              >
                <Button
                  typeBtn="secondaryButton"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  loading={deleteMutation.loading}
                  style={{ backgroundColor: "#ef4444", borderColor: "#ef4444" }}
                >
                  Xóa
                </Button>
              </div>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}
