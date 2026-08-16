import React from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import { HeroSchema } from '../../components/Hero/Hero';
import { TextSchema } from '../../components/Text/Text';
import { ProductGridSchema } from '../../components/ProductGrid/ProductGrid';
import { BlenderPage } from '../../blender';

export const LandingTemplateSchema = z.object({
  title: z.string(),
  template: z.literal('landing').default('landing'),
  blocks: z.array(
    z.union([
      z.object({ type: z.literal('Hero'), data: HeroSchema }),
      z.object({ type: z.literal('Text'), data: TextSchema }),
      z.object({ type: z.literal('ProductGrid'), data: ProductGridSchema })
    ])
  )
});

// Dynamic Component Registry Map (relative to nested templates folder)
const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  Hero: dynamic(() => import('../../components/Hero/Hero'), { loading: () => <p>Loading block...</p> }),
  Text: dynamic(() => import('../../components/Text/Text')),
  ProductGrid: dynamic(() => import('../../components/ProductGrid/ProductGrid')),
};

interface TemplateProps {
  data: BlenderPage;
  bind: (fieldName: string) => any;
  isEditing: boolean;
}

export default function LandingTemplate({ data, bind, isEditing }: TemplateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
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
  );
}
