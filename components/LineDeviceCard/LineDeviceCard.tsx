import { DeviceInfo } from '@/app/device-dashboard/page';
import RowActionsMenu from '@/components/RowActionsMenu/RowActionsMenu';
import styles from './LineDeviceCard.module.css';

interface LineDeviceCardProps {
    device: DeviceInfo;
    name: string;
    position?: string;
    isRunning?: boolean;
    onClick?: (device: DeviceInfo) => void;
    onEdit?: (device: DeviceInfo) => void;
    onDelete?: (device: DeviceInfo) => void;
}

export default function LineDeviceCard({
    device,
    name,
    position,
    isRunning,
    onClick,
    onEdit,
    onDelete,
}: LineDeviceCardProps) {
    const status =
        device.status ||
        (typeof isRunning === 'boolean' ? (isRunning ? 'online' : 'offline') : undefined);

    const isOnline = status === 'online';
    const statusLabel =
        typeof status === 'string' ? (isOnline ? 'Đang chạy' : 'Dừng') : 'Không rõ';
    const statusClass = isOnline ? styles.statusRunning : styles.statusStopped;

    const installationDateLabel = device.installation_date
        ? `Lắp đặt: ${device.installation_date}`
        : undefined;

    const handleMainClick = () => {
        onClick && onClick(device);
    };

    return (
        <div className={styles.card} onClick={handleMainClick}>
            <div className={styles.mainInfo}>
                <div className={styles.deviceName}>{name}</div>
                <div className={styles.deviceId}>{device.deviceId}</div>
                {device.serialNumber && (
                    <div className={styles.secondary}>Serial: {device.serialNumber}</div>
                )}
            </div>
            <div className={styles.topicInfo}>
                <div className={styles.topicLabel}>Topic telemetry</div>
                <div className={styles.topicValue}>
                    {device.extraInfo?.sub_topic || '-'}
                </div>
            </div>
            <div className={styles.statusCol}>
                <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
                {position && (
                    <span className={styles.statusSub}>Vị trí: {position}</span>
                )}
                {installationDateLabel && (
                    <span className={styles.statusSub}>{installationDateLabel}</span>
                )}
            </div>
            <div className={styles.actionsCol}>
                <RowActionsMenu
                    onViewDetail={() => onClick && onClick(device)}
                    onEdit={() => onEdit && onEdit(device)}
                    onDelete={() => onDelete && onDelete(device)}
                />
            </div>
        </div>
    );
}

