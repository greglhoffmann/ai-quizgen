/**
 * MongoDB helper (optional)
 * - Connects lazily using MONGODB_URI and returns the default database.
 */
import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const uri = process.env.MONGODB_URI;

if (uri) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  if (!clientPromise) return null;
  const c = await clientPromise;
  return c.db();
}
