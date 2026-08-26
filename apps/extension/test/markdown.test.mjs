import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../src/utils/markdown.ts";

test("renders common assistant Markdown and escapes raw HTML", () => {
  const html = renderMarkdown("**完成**\n\n- 第一项\n- 第二项\n\n| 功能 | 说明 |\n| --- | --- |\n| Bug | 查询 |\n\n<script>alert(1)</script>");

  assert.match(html, /<strong>完成<\/strong>/);
  assert.match(html, /<ul><li>第一项<\/li><\/ul>/);
  assert.match(html, /<table>[\s\S]*<th>功能<\/th>[\s\S]*<td>查询<\/td>[\s\S]*<\/table>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("renders an unfinished fenced block while SSE is still arriving", () => {
  const html = renderMarkdown("正在生成：\n\n```lua\nprint('hello')");

  assert.match(html, /<pre><code>[\s\S]*print/);
  assert.doesNotMatch(html, /```lua/);
});

test("renders bold text across the streamed work-status response", () => {
  const html = renderMarkdown(
    "我来查询您的当前工作状态和Bug列表。\n\n" +
      "目前您没有待处理的 Bug！🎉\n\n" +
      "根据查询结果：\n\n" +
      "**当前工作状态**：待处理 Bug 数量为 **0**\n" +
      "**未解决的 Bug 列表**：为空\n" +
      "您涉及的项目总共 15 个。",
  );

  assert.match(html, /<strong>当前工作状态<\/strong>/);
  assert.match(html, /数量为 <strong>0<\/strong>/);
  assert.match(html, /<strong>未解决的 Bug 列表<\/strong>/);
  assert.doesNotMatch(html, /\*\*当前工作状态\*\*/);
});
