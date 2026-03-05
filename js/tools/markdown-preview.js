document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');

  // Simple markdown parser (no external dependencies)
  function parseMd(md) {
    let html = md;

    // Code blocks (fenced)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Bold & italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Unordered lists
    html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Paragraphs
    html = html.replace(/^(?!<[hupob\-lr]|<li|<blockquote|<pre|<hr)(.+)$/gm, '<p>$1</p>');

    // Line breaks
    html = html.replace(/\n{2,}/g, '\n');

    return html;
  }

  function update() {
    preview.innerHTML = parseMd(input.value);
  }

  input.addEventListener('input', update);

  document.getElementById('copy-btn').addEventListener('click', () => copyToClipboard(preview.innerHTML));
  document.getElementById('sample-btn').addEventListener('click', () => {
    input.value = `# Hello World

This is a **Markdown** preview tool. Type on the left and see the result on the right.

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- Inline \`code\` and code blocks
- Lists and headings

> This is a blockquote

\`\`\`js
function hello() {
  console.log("Hello!");
}
\`\`\`

---

Enjoy writing Markdown!`;
    update();
  });

  // Start with sample
  document.getElementById('sample-btn').click();
  renderRelatedTools('markdown-preview');
});
