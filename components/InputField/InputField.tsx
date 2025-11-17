'use client';

import { useField } from 'formik';
import styles from './InputField.module.css';

interface InputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function InputField({ label, ...props }: InputFieldProps) {
  const [field, meta] = useField(props.name);

  const hasError = meta.touched && !!meta.error;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={props.id || props.name} className={styles.label}>
        {label}
      </label>
      <input
        {...field}
        {...props}
        id={props.id || props.name}
        className={`${styles.input} ${hasError ? styles.inputError : ''}`}
      />
      {hasError && <div className={styles.errorText}>{meta.error}</div>}
    </div>
  );
}
