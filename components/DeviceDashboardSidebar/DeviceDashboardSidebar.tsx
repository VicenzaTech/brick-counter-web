import { ArrowLeft } from 'lucide-react';
import styles from './DeviceDashboardSidebar.module.css';

interface SidebarLine {
    id: number;
    name: string;
    status?: string;
    activeBrickTypeName?: string;
}

interface DeviceDashboardSidebarProps {
    factoryName: string;
    factoryDescription?: string;
    lines: SidebarLine[];
    selectedLineId: number;
    onSelectLine: (id: number) => void;
    onBackToFactoryList?: () => void;
}

export default function DeviceDashboardSidebar({
    factoryName,
    factoryDescription,
    lines,
    selectedLineId,
    onSelectLine,
    onBackToFactoryList,
}: DeviceDashboardSidebarProps) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <p className={styles.sidebarTitle}>{factoryName}</p>
                {factoryDescription && (
                    <p className={styles.sidebarSub}>{factoryDescription}</p>
                )}
            </div>

            {onBackToFactoryList && (
                <button
                    type="button"
                    className={styles.backButton}
                    onClick={onBackToFactoryList}
                >
                    <ArrowLeft /> Danh sách nhà máy
                </button>
            )}

            <div className={styles.lineList}>
                {lines.map((line) => (
                    <button
                        key={line.id}
                        type="button"
                        className={`${styles.lineCard} ${selectedLineId === line.id ? styles.lineCardActive : ''
                            }`}
                        onClick={() => onSelectLine(line.id)}
                    >
                        <div className={styles.lineCardWrapper}>
                            <div className={styles.lineCardInfo}>
                                <span className={styles.lineCardName}>{line.name}</span>
                                <span className={styles.lineCardStatus}>
                                    {line.status === 'active'
                                        ? 'Đang hoạt động'
                                        : line.status || 'Không xác định'}
                                </span>
                            </div>
                            <div className={styles.lineCardIcon}>L{line.id}</div>
                        </div>

                        <div className={styles.lineInfo}>
                            <div className={styles.lineBrickType}>
                                <span>Gạch</span>
                                <h5 className={styles.lineBrickTypeName}>
                                    {line.activeBrickTypeName || '-'}
                                </h5>
                            </div>

                            <div className={styles.lineBrickType}>
                                <span>Số thiết bị</span>
                                <h5 className={styles.lineBrickTypeName}>
                                    {line.activeBrickTypeName || '-'}
                                </h5>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </aside>
    );
}

