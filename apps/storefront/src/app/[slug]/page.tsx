import React from 'react';
import { notFound } from 'next/navigation';
import { loadCollection } from '@blender-next/core';
import { PagesCollection } from '../../blender';
import DynamicPageClient from '../../components/DynamicPageClient';
import path from 'path';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const workspaceRoot = path.resolve(process.cwd(), '../../');
  const pages = await loadCollection(PagesCollection, workspaceRoot);
  return pages.map((page) => ({
    slug: page._id,
  }));
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  
  // Resolve the workspace root directory containing `/content`
  const workspaceRoot = path.resolve(process.cwd(), '../../');
  const pages = await loadCollection(PagesCollection, workspaceRoot);
  const page = pages.find((p) => p._id === slug);

  if (!page) {
    notFound();
  }

  // Remove the metadata field `_id` before passing to client component
  const { _id, ...initialData } = page;

  return <DynamicPageClient initialData={initialData} slug={slug} />;
}
