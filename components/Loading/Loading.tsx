import styles from './Loading.module.css';

type LoadingProps = {
    message?: string;
};

export default function Loading({ message }: LoadingProps) {
    return (
        <div className={styles.wrapper}>
            <div className={styles.spinner} />
            <p className={styles.message}>
                {message ?? 'Đang tải dữ liệu, vui lòng chờ...'}
            </p>
        </div>
    );
}

