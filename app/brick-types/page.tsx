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

function getMockMonthlySeries(brickId: number) {
  const base = 40 + (brickId % 5) * 8;
  const labels = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
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
    if (selectedBrickId === null || !filteredBrickTypes.some((b) => b.id === selectedBrickId)) {
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '2px solid #e5e7eb' }}>Chỉ số</th>
                {bricksToCompare.map(b => (
                  <th key={b.id} style={{ textAlign: 'center', padding: '0.75rem 1rem', borderBottom: '2px solid #e5e7eb', color: '#1e293b' }}>{b.name}</th>
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
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, background: '#f9fafb' }}>{row.label}</td>
                  {bricksToCompare.map(b => (
                    <td key={b.id} style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                      {row.format ? row.format((b as any)[row.key as keyof BrickType]) : (b as any)[row.key as keyof BrickType] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 500, background: '#f9fafb' }}>Tỷ lệ chính phẩm</td>
                {bricksToCompare.map(b => {
                  const ratio = b.kilnOutput && b.qualityProductOutput ? (b.qualityProductOutput / b.kilnOutput * 100).toFixed(1) : '-';
                  return <td key={b.id} style={{ textAlign: 'center', padding: '0.75rem 1rem', color: ratio !== '-' && Number(ratio) >= 95 ? '#16a34a' : '#dc2626' }}>{ratio}%</td>;
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
          <div className={styles.chartBars} style={{ gap: '1rem' }}>
            {(chartMode === 'month' ? Array.from({ length: 12 }, (_, i) => i) : Array.from({ length: 7 }, (_, i) => i)).map(idx => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <div style={{ display: 'flex', gap: '4px', height: '150px', alignItems: 'flex-end', width: '100%' }}>
                  {bricksToCompare.map((brick, i) => {
                    const series = chartMode === 'month' ? getMockMonthlySeries(brick.id) : getMockDailySeries(brick.id);
                    const value = chartMode === 'month' ? series.months[idx]?.value : series.days[idx]?.value || 0;
                    const max = chartMode === 'month' ? series.max : series.max;
                    const height = max ? (value / max) * 100 : 0;
                    return (
                      <div
                        key={brick.id}
                        title={`${brick.name}: ${value}`}
                        style={{
                          flex: 1,
                          background: colors[i % colors.length],
                          borderRadius: '999px',
                          height: `${height}%`,
                          minHeight: '4px',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    );
                  })}
                </div>
                <span className={styles.chartBarLabel}>
                  {chartMode === 'month' ? `Th${idx + 1}` : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][idx]}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            {bricksToCompare.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div style={{ width: '14px', height: '14px', background: colors[i % colors.length], borderRadius: '4px' }} />
                <span>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

interface MockChartProps {
  brickId: number;
  mode: 'day' | 'month';
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
                    className={`${styles.chartBarFill} ${isPrimary
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
                  className={`${styles.chartBarFill} ${isPrimary
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
