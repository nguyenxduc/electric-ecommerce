import ProductCard from './ProductCard';
import type { Product } from '../../types/product';
import { makeProductSlug } from '../../utils/productSlug';

interface ProductGridProps {
  products: Product[];
  selectedCompareProducts?: Product[];
  onCompareToggle?: (product: Product) => void;
}

const ProductGrid = ({ products, selectedCompareProducts = [], onCompareToggle }: ProductGridProps) => {
  const selectedCompareIds = selectedCompareProducts.map(product => product.id);
  const selectedCategoryId = selectedCompareProducts[0]?.category_id;

  return (
    <div className="grid grid-cols-3 gap-6">
      {products.slice(0, 9).map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          slug={makeProductSlug(product.name, product.id)}
          compareSelected={selectedCompareIds.includes(product.id)}
          compareDisabled={
            selectedCompareIds.length >= 4 ||
            (selectedCategoryId !== undefined && product.category_id !== selectedCategoryId)
          }
          compareDisabledReason={
            selectedCompareIds.length >= 4
              ? 'You can compare up to 4 products'
              : 'Only products from the same category can be compared'
          }
          onCompareToggle={onCompareToggle}
        />
      ))}
      {products.slice(9, 15).map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          slug={makeProductSlug(product.name, product.id)}
          compareSelected={selectedCompareIds.includes(product.id)}
          compareDisabled={
            selectedCompareIds.length >= 4 ||
            (selectedCategoryId !== undefined && product.category_id !== selectedCategoryId)
          }
          compareDisabledReason={
            selectedCompareIds.length >= 4
              ? 'You can compare up to 4 products'
              : 'Only products from the same category can be compared'
          }
          onCompareToggle={onCompareToggle}
        />
      ))}
    </div>
  );
};

export default ProductGrid
