import { ProductService } from '../src/services/productService.js';
const variants = ProductService.getVariants({ productId: 'PROD-PHONE-005' });
console.log('iPhone 16 variants:', JSON.stringify(variants.availableSizesOrSpecs || variants));

const variants6 = ProductService.getVariants({ productId: 'PROD-PHONE-006' });
console.log('Galaxy S25 variants:', JSON.stringify(variants6.availableSizesOrSpecs || variants6));
