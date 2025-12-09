'use client';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import styles from './page.module.css';
import { InputField } from '@/components/InputField/InputField';
import { Card, CardHeader } from '@/components/Card/Card';
import { Button } from '@/components/Button/Button';
import { AuthUser, useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/http/http';

interface LoginFormValues {
    identifier: string;
    password: string;
}

const initialValues: LoginFormValues = {
    identifier: '',
    password: '',
};

const LoginSchema = Yup.object().shape({
    identifier: Yup.string()
        .required('Vui lòng nhập tên đăng nhập')
        .trim(),
    password: Yup.string()
        .required('Vui lòng nhập mật khẩu')
        .trim(),
});

export default function Page() {
    const setAuth = useAuthStore((s) => s.setAuth);
    const router = useRouter();
    const [loginError, setLoginError] = useState<string | null>(null);

    const handleSubmit = async (values: LoginFormValues) => {
        try {
            setLoginError(null);

   
            const loginResult = await apiFetch(`/auth/login`, {
                method: 'POST',
                body: JSON.stringify(values),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            console.log(loginResult);

            if (!loginResult.ok) {
                let message =
                    'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
                try {
                    const errorBody = await loginResult.json();
                    if (errorBody?.message) {
                        message = errorBody.message;
                    }
                } catch {
                    // ignore parse error, dùng message mặc định
                }
                setLoginError(message);
                return;
            }

            const loginData = (await loginResult.json()) as {
                tokens?: { accessToken: string; refreshtoken: string };
                user?: AuthUser;
                sessionId?: string;
            };
            console.log(loginData)

            const { user, tokens } = loginData;
            console.log(user && tokens?.accessToken)
            if (user && tokens?.accessToken) {
                setAuth({ user, accessToken: tokens.accessToken });
                console.log("REDIRECt")
                router.push('/dashboard');
            } else {
                setLoginError(
                    'Không nhận được thông tin đăng nhập hợp lệ từ máy chủ.',
                );
            }
        } catch (error) {
            console.error('Login error', error);
            setLoginError(
                'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.',
            );
        }
    };

    return (
        <div className={styles.container}>
            {/* LEFT HERO */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.badge}>
                        <span className={styles.badgeIcon} />
                    </div>

                    <h1 className={styles.title}>
                        Hệ thống
                        <br />
                        <span className={styles.titleAccent}>
                            Quản lý sản lượng gạch
                        </span>
                    </h1>

                    <p className={styles.footerNote}>
                        Ac 2025 Vincenza Tech Team. All rights reserved.
                    </p>
                </div>
            </section>

            {/* RIGHT FORM */}
            <section className={styles.authSection}>
                <div className={styles.authWrapper}>
                    <div className={styles.brand}>
                        <span className={styles.brandDot} />
                        <span className={styles.brandText}>
                            Hệ thống IOT tự động hóa - cung cấp thông tin trực
                            quan trong vận hành khâu sản xuất
                        </span>
                    </div>

                    <Card>
                        <CardHeader title="Đăng nhập" />
                        <Formik
                            initialValues={initialValues}
                            validationSchema={LoginSchema}
                            onSubmit={handleSubmit}
                            validateOnBlur
                        >
                            {({ isSubmitting }) => (
                                <Form className={styles.form} noValidate>
                                    <InputField
                                        name="identifier"
                                        label="Tên đăng nhập"
                                        placeholder="Email hoặc tên đăng nhập của bạn"
                                    />

                                    <InputField
                                        name="password"
                                        label="Mật khẩu"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Điền mật khẩu"
                                    />

                                    <Button type="submit" loading={isSubmitting}>
                                        Đăng nhập ngay
                                    </Button>

                                    {loginError && (
                                        <p className={styles.formError}>
                                            {loginError}
                                        </p>
                                    )}
                                </Form>
                            )}
                        </Formik>
                    </Card>
                </div>
            </section>
        </div>
    );
}

