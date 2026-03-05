/* ===== FreeToolBox - Common JavaScript ===== */

const SITE_NAME = 'FreeToolBox';
const ADSENSE_PUB_ID = ''; // Paste your AdSense publisher ID here, e.g. 'ca-pub-1234567890'

const TOOLS = [
  { name: 'Word Counter', slug: 'word-counter', icon: '&#9997;', desc: 'Count words, characters, sentences, and paragraphs instantly.' },
  { name: 'JSON Formatter', slug: 'json-formatter', icon: '&#123;&#125;', desc: 'Format, validate, and minify JSON data with syntax highlighting.' },
  { name: 'Password Generator', slug: 'password-generator', icon: '&#128274;', desc: 'Generate strong, random passwords with customizable options.' },
  { name: 'Base64 Encoder', slug: 'base64-encoder', icon: '&#128260;', desc: 'Encode and decode text or files to and from Base64.' },
  { name: 'Color Picker', slug: 'color-picker', icon: '&#127912;', desc: 'Pick colors and convert between HEX, RGB, and HSL formats.' },
  { name: 'Lorem Ipsum', slug: 'lorem-ipsum-generator', icon: '&#128196;', desc: 'Generate placeholder text in paragraphs, sentences, or words.' },
  { name: 'Case Converter', slug: 'case-converter', icon: '&#128289;', desc: 'Convert text to uppercase, lowercase, title case, and more.' },
  { name: 'Markdown Preview', slug: 'markdown-preview', icon: '&#128221;', desc: 'Write Markdown and see a live HTML preview side by side.' },
  { name: 'QR Code Generator', slug: 'qr-code-generator', icon: '&#9638;', desc: 'Generate QR codes from any text or URL. Download as PNG.' },
  { name: 'Unit Converter', slug: 'unit-converter', icon: '&#128207;', desc: 'Convert between units of length, weight, temperature, and more.' }
];

/* ===== Navigation ===== */
function renderNav() {
  const isToolPage = window.location.pathname.includes('/tools/');
  const basePath = isToolPage ? '../' : '';

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');

  // Desktop nav links
  const linksHtml = TOOLS.map(t =>
    `<li><a href="${basePath}tools/${t.slug}.html">${t.name}</a></li>`
  ).join('');

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="${basePath}index.html" class="nav-logo" aria-label="${SITE_NAME} home">
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="24" height="24" rx="5" stroke="currentColor" stroke-width="2"/><path d="M8 14h12M14 8v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        ${SITE_NAME}
      </a>
      <ul class="nav-links">${linksHtml}</ul>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div class="nav-mobile" id="mobile-menu">
      <a href="${basePath}index.html">Home</a>
      ${TOOLS.map(t => `<a href="${basePath}tools/${t.slug}.html">${t.name}</a>`).join('')}
    </div>
  `;

  document.body.prepend(nav);

  // Mobile toggle
  const toggle = nav.querySelector('.nav-toggle');
  const menu = nav.querySelector('#mobile-menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
}

/* ===== Footer ===== */
function renderFooter() {
  const isToolPage = window.location.pathname.includes('/tools/');
  const basePath = isToolPage ? '../' : '';

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-links">
        <a href="${basePath}index.html">Home</a>
        <a href="${basePath}privacy.html">Privacy Policy</a>
      </div>
      <p class="footer-disclosure">Some links on this site may be affiliate links. We may earn a small commission at no extra cost to you. All tools are free to use — no signup required.</p>
      <p class="footer-copy">&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
    </div>
  `;
  document.body.appendChild(footer);
}

/* ===== Ad Slots ===== */
function initAds() {
  if (!ADSENSE_PUB_ID) return;
  document.querySelectorAll('.ad-slot').forEach(slot => {
    const format = slot.dataset.adFormat || 'auto';
    const adSlot = slot.dataset.adSlot || '';
    slot.innerHTML = `
      <ins class="adsbygoogle"
        style="display:block"
        data-ad-client="${ADSENSE_PUB_ID}"
        data-ad-slot="${adSlot}"
        data-ad-format="${format}"
        data-full-width-responsive="true"></ins>
    `;
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  });
}

/* ===== Copy to Clipboard ===== */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showCopyFeedback();
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback();
  });
}

function showCopyFeedback() {
  let el = document.querySelector('.copy-feedback');
  if (!el) {
    el = document.createElement('div');
    el.className = 'copy-feedback';
    el.textContent = 'Copied to clipboard!';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('show'), 1500);
}

/* ===== Related Tools ===== */
function renderRelatedTools(currentSlug) {
  const container = document.getElementById('related-tools');
  if (!container) return;

  const others = TOOLS.filter(t => t.slug !== currentSlug);
  // Pick 3 random
  const picked = [];
  const copy = [...others];
  for (let i = 0; i < 3 && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }

  container.innerHTML = `
    <h2>Related Tools</h2>
    <div class="related-tools-grid">
      ${picked.map(t => `
        <a href="${t.slug}.html" class="tool-card">
          <div class="tool-card-icon">${t.icon}</div>
          <h3>${t.name}</h3>
          <p>${t.desc}</p>
        </a>
      `).join('')}
    </div>
  `;
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  initAds();
});
