"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/auth/rbarc";
import { PERMISSIONS } from "@/lib/auth/permission.constant";
import {
  useBrickTypes,
  useCreateBrickType,
  useUpdateBrickType,
  useDeleteBrickType,
} from "@/hooks/useBrickTypes";
import type { BrickType, CreateBrickTypeDto } from "@/lib/types/brick-type";
import { BrickTypeList } from "@/components/BrickTypes/BrickTypeList";
import { BrickTypeDetail } from "@/components/BrickTypes/BrickTypeDetail";
import { BrickTypeFormWizard } from "@/components/BrickTypes/BrickTypeFormWizard";
import { ComparePanel } from "@/components/BrickTypes/ComparePanel";
import { StandardsPanel } from "@/components/BrickTypes/StandardsPanel";
import styles from "./page.module.css";

type ChartMode = "day" | "month";
type ViewMode = "detail" | "compare" | "standards";

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

  const { data: brickTypes = [], loading, error, refetch } = useBrickTypes();
  const createMutation = useCreateBrickType();
  const updateMutation = useUpdateBrickType();
  const deleteMutation = useDeleteBrickType();

  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [selectedBrickId, setSelectedBrickId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>("month");
  const [showModal, setShowModal] = useState(false);
  const [editingBrick, setEditingBrick] = useState<BrickType | undefined>(
    undefined
  );
  const [productionLineFilter, setProductionLineFilter] = useState<string>("");

  const filteredBricks = productionLineFilter
    ? (brickTypes || []).filter(
        (b) => b.productionLine === productionLineFilter
      )
    : brickTypes || [];

  const selectedBrick = selectedBrickId
    ? (brickTypes || []).find((b) => b.id === selectedBrickId)
    : undefined;

  const handleSelectBrick = (id: number) => {
    if (compareMode) {
      if (selectedForCompare.includes(id)) {
        setSelectedForCompare(selectedForCompare.filter((cid) => cid !== id));
      } else {
        if (selectedForCompare.length < 5) {
          setSelectedForCompare([...selectedForCompare, id]);
        }
      }
    } else {
      setSelectedBrickId(id);
      setViewMode("detail");
    }
  };

  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
    if (!compareMode && selectedBrickId) {
      setSelectedForCompare([selectedBrickId]);
    }
  };

  const handleExitCompare = () => {
    setCompareMode(false);
    setViewMode("detail");
    if (selectedForCompare.length > 0) {
      setSelectedBrickId(selectedForCompare[0]);
    }
    setSelectedForCompare([]);
  };

  const handleViewCompare = () => {
    if (selectedForCompare.length >= 2) {
      setViewMode("compare");
    }
  };

  const handleViewStandards = () => {
    if (selectedBrickId) {
      setViewMode("standards");
    }
  };

  const handleExitStandards = () => {
    setViewMode("detail");
  };

  const handleCreate = () => {
    setEditingBrick(undefined);
    setShowModal(true);
  };

  const handleEdit = (brick: BrickType) => {
    setEditingBrick(brick);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xoá dạng gạch này?")) {
      return;
    }
    await deleteMutation.mutate(id);
    if (selectedBrickId === id) {
      setSelectedBrickId(null);
    }
  };

  const handleCopy = async (brick: BrickType) => {
    const newName = prompt("Nhập tên cho bản sao:", `${brick.name} (Copy)`);
    if (!newName || !newName.trim()) return;

    const copyData: CreateBrickTypeDto = {
      name: newName.trim(),
      nameEnglish: brick.nameEnglish
        ? `${brick.nameEnglish} (Copy)`
        : undefined,
      tileSize: brick.tileSize,
      thickness: brick.thickness,
      brickType: brick.brickType,
      unit: brick.unit,
      description: brick.description,
      workshop: brick.workshop,
      productionLine: brick.productionLine,
      contractCycle: brick.contractCycle,
      kilnOutput: brick.kilnOutput,
      qualityProductOutput: brick.qualityProductOutput,
      deductionDays: brick.deductionDays,
      contractProduction: brick.contractProduction,
      additionalContractWhenReducingCycle:
        brick.additionalContractWhenReducingCycle,
      reducedContractWhenIncreasingCycle:
        brick.reducedContractWhenIncreasingCycle,
      weightPerM2: brick.weightPerM2,
      piecesPerBox: brick.piecesPerBox,
      m2PerBox: brick.m2PerBox,
      weightPerBox: brick.weightPerBox,
      boxesPerPallet: brick.boxesPerPallet,
      qualityStandard: brick.qualityStandard,
      productLineName: brick.productLineName,
      notes: brick.notes,
      isActive: false, // Đặt inactive cho bản sao
    };

    await createMutation.mutate(copyData);
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    const confirmMsg = isActive
      ? "Bạn có muốn kích hoạt dạng gạch này?"
      : "Bạn có muốn ngừng sản xuất dạng gạch này?";
    if (!confirm(confirmMsg)) return;

    await updateMutation.mutate(id, { isActive });
  };

  const handleSubmitForm = async (data: CreateBrickTypeDto) => {
    if (editingBrick) {
      await updateMutation.mutate(editingBrick.id, data);
    } else {
      await createMutation.mutate(data);
    }
    setShowModal(false);
    setEditingBrick(undefined);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBrick(undefined);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          Lỗi: {error?.message || "Có lỗi xảy ra"}
          <button onClick={() => refetch()} className={styles.retryButton}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <BrickTypeList
            brickTypes={filteredBricks || []}
            selectedBrickId={selectedBrickId}
            compareMode={compareMode}
            selectedForCompare={new Set(selectedForCompare)}
            canUpdate={canUpdate}
            onSelectBrick={handleSelectBrick}
            onToggleCompare={(id) => {
              if (selectedForCompare.includes(id)) {
                setSelectedForCompare(
                  selectedForCompare.filter((cid) => cid !== id)
                );
              } else {
                if (selectedForCompare.length < 5) {
                  setSelectedForCompare([...selectedForCompare, id]);
                }
              }
            }}
            onCreateNew={canCreate ? handleCreate : undefined}
            onEdit={canUpdate ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            onCopy={canUpdate ? handleCopy : undefined}
            onToggleActive={canUpdate ? handleToggleActive : undefined}
            onEnterCompareMode={handleViewCompare}
            onExitCompareMode={handleExitCompare}
          />
        </aside>

        <main className={styles.mainContent}>
          {viewMode === "compare" && selectedForCompare.length >= 2 ? (
            <ComparePanel
              brickIds={selectedForCompare}
              bricks={brickTypes || []}
              chartMode={chartMode}
              onChartModeChange={setChartMode}
              onExit={handleExitCompare}
            />
          ) : viewMode === "standards" && selectedBrick ? (
            <StandardsPanel
              brick={selectedBrick}
              onExit={handleExitStandards}
            />
          ) : selectedBrick ? (
            <BrickTypeDetail
              brick={selectedBrick}
              canUpdate={canUpdate}
              onEdit={canUpdate ? handleEdit : undefined}
              onDelete={canDelete ? handleDelete : undefined}
              onViewStandards={handleViewStandards}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>Chọn một dạng gạch để xem chi tiết</p>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <BrickTypeFormWizard
          brick={editingBrick}
          onSubmit={handleSubmitForm}
          onCancel={handleCloseModal}
          loading={createMutation.loading || updateMutation.loading}
        />
      )}
    </div>
  );
}
