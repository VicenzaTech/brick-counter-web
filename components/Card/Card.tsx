'use client';

import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
}

export function Card({ children }: CardProps) {
  return <div className={styles.card}>{children}</div>;
}

interface CardHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function CardHeader({ title, children }: CardHeaderProps) {
  return (
    <header className={styles.cardHeader}>
      {title && <h2 className={styles.cardTitle}>{title}</h2>}
      {children}
    </header>
  );
}
