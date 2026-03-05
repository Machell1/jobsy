document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('json-input');
  const output = document.getElementById('json-output');
  const errorMsg = document.getElementById('error-msg');
  const indentSelect = document.getElementById('indent-size');

  function format() {
    errorMsg.textContent = '';
    const text = input.value.trim();
    if (!text) { output.textContent = ''; return; }
    try {
      const parsed = JSON.parse(text);
      const indent = parseInt(indentSelect.value);
      output.textContent = JSON.stringify(parsed, null, indent);
    } catch (e) {
      errorMsg.textContent = 'Invalid JSON: ' + e.message;
      output.textContent = '';
    }
  }

  function minify() {
    errorMsg.textContent = '';
    const text = input.value.trim();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      input.value = JSON.stringify(parsed);
      output.textContent = JSON.stringify(parsed);
    } catch (e) {
      errorMsg.textContent = 'Invalid JSON: ' + e.message;
    }
  }

  document.getElementById('format-btn').addEventListener('click', format);
  document.getElementById('minify-btn').addEventListener('click', minify);
  document.getElementById('copy-btn').addEventListener('click', () => {
    copyToClipboard(output.textContent || input.value);
  });
  document.getElementById('clear-btn').addEventListener('click', () => {
    input.value = '';
    output.textContent = '';
    errorMsg.textContent = '';
  });
  document.getElementById('sample-btn').addEventListener('click', () => {
    input.value = '{"name":"John Doe","age":30,"email":"john@example.com","hobbies":["reading","coding","hiking"],"address":{"street":"123 Main St","city":"Anytown","country":"US"}}';
    format();
  });
  indentSelect.addEventListener('change', () => {
    if (output.textContent) format();
  });

  renderRelatedTools('json-formatter');
});
