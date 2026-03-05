document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('case-input');
  const output = document.getElementById('case-output');

  function toTitleCase(str) {
    return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  function toSentenceCase(str) {
    return str.replace(/(^\s*|[.!?]\s+)(\w)/g, (m, p1, p2) => p1 + p2.toUpperCase())
      .replace(/^(\w)/, m => m.toUpperCase());
  }

  function toCamelCase(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, ch) => ch.toUpperCase());
  }

  function toSnakeCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s\-]+/g, '_').toLowerCase();
  }

  function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-').toLowerCase();
  }

  const converters = {
    upper: s => s.toUpperCase(),
    lower: s => s.toLowerCase(),
    title: toTitleCase,
    sentence: toSentenceCase,
    camel: toCamelCase,
    snake: toSnakeCase,
    kebab: toKebabCase
  };

  document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.case;
      const fn = converters[type];
      if (fn) output.value = fn(input.value);
    });
  });

  document.getElementById('copy-btn').addEventListener('click', () => copyToClipboard(output.value));
  document.getElementById('clear-btn').addEventListener('click', () => {
    input.value = '';
    output.value = '';
  });

  renderRelatedTools('case-converter');
});
