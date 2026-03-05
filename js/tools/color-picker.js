document.addEventListener('DOMContentLoaded', () => {
  const picker = document.getElementById('color-input');
  const hexInput = document.getElementById('hex-val');
  const rgbInput = document.getElementById('rgb-val');
  const hslInput = document.getElementById('hsl-val');
  const preview = document.getElementById('color-preview');

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function updateFromHex(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    picker.value = hex;
    hexInput.value = hex.toUpperCase();
    const { r, g, b } = hexToRgb(hex);
    rgbInput.value = `rgb(${r}, ${g}, ${b})`;
    const { h, s, l } = rgbToHsl(r, g, b);
    hslInput.value = `hsl(${h}, ${s}%, ${l}%)`;
    preview.style.background = hex;
  }

  picker.addEventListener('input', () => updateFromHex(picker.value));

  hexInput.addEventListener('change', () => {
    let val = hexInput.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    updateFromHex(val);
  });

  document.querySelectorAll('.copy-color').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      copyToClipboard(target.value);
    });
  });

  updateFromHex('#2563EB');
  renderRelatedTools('color-picker');
});
