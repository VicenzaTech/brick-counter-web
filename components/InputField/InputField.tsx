'use client';

import { useField } from 'formik';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './InputField.module.css';

interface InputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function InputField({ label, type, ...props }: InputFieldProps) {
  const [field, meta] = useField(props.name);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = meta.touched && !!meta.error;
  const isPassword = type === 'password';

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={props.id || props.name} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <input
          {...field}
          {...props}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          id={props.id || props.name}
          className={`${styles.input} ${hasError ? styles.inputError : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.toggleButton}
            onClick={togglePasswordVisibility}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {hasError && <div className={styles.errorText}>{meta.error}</div>}
    </div>
  );
}
