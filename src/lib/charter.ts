import fs from 'fs/promises';
import path from 'path';

const charterDir = path.join(process.cwd(), 'src/content/charter');

export async function readCharterMarkdown(filename: 'current.md' | 'history.md') {
  return fs.readFile(path.join(charterDir, filename), 'utf8');
}

export function splitMarkdownSections(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const sections: { title: string; body: string }[] = [];
  let currentTitle = '';
  let buffer: string[] = [];

  const flush = () => {
    if (!currentTitle) return;
    sections.push({ title: currentTitle, body: buffer.join('\n').trim() });
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentTitle = line.replace(/^##\s+/, '').trim();
      buffer = [];
      continue;
    }
    if (line.startsWith('# ')) continue;
    buffer.push(line);
  }

  flush();
  return sections.filter(s => s.title);
}
