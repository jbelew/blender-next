import React from 'react';
import { z } from 'zod';

export const HeroSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  ctaText: z.string(),
  imageUrl: z.string().optional(),
});

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  imageUrl?: string;
  bind: (fieldName: string) => any;
  index: number;
}

export default function Hero({ title, subtitle, ctaText, imageUrl, bind, index }: HeroProps) {
  const hasImage = !!imageUrl;
  return (
    <div 
      style={{ 
        background: 'var(--card-background)', 
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-lg)', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        minHeight: '300px'
      }}
    >
      {/* Card Body content */}
      <div 
        style={{ 
          flex: '1 1 300px', 
          padding: hasImage ? '2.5rem' : '3.5rem', 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: hasImage ? 'flex-start' : 'center',
          textAlign: hasImage ? 'left' : 'center',
          boxSizing: 'border-box'
        }}
      >
        <h2 {...bind(`blocks.${index}.data.title`)} style={{ margin: '0 0 1rem 0', fontSize: '2.2rem', color: 'var(--foreground)', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: '1.2' }}>
          {title}
        </h2>
        {subtitle && (
          <p {...bind(`blocks.${index}.data.subtitle`)} style={{ color: 'var(--color-neutral-muted)', margin: '0 0 1.5rem 0', fontSize: '1.05rem', lineHeight: '1.6' }}>
            {subtitle}
          </p>
        )}
        <button 
          {...bind(`blocks.${index}.data.ctaText`)} 
          style={{ 
            background: 'var(--color-primary)', 
            color: 'var(--color-primary-foreground)', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', 
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          {ctaText}
        </button>
      </div>

      {/* Composed Radix Inset Image */}
      {hasImage && (
        <div 
          style={{ 
            flex: '1 1 300px', 
            alignSelf: 'stretch',
            minHeight: '260px',
            position: 'relative'
          }}
        >
          <img 
            src={imageUrl} 
            alt={title} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: 'block'
            }} 
          />
        </div>
      )}
    </div>
  );
}
