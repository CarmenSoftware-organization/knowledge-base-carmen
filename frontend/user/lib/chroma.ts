import { CloudClient } from "chromadb";

if (!process.env.CHROMA_API_KEY || !process.env.CHROMA_TENANT || !process.env.CHROMA_DATABASE) {
  throw new Error("CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE must be set in environment variables");
}

export const chromaClient = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

const DEFAULT_COLLECTION = process.env.CHROMA_COLLECTION || "carmen_cloud";

export async function getCarmenCloudCollection() {
  return chromaClient.getOrCreateCollection({ name: DEFAULT_COLLECTION });
}

