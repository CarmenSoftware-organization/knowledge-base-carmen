import { NextRequest, NextResponse } from "next/server";
import { getCarmenCloudCollection } from "@/lib/chroma";
import { getMarkdownFileContent, listCarmenCloudMarkdownFiles } from "@/lib/github-wiki";

function getChangedMarkdownPathsFromPush(payload: any): string[] {
  const changed = new Set<string>();
  if (!payload?.commits) return [];
  for (const c of payload.commits) {
    for (const p of c.added ?? []) changed.add(p);
    for (const p of c.modified ?? []) changed.add(p);
  }
  return Array.from(changed).filter(
    (p) => typeof p === "string" && p.startsWith("carmen_cloud/") && p.endsWith(".md"),
  );
}

export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event");
  const fullSync = req.nextUrl.searchParams.get("full") === "1";

  try {
    const collection = await getCarmenCloudCollection();

    let paths: string[] = [];

    if (fullSync) {
      // Manual / cron: sync everything
      paths = await listCarmenCloudMarkdownFiles();
    } else if (event === "push") {
      // GitHub webhook push event
      const payload = await req.json();
      paths = getChangedMarkdownPathsFromPush(payload);
    } else {
      return NextResponse.json({ message: "ignored" }, { status: 200 });
    }

    if (paths.length === 0) {
      return NextResponse.json({ message: "no markdown files to sync" }, { status: 200 });
    }

    const ids: string[] = [];
    const docs: string[] = [];
    const metas: any[] = [];

    for (const path of paths) {
      try {
        const content = await getMarkdownFileContent(path);
        ids.push(path);
        docs.push(content);
        metas.push({ path });
      } catch (err) {
        console.error("[chroma-sync] failed to load", path, err);
      }
    }

    if (ids.length > 0) {
      await collection.upsert({ ids, documents: docs, metadatas: metas });
    }

    return NextResponse.json({ message: "synced", count: ids.length });
  } catch (err: any) {
    console.error("[chroma-sync] error", err);
    return NextResponse.json({ error: err?.message ?? "sync failed" }, { status: 500 });
  }
}

