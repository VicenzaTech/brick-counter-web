import styles from './SwitchButton.module.css';

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function SwitchButton({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className={styles.thumb} />
    </button>
  );
}
