'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog/Dialog';
import styles from './DeviceClusterDialog.module.css';
import { Formik, Form } from 'formik';
import { InputField } from '@/components/InputField/InputField';
import { SelectField } from '@/components/SelectField/SelectField';
import * as Yup from 'yup';
import {
    DeviceClusterInfo,
    MeasurementTypeInfo,
} from '@/app/device-dashboard/page';
import { apiFetch } from '@/lib/http/http';

interface DeviceClusterDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    measurementTypes: MeasurementTypeInfo[];
    initialCluster?: DeviceClusterInfo | null;
    productionLineId: number;
    onClose: () => void;
    onSaved?: (cluster: DeviceClusterInfo) => void;
}

interface ClusterFormValues {
    name: string;
    code: string;
    description: string;
    measurementTypeId: string;
    telemetryTopic: string;
    telemetryQos: string;
    intervalMessageTime: string;
    otherJson: string;
    productionLineId: number;
    commands: {
        code: string;
        name: string;
        topic: string;
        payloadTemplate: string;
    }[];
}

const validationSchema = Yup.object({
    name: Yup.string().required('Vui lòng nhập tên nhóm thiết bị'),
    code: Yup.string().required('Vui lòng nhập mã nhóm'),
    measurementTypeId: Yup.string().required(
        'Vui lòng chọn measurement type',
    ),
});

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

export function DeviceClusterDialog({
    open,
    mode,
    productionLineId,
    measurementTypes,
    initialCluster,
    onClose,
    onSaved,
}: DeviceClusterDialogProps) {
    const [formError, setFormError] = useState<string | null>(null);
    const isEdit = mode === 'edit' && !!initialCluster;

    const initialCommands =
        initialCluster?.config?.commands?.map((c) => ({
            code: c.code || '',
            name: c.name || '',
            topic: c.topic || '',
            payloadTemplate: c.payloadTemplate
                ? JSON.stringify(c.payloadTemplate, null, 2)
                : '',
        })) ?? [];

    const initialValues: ClusterFormValues = {
        name: initialCluster?.name ?? '',
        code: initialCluster?.code ?? '',
        productionLineId,
        description: initialCluster?.description ?? '',
        measurementTypeId: initialCluster?.measurementTypeId
            ? String(initialCluster.measurementTypeId)
            : '',
        telemetryTopic: initialCluster?.config?.telemetry?.topic ?? '',
        telemetryQos:
            initialCluster?.config?.telemetry?.qos?.toString() ??
            initialCluster?.config?.qosDefault?.toString() ??
            '',
        intervalMessageTime: initialCluster?.config?.interval_message_time
            ? String(initialCluster.config.interval_message_time)
            : '',
        commands: initialCommands.length
            ? initialCommands
            : [
                  {
                      code: 'reset',
                      name: 'Reset',
                      topic: '/devices/{deviceId}/commands/reset',
                      payloadTemplate: '',
                  },
              ],
        otherJson: initialCluster?.config?.other
            ? JSON.stringify(initialCluster.config.other, null, 2)
            : '',
    };

    const handleSubmit = async (
        values: ClusterFormValues,
        { setSubmitting }: any,
    ) => {
        setFormError(null);

        const qosValue =
            values.telemetryQos !== ''
                ? (Number(values.telemetryQos) as 0 | 1 | 2)
                : undefined;
        const intervalValue = values.intervalMessageTime
            ? Number(values.intervalMessageTime)
            : undefined;

        const commands: {
            code: string;
            name?: string;
            topic: string;
            payloadTemplate?: any;
        }[] = [];

        for (const cmd of values.commands) {
            if (!cmd.code.trim() || !cmd.topic.trim()) continue;
            let payload: any = undefined;
            if (cmd.payloadTemplate.trim()) {
                try {
                    payload = JSON.parse(cmd.payloadTemplate);
                } catch {
                    alert(
                        `Payload JSON của lệnh ${cmd.code} không hợp lệ.`,
                    );
                    setSubmitting(false);
                    return;
                }
            }
            commands.push({
                code: cmd.code.trim(),
                name: cmd.name.trim() || undefined,
                topic: cmd.topic.trim(),
                payloadTemplate: payload,
            });
        }

        let otherObj: Record<string, any> | undefined = undefined;
        if (values.otherJson.trim()) {
            try {
                otherObj = JSON.parse(values.otherJson);
            } catch {
                alert('Other (JSON) không hợp lệ. Vui lòng kiểm tra lại.');
                setSubmitting(false);
                return;
            }
        }

        const payload: Partial<DeviceClusterInfo> = {
            name: values.name.trim(),
            code: values.code.trim(),
            description: values.description.trim() || undefined,
            productionLineId: values.productionLineId,
            measurementTypeId: values.measurementTypeId
                ? Number(values.measurementTypeId)
                : undefined,
            config: {
                qosDefault: qosValue,
                interval_message_time: intervalValue,
                telemetry: values.telemetryTopic
                    ? {
                          topic: values.telemetryTopic.trim(),
                          qos: qosValue,
                      }
                    : undefined,
                commands: commands.length ? commands : undefined,
                other: otherObj,
            },
        };

        const url = isEdit
            ? `${API_URL}/device-clusters/${initialCluster?.id}`
            : `${API_URL}/device-clusters`;
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
                console.error('Lưu device cluster thất bại');
                let message =
                    'Lưu device cluster thất bại. Vui lòng thử lại.';
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

            const json = (await res.json()) as DeviceClusterInfo;
            const mt = measurementTypes.find(
                (m) => m.id === payload.measurementTypeId,
            );
            const enriched = mt ? { ...json, measurementType: mt } : json;
            onSaved?.(enriched);
            onClose();
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (error) {
            console.error('Lỗi khi lưu device cluster', error);
            setFormError('Có lỗi xảy ra khi lưu device cluster.');
        } finally {
            setSubmitting(false);
        }
    };

    const title = isEdit
        ? 'Cập nhật device cluster'
        : 'Thêm device cluster';

    return (
        <Dialog open={open} title={title} onClose={onClose}>
            <div className={styles.dialogContent}>
                <Formik
                    initialValues={initialValues}
                    enableReinitialize
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ isSubmitting, values, handleChange, setFieldValue }) => (
                        <Form className={styles.form}>
                            <div className={styles.sectionBox}>
                                <h4 className={styles.sectionTitle}>
                                    Thông tin chung
                                </h4>
                                <p className={styles.sectionDescription}>
                                    Đặt tên, mã và mô tả cho nhóm thiết bị.
                                </p>
                                <div className={styles.twoColumns}>
                                    <InputField
                                        name="name"
                                        label="Tên nhóm thiết bị"
                                        placeholder="VD: Băng đo gạch"
                                    />
                                    <InputField
                                        name="code"
                                        label="Mã nhóm (code)"
                                        placeholder="VD: BRICK_COUNTER"
                                    />
                                </div>
                                <InputField
                                    name="description"
                                    label="Mô tả"
                                    placeholder="Mô tả ngắn về nhóm thiết bị"
                                />
                            </div>

                            <div className={styles.sectionBox}>
                                <h4 className={styles.sectionTitle}>
                                    Cấu hình đo lường & MQTT
                                </h4>
                                <p className={styles.sectionDescription}>
                                    Cấu trúc theo ClusterConfig (telemetry,
                                    QoS, interval, commands).
                                </p>
                                <div className={styles.twoColumns}>
                                    <SelectField
                                        name="measurementTypeId"
                                        label="Measurement type"
                                    >
                                        <option value="">
                                            Chọn measurement type
                                        </option>
                                        {measurementTypes.map((mt) => (
                                            <option key={mt.id} value={mt.id}>
                                                {mt.code} - {mt.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <InputField
                                        name="telemetryTopic"
                                        label="Telemetry topic"
                                        placeholder="VD: /devices/{clusterId}/telemetry"
                                    />
                                    <SelectField
                                        name="telemetryQos"
                                        label="QoS mặc định"
                                    >
                                        <option value="">
                                            Không thiết lập
                                        </option>
                                        <option value="0">
                                            0 - At most once
                                        </option>
                                        <option value="1">
                                            1 - At least once
                                        </option>
                                        <option value="2">
                                            2 - Exactly once
                                        </option>
                                    </SelectField>
                                    <InputField
                                        name="intervalMessageTime"
                                        label="Chu kỳ gửi (giây)"
                                        type="number"
                                        min={1}
                                        placeholder="VD: 60"
                                    />
                                    <div className={styles.commandListWrapper}>
                                        <p
                                            className={
                                                styles.sectionDescription
                                            }
                                        >
                                            Danh sách lệnh (code, topic,
                                            payloadTemplate JSON tùy chọn)
                                        </p>
                                        <div className={styles.commandList}>
                                            {values.commands.map(
                                                (cmd, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={
                                                            styles.commandRow
                                                        }
                                                    >
                                                        <InputField
                                                            name={`commands[${idx}].code`}
                                                            label="Code"
                                                            placeholder="reset / reset_counter / pause_line"
                                                        />
                                                        <InputField
                                                            name={`commands[${idx}].name`}
                                                            label="Tên hiển thị"
                                                            placeholder="Tên lệnh"
                                                        />
                                                        <InputField
                                                            name={`commands[${idx}].topic`}
                                                            label="Topic"
                                                            placeholder="VD: /devices/{deviceId}/commands/reset"
                                                        />
                                                        <InputField
                                                            name={`commands[${idx}].payloadTemplate`}
                                                            label="Payload (JSON, tùy chọn)"
                                                            placeholder='VD: {"action":"reset"}'
                                                        />
                                                        <div
                                                            className={
                                                                styles.commandActions
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                className={`${styles.smallBtn} ${styles.danger}`}
                                                                onClick={() => {
                                                                    const next =
                                                                        [
                                                                            ...values.commands,
                                                                        ];
                                                                    next.splice(
                                                                        idx,
                                                                        1,
                                                                    );
                                                                    setFieldValue(
                                                                        'commands',
                                                                        next,
                                                                    );
                                                                }}
                                                            >
                                                                Xóa
                                                            </button>
                                                            {idx ===
                                                                values.commands
                                                                    .length -
                                                                    1 && (
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        styles.smallBtn
                                                                    }
                                                                    onClick={() =>
                                                                        setFieldValue(
                                                                            'commands',
                                                                            [
                                                                                ...values.commands,
                                                                                {
                                                                                    code: '',
                                                                                    name: '',
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
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className={styles.sectionDescription}>
                                        Other (tùy chọn, JSON) để bổ sung
                                        thông tin vào ClusterConfig.other
                                    </p>
                                    <textarea
                                        className={styles.textarea}
                                        name="otherJson"
                                        value={values.otherJson}
                                        onChange={handleChange}
                                        placeholder='VD: {"note":"Config mở rộng"}'
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className={styles.actions}>
                                    <div
                                        className={styles.sectionDescription}
                                        style={{
                                            color: '#b91c1c',
                                            background: '#fef2f2',
                                            border: '1px solid #fecdd3',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: 8,
                                        }}
                                    >
                                        {formError}
                                    </div>
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
                                        ? 'Cập nhật'
                                        : 'Thêm cluster'}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </Dialog>
    );
}
