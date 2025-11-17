'use client';

import styles from './Button.module.css';

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function Button({
  children,
  loading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${styles.primaryButton} ${className || ''}`}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  );
}
