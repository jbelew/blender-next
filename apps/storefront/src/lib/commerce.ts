export interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
}

export const mockCollections = [
  { id: 'restaurants', name: 'Trending Restaurants' },
  { id: 'grocery', name: 'Grocery & Convenience' }
];

export const mockCatalog: Record<string, Product[]> = {
  restaurants: [
    { id: 'p1', name: 'Gourmet Smash Burger', price: '$12.99', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300' },
    { id: 'p2', name: 'Spicy Tuna Roll Set (12pc)', price: '$18.50', imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=300' },
    { id: 'p3', name: 'Wood-Fired Margherita Pizza', price: '$15.99', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=300' },
    { id: 'p4', name: 'Organic Acai Berry Bowl', price: '$9.50', imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&q=80&w=300' }
  ],
  grocery: [
    { id: 'p5', name: 'Fresh Organic Bananas (Bunch)', price: '$2.49', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=300' },
    { id: 'p6', name: 'Whole Milk 1 Gallon', price: '$4.29', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=300' },
    { id: 'p7', name: 'Sea Salt Tortilla Chips', price: '$3.99', imageUrl: 'https://images.unsplash.com/photo-1518047601542-79f18c655718?auto=format&fit=crop&q=80&w=300' },
    { id: 'p8', name: 'Premium Ground Coffee (Dark Roast)', price: '$11.99', imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=300' }
  ]
};

export function fetchCommerceProducts(collectionId: string, limit: number): Product[] {
  const products = mockCatalog[collectionId] || [];
  return products.slice(0, limit);
}
