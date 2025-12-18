'use client';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import styles from './page.module.css';
import { InputField } from '@/components/InputField/InputField';
import { Button } from '@/components/Button/Button';
import { AuthUser, useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/http/http';
import Link from 'next/link';
import Image from 'next/image';
import { Box } from 'lucide-react';

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
        .required('Vui lòng nhập email hoặc tên đăng nhập')
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

            if (!loginResult.ok) {
                let message =
                    'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
                try {
                    const errorBody = await loginResult.json();
                    if (errorBody?.message) {
                        message = errorBody.message;
                    }
                } catch {
                    // ignore parse error
                }
                setLoginError(message);
                return;
            }

            const loginData = (await loginResult.json()) as {
                tokens?: { accessToken: string; refreshtoken: string };
                user?: AuthUser;
                sessionId?: string;
            };

            const { user, tokens } = loginData;
            if (user && tokens?.accessToken) {
                setAuth({ user, accessToken: tokens.accessToken });
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
            {/* LEFT SIDE: HERO */}
            <section className={styles.hero}>
                <Image 
                    src="/login-bg-modern.png" 
                    alt="Industrial IoT Background" 
                    fill 
                    className={styles.heroBackground}
                    priority
                />
                <div className={styles.brandLogo}>
                    <div className={styles.logoIcon}>
                        <Box size={24} strokeWidth={2.5} />
                    </div>
                    <span className={styles.logoText}>VicenzaTech</span>
                </div>

                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Hệ thống <br/> Quản lý sản xuất
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Tự động hóa, giám sát theo thời gian thực và tối ưu hóa quy trình sản xuất gạch men.
                    </p>
                    <div className={styles.featureList}>
                        <span className={styles.featureTag}>IoT Integration</span>
                        <span className={styles.featureTag}>Real-time Analytics</span>
                        <span className={styles.featureTag}>Production Tracking</span>
                    </div>
                </div>

                <p className={styles.footerNote}>
                    © 2025 Vicenza Tech Team. Enterprise System.
                </p>
            </section>

            {/* RIGHT SIDE: AUTH FORM */}
            <section className={styles.authSection}>
                <div className={styles.authWrapper}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>Chào mừng trở lại</h2>
                        <p className={styles.formSubtitle}>
                            Nhập thông tin xác thực để truy cập hệ thống
                        </p>
                    </div>

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
                                    label="Email hoặc Tên đăng nhập"
                                    placeholder="name@company.com"
                                    autoComplete="username"
                                />

                                <div>
                                    <InputField
                                        name="password"
                                        label="Mật khẩu"
                                        type="password"
                                        placeholder="Nhập mật khẩu của bạn"
                                        autoComplete="current-password"
                                    />
                                    <div className={styles.actionsRow} style={{ marginTop: '0.5rem' }}>
                                        <div /> {/* Spacer for flex-between */}
                                        <Link href="/auth/forgot-password" className={styles.forgotPassword}>
                                            Quên mật khẩu?
                                        </Link>
                                    </div>
                                </div>

                                {loginError && (
                                    <div className={styles.formError}>
                                        <span>⚠️</span>
                                        <span>{loginError}</span>
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    loading={isSubmitting} 
                                    className="w-full" // Ensure button takes full width if not handled by CSS modules properly
                                >
                                    Đăng nhập
                                </Button>
                            </Form>
                        )}
                    </Formik>

                    <div className={styles.bottomLink}>
                        Chưa có tài khoản?
                        <Link href="/auth/register" className={styles.createAccountLink}>
                            Tạo tài khoản mới
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

