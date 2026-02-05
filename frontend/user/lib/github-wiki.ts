const owner = process.env.GITHUB_REPO_OWNER ?? "Sunshine050";
const repo = process.env.GITHUB_REPO_NAME ?? "new-carmen";
const branch = process.env.GITHUB_REPO_BRANCH ?? "wiki-content";
const githubToken = process.env.GITHUB_TOKEN;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }
  return headers;
}

export async function listCarmenCloudMarkdownFiles(): Promise<string[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub tree error ${res.status}`);
  }
  const data: any = await res.json();
  const files: string[] = [];
  for (const item of data.tree as any[]) {
    if (
      item.type === "blob" &&
      typeof item.path === "string" &&
      item.path.startsWith("carmen_cloud/") &&
      item.path.endsWith(".md")
    ) {
      files.push(item.path);
    }
  }
  return files;
}

export async function getMarkdownFileContent(path: string): Promise<string> {
  const encodedPath = encodeURIComponent(path);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub content error ${res.status} for ${path}`);
  }
  const data: any = await res.json();
  const content: string = data.content;
  const buf = Buffer.from(content.replace(/\n/g, ""), "base64");
  return buf.toString("utf8");
}

