'use client';

import { Dialog } from '@/components/Dialog/Dialog';
import { MeasurementTypeInfo } from '@/app/device-dashboard/page';
import styles from './MeasurementTypeDialog.module.css';
import { Formik, Form } from 'formik';
import { InputField } from '@/components/InputField/InputField';
import * as Yup from 'yup';
import { useMemo } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

interface MeasurementTypeDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: MeasurementTypeInfo | null;
    onClose: () => void;
    onSaved?: (mt: MeasurementTypeInfo) => void;
}

interface MeasurementTypeFormValues {
    code: string;
    name: string;
    description: string;
    data_schema_version: string;
    data_schema: string;
}

const validationSchema = Yup.object({
    code: Yup.string().required('Vui lòng nhập code.'),
    name: Yup.string().required('Vui lòng nhập tên.'),
    data_schema_version: Yup.number()
        .typeError('Version phải là số.')
        .min(1, 'Version phải >= 1')
        .required('Vui lòng nhập version.'),
    data_schema: Yup.string().required('Vui lòng nhập JSON Schema.'),
});

export function MeasurementTypeDialog({
    open,
    mode,
    initial,
    onClose,
    onSaved,
}: MeasurementTypeDialogProps) {
    const initialValues: MeasurementTypeFormValues = useMemo(
        () => ({
            code: initial?.code ?? '',
            name: initial?.name ?? '',
            description: initial?.description ?? '',
            data_schema_version: String(initial?.data_schema_version ?? 1),
            data_schema: initial?.data_schema
                ? JSON.stringify(initial.data_schema, null, 2)
                : '{\n  "type": "object"\n}',
        }),
        [initial],
    );

    const handleSubmit = async (
        values: MeasurementTypeFormValues,
        { setSubmitting, setFieldError }: any,
    ) => {
        let parsedSchema: Record<string, any>;
        try {
            parsedSchema = JSON.parse(values.data_schema);
        } catch {
            setFieldError('data_schema', 'JSON Schema không hợp lệ. Vui lòng kiểm tra lại.');
            setSubmitting(false);
            return;
        }

        const payload = {
            code: values.code.trim(),
            name: values.name.trim(),
            description: values.description.trim() || undefined,
            data_schema_version: Number(values.data_schema_version) || 1,
            data_schema: parsedSchema,
        };

        const url =
            mode === 'edit' && initial
                ? `${API_URL}/measurement-types/${initial.id}`
                : `${API_URL}/measurement-types`;
        const method = mode === 'edit' ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                // TODO: có thể parse lỗi chi tiết từ backend
                setFieldError('code', 'Lưu measurement type thất bại. Vui lòng thử lại.');
                setSubmitting(false);
                return;
            }
            const saved = (await res.json()) as MeasurementTypeInfo;
            onSaved?.(saved);
            onClose();
        } catch (err) {
            console.error('Error saving measurement type', err);
            setFieldError('code', 'Có lỗi xảy ra khi lưu measurement type.');
        } finally {
            setSubmitting(false);
        }
    };

    const title =
        mode === 'edit' ? 'Chỉnh sửa measurement type' : 'Thêm measurement type mới';

    return (
        <Dialog open={open} title={title} onClose={onClose}>
            <Formik
                initialValues={initialValues}
                enableReinitialize
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ isSubmitting, values, handleChange, handleBlur, errors, touched }) => (
                    <Form className={styles.content}>
                        <div className={styles.grid}>
                            <InputField
                                name="code"
                                label="Code"
                                placeholder="BRICK_COUNTER"
                            />
                            <InputField
                                name="name"
                                label="Tên"
                                placeholder="Đếm gạch"
                            />
                            <InputField
                                name="description"
                                label="Mô tả"
                                placeholder="Mô tả ngắn"
                            />
                            <InputField
                                name="data_schema_version"
                                type="number"
                                label="Schema version"
                                min={1}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>
                                JSON SchemaDD
                            </label>
                            <textarea
                                id="data_schema"
                                name="data_schema"
                                className={`${styles.textarea} ${touched.data_schema && errors.data_schema
                                    ? styles.textareaError
                                    : ''
                                    }`}
                                value={values.data_schema}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder='{"type":"object","properties":{"count":{"type":"number"}}}'
                            />
                            {touched.data_schema && errors.data_schema && (
                                <div className={styles.error}>{errors.data_schema}</div>
                            )}
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
                                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
}

