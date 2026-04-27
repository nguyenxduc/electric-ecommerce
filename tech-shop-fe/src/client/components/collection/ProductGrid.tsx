import ProductCard from './ProductCard';
import type { Product } from '../../types/product';
import { makeProductSlug } from '../../utils/productSlug';

interface ProductGridProps {
  products: Product[];
}

const ProductGrid = ({ products } : ProductGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-6">
      {products.slice(0, 9).map((product) => (
        <ProductCard key={product.id} product={product} slug={makeProductSlug(product.name, product.id)} />
      ))}
      {products.slice(9, 15).map((product) => (
        <ProductCard key={product.id} product={product} slug={makeProductSlug(product.name, product.id)} />
      ))}
    </div>
  );
};

export default ProductGrid
