/* ===== Jobsy - Jamaica's Service Marketplace ===== */

const SITE_NAME = 'Jobsy';
const BASE_URL = 'https://www.jobsyja.com';
const API_URL = 'https://api.jobsyja.com'; // Backend gateway
const ADSENSE_PUB_ID = ''; // Paste your AdSense publisher ID here

/* ===== Service Categories ===== */
const CATEGORIES = [
  { slug: 'home-services', name: 'Home Services', icon: '&#128295;', desc: 'Plumbing, electrical, carpentry, and general home maintenance services across Jamaica.' },
  { slug: 'cleaning', name: 'Cleaning', icon: '&#129529;', desc: 'Residential and commercial cleaning, deep cleaning, and janitorial services.' },
  { slug: 'beauty-wellness', name: 'Beauty & Wellness', icon: '&#128135;', desc: 'Hair styling, barbering, nails, massage therapy, and personal care.' },
  { slug: 'automotive', name: 'Automotive', icon: '&#128663;', desc: 'Car repair, detailing, towing, and vehicle maintenance services.' },
  { slug: 'technology', name: 'Technology', icon: '&#128187;', desc: 'Computer repair, phone repair, networking, web design, and IT support.' },
  { slug: 'tutoring-education', name: 'Tutoring & Education', icon: '&#128218;', desc: 'Academic tutoring, music lessons, language classes, and skill training.' },
  { slug: 'events-entertainment', name: 'Events & Entertainment', icon: '&#127881;', desc: 'Event planning, catering, DJ services, photography, and videography.' },
  { slug: 'health-fitness', name: 'Health & Fitness', icon: '&#128170;', desc: 'Personal training, nutrition coaching, yoga, and wellness services.' },
  { slug: 'professional-services', name: 'Professional Services', icon: '&#128188;', desc: 'Accounting, tax preparation, business registration, and consulting.' },
  { slug: 'skilled-trades', name: 'Skilled Trades', icon: '&#9889;', desc: 'Electrical, welding, carpentry, and specialized trade services.' },
  { slug: 'creative-services', name: 'Creative Services', icon: '&#127912;', desc: 'Graphic design, photography, branding, and social media.' },
  { slug: 'construction', name: 'Construction', icon: '&#127959;', desc: 'Building, renovation, tiling, painting, and general contracting.' }
];

/* ===== Fallback Listings (shown when API is unavailable) ===== */
const FALLBACK_LISTINGS = [
  { id: 'fb-1', title: 'Plumbing Services', description: 'Licensed plumbers for residential and commercial jobs across Kingston and Montego Bay.', category: 'Home Services', parish: 'Kingston', budget: 10000, currency: 'JMD' },
  { id: 'fb-2', title: 'Electrical Services', description: 'Certified electricians for wiring, panel upgrades, and solar installations.', category: 'Skilled Trades', parish: 'St. Andrew', budget: 25000, currency: 'JMD' },
  { id: 'fb-3', title: 'Home Cleaning', description: 'Reliable residential and office cleaning. Deep cleaning and regular maintenance.', category: 'Cleaning', parish: 'St. Catherine', budget: 4000, currency: 'JMD' },
  { id: 'fb-4', title: 'Natural Hair Styling', description: 'Professional styling, braiding, locs, and makeup artistry. Mobile service available.', category: 'Beauty & Wellness', parish: 'St. Andrew', budget: 4000, currency: 'JMD' },
  { id: 'fb-5', title: 'Auto Repair & Detailing', description: 'Full-service automotive repair, engine diagnostics, AC service, and premium detailing.', category: 'Automotive', parish: 'St. Catherine', budget: 8000, currency: 'JMD' },
  { id: 'fb-6', title: 'Web Development & IT', description: 'Professional websites, office network setup, and IT consulting for small businesses.', category: 'Technology', parish: 'St. James', budget: 45000, currency: 'JMD' },
  { id: 'fb-7', title: 'CXC Math Tutoring', description: 'Expert CXC and CAPE preparation. Proven track record of Grade 1 results.', category: 'Tutoring & Education', parish: 'Manchester', budget: 3000, currency: 'JMD' },
  { id: 'fb-8', title: 'Wedding Planning Package', description: 'Full wedding coordination from venue selection to day-of management.', category: 'Events & Entertainment', parish: 'Portland', budget: 80000, currency: 'JMD' },
  { id: 'fb-9', title: 'Personal Training', description: 'Customized workout plans with nutrition guidance. Online and in-person sessions.', category: 'Health & Fitness', parish: 'Clarendon', budget: 20000, currency: 'JMD' },
  { id: 'fb-10', title: 'Small Business Tax Filing', description: 'Annual GCT and income tax preparation. Statutory compliance included.', category: 'Professional Services', parish: 'Westmoreland', budget: 25000, currency: 'JMD' },
  { id: 'fb-11', title: 'Brand Identity Package', description: 'Logo design, business cards, social media templates. 3 concept rounds included.', category: 'Creative Services', parish: 'Trelawny', budget: 30000, currency: 'JMD' },
  { id: 'fb-12', title: 'Bathroom Renovation', description: 'Complete bathroom remodel including tiling, fixtures, and plumbing.', category: 'Construction', parish: 'St. Ann', budget: 120000, currency: 'JMD' }
];

/* ===== API Client ===== */
const api = {
  async fetchListings(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/listings${qs ? '?' + qs : ''}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async fetchListing(id) {
    const res = await fetch(`${API_URL}/api/listings/${id}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async searchListings(query, params = {}) {
    const qs = new URLSearchParams({ q: query, ...params }).toString();
    const res = await fetch(`${API_URL}/api/search/listings?${qs}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async fetchProfile(userId) {
    const res = await fetch(`${API_URL}/api/profiles/${userId}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async register(data) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Registration failed: ${res.status}`);
    }
    return res.json();
  }
};

/* ===== Data Loading (API with fallback) ===== */
let _listings = null;

async function getListings(params = {}) {
  if (_listings && !Object.keys(params).length) return _listings;
  try {
    const data = await api.fetchListings(params);
    if (!Object.keys(params).length) _listings = data;
    return data;
  } catch {
    return FALLBACK_LISTINGS;
  }
}

/* ===== HTML Escaping ===== */
function escapeHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

/* ===== Category Helpers ===== */
function findCategory(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return CATEGORIES.find(c =>
    c.name.toLowerCase() === lower ||
    c.slug === lower ||
    c.slug === lower.replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')
  );
}

function categorySlug(name) {
  return (name || '').toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-');
}

/* ===== Navigation ===== */
function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">${SITE_NAME}<span class="nav-logo-tag">Jamaica</span></a>
      <div class="nav-links" id="mobile-menu">
        <a href="index.html">Home</a>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
        <a href="disclosure.html">Disclosure</a>
        <a href="https://t.me/JobsyDealBot" target="_blank" rel="noopener" class="btn btn-sm btn-primary">Telegram Bot</a>
      </div>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
    </div>
  `;
  document.body.prepend(nav);

  const toggle = nav.querySelector('.nav-toggle');
  const menu = nav.querySelector('#mobile-menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
}

/* ===== Footer ===== */
function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <h4>About Jobsy</h4>
          <p>${SITE_NAME} is Jamaica's premier service marketplace, connecting you with trusted local service providers across the island.</p>
          <div class="footer-social" style="margin-top:0.75rem">
            <a href="https://t.me/JobsyDealBot" target="_blank" rel="noopener">Telegram</a>
            <a href="https://x.com/MachellWil66296" target="_blank" rel="noopener">X / Twitter</a>
          </div>
        </div>
        <div>
          <h4>Services</h4>
          ${CATEGORIES.slice(0, 6).map(c => `<a href="category.html?cat=${c.slug}">${c.name}</a>`).join('')}
        </div>
        <div>
          <h4>More</h4>
          ${CATEGORIES.slice(6).map(c => `<a href="category.html?cat=${c.slug}">${c.name}</a>`).join('')}
        </div>
        <div>
          <h4>Links</h4>
          <a href="index.html">Home</a>
          <a href="about.html">About Us</a>
          <a href="contact.html">Contact</a>
          <a href="privacy.html">Privacy Policy</a>
          <a href="disclosure.html">Affiliate Disclosure</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} ${SITE_NAME} Jamaica. All rights reserved.</span>
        <span>Connecting Jamaicans with trusted local service providers.</span>
      </div>
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
      <ins class="adsbygoogle" style="display:block"
        data-ad-client="${ADSENSE_PUB_ID}"
        data-ad-slot="${adSlot}"
        data-ad-format="${format}"
        data-full-width-responsive="true"></ins>`;
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
  });
}

/* ===== Listing Card HTML ===== */
function listingCardHTML(listing) {
  const cat = findCategory(listing.category);
  const icon = cat ? cat.icon : '&#128188;';
  const catName = listing.category || 'Service';
  const parish = listing.parish || '';
  const price = listing.budget
    ? `J$${Number(listing.budget).toLocaleString()}`
    : 'Get Quote';

  return `
    <a href="provider.html?id=${encodeURIComponent(listing.id)}" class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon">${icon}</div>
        <div>
          <h3>${escapeHtml(listing.title)}</h3>
        </div>
        <span class="tool-badge badge-freemium">${price}</span>
      </div>
      <p>${escapeHtml(listing.description || '')}</p>
      <div class="tool-card-footer">
        <span class="tool-card-category">${escapeHtml(catName)}</span>
        ${parish ? `<span class="tool-card-rating">${escapeHtml(parish)}</span>` : ''}
      </div>
    </a>`;
}

/* ===== Search (homepage) ===== */
let _searchTimeout = null;

function initSearch() {
  const searchInput = document.getElementById('hero-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    clearTimeout(_searchTimeout);
    const q = searchInput.value.trim();

    if (!q) {
      getListings().then(listings => renderListingGrid(listings));
      return;
    }

    _searchTimeout = setTimeout(async () => {
      try {
        const results = await api.searchListings(q);
        renderListingGrid(results.results || results);
      } catch {
        const listings = await getListings();
        const lower = q.toLowerCase();
        const filtered = listings.filter(l =>
          (l.title || '').toLowerCase().includes(lower) ||
          (l.description || '').toLowerCase().includes(lower) ||
          (l.category || '').toLowerCase().includes(lower) ||
          (l.parish || '').toLowerCase().includes(lower)
        );
        renderListingGrid(filtered);
      }
    }, 300);
  });
}

function renderListingGrid(listings) {
  const grid = document.getElementById('tool-grid');
  if (!grid) return;
  if (!listings || listings.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;padding:2rem">No services found matching your search.</p>';
    return;
  }
  grid.innerHTML = listings.map(l => listingCardHTML(l)).join('');
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  initAds();
  initSearch();
});
