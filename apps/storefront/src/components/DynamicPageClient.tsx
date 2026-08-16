"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { useBlender } from '@blender-next/react';
import { BlenderPage } from '../blender';

// Dynamic Page Template Registry (loads page shells on-demand via direct paths)
const TemplateRegistry: Record<string, React.ComponentType<any>> = {
  landing: dynamic(() => import('../templates/LandingTemplate/LandingTemplate'), { loading: () => <p>Loading Page Layout...</p> }),
  blog: dynamic(() => import('../templates/BlogTemplate/BlogTemplate'), { loading: () => <p>Loading Page Layout...</p> }),
};

interface DynamicPageClientProps {
  initialData: BlenderPage;
  slug: string;
}

export default function DynamicPageClient({ initialData, slug }: DynamicPageClientProps) {
  const { data, bind, isEditing } = useBlender<BlenderPage>({
    initialData,
    collectionName: 'pages',
    itemId: slug
  });

  // Resolve template (falling back to landing template)
  const TemplateComponent = TemplateRegistry[data.template || 'landing'] || TemplateRegistry.landing;

  return (
    <main style={{ padding: '2rem', maxWidth: 'var(--max-width-container)', margin: '0 auto' }}>
      {isEditing && (
        <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <strong>Blender Next Visual Editor Active</strong> — Hover elements to preview highlights.
        </div>
      )}
      
      <h1 {...bind('title')} style={{ fontSize: '2.5rem', color: 'var(--foreground)', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '1rem' }}>
        {data.title}
      </h1>
      
      <TemplateComponent 
        data={data} 
        bind={bind} 
        isEditing={isEditing} 
      />
    </main>
  );
}
