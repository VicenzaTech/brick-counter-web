'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Cpu } from 'lucide-react';
import ProductionLineSection from '@/components/ProductionLineSection/ProductionLineSection';
import DeviceConfigModal from '@/components/DeviceConfigModal/DeviceConfigModal';
import TabItem from '@/components/TabItem/TabItem';
import { Dialog } from '@/components/Dialog/Dialog';
import LineSettingsSection from '@/components/LineSettingsSection/LineSettingsSection';
import DeviceDashboardSidebar from '@/components/DeviceDashboardSidebar/DeviceDashboardSidebar';
import { useDeviceDashboardWebSocket } from '@/hooks/useDeviceDashboardWebSocket';
import { useAnalytics } from '@/hooks/useAnalytics';
import styles from './page.module.css';
import { apiFetch } from '@/lib/http/http';
import Loading from '@/components/Loading/Loading';

export interface DeviceData {
    id: string;
    name: string;
    count: number;
    lastUpdated: string;
    // Analytics data
    speedPerMinute?: number;
    speedPerHour?: number;
    isRunning?: boolean;
    trend?: 'increasing' | 'stable' | 'decreasing' | 'stopped';
    idleTimeSeconds?: number;
    position?: string;
}

export interface BrickType {
    id: number;
    name: string;
    description?: string;
}

export interface DeviceInfo {
    id: number;
    deviceId: string;
    name: string;
    status?: string;
    serialNumber: string;
    installation_date?: string;
    last_maintenance: string;
    extraInfo: {
        qosDefault?: 0 | 1 | 2;
        interval_message_time?: number;
        sub_topic?: string; // topic to received telemetry 
        pub_topic?: {
            url: string,
            type: string | 'reset' | 'reset_counter'
        } // topic to send cmd to devices
    }
}

export interface PositionInfo {
    id: number;
    name: string;
    description?: string;
    index?: number;
    devices?: DeviceInfo[];
}

export interface ProductionLineInfo {
    id: number;
    name: string;
    description?: string;
    activeBrickType?: BrickType;
    status?: string;
    positions?: PositionInfo[];
}

// Thiết bị ban đầu cho Dây chuyền 1 (dùng WebSocket counter)
const INITIAL_DEVICES_LINE1: DeviceData[] = [
    { id: 'SAU-ME-01', name: 'Sau máy ép 1', count: 0, lastUpdated: '-' },
    { id: 'SAU-ME-02', name: 'Sau máy ép 2', count: 0, lastUpdated: '-' },
    { id: 'TRUOC-LN-01', name: 'Trước lò nung 1', count: 0, lastUpdated: '-' },
    { id: 'TRUOC-LN-02', name: 'Trước lò nung 2', count: 0, lastUpdated: '-' },
    { id: 'SAU-LN-01', name: 'Sau lò nung 1', count: 0, lastUpdated: '-' },
    { id: 'TRUOC-MM-01', name: 'Trước máy mài mặt 1', count: 0, lastUpdated: '-' },
    { id: 'SAU-MC-01', name: 'Sau máy mài cạnh 1', count: 0, lastUpdated: '-' },
    { id: 'TRUOC-DH-01', name: 'Trước đóng hộp 1', count: 0, lastUpdated: '-' },
];

export default function page() {
    // Handle Page State
    const [pageIsPending, setPageIsPending] = useTransition()
    const [pageState, setPageState] = useState<'workshop' | 'production-line'>('production-line')

    const handleGoProductionLineState = () => {
        setPageState('production-line')
    }
    const handleGoWorkshopLineState = () => {
        setPageState('workshop')
    }

    const currentComponent = pageState == 'production-line' ? <DeviceDashboardPage onChangePage={handleGoWorkshopLineState} /> : <WorkshopPage onChangePage={handleGoProductionLineState} />

    return (pageIsPending ? <Loading /> : currentComponent

    )
}

export function WorkshopPage({
    onChangePage
}: {
    onChangePage: () => void
}) {
    return <>Workshop</>
}

export function DeviceDashboardPage({
    onChangePage
}: {
    onChangePage: () => void
}) {
    const [selectedLineId, setSelectedLineId] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<'data' | 'settings'>('data');
    const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);

    // WebSocket cho Dây chuyền 1 (số đếm)
    const { devices: devicesLine1, isConnected } = useDeviceDashboardWebSocket(
        INITIAL_DEVICES_LINE1,
        {
            enabled: true,
            baseUrl: 'http://localhost:5555',
        },
    );
    // Analytics cho tốc độ, xu hướng...
    const {
        lineMetrics,
        deviceMetrics,
        isConnected: analyticsConnected,
    } = useAnalytics('http://localhost:5555');


    const [currentTime, setCurrentTime] = useState<string>('');
    const [productionLines, setProductionLines] = useState<ProductionLineInfo[]>([]);
    const [isResetting, setIsResetting] = useState<Record<number, boolean>>({});
    const [resetMessage, setResetMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const [configModal, setConfigModal] = useState<{
        lineId: number;
        lineName: string;
    } | null>(null);

    // TODO: thay bằng role thực tế khi có auth
    const isAdmin = true;

    // Lấy thông tin dây chuyền từ backend
    useEffect(() => {
        const fetchProductionLines = async () => {
            try {
                const response = await apiFetch('http://localhost:5555/api/production-lines');
                const json = await response.json();

                const lines: ProductionLineInfo[] = Array.isArray(json)
                    ? json
                    : json.data || json.items || [];

                const filteredLines = lines.filter((line) => [1, 2].includes(line.id));
                setProductionLines(filteredLines);
            } catch (error) {
                console.error('Error fetching production lines:', error);
                setProductionLines([

                ]);
            }
        };
        fetchProductionLines();
    }, []);


    // Trộn dữ liệu WebSocket với analytics
    const mergeDeviceWithAnalytics = (devices: DeviceData[]): DeviceData[] => {
        return devices.map((device) => {
            const analytics = deviceMetrics.get(device.id);

            if (analytics) {
                return {
                    ...device,
                    speedPerMinute: analytics.speedPerMinute,
                    speedPerHour: analytics.speedPerHour,
                    isRunning: analytics.isRunning,
                    trend: analytics.trend,
                    idleTimeSeconds: analytics.idleTimeSeconds,
                    position: analytics.position,
                };
            }

            return device;
        });
    };

    const enhancedDevicesLine1 = mergeDeviceWithAnalytics(devicesLine1);

    // Đồng hồ thời gian thực
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleString('vi-VN'));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    // Tính toán hao phí cho một danh sách thiết bị
    const calculateMetrics = (devices: DeviceData[]) => {
        const sauMeDevices = devices.filter((d) => d.id.includes('SAU-ME'));
        const sauMe1 = sauMeDevices[0]?.count || 0;
        const sauMe2 = sauMeDevices[1]?.count || 0;
        const truocLnDevices = devices.filter((d) => d.id.includes('TRUOC-LN'));
        const truocLn1 = truocLnDevices[0]?.count || 0;
        const truocLn2 = truocLnDevices[1]?.count || 0;
        const sauLn = devices.find((d) => d.id.includes('SAU-LN'))?.count || 0;
        const truocMm = devices.find((d) => d.id.includes('TRUOC-MM'))?.count || 0;
        const truocDh = devices.find((d) => d.id.includes('TRUOC-DH'))?.count || 0;

        const haophiMoc = truocLn1 + truocLn2 - (sauMe1 + sauMe2);
        const haophiNung = sauLn - (truocLn1 + truocLn2);
        const haophiTruocMai = truocMm - sauLn;
        const haophiHoanThien = truocDh - truocMm;

        const getVariant = (
            value: number,
        ):
            | 'primary'
            | 'success'
            | 'warning'
            | 'danger'
            | 'muted' => {
            if (value < 0) return 'success';
            if (value === 0) return 'muted';
            if (value > 0 && value <= 100) return 'warning';
            return 'danger';
        };

        return {
            haophiMoc,
            haophiNung,
            haophiTruocMai,
            haophiHoanThien,
            haophiMocVariant: getVariant(haophiMoc),
            haophiNungVariant: getVariant(haophiNung),
            haophiTruocMaiVariant: getVariant(haophiTruocMai),
            haophiHoanThienVariant: getVariant(haophiHoanThien),
        };
    };


    // Mở modal cấu hình thiết bị
    const handleLineConfig = (lineId: number, lineName: string) => {
        setConfigModal({ lineId, lineName });
    };

    // Lưu cấu hình thiết bị cho dây chuyền
    const handleSaveConfig = async (interval: number) => {
        if (!configModal) return;
        try {
            const response = await apiFetch(
                `http://localhost:5555/api/mqtt/device-command/config-line/${configModal.lineId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ interval }),
                },
            );

            const result = await response.json();
            if (result.success) {
                setResetMessage({
                    type: 'success',
                    text: `OK. ${result.message}`,
                });
                setTimeout(() => setResetMessage(null), 5000);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error('Config error:', error);
            throw new Error(error.message || 'Lỗi kết nối đến server');
        }
    };
    // Reset toàn bộ thiết bị của một dây chuyền
    const handleResetLine = async (lineId: number) => {
        if (
            !confirm(
                `Bạn chắc chắn muốn reset toàn bộ thiết bị của Dây chuyền ${lineId}?\n\nTất cả số đếm sẽ về 0.`,
            )
        ) {
            return;
        }

        setIsResetting((prev) => ({ ...prev, [lineId]: true }));
        setResetMessage(null);

        try {
            const response = await apiFetch(
                `http://localhost:5555/api/mqtt/device-command/reset-line/${lineId}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            const result = await response.json();
            if (result.success) {
                setResetMessage({
                    type: 'success',
                    text: `OK. ${result.message} - Lệnh ID: ${String(
                        result.commandId ?? '',
                    ).substring(0, 8)}...`,
                });
                setTimeout(() => setResetMessage(null), 5000);
            } else {
                setResetMessage({
                    type: 'error',
                    text: `Lỗi: ${result.message}`,
                });
            }
        } catch (error) {
            console.error('Reset error:', error);
            setResetMessage({
                type: 'error',
                text: 'Lỗi kết nối đến server',
            });
        } finally {
            setIsResetting((prev) => ({ ...prev, [lineId]: false }));
        }
    };

    // Lấy thông tin dây chuyền theo ID
    const getLineInfo = (lineId: number) => {
        return (
            productionLines.find((line) => line.id === lineId) || {
                id: lineId,
                name: `Dây chuyền ${lineId}`,
                status: 'active',
            }
        );
    };

    // Tổng quan nhanh từ analytics
    const lineList = Array.from(lineMetrics.values());
    const totalDevices =
        lineList.reduce((sum, line) => sum + line.totalDevices, 0) ||
        enhancedDevicesLine1.length
    const runningDevices =
        lineList.reduce((sum, line) => sum + line.runningDevices, 0) ||
        [...enhancedDevicesLine1].filter(
            (d) => d.isRunning ?? true,
        ).length;
    const totalProducedToday = lineList.reduce(
        (sum, line) => sum + line.totalProducedToday,
        0,
    );
    const getDevicesForLine = (lineId: number): DeviceData[] => {
        if (lineId === 1) return enhancedDevicesLine1;
        return [];
    };
    const selectedLineInfo = getLineInfo(selectedLineId);
    const selectedDevices = getDevicesForLine(selectedLineId);

    // Devices cho tab cài đặt: ưu tiên mapping từ positions (backend)
    const settingsDevicesFromPositions: DeviceInfo[] = useMemo(() => {
        const currentLine = productionLines.find(item => item.id == selectedLineId)
        return currentLine?.positions?.flatMap(p => p.devices ?? []) ?? []
    }, [productionLines, selectedLineId])
    // selectedLineInfo.positions && selectedLineInfo.positions.length
    //     ? selectedLineInfo.positions.flatMap((pos) =>
    //         (pos.devices || []).map<DeviceInfo>((d) => (d)),
    //     )
    //     : [];

    const settingsDevices =
        settingsDevicesFromPositions.length > 0
            ? settingsDevicesFromPositions : []
    // : selectedDevices; 
    // uncomment if direct load from web socket devices 
    const availableLines =
        productionLines.length > 0
            ? productionLines
            : [];

    const sidebarLines = availableLines.map((line) => ({
        id: line.id,
        name: line.name,
        status: line.status,
        activeBrickTypeName: line.activeBrickType?.name,
    }));

    const handleDeviceClick = (device: DeviceData) => {
        setSelectedDevice(device);
    };

    const closeDeviceDialog = () => {
        setSelectedDevice(null);
    };

    // flat position for child component

    const linePositions = useMemo(() => {
        const currentLine = productionLines.find((item) => item.id == selectedLineId);
        return (
            currentLine?.positions?.map(
                (pos): PositionInfo => ({
                    id: pos.id,
                    name: pos.name,
                    description: pos.description,
                    index: pos.index,
                    devices: pos.devices,
                }),
            ) ?? []
        );
    }, [productionLines, selectedLineId]);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <Cpu size={32} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Dashboard thiết bị</h1>
                        <p className={styles.subtitle}>
                            Giám sát thời gian thực các thiết bị trên dây chuyền sản xuất.
                        </p>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.connectionStatus}>
                        <span
                            className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected
                                }`}
                        />
                        <span className={styles.statusText}>
                            {isConnected ? 'WebSocket thiết bị' : 'Thiết bị offline'}
                        </span>
                    </div>
                    <div className={styles.connectionStatus}>
                        <span
                            className={`${styles.statusDot} ${analyticsConnected ? styles.connected : styles.disconnected
                                }`}
                        />
                        <span className={styles.statusText}>
                            {analyticsConnected ? 'Analytics realtime' : 'Analytics offline'}
                        </span>
                    </div>
                    <div className={styles.headerTime}>{currentTime || '-'}</div>
                </div>
            </div>

            {/* Thẻ tổng quan */}
            <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Tổng thiết bị</p>
                    <p className={styles.overviewValue}>{totalDevices}</p>
                    <p className={styles.overviewSub}>Đang chạy: {runningDevices}</p>
                </div>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Sản lượng hôm nay</p>
                    <p className={styles.overviewValue}>
                        {totalProducedToday.toLocaleString('vi-VN')}
                    </p>
                    <p className={styles.overviewSub}>Tổng theo mỗi dây chuyền</p>
                </div>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Số dây chuyền</p>
                    <p className={styles.overviewValue}>{productionLines.length || 2}</p>
                    <p className={styles.overviewSub}>Đang hiển thị trên dashboard</p>
                </div>
            </div>

            {/* Thông báo reset */}
            {resetMessage && (
                <div
                    className={`${styles.resetMessage} ${styles[resetMessage.type]
                        }`}
                >
                    {resetMessage.text}
                </div>
            )}

            <div className={styles.mainLayout}>
                {/* Sidebar chọn dây chuyền */}
                <DeviceDashboardSidebar
                    factoryName="Nhà máy 01"
                    factoryDescription="Danh sách dây chuyền nhà máy 01"
                    lines={sidebarLines}
                    selectedLineId={selectedLineId}
                    onBackToFactoryList={onChangePage}
                    onSelectLine={setSelectedLineId}
                />

                {/* Nội dung chính với Tabs */}
                <section className={styles.mainContent}>
                    <div className={styles.tabs}>
                        <TabItem
                            label="Dữ liệu thực tế"
                            isActive={activeTab === 'data'}
                            onClick={() => setActiveTab('data')}
                        />
                        {isAdmin && (
                            <TabItem
                                label="Cài đặt dây chuyền"
                                isActive={activeTab === 'settings'}
                                onClick={() => setActiveTab('settings')}
                            />
                        )}
                    </div>
                    <div className={styles.tabContent}>
                        {activeTab === 'data' && (
                            <ProductionLineSection
                                lineInfo={selectedLineInfo}
                                devices={selectedDevices}
                                metrics={calculateMetrics(selectedDevices)}
                                onReset={() => handleResetLine(selectedLineId)}
                                isResetting={isResetting[selectedLineId] || false}
                                showResetButton
                                onConfig={() =>
                                    handleLineConfig(selectedLineId, selectedLineInfo.name)
                                }
                                onDeviceClick={handleDeviceClick}
                            />
                        )}

                        {isAdmin && activeTab === 'settings' && (
                            <LineSettingsSection
                                lineInfo={selectedLineInfo}
                                devices={settingsDevices}
                                linePositions={linePositions}
                                isResetting={isResetting[selectedLineId] || false}
                                onConfig={() =>
                                    handleLineConfig(selectedLineId, selectedLineInfo.name)
                                }
                                onReset={() => handleResetLine(selectedLineId)}
                                onDeviceClick={handleDeviceClick}
                            />
                        )}
                    </div>
                </section>
            </div>

            {/* Modal cấu hình thiết bị */}
            {configModal && (
                <DeviceConfigModal
                    lineId={configModal.lineId}
                    lineName={configModal.lineName}
                    deviceCount={8}
                    onClose={() => setConfigModal(null)}
                    onSave={handleSaveConfig}
                />
            )}

            {/* Dialog thông tin thiết bị */}
            {selectedDevice && (
                <Dialog
                    open={true}
                    title={`Thiết bị: ${selectedDevice.name}`}
                    onClose={closeDeviceDialog}
                >
                    <div className={styles.settingsBlock}>
                        <h3 className={styles.settingsBlockTitle}>Thông tin chung</h3>
                        <div className={styles.settingsDevicesTable}>
                            <div className={styles.settingsDevicesHeader}>
                                <span>Thuộc tính</span>
                                <span>Giá trị</span>
                                <span />
                                <span />
                            </div>
                            <div className={styles.settingsDevicesRow}>
                                <span>Mã thiết bị</span>
                                <span>{selectedDevice.id}</span>
                                <span />
                                <span />
                            </div>
                            <div className={styles.settingsDevicesRow}>
                                <span>Tên thiết bị</span>
                                <span>{selectedDevice.name}</span>
                                <span />
                                <span />
                            </div>
                            <div className={styles.settingsDevicesRow}>
                                <span>Vị trí</span>
                                <span>{selectedDevice.position || '-'}</span>
                                <span />
                                <span />
                            </div>
                            <div className={styles.settingsDevicesRow}>
                                <span>Số đếm hiện tại</span>
                                <span>{selectedDevice.count.toLocaleString('vi-VN')}</span>
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>

                    <div className={styles.settingsBlock}>
                        <h3 className={styles.settingsBlockTitle}>Cài đặt nhanh</h3>
                        <p className={styles.settingsBlockDescription}>
                            Các cài đặt chi tiết sẽ được bổ sung sau (placeholder).
                        </p>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
