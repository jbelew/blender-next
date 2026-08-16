# Blender Next: Enterprise Database Scaling Strategy

If Blender Next outgrows its Git flat-file storage model, we must transition to a highly available, scalable, and secure database layer. Since e-commerce page builder data is hierarchical (nested blocks with dynamic schemas) and requires campaign branching, the target database must excel at document storage, concurrency control, and revision management.

This document analyzes the top enterprise database candidates to replace Git.

---

## 1. Top Enterprise Database Recommendations

### A. PlanetScale / Vitess (Distributed SQL with Native Schema Branching) — *Recommended for Git Alignment*
*   **Why it fits**: PlanetScale is built on Vitess (the clustering system that powers YouTube's database). Crucially, PlanetScale implements a **native database branching workflow**. Developers and CMS admins can create schema/data branches, make changes in isolation, and open a "Deploy Request" to merge changes back to the production branch—replicating the Git PR model exactly.
*   **Key Strengths**:
    *   Horizontal scalability (sharding) without application-level logic changes.
    *   No-downtime schema migrations.
    *   Excellent support for JSON column types to store dynamic layout arrays.

### B. MongoDB Atlas (The Enterprise Document Standard) — *Recommended for JSON Flexibility*
*   **Why it fits**: Blender Next’s layout models are dynamic JSON documents. MongoDB is the industry-standard document database, meaning Zod schemas map directly to collections without translation layers.
*   **Key Strengths**:
    *   **JSON Native**: Storing, indexing, and querying nested block arrays is seamless.
    *   **Optimistic Concurrency Control (OCC)**: Built-in write version checks prevent editor overwrite conflicts.
    *   **Enterprise Security**: Active Directory/LDAP integration, encryption-at-rest, and granular collection-level role access (RBAC).
    *   **Branching implementation**: We can model campaigns using a versioned collection structure (e.g. storing delta edits in a `campaign_drafts` collection and writing them to the main `pages` collection upon publication approval).

### C. PostgreSQL / Amazon Aurora (The Pragmatic Enterprise Standard)
*   **Why it fits**: PostgreSQL is the gold standard for relational enterprise engines. With its highly optimized `JSONB` data type, Postgres can store, index, and query dynamic layouts with performance matching dedicated document stores.
*   **Key Strengths**:
    *   **Row-Level Security (RLS)**: Solves the CMS security drawback by restricting edits at the database connection level based on user identity.
    *   **Transactional Rigor**: Strong ACID compliance ensures layout writes never corrupt page structures.
    *   **Temporal Table Support**: Supports historical tracking, making audit rollbacks and revision history simple to implement.

---

## 2. Comparative Matrix

| Database Option | Data Model | Branching Concept Alignment | Concurrency Control | Security & RBAC | Enterprise Availability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PlanetScale** | Relational + JSON | **High** (Native Deploy Requests/Branches) | Strong (ACID Transactions) | Excellent | High (Multi-region Vitess) |
| **MongoDB Atlas** | Document (BSON) | **Medium** (Requires versioned records) | Strong (Version/Timestamp OCC) | Excellent (LDAP/Granular RBAC) | High (Multi-cloud clusters) |
| **PostgreSQL** | Relational + `JSONB` | **Medium** (Requires temporal/delta tables) | Strong (MVCC + ACID) | Superior (Row-Level Security) | High (AWS Aurora Serverless) |

---

## 3. Migration Architecture Blueprint (MongoDB Example)

When migrating from Git flat-files to MongoDB, the backend routes shift from filesystem access to database operations, while keeping Zod validation identical:

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
    // 1. Validate payload using identical co-located Zod schemas
    const parsedData = PageSchema.parse(data);
    
    // 2. Write to campaign namespace or production collection
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
