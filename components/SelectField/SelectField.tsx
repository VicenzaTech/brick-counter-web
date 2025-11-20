'use client';

import { useField } from 'formik';
import styles from './SelectField.module.css';

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
}

export function SelectField({ label, children, ...props }: SelectFieldProps) {
  const [field, meta] = useField(props.name);

  const hasError = meta.touched && !!meta.error;

  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={props.id || props.name} className={styles.label}>
        {label}
      </label>
      <select
        {...field}
        {...props}
        id={props.id || props.name}
        className={`${styles.select} ${hasError ? styles.selectError : ''}`}
      >
        {children}
      </select>
      {hasError && <div className={styles.errorText}>{meta.error}</div>}
    </div>
  );
}

