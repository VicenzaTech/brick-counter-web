'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog/Dialog';
import styles from './DeviceDialog.module.css';
import { Formik, Form } from 'formik';
import { InputField } from '@/components/InputField/InputField';
import { SelectField } from '@/components/SelectField/SelectField';
import * as Yup from 'yup';
import { DeviceInfo, PositionInfo } from '@/app/device-dashboard/page';
import { apiFetch } from '@/lib/http/http';

type DeviceCommandType = 'reset' | 'reset_counter' | 'calibrate' | 'custom';

export interface DeviceFormValues {
    name: string;
    type: string;
    serial_number: string;
    device_id: string;
    positionId: number | '';
    interval_message_time: number;
    qosDefault: 0 | 1 | 2;
    telemetryTopic: string;
    commands: {
        type: DeviceCommandType;
        topic: string;
        payloadTemplate: string;
    }[];
    otherJson: string;
}

const validationSchema = Yup.object({
    name: Yup.string().required('Vui lòng nhập tên thiết bị'),
    type: Yup.string().required('Vui lòng nhập loại thiết bị'),
    serial_number: Yup.string().required('Vui lòng nhập serial'),
    device_id: Yup.string().required('Vui lòng nhập mã thiết bị'),
    positionId: Yup.number()
        .typeError('Vui lòng chọn vị trí')
        .required('Vui lòng chọn vị trí'),
    interval_message_time: Yup.number()
        .min(1, 'Tối thiểu 1 giây')
        .max(60, 'Tối đa 60 giây')
        .required('Vui lòng nhập interval'),
    qosDefault: Yup.mixed<0 | 1 | 2>()
        .oneOf([0, 1, 2] as const, 'QoS không hợp lệ')
        .required('Vui lòng chọn QoS'),
});

interface DeviceDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    lineId: number;
    positions: PositionInfo[];
    initialDevice?: DeviceInfo | null;
    onClose: () => void;
    onSaved?: (device: DeviceInfo) => void;
}

export function DeviceDialog({
    open,
    mode,
    lineId,
    positions,
    initialDevice,
    onClose,
    onSaved,
}: DeviceDialogProps) {
    const [formError, setFormError] = useState<string | null>(null);
    const isEdit = mode === 'edit' && !!initialDevice;

    const initialValues: DeviceFormValues = {
        name: initialDevice?.name ?? '',
        type: (initialDevice as any)?.type ?? '',
        serial_number: initialDevice?.serialNumber ?? '',
        device_id: initialDevice?.deviceId ?? '',
        positionId:
            initialDevice && positions.length
                ? positions.find((p) =>
                      (p.devices || []).some((d) => d.id === initialDevice.id),
                  )?.id ?? ''
                : '',
        interval_message_time:
            initialDevice?.extraInfo.interval_message_time ?? 60,
        qosDefault:
            (initialDevice?.extraInfo.telemetry?.qos as 0 | 1 | 2) ?? 1,
        telemetryTopic:
            initialDevice?.extraInfo.telemetry?.topic ??
            (initialDevice?.deviceId
                ? `devices/${initialDevice.deviceId}/telemetry`
                : ''),
        commands:
            initialDevice?.extraInfo.commands?.map((c) => ({
                type: (c.type as DeviceCommandType) ?? 'custom',
                topic: c.topic ?? '',
                payloadTemplate: c.payloadTemplate
                    ? JSON.stringify(c.payloadTemplate, null, 2)
                    : '',
            })) ?? [
                {
                    type: 'reset',
                    topic: '/devices/{deviceId}/commands/reset',
                    payloadTemplate: '',
                },
                {
                    type: 'reset_counter',
                    topic: '/devices/{deviceId}/commands/reset_counter',
                    payloadTemplate: '',
                },
            ],
        otherJson: initialDevice?.extraInfo.other
            ? JSON.stringify(initialDevice.extraInfo.other, null, 2)
            : '',
    };

    const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

    const handleSubmit = async (
        values: DeviceFormValues,
        { setSubmitting }: any,
    ) => {
        setFormError(null);

        const telemetryTopic =
            values.telemetryTopic.trim() ||
            (values.device_id
                ? `devices/${values.device_id}/telemetry`
                : undefined);

        const commands: {
            type: DeviceCommandType;
            topic: string;
            payloadTemplate?: any;
        }[] = [];

        for (const cmd of values.commands) {
            if (!cmd.topic.trim()) continue;

            let payload: any = undefined;
            if (cmd.payloadTemplate.trim()) {
                try {
                    payload = JSON.parse(cmd.payloadTemplate);
                } catch {
                    alert(
                        `Payload JSON của lệnh ${cmd.type} không hợp lệ.`,
                    );
                    setSubmitting(false);
                    return;
                }
            }

            commands.push({
                type: cmd.type,
                topic: cmd.topic.trim(),
                payloadTemplate: payload,
            });
        }

        let other: any = undefined;
        if (values.otherJson.trim()) {
            try {
                other = JSON.parse(values.otherJson);
            } catch {
                alert(
                    'JSON cấu hình khác (other) không hợp lệ. Vui lòng kiểm tra lại.',
                );
                setSubmitting(false);
                return;
            }
        }

        const payload = {
            name: values.name,
            type: values.type || undefined,
            serial_number: values.serial_number,
            device_id: values.device_id,
            positionId: values.positionId,
            productionLineId: lineId,
            interval_message_time: values.interval_message_time,
            qosDefault: values.qosDefault,
            telemetryTopic,
            commands,
            other,
        };

        const url = isEdit
            ? `${API_URL}/devices/${initialDevice?.id}`
            : `${API_URL}/devices`;
        const method = isEdit ? 'PATCH' : 'POST';

        try {
            const res = await apiFetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                console.error('Error saving device');
                let message =
                    'Lưu thiết bị thất bại. Vui lòng thử lại.';
                try {
                    const errorBody = await res.json();
                    if (errorBody?.message) {
                        message = errorBody.message;
                    }
                } catch {
                    // ignore parse error, dùng message mặc định
                }
                setFormError(message);
                return;
            }

            const json = (await res.json()) as DeviceInfo;
            onSaved?.(json);
            onClose();
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error saving device', error);
            setFormError('Có lỗi xảy ra khi lưu thiết bị.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            title={isEdit ? 'Cập nhật thiết bị' : 'Thêm thiết bị mới'}
            onClose={onClose}
        >
            <Formik
                initialValues={initialValues}
                enableReinitialize
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ values, isSubmitting, setFieldValue }) => {
                    const subTopicPreview = values.device_id
                        ? `devices/${values.device_id}/telemetry`
                        : 'devices/{deviceId}/telemetry';

                    return (
                        <Form className={styles.form}>
                            <div>
                                <h4 className={styles.sectionTitle}>
                                    Thông tin chung
                                </h4>
                                <p className={styles.sectionDescription}>
                                    Nhập thông tin định danh và phân loại
                                    cho thiết bị.
                                </p>
                                <div className={styles.twoColumns}>
                                    <InputField
                                        name="name"
                                        label="Tên thiết bị"
                                        placeholder="VD: Sau máy Acp 1"
                                    />
                                    <InputField
                                        name="type"
                                        label="Loại thiết bị"
                                        placeholder="VD: counter"
                                    />
                                    <InputField
                                        name="serial_number"
                                        label="Serial"
                                        placeholder="Nhập serial number"
                                    />
                                    <InputField
                                        name="device_id"
                                        label="Mã thiết bị (device_id)"
                                        placeholder="VD: SAU-ME-01"
                                    />
                                </div>
                            </div>

                            <div>
                                <h4 className={styles.sectionTitle}>
                                    Vị trí & gửi dữ liệu
                                </h4>
                                <p className={styles.sectionDescription}>
                                    Cấu hình vị trí trên dây chuyền, QoS và
                                    chu kỳ gửi telemetry.
                                </p>
                                <div className={styles.twoColumns}>
                                    <SelectField
                                        name="positionId"
                                        label="Vị trí trên dây chuyền"
                                    >
                                        <option value="">Chọn vị trí</option>
                                        {positions.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.index ? `${p.index}. ` : ''}
                                                {p.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <SelectField
                                        name="qosDefault"
                                        label="QoS mặc định"
                                    >
                                        <option value={0}>
                                            0 - At most once
                                        </option>
                                        <option value={1}>
                                            1 - At least once
                                        </option>
                                        <option value={2}>
                                            2 - Exactly once
                                        </option>
                                    </SelectField>
                                    <InputField
                                        name="interval_message_time"
                                        type="number"
                                        min={1}
                                        max={60}
                                        label="Interval (giây)"
                                        placeholder="1 - 60, mặc định 60"
                                    />
                                    <InputField
                                        name="telemetryTopic"
                                        label="Telemetry topic (tùy chọn)"
                                        placeholder={subTopicPreview}
                                    />
                                </div>
                            </div>

                            <div>
                                <h4 className={styles.sectionTitle}>
                                    Lệnh điều khiển
                                </h4>
                                <p className={styles.sectionDescription}>
                                    Cấu hình danh sách lệnh MQTT cho thiết
                                    bị.
                                </p>
                                <div className={styles.commandList}>
                                    {values.commands.map((cmd, idx) => (
                                        <div
                                            key={idx}
                                            className={styles.commandRow}
                                        >
                                            <label
                                                className={
                                                    styles.labelInline
                                                }
                                            >
                                                Loại lệnh
                                                <select
                                                    className={styles.input}
                                                    value={cmd.type}
                                                    onChange={(e) => {
                                                        const next = [
                                                            ...values.commands,
                                                        ];
                                                        next[idx].type =
                                                            e.target
                                                                .value as DeviceCommandType;
                                                        setFieldValue(
                                                            'commands',
                                                            next,
                                                        );
                                                    }}
                                                >
                                                    <option value="reset">
                                                        reset
                                                    </option>
                                                    <option value="reset_counter">
                                                        reset_counter
                                                    </option>
                                                    <option value="calibrate">
                                                        calibrate
                                                    </option>
                                                    <option value="custom">
                                                        custom
                                                    </option>
                                                </select>
                                            </label>
                                            <label
                                                className={
                                                    styles.labelInline
                                                }
                                            >
                                                Topic
                                                <input
                                                    className={styles.input}
                                                    value={cmd.topic}
                                                    onChange={(e) => {
                                                        const next = [
                                                            ...values.commands,
                                                        ];
                                                        next[idx].topic =
                                                            e.target.value;
                                                        setFieldValue(
                                                            'commands',
                                                            next,
                                                        );
                                                    }}
                                                    placeholder="/devices/{deviceId}/commands/reset"
                                                />
                                            </label>
                                            <label
                                                className={
                                                    styles.labelInline
                                                }
                                            >
                                                Payload (JSON, tùy chọn)
                                                <input
                                                    className={styles.input}
                                                    value={cmd.payloadTemplate}
                                                    onChange={(e) => {
                                                        const next = [
                                                            ...values.commands,
                                                        ];
                                                        next[
                                                            idx
                                                        ].payloadTemplate =
                                                            e.target.value;
                                                        setFieldValue(
                                                            'commands',
                                                            next,
                                                        );
                                                    }}
                                                    placeholder='{"action":"reset"}'
                                                />
                                            </label>
                                            <div
                                                className={styles.actionsRow}
                                            >
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.secondaryButton
                                                    }
                                                    onClick={() => {
                                                        const next = [
                                                            ...values.commands,
                                                        ];
                                                        next.splice(idx, 1);
                                                        setFieldValue(
                                                            'commands',
                                                            next,
                                                        );
                                                    }}
                                                >
                                                    Xóa lệnh
                                                </button>
                                                {idx ===
                                                    values.commands.length -
                                                        1 && (
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.primaryButton
                                                        }
                                                        onClick={() =>
                                                            setFieldValue(
                                                                'commands',
                                                                [
                                                                    ...values.commands,
                                                                    {
                                                                        type: 'custom' as DeviceCommandType,
                                                                        topic: '',
                                                                        payloadTemplate:
                                                                            '',
                                                                    },
                                                                ],
                                                            )
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
                                <h4 className={styles.sectionTitle}>
                                    Cấu hình khác (other)
                                </h4>
                                <p className={styles.sectionDescription}>
                                    Lưu trữ các cấu hình mở rộng cho thiết bị
                                    (trường <code>other</code> trong
                                    DeviceExtraInfo).
                                </p>
                                <textarea
                                    className={styles.textarea}
                                    rows={3}
                                    value={values.otherJson}
                                    onChange={(e) =>
                                        setFieldValue(
                                            'otherJson',
                                            e.target.value,
                                        )
                                    }
                                    placeholder='{"note": "Ví dụ cấu hình riêng"}'
                                />
                            </div>

                            <div className={styles.metaRow}>
                                <span className={styles.metaLabel}>
                                    Dây chuyền
                                </span>
                                <span className={styles.metaValue}>
                                    #{lineId}
                                </span>
                            </div>

                            {formError && (
                                <div className={styles.formError}>
                                    {formError}
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? 'Đang lưu...'
                                        : isEdit
                                        ? 'Cập nhật thiết bị'
                                        : 'Thêm thiết bị'}
                                </button>
                            </div>
                        </Form>
                    );
                }}
            </Formik>
        </Dialog>
    );
}
