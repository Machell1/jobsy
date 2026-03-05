document.addEventListener('DOMContentLoaded', () => {
  const lengthSlider = document.getElementById('pw-length');
  const lengthDisplay = document.getElementById('pw-length-val');
  const output = document.getElementById('pw-output');
  const strengthFill = document.getElementById('strength-fill');
  const strengthText = document.getElementById('strength-text');

  const charSets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  function getPool() {
    let pool = '';
    if (document.getElementById('opt-upper').checked) pool += charSets.uppercase;
    if (document.getElementById('opt-lower').checked) pool += charSets.lowercase;
    if (document.getElementById('opt-digits').checked) pool += charSets.digits;
    if (document.getElementById('opt-symbols').checked) pool += charSets.symbols;
    return pool;
  }

  function generate() {
    const pool = getPool();
    if (!pool) { output.value = 'Select at least one character type'; return; }
    const len = parseInt(lengthSlider.value);
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    let pw = '';
    for (let i = 0; i < len; i++) {
      pw += pool[arr[i] % pool.length];
    }
    output.value = pw;
    updateStrength(pool.length, len);
  }

  function updateStrength(poolSize, len) {
    const entropy = Math.log2(Math.pow(poolSize, len));
    let label, pct, color;
    if (entropy < 40) { label = 'Weak'; pct = 25; color = 'var(--danger)'; }
    else if (entropy < 60) { label = 'Fair'; pct = 50; color = 'var(--warning)'; }
    else if (entropy < 80) { label = 'Strong'; pct = 75; color = 'var(--primary)'; }
    else { label = 'Very Strong'; pct = 100; color = 'var(--success)'; }
    strengthFill.style.width = pct + '%';
    strengthFill.style.background = color;
    strengthText.textContent = label + ' (' + Math.round(entropy) + ' bits)';
  }

  lengthSlider.addEventListener('input', () => {
    lengthDisplay.textContent = lengthSlider.value;
    generate();
  });

  document.querySelectorAll('.pw-option').forEach(el => el.addEventListener('change', generate));
  document.getElementById('generate-btn').addEventListener('click', generate);
  document.getElementById('copy-btn').addEventListener('click', () => copyToClipboard(output.value));

  generate();
  renderRelatedTools('password-generator');
});
