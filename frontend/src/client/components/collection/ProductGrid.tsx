import ProductCard from './ProductCard';
import type { Product } from '../../types/product';
import { makeProductSlug } from '../../utils/productSlug';
import { MAX_COMPARE_PRODUCTS } from '../../constants/compare';

interface ProductGridProps {
  products: Product[];
  // Them class cho luoi (vd. hieu ung the hien so le)
  className?: string;
  selectedCompareProducts?: Product[];
  onCompareToggle?: (product: Product) => void;
}

const ProductGrid = ({ products, selectedCompareProducts = [], onCompareToggle, className = '' }: ProductGridProps) => {
  const selectedCompareIds = selectedCompareProducts.map(product => product.id);
  const selectedCategoryId = selectedCompareProducts[0]?.category_id;

  return (
    // Day nhu cac san: 2 cot dien thoai, 3-4 cot desktop (canh sidebar loc)
    <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          slug={makeProductSlug(product.name, product.id)}
          compareSelected={selectedCompareIds.includes(product.id)}
          compareDisabled={
            selectedCompareIds.length >= MAX_COMPARE_PRODUCTS ||
            (selectedCategoryId !== undefined && product.category_id !== selectedCategoryId)
          }
          compareDisabledReason={
            selectedCompareIds.length >= MAX_COMPARE_PRODUCTS
              ? `You can compare up to ${MAX_COMPARE_PRODUCTS} products`
              : 'Only products from the same category can be compared'
          }
          onCompareToggle={onCompareToggle}
        />
      ))}
    </div>
  );
};

export default ProductGrid
