#!/usr/bin/env node
/**
 * แปลงไฟล์ใน docs/carmen_cloud เป็นรูปแบบ Wiki.js (เพิ่ม frontmatter)
 * แล้วเขียนลง wiki-import/ — หลังจากนั้น copy เนื้อหาใน wiki-import ไปที่ root ของ repo
 * แล้วให้ Wiki.js ทำ Sync (Pull) เพื่อนำเข้า
 *
 * รัน: node scripts/wiki-import-from-carmencloud.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'carmen_cloud');
const OUT = path.join(ROOT, 'wiki-import');

const FRONTMATTER_KEYS = ['title', 'description', 'published', 'date', 'tags', 'editor', 'dateCreated'];

function extractTitleFromContent(content) {
  const firstLine = content.split('\n').find(l => l.startsWith('# '));
  return firstLine ? firstLine.replace(/^#\s+/, '').trim() : 'Untitled';
}

function stripExistingFrontmatter(content) {
  if (!content.trimStart().startsWith('---')) return content;
  const rest = content.replace(/^---\n/, '');
  const end = rest.indexOf('\n---');
  if (end === -1) return content;
  return rest.slice(end + 4).trimStart();
}

function slugFromPath(filePath) {
  return path.basename(filePath, '.md')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_.]/g, '');
}

function buildWikiFrontmatter(title, relativePath) {
  const now = new Date().toISOString();
  return {
    title,
    description: title,
    published: true,
    date: now,
    tags: 'carmen_cloud,documentation',
    editor: 'markdown',
    dateCreated: now,
  };
}

function toYaml(obj) {
  return Object.entries(obj)
    .map(([k, v]) => {
      if (typeof v === 'string' && (v.includes(':') || v.includes('\n') || v.includes('"'))) {
        return `${k}: "${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      }
      return `${k}: ${v}`;
    })
    .join('\n');
}

function processFile(srcPath, relPath) {
  const fullContent = fs.readFileSync(srcPath, 'utf8');
  const body = stripExistingFrontmatter(fullContent);
  const title = extractTitleFromContent(body);
  const fm = buildWikiFrontmatter(title, relPath);
  const dirRel = path.dirname(relPath);
  const baseName = path.basename(relPath, '.md');
  const slugName = baseName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '') || 'page';
  const outRel = dirRel ? path.join(dirRel, slugName + '.md') : slugName + '.md';
  const outPath = path.join(OUT, 'carmen_cloud', outRel);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const newContent = `---\n${toYaml(fm)}\n---\n\n${body}`;
  fs.writeFileSync(outPath, newContent, 'utf8');
  return outPath;
}

function walkDir(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const mdFiles = [];
  for (const e of entries) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) {
      mdFiles.push(...walkDir(path.join(dir, e.name), rel));
    } else if (e.name.endsWith('.md')) {
      mdFiles.push(rel);
    }
  }
  return mdFiles;
}

if (!fs.existsSync(SRC)) {
  console.error('ไม่พบโฟลเดอร์ docs/carmen_cloud');
  process.exit(1);
}

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const mdFiles = walkDir(SRC);
console.log(`พบ ${mdFiles.length} ไฟล์ .md`);

for (const rel of mdFiles) {
  const srcFull = path.join(SRC, rel);
  try {
    const outFile = processFile(srcFull, rel);
    console.log('  ', rel, '->', path.relative(ROOT, outFile));
  } catch (err) {
    console.error('  ERROR', rel, err.message);
  }
}

// Copy images: same structure under wiki-import/carmen_cloud
function copyImages(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.join(base, e.name);
    const srcFull = path.join(dir, e.name);
    if (e.isDirectory()) {
      copyImages(srcFull, rel);
    } else if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e.name)) {
      const destDir = path.join(OUT, 'carmen_cloud', path.dirname(rel));
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcFull, path.join(destDir, e.name));
      console.log('  (image)', rel);
    }
  }
}
copyImages(SRC);

console.log('\nเสร็จแล้ว. ไฟล์อยู่ใน wiki-import/');
console.log('ขั้นตอนถัดไป:');
console.log('  1) ดูโครงสร้างใน Wiki ว่าหน้าที่มี path ย่อย (เช่น /a/b) เก็บเป็นโฟลเดอร์หรือไม่');
console.log('  2) copy เนื้อหาใน wiki-import/ ไปที่ root ของ repo (หรือ path ที่ Wiki ใช้)');
console.log('  3) git add, commit, push');
console.log('  4) ใน Wiki.js กด Sync / Pull from target');
