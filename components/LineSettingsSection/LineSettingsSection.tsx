import styles from './LineSetting.module.css';
import LineDeviceCard from '@/components/LineDeviceCard/LineDeviceCard';
import LinePositionCard from '@/components/LinePositionCard/LinePositionCard';
import { Button } from '../Button/Button';
import { DeviceInfo, PositionInfo } from '@/app/device-dashboard/page';
import { useEffect, useMemo, useState } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    DeviceSettingsDialog,
    type DeviceCommandType,
} from '@/components/DeviceSettingsDialog/DeviceSettingsDialog';
import { Dialog } from '@/components/Dialog/Dialog';
import { apiFetch } from '@/lib/http/http';
import { Formik, Form } from 'formik';
import { InputField } from '@/components/InputField/InputField';
import { SelectField } from '@/components/SelectField/SelectField';
import { PositionDialog } from '@/components/PositionDialog/PositionDialog';
import { DeviceDialog } from '@/components/DeviceDialog/DeviceDialog';

interface DeviceData {
    id: string;
    name: string;
    count: number;
    lastUpdated: string;
    speedPerMinute?: number;
    speedPerHour?: number;
    isRunning?: boolean;
    trend?: 'increasing' | 'stable' | 'decreasing' | 'stopped';
    idleTimeSeconds?: number;
    position?: string;
    status?: string;
}

interface ProductionLineInfo {
    id: number;
    name: string;
    description?: string;
    activeBrickType?: {
        id: number;
        name: string;
        description?: string;
    };
    status?: string;
}

interface LineSettingsSectionProps {
    lineInfo: ProductionLineInfo;
    devices: DeviceInfo[];
    isResetting: boolean;
    linePositions: PositionInfo[];
    onConfig: () => void;
    onReset: () => void;
    onDeviceClick: (device: DeviceData) => void;
    onEditDevice?: (device: DeviceData) => void;
    onDeleteDevice?: (device: DeviceData) => void;
    onAddPosition?: () => void;
    onEditPosition?: (position: PositionInfo) => void;
    onDeletePosition?: (position: PositionInfo) => void;
}

function sortPositionByIndex(positions: PositionInfo[]): PositionInfo[] {
    return [...positions].sort((a, b) => {
        const ia = typeof a.index === 'number' ? a.index : Number.POSITIVE_INFINITY;
        const ib = typeof b.index === 'number' ? b.index : Number.POSITIVE_INFINITY;
        return ia - ib;
    });
}

export default function LineSettingsSection({
    lineInfo,
    devices,
    isResetting,
    linePositions,
    onConfig,
    onReset,
    onDeviceClick,
    onEditDevice,
    onDeleteDevice,
    onAddPosition,
    onEditPosition,
    onDeletePosition,
}: LineSettingsSectionProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

    const [positions, setPositions] = useState<PositionInfo[]>(
        sortPositionByIndex(linePositions),
    );
    const [deviceFilter, setDeviceFilter] = useState<'all' | 'position'>('all');
    const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
    const [activeDevice, setActiveDevice] = useState<DeviceInfo | null>(null);

    const [positionDialog, setPositionDialog] = useState<{
        mode: 'create' | 'edit';
        position: PositionInfo | null;
    } | null>(null);

    const [pendingPositions, setPendingPositions] = useState<PositionInfo[] | null>(null);
    const [reorderInfo, setReorderInfo] = useState<{
        from: PositionInfo;
        to: PositionInfo;
    } | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    const [deviceDialog, setDeviceDialog] = useState<{
        mode: 'create' | 'edit';
        device: DeviceInfo | null;
    } | null>(null);

    useEffect(() => {
        setPositions(sortPositionByIndex(linePositions));
    }, [linePositions]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 4,
            },
        }),
    );

    const selectedPosition = useMemo(
        () => positions.find((p) => p.id === selectedPositionId) || null,
        [positions, selectedPositionId],
    );

    const devicePositionMap = useMemo(() => {
        const map = new Map<number, string>();
        positions.forEach((pos) => {
            (pos.devices || []).forEach((d) => {
                map.set(d.id, pos.name);
            });
        });
        return map;
    }, [positions]);

    const filteredDevices = useMemo(() => {
        if (deviceFilter === 'all' || !selectedPositionId) {
            return devices;
        }
        const targetPosition = positions.find((p) => p.id === selectedPositionId);
        if (!targetPosition) return [];
        const allowedIds = new Set((targetPosition.devices || []).map((d) => d.id));
        return devices.filter((d) => allowedIds.has(d.id));
    }, [deviceFilter, devices, positions, selectedPositionId]);

    const handleSelectPosition = (position: PositionInfo) => {
        setSelectedPositionId(position.id);
        setDeviceFilter('position');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = positions.findIndex((p) => p.id === active.id);
        const newIndex = positions.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(positions, oldIndex, newIndex).map((pos, idx) => ({
            ...pos,
            index: idx + 1,
        }));

        setPendingPositions(reordered);
        setReorderInfo({
            from: positions[oldIndex],
            to: positions[newIndex],
        });
    };

    const handleConfirmReorder = async () => {
        if (!pendingPositions) {
            setReorderInfo(null);
            return;
        }
        setIsReordering(true);
        const newPositions = pendingPositions;
        setPositions(newPositions);
        setPendingPositions(null);

        try {
            await Promise.all(
                newPositions.map((pos) =>
                    apiFetch(`${API_URL}/positions/${pos.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ index: pos.index }),
                    }),
                ),
            );
        } catch (error) {
            console.error('Error updating positions order:', error);
        } finally {
            setIsReordering(false);
            setReorderInfo(null);
        }
    };

    const handleCancelReorder = () => {
        setPendingPositions(null);
        setReorderInfo(null);
    };

    const handleDeviceCommand = async (
        device: DeviceInfo,
        command: DeviceCommandType,
        payload?: unknown,
    ) => {
        console.log('Device command', { device, command, payload });
    };

    const handleUpdateDeviceInfo = async (deviceId: number, payload: Partial<DeviceInfo>) => {
        console.log('Update device info', { deviceId, payload });
    };

    const openCreateDevice = () => {
        setDeviceDialog({
            mode: 'create',
            device: null,
        });
    };

    const openEditDevice = (device: DeviceInfo) => {
        setDeviceDialog({
            mode: 'edit',
            device,
        });
    };

    const handleDeviceSaved = (saved: DeviceInfo) => {
        // Simple merge: replace device with same id or append
        const exists = devices.find((d) => d.id === saved.id);
        if (!exists) {
            devices.push(saved);
        } else {
            const index = devices.findIndex((d) => d.id === saved.id);
            devices[index] = saved;
        }
        setDeviceDialog(null);
    };

    const openCreatePosition = () => {
        setPositionDialog({
            mode: 'create',
            position: null,
        });
    };

    const openEditPosition = (position: PositionInfo) => {
        setPositionDialog({
            mode: 'edit',
            position,
        });
    };

    const handlePositionSaved = (saved: PositionInfo) => {
        setPositions((prev) => {
            const others = prev.filter((p) => p.id !== saved.id);
            return sortPositionByIndex([...others, saved]);
        });
        setPositionDialog(null);
    };

    return (
        <div className={styles.lineSettingsSection}>
            {/* Thông tin dây chuyền */}
            <div className={styles.settingsBlock}>
                <Formik
                    enableReinitialize
                    initialValues={{
                        name: lineInfo.name ?? '',
                        description: lineInfo.description ?? '',
                        status: lineInfo.status ?? '',
                    }}
                    onSubmit={async (values, { setSubmitting, resetForm, setValues }) => {
                        try {
                            const payload: Partial<ProductionLineInfo> = {
                                name: values.name.trim(),
                                description: values.description.trim() || undefined,
                                status: values.status || undefined,
                            };

                            const res = await apiFetch(
                                `${API_URL}/production-lines/${lineInfo.id}`,
                                {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(payload),
                                },
                            );
                            if (!res.ok) {
                                console.error('Error updating production line');
                                return;
                            }
                            setValues(values)
                        } catch (error) {
                            resetForm();
                        } finally {
                            setSubmitting(false);
                        }
                    }}
                >
                    {({ dirty, isSubmitting }) => (
                        <Form>
                            <div className={styles.lineSettingsHeader}>
                                <div>
                                    <h3 className={styles.settingsBlockTitle}>
                                        Thông tin dây chuyền
                                    </h3>
                                    <p className={styles.settingsBlockDescription}>
                                        Thông tin chung của dây chuyền.
                                    </p>
                                </div>
                                <div className={styles.lineSettingsActions}>
                                    <Button
                                        type="submit"
                                        className={styles.primaryButton}
                                        disabled={!dirty || isSubmitting}
                                    >
                                        {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
                                    </Button>
                                </div>
                            </div>

                            <div className={styles.lineSettingsHeader}>
                                <div className={styles.lineSettings}>
                                    <InputField
                                        name="name"
                                        label="Tên dây chuyền"
                                        placeholder="Nhập tên dây chuyền"
                                    />
                                    <InputField
                                        name="description"
                                        label="Mô tả"
                                        placeholder="Mô tả ngắn cho dây chuyền"
                                    />
                                    <SelectField name="status" label="Trạng thái">
                                        <option value="">Chưa thiết lập</option>
                                        <option value="active">Đang hoạt động</option>
                                        <option value="inactive">Ngừng hoạt động</option>
                                    </SelectField>
                                    {lineInfo.activeBrickType && (
                                        <div className={styles.brickTypeRow}>
                                            <span className={styles.settingsBlockDescription}>
                                                Loại gạch đang chạy
                                            </span>
                                            <span className={styles.brickTypeTag}>
                                                {lineInfo.activeBrickType.name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>

            {/* Vị trí trên dây chuyền */}
            <div className={styles.settingsBlock}>
                <h3 className={styles.settingsBlockTitle}>Vị trí trên dây chuyền</h3>
                <p className={styles.settingsBlockDescription}>
                    Hiển thị trực quan các thiết bị theo vị trí (index) trên dây chuyền.
                </p>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={positions.map((p) => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={styles.positionMap}>
                            {positions.map((pos) => (
                                <LinePositionCard
                                    key={pos.id}
                                    id={pos.id}
                                    name={pos.name}
                                    description={pos.description}
                                    index={pos.index}
                                    devices={pos.devices}
                                    isSelected={selectedPositionId === pos.id}
                                    onClick={handleSelectPosition}
                                    onEdit={openEditPosition}
                                    onDelete={onDeletePosition}
                                />
                            ))}
                            {positions.length === 0 && (
                                <div className={styles.settingsDevicesEmpty}>
                                    Chưa có dữ liệu vị trí để hiển thị.
                                </div>
                            )}
                            <button
                                type="button"
                                className={styles.addSlot}
                                onClick={openCreatePosition}
                            >
                                + Thêm vị trí
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Thiết bị & vị trí cấu hình */}
            <div className={styles.settingsBlock}>
                <div className={styles.settingHeader}>
                    <div>
                        <h3 className={styles.settingsBlockTitle}>
                            Thiết bị &amp; vị trí cấu hình
                        </h3>
                        <p className={styles.settingsBlockDescription}>
                            Danh sách thiết bị hiện đang gán cho dây chuyền này. Bấm vào từng thiết
                            bị để xem chi tiết.
                        </p>
                    </div>
                    <div className={styles.lineSettingsActions}>
                        <Button
                            type="button"
                            className={styles.primaryButton}
                            onClick={onConfig}
                        >
                            Cấu hình thiết bị
                        </Button>
                        <Button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={onReset}
                            disabled={isResetting}
                        >
                            {isResetting ? 'Đang reset...' : 'Reset dây chuyền'}
                        </Button>
                    </div>
                </div>

                <div className={styles.devicesToolbar}>
                    <div className={styles.filterChips}>
                        <button
                            type="button"
                            className={`${styles.filterChip} ${deviceFilter === 'all' ? styles.filterChipActive : ''
                                }`}
                            onClick={() => setDeviceFilter('all')}
                        >
                            Tất cả thiết bị
                        </button>
                        <button
                            type="button"
                            className={`${styles.filterChip} ${deviceFilter === 'position' ? styles.filterChipActive : ''
                                }`}
                            onClick={() => setDeviceFilter('position')}
                        >
                            Vị trí đang chọn
                        </button>
                    </div>
                    <button
                        type="button"
                        className={styles.addDeviceButton}
                        onClick={openCreateDevice}
                    >
                        + Thêm thiết bị
                    </button>
                    {deviceFilter === 'position' && (
                        <div className={styles.selectedPositionLabel}>
                            Vị trí:{' '}
                            <strong>{selectedPosition ? selectedPosition.name : 'Chưa chọn'}</strong>
                        </div>
                    )}
                </div>

                <div className={styles.settingsDevicesTable}>
                    <div className={styles.settingsDevicesHeader}>
                        <span>Thiết bị</span>
                        <span>Serial &amp; topic</span>
                        <span>Vị trí</span>
                        <span />
                    </div>
                    {filteredDevices.map((d) => (
                        <LineDeviceCard
                            key={d.id}
                            device={d}
                            name={d.name}
                            position={devicePositionMap.get(d.id)}
                            onClick={() =>
                                onDeviceClick({
                                    id: d.deviceId,
                                    name: d.name,
                                    count: 0,
                                    lastUpdated: '-',
                                })
                            }
                            onEdit={() => openEditDevice(d)}
                        />
                    ))}
                    {filteredDevices.length === 0 && (
                        <div className={styles.settingsDevicesEmpty}>
                            {deviceFilter === 'position'
                                ? 'Chưa có thiết bị nào cho vị trí đang chọn.'
                                : 'Chưa có thiết bị nào được cấu hình cho dây chuyền này.'}
                        </div>
                    )}
                </div>
            </div>

            {activeDevice && (
                <DeviceSettingsDialog
                    device={activeDevice}
                    open={true}
                    onClose={() => setActiveDevice(null)}
                    onCommand={handleDeviceCommand}
                    onUpdateInfo={handleUpdateDeviceInfo}
                />
            )}

            {deviceDialog && (
                <DeviceDialog
                    open={true}
                    mode={deviceDialog.mode}
                    lineId={lineInfo.id}
                    positions={positions}
                    initialDevice={deviceDialog.device ?? undefined}
                    onClose={() => setDeviceDialog(null)}
                    onSaved={handleDeviceSaved}
                />
            )}

            {positionDialog && (
                <PositionDialog
                    open={true}
                    mode={positionDialog.mode}
                    lineId={lineInfo.id}
                    maxIndex={positions.reduce(
                        (max, p) => (p.index && p.index > max ? p.index : max),
                        0,
                    )}
                    initialPosition={positionDialog.position ?? undefined}
                    onClose={() => setPositionDialog(null)}
                    onSaved={handlePositionSaved}
                />
            )}

            {reorderInfo && (
                <Dialog
                    open={true}
                    title="Xác nhận thay đổi vị trí"
                    onClose={handleCancelReorder}
                >
                    <p>
                        Bạn có muốn thay đổi vị trí của{' '}
                        <strong>{reorderInfo.from.name}</strong> từ vị trí{' '}
                        <strong>{reorderInfo.from.index}</strong> sang vị trí{' '}
                        <strong>{reorderInfo.to.index}</strong> không?
                    </p>
                    <div className={styles.lineSettingsActions}>
                        <Button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={handleCancelReorder}
                            disabled={isReordering}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleConfirmReorder}
                            disabled={isReordering}
                        >
                            {isReordering ? 'Đang lưu...' : 'Đồng ý'}
                        </Button>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
