'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog/Dialog';
import styles from './PositionDialog.module.css';
import { Formik, Form } from 'formik';
import { InputField } from '@/components/InputField/InputField';
import { PositionInfo } from '@/app/device-dashboard/page';
import { apiFetch } from '@/lib/http/http';

interface PositionDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    lineId: number;
    maxIndex: number;
    initialPosition?: PositionInfo | null;
    onClose: () => void;
    onSaved?: (position: PositionInfo) => void;
}

interface PositionFormValues {
    name: string;
    description: string;
}

export function PositionDialog({
    open,
    mode,
    lineId,
    maxIndex,
    initialPosition,
    onClose,
    onSaved,
}: PositionDialogProps) {
    const [formError, setFormError] = useState<string | null>(null);
    const isEdit = mode === 'edit';
    const initialValues: PositionFormValues = {
        name: initialPosition?.name ?? '',
        description: initialPosition?.description ?? '',
    };

    const handleSubmit = async (values: PositionFormValues, { setSubmitting }: any) => {
        setFormError(null);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';
        const index = initialPosition?.index ?? maxIndex + 1;

        const payload = {
            name: values.name,
            description: values.description || null,
            productionLineId: lineId,
            index,
        };

        const url = isEdit
            ? `${API_URL}/positions/${initialPosition?.id}`
            : `${API_URL}/positions`;

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
                console.error('Error saving position');
                let message =
                    'Lưu vị trí thất bại. Vui lòng thử lại.';
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

            const json = await res.json();
            const saved: PositionInfo = {
                id: json.id,
                name: json.name,
                description: json.description,
                index: json.index,
                devices: json.devices,
            };

            onSaved?.(saved);
            onClose();
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error saving position', error);
            setFormError('Có lỗi xảy ra khi lưu vị trí.');
        } finally {
            setSubmitting(false);
        }
    };

    const effectiveIndex = initialPosition?.index ?? maxIndex + 1;

    return (
        <Dialog
            open={open}
            title={isEdit ? 'Cập nhật vị trí' : 'Thêm vị trí mới'}
            onClose={onClose}
        >
            <Formik
                initialValues={initialValues}
                enableReinitialize
                onSubmit={handleSubmit}
            >
                {({ isSubmitting }) => (
                    <Form className={styles.form}>
                        <InputField
                            name="name"
                            label="Tên vị trí"
                            placeholder="Nhập tên vị trí"
                        />
                        <InputField
                            name="description"
                            label="Mô tả"
                            placeholder="Mô tả ngắn"
                        />

                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>Dây chuyền</span>
                            <span className={styles.metaValue}>#{lineId}</span>
                        </div>
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>Index</span>
                            <span className={styles.metaValue}>{effectiveIndex}</span>
                        </div>

                        {formError && (
                            <div className={styles.formError}>{formError}</div>
                        )}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={onClose}
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
                                    : 'Thêm mới'}
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
}

