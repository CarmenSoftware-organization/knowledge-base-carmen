// ==========================================
// 🎬 YouTube Video Processing
// ==========================================

// ✅ ฟังก์ชันดึง Video ID จาก Youtube
export function getYoutubeId(url) {
    if (!url) return null;
    try {
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regExp);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

function processYouTubeLinks(str) {
    // 1.1 จัดการ Markdown link [title](youtube_url)
    const mdVideoRegex = /\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;
    str = str.replace(mdVideoRegex, (match, title, url) => {
        const videoId = getYoutubeId(url);
        if (videoId) {
            return `<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
        }
        return match;
    });

    // 1.2 จัดการ raw YouTube URL
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
    str = str.replace(urlRegex, (match, p1, offset, fullString) => {
        const prefix = fullString.substring(Math.max(0, offset - 10), offset);
        if (/src=['"]$|href=['"]$|\($/.test(prefix)) return match;
        const before = fullString.substring(Math.max(0, offset - 100), offset);
        if (before.includes('carmen-processed-video')) return match;

        const videoId = getYoutubeId(match);
        if (videoId) {
            return `<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
        }
        return match;
    });

    return str;
}

// ==========================================
// 🖼️ Image Processing
// ==========================================

function processImages(str, cleanApiBase) {
    const buildImageUrl = (url) => {
        let cleanUrl = url.trim().replace(/\\/g, '/');
        if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return cleanUrl;
        if (cleanUrl.startsWith('data:')) return cleanUrl;

        const getRelative = (u) => {
            let p = u.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
            p = p.replace(/^\/images\//, '').replace(/^\.\//, '').replace(/^\/+/, '');
            // Clean carmen_cloud/ prefix if leaking to frontend
            return p.replace(/^carmen_cloud\//, '');
        };

        if (/^(http|https):/.test(cleanUrl)) {
            const isLocalServer = cleanUrl.includes('127.0.0.1') ||
                cleanUrl.includes('localhost') ||
                (cleanApiBase && cleanUrl.startsWith(cleanApiBase));

            if (!isLocalServer) {
                // Do not strip directory with .pop() ! Instead use getRelative to keep folder structure
                const relPath = cleanUrl.split('/images/');
                if (relPath.length > 1) {
                    return `${cleanApiBase}/images/${relPath[1]}`;
                }
                const filename = getRelative(cleanUrl);
                return `${cleanApiBase}/images/${filename}`;
            }

            if (!cleanUrl.includes('/images/')) {
                return `${cleanApiBase}/images/${getRelative(cleanUrl)}`;
            }

            return cleanUrl;
        }

        return `${cleanApiBase}/images/${getRelative(cleanUrl)}`;
    };

    // Markdown ![alt](url)
    str = str.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) return match;
        const src = buildImageUrl(url);
        return `<br><a href="${src}" target="_blank"><img src="${src}" alt="${alt}" class="carmen-processed-img"></a><br>`;
    });

    // HTML <img src="...">
    str = str.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
        if (match.includes('carmen-processed-img') || src.includes('youtube')) return match;
        const fullSrc = buildImageUrl(src);
        return `<br><a href="${fullSrc}" target="_blank"><img src="${fullSrc}" class="carmen-processed-img"></a><br>`;
    });

    // Detect bare image filenames (e.g. folder/image.png)
    str = str.replace(/(?:^|[\s>])(?:ดูรูป\s*)?`?((?:[\w\-\u2010\u2011\u2012\u2013]+\/)*[\w\-\u2010\u2011\u2012\u2013]+\.(?:png|jpg|jpeg|gif|svg|webp))`?/gi, (match, filename) => {
        const normalized = filename.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-');
        const cleanName = normalized.replace(/^carmen_cloud\//, '');
        const src = `${cleanApiBase}/images/${cleanName}`;
        return `<br><a href="${src}" target="_blank"><img src="${src}" alt="${cleanName}" class="carmen-processed-img"></a><br>`;
    });

    // Prevent phantom requests from incomplete <img> tags during streaming
    str = str.replace(/<img[^>]*$/gi, '');

    return str;
}

// ==========================================
// 🔗 Link Processing
// ==========================================

function processLinks(str) {
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;
    str = str.replace(urlRegex, (match, p1, offset, fullString) => {
        const prefix = fullString.substring(Math.max(0, offset - 10), offset);
        if (/src=['"]$|href=['"]$|>$/.test(prefix)) return match;
        return `<a href="${match}" target="_blank" style="color:#2563eb; text-decoration:underline;">${match}</a>`;
    });
    return str;
}

// ==========================================
// 📝 Line-by-Line Markdown → HTML
// ==========================================

function processLineByLine(str) {
    const lines = str.split('\n');
    let result = [];
    let inUl = false;
    let olCounter = 0;
    let consecutiveBlanks = 0;

    for (let line of lines) {
        let trimmed = line.trim();

        // Horizontal rule
        if (/^---+$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            olCounter = 0;
            consecutiveBlanks = 0;
            result.push('<hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">');
            continue;
        }

        // Headers
        if (/^### (.+)$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            olCounter = 0;
            consecutiveBlanks = 0;
            result.push(`<div style="font-weight:700; font-size:15px; margin:12px 0 6px 0;">${trimmed.replace(/^### /, '')}</div>`);
            continue;
        }
        if (/^## (.+)$/.test(trimmed)) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            olCounter = 0;
            consecutiveBlanks = 0;
            result.push(`<div style="font-weight:700; font-size:16px; margin:14px 0 6px 0;">${trimmed.replace(/^## /, '')}</div>`);
            continue;
        }

        // Unordered list
        if (/^[-*] (.+)$/.test(trimmed)) {
            consecutiveBlanks = 0;
            if (!inUl) { result.push('<ul>'); inUl = true; }
            result.push(`<li>${trimmed.replace(/^[-*] /, '')}</li>`);
            continue;
        }

        // Ordered list — use the actual number from the LLM output
        const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (olMatch) {
            if (inUl) { result.push('</ul>'); inUl = false; }
            olCounter++;
            consecutiveBlanks = 0;
            const num = olMatch[1];
            const content = olMatch[2];
            result.push(`<div style="display:flex; gap:8px; margin:6px 0 2px 0;"><b style="min-width:20px; color:#1e40af;">${num}.</b><span>${content}</span></div>`);
            continue;
        }

        // Close unordered list if needed
        if (inUl && !/^[-*] /.test(trimmed)) { result.push('</ul>'); inUl = false; }

        // Empty line
        if (trimmed === '') {
            consecutiveBlanks++;
            if (consecutiveBlanks >= 2) {
                olCounter = 0;
            }
            if (result.length > 0 && result[result.length - 1] !== '<br>') {
                result.push('<br>');
            }
        } else {
            consecutiveBlanks = 0;
            // Bold line (section title) resets list context
            if (/^\*\*.+\*\*/.test(trimmed)) {
                olCounter = 0;
            }
            if (olCounter > 0) {
                if (trimmed.startsWith('<br><a href=') || trimmed.startsWith('<img') || trimmed.includes('carmen-processed-video')) {
                    result.push(`<div style="margin:2px 0 8px 28px;">${trimmed}</div>`);
                } else {
                    result.push(`<div style="margin:2px 0 6px 28px; color:#475569;">${trimmed}</div>`);
                }
            } else {
                result.push(trimmed + '<br>');
            }
        }
    }
    if (inUl) result.push('</ul>');

    return result.join('');
}

// ==========================================
// ✏️ Inline Formatting (bold, italic, code)
// ==========================================

function processInlineStyles(str) {
    str = str.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:13px;">$1</code>');
    str = str.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    str = str.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');
    return str;
}

// ==========================================
// ✅ Main Export — ฟังก์ชันแปลงข้อความแบบเบ็ดเสร็จ
// ==========================================

export function formatMessageContent(text, apiBase) {
    if (!text) return "";
    let str = String(text);
    const cleanApiBase = apiBase ? apiBase.replace(/\/$/, '') : '';

    // Process in order: videos → images → links → markdown → inline styles
    str = processYouTubeLinks(str);
    str = processImages(str, cleanApiBase);
    str = processLinks(str);
    str = processLineByLine(str);

    // Clean up excessive breaks
    str = str.replace(/(<br>){3,}/g, '<br><br>');

    str = processInlineStyles(str);

    return str;
}