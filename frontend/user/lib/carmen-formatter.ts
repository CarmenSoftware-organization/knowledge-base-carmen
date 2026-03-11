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
  // 1.1 Markdown link [title](youtube_url)
  const mdVideoRegex = /\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;
  text = text.replace(mdVideoRegex, (match, _title, url) => {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      return `<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    }
    return match;
  });

  // 1.2 Raw YouTube URL
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

  // 1. Markdown images: ![alt](src)
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_m, alt, src) => {
    if (src.includes("youtube")) return _m;
    const url = resolveUrl(src);
    return `<br><img src="${url}" alt="${alt}" data-lightbox="${url}" class="carmen-lightbox-img" style="max-width:100%;border-radius:12px;margin:8px 0;cursor:zoom-in;" /><br>`;
  });

  // 2. Existing HTML <img> tags with relative src — resolve to full API URL
  text = text.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (_m, before, src, after) => {
    // Skip if already an absolute URL or data URI
    if (/^(https?:|data:)/.test(src.trim())) return _m;
    const url = resolveUrl(src);
    // Add lightbox support and cursor hint
    const hasLightbox = before.includes('data-lightbox') || after.includes('data-lightbox');
    const lightboxAttr = hasLightbox ? '' : ` data-lightbox="${url}"`;
    const cursorStyle = 'cursor:zoom-in;';
    // Inject cursor into existing style or add new style
    let newAfter = after;
    if (after.includes('style="')) {
      newAfter = after.replace('style="', `style="${cursorStyle}`);
    } else {
      newAfter = ` style="${cursorStyle}"${after}`;
    }
    return `<img ${before}src="${url}"${lightboxAttr}${newAfter}>`;
  });

  return text;
}

function processLinks(text: string): string {
  // 1. Markdown Links [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  text = text.replace(mdLinkRegex, (match, label, url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return match;
    return `<a href="${url}" target="_blank" class="carmen-link">${label}</a>`;
  });

  // 2. Bare URLs — skip URLs inside HTML attributes
  const urlRegex = /(https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtu\.be))[^\s<)"']+)/g;
  text = text.replace(urlRegex, (match, _p1, offset, fullString) => {
    // Check if URL is inside an HTML attribute (look for =" or =' immediately before)
    const prefix = fullString.substring(Math.max(0, offset - 50), offset);
    // Skip if preceded by any attribute assignment like src=", href=", data-lightbox=", etc.
    if (/[=]['"]\s*$/.test(prefix)) return match;
    // Skip if inside an HTML tag (unclosed < before, no > between < and URL)
    const lastAngle = prefix.lastIndexOf('<');
    const lastClose = prefix.lastIndexOf('>');
    if (lastAngle > lastClose) return match; // inside a tag
    return `<a href="${match}" target="_blank" class="carmen-link">${match}</a>`;
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
      out.push(`<div class="carmen-heading-3">${line.replace(/^### /, "")}</div>`);
      continue;
    }
    if (/^## (.+)$/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<div class="carmen-heading-2">${line.replace(/^## /, "")}</div>`);
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
      out.push(`<div class="carmen-numbered-item">
        <b class="carmen-number">${numbered[1]}.</b>
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
    '<code class="carmen-inline-code">$1</code>'
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