import styles from '@/styles/ProductStatus.module.css';
import { productStatus } from '@/lib/product-status';

type ProductStatusVariant = 'signIn' | 'header' | 'footer';

interface ProductStatusProps {
  readonly variant: ProductStatusVariant;
  readonly showDescription?: boolean;
}

export default function ProductStatus({ variant, showDescription = false }: ProductStatusProps) {
  return (
    <div className={`${styles.status} ${styles[variant]}`}>
      <span className={styles.pill} aria-label={productStatus.accessibleLabel}>
        <span className={styles.signal} aria-hidden="true" />
        {productStatus.label}
      </span>
      {showDescription && <p className={styles.description}>{productStatus.description}</p>}
    </div>
  );
}
