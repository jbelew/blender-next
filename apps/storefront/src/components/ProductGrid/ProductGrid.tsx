import React from 'react';
import { z } from 'zod';
import { fetchCommerceProducts } from '../../lib/commerce';

export const ProductGridSchema = z.object({
  title: z.string(),
  collectionId: z.string(),
  limit: z.number().int().default(4),
});

interface ProductGridProps {
  title: string;
  collectionId: string;
  limit?: number;
  bind: (fieldName: string) => any;
  index: number;
  isEditing: boolean;
}

export default function ProductGrid({ title, collectionId, limit = 4, bind, index, isEditing }: ProductGridProps) {
  const products = fetchCommerceProducts(collectionId, limit);
  return (
    <div 
      style={{ 
        margin: '2rem 0',
        padding: '1.5rem',
        background: 'var(--background)',
        borderRadius: 'var(--radius-md)',
        border: isEditing ? '1px dashed var(--color-primary)' : '1px solid var(--card-border)'
      }}
    >
      <h2 {...bind(`blocks.${index}.data.title`)} style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', borderBottom: '2px solid var(--card-border)', paddingBottom: '0.5rem', color: 'var(--foreground)' }}>
        {title}
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
        {products.map((product) => (
          <div 
            key={product.id}
            style={{ 
              background: 'var(--card-background)', 
              border: '1px solid var(--card-border)', 
              borderRadius: 'var(--radius-md)', 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              style={{ width: '100%', height: '140px', objectFit: 'cover' }} 
            />
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--color-neutral-dark)', fontWeight: 'bold' }}>{product.name}</h4>
                <span style={{ fontWeight: 'bold', color: 'var(--color-success)', fontSize: '0.95rem' }}>{product.price}</span>
              </div>
              <button style={{ width: '100%', marginTop: '0.75rem', background: 'var(--color-neutral-dark)', color: 'white', border: 'none', padding: '0.4rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
