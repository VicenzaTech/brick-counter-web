'use client';

import styles from './DeviceClusterCard.module.css';
import { DeviceClusterInfo, MeasurementTypeInfo } from '@/app/device-dashboard/page';

interface DeviceClusterCardProps {
    cluster: DeviceClusterInfo;
    measurementType?: MeasurementTypeInfo;
    onEdit: () => void;
    onDelete: () => void;
    deleting?: boolean;
}

export function DeviceClusterCard({
    cluster,
    measurementType,
    onEdit,
    onDelete,
    deleting,
}: DeviceClusterCardProps) {
    const telemetry = cluster.config?.telemetry;
    const qos = telemetry?.qos ?? cluster.config?.qosDefault ?? '---';
    const interval = cluster.config?.interval_message_time;
    const commands =
        cluster.config?.commands?.map((c) => c.code).join(', ') || 'Không có';

    return (
        <div className={styles.row}>
            <div className={styles.colMain}>
                <div className={styles.name}>{cluster.name}</div>
                <div className={styles.code}>{cluster.code}</div>
                {cluster.description && (
                    <div className={styles.description}>{cluster.description}</div>
                )}
            </div>
            <div className={styles.colMt}>
                <span className={styles.mtCode}>
                    {measurementType ? measurementType.code : `MT #${cluster.measurementTypeId}`}
                </span>
                {measurementType && (
                    <span className={styles.mtName}>{measurementType.name}</span>
                )}
            </div>
            <div className={styles.colTelemetry}>
                <div className={styles.label}>Telemetry topic</div>
                <div className={styles.value}>
                    {telemetry?.topic ?? 'Chưa cấu hình'}
                </div>
                <div className={styles.metaLine}>
                    <span>QoS:</span>
                    <span className={styles.badge}>{qos}</span>
                    <span className={styles.metaSep}>•</span>
                    <span>Interval:</span>
                    <span className={styles.badge}>
                        {interval ? `${interval}s` : 'Không đặt'}
                    </span>
                </div>
            </div>
            <div className={styles.colCommands}>
                <div className={styles.label}>Lệnh hỗ trợ</div>
                <div className={styles.value}>{commands}</div>
            </div>
            <div className={styles.colActions}>
                <button className={styles.secondaryButton} onClick={onEdit}>
                    Sửa
                </button>
                <button
                    className={styles.dangerButton}
                    onClick={onDelete}
                    disabled={deleting}
                >
                    {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
            </div>
        </div>
    );
}

