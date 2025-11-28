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


/* -----------------------
    Types & Helpers
------------------------*/

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
    onRefreshLine?: () => void;
}

function sortPositionByIndex(positions: PositionInfo[]): PositionInfo[] {
    return [...positions].sort((a, b) => {
        const ia = typeof a.index === 'number' ? a.index : Number.POSITIVE_INFINITY;
        const ib = typeof b.index === 'number' ? b.index : Number.POSITIVE_INFINITY;
        return ia - ib;
    });
}


/* -----------------------
        Component
------------------------*/

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
    onRefreshLine,
}: LineSettingsSectionProps) {

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

    const [positions, setPositions] = useState<PositionInfo[]>(sortPositionByIndex(linePositions));
    const [deviceFilter, setDeviceFilter] = useState<'all' | 'position'>('all');
    const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
    const [activeDevice, setActiveDevice] = useState<DeviceInfo | null>(null);

    const [positionDialog, setPositionDialog] = useState<{
        mode: 'create' | 'edit';
        position: PositionInfo | null;
    } | null>(null);

    /* ---------- Reorder State ---------- */

    const [pendingPositions, setPendingPositions] = useState<PositionInfo[] | null>(null);
    const [reorderInfo, setReorderInfo] = useState<{
        from: PositionInfo;
        to: PositionInfo;
        newIndex: number;
    } | null>(null);

    const [isReordering, setIsReordering] = useState(false);

    const [deviceDialog, setDeviceDialog] = useState<{
        mode: 'create' | 'edit';
        device: DeviceInfo | null;
    } | null>(null);


    /* ---------- Sync changes từ props ---------- */

    useEffect(() => {
        setPositions(sortPositionByIndex(linePositions));
    }, [linePositions]);


    /* ---------- DnD Setup ---------- */

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
    );


    /* ---------- Memo ---------- */

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
        if (deviceFilter === 'all' || !selectedPositionId) return devices;

        const targetPos = positions.find((p) => p.id === selectedPositionId);
        if (!targetPos) return [];

        const deviceIds = new Set((targetPos.devices || []).map((d) => d.id));
        return devices.filter((d) => deviceIds.has(d.id));
    }, [deviceFilter, devices, positions, selectedPositionId]);


    /* -----------------------
         REORDER HANDLERS
    ------------------------*/

    const handleSelectPosition = (position: PositionInfo) => {
        setSelectedPositionId(position.id);
        setDeviceFilter('position');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (isReordering) return; // tránh spam khi đang gửi request

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIdx = positions.findIndex((p) => p.id === active.id);
        const newIdx = positions.findIndex((p) => p.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return;

        const reordered = arrayMove(positions, oldIdx, newIdx);
        const withIndex = reordered.map((pos, idx) => ({ ...pos, index: idx + 1 }));

        setPendingPositions(withIndex);
        setReorderInfo({
            from: positions[oldIdx],
            to: positions[newIdx],
            newIndex: newIdx + 1,
        });
    };

    const handleConfirmReorder = async () => {
        if (!pendingPositions || !reorderInfo) {
            setPendingPositions(null);
            setReorderInfo(null);
            return;
        }

        setIsReordering(true);

        const prev = positions; // rollback nếu lỗi
        setPositions(pendingPositions);
        setPendingPositions(null);

        try {
            await apiFetch(`${API_URL}/positions/${reorderInfo.from.id}/index`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: reorderInfo.newIndex }),
            });
        } catch (err) {
            console.error('Update reorder failed', err);
            setPositions(prev); // rollback
        } finally {
            setIsReordering(false);
            setReorderInfo(null);
        }
    };

    const handleCancelReorder = () => {
        setPendingPositions(null);
        setReorderInfo(null);
    };


    /* -----------------------
       Device Handlers
    ------------------------*/

    const handleDeviceCommand = async (device: DeviceInfo, command: DeviceCommandType, payload?: unknown) => {
        console.log('Device command', { device, command, payload });
    };

    const handleUpdateDeviceInfo = async (deviceId: number, payload: Partial<DeviceInfo>) => {
        try {
            await apiFetch(`${API_URL}/devices/${deviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.error('Update device failed', err);
        }
    };


    /* -----------------------
        Device Dialog
    ------------------------*/

    const openCreateDevice = () => {
        setDeviceDialog({ mode: 'create', device: null });
    };

    const openEditDevice = (device: DeviceInfo) => {
        setDeviceDialog({ mode: 'edit', device });
    };

    const handleDeviceSaved = (saved: DeviceInfo) => {
        const exists = devices.find((d) => d.id === saved.id);
        if (!exists) devices.push(saved);
        else devices[devices.findIndex((d) => d.id === saved.id)] = saved;
        setDeviceDialog(null);
        onRefreshLine?.();
    };


    /* -----------------------
        Position Dialog
    ------------------------*/

    const openCreatePosition = () => {
        setPositionDialog({ mode: 'create', position: null });
    };

    const openEditPosition = (position: PositionInfo) => {
        setPositionDialog({ mode: 'edit', position });
    };

    const handlePositionSaved = (saved: PositionInfo) => {
        setPositions((prev) => sortPositionByIndex([...prev.filter((p) => p.id !== saved.id), saved]));
        setPositionDialog(null);
        onRefreshLine?.();
    };


    /* -----------------------
           RENDER
    ------------------------*/

    return (
        <div className={styles.lineSettingsSection}>

            {/* -----------------------
                Header: Line Info
            ------------------------*/}
            <div className={styles.settingsBlock}>
                <Formik
                    enableReinitialize
                    initialValues={{
                        name: lineInfo.name ?? '',
                        description: lineInfo.description ?? '',
                        status: lineInfo.status ?? '',
                    }}
                    onSubmit={async (values, { setSubmitting, resetForm }) => {
                        try {
                            const payload: Partial<ProductionLineInfo> = {
                                name: values.name.trim(),
                                description: values.description.trim() || undefined,
                                status: values.status || undefined,
                            };

                            const res = await apiFetch(`${API_URL}/production-lines/${lineInfo.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                            });

                            if (!res.ok) {
                                console.error('Update production line failed');
                                return;
                            }

                            onRefreshLine?.();

                        } catch (err) {
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
                                    <h3 className={styles.settingsBlockTitle}>Thông tin dây chuyền</h3>
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
                                    <InputField name="name" label="Tên dây chuyền" placeholder="Nhập tên dây chuyền" />
                                    <InputField name="description" label="Mô tả" placeholder="Mô tả ngắn" />
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


            {/* -----------------------
                Positions Map
            ------------------------*/}
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

                            <button type="button" className={styles.addSlot} onClick={openCreatePosition}>
                                + Thêm vị trí
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
            </div>


            {/* -----------------------
                Devices List
            ------------------------*/}

            <div className={styles.settingsBlock}>
                <div className={styles.settingHeader}>
                    <div>
                        <h3 className={styles.settingsBlockTitle}>Thiết bị & vị trí cấu hình</h3>
                        <p className={styles.settingsBlockDescription}>
                            Danh sách thiết bị đang gán cho dây chuyền này.
                        </p>
                    </div>

                    <div className={styles.lineSettingsActions}>
                        <Button type="button" className={styles.primaryButton} onClick={onConfig}>
                            Cấu hình thiết bị
                        </Button>

                        <Button type="button" className={styles.secondaryButton} onClick={onReset} disabled={isResetting}>
                            {isResetting ? 'Đang reset...' : 'Reset dây chuyền'}
                        </Button>
                    </div>
                </div>

                <div className={styles.devicesToolbar}>
                    <div className={styles.filterChips}>
                        <button
                            type="button"
                            className={`${styles.filterChip} ${deviceFilter === 'all' ? styles.filterChipActive : ''}`}
                            onClick={() => setDeviceFilter('all')}
                        >
                            Tất cả thiết bị
                        </button>

                        <button
                            type="button"
                            className={`${styles.filterChip} ${deviceFilter === 'position' ? styles.filterChipActive : ''}`}
                            onClick={() => setDeviceFilter('position')}
                        >
                            Vị trí đang chọn
                        </button>
                    </div>

                    <button type="button" className={styles.addDeviceButton} onClick={openCreateDevice}>
                        + Thêm thiết bị
                    </button>

                    {deviceFilter === 'position' && (
                        <div className={styles.selectedPositionLabel}>
                            Vị trí: <strong>{selectedPosition ? selectedPosition.name : 'Chưa chọn'}</strong>
                        </div>
                    )}
                </div>

                <div className={styles.settingsDevicesTable}>
                    <div className={styles.settingsDevicesHeader}>
                        <span>Thiết bị</span>
                        <span>Serial & topic</span>
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


            {/* -----------------------
                Dialog Device
            ------------------------*/}
            {activeDevice && (
                <DeviceSettingsDialog
                    device={activeDevice}
                    open={true}
                    onClose={() => setActiveDevice(null)}
                    onCommand={handleDeviceCommand}
                    onUpdateInfo={handleUpdateDeviceInfo}
                />
            )}


            {/* -----------------------
                Dialog Create/Edit Device
            ------------------------*/}
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


            {/* -----------------------
                Dialog Create/Edit Position
            ------------------------*/}
            {positionDialog && (
                <PositionDialog
                    open={true}
                    mode={positionDialog.mode}
                    lineId={lineInfo.id}
                    maxIndex={positions.reduce<number>((max, p) => {
                        const idx =
                            typeof p.index === 'number' && !Number.isNaN(p.index) ? p.index : 0;
                        return idx > max ? idx : max;
                    }, 0)}
                    initialPosition={positionDialog.position ?? undefined}
                    onClose={() => setPositionDialog(null)}
                    onSaved={handlePositionSaved}
                />
            )}


            {/* -----------------------
                Dialog Confirm Reorder
            ------------------------*/}
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
                        <strong>{reorderInfo.newIndex}</strong> không?
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
