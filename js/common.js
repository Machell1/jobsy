/* ===== Jobsy - Jamaica's Service Marketplace ===== */

const SITE_NAME = 'Jobsy';
const BASE_URL = 'https://www.jobsyja.com';
// If api.jobsyja.com DNS is not yet configured, paste your Railway public
// URL below as a temporary fallback (e.g. 'https://jobsy-production.up.railway.app').
// Once the CNAME record is live you can clear this back to ''.
const RAILWAY_API_URL = '';
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? 'http://localhost:8000'
  : (RAILWAY_API_URL || 'https://api.jobsyja.com');
const ADSENSE_PUB_ID = ''; // Paste your AdSense publisher ID here

/* ===== Service Categories ===== */
const CATEGORIES = [
  { slug: 'home-services', name: 'Home Services', icon: '🔧', desc: 'Plumbing, electrical, carpentry, and general home maintenance services across Jamaica.' },
  { slug: 'cleaning', name: 'Cleaning', icon: '🧹', desc: 'Residential and commercial cleaning, deep cleaning, and janitorial services.' },
  { slug: 'beauty-wellness', name: 'Beauty & Wellness', icon: '💇', desc: 'Hair styling, barbering, nails, massage therapy, and personal care.' },
  { slug: 'automotive', name: 'Automotive', icon: '🚗', desc: 'Car repair, detailing, towing, and vehicle maintenance services.' },
  { slug: 'technology', name: 'Technology', icon: '💻', desc: 'Computer repair, phone repair, networking, web design, and IT support.' },
  { slug: 'tutoring-education', name: 'Tutoring & Education', icon: '📚', desc: 'Academic tutoring, music lessons, language classes, and skill training.' },
  { slug: 'events-entertainment', name: 'Events & Entertainment', icon: '🎉', desc: 'Event planning, catering, DJ services, photography, and videography.' },
  { slug: 'health-fitness', name: 'Health & Fitness', icon: '💪', desc: 'Personal training, nutrition coaching, yoga, and wellness services.' },
  { slug: 'professional-services', name: 'Professional Services', icon: '💼', desc: 'Accounting, tax preparation, business registration, and consulting.' },
  { slug: 'skilled-trades', name: 'Skilled Trades', icon: '⚡', desc: 'Electrical, welding, carpentry, and specialized trade services.' },
  { slug: 'creative-services', name: 'Creative Services', icon: '🎨', desc: 'Graphic design, photography, branding, and social media.' },
  { slug: 'construction', name: 'Construction', icon: '🏗', desc: 'Building, renovation, tiling, painting, and general contracting.' }
];

/* ===== Fallback Listings (shown when API is unavailable) ===== */
const FALLBACK_LISTINGS = [
  { id: 'fb-1', title: 'Plumbing Services', description: 'Licensed plumbers for residential and commercial jobs across Kingston and Montego Bay.', category: 'Home Services', parish: 'Kingston', budget: 10000, currency: 'JMD' },
  { id: 'fb-2', title: 'Electrical Services', description: 'Certified electricians for wiring, panel upgrades, and solar installations.', category: 'Skilled Trades', parish: 'St. Andrew', budget: 25000, currency: 'JMD' },
  { id: 'fb-3', title: 'Home Cleaning', description: 'Reliable residential and office cleaning. Deep cleaning and regular maintenance.', category: 'Cleaning', parish: 'St. Catherine', budget: 4000, currency: 'JMD' },
  { id: 'fb-4', title: 'Natural Hair Styling', description: 'Professional styling, braiding, locs, and makeup artistry. Mobile service available.', category: 'Beauty & Wellness', parish: 'St. Andrew', budget: 4000, currency: 'JMD' },
  { id: 'fb-5', title: 'Auto Repair & Detailing', description: 'Full-service automotive repair, engine diagnostics, AC service, and premium detailing.', category: 'Automotive', parish: 'St. Catherine', budget: 8000, currency: 'JMD' },
  { id: 'fb-6', title: 'Web Development & IT', description: 'Professional websites, office network setup, and IT consulting for small businesses.', category: 'Technology', parish: 'St. James', budget: 45000, currency: 'JMD' },
  { id: 'fb-7', title: 'CXC Math Tutoring', description: 'CXC and CAPE preparation with consistent Grade 1 results.', category: 'Tutoring & Education', parish: 'Manchester', budget: 3000, currency: 'JMD' },
  { id: 'fb-8', title: 'Wedding Planning Package', description: 'Full wedding coordination from venue selection to day-of management.', category: 'Events & Entertainment', parish: 'Portland', budget: 80000, currency: 'JMD' },
  { id: 'fb-9', title: 'Personal Training', description: 'Workout plans and nutrition guidance. Online and in-person sessions available.', category: 'Health & Fitness', parish: 'Clarendon', budget: 20000, currency: 'JMD' },
  { id: 'fb-10', title: 'Small Business Tax Filing', description: 'Annual GCT and income tax preparation. Statutory compliance included.', category: 'Professional Services', parish: 'Westmoreland', budget: 25000, currency: 'JMD' },
  { id: 'fb-11', title: 'Brand Identity Package', description: 'Logo design, business cards, social media templates. 3 concept rounds included.', category: 'Creative Services', parish: 'Trelawny', budget: 30000, currency: 'JMD' },
  { id: 'fb-12', title: 'Bathroom Renovation', description: 'Complete bathroom remodel including tiling, fixtures, and plumbing.', category: 'Construction', parish: 'St. Ann', budget: 120000, currency: 'JMD' }
];

/* ===== Auth Helpers ===== */
function getAuthToken() {
  return localStorage.getItem('jobsy_access_token');
}

function setAuthTokens(access, refresh) {
  localStorage.setItem('jobsy_access_token', access);
  if (refresh) localStorage.setItem('jobsy_refresh_token', refresh);
}

function clearAuth() {
  localStorage.removeItem('jobsy_access_token');
  localStorage.removeItem('jobsy_refresh_token');
}

function isLoggedIn() {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch { return false; }
}

function _authHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const WS_URL = API_URL.replace(/^http/, 'ws');

/* ===== Token Refresh ===== */
let _refreshPromise = null;

async function _tryRefreshToken() {
  if (_refreshPromise) return _refreshPromise;
  const refreshToken = localStorage.getItem('jobsy_refresh_token');
  if (!refreshToken) { clearAuth(); return false; }
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) { clearAuth(); return false; }
      const tokens = await res.json();
      setAuthTokens(tokens.access_token, tokens.refresh_token);
      return true;
    } catch { clearAuth(); return false; }
    finally { _refreshPromise = null; }
  })();
  return _refreshPromise;
}

async function _authFetch(url, options = {}) {
  options.headers = { ..._authHeaders(), ...(options.headers || {}) };
  if (!options.signal) options.signal = AbortSignal.timeout(10000);
  let res = await fetch(url, options);
  if (res.status === 401 && localStorage.getItem('jobsy_refresh_token')) {
    const refreshed = await _tryRefreshToken();
    if (refreshed) {
      options.headers = { ..._authHeaders(), ...(options.headers || {}) };
      delete options.headers['Authorization'];
      options.headers['Authorization'] = `Bearer ${getAuthToken()}`;
      res = await fetch(url, options);
    }
  }
  return res;
}

/* ===== API Client ===== */
const api = {
  async fetchListings(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/listings${qs ? '?' + qs : ''}`, {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async fetchListing(id) {
    const res = await fetch(`${API_URL}/api/listings/${id}`, {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async fetchMyListings() {
    const res = await _authFetch(`${API_URL}/api/listings/mine`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async createListing(data) {
    const res = await _authFetch(`${API_URL}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Create listing failed: ${res.status}`);
    }
    return res.json();
  },
  async updateListing(id, data) {
    const res = await _authFetch(`${API_URL}/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Update listing failed: ${res.status}`);
    }
    return res.json();
  },
  async deleteListing(id) {
    const res = await _authFetch(`${API_URL}/api/listings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Delete listing failed: ${res.status}`);
    return res.json();
  },
  async searchListings(query, params = {}) {
    const qs = new URLSearchParams({ q: query, ...params }).toString();
    const res = await fetch(`${API_URL}/api/search/listings?${qs}`, {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async fetchProfile(userId) {
    const res = await fetch(`${API_URL}/api/profiles/${userId}`, {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async fetchMyProfile() {
    const res = await _authFetch(`${API_URL}/api/profiles/me`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async updateProfile(data) {
    const res = await _authFetch(`${API_URL}/api/profiles/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Update profile failed: ${res.status}`);
    }
    return res.json();
  },
  async fetchReviews(userId) {
    const res = await fetch(`${API_URL}/api/reviews/user/${userId}`, {
      headers: _authHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async getStreamToken() {
    const res = await _authFetch(`${API_URL}/api/chat/token`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async getConversations() {
    const res = await _authFetch(`${API_URL}/api/chat/conversations`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async getMessages(conversationId) {
    const res = await _authFetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async markRead(conversationId) {
    const res = await _authFetch(`${API_URL}/api/chat/conversations/${conversationId}/read`, {
      method: 'PUT',
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  },
  async forgotPassword(phone) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  async resetPassword(phone, otp, newPassword) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, new_password: newPassword }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Reset failed: ${res.status}`);
    }
    const tokens = await res.json();
    setAuthTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },
  async login(phone, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Login failed: ${res.status}`);
    }
    const tokens = await res.json();
    setAuthTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
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
    const tokens = await res.json();
    setAuthTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  }
};

/* ===== Stream Chat Manager ===== */
const StreamChatManager = {
  async fetchToken() {
    return api.getStreamToken();
  },

  init(apiKey) {
    if (typeof StreamChat === 'undefined') {
      throw new Error('Stream Chat SDK not loaded');
    }
    return StreamChat.getInstance(apiKey);
  },

  async connectUser(client, userId, token) {
    await client.connectUser({ id: userId }, token);
    return client;
  },

  async listChannels(client, userId) {
    const filter = { type: 'messaging', members: { $in: [userId] } };
    const sort = [{ last_message_at: -1 }];
    return client.queryChannels(filter, sort, { watch: false, state: true });
  },

  async watchChannel(channel) {
    await channel.watch();
    return channel;
  },

  async sendMessage(channel, text) {
    return channel.sendMessage({ text });
  },

  getChannelId(userA, userB) {
    return [userA, userB].sort().join('_');
  },

  async getOrCreateDMChannel(client, currentUserId, otherUserId) {
    const channelId = this.getChannelId(currentUserId, otherUserId);
    const channel = client.channel('messaging', channelId, {
      members: [currentUserId, otherUserId],
    });
    await channel.watch();
    return channel;
  },
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
  // Skip navigation link for accessibility
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  document.body.prepend(skipLink);

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">${SITE_NAME}<span class="nav-logo-tag">JA</span></a>
      <div class="nav-links" id="nav-menu">
        <a href="index.html">Home</a>
        <a href="category.html">Services</a>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
        <a href="https://t.me/JobsyDealBot" target="_blank" rel="noopener" class="btn btn-sm btn-accent">Telegram Bot</a>
        ${isLoggedIn()
          ? '<a href="dashboard.html">Dashboard</a><a href="messages.html">Messages</a><a href="#" class="btn btn-sm btn-outline" id="nav-logout">Log Out</a>'
          : '<a href="login.html" class="btn btn-sm btn-outline">Log In</a>'}
      </div>
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
    </div>
  `;
  document.body.prepend(nav);

  const toggle = nav.querySelector('.nav-toggle');
  const menu = nav.querySelector('#nav-menu');
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  // Close menu when clicking a link (mobile)
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });

  // Logout handler
  const logoutBtn = nav.querySelector('#nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuth();
      window.location.reload();
    });
  }
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
          <p>${SITE_NAME} is a Jamaican service marketplace. Find local professionals by category and parish.</p>
          <div class="footer-social" style="margin-top:0.75rem">
            <a href="https://t.me/JobsyDealBot" target="_blank" rel="noopener">Telegram</a>
            <a href="https://x.com/JobsyJamaica" target="_blank" rel="noopener">X / Twitter</a>
          </div>
        </div>
        <div>
          <h4>Services</h4>
          ${CATEGORIES.slice(0, 6).map(c => `<a href="category.html?cat=${c.slug}">${c.name}</a>`).join('')}
        </div>
        <div>
          <h4>More Services</h4>
          ${CATEGORIES.slice(6).map(c => `<a href="category.html?cat=${c.slug}">${c.name}</a>`).join('')}
        </div>
        <div>
          <h4>Links</h4>
          <a href="index.html">Home</a>
          <a href="about.html">About</a>
          <a href="contact.html">Contact</a>
          <a href="privacy.html">Privacy Policy</a>
          <a href="terms.html">Terms of Service</a>
          <a href="disclosure.html">Affiliate Disclosure</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} ${SITE_NAME} Jamaica. All rights reserved.</span>
        <span>Mandeville, Manchester, Jamaica</span>
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
  const icon = cat ? cat.icon : '💼';
  const catName = listing.category || 'Service';
  const parish = listing.parish || '';
  const budgetVal = listing.budget_max ?? listing.budget_min ?? listing.budget;
  const price = budgetVal != null
    ? `J$${Number(budgetVal).toLocaleString()}`
    : 'Get Quote';

  return `
    <a href="provider.html?id=${encodeURIComponent(listing.id)}" class="service-card">
      <div class="service-card-header">
        <div class="service-card-icon">${icon}</div>
        <div>
          <h3>${escapeHtml(listing.title)}</h3>
        </div>
        <span class="service-badge">${price}</span>
      </div>
      <p>${escapeHtml(listing.description || '')}</p>
      <div class="service-card-footer">
        <span class="service-card-category">${escapeHtml(catName)}</span>
        ${parish ? `<span class="service-card-location">📍 ${escapeHtml(parish)}</span>` : ''}
      </div>
    </a>`;
}

/* ===== Search (homepage) ===== */
let _searchTimeout = null;

function initSearch() {
  const searchInput = document.getElementById('hero-search');
  if (!searchInput) return;

  const searchBtn = document.getElementById('hero-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      clearTimeout(_searchTimeout);
      searchInput.dispatchEvent(new Event('input'));
    });
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(_searchTimeout);
      searchInput.dispatchEvent(new Event('input'));
    }
  });

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
        renderListingGrid(results.hits || results.results || results);
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
  const grid = document.getElementById('service-grid');
  if (!grid) return;
  if (!listings || listings.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;padding:2rem">No services found matching your search.</p>';
    return;
  }
  grid.innerHTML = listings.map(l => listingCardHTML(l)).join('');
}

/* ===== Favicon & Meta ===== */
function injectHeadMeta() {
  // Favicon
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'images/logo.svg';
    document.head.appendChild(link);
  }
  // og:image fallback
  if (!document.querySelector('meta[property="og:image"]')) {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'og:image');
    meta.content = `${BASE_URL}/images/logo.svg`;
    document.head.appendChild(meta);
  }
}

/* ===== Newsletter ===== */
function initNewsletter() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;
  const btn = form.querySelector('button');
  const input = form.querySelector('input[type="email"]');
  if (!btn || !input) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = '#dc2626';
      return;
    }
    input.style.borderColor = '';
    btn.disabled = true;
    btn.textContent = 'Subscribing...';
    try {
      const res = await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        form.innerHTML = '<p style="color:var(--primary);font-weight:600">Thanks for subscribing!</p>';
      } else {
        throw new Error('failed');
      }
    } catch {
      const mailto = 'mailto:jobsyja@jobsyja.com?subject=Newsletter%20Signup&body=Please%20add%20me%20to%20the%20newsletter:%20' + encodeURIComponent(email);
      form.innerHTML = '<p style="color:var(--primary);font-weight:600">Thanks for your interest! <a href="' + mailto + '" style="color:var(--primary);text-decoration:underline">Click here to subscribe via email</a></p>';
    }
  });
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  injectHeadMeta();
  renderNav();
  renderFooter();
  initAds();
  initSearch();
  initNewsletter();
});
