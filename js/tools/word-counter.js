document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('text-input');
  const stats = {
    words: document.getElementById('stat-words'),
    chars: document.getElementById('stat-chars'),
    charsNoSpace: document.getElementById('stat-chars-no-space'),
    sentences: document.getElementById('stat-sentences'),
    paragraphs: document.getElementById('stat-paragraphs'),
    readingTime: document.getElementById('stat-reading-time')
  };

  function update() {
    const text = input.value;
    const trimmed = text.trim();

    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = trimmed === '' ? 0 : trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = trimmed === '' ? 0 : trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    stats.words.textContent = words;
    stats.chars.textContent = chars;
    stats.charsNoSpace.textContent = charsNoSpace;
    stats.sentences.textContent = sentences;
    stats.paragraphs.textContent = paragraphs;
    stats.readingTime.textContent = words === 0 ? '0 min' : readingTime + ' min';
  }

  input.addEventListener('input', update);
  update();

  document.getElementById('clear-btn').addEventListener('click', () => {
    input.value = '';
    update();
  });

  document.getElementById('copy-btn').addEventListener('click', () => {
    copyToClipboard(input.value);
  });

  renderRelatedTools('word-counter');
});
