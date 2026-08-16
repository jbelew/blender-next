import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';

export interface CollectionConfig<T extends z.ZodTypeAny> {
  name: string;
  path: string;
  schema: T;
}

export function defineCollection<T extends z.ZodTypeAny>(config: CollectionConfig<T>) {
  return config;
}

/**
 * Loads all JSON items in a collection directory and validates them using the collection's Zod schema.
 */
export async function loadCollection<T extends z.ZodTypeAny>(
  collection: CollectionConfig<T>,
  workspaceRoot: string
): Promise<(z.infer<T> & { _id: string })[]> {
  const dirPath = path.resolve(workspaceRoot, collection.path);
  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const items = [];
    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      const rawContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(rawContent);
      const validated = collection.schema.parse(data);
      items.push({
        _id: path.basename(file, '.json'),
        ...validated
      });
    }
    return items;
  } catch (error) {
    // Return empty array if directory doesn't exist yet
    return [];
  }
}

/**
 * Validates data against the schema and saves it as a JSON file in the collection's path.
 */
export async function saveCollectionItem<T extends z.ZodTypeAny>(
  collection: CollectionConfig<T>,
  workspaceRoot: string,
  itemId: string,
  data: z.infer<T>
) {
  // Validate itemId to prevent traversal injection
  if (!/^[a-zA-Z0-9-_]+$/.test(itemId)) {
    throw new Error('Invalid item ID format. Only alphanumeric characters, dashes, and underscores are allowed.');
  }

  const dirPath = path.resolve(workspaceRoot, collection.path);
  await fs.mkdir(dirPath, { recursive: true });
  
  // Validate data before writing
  const validated = collection.schema.parse(data);
  const filePath = path.join(dirPath, `${itemId}.json`);

  // Ensure resolved path is strictly inside the collection directory
  const relative = path.relative(dirPath, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Directory traversal detected.');
  }

  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), 'utf-8');
}
