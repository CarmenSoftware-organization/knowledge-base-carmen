import { extractYoutubeId } from "./utils";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function processYoutube(text: string): string {
  const mdVideoRegex = /\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;
  text = text.replace(mdVideoRegex, (match, _title, url) => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }
    return match;
  });

  const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
  text = text.replace(urlRegex, (match, _p1, offset, fullString) => {
    const prefix = fullString.substring(Math.max(0, offset - 10), offset);
    if (/src=['"]$|href=['"]$|\($/.test(prefix)) return match;
    const before = fullString.substring(Math.max(0, offset - 100), offset);
    if (before.includes('carmen-processed-video')) return match;

    const videoId = extractYoutubeId(match);
    if (videoId) {
      return `<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }
    return match;
  });

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
    return `<br><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" data-lightbox="${escapeHtml(url)}" class="carmen-lightbox-img" style="max-width:100%;border-radius:12px;margin:8px 0;cursor:zoom-in;" /><br>`;
  });

  // 2. Existing HTML <img> tags with relative src — resolve to full API URL
  text = text.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (_m, before, src, after) => {
    if (/^(https?:|data:)/.test(src.trim())) return _m;
    const url = resolveUrl(src);
    const safeUrl = escapeHtml(url);
    const hasLightbox = before.includes("data-lightbox") || after.includes("data-lightbox");
    const lightboxAttr = hasLightbox ? "" : ` data-lightbox="${safeUrl}"`;
    const cursorStyle = "cursor:zoom-in;";
    let newAfter = after;
    if (after.includes('style="')) {
      newAfter = after.replace('style="', `style="${cursorStyle}`);
    } else {
      newAfter = ` style="${cursorStyle}"${after}`;
    }
    return `<img ${before}src="${safeUrl}"${lightboxAttr}${newAfter}>`;
  });

  return text;
}

function processLinks(text: string): string {
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  text = text.replace(mdLinkRegex, (match, label, url) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return match;
    return `<a href="${escapeHtml(url)}" target="_blank" class="carmen-link">${escapeHtml(label)}</a>`;
  });

  const urlRegex = /(https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtu\.be))[^\s<)"']+)/g;
  text = text.replace(urlRegex, (match, _p1, offset, fullString) => {
    const prefix = fullString.substring(Math.max(0, offset - 50), offset);
    if (/[=]['"]\s*$/.test(prefix)) return match;
    const lastAngle = prefix.lastIndexOf("<");
    const lastClose = prefix.lastIndexOf(">");
    if (lastAngle > lastClose) return match;
    return `<a href="${escapeHtml(match)}" target="_blank" class="carmen-link">${escapeHtml(match)}</a>`;
  });

  return text;
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
      out.push('<hr class="carmen-hr" />');
      continue;
    }
    if (/^### (.+)$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div class="carmen-heading-3">${escapeHtml(line.replace(/^### /, ""))}</div>`);
      continue;
    }
    if (/^## (.+)$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div class="carmen-heading-2">${escapeHtml(line.replace(/^## /, ""))}</div>`);
      continue;
    }
    if (/^[-*] (.+)$/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${escapeHtml(line.replace(/^[-*] /, ""))}</li>`);
      blankCount = 0;
      continue;
    }
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div class="carmen-numbered-item">
        <b class="carmen-number">${escapeHtml(numbered[1])}.</b>
        <span>${escapeHtml(numbered[2])}</span>
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
      out.push(escapeHtml(line) + "<br>");
    }
  }

  if (inList) out.push("</ul>");
  return out.join("");
}

function processInlineMarkdown(text: string): string {
  text = text.replace(/`([^`]+)`/g, (_, c) => `<code class="carmen-inline-code">${escapeHtml(c)}</code>`);
  text = text.replace(/\*\*\*(.*?)\*\*\*/g, (_, c) => `<b><i>${escapeHtml(c)}</i></b>`);
  text = text.replace(/\*\*(.*?)\*\*/g, (_, c) => `<b>${escapeHtml(c)}</b>`);
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, c) => `<i>${escapeHtml(c)}</i>`);
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