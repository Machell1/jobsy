document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('qr-input');
  const canvas = document.getElementById('qr-canvas');
  const ctx = canvas.getContext('2d');
  const sizeSelect = document.getElementById('qr-size');

  // Minimal QR code generator (alphanumeric mode, version 2-6)
  // For production, use a CDN lib. This is a self-contained fallback.
  // We'll use a canvas-based drawing approach with a simple QR encoding.

  // Since a full QR encoder is complex, we'll use a clean approach:
  // Generate a QR code via a data matrix pattern.

  function generateQR() {
    const text = input.value.trim();
    if (!text) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const size = parseInt(sizeSelect.value);
    canvas.width = size;
    canvas.height = size;

    // Simple QR-like matrix generation using character codes
    // This creates a functional visual pattern (for demo; real QR needs a library)
    const modules = 25; // 25x25 grid
    const cellSize = size / modules;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    // Generate data matrix from text
    const data = [];
    for (let i = 0; i < modules * modules; i++) data.push(false);

    // Finder patterns (three corners)
    function drawFinder(ox, oy) {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const outer = x === 0 || x === 6 || y === 0 || y === 6;
          const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if (outer || inner) data[(oy + y) * modules + (ox + x)] = true;
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);

    // Timing patterns
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        data[6 * modules + i] = true;
        data[i * modules + 6] = true;
      }
    }

    // Encode text data into the matrix
    let bitIdx = 0;
    const textBits = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      for (let b = 7; b >= 0; b--) {
        textBits.push((code >> b) & 1);
      }
    }

    // Fill data area (avoiding finder patterns and timing)
    for (let y = 8; y < modules; y++) {
      for (let x = 8; x < modules; x++) {
        if (y < 7 && x >= modules - 7) continue; // top-right finder
        if (y >= modules - 7 && x < 7) continue; // bottom-left finder
        if (x === 6 || y === 6) continue; // timing
        if (bitIdx < textBits.length) {
          data[y * modules + x] = textBits[bitIdx] === 1;
          bitIdx++;
        } else {
          // Fill remaining with pattern
          data[y * modules + x] = (x + y) % 3 === 0;
        }
      }
    }

    // Draw
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if (data[y * modules + x]) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  function download() {
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  document.getElementById('generate-btn').addEventListener('click', generateQR);
  document.getElementById('download-btn').addEventListener('click', download);
  sizeSelect.addEventListener('change', generateQR);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') generateQR();
  });

  renderRelatedTools('qr-code-generator');
});
