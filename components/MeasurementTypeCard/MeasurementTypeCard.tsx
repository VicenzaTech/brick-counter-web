import styles from './MeasurementTypeCard.module.css';
import { MeasurementTypeInfo } from '@/app/device-dashboard/page';

interface MeasurementTypeCardProps {
    mt: MeasurementTypeInfo;
    deleting?: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

export function MeasurementTypeCard({
    mt,
    deleting,
    onEdit,
    onDelete,
}: MeasurementTypeCardProps) {
    return (
        <div className={styles.row}>
            <div className={styles.colMain}>
                <div className={styles.name}>{mt.name}</div>
                <div className={styles.code}>{mt.code}</div>
                {mt.description && (
                    <div className={styles.description}>{mt.description}</div>
                )}
            </div>
            <div className={styles.colVersion}>
                <span className={styles.badge}>v{mt.data_schema_version ?? 1}</span>
            </div>
            <div className={styles.colSchema}>
                <div className={styles.label}>Schema</div>
                <div className={styles.value}>
                    {mt.data_schema ? 'JSON Schema' : 'Chưa có'}
                </div>
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

