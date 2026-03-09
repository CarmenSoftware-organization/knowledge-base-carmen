function extractYoutubeId(url: string): string | null {
  try {
    const re =
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const m = url.match(re);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function processYoutube(text: string): string {
  text = text.replace(
    /\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g,
    (_match, _label, url) => {
      const vid = extractYoutubeId(url);
      return vid
        ? `<div style="position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;margin:8px 0;">
            <iframe src="https://www.youtube.com/embed/${vid}" 
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" 
              allowfullscreen></iframe>
           </div>`
        : _match;
    }
  );
  text = text.replace(
    /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g,
    (url, _p, offset, str) => {
      const before = str.substring(Math.max(0, offset - 10), offset);
      if (/src=['"]$|href=['"]$|\($/.test(before)) return url;
      const vid = extractYoutubeId(url);
      return vid
        ? `<div style="position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;margin:8px 0;">
            <iframe src="https://www.youtube.com/embed/${vid}" 
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" 
              allowfullscreen></iframe>
           </div>`
        : url;
    }
  );
  return text;
}

function processImages(text: string, apiBase: string): string {
  const resolveUrl = (src: string) => {
    let u = src.trim().replace(/\\/g, "/");
    if (
      u.includes("youtube.com") ||
      u.includes("youtu.be") ||
      u.startsWith("data:")
    )
      return u;
    if (/^(http|https):/.test(u)) {
      if (
        u.includes("127.0.0.1") ||
        u.includes("localhost") ||
        (apiBase && u.startsWith(apiBase))
      )
        return u.includes("/images/")
          ? u
          : `${apiBase}/images/${u.split("/").pop()}`;
      const after = u.split("/images/");
      if (after.length > 1) return `${apiBase}/images/${after[1]}`;
      return `${apiBase}/images/${u
        .replace(/^https?:\/\/[^/]+/, "")
        .replace(/^\/+/, "")}`;
    }
    u = u.replace(/^carmen_cloud\//, "").replace(/^\/+/, "");
    return `${apiBase}/images/${u}`;
  };

  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_m, alt, src) => {
    if (src.includes("youtube")) return _m;
    const url = resolveUrl(src);
    return `<br><a href="${url}" target="_blank">
      <img src="${url}" alt="${alt}" style="max-width:100%;border-radius:12px;margin:8px 0;" />
    </a><br>`;
  });

  return text;
}

function processLinks(text: string): string {
  return text.replace(
    /(https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtu\.be))[^\s<)"']+)/g,
    (url, _p, offset, str) => {
      const before = str.substring(Math.max(0, offset - 10), offset);
      if (/src=['"]$|href=['"]$|>$/.test(before)) return url;
      return `<a href="${url}" target="_blank" 
        style="color:#2563eb;text-decoration:underline;">${url}</a>`;
    }
  );
}

function processMarkdownStructure(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inList = false;
  let blankCount = 0;

  for (const raw of lines) {
    const line = raw.trim();

    if (/^---+$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;" />');
      continue;
    }
    if (/^### (.+)$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div style="font-weight:700;font-size:15px;margin:12px 0 6px 0;">
        ${line.replace(/^### /, "")}</div>`);
      continue;
    }
    if (/^## (.+)$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div style="font-weight:700;font-size:16px;margin:14px 0 6px 0;">
        ${line.replace(/^## /, "")}</div>`);
      continue;
    }
    if (/^[-*] (.+)$/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${line.replace(/^[-*] /, "")}</li>`);
      blankCount = 0;
      continue;
    }
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div style="display:flex;gap:8px;margin:6px 0 2px 0;">
        <b style="min-width:20px;color:#1e40af;">${numbered[1]}.</b>
        <span>${numbered[2]}</span>
      </div>`);
      blankCount = 0;
      continue;
    }
    if (inList && line !== "") { out.push("</ul>"); inList = false; }

    if (line === "") {
      blankCount++;
      if (blankCount >= 2 && out[out.length - 1] !== "<br>") out.push("<br>");
    } else {
      blankCount = 0;
      out.push(line + "<br>");
    }
  }

  if (inList) out.push("</ul>");
  return out.join("");
}

function processInlineMarkdown(text: string): string {
  text = text.replace(
    /`([^`]+)`/g,
    '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;">$1</code>'
  );
  text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<i>$1</i>");
  return text;
}

export function formatCarmenMessage(text: string, apiBase: string): string {
  if (!text) return "";
  let t = String(text);
  t = processYoutube(t);
  t = processImages(t, apiBase);
  t = processLinks(t);
  t = processMarkdownStructure(t);
  t = t.replace(/(<br>){3,}/g, "<br><br>");
  t = processInlineMarkdown(t);
  return t;
}