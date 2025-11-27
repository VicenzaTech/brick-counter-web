'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { apiFetch } from '@/lib/http/http';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/auth/rbarc';
import { PERMISSIONS } from '@/lib/auth/permission.constant';

// Interface đã được cập nhật với đầy đủ các trường từ mock data
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
    // Các trường mới từ mock data
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
    // Thêm trạng thái sản xuất
}

export default function BrickTypesPage() {
    const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBrick, setEditingBrick] = useState<BrickType | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form data đã được mở rộng để chứa các trường mới
    const [formData, setFormData] = useState({
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
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

    // Get auth state 
    const user = useAuthStore(s => s.user)
    const canUpdate = hasPermission(user, PERMISSIONS.PRODUCTION_LINE_UPDATE) // Giữ lại quyền kiểm tra cho các thao tác khác

    useEffect(() => {
        fetchBrickTypes();
    }, []);

    // Hàm fetch đã được đơn giản hóa, chỉ lấy dữ liệu từ backend
    const fetchBrickTypes = async () => {
        try {
            const res = await apiFetch(`${API_URL}/brick-types`);
            if (res.ok) {
                const data = await res.json();
                setBrickTypes(data);
            }
        } catch (error) {
            console.error('Error fetching brick types:', error);
            setError('Lỗi khi tải dữ liệu dòng gạch');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            // Chuyển đổi các trường số từ string sang number
            const payload: any = {
                name: formData.name,
                description: formData.description || undefined,
                unit: formData.unit || undefined,
                specs: formData.specs ? JSON.parse(formData.specs) : undefined,
                workshop: formData.workshop || undefined,
                productionLine: formData.productionLine || undefined,
                tileSize: formData.tileSize || undefined,
            };

            // Chỉ thêm các trường số nếu chúng không rỗng
            if (formData.contractCycle) payload.contractCycle = Number(formData.contractCycle);
            if (formData.kilnOutput) payload.kilnOutput = Number(formData.kilnOutput);
            if (formData.qualityProductOutput) payload.qualityProductOutput = Number(formData.qualityProductOutput);
            if (formData.deductionDays) payload.deductionDays = Number(formData.deductionDays);
            if (formData.contractProduction) payload.contractProduction = Number(formData.contractProduction);
            if (formData.additionalContractWhenReducingCycle) payload.additionalContractWhenReducingCycle = Number(formData.additionalContractWhenReducingCycle);
            if (formData.reducedContractWhenIncreasingCycle) payload.reducedContractWhenIncreasingCycle = Number(formData.reducedContractWhenIncreasingCycle);


            const url = editingBrick
                ? `${API_URL}/brick-types/${editingBrick.id}`
                : `${API_URL}/brick-types`;

            const method = editingBrick ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
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
            const res = await apiFetch(`${API_URL}/brick-types/${id}`, {
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
            workshop: brick.workshop || '',
            productionLine: brick.productionLine || '',
            tileSize: brick.tileSize || '',
            contractCycle: brick.contractCycle?.toString() || '',
            kilnOutput: brick.kilnOutput?.toString() || '',
            qualityProductOutput: brick.qualityProductOutput?.toString() || '',
            deductionDays: brick.deductionDays?.toString() || '',
            contractProduction: brick.contractProduction?.toString() || '',
            additionalContractWhenReducingCycle: brick.additionalContractWhenReducingCycle?.toString() || '',
            reducedContractWhenIncreasingCycle: brick.reducedContractWhenIncreasingCycle?.toString() || '',
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingBrick(null);
        setFormData({
            name: '', description: '', unit: 'm²', specs: '', workshop: '', productionLine: '', tileSize: '',
            contractCycle: '', kilnOutput: '', qualityProductOutput: '', deductionDays: '', contractProduction: '',
            additionalContractWhenReducingCycle: '', reducedContractWhenIncreasingCycle: ''
        });
        setError(null);
    };
    
    // Helper để định dạng số
    const formatNumber = (num?: number) => {
        if (num === undefined || num === null) return '-';
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>🧱 Quản lý Dòng Gạch</h1>
                    <p className={styles.subtitle}>Quản lý các loại gạch sản xuất và thông tin chi tiết</p>
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
                    {/* Stats Cards - Đã loại bỏ card dây chuyền */}
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
                    </div>

                    {/* Brick Types Table with Full Details */}
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
                                        <th>Phân xưởng</th>
                                        <th>Dây chuyền</th>
                                        <th>Kích thước SP</th>
                                        <th>Trạng thái sản xuất</th>
                                        {/* <th>Chu kỳ khoán (phút)</th>
                                        <th>SL ra lò (m²)</th>
                                        <th>SL chính phẩm (m²)</th>
                                        <th>SL khoán (m²/tháng)</th> */}
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brickTypes.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className={styles.emptyState}>
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
                                                    {brick.description && (
                                                        <div className={styles.descCell}>{brick.description}</div>
                                                    )}
                                                </td>
                                                <td>{brick.workshop || '-'}</td>
                                                <td>{brick.productionLine || '-'}</td>
                                                <td>{brick.tileSize || '-'}</td>
                                                <td>{brick.isActive ? 'Sản xuất' : 'Ngừng sản xuất'}</td>
                                                {/* <td>{formatNumber(brick.contractCycle)}</td>
                                                <td>{formatNumber(brick.kilnOutput)}</td>
                                                <td>{formatNumber(brick.qualityProductOutput)}</td>
                                                <td>{formatNumber(brick.contractProduction)}</td> */}
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

            {/* Modal for Add/Edit - Đã được mở rộng */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={`${styles.modal} ${styles.largeModal}`} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingBrick ? '✏️ Chỉnh sửa Dòng Gạch' : '➕ Thêm Dòng Gạch Mới'}</h2>
                            <button className={styles.closeBtn} onClick={handleCloseModal}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Tên dòng gạch <span className={styles.required}>*</span></label>
                                    <input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Gạch 60x60" required className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="tileSize">Kích thước SP</label>
                                    <input id="tileSize" type="text" value={formData.tileSize} onChange={(e) => setFormData({ ...formData, tileSize: e.target.value })} placeholder="VD: 600x600mm" className={styles.input} />
                                </div>
                            </div>
                            
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="workshop">Phân xưởng</label>
                                    <input id="workshop" type="text" value={formData.workshop} onChange={(e) => setFormData({ ...formData, workshop: e.target.value })} placeholder="VD: Phân xưởng 1" className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="productionLine">Dây chuyền</label>
                                    <input id="productionLine" type="text" value={formData.productionLine} onChange={(e) => setFormData({ ...formData, productionLine: e.target.value })} placeholder="VD: Dây chuyền 1" className={styles.input} />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="description">Mô tả</label>
                                <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả chi tiết..." rows={2} className={styles.textarea} />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="contractCycle">Chu kỳ khoán (phút)</label>
                                    <input id="contractCycle" type="number" value={formData.contractCycle} onChange={(e) => setFormData({ ...formData, contractCycle: e.target.value })} className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="kilnOutput">Sản lượng ra lò (m²)</label>
                                    <input id="kilnOutput" type="number" value={formData.kilnOutput} onChange={(e) => setFormData({ ...formData, kilnOutput: e.target.value })} className={styles.input} />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="qualityProductOutput">Sản lượng chính phẩm (m²)</label>
                                    <input id="qualityProductOutput" type="number" value={formData.qualityProductOutput} onChange={(e) => setFormData({ ...formData, qualityProductOutput: e.target.value })} className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="contractProduction">Sản lượng khoán (m²/tháng)</label>
                                    <input id="contractProduction" type="number" value={formData.contractProduction} onChange={(e) => setFormData({ ...formData, contractProduction: e.target.value })} className={styles.input} />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="specs">Thông số kỹ thuật (JSON) <span className={styles.labelHint}>Tùy chọn</span></label>
                                <textarea id="specs" value={formData.specs} onChange={(e) => setFormData({ ...formData, specs: e.target.value })} placeholder='{"size": "60x60", "thickness": "10mm"}' rows={3} className={styles.textarea} />
                            </div>

                            {error && <div className={styles.formError}>⚠️ {error}</div>}

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelBtn} onClick={handleCloseModal}>Hủy</button>
                                <button type="submit" className={styles.submitBtn}>{editingBrick ? '💾 Cập nhật' : '➕ Thêm mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}