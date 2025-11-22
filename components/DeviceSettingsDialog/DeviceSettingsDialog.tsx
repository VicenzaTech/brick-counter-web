'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog/Dialog';
import { DeviceInfo } from '@/app/device-dashboard/page';
import styles from './DeviceSettingsDialog.module.css';

export type DeviceCommandType = 'reset' | 'reset_counter' | 'set_interval' | 'custom';

type CommandInput = {
    code: string;
    type: 'reset' | 'reset_counter' | 'calibrate' | 'custom';
    topic: string;
    payloadTemplate: string;
};

interface DeviceSettingsDialogProps {
    device: DeviceInfo;
    open: boolean;
    onClose: () => void;
    onCommand?: (
        device: DeviceInfo,
        command: DeviceCommandType,
        payload?: unknown,
    ) => Promise<void> | void;
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
        device.extraInfo?.interval_message_time ?? '',
    );

    const [name, setName] = useState(device.name);
    const [serial, setSerial] = useState(device.serialNumber);
    const [telemetryTopic, setTelemetryTopic] = useState(
        device.extraInfo?.telemetry?.topic || `/devices/${device.deviceId}/telemetry`,
    );
    const [telemetryQos, setTelemetryQos] = useState<string>(
        device.extraInfo?.telemetry?.qos?.toString() ?? '',
    );

    const initialCommands: CommandInput[] =
        device.extraInfo?.commands?.map((c: any) => ({
            code: c.type,
            type: c.type,
            topic: c.topic,
            payloadTemplate: c.payloadTemplate ? JSON.stringify(c.payloadTemplate, null, 2) : '',
        })) ||
        [
            {
                code: 'reset',
                type: 'reset',
                topic: `/devices/${device.deviceId}/commands/reset`,
                payloadTemplate: '',
            },
            {
                code: 'reset_counter',
                type: 'reset_counter',
                topic: `/devices/${device.deviceId}/commands/reset_counter`,
                payloadTemplate: '',
            },
        ];

    const [commands, setCommands] = useState<CommandInput[]>(initialCommands);
    const [otherJson, setOtherJson] = useState(
        device.extraInfo?.other ? JSON.stringify(device.extraInfo.other, null, 2) : '',
    );
    const [otherError, setOtherError] = useState<string | null>(null);

    const handleCommand = async (command: DeviceCommandType) => {
        try {
            await onCommand?.(device, command, {
                intervalSeconds: command === 'set_interval' ? intervalSeconds : undefined,
            });
        } finally {
            // giữ dialog mở
        }
    };

    const handleSaveInfo = async () => {
        const parsedCommands: {
            type: CommandInput['type'];
            topic: string;
            payloadTemplate?: any;
        }[] = [];

        for (const cmd of commands) {
            if (!cmd.topic.trim()) continue;
            let payload: any = undefined;
            if (cmd.payloadTemplate.trim()) {
                try {
                    payload = JSON.parse(cmd.payloadTemplate);
                } catch {
                    alert(`Payload JSON của lệnh ${cmd.code} không hợp lệ`);
                    return;
                }
            }
            parsedCommands.push({
                type: cmd.type,
                topic: cmd.topic.trim(),
                payloadTemplate: payload,
            });
        }

        let parsedOther: any = undefined;
        if (otherJson.trim()) {
            try {
                parsedOther = JSON.parse(otherJson);
            } catch {
                setOtherError('JSON cấu hình khác (other) không hợp lệ. Vui lòng kiểm tra lại.');
                return;
            }
        }

        const extra: any = {
            ...device.extraInfo,
            interval_message_time:
                intervalSeconds === '' ? undefined : Number(intervalSeconds),
            telemetry: {
                topic: telemetryTopic.trim(),
                qos: telemetryQos === '' ? undefined : (Number(telemetryQos) as 0 | 1 | 2),
            },
            commands: parsedCommands,
        };

        if (parsedOther !== undefined) {
            extra.other = parsedOther;
        } else {
            delete extra.other;
        }

        await onUpdateInfo?.(device.id, {
            name,
            serialNumber: serial,
            extraInfo: extra,
        });
        onClose();
    };

    return (
        <Dialog
            open={open}
            title={`Cài đặt thiết bị: ${device.name}`}
            onClose={onClose}
        >
            <div className={styles.dialogContent}>
                <div>
                    <h4 className={styles.sectionTitle}>Thông tin chung</h4>
                    <p className={styles.sectionDescription}>
                        Chỉnh sửa thông tin cơ bản của thiết bị.
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
                    </div>
                </div>

                <div>
                    <h4 className={styles.sectionTitle}>Cấu hình Telemetry</h4>
                    <p className={styles.sectionDescription}>
                        Thiết lập topic và QoS cho telemetry của thiết bị.
                    </p>
                    <div className={styles.fieldGrid}>
                        <span className={styles.label}>Topic telemetry</span>
                        <input
                            className={styles.input}
                            value={telemetryTopic}
                            onChange={(e) => setTelemetryTopic(e.target.value)}
                            placeholder="/devices/{deviceId}/telemetry"
                        />

                        <span className={styles.label}>QoS</span>
                        <select
                            className={styles.input}
                            value={telemetryQos}
                            onChange={(e) => setTelemetryQos(e.target.value)}
                        >
                            <option value="">Không đặt</option>
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>

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
                    <h4 className={styles.sectionTitle}>Lệnh điều khiển</h4>
                    <p className={styles.sectionDescription}>
                        Theo DeviceExtraInfo.commands (type / topic / payloadTemplate).
                    </p>
                    <div className={styles.commandList}>
                        {commands.map((cmd, idx) => (
                            <div key={idx} className={styles.commandRow}>
                                <label className={styles.labelInline}>
                                    Code
                                    <input
                                        className={styles.input}
                                        value={cmd.code}
                                        onChange={(e) => {
                                            const next = [...commands];
                                            next[idx].code = e.target.value;
                                            setCommands(next);
                                        }}
                                        placeholder="reset / reset_counter"
                                    />
                                </label>
                                <label className={styles.labelInline}>
                                    Type
                                    <select
                                        className={styles.input}
                                        value={cmd.type}
                                        onChange={(e) => {
                                            const next = [...commands];
                                            next[idx].type = e.target.value as CommandInput['type'];
                                            setCommands(next);
                                        }}
                                    >
                                        <option value="reset">reset</option>
                                        <option value="reset_counter">reset_counter</option>
                                        <option value="calibrate">calibrate</option>
                                        <option value="custom">custom</option>
                                    </select>
                                </label>
                                <label className={styles.labelInline}>
                                    Topic
                                    <input
                                        className={styles.input}
                                        value={cmd.topic}
                                        onChange={(e) => {
                                            const next = [...commands];
                                            next[idx].topic = e.target.value;
                                            setCommands(next);
                                        }}
                                        placeholder="/devices/{deviceId}/commands/reset"
                                    />
                                </label>
                                <label className={styles.labelInline}>
                                    Payload (JSON, tùy chọn)
                                    <input
                                        className={styles.input}
                                        value={cmd.payloadTemplate}
                                        onChange={(e) => {
                                            const next = [...commands];
                                            next[idx].payloadTemplate = e.target.value;
                                            setCommands(next);
                                        }}
                                        placeholder='{"action":"reset"}'
                                    />
                                </label>
                                <div className={styles.actionsRow}>
                                    <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={() => {
                                            const next = [...commands];
                                            next.splice(idx, 1);
                                            setCommands(next);
                                        }}
                                    >
                                        Xóa lệnh
                                    </button>
                                    {idx === commands.length - 1 && (
                                        <button
                                            type="button"
                                            className={styles.primaryButton}
                                            onClick={() =>
                                                setCommands((prev) => [
                                                    ...prev,
                                                    {
                                                        code: 'custom',
                                                        type: 'custom',
                                                        topic: '',
                                                        payloadTemplate: '',
                                                    },
                                                ])
                                            }
                                        >
                                            Thêm lệnh
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className={styles.sectionTitle}>Cấu hình khác (other)</h4>
                    <p className={styles.sectionDescription}>
                        Lưu trữ các cấu hình mở rộng cho thiết bị (trường{' '}
                        <code>other</code> trong DeviceExtraInfo).
                    </p>
                    <label className={styles.labelInline}>
                        JSON (tùy chọn)
                        <textarea
                            className={styles.input}
                            rows={4}
                            value={otherJson}
                            onChange={(e) => {
                                setOtherJson(e.target.value);
                                setOtherError(null);
                            }}
                            placeholder='{"note": "Ví dụ cấu hình riêng"}'
                        />
                    </label>
                    {otherError && <div className={styles.error}>{otherError}</div>}
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

