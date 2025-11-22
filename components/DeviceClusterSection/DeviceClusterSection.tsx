'use client';

import { useState } from 'react';
import styles from './DeviceClusterSection.module.css';
import { DeviceClusterInfo, MeasurementTypeInfo } from '@/app/device-dashboard/page';
import { apiFetch } from '@/lib/http/http';
import { DeviceClusterDialog } from '@/components/DeviceClusterDialog/DeviceClusterDialog';
import { DeviceClusterCard } from '@/components/DeviceClusterCard/DeviceClusterCard';

interface DeviceClusterSectionProps {
    clusters: DeviceClusterInfo[];
    measurementTypes: MeasurementTypeInfo[];
    productionLineId: number;
    loading?: boolean;
    onRefresh?: () => void;
    onSaved?: (cluster: DeviceClusterInfo) => void;
    onDeleted?: (id: number) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

export default function DeviceClusterSection({
    clusters,
    measurementTypes,
    loading,
    productionLineId,
    onRefresh,
    onSaved,
    onDeleted,
}: DeviceClusterSectionProps) {
    const [dialog, setDialog] = useState<{
        mode: 'create' | 'edit';
        cluster: DeviceClusterInfo | null;
    } | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const handleDelete = async (cluster: DeviceClusterInfo) => {
        if (!window.confirm(`Xóa cụm thiết bị "${cluster.name}"?`)) return;
        setDeletingId(cluster.id);
        try {
            const res = await apiFetch(`${API_URL}/device-clusters/${cluster.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                console.error('Xóa device cluster thất bại');
                return;
            }
            onDeleted?.(cluster.id);
        } catch (error) {
            console.error('Lỗi khi xóa device cluster', error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <div>
                    <p className={styles.breadcrumb}>Cài đặt / Device cluster</p>
                    <h3 className={styles.title}>Cụm thiết bị (Device cluster)</h3>
                    <p className={styles.subtitle}>
                        Quản lý cấu hình MQTT mặc định, lệnh điều khiển và measurement type cho
                        từng cụm thiết bị.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.secondaryButton} onClick={onRefresh} disabled={loading}>
                        Làm mới
                    </button>
                    <button
                        className={styles.primaryButton}
                        onClick={() => setDialog({ mode: 'create', cluster: null })}
                    >
                        + Thêm cluster
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.empty}>Đang tải dữ liệu...</div>
            ) : clusters.length === 0 ? (
                <div className={styles.empty}>
                    Chưa có device cluster nào. Thêm mới để gán cấu hình mặc định cho thiết bị.
                </div>
            ) : (
                <div className={styles.table}>
                    <div className={styles.tableHeader}>
                        <span>Cụm thiết bị</span>
                        <span>Measurement type</span>
                        <span>Cấu hình telemetry</span>
                        <span>Lệnh điều khiển</span>
                        <span />
                    </div>
                    {clusters.map((cluster) => {
                        const mt =
                            cluster.measurementType ||
                            measurementTypes.find((m) => m.id === cluster.measurementTypeId);
                        return (
                            <DeviceClusterCard
                                key={cluster.id}
                                cluster={cluster}
                                measurementType={mt}
                                deleting={deletingId === cluster.id}
                                onEdit={() => setDialog({ mode: 'edit', cluster })}
                                onDelete={() => handleDelete(cluster)}
                            />
                        );
                    })}
                </div>
            )}

            {dialog && (
                <DeviceClusterDialog
                    productionLineId={productionLineId}
                    open={true}
                    mode={dialog.mode}
                    measurementTypes={measurementTypes}
                    initialCluster={dialog.cluster ?? undefined}
                    onClose={() => setDialog(null)}
                    onSaved={(c) => {
                        onSaved?.(c);
                        setDialog(null);
                    }}
                />
            )}
        </div>
    );
}

