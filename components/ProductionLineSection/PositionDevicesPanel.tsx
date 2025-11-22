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
                        Object.keys(telemetryByDevice).length && Object.keys(telemetryByDevice).map((device_key) => {
                            const currentDevice = telemetryByDevice[device_key]
                            console.log(currentDevice)
                            return (
                                <></>
                                // <button
                                //     key={dev.id}
                                //     type="button"
                                //     className={`${styles.deviceChip} ${isActive ? '' : styles.deviceChipInactive
                                //         }`}
                                //     onClick={() => onSelectDevice?.(dev)}
                                // >
                                //     <div className={styles.deviceChipHeader}>
                                //         <span
                                //             className={styles.deviceStatusDot}
                                //             style={
                                //                 hasError
                                //                     ? { backgroundColor: '#ef4444' }
                                //                     : undefined
                                //             }
                                //         />
                                //         <span className={styles.deviceChipLabel}>
                                //             {dev.name}
                                //         </span>
                                //     </div>

                                //     <div className={styles.deviceChipId}>
                                //         {dev.deviceId}
                                //     </div>

                                //     <div className={styles.deviceChipMetrics}>
                                //         <div
                                //             className={
                                //                 styles.deviceChipMetricItem
                                //             }
                                //         >
                                //             <span
                                //                 className={
                                //                     styles.deviceChipMetricLabel
                                //                 }
                                //             >
                                //                 Sản lượng
                                //             </span>
                                //             <span
                                //                 className={
                                //                     styles.deviceChipMetricValue
                                //                 }
                                //             >
                                //                 {typeof runtime?.count === 'number'
                                //                     ? runtime.count.toLocaleString(
                                //                         'vi-VN',
                                //                     )
                                //                     : '—'}
                                //             </span>
                                //         </div>
                                //         <div
                                //             className={
                                //                 styles.deviceChipMetricItem
                                //             }
                                //         >
                                //             <span
                                //                 className={
                                //                     styles.deviceChipMetricLabel
                                //                 }
                                //             >
                                //                 Lỗi
                                //             </span>
                                //             <span
                                //                 className={
                                //                     styles.deviceChipMetricValue
                                //                 }
                                //             >
                                //                 {typeof runtime?.errorCount ===
                                //                     'number'
                                //                     ? runtime.errorCount.toLocaleString(
                                //                         'vi-VN',
                                //                     )
                                //                     : '—'}
                                //             </span>
                                //         </div>
                                //     </div>

                                //     {runtime?.lastUpdated && (
                                //         <div
                                //             className={styles.deviceChipUpdatedAt}
                                //         >
                                //             Cập nhật:{' '}
                                //             {new Date(
                                //                 runtime.lastUpdated,
                                //             ).toLocaleTimeString('vi-VN', {
                                //                 hour: '2-digit',
                                //                 minute: '2-digit',
                                //                 second: '2-digit',
                                //             })}
                                //         </div>
                                //     )}
                                // </button>
                            );
                        })
                    }
                    {/* 
                    {activeDevices.map((dev) => {
                        const runtime = deviceRuntimeByDeviceId?.[dev.deviceId];
                        const isActive = selectedDeviceId === dev.deviceId;

                        const hasError =
                            typeof runtime?.errorCount === 'number' &&
                            runtime.errorCount > 0;

                        return 
                    })}
                    */}
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
