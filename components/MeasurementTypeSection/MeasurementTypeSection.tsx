'use client';

import { useState } from 'react';
import styles from './MeasurementTypeSection.module.css';
import { MeasurementTypeInfo } from '@/app/device-dashboard/page';
import { apiFetch } from '@/lib/http/http';
import { MeasurementTypeCard } from '@/components/MeasurementTypeCard/MeasurementTypeCard';
import { MeasurementTypeDialog } from '@/components/MeasurementTypeDialog/MeasurementTypeDialog';

interface MeasurementTypeSectionProps {
    measurementTypes: MeasurementTypeInfo[];
    onRefresh?: () => void;
    onSaved?: (mt: MeasurementTypeInfo) => void;
    onDeleted?: (id: number) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

export default function MeasurementTypeSection({
    measurementTypes,
    onRefresh,
    onSaved,
    onDeleted,
}: MeasurementTypeSectionProps) {
    const [dialog, setDialog] = useState<{
        mode: 'create' | 'edit';
        mt: MeasurementTypeInfo | null;
    } | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const openDialog = (mode: 'create' | 'edit', mt?: MeasurementTypeInfo) => {
        setDialog({ mode, mt: mt ?? null });
    };

    const handleDelete = async (mt: MeasurementTypeInfo) => {
        if (!window.confirm(`Xóa measurement type "${mt.code}"?`)) return;
        setDeletingId(mt.id);
        try {
            const res = await apiFetch(`${API_URL}/measurement-types/${mt.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                console.error('Xóa measurement type thất bại');
                return;
            }
            onDeleted?.(mt.id);
        } catch (error) {
            console.error('Lỗi khi xóa measurement type', error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div>
                    <p className={styles.breadcrumb}>Cài đặt / Measurement type</p>
                    <h3 className={styles.title}>Measurement type</h3>
                    <p className={styles.subtitle}>
                        Quản lý JSON Schema cho các loại dữ liệu đo, dùng để validate payload MQTT.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.secondaryButton} onClick={onRefresh}>
                        Làm mới
                    </button>
                    <button
                        className={styles.primaryButton}
                        onClick={() => openDialog('create')}
                    >
                        + Thêm measurement type
                    </button>
                </div>
            </div>

            {measurementTypes.length === 0 ? (
                <div className={styles.empty}>Chưa có measurement type nào.</div>
            ) : (
                <div className={styles.table}>
                    <div className={styles.tableHeader}>
                        <span>Tên / Code</span>
                        <span>Version</span>
                        <span>Schema</span>
                        <span />
                    </div>
                    {measurementTypes.map((mt) => (
                        <MeasurementTypeCard
                            key={mt.id}
                            mt={mt}
                            deleting={deletingId === mt.id}
                            onEdit={() => openDialog('edit', mt)}
                            onDelete={() => handleDelete(mt)}
                        />
                    ))}
                </div>
            )}

            {dialog && (
                <MeasurementTypeDialog
                    open={true}
                    mode={dialog.mode}
                    initial={dialog.mt ?? undefined}
                    onClose={() => setDialog(null)}
                    onSaved={(saved) => {
                        onSaved?.(saved);
                        setDialog(null);
                    }}
                />
            )}
        </div>
    );
}

