'use client';

import { Dialog } from '@/components/Dialog/Dialog';
import styles from './DeviceDialog.module.css';
import { Formik, Form } from 'formik';
import { InputField } from '@/components/InputField/InputField';
import { SelectField } from '@/components/SelectField/SelectField';
import * as Yup from 'yup';
import { DeviceInfo, PositionInfo } from '@/app/device-dashboard/page';
import { apiFetch } from '@/lib/http/http';

export interface DeviceFormValues {
    name: string;
    type: string;
    serial_number: string;
    device_id: string;
    positionId: number | '';
    interval_message_time: number;
    qosDefault: 0 | 1 | 2;
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
        qosDefault: (initialDevice?.extraInfo.qosDefault as 0 | 1 | 2) ?? 1,
    };

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

    const handleSubmit = async (values: DeviceFormValues, { setSubmitting }: any) => {
        const sub_topic = values.device_id
            ? `devices/${values.device_id}/telemetry`
            : undefined;

        const payload = {
            name: values.name,
            type: values.type || undefined,
            serial_number: values.serial_number,
            device_id: values.device_id,
            positionId: values.positionId,
            productionLineId: lineId,
            interval_message_time: values.interval_message_time,
            qosDefault: values.qosDefault,
            sub_topic,
        };

        const url = isEdit
            ? `${API_URL}/devices/${initialDevice?.id}`
            : `${API_URL}/devices`;
        const method = isEdit ? 'PUT' : 'POST';

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
                return;
            }

            const json = await res.json();
            const saved = json as DeviceInfo;
            onSaved?.(saved);
            onClose();
        } catch (error) {
            console.error('Error saving device', error);
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
                {({ values, isSubmitting }) => {
                    const subTopicPreview = values.device_id
                        ? `devices/${values.device_id}/telemetry`
                        : 'devices/{device_id}/telemetry';

                    return (
                        <Form className={styles.form}>
                            <div>
                                <h4 className={styles.sectionTitle}>Thông tin chung</h4>
                                <p className={styles.sectionDescription}>
                                    Nhập thông tin định danh và phân loại cho thiết bị.
                                </p>
                                <div className={styles.twoColumns}>
                                    <InputField
                                        name="name"
                                        label="Tên thiết bị"
                                        placeholder="Ví dụ: Sau máy ép 1"
                                    />
                                    <InputField
                                        name="type"
                                        label="Loại thiết bị"
                                        placeholder="Ví dụ: counter"
                                    />
                                    <InputField
                                        name="serial_number"
                                        label="Serial"
                                        placeholder="Nhập serial number"
                                    />
                                    <InputField
                                        name="device_id"
                                        label="Mã thiết bị (device_id)"
                                        placeholder="Ví dụ: SAU-ME-01"
                                    />
                                </div>
                            </div>

                            <div>
                                <h4 className={styles.sectionTitle}>Vị trí & gửi dữ liệu</h4>
                                <p className={styles.sectionDescription}>
                                    Cấu hình vị trí trên dây chuyền, QoS và chu kỳ gửi telemetry.
                                </p>
                                <div className={styles.twoColumns}>
                                    <SelectField name="positionId" label="Vị trí trên dây chuyền">
                                        <option value="">Chọn vị trí</option>
                                        {positions.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.index ? `${p.index}. ` : ''}{p.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <SelectField name="qosDefault" label="QoS mặc định">
                                        <option value={0}>0 - At most once</option>
                                        <option value={1}>1 - At least once</option>
                                        <option value={2}>2 - Exactly once</option>
                                    </SelectField>
                                    <InputField
                                        name="interval_message_time"
                                        type="number"
                                        min={1}
                                        max={60}
                                        label="Interval (giây)"
                                        placeholder="1 - 60, mặc định 60"
                                    />
                                </div>
                                <div>
                                    <p className={styles.sectionDescription}>Sub topic (readonly)</p>
                                    <div className={styles.subTopicBox}>{subTopicPreview}</div>
                                </div>
                            </div>

                            <div className={styles.metaRow}>
                                <span className={styles.metaLabel}>Dây chuyền</span>
                                <span className={styles.metaValue}>#{lineId}</span>
                            </div>

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

