'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Pencil, Plus, ArrowLeft } from 'lucide-react';
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

// Fake sản lượng từ đầu năm tới giờ (tính theo tháng đã trôi qua trong năm)
function getYearToDateProduction(brickId: number): number {
  const currentMonth = new Date().getMonth(); // 0-11
  const baseMonthly = 8000 + (brickId % 7) * 1500; // Sản lượng trung bình mỗi tháng
  const variance = (brickId * 317) % 1000; // Biến động ngẫu nhiên
  return Math.floor(baseMonthly * (currentMonth + 1) + variance);
}

function getMockMonthlySeries(brickId: number) {
  const base = 40 + (brickId % 5) * 8;
  const labels = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
  const currentMonth = new Date().getMonth();
  const months = labels.map((label, index) => ({
    label,
    value: index <= currentMonth ? base + ((index * 7 + brickId * 3) % 30) : 0,
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

  // Tính năng so sánh nhiều
  const [selectedForCompare, setSelectedForCompare] = useState<Set<number>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

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
    // Auto-select first brick on initial load
    if (selectedBrickId === null) {
      setSelectedBrickId(filteredBrickTypes[0].id);
    }
    // If selected brick is filtered out, select first available
    else if (!filteredBrickTypes.some((b) => b.id === selectedBrickId)) {
      setSelectedBrickId(filteredBrickTypes[0].id);
    }
  }, [filteredBrickTypes, selectedBrickId]);

  const selectedBrick = filteredBrickTypes.find((b) => b.id === selectedBrickId) ?? null;

  // Hàm toggle chọn so sánh
  const toggleCompare = (id: number) => {
    const newSet = new Set(selectedForCompare);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedForCompare(newSet);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare(new Set());
  };

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

      ['contractCycle', 'kilnOutput', 'qualityProductOutput', 'deductionDays', 'contractProduction', 'additionalContractWhenReducingCycle', 'reducedContractWhenIncreasingCycle'].forEach(key => {
        if (formData[key as keyof BrickFormState]) {
          payload[key] = Number(formData[key as keyof BrickFormState]);
        }
      });

      const url = editingBrick ? `${API_URL}/brick-types/${editingBrick.id}` : `${API_URL}/brick-types`;
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
      setError(err.message || 'Lỗi khi lưu thông tin dạng gạch');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn chắc chắn muốn xoá dạng gạch này?')) return;
    try {
      const res = await apiFetch(`${API_URL}/brick-types/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Lỗi khi xoá');
      await fetchBrickTypes();
      if (selectedBrickId === id) setSelectedBrickId(null);
    } catch (err: any) {
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
    setError(null);
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
            {/* === DANH SÁCH BÊN TRÁI === */}
            <section className={styles.listPanel}>
              <header className={styles.listHeader}>
                <div>
                  <h2 className={styles.listTitle}>Dạng gạch</h2>
                  <p className={styles.listSubtitle}>
                    Danh sách dạng gạch và trạng thái hoạt động
                  </p>
                </div>
                {canUpdate && (
                  <button type="button" className={styles.createButton} onClick={openCreateModal}>
                    <Plus size={16} />
                    <span>Thêm mới</span>
                  </button>
                )}
              </header>

              {/* Thanh thông báo + nút So sánh */}
              {selectedForCompare.size >= 2 && (
                <div className={styles.compareHeaderBar}>
                  <span>Đã chọn {selectedForCompare.size} dạng gạch</span>
                  <div>
                    {compareMode ? (
                      <button type="button" className={styles.secondaryButton} onClick={exitCompareMode}>
                        ← Quay lại chi tiết
                      </button>
                    ) : (
                      <button type="button" className={styles.createButton} onClick={() => setCompareMode(true)}>
                        So sánh đã chọn
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                    <option key={line} value={line}>{line}</option>
                  ))}
                </select>
              </div>

              <ul className={styles.brickList}>
                {filteredBrickTypes.map((brick) => {
                  const isActive = brick.isActive !== false;
                  const isSelected = brick.id === selectedBrickId && !compareMode;

                  return (
                    <li key={brick.id} className={styles.brickListItemRow}>
                      {/* Checkbox nằm ngoài, không đè */}
                      <label className={styles.compareCheckboxOuter}>
                        <input
                          type="checkbox"
                          checked={selectedForCompare.has(brick.id)}
                          onChange={() => toggleCompare(brick.id)}
                        />
                        <span className={styles.checkmark} />
                      </label>

                      {/* Nội dung item gạch – padding trái để tránh đè checkbox */}
                      <button
                        type="button"
                        className={`${styles.brickListItem} ${isSelected ? styles.brickListItemActive : ''}`}
                        onClick={() => !compareMode && setSelectedBrickId(brick.id)}
                      >
                        <div className={styles.brickListMain}>
                          <span className={styles.brickListName}>{brick.name}</span>
                          {brick.productionLine && (
                            <span className={styles.brickListLine}>{brick.productionLine}</span>
                          )}
                        </div>
                        <div className={styles.brickListStatus}>
                          <span className={`${styles.statusDot} ${isActive ? styles.statusDotActive : styles.statusDotInactive}`} />
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

            {/* === PANEL CHI TIẾT / SO SÁNH BÊN PHẢI === */}
            <section className={styles.detailPanel}>
              {compareMode ? (
                <ComparePanel 
                  brickIds={Array.from(selectedForCompare)} 
                  brickTypes={brickTypes} 
                  chartMode={chartMode} 
                  setChartMode={setChartMode}
                  onExit={() => setCompareMode(false)} 
                />
              ) : selectedBrick ? (
                // Chi tiết 1 dạng gạch (giữ nguyên như cũ)
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
                          <button type="button" className={styles.secondaryButton} onClick={() => openEditModal(selectedBrick)}>
                            <Pencil size={14} />
                            <span>Chỉnh sửa</span>
                          </button>
                          <button type="button" className={styles.dangerButton} onClick={() => handleDelete(selectedBrick.id)}>
                            <Trash2 size={14} />
                            <span>Xoá</span>
                          </button>
                        </>
                      )}
                    </div>
                  </header>

                  {/* Nội dung chi tiết giữ nguyên */}
                  <div className={styles.summaryRow}>
                    <div className={styles.summaryCard}>
                      <h3>Chi tiết</h3>
                      <div className={styles.summaryGrid}>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>Mã dạng gạch</span><span className={styles.summaryValue}>{selectedBrick.id}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>Kích thước</span><span className={styles.summaryValue}>{selectedBrick.tileSize || '-'}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>Đơn vị</span><span className={styles.summaryValue}>{selectedBrick.unit || 'm²'}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>Phân xưởng</span><span className={styles.summaryValue}>{selectedBrick.workshop || '-'}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>Dây chuyền</span><span className={styles.summaryValue}>{selectedBrick.productionLine || '-'}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>Chu kỳ khoán (phút)</span><span className={styles.summaryValue}>{formatNumber(selectedBrick.contractCycle)}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>SL ra lò (m²)</span><span className={styles.summaryValue}>{formatNumber(selectedBrick.kilnOutput)}</span></div>
                        <div className={styles.summaryItem}><span className={styles.summaryLabel}>SL chính phẩm (m²)</span><span className={styles.summaryValue}>{formatNumber(selectedBrick.qualityProductOutput)}</span></div>
                      </div>
                      {selectedBrick.description && <p className={styles.summaryDescription}>{selectedBrick.description}</p>}
                    </div>

                    <div className={styles.metadataCard}>
                      <h3>Thông tin trạng thái</h3>
                      <div className={styles.summaryItem}><span className={styles.summaryLabel}>Trạng thái</span><span className={styles.summaryValue}>{selectedBrick.isActive !== false ? 'Đang sử dụng' : 'Ngưng sử dụng'}</span></div>
                      <div className={styles.summaryItem}><span className={styles.summaryLabel}>Dây chuyền đang chạy</span><span className={styles.summaryValue}>{selectedBrick.activeProductionLineId ? `ID #${selectedBrick.activeProductionLineId}` : '-'}</span></div>
                      <div className={styles.summaryItem}><span className={styles.summaryLabel}>Lần hoạt động gần nhất</span><span className={styles.summaryValue}>{formatDate(selectedBrick.lastActiveAt)}</span></div>
                    </div>
                  </div>

                  <section className={styles.chartCard}>
                    <div className={styles.chartHeaderRow}>
                      <h3>{chartMode === 'month' ? 'Sản lượng ước tính 12 tháng gần nhất (mock)' : 'Sản lượng theo ngày trong tuần (mock)'}</h3>
                      <select className={styles.chartModeSelect} value={chartMode} onChange={(e) => setChartMode(e.target.value as ChartMode)}>
                        <option value="day">Theo ngày</option>
                        <option value="month">Theo tháng</option>
                      </select>
                    </div>
                    <MockProductionChart brickId={selectedBrick.id} mode={chartMode} />
                  </section>

                  {/* Line Chart cho single brick */}
                  <section className={styles.chartCard}>
                    <h3>Xu hướng sản lượng theo thời gian</h3>
                    <MockLineChart brickId={selectedBrick.id} mode={chartMode} />
                  </section>
                </>
              ) : (
                <div className={styles.emptyDetail}>
                  <h2>Chọn một dạng gạch ở danh sách bên trái</h2>
                  <p>Bạn sẽ xem được chi tiết và biểu đồ sản lượng của dạng gạch tại đây.</p>
                </div>
              )}

              <footer className={styles.footerInfo}>
                <span>Tổng {brickTypes.length} dạng gạch, trong đó {totalActive} đang được sử dụng.</span>
              </footer>
            </section>
          </div>
        )}
      </main>

      {/* Modal thêm/sửa giữ nguyên */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>{editingBrick ? 'Cập nhật dạng gạch' : 'Thêm dạng gạch'}</h2>
              <button type="button" className={styles.closeBtn} onClick={handleCloseModal}>×</button>
            </header>
            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Form giữ nguyên như cũ */}
              {/* ... (copy nguyên form từ code gốc của bạn) */}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Component So sánh nhiều
function ComparePanel({ brickIds, brickTypes, chartMode, setChartMode, onExit }: { brickIds: number[], brickTypes: BrickType[], chartMode: ChartMode, setChartMode: (m: ChartMode) => void, onExit: () => void }) {
  const bricksToCompare = brickTypes.filter(b => brickIds.includes(b.id));
  const colors = ['#4f46e5', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  return (
    <>
      <header className={styles.detailHeader}>
        <div>
          <h1 className={styles.detailTitle}>So sánh {brickIds.length} dạng gạch</h1>
          <p className={styles.detailSubtitle}>So sánh chỉ số và sản lượng ước tính</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={onExit}>
          <ArrowLeft size={16} /> Quay lại chi tiết
        </button>
      </header>

      {/* Bảng so sánh */}
      <div className={styles.summaryCard}>
        <h3>So sánh chỉ số chính</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>Chỉ số</th>
                {bricksToCompare.map(b => (
                  <th key={b.id}>{b.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Kích thước', key: 'tileSize' },
                { label: 'Dây chuyền', key: 'productionLine' },
                { label: 'Chu kỳ khoán (phút)', key: 'contractCycle', format: formatNumber },
                { label: 'SL ra lò (m²)', key: 'kilnOutput', format: formatNumber },
                { label: 'SL chính phẩm (m²)', key: 'qualityProductOutput', format: formatNumber },
              ].map(row => (
                <tr key={row.label}>
                  <td className={styles.compareTableLabel}>{row.label}</td>
                  {bricksToCompare.map(b => (
                    <td key={b.id}>
                      {row.format ? row.format((b as any)[row.key as keyof BrickType]) : (b as any)[row.key as keyof BrickType] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className={styles.compareTableLabel}>Tỷ lệ chính phẩm</td>
                {bricksToCompare.map(b => {
                  const ratio = b.kilnOutput && b.qualityProductOutput ? (b.qualityProductOutput / b.kilnOutput * 100).toFixed(1) : '-';
                  return <td key={b.id} className={ratio !== '-' && Number(ratio) >= 95 ? styles.ratioGood : styles.ratioBad}>{ratio}%</td>;
                })}
              </tr>
              <tr className={styles.productionYTDRow}>
                <td className={styles.compareTableLabel}>Sản lượng từ đầu năm</td>
                {bricksToCompare.map(b => {
                  const ytd = getYearToDateProduction(b.id);
                  return <td key={b.id} className={styles.productionYTD}>{formatNumber(ytd)} m²</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Biểu đồ so sánh */}
      <section className={styles.chartCard}>
        <div className={styles.chartHeaderRow}>
          <h3>Sản lượng ước tính (mock)</h3>
          <select className={styles.chartModeSelect} value={chartMode} onChange={e => setChartMode(e.target.value as ChartMode)}>
            <option value="day">Theo ngày</option>
            <option value="month">Theo tháng</option>
          </select>
        </div>
        <div className={styles.chartWrapper}>
          {(() => {
            const maxValue = Math.max(
              ...bricksToCompare.flatMap(brick => {
                const seriesData = chartMode === 'month' ? getMockMonthlySeries(brick.id) : getMockDailySeries(brick.id);
                const dataArray = chartMode === 'month' ? (seriesData as ReturnType<typeof getMockMonthlySeries>).months : (seriesData as ReturnType<typeof getMockDailySeries>).days;
                return dataArray.map(d => d.value);
              })
            );
            const yAxisSteps = 5;
            const stepValue = Math.ceil(maxValue / yAxisSteps / 1000) * 1000;
            
            return (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {/* Y-axis */}
                <div className={styles.chartYAxis}>
                  {Array.from({ length: yAxisSteps + 1 }, (_, i) => yAxisSteps - i).map(step => (
                    <div key={step} className={styles.yAxisLabel}>
                      {formatNumber(step * stepValue)}
                    </div>
                  ))}
                </div>

                {/* Chart bars */}
                <div className={styles.chartBarsContainer}>
                  <div className={styles.chartBars}>
                    {(chartMode === 'month' ? Array.from({ length: 12 }, (_, i) => i) : Array.from({ length: 7 }, (_, i) => i)).map(idx => (
                      <div key={idx} className={styles.chartBarItem}>
                        <div className={styles.chartBarTrack}>
                          <div style={{ display: 'flex', gap: '3px', height: '100%', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                            {bricksToCompare.map((brick, i) => {
                              const seriesData = chartMode === 'month' ? getMockMonthlySeries(brick.id) : getMockDailySeries(brick.id);
                              const dataArray = chartMode === 'month' ? (seriesData as ReturnType<typeof getMockMonthlySeries>).months : (seriesData as ReturnType<typeof getMockDailySeries>).days;
                              const value = dataArray[idx]?.value || 0;
                              const height = maxValue ? (value / maxValue) * 100 : 0;
                              return (
                                <div
                                  key={brick.id}
                                  title={`${brick.name}: ${value.toLocaleString()} m²`}
                                  style={{
                                    flex: 1,
                                    maxWidth: '20px',
                                    background: colors[i % colors.length],
                                    borderRadius: '4px 4px 0 0',
                                    height: `${height}%`,
                                    minHeight: '4px',
                                    transition: 'all 0.3s ease',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <span className={styles.chartBarLabel}>
                          {chartMode === 'month' ? `Th${idx + 1}` : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][idx]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className={styles.chartLegend}>
            {bricksToCompare.map((b, i) => (
              <div key={b.id} className={styles.chartLegendItem}>
                <div className={styles.chartLegendColor} style={{ background: colors[i % colors.length] }} />
                <span>{b.name}</span>
                <span className={styles.chartLegendValue}>({formatNumber(getYearToDateProduction(b.id))} m²)</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Line Charts - Xu hướng từng dạng gạch */}
      <div className={styles.lineChartsGrid}>
        {bricksToCompare.map((brick, brickIndex) => {
          const seriesData = chartMode === 'month' ? getMockMonthlySeries(brick.id) : getMockDailySeries(brick.id);
          const dataArray = chartMode === 'month' ? (seriesData as ReturnType<typeof getMockMonthlySeries>).months : (seriesData as ReturnType<typeof getMockDailySeries>).days;
          const maxValue = seriesData.max;
          const dataLength = dataArray.length;
          
          const yAxisSteps = 4;
          const stepValue = Math.ceil(maxValue / yAxisSteps / 1000) * 1000;
          
          return (
            <section key={brick.id} className={styles.chartCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div className={styles.chartLegendColor} style={{ background: colors[brickIndex % colors.length], width: '12px', height: '12px', borderRadius: '50%' }} />
                <h3 style={{ margin: 0 }}>{brick.name}</h3>
              </div>
              
              <div className={styles.chartWrapper}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* Y-axis */}
                  <div className={styles.chartYAxis} style={{ height: '120px', padding: '0.25rem 0' }}>
                    {Array.from({ length: yAxisSteps + 1 }, (_, i) => yAxisSteps - i).map(step => (
                      <div key={step} className={styles.yAxisLabel}>
                        {formatNumber(step * stepValue)}
                      </div>
                    ))}
                  </div>

                  {/* Line Chart Container */}
                  <div className={styles.lineChartContainer}>
                    <svg className={styles.lineChartSvg} viewBox="0 0 600 120" preserveAspectRatio="none" style={{ height: '120px' }}>
                      {/* Grid lines */}
                      {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * (120 / yAxisSteps)}
                          x2="600"
                          y2={i * (120 / yAxisSteps)}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                        />
                      ))}
                      
                      {/* Area fill */}
                      <defs>
                        <linearGradient id={`gradient-${brick.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={colors[brickIndex % colors.length]} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={colors[brickIndex % colors.length]} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      
                      <path
                        d={`
                          M 0,120
                          ${dataArray.map((d, i) => {
                            const x = (i / (dataLength - 1)) * 600;
                            const y = 120 - (d.value / maxValue) * 120;
                            return i === 0 ? `L ${x},${y}` : `L ${x},${y}`;
                          }).join(' ')}
                          L 600,120
                          Z
                        `}
                        fill={`url(#gradient-${brick.id})`}
                      />
                      
                      {/* Line */}
                      <polyline
                        points={dataArray.map((d, i) => {
                          const x = (i / (dataLength - 1)) * 600;
                          const y = 120 - (d.value / maxValue) * 120;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={colors[brickIndex % colors.length]}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Points */}
                      {dataArray.map((d, i) => {
                        const x = (i / (dataLength - 1)) * 600;
                        const y = 120 - (d.value / maxValue) * 120;
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill={colors[brickIndex % colors.length]}
                            stroke="white"
                            strokeWidth="2"
                          >
                            <title>{d.label}: {d.value.toLocaleString()} m²</title>
                          </circle>
                        );
                      })}
                    </svg>
                    
                    {/* X-axis labels */}
                    <div className={styles.lineChartXAxis}>
                      {dataArray.map((d, i) => (
                        <span key={i} className={styles.xAxisLabel}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

interface MockChartProps {
  brickId: number;
  mode: 'day' | 'month';
}

function MockProductionChart({ brickId, mode }: MockChartProps) {
  const seriesData = mode === 'month' ? getMockMonthlySeries(brickId) : getMockDailySeries(brickId);
  const dataArray = mode === 'month' ? (seriesData as ReturnType<typeof getMockMonthlySeries>).months : (seriesData as ReturnType<typeof getMockDailySeries>).days;
  const maxValue = seriesData.max;
  
  const yAxisSteps = 5;
  const stepValue = Math.ceil(maxValue / yAxisSteps / 1000) * 1000;
  const primaryColor = '#6366f1';

  return (
    <div className={styles.chartWrapper}>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {/* Y-axis */}
        <div className={styles.chartYAxis}>
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => yAxisSteps - i).map(step => (
            <div key={step} className={styles.yAxisLabel}>
              {formatNumber(step * stepValue)}
            </div>
          ))}
        </div>

        {/* Chart bars */}
        <div className={styles.chartBarsContainer}>
          <div className={styles.chartBars}>
            {dataArray.map((item, idx) => {
              const heightPercent = maxValue ? (item.value / maxValue) * 100 : 0;
              return (
                <div key={item.label} className={styles.chartBarItem}>
                  <div className={styles.chartBarTrack}>
                    <div style={{ display: 'flex', gap: '3px', height: '100%', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                      <div
                        title={`${item.value.toLocaleString()} m²`}
                        style={{
                          flex: 1,
                          maxWidth: '20px',
                          background: primaryColor,
                          borderRadius: '4px 4px 0 0',
                          height: `${heightPercent}%`,
                          minHeight: '4px',
                          transition: 'all 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                  <span className={styles.chartBarLabel}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockLineChart({ brickId, mode }: MockChartProps) {
  const seriesData = mode === 'month' ? getMockMonthlySeries(brickId) : getMockDailySeries(brickId);
  const dataArray = mode === 'month' ? (seriesData as ReturnType<typeof getMockMonthlySeries>).months : (seriesData as ReturnType<typeof getMockDailySeries>).days;
  const maxValue = seriesData.max;
  const dataLength = dataArray.length;
  
  const yAxisSteps = 4;
  const stepValue = Math.ceil(maxValue / yAxisSteps / 1000) * 1000;
  const primaryColor = '#6366f1';

  return (
    <div className={styles.chartWrapper}>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {/* Y-axis */}
        <div className={styles.chartYAxis} style={{ height: '120px', padding: '0.25rem 0' }}>
          {Array.from({ length: yAxisSteps + 1 }, (_, i) => yAxisSteps - i).map(step => (
            <div key={step} className={styles.yAxisLabel}>
              {formatNumber(step * stepValue)}
            </div>
          ))}
        </div>

        {/* Line Chart Container */}
        <div className={styles.lineChartContainer}>
          <svg className={styles.lineChartSvg} viewBox="0 0 600 120" preserveAspectRatio="none" style={{ height: '120px' }}>
            {/* Grid lines */}
            {Array.from({ length: yAxisSteps + 1 }, (_, i) => (
              <line
                key={i}
                x1="0"
                y1={i * (120 / yAxisSteps)}
                x2="600"
                y2={i * (120 / yAxisSteps)}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* Area fill */}
            <defs>
              <linearGradient id={`gradient-single-${brickId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            
            <path
              d={`
                M 0,120
                ${dataArray.map((d, i) => {
                  const x = (i / (dataLength - 1)) * 600;
                  const y = 120 - (d.value / maxValue) * 120;
                  return i === 0 ? `L ${x},${y}` : `L ${x},${y}`;
                }).join(' ')}
                L 600,120
                Z
              `}
              fill={`url(#gradient-single-${brickId})`}
            />
            
            {/* Line */}
            <polyline
              points={dataArray.map((d, i) => {
                const x = (i / (dataLength - 1)) * 600;
                const y = 120 - (d.value / maxValue) * 120;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke={primaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Points */}
            {dataArray.map((d, i) => {
              const x = (i / (dataLength - 1)) * 600;
              const y = 120 - (d.value / maxValue) * 120;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill={primaryColor}
                  stroke="white"
                  strokeWidth="2"
                >
                  <title>{d.label}: {d.value.toLocaleString()} m²</title>
                </circle>
              );
            })}
          </svg>
          
          {/* X-axis labels */}
          <div className={styles.lineChartXAxis}>
            {dataArray.map((d, i) => (
              <span key={i} className={styles.xAxisLabel}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
