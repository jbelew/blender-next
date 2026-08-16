export interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
}

export const mockCollections = [
  { id: 'activewear', name: 'Activewear Apparel' },
  { id: 'footwear', name: 'Footwear & Sneakers' }
];

export const mockCatalog: Record<string, Product[]> = {
  activewear: [
    { id: 'p1', name: 'Pro Running Shorts', price: '$29.99', imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=300' },
    { id: 'p2', name: 'Elite Training Hoodie', price: '$59.99', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=300' },
    { id: 'p3', name: 'Compression Leggings', price: '$39.99', imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&q=80&w=300' },
    { id: 'p4', name: 'Breathable Tee', price: '$24.99', imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=300' }
  ],
  footwear: [
    { id: 'p5', name: 'Cloud Runner Sneaker', price: '$129.99', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=300' },
    { id: 'p6', name: 'Trail Blazer Boot', price: '$149.99', imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=300' },
    { id: 'p7', name: 'Classic Low-Top Canvas', price: '$65.00', imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=300' },
    { id: 'p8', name: 'Ultra Boost Trainer', price: '$180.00', imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=300' }
  ]
};

export function fetchCommerceProducts(collectionId: string, limit: number): Product[] {
  const products = mockCatalog[collectionId] || [];
  return products.slice(0, limit);
}
