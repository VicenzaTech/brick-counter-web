import React from 'react';
import styles from './ProductionLineSection.module.css';
import type {
    PositionInfo,
    PositionDeviceInfo,
    DeviceRuntimeInfo,
} from './ProductionLineSection';
import { RawTelemetryPayload } from '@/hooks/useProductionLineWebsocket';

interface PositionDevicesPanelProps {
    activePosition: PositionInfo | null;
    selectedDeviceId?: string | null;
    onSelectDevice?: (dev: PositionDeviceInfo) => void;

    telemetryByDevice: Record<string, RawTelemetryPayload>;
}

export const PositionDevicesPanel: React.FC<PositionDevicesPanelProps> = ({
    activePosition,
    selectedDeviceId,
    onSelectDevice,
    telemetryByDevice,
}) => {
    const activeDevices = activePosition?.devices ?? [];

    return (
        <div className={styles.devicesPanel}>
            <div className={styles.devicesPanelHeader}>
                <p className={styles.devicesPanelTitle}>
                    Thiết bị tại vị trí:{' '}
                    <span>{activePosition?.name ?? '—'}</span>
                </p>
                <p className={styles.devicesPanelHint}>
                    Chọn thiết bị để xem chi tiết &amp; cấu hình.
                </p>
            </div>

            <div className={styles.devicesPanelBody}>
                <div className={styles.deviceChipList}>
                    {
                        Object.keys(telemetryByDevice).length > 0
                            ? Object.keys(telemetryByDevice).map((device_key) => {
                                const currentDevice = telemetryByDevice[device_key];
                                return (
                                    <React.Fragment key={device_key} />
                                );
                            })
                            : null
                    }
                </div>

                <div className={styles.devicesEmptyHint}>
                    {!activeDevices.length
                        ? 'Vị trí này chưa có thiết bị nào được gán.'
                        : 'Chọn 1 thiết bị ở bên trái để xem chi tiết realtime ở panel khác.'}
                </div>
            </div>
        </div>
    );
};
