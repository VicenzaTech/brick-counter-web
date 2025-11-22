import styles from './TabItem.module.css';

interface TabItemProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export default function TabItem({
  label,
  isActive = false,
  onClick,
}: TabItemProps) {
  return (
    <button
      type="button"
      className={`${styles.tabItem} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

