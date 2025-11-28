'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Pencil, Plus } from 'lucide-react';
import styles from './page.module.css';
import { apiFetch } from '@/lib/http/http';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/auth/rbarc';
import { PERMISSIONS } from '@/lib/auth/permission.constant';

type LogStatus = 'producing' | 'paused' | 'inactive';
type ChartMode = 'day' | 'month';

interface BrickType {
  id: number;
  name: string;
  description?: string;
  unit?: string;
  specs?: any;
  isActive?: boolean;
  activeProductionLineId?: number;
  lastActiveAt?: string;
  activeStatus?: LogStatus;
  workshop?: string;
  productionLine?: string;
  tileSize?: string;
  contractCycle?: number;
  kilnOutput?: number;
  qualityProductOutput?: number;
  deductionDays?: number;
  contractProduction?: number;
  additionalContractWhenReducingCycle?: number;
  reducedContractWhenIncreasingCycle?: number;
}

interface BrickFormState {
  name: string;
  description: string;
  unit: string;
  specs: string;
  workshop: string;
  productionLine: string;
  tileSize: string;
  contractCycle: string;
  kilnOutput: string;
  qualityProductOutput: string;
  deductionDays: string;
  contractProduction: string;
  additionalContractWhenReducingCycle: string;
  reducedContractWhenIncreasingCycle: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

function buildInitialFormState(): BrickFormState {
  return {
    name: '',
    description: '',
    unit: 'm²',
    specs: '',
    workshop: '',
    productionLine: '',
    tileSize: '',
    contractCycle: '',
    kilnOutput: '',
    qualityProductOutput: '',
    deductionDays: '',
    contractProduction: '',
    additionalContractWhenReducingCycle: '',
    reducedContractWhenIncreasingCycle: '',
  };
}

function buildFormStateFromBrick(brick: BrickType): BrickFormState {
  return {
    name: brick.name,
    description: brick.description || '',
    unit: brick.unit || 'm²',
    specs: brick.specs ? JSON.stringify(brick.specs, null, 2) : '',
    workshop: brick.workshop || '',
    productionLine: brick.productionLine || '',
    tileSize: brick.tileSize || '',
    contractCycle: brick.contractCycle?.toString() || '',
    kilnOutput: brick.kilnOutput?.toString() || '',
    qualityProductOutput: brick.qualityProductOutput?.toString() || '',
    deductionDays: brick.deductionDays?.toString() || '',
    contractProduction: brick.contractProduction?.toString() || '',
    additionalContractWhenReducingCycle:
      brick.additionalContractWhenReducingCycle?.toString() || '',
    reducedContractWhenIncreasingCycle:
      brick.reducedContractWhenIncreasingCycle?.toString() || '',
  };
}

function formatNumber(num?: number) {
  if (num === undefined || num === null) return '-';
  return new Intl.NumberFormat('vi-VN').format(num);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('vi-VN');
}

function getMockMonthlySeries(brickId: number) {
  const base = 40 + (brickId % 5) * 8;
  const labels = [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ];

  const months = labels.map((label, index) => ({
    label,
    value: base + ((index * 7 + brickId * 3) % 30),
  }));

  const max = Math.max(...months.map((m) => m.value)) || 1;
  return { months, max };
}

function getMockDailySeries(brickId: number) {
  const base = 10 + (brickId % 4) * 5;
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const days = labels.map((label, index) => ({
    label,
    value: base + ((index * 3 + brickId * 5) % 18),
  }));

  const max = Math.max(...days.map((d) => d.value)) || 1;
  return { days, max };
}

export default function BrickTypesPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBrickId, setSelectedBrickId] = useState<number | null>(null);
  const [lineFilter, setLineFilter] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingBrick, setEditingBrick] = useState<BrickType | null>(null);
  const [formData, setFormData] = useState<BrickFormState>(buildInitialFormState);
  const [saving, setSaving] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('day');

  const user = useAuthStore((s) => s.user);
  const canUpdate = hasPermission(user, PERMISSIONS.PRODUCTION_LINE_UPDATE);

  useEffect(() => {
    fetchBrickTypes();
  }, []);

  async function fetchBrickTypes() {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`${API_URL}/brick-types`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không tải được danh sách dạng gạch');
      }
      const data = await res.json();
      setBrickTypes(data);
    } catch (err: any) {
      console.error('Error fetching brick types:', err);
      setError(err.message || 'Lỗi khi tải dữ liệu dạng gạch');
    } finally {
      setLoading(false);
    }
  }

  const productionLineOptions = useMemo(() => {
    const lines = new Set<string>();
    brickTypes.forEach((b) => {
      if (b.productionLine) lines.add(b.productionLine);
    });
    return Array.from(lines);
  }, [brickTypes]);

  const filteredBrickTypes = useMemo(() => {
    if (lineFilter === 'all') return brickTypes;
    return brickTypes.filter((b) => b.productionLine === lineFilter);
  }, [brickTypes, lineFilter]);

  useEffect(() => {
    if (filteredBrickTypes.length === 0) {
      setSelectedBrickId(null);
      return;
    }
    if (
      selectedBrickId === null ||
      !filteredBrickTypes.some((b) => b.id === selectedBrickId)
    ) {
      setSelectedBrickId(filteredBrickTypes[0].id);
    }
  }, [filteredBrickTypes, selectedBrickId]);

  const selectedBrick =
    filteredBrickTypes.find((b) => b.id === selectedBrickId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        unit: formData.unit || undefined,
        specs: formData.specs ? JSON.parse(formData.specs) : undefined,
        workshop: formData.workshop || undefined,
        productionLine: formData.productionLine || undefined,
        tileSize: formData.tileSize || undefined,
      };

      if (formData.contractCycle) {
        payload.contractCycle = Number(formData.contractCycle);
      }
      if (formData.kilnOutput) {
        payload.kilnOutput = Number(formData.kilnOutput);
      }
      if (formData.qualityProductOutput) {
        payload.qualityProductOutput = Number(formData.qualityProductOutput);
      }
      if (formData.deductionDays) {
        payload.deductionDays = Number(formData.deductionDays);
      }
      if (formData.contractProduction) {
        payload.contractProduction = Number(formData.contractProduction);
      }
      if (formData.additionalContractWhenReducingCycle) {
        payload.additionalContractWhenReducingCycle = Number(
          formData.additionalContractWhenReducingCycle,
        );
      }
      if (formData.reducedContractWhenIncreasingCycle) {
        payload.reducedContractWhenIncreasingCycle = Number(
          formData.reducedContractWhenIncreasingCycle,
        );
      }

      const url = editingBrick
        ? `${API_URL}/brick-types/${editingBrick.id}`
        : `${API_URL}/brick-types`;
      const method = editingBrick ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi khi lưu thông tin dạng gạch');
      }

      await fetchBrickTypes();
      handleCloseModal();
    } catch (err: any) {
      console.error('Error saving brick type:', err);
      setError(err.message || 'Lỗi khi lưu thông tin dạng gạch');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn chắc chắn muốn xoá dạng gạch này?')) return;

    try {
      setError(null);
      const res = await apiFetch(`${API_URL}/brick-types/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi khi xoá dạng gạch');
      }

      await fetchBrickTypes();
    } catch (err: any) {
      console.error('Error deleting brick type:', err);
      setError(err.message || 'Lỗi khi xoá dạng gạch');
    }
  }

  function openCreateModal() {
    setEditingBrick(null);
    setFormData(buildInitialFormState());
    setShowModal(true);
  }

  function openEditModal(brick: BrickType) {
    setEditingBrick(brick);
    setFormData(buildFormStateFromBrick(brick));
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingBrick(null);
    setFormData(buildInitialFormState());
  }

  const totalActive = brickTypes.filter((b) => b.isActive).length;

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner} />
            <p>Đang tải dữ liệu dạng gạch...</p>
          </div>
        ) : (
          <div className={styles.layout}>
            <section className={styles.listPanel}>
              <header className={styles.listHeader}>
                <div>
                  <h2 className={styles.listTitle}>Dạng gạch</h2>
                  <p className={styles.listSubtitle}>
                    Danh sách dạng gạch và trạng thái hoạt động
                  </p>
                </div>
                {canUpdate && (
                  <button
                    type="button"
                    className={styles.createButton}
                    onClick={openCreateModal}
                  >
                    <Plus size={16} />
                    <span>Thêm mới</span>
                  </button>
                )}
              </header>

              <div className={styles.listFilterRow}>
                <label className={styles.filterLabel} htmlFor="lineFilter">
                  Dây chuyền
                </label>
                <select
                  id="lineFilter"
                  className={styles.lineSelect}
                  value={lineFilter}
                  onChange={(e) => setLineFilter(e.target.value)}
                >
                  <option value="all">Tất cả dây chuyền</option>
                  {productionLineOptions.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </div>

              <ul className={styles.brickList}>
                {filteredBrickTypes.map((brick) => {
                  const isActive = brick.isActive !== false;
                  const isSelected = brick.id === selectedBrickId;

                  return (
                    <li key={brick.id}>
                      <button
                        type="button"
                        className={`${styles.brickListItem} ${
                          isSelected ? styles.brickListItemActive : ''
                        }`}
                        onClick={() => setSelectedBrickId(brick.id)}
                      >
                        <div className={styles.brickListMain}>
                          <span className={styles.brickListName}>{brick.name}</span>
                          {brick.productionLine && (
                            <span className={styles.brickListLine}>
                              {brick.productionLine}
                            </span>
                          )}
                        </div>
                        <div className={styles.brickListStatus}>
                          <span
                            className={`${styles.statusDot} ${
                              isActive
                                ? styles.statusDotActive
                                : styles.statusDotInactive
                            }`}
                          />
                          <span className={styles.statusText}>
                            {isActive ? 'Đang dùng' : 'Ngưng dùng'}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filteredBrickTypes.length === 0 && (
                  <li className={styles.emptyListState}>
                    Không có dạng gạch nào trong bộ lọc hiện tại.
                  </li>
                )}
              </ul>
            </section>

            <section className={styles.detailPanel}>
              {selectedBrick ? (
                <>
                  <header className={styles.detailHeader}>
                    <div>
                      <h1 className={styles.detailTitle}>{selectedBrick.name}</h1>
                      <p className={styles.detailSubtitle}>
                        Thông tin chi tiết cho dạng gạch ID #{selectedBrick.id}
                      </p>
                    </div>
                    <div className={styles.detailActions}>
                      {canUpdate && (
                        <>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => openEditModal(selectedBrick)}
                          >
                            <Pencil size={14} />
                            <span>Chỉnh sửa</span>
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => handleDelete(selectedBrick.id)}
                          >
                            <Trash2 size={14} />
                            <span>Xoá</span>
                          </button>
                        </>
                      )}
                    </div>
                  </header>

                  <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                      <h3>Chi tiết</h3>
                      <div className={styles.summaryGrid}>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Mã dạng gạch</span>
                          <span className={styles.summaryValue}>
                            {selectedBrick.id}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Kích thước</span>
                          <span className={styles.summaryValue}>
                            {selectedBrick.tileSize || '-'}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Đơn vị</span>
                          <span className={styles.summaryValue}>
                            {selectedBrick.unit || 'm²'}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Phân xưởng</span>
                          <span className={styles.summaryValue}>
                            {selectedBrick.workshop || '-'}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Dây chuyền</span>
                          <span className={styles.summaryValue}>
                            {selectedBrick.productionLine || '-'}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>
                            Chu kỳ khoán (phút)
                          </span>
                          <span className={styles.summaryValue}>
                            {formatNumber(selectedBrick.contractCycle)}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>SL ra lò (m²)</span>
                          <span className={styles.summaryValue}>
                            {formatNumber(selectedBrick.kilnOutput)}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>
                            SL chính phẩm (m²)
                          </span>
                          <span className={styles.summaryValue}>
                            {formatNumber(selectedBrick.qualityProductOutput)}
                          </span>
                        </div>
                      </div>
                      {selectedBrick.description && (
                        <p className={styles.summaryDescription}>
                          {selectedBrick.description}
                        </p>
                      )}
                    </div>

                    <div className={styles.metadataCard}>
                      <h3>Thông tin trạng thái</h3>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Trạng thái</span>
                        <span className={styles.summaryValue}>
                          {selectedBrick.isActive !== false
                            ? 'Đang sử dụng'
                            : 'Ngưng sử dụng'}
                        </span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>
                          Dây chuyền đang chạy
                        </span>
                        <span className={styles.summaryValue}>
                          {selectedBrick.activeProductionLineId
                            ? `ID #${selectedBrick.activeProductionLineId}`
                            : '-'}
                        </span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>
                          Lần hoạt động gần nhất
                        </span>
                        <span className={styles.summaryValue}>
                          {formatDate(selectedBrick.lastActiveAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <section className={styles.chartCard}>
                    <div className={styles.chartHeaderRow}>
                      <h3>
                        {chartMode === 'month'
                          ? 'Sản lượng ước tính 12 tháng gần nhất (mock)'
                          : 'Sản lượng theo ngày trong tuần (mock)'}
                      </h3>
                      <select
                        className={styles.chartModeSelect}
                        value={chartMode}
                        onChange={(e) =>
                          setChartMode(e.target.value as ChartMode)
                        }
                      >
                        <option value="day">Theo ngày</option>
                        <option value="month">Theo tháng</option>
                      </select>
                    </div>
                    <MockProductionChart
                      brickId={selectedBrick.id}
                      mode={chartMode}
                    />
                  </section>
                </>
              ) : (
                <div className={styles.emptyDetail}>
                  <h2>Chọn một dạng gạch ở danh sách bên trái</h2>
                  <p>
                    Bạn sẽ xem được chi tiết và biểu đồ sản lượng của dạng gạch tại
                    đây.
                  </p>
                </div>
              )}

              <footer className={styles.footerInfo}>
                <span>
                  Tổng {brickTypes.length} dạng gạch, trong đó {totalActive} đang được
                  sử dụng.
                </span>
              </footer>
            </section>
          </div>
        )}
      </main>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>{editingBrick ? 'Cập nhật dạng gạch' : 'Thêm dạng gạch'}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleCloseModal}
              >
                ×
              </button>
            </header>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">
                    Tên dạng gạch <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="tileSize">Kích thước sản phẩm</label>
                  <input
                    id="tileSize"
                    type="text"
                    className={styles.input}
                    value={formData.tileSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tileSize: e.target.value,
                      })
                    }
                    placeholder="VD: 600x600mm"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="workshop">Phân xưởng</label>
                  <input
                    id="workshop"
                    type="text"
                    className={styles.input}
                    value={formData.workshop}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workshop: e.target.value,
                      })
                    }
                    placeholder="VD: Phân xưởng 1"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="productionLine">Dây chuyền</label>
                  <input
                    id="productionLine"
                    type="text"
                    className={styles.input}
                    value={formData.productionLine}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        productionLine: e.target.value,
                      })
                    }
                    placeholder="VD: Dây chuyền 1"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Mô tả</label>
                <textarea
                  id="description"
                  className={styles.textarea}
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="contractCycle">Chu kỳ khoán (phút)</label>
                  <input
                    id="contractCycle"
                    type="number"
                    className={styles.input}
                    value={formData.contractCycle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contractCycle: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="kilnOutput">Sản lượng ra lò (m²)</label>
                  <input
                    id="kilnOutput"
                    type="number"
                    className={styles.input}
                    value={formData.kilnOutput}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kilnOutput: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="qualityProductOutput">
                    Sản lượng chính phẩm (m²)
                  </label>
                  <input
                    id="qualityProductOutput"
                    type="number"
                    className={styles.input}
                    value={formData.qualityProductOutput}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        qualityProductOutput: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="contractProduction">
                    Sản lượng khoán (m²/tháng)
                  </label>
                  <input
                    id="contractProduction"
                    type="number"
                    className={styles.input}
                    value={formData.contractProduction}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contractProduction: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="specs">
                  Thông số kỹ thuật (JSON){' '}
                  <span className={styles.labelHint}>tuỳ chọn</span>
                </label>
                <textarea
                  id="specs"
                  className={styles.textarea}
                  rows={3}
                  placeholder='{"size": "60x60", "thickness": "10mm"}'
                  value={formData.specs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specs: e.target.value,
                    })
                  }
                />
              </div>

              {error && <div className={styles.formError}>⚠ {error}</div>}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={saving}
                >
                  {saving
                    ? 'Đang lưu...'
                    : editingBrick
                    ? 'Cập nhật'
                    : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface MockChartProps {
  brickId: number;
  mode: ChartMode;
}

function MockProductionChart({ brickId, mode }: MockChartProps) {
  if (mode === 'month') {
    const { months, max } = getMockMonthlySeries(brickId);

    return (
      <div className={styles.chartWrapper}>
        <div className={styles.chartBars}>
          {months.map((m, index) => {
            const heightPercent = (m.value / max) * 100;
            const isPrimary = index === 3 || index === 4 || index === 5;
            return (
              <div key={m.label} className={styles.chartBarItem}>
                <div className={styles.chartBarTrack}>
                  <div
                    className={`${styles.chartBarFill} ${
                      isPrimary
                        ? styles.chartBarFillPrimary
                        : styles.chartBarFillMuted
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className={styles.chartBarLabel}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const { days, max } = getMockDailySeries(brickId);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartBars}>
        {days.map((d, index) => {
          const heightPercent = (d.value / max) * 100;
          const isPrimary = index === 2 || index === 3 || index === 4;
          return (
            <div key={d.label} className={styles.chartBarItem}>
              <div className={styles.chartBarTrack}>
                <div
                  className={`${styles.chartBarFill} ${
                    isPrimary
                      ? styles.chartBarFillPrimary
                      : styles.chartBarFillMuted
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <span className={styles.chartBarLabel}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
