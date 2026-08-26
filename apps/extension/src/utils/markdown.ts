function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value: string) {
  return value
    .replace(/\*\*(.+?)(\*\*|$)/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function isTableRow(line: string) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line: string) {
  return /^\s*\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|\s*$/.test(line);
}

function tableCells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderTables(value: string) {
  const lines = value.split("\n");
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!isTableRow(lines[index]) || !isTableSeparator(lines[index + 1] ?? "")) {
      output.push(lines[index]);
      continue;
    }

    const headers = tableCells(lines[index]);
    const rows: string[][] = [];
    index += 2;
    while (index < lines.length && isTableRow(lines[index])) {
      rows.push(tableCells(lines[index]));
      index += 1;
    }
    index -= 1;

    output.push(
      `<table><thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>` +
      `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
    );
  }

  return output.join("\n");
}

export function renderMarkdown(markdown: string) {
  const codeBlocks: string[] = [];
  let html = escapeHtml(markdown).replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/g, (_match, code: string) => {
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push(`<pre><code>${code.trimEnd()}</code></pre>`);
    return token;
  });

  // During SSE streaming the closing fence may not have arrived yet.
  html = html.replace(/```(?:[\w-]+)?\n?([\s\S]*)$/g, (_match, code: string) => {
    const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push(`<pre><code>${code.trimEnd()}</code></pre>`);
    return token;
  });

  html = renderTables(html)
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^(<li>.*<\/li>)$/gm, "<ul>$1</ul>")
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (/^<(h[2-4]|ul|table|pre|p|div)/.test(trimmed)) return trimmed;
      return trimmed ? `<p>${renderInline(trimmed.replaceAll("\n", "<br>"))}</p>` : "";
    })
    .join("");

  return html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_match, index: string) => codeBlocks[Number(index)]);
}
