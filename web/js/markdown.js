// Minimal, dependency-free Markdown → HTML renderer for the brief subset we emit:
// h1–h3, hr, blockquote, GFM pipe tables, ordered/unordered lists, bold, links,
// and paragraphs. Escapes HTML first, so input is safe to render.

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushTable = () => {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
    if (rows.length < 2) return rows.forEach((r) => out.push(`<p>${inline(r)}</p>`));
    const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(rows[0]);
    const body = rows.slice(2).map(cells);
    out.push('<table><thead><tr>' + head.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>');
    for (const r of body) out.push('<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
    out.push('</tbody></table>');
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') { i++; continue; }
    if (t === '---') { out.push('<hr>'); i++; continue; }
    if (t.startsWith('### ')) { out.push(`<h3>${inline(t.slice(4))}</h3>`); i++; continue; }
    if (t.startsWith('## ')) { out.push(`<h2>${inline(t.slice(3))}</h2>`); i++; continue; }
    if (t.startsWith('# ')) { out.push(`<h1>${inline(t.slice(2))}</h1>`); i++; continue; }
    if (t.startsWith('>')) {
      const parts = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) parts.push(lines[i++].trim().replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(parts.join(' '))}</blockquote>`);
      continue;
    }
    if (t.startsWith('|')) { flushTable(); continue; }
    if (/^\d+\.\s/.test(t)) {
      out.push('<ol>');
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) out.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s/, ''))}</li>`);
      out.push('</ol>');
      continue;
    }
    if (/^[-*]\s/.test(t)) {
      out.push('<ul>');
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) out.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s/, ''))}</li>`);
      out.push('</ul>');
      continue;
    }
    out.push(`<p>${inline(t)}</p>`);
    i++;
  }
  return out.join('\n');
}
