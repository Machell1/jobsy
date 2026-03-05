document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('b64-input');
  const output = document.getElementById('b64-output');
  const errorMsg = document.getElementById('error-msg');

  function encode() {
    errorMsg.textContent = '';
    try {
      output.value = btoa(unescape(encodeURIComponent(input.value)));
    } catch (e) {
      errorMsg.textContent = 'Encoding error: ' + e.message;
    }
  }

  function decode() {
    errorMsg.textContent = '';
    try {
      output.value = decodeURIComponent(escape(atob(input.value.trim())));
    } catch (e) {
      errorMsg.textContent = 'Invalid Base64 input: ' + e.message;
    }
  }

  document.getElementById('encode-btn').addEventListener('click', encode);
  document.getElementById('decode-btn').addEventListener('click', decode);
  document.getElementById('copy-btn').addEventListener('click', () => copyToClipboard(output.value));
  document.getElementById('clear-btn').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    errorMsg.textContent = '';
  });
  document.getElementById('swap-btn').addEventListener('click', () => {
    const temp = input.value;
    input.value = output.value;
    output.value = temp;
  });

  // File drop
  const dropZone = document.getElementById('drop-zone');
  if (dropZone) {
    ['dragover', 'dragenter'].forEach(evt => {
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, () => { dropZone.style.borderColor = ''; });
    });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(',')[1] || result;
        output.value = base64;
      };
      reader.readAsDataURL(file);
    });
  }

  renderRelatedTools('base64-encoder');
});
