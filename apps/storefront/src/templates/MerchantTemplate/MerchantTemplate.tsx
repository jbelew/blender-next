import React from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import { HeroSchema } from '../../components/Hero/Hero';
import { TextSchema } from '../../components/Text/Text';
import { ProductGridSchema } from '../../components/ProductGrid/ProductGrid';
import { BlenderPage } from '../../blender';

// Merchant page layout constraints:
// - Validates template type as "merchant"
// - Restricts blocks array to components allowed on a merchant page (Hero, Text, ProductGrid)
export const MerchantTemplateSchema = z.object({
  title: z.string(),
  template: z.literal('merchant'),
  merchantType: z.string().default('Local Cuisine'),
  deliveryFee: z.string().default('$1.99 Delivery'),
  deliveryTime: z.string().default('20-30 min'),
  rating: z.string().default('4.7 (100+ ratings)'),
  blocks: z.array(
    z.union([
      z.object({ type: z.literal('Hero'), data: HeroSchema }),
      z.object({ type: z.literal('Text'), data: TextSchema }),
      z.object({ type: z.literal('ProductGrid'), data: ProductGridSchema })
    ])
  )
});

// Dynamic Component Registry Map for rendering block components on demand
const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  Hero: dynamic(() => import('../../components/Hero/Hero'), { loading: () => <p>Loading block...</p> }),
  Text: dynamic(() => import('../../components/Text/Text')),
  ProductGrid: dynamic(() => import('../../components/ProductGrid/ProductGrid'))
};

interface TemplateProps {
  data: BlenderPage;
  bind: (fieldName: string) => any;
  isEditing: boolean;
}

export default function MerchantTemplate({ data, bind, isEditing }: TemplateProps) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Merchant Profile Header Box */}
      <div 
        style={{ 
          background: 'var(--card-background)', 
          border: '1px solid var(--card-border)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 {...bind('title')} style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'var(--foreground)' }}>
            {data.title}
          </h2>
          <p {...bind('merchantType')} style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-neutral-subtle)' }}>
            {data.merchantType || 'Local Cuisine'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: '500', color: 'var(--foreground)' }}>
            <span {...bind('rating')} style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
              ★ {data.rating || '4.7'}
            </span>
            <span {...bind('deliveryTime')} style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
              🕒 {data.deliveryTime || '20-30 min'}
            </span>
            <span {...bind('deliveryFee')} style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
              🚴 {data.deliveryFee || '$1.99 Delivery'}
            </span>
          </div>
        </div>
      </div>

      {/* Localized Marketplace Layout Body */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: '2.5rem', 
          alignItems: 'flex-start'
        }}
      >
        {/* Left Sidebar Category Navigator */}
        <div 
          style={{ 
            flex: '1 1 200px', 
            background: 'var(--background)', 
            border: '1px solid var(--card-border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.25rem',
            boxSizing: 'border-box',
            position: 'sticky',
            top: '20px'
          }}
        >
          <h3 style={{ fontSize: '0.8rem', color: 'var(--color-neutral-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 1rem 0', fontWeight: 'bold' }}>
            Menu Categories
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: '600' }}>
            {data.blocks
              .filter((block) => block.type === 'ProductGrid')
              .map((block, index) => (
                <li key={index} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>
                  • {block.data.title || 'Menu Section'}
                </li>
              ))}
          </ul>
        </div>

        {/* Right Main Column - Menu Sections / Blocks Feed */}
        <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {data.blocks.map((block, index) => {
            const TargetComponent = ComponentRegistry[block.type];
            
            if (!TargetComponent) {
              console.warn(`Unregistered visual block type: "${block.type}"`);
              return null;
            }

            return (
              <TargetComponent 
                key={index} 
                index={index} 
                bind={bind} 
                isEditing={isEditing}
                {...block.data} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
