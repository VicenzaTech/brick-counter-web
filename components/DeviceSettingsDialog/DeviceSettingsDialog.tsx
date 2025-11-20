import { Dialog } from '@/components/Dialog/Dialog';
import { DeviceInfo } from '@/app/device-dashboard/page';
import styles from './DeviceSettingsDialog.module.css';
import { useState } from 'react';

export type DeviceCommandType = 'reset' | 'reset_counter' | 'set_interval';

interface DeviceSettingsDialogProps {
    device: DeviceInfo;
    open: boolean;
    onClose: () => void;
    onCommand?: (device: DeviceInfo, command: DeviceCommandType, payload?: unknown) => Promise<void> | void;
    onUpdateInfo?: (deviceId: number, payload: Partial<DeviceInfo>) => Promise<void> | void;
}

export function DeviceSettingsDialog({
    device,
    open,
    onClose,
    onCommand,
    onUpdateInfo,
}: DeviceSettingsDialogProps) {
    const [intervalSeconds, setIntervalSeconds] = useState<number | ''>(
        device.extraInfo.interval_message_time ?? '',
    );

    const [name, setName] = useState(device.name);
    const [serial, setSerial] = useState(device.serialNumber);

    const handleCommand = async (command: DeviceCommandType) => {
        try {
            await onCommand?.(device, command, {
                intervalSeconds: command === 'set_interval' ? intervalSeconds : undefined,
            });
        } finally {
            // Do not auto-close to allow multiple actions
        }
    };

    const handleSaveInfo = async () => {
        await onUpdateInfo?.(device.id, {
            ...device,
            name,
            serialNumber: serial,
            extraInfo: {
                ...device.extraInfo,
                interval_message_time:
                    intervalSeconds === '' ? undefined : Number(intervalSeconds),
            },
        });
        onClose();
    };

    return (
        <Dialog
            open={open}
            title={`Cấu hình thiết bị: ${device.name}`}
            onClose={onClose}
        >
            <div className={styles.dialogContent}>
                <div>
                    <h4 className={styles.sectionTitle}>Thông tin chung</h4>
                    <p className={styles.sectionDescription}>
                        Chỉnh sửa các thông tin cơ bản của thiết bị.
                    </p>
                    <div className={styles.fieldGrid}>
                        <span className={styles.label}>Mã thiết bị</span>
                        <span className={styles.value}>{device.deviceId}</span>

                        <span className={styles.label}>Tên thiết bị</span>
                        <input
                            className={styles.input}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <span className={styles.label}>Serial</span>
                        <input
                            className={styles.input}
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                        />

                        <span className={styles.label}>Topic telemetry</span>
                        <span className={styles.value}>{device.extraInfo.sub_topic || '-'}</span>
                    </div>
                </div>

                <div>
                    <h4 className={styles.sectionTitle}>Chu kỳ gửi dữ liệu</h4>
                    <p className={styles.sectionDescription}>
                        Thiết lập khoảng thời gian gửi dữ liệu (giây) cho thiết bị.
                    </p>
                    <div className={styles.fieldGrid}>
                        <span className={styles.label}>Interval (giây)</span>
                        <input
                            type="number"
                            min={1}
                            className={styles.input}
                            value={intervalSeconds}
                            onChange={(e) =>
                                setIntervalSeconds(
                                    e.target.value === '' ? '' : Number(e.target.value),
                                )
                            }
                        />
                    </div>
                    <div className={styles.actionsRow}>
                        <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => handleCommand('set_interval')}
                        >
                            Áp dụng interval
                        </button>
                    </div>
                </div>

                <div>
                    <h4 className={styles.sectionTitle}>Lệnh nhanh</h4>
                    <p className={styles.sectionDescription}>
                        Thực hiện các lệnh điều khiển nhanh cho thiết bị.
                    </p>
                    <div className={styles.actionsRow}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => handleCommand('reset')}
                        >
                            Reset thiết bị
                        </button>
                        <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => handleCommand('reset_counter')}
                        >
                            Reset counter
                        </button>
                    </div>
                </div>

                <div className={styles.actionsRow}>
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={onClose}
                    >
                        Đóng
                    </button>
                    <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={handleSaveInfo}
                    >
                        Cập nhật thông tin
                    </button>
                </div>
            </div>
        </Dialog>
    );
}

