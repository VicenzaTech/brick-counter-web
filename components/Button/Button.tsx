'use client';

import styles from './Button.module.css';

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    typeBtn?: 'primaryButton' | 'secondaryButton';
}

export function Button({
    children,
    loading,
    disabled,
    className,
    typeBtn = 'primaryButton',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;
    return (
        <button
            {...props}
            disabled={isDisabled}
            className={`${styles[typeBtn]} ${className || ''}`}
        >
            {loading ? 'Đang xử lý...' : children}
        </button>
    );
}

