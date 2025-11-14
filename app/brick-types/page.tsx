'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface BrickType {
  id: number;
  name: string;
  description?: string;
  unit?: string;
  specs?: any;
  isActive?: boolean;
  activeProductionLineId?: number;
  lastActiveAt?: string;
  activeStatus?: 'producing' | 'paused' | 'inactive';
  activeProductionLines?: number[];
  productionCount?: number;
}

interface ProductionLine {
  id: number;
  name: string;
  activeBrickTypeId?: number;
  activeBrickType?: BrickType;
  productionStatus?: 'producing' | 'paused' | 'stopped';
}

interface ProductionLineAssignment {
  lineId: number;
  lineName: string;
  activeBrick?: BrickType;
}

export default function BrickTypesPage() {
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLineSettingModal, setShowLineSettingModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
  const [selectedBrickForLine, setSelectedBrickForLine] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'producing' | 'paused'>('producing');
  const [editingBrick, setEditingBrick] = useState<BrickType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'm²',
    specs: '',
  });
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

  useEffect(() => {
    fetchBrickTypes();
    fetchProductionLines();
  }, []);

  const fetchBrickTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/brick-types`);
      if (res.ok) {
        const data = await res.json();
        // Fetch production info for each brick type
        const enrichedData = await Promise.all(
          data.map(async (brick: BrickType) => {
            const activeLines = await getActiveProductionLines(brick.id);
            return { ...brick, activeProductionLines: activeLines };
          })
        );
        setBrickTypes(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching brick types:', error);
      setError('Lỗi khi tải dữ liệu dòng gạch');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionLines = async () => {
    try {
      const res = await fetch(`${API_URL}/production-lines`);
      if (res.ok) {
        const lines = await res.json();
        setProductionLines(lines);
      }
    } catch (error) {
      console.error('Error fetching production lines:', error);
    }
  };

  const getActiveProductionLines = async (brickTypeId: number): Promise<number[]> => {
    try {
      // Get recent productions for this brick type
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        `${API_URL}/productions?brickTypeId=${brickTypeId}&startDate=${today}&endDate=${today}`
      );
      if (res.ok) {
        const productions = await res.json();
        const uniqueLines = [...new Set(productions.map((p: any) => p.productionLine?.id))].filter(Boolean);
        return uniqueLines as number[];
      }
    } catch (error) {
      console.error('Error fetching active production lines:', error);
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        unit: formData.unit || undefined,
        specs: formData.specs ? JSON.parse(formData.specs) : undefined,
      };

      const url = editingBrick
        ? `${API_URL}/brick-types/${editingBrick.id}`
        : `${API_URL}/brick-types`;
      
      const method = editingBrick ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchBrickTypes();
        handleCloseModal();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Lỗi khi lưu dòng gạch');
      }
    } catch (error: any) {
      console.error('Error saving brick type:', error);
      setError(error.message || 'Lỗi khi lưu dòng gạch');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dòng gạch này?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/brick-types/${id}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        await fetchBrickTypes();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Lỗi khi xóa dòng gạch');
      }
    } catch (error) {
      console.error('Error deleting brick type:', error);
      setError('Lỗi khi xóa dòng gạch');
    }
  };

  const handleEdit = (brick: BrickType) => {
    setEditingBrick(brick);
    setFormData({
      name: brick.name,
      description: brick.description || '',
      unit: brick.unit || 'm²',
      specs: brick.specs ? JSON.stringify(brick.specs, null, 2) : '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBrick(null);
    setFormData({ name: '', description: '', unit: 'm²', specs: '' });
    setError(null);
  };

  const getProductionLineName = (lineId: number) => {
    return productionLines.find(l => l.id === lineId)?.name || `Dây chuyền ${lineId}`;
  };

  const getBrickTypeName = (brickId: number) => {
    return brickTypes.find(b => b.id === brickId)?.name || `Dòng gạch ${brickId}`;
  };

  const getActiveBrickOnLine = (lineId: number): BrickType | undefined => {
    const line = productionLines.find(l => l.id === lineId);
    if (!line || !line.activeBrickTypeId) return undefined;
    
    // If activeBrickType is populated from backend
    if (line.activeBrickType) return line.activeBrickType;
    
    // Otherwise find it from brickTypes
    return brickTypes.find(b => b.id === line.activeBrickTypeId);
  };

  const handleOpenLineSetting = (line: ProductionLine) => {
    setSelectedLine(line);
    const activeBrick = getActiveBrickOnLine(line.id);
    setSelectedBrickForLine(activeBrick?.id || null);
    setSelectedStatus(activeBrick?.activeStatus === 'paused' ? 'paused' : 'producing');
    setError(null);
    setShowLineSettingModal(true);
  };

  const handleSetBrickForLine = async () => {
    if (!selectedLine || !selectedBrickForLine) {
      setError('Vui lòng chọn dòng gạch');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/brick-types/${selectedBrickForLine}/activate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionLineId: selectedLine.id,
          status: selectedStatus,
        }),
      });

      if (res.ok) {
        await fetchBrickTypes();
        await fetchProductionLines();
        setShowLineSettingModal(false);
        setSelectedLine(null);
        setSelectedBrickForLine(null);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Lỗi khi cài đặt dòng gạch cho dây chuyền');
      }
    } catch (error: any) {
      console.error('Error setting brick for line:', error);
      setError(error.message || 'Lỗi khi cài đặt dòng gạch cho dây chuyền');
    }
  };

  const handleStopLineProduction = async (lineId: number) => {
    const activeBrick = getActiveBrickOnLine(lineId);
    if (!activeBrick) return;

    if (!confirm(`Bạn có chắc chắn muốn dừng sản xuất "${activeBrick.name}" trên dây chuyền này?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/brick-types/${activeBrick.id}/deactivate`, {
        method: 'PUT',
      });

      if (res.ok) {
        await fetchBrickTypes();
        await fetchProductionLines();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Lỗi khi dừng sản xuất');
      }
    } catch (error: any) {
      console.error('Error stopping production:', error);
      setError(error.message || 'Lỗi khi dừng sản xuất');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>🧱 Quản lý Dòng Gạch</h1>
          <p className={styles.subtitle}>Quản lý các loại gạch sản xuất và trạng thái sản xuất</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowModal(true)}>
          <span>➕</span> Thêm Dòng Gạch
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className={styles.content}>
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Tổng số dòng gạch</div>
                <div className={styles.statValue}>{brickTypes.length}</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⚡</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Đang sản xuất</div>
                <div className={styles.statValue}>
                  {brickTypes.filter(b => b.isActive).length}
                </div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏭</div>
              <div className={styles.statContent}>
                <div className={styles.statLabel}>Dây chuyền</div>
                <div className={styles.statValue}>{productionLines.length}</div>
              </div>
            </div>
          </div>

          {/* Production Lines Management */}
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h2>🏭 Quản lý Dây chuyền Sản xuất</h2>
              <div className={styles.tableInfo}>
                {productionLines.length} dây chuyền
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên dây chuyền</th>
                    <th>Trạng thái</th>
                    <th>Dòng gạch đang chạy</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {productionLines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🏭</div>
                        <p>Chưa có dây chuyền nào</p>
                      </td>
                    </tr>
                  ) : (
                    productionLines.map((line) => {
                      const activeBrick = getActiveBrickOnLine(line.id);
                      return (
                        <tr key={line.id}>
                          <td className={styles.idCell}>{line.id}</td>
                          <td className={styles.nameCell}>
                            <strong>{line.name}</strong>
                          </td>
                          <td>
                            {activeBrick ? (
                              <span className={`${styles.badge} ${styles.badgeActive}`}>
                                {activeBrick.activeStatus === 'producing' && '⚡ Đang sản xuất'}
                                {activeBrick.activeStatus === 'paused' && '⏸️ Tạm dừng'}
                              </span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeInactive}`}>
                                ○ Không hoạt động
                              </span>
                            )}
                          </td>
                          <td>
                            {activeBrick ? (
                              <span className={styles.lineTag}>
                                {activeBrick.name}
                              </span>
                            ) : (
                              <span className={styles.emptyValue}>-</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                className={styles.settingsBtn}
                                onClick={() => handleOpenLineSetting(line)}
                                title="Cài đặt dòng gạch"
                              >
                                ⚙️ Cài đặt
                              </button>
                              {activeBrick && (
                                <button
                                  className={styles.stopBtn}
                                  onClick={() => handleStopLineProduction(line.id)}
                                  title="Dừng sản xuất"
                                >
                                  ⏹️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Brick Types Table */}
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h2>Danh sách Dòng Gạch</h2>
              <div className={styles.tableInfo}>
                {brickTypes.length} dòng gạch
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên dòng gạch</th>
                    <th>Mô tả</th>
                    <th>Đơn vị</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {brickTypes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📦</div>
                        <p>Chưa có dòng gạch nào</p>
                        <button className={styles.addBtnSmall} onClick={() => setShowModal(true)}>
                          Thêm dòng gạch đầu tiên
                        </button>
                      </td>
                    </tr>
                  ) : (
                    brickTypes.map((brick) => (
                      <tr key={brick.id}>
                        <td className={styles.idCell}>{brick.id}</td>
                        <td className={styles.nameCell}>
                          <strong>{brick.name}</strong>
                        </td>
                        <td className={styles.descCell}>
                          {brick.description || <span className={styles.emptyValue}>-</span>}
                        </td>
                        <td>{brick.unit || '-'}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.editBtn}
                              onClick={() => handleEdit(brick)}
                              title="Chỉnh sửa"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(brick.id)}
                              title="Xóa"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingBrick ? '✏️ Chỉnh sửa Dòng Gạch' : '➕ Thêm Dòng Gạch Mới'}</h2>
              <button className={styles.closeBtn} onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">
                  Tên dòng gạch <span className={styles.required}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Gạch 60x60, Gạch 30x30..."
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Mô tả</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết về dòng gạch..."
                  rows={3}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="unit">Đơn vị</label>
                  <input
                    id="unit"
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="VD: m², viên, tấm..."
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="specs">
                  Thông số kỹ thuật (JSON)
                  <span className={styles.labelHint}>Tùy chọn</span>
                </label>
                <textarea
                  id="specs"
                  value={formData.specs}
                  onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
                  placeholder='{"size": "60x60", "thickness": "10mm", "color": "beige"}'
                  rows={4}
                  className={styles.textarea}
                />
                <small className={styles.hint}>
                  Nhập dưới dạng JSON hợp lệ. Ví dụ: {`{"kích_thuoc": "60x60cm", "mau_sac": "kem"}`}
                </small>
              </div>

              {error && (
                <div className={styles.formError}>
                  ⚠️ {error}
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingBrick ? '💾 Cập nhật' : '➕ Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Line Setting Modal */}
      {showLineSettingModal && selectedLine && (
        <div className={styles.modalOverlay} onClick={() => setShowLineSettingModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>⚙️ Cài đặt Dòng gạch cho Dây chuyền</h2>
              <button className={styles.closeBtn} onClick={() => setShowLineSettingModal(false)}>✕</button>
            </div>

            <div className={styles.activateForm}>
              <div className={styles.brickInfo}>
                <h3>🏭 {selectedLine.name}</h3>
                <p>Chọn dòng gạch sản xuất trên dây chuyền này</p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="brickType">
                  Dòng gạch <span className={styles.required}>*</span>
                </label>
                <select
                  id="brickType"
                  value={selectedBrickForLine || ''}
                  onChange={(e) => setSelectedBrickForLine(Number(e.target.value))}
                  className={styles.select}
                  required
                >
                  <option value="">-- Chọn dòng gạch --</option>
                  {brickTypes.map(brick => (
                    <option key={brick.id} value={brick.id}>
                      {brick.name}
                    </option>
                  ))}
                </select>
                {brickTypes.length === 0 && (
                  <div className={styles.warningBox}>
                    ⚠️ Chưa có dòng gạch nào. Vui lòng thêm dòng gạch trước.
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="status">
                  Trạng thái sản xuất <span className={styles.required}>*</span>
                </label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'producing' | 'paused')}
                  className={styles.select}
                  required
                >
                  <option value="producing">⚡ Đang sản xuất</option>
                  <option value="paused">⏸️ Tạm dừng</option>
                </select>
              </div>

              {error && (
                <div className={styles.formError}>
                  ⚠️ {error}
                </div>
              )}

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => setShowLineSettingModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="button" 
                  className={styles.submitBtn}
                  onClick={handleSetBrickForLine}
                >
                  ✓ Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
