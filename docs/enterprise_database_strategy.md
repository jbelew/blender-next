# Blender Next: Database Scaling Strategy

If Blender Next outgrows its Git flat-file setup, we need to move the layout data to a database. Because our layout files are hierarchical (nested component arrays) and rely on branching, the target database needs to handle JSON columns easily, support locking, and allow revision track merges.

Here is an analysis of database options that fit this model.

---

## 1. Database Options

### A. PlanetScale / Vitess (Distributed SQL with Branching)
PlanetScale is built on Vitess, the MySQL scaling layer. What makes it a great fit is its **native schema branching workflow**. Developers and CMS editors can spin up schema branches, make changes in isolation, and open a "Deploy Request" to merge layout changes back to production. This behaves exactly like Git's branch-and-PR model.
*   **Best for**: Keeping the Git branching mental model alive at database scale.
*   **Key points**: Handles horizontal sharding automatically, supports zero-downtime migrations, and query speeds are high on JSON column types.

### B. MongoDB Atlas (Document Store)
Our page layouts are dynamic JSON arrays. MongoDB is document-native, meaning Zod schemas map directly to database documents without any translation layers.
*   **Best for**: JSON schema flexibility.
*   **Key points**: Storing and querying nested blocks arrays is native. It supports Optimistic Concurrency Control (OCC) using version numbers to prevent editors from overwriting each other's changes.

### C. PostgreSQL / Amazon Aurora (Relational + JSONB)
PostgreSQL handles dynamic layouts using the highly optimized `JSONB` data type. It matches document stores in read performance while keeping the reliability of a relational engine.
*   **Best for**: Granular security and auditing.
*   **Key points**: Supports Row-Level Security (RLS) to enforce edit access permissions on specific page prefixes. It has native support for temporal tables, which makes version history and rollbacks easy to implement.

---

## 2. Comparison

*   **PlanetScale**: Relational + JSON. High branching alignment (Deploy Requests). Strong transactions. High availability via Vitess.
*   **MongoDB Atlas**: Document (BSON). Medium branching alignment (requires versioned records). Strong version-based locking. High availability via Atlas clusters.
*   **PostgreSQL**: Relational + JSONB. Medium branching alignment (requires temporal tables). Strong MVCC locking. High availability via RDS/Aurora.

---

## 3. Migration Example (MongoDB)

When moving from flat-files to MongoDB, the backend routes shift from filesystem calls to database queries, while the validation logic remains in the same co-located Zod schemas:

```typescript
// apps/storefront/src/app/api/blender/route.ts
import { MongoClient } from 'mongodb';
import { PageSchema } from '../../../schemas/page';

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db('blender_next');

export async function POST(request: Request) {
  const { action, itemId, data, campaignId } = await request.json();
  const pages = db.collection('pages');
  
  if (action === 'save') {
    // Validate the raw data against identical Zod definitions
    const parsedData = PageSchema.parse(data);
    
    // Save to the campaign namespace or write directly to production
    if (campaignId) {
      await db.collection('campaign_drafts').updateOne(
        { pageId: itemId, campaignId },
        { $set: { data: parsedData, updatedAt: new Date() } },
        { upsert: true }
      );
    } else {
      await pages.updateOne(
        { _id: itemId },
        { $set: parsedData },
        { upsert: true }
      );
    }
    
    return NextResponse.json({ success: true });
  }
}
```
