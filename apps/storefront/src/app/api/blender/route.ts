import { NextResponse } from 'next/server';
import { loadCollection, saveCollectionItem } from '@blender-next/core';
import { PagesCollection } from '../../../blender';
import path from 'path';
import { promises as fs } from 'fs';

export const dynamic = 'force-dynamic';

/**
 * Lists all pages present on the local filesystem.
 */
export async function GET() {
  try {
    const workspaceRoot = path.resolve(process.cwd(), '../../');
    const pages = await loadCollection(PagesCollection, workspaceRoot);
    
    const summaries = pages.map((page) => ({
      id: page._id,
      title: page.title,
    }));
    
    return NextResponse.json({ pages: summaries });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load page list.' },
      { status: 500 }
    );
  }
}

/**
 * Handles saving, creating, and deleting pages on disk.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, collectionName, itemId, data } = body;

    if (!itemId || typeof itemId !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(itemId)) {
      return NextResponse.json(
        { error: 'Invalid or missing itemId. Only alphanumeric characters, dashes, and underscores are allowed.' },
        { status: 400 }
      );
    }

    if (collectionName !== 'pages') {
      return NextResponse.json(
        { error: `Collection '${collectionName}' is not supported.` },
        { status: 400 }
      );
    }

    const workspaceRoot = path.resolve(process.cwd(), '../../');

    if (action === 'save' || !action) {
      // Save changes to page data
      await saveCollectionItem(PagesCollection, workspaceRoot, itemId, data);
      return NextResponse.json({ success: true });
    }

    if (action === 'create') {
      // Create a new page with a default starter layout
      const defaultPage = {
        title: `New Page (${itemId})`,
        template: 'landing' as const,
        blocks: [
          {
            type: 'Hero' as const,
            data: {
              title: `Welcome to ${itemId.toUpperCase()}`,
              subtitle: 'Edit this subtitle or click below to save.',
              ctaText: 'Learn More',
            },
          },
        ],
      };
      await saveCollectionItem(PagesCollection, workspaceRoot, itemId, defaultPage);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      // Delete the JSON file from disk
      const dirPath = path.resolve(workspaceRoot, PagesCollection.path);
      const filePath = path.join(dirPath, `${itemId}.json`);

      // Ensure resolved path is strictly inside the collection directory
      const relative = path.relative(dirPath, filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return NextResponse.json({ error: 'Directory traversal detected.' }, { status: 400 });
      }

      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action not supported.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Action failed.' },
      { status: 500 }
    );
  }
}
