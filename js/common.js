/* ===== Jobsy - Jamaica's Service Marketplace ===== */

const SITE_NAME = 'Jobsy';
const BASE_URL = 'https://www.jobsyja.com';
const ADSENSE_PUB_ID = ''; // Paste your AdSense publisher ID here

/* ===== Service Categories ===== */
const CATEGORIES = [
  { slug: 'home-repair', name: 'Home Repair', icon: '&#128295;', desc: 'Plumbing, electrical, carpentry, and general home maintenance services across Jamaica.' },
  { slug: 'cleaning', name: 'Cleaning', icon: '&#129529;', desc: 'Residential and commercial cleaning, deep cleaning, and janitorial services.' },
  { slug: 'landscaping', name: 'Landscaping', icon: '&#127793;', desc: 'Lawn care, garden design, tree trimming, and outdoor maintenance.' },
  { slug: 'beauty', name: 'Beauty & Wellness', icon: '&#128135;', desc: 'Hair styling, barbering, nails, massage therapy, and personal care.' },
  { slug: 'automotive', name: 'Automotive', icon: '&#128663;', desc: 'Car repair, detailing, towing, and vehicle maintenance services.' },
  { slug: 'tech', name: 'Tech & IT', icon: '&#128187;', desc: 'Computer repair, phone repair, networking, web design, and IT support.' },
  { slug: 'tutoring', name: 'Tutoring', icon: '&#128218;', desc: 'Academic tutoring, music lessons, language classes, and skill training.' },
  { slug: 'events', name: 'Events', icon: '&#127881;', desc: 'Event planning, catering, DJ services, photography, and videography.' },
  { slug: 'moving', name: 'Moving & Delivery', icon: '&#128666;', desc: 'Local moving, furniture delivery, courier services, and logistics.' },
  { slug: 'construction', name: 'Construction', icon: '&#127959;', desc: 'Building, renovation, tiling, painting, and general contracting.' }
];

/* ===== Featured Service Providers ===== */
const TOOLS = [
  {
    slug: 'plumbing-pros',
    name: 'Plumbing Services',
    tagline: 'Licensed plumbers for residential and commercial jobs',
    description: 'Professional plumbing services including pipe repair, installation, drain cleaning, water heater service, and emergency plumbing across Kingston, Mandeville, and Montego Bay.',
    icon: '&#128295;',
    category: 'home-repair',
    pricing: 'quote',
    rating: 4.8,
    url: '#',
    features: ['Pipe Repair & Installation', 'Drain Cleaning', 'Water Heater Service', 'Emergency Plumbing', 'Bathroom Renovation', 'Kitchen Plumbing'],
    pros: ['Licensed and insured', 'Same-day emergency service', 'Free estimates', 'Island-wide coverage', 'Experienced technicians'],
    cons: ['Emergency rates apply after hours', 'Availability varies by parish']
  },
  {
    slug: 'electrical-experts',
    name: 'Electrical Services',
    tagline: 'Certified electricians for safe and reliable work',
    description: 'Professional electrical services including wiring, panel upgrades, lighting installation, generator setup, and electrical inspections across Jamaica.',
    icon: '&#9889;',
    category: 'home-repair',
    pricing: 'quote',
    rating: 4.7,
    url: '#',
    features: ['Wiring & Rewiring', 'Panel Upgrades', 'Lighting Installation', 'Generator Setup', 'Electrical Inspections', 'Solar Panel Installation'],
    pros: ['JPS certified', 'Safety-first approach', 'Residential and commercial', 'Free consultations', 'Warranty on work'],
    cons: ['Large projects require advance booking', 'Parts may need ordering']
  },
  {
    slug: 'sparkle-clean',
    name: 'Home Cleaning',
    tagline: 'Reliable residential and office cleaning services',
    description: 'Professional cleaning services for homes, offices, and commercial spaces. Deep cleaning, regular maintenance, move-in/move-out cleaning, and post-construction cleanup.',
    icon: '&#129529;',
    category: 'cleaning',
    pricing: 'fixed',
    rating: 4.9,
    url: '#',
    features: ['Regular House Cleaning', 'Deep Cleaning', 'Office Cleaning', 'Move-in/Move-out', 'Post-Construction Cleanup', 'Window Cleaning'],
    pros: ['Vetted and trained staff', 'Eco-friendly products available', 'Flexible scheduling', 'Satisfaction guaranteed', 'Affordable rates'],
    cons: ['Minimum booking required', 'Holiday surcharges apply']
  },
  {
    slug: 'green-thumb',
    name: 'Landscaping & Lawn Care',
    tagline: 'Transform your outdoor spaces beautifully',
    description: 'Complete landscaping services including lawn mowing, garden design, tree trimming, hedge shaping, irrigation installation, and outdoor living space creation.',
    icon: '&#127793;',
    category: 'landscaping',
    pricing: 'quote',
    rating: 4.6,
    url: '#',
    features: ['Lawn Mowing & Maintenance', 'Garden Design', 'Tree Trimming', 'Hedge Shaping', 'Irrigation Systems', 'Outdoor Living Spaces'],
    pros: ['Creative designs', 'Regular maintenance plans', 'Tropical plant expertise', 'Free site visits', 'Before/after portfolio'],
    cons: ['Seasonal demand affects scheduling', 'Large projects take time']
  },
  {
    slug: 'glam-studio',
    name: 'Hair & Beauty',
    tagline: 'Professional styling, braiding, and beauty services',
    description: 'Full-service beauty offerings including hair styling, braiding, locs maintenance, barbering, nail services, makeup artistry, and bridal packages.',
    icon: '&#128135;',
    category: 'beauty',
    pricing: 'fixed',
    rating: 4.8,
    url: '#',
    features: ['Hair Styling & Braiding', 'Locs Maintenance', 'Barbering', 'Nail Services', 'Makeup Artistry', 'Bridal Packages'],
    pros: ['Experienced stylists', 'Mobile service available', 'Quality products used', 'Competitive pricing', 'Walk-ins welcome'],
    cons: ['Popular times book fast', 'Bridal packages need advance booking']
  },
  {
    slug: 'auto-care',
    name: 'Auto Repair & Detailing',
    tagline: 'Complete automotive care and maintenance',
    description: 'Full-service automotive repair, maintenance, and detailing. Engine diagnostics, brake service, AC repair, body work, and premium car detailing.',
    icon: '&#128663;',
    category: 'automotive',
    pricing: 'quote',
    rating: 4.7,
    url: '#',
    features: ['Engine Diagnostics', 'Brake Service', 'AC Repair', 'Body Work', 'Car Detailing', 'Tire Service'],
    pros: ['Experienced mechanics', 'Honest pricing', 'Quality parts used', 'Warranty on repairs', 'Pickup and delivery available'],
    cons: ['Complex repairs may take multiple days', 'Imported parts may have lead time']
  },
  {
    slug: 'tech-fix',
    name: 'Tech & Phone Repair',
    tagline: 'Fast and reliable device repair and IT support',
    description: 'Professional tech services including phone screen repair, computer repair, data recovery, networking setup, web design, and IT consulting for businesses.',
    icon: '&#128187;',
    category: 'tech',
    pricing: 'fixed',
    rating: 4.6,
    url: '#',
    features: ['Phone Screen Repair', 'Computer Repair', 'Data Recovery', 'Network Setup', 'Web Design', 'IT Consulting'],
    pros: ['Quick turnaround', 'Genuine parts', 'Affordable rates', 'Business IT support', 'Remote support available'],
    cons: ['Some repairs need parts ordering', 'Complex data recovery takes time']
  },
  {
    slug: 'learn-ja',
    name: 'Tutoring & Lessons',
    tagline: 'Expert tutors for all ages and subjects',
    description: 'Academic tutoring for CXC, CAPE, and GSAT preparation. Also offering music lessons, language classes, computer skills training, and professional development.',
    icon: '&#128218;',
    category: 'tutoring',
    pricing: 'fixed',
    rating: 4.9,
    url: '#',
    features: ['CXC/CAPE Preparation', 'GSAT/PEP Tutoring', 'Music Lessons', 'Language Classes', 'Computer Skills', 'Professional Development'],
    pros: ['Qualified teachers', 'Flexible scheduling', 'Online and in-person', 'Proven results', 'Affordable group rates'],
    cons: ['Popular tutors book quickly', 'Group sizes may vary']
  },
  {
    slug: 'event-vibes',
    name: 'Event Planning & Services',
    tagline: 'Make your events unforgettable',
    description: 'Full event planning and services including catering, DJ and entertainment, photography, videography, decoration, and venue coordination for weddings, parties, and corporate events.',
    icon: '&#127881;',
    category: 'events',
    pricing: 'quote',
    rating: 4.8,
    url: '#',
    features: ['Event Planning', 'Catering', 'DJ & Entertainment', 'Photography', 'Videography', 'Decoration & Setup'],
    pros: ['Creative concepts', 'All-inclusive packages', 'Experienced team', 'Island-wide service', 'Customizable packages'],
    cons: ['Peak season books early', 'Deposits required']
  },
  {
    slug: 'move-it',
    name: 'Moving & Delivery',
    tagline: 'Safe and efficient moving and delivery services',
    description: 'Professional moving and delivery services including local moves, furniture delivery, office relocation, courier services, and logistics support across Jamaica.',
    icon: '&#128666;',
    category: 'moving',
    pricing: 'quote',
    rating: 4.5,
    url: '#',
    features: ['Local Moving', 'Furniture Delivery', 'Office Relocation', 'Courier Services', 'Packing & Unpacking', 'Storage Solutions'],
    pros: ['Careful handling', 'Insured moves', 'Competitive rates', 'Flexible scheduling', 'Island-wide coverage'],
    cons: ['Long-distance moves cost more', 'Peak times require advance booking']
  },
  {
    slug: 'build-right',
    name: 'Construction & Renovation',
    tagline: 'Quality building and renovation services',
    description: 'Professional construction services including new builds, home renovation, tiling, painting, roofing, and general contracting. Licensed and experienced contractors.',
    icon: '&#127959;',
    category: 'construction',
    pricing: 'quote',
    rating: 4.7,
    url: '#',
    features: ['New Construction', 'Home Renovation', 'Tiling & Flooring', 'Painting', 'Roofing', 'General Contracting'],
    pros: ['Licensed contractors', 'Quality workmanship', 'Project management included', 'Free estimates', 'References available'],
    cons: ['Large projects have longer timelines', 'Material costs fluctuate']
  },
  {
    slug: 'pest-control',
    name: 'Pest Control',
    tagline: 'Keep your home and business pest-free',
    description: 'Professional pest control services for residential and commercial properties. Treatment for termites, roaches, rats, mosquitoes, and other common Jamaican pests.',
    icon: '&#128027;',
    category: 'home-repair',
    pricing: 'fixed',
    rating: 4.6,
    url: '#',
    features: ['Termite Treatment', 'Roach Control', 'Rat Removal', 'Mosquito Treatment', 'Commercial Pest Control', 'Preventive Programs'],
    pros: ['Safe products used', 'Guaranteed results', 'Regular maintenance plans', 'Quick response time', 'Eco-friendly options'],
    cons: ['Severe infestations need multiple visits', 'Some treatments require vacating']
  }
];

/* ===== Navigation ===== */
function renderNav() {
  const isSubPage = window.location.pathname.includes('/tools/') || window.location.pathname.includes('/categories/');
  const basePath = isSubPage ? '../' : '';

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="${basePath}index.html" class="nav-logo">${SITE_NAME}<span class="nav-logo-tag">Jamaica</span></a>
      <div class="nav-links" id="mobile-menu">
        <a href="${basePath}index.html">Home</a>
        <a href="${basePath}about.html">About</a>
        <a href="${basePath}contact.html">Contact</a>
        <a href="${basePath}disclosure.html">Disclosure</a>
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
  const isSubPage = window.location.pathname.includes('/tools/') || window.location.pathname.includes('/categories/');
  const basePath = isSubPage ? '../' : '';

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <h4>About Jobsy</h4>
          <p>${SITE_NAME} is Jamaica's premier service marketplace, connecting you with trusted local service providers across the island. From home repair to beauty services, find the right professional for every job.</p>
          <p style="margin-top:0.5rem">Some links on this site are affiliate links. We may earn a commission at no extra cost to you.</p>
          <div class="footer-social" style="margin-top:0.75rem">
            <a href="https://t.me/JobsyDealBot" target="_blank" rel="noopener" aria-label="Telegram">Telegram</a>
            <a href="https://x.com/MachellWil66296" target="_blank" rel="noopener" aria-label="X (Twitter)">X / Twitter</a>
          </div>
        </div>
        <div>
          <h4>Services</h4>
          ${CATEGORIES.slice(0, 5).map(c => `<a href="${basePath}categories/${c.slug}.html">${c.name}</a>`).join('')}
        </div>
        <div>
          <h4>Popular</h4>
          ${CATEGORIES.slice(5, 10).map(c => `<a href="${basePath}categories/${c.slug}.html">${c.name}</a>`).join('')}
        </div>
        <div>
          <h4>Links</h4>
          <a href="${basePath}index.html">Home</a>
          <a href="${basePath}about.html">About Us</a>
          <a href="${basePath}contact.html">Contact</a>
          <a href="${basePath}privacy.html">Privacy Policy</a>
          <a href="${basePath}disclosure.html">Affiliate Disclosure</a>
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

/* ===== Service Card HTML Generator ===== */
function toolCardHTML(tool, basePath) {
  const badgeClass = tool.pricing === 'free' ? 'badge-free' : tool.pricing === 'fixed' ? 'badge-freemium' : 'badge-paid';
  const badgeLabel = tool.pricing === 'quote' ? 'Get Quote' : tool.pricing === 'fixed' ? 'Fixed Price' : 'Free';
  const cat = CATEGORIES.find(c => c.slug === tool.category);
  return `
    <div class="tool-card" style="cursor:default">
      <div class="tool-card-header">
        <div class="tool-card-icon">${tool.icon}</div>
        <div>
          <h3>${tool.name}</h3>
        </div>
        <span class="tool-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <p>${tool.tagline}</p>
      <div class="tool-card-footer">
        <span class="tool-card-category">${cat ? cat.name : tool.category}</span>
        <span class="tool-card-rating">&#9733; ${tool.rating}</span>
      </div>
    </div>`;
}

/* ===== Search (homepage) ===== */
function initSearch() {
  const searchInput = document.getElementById('hero-search');
  const grid = document.getElementById('tool-grid');
  if (!searchInput || !grid) return;

  const isSubPage = window.location.pathname.includes('/tools/') || window.location.pathname.includes('/categories/');
  const basePath = isSubPage ? '../' : '';

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) {
      renderToolGrid(TOOLS, basePath);
      return;
    }
    const filtered = TOOLS.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.tagline.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
    renderToolGrid(filtered, basePath);
  });
}

function renderToolGrid(tools, basePath) {
  const grid = document.getElementById('tool-grid');
  if (!grid) return;
  if (tools.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;padding:2rem">No services found matching your search.</p>';
    return;
  }
  grid.innerHTML = tools.map(t => toolCardHTML(t, basePath)).join('');
}

/* ===== Similar Services ===== */
function renderSimilarTools(currentSlug) {
  const container = document.getElementById('similar-tools');
  if (!container) return;

  const isSubPage = window.location.pathname.includes('/tools/') || window.location.pathname.includes('/categories/');
  const basePath = isSubPage ? '../' : '';

  const current = TOOLS.find(t => t.slug === currentSlug);
  if (!current) return;

  const similar = TOOLS.filter(t => t.slug !== currentSlug && t.category === current.category).slice(0, 3);
  if (similar.length === 0) return;

  container.innerHTML = `
    <div class="section-heading"><h2>Similar Services</h2></div>
    <div class="tool-grid">${similar.map(t => toolCardHTML(t, basePath)).join('')}</div>
  `;
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  initAds();
  initSearch();
});
