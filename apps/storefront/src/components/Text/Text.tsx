import React from 'react';
import { z } from 'zod';

export const TextSchema = z.object({
  content: z.string(),
});

interface TextProps {
  content: string;
  bind: (fieldName: string) => any;
  index: number;
}

export default function Text({ content, bind, index }: TextProps) {
  return (
    <div 
      style={{ 
        lineHeight: '1.6', 
        fontSize: '1.1rem',
        padding: '0.5rem 0',
        color: 'var(--color-neutral-dark)'
      }}
      {...bind(`blocks.${index}.data.content`)}
    >
      {content}
    </div>
  );
}
