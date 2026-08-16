import React from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import { HeroSchema } from '../../components/Hero/Hero';
import { TextSchema } from '../../components/Text/Text';
import { BlenderPage } from '../../blender';

// Blog page layout constraints:
// - Requires author bio metadata
// - Restricts blocks array to only Hero and Text blocks (no ProductGrid allowed in Blog)
export const BlogTemplateSchema = z.object({
  title: z.string(),
  template: z.literal('blog'),
  authorName: z.string().default('UnCMS Editorial'),
  blocks: z.array(
    z.union([
      z.object({ type: z.literal('Hero'), data: HeroSchema }),
      z.object({ type: z.literal('Text'), data: TextSchema })
    ])
  )
});

// Dynamic Component Registry Map (relative to nested templates folder)
const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  Hero: dynamic(() => import('../../components/Hero/Hero'), { loading: () => <p>Loading block...</p> }),
  Text: dynamic(() => import('../../components/Text/Text')),
};

interface TemplateProps {
  data: BlenderPage;
  bind: (fieldName: string) => any;
  isEditing: boolean;
}

export default function BlogTemplate({ data, bind, isEditing }: TemplateProps) {
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: '2.5rem', 
        marginTop: '2rem',
        alignItems: 'flex-start'
      }}
    >
      {/* Main content area (blocks feed) */}
      <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

      {/* Styled Blog Sidebar */}
      <div 
        style={{ 
          flex: '1 1 200px', 
          background: 'var(--background)', 
          border: '1px solid var(--card-border)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1.5rem',
          boxSizing: 'border-box'
        }}
      >
        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-neutral-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 1rem 0', fontWeight: 'bold' }}>
          About the Author
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
            UC
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--foreground)', fontWeight: 'bold' }}>UnCMS Editorial</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-subtle)' }}>Core Contributor</span>
          </div>
        </div>
        
        <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '1rem 0' }} />

        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-neutral-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
          Publish Date
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-neutral-dark)' }}>August 16, 2026</p>

        <h3 style={{ fontSize: '0.85rem', color: 'var(--color-neutral-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
          Reading Time
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-neutral-dark)' }}>4 min read</p>
      </div>
    </div>
  );
}
