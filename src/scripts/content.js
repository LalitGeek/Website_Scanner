function performAutoScan() {
  const data = {
    tech: [],
    security: [],
    seo: {},
    perf: {},
    contacts: { emails: [], phones: [] },
    paths: [],
    hasWebSockets: false
  };

  const techSignatures = [
    // Frontend
    { name: 'React', category: 'Frontend', pattern: /react/i },
    { name: 'Angular', category: 'Frontend', pattern: /ng-app|ng-controller|angular/i },
    { name: 'Vue.js', category: 'Frontend', pattern: /v-bind|v-model|vue/i },
    { name: 'Svelte', category: 'Frontend', pattern: /svelte/i },
    { name: 'Next.js', category: 'Frontend', pattern: /_next/i },
    { name: 'Nuxt.js', category: 'Frontend', pattern: /_nuxt/i },
    { name: 'Gatsby', category: 'Frontend', pattern: /Gatsby/i },
    { name: 'Alpine.js', category: 'Frontend', pattern: /x-data|x-init/i },
    
    // UI Frameworks & Components
    { name: 'Material UI', category: 'UI Framework', pattern: /Mui|muidocs/i },
    { name: 'Ant Design', category: 'UI Framework', pattern: /ant-btn|ant-layout/i },
    { name: 'Chakra UI', category: 'UI Framework', pattern: /chakra-ui/i },
    { name: 'Element Plus', category: 'UI Framework', pattern: /el-button|el-input/i },
    { name: 'Vuetify', category: 'UI Framework', pattern: /v-btn|v-card/i },
    { name: 'Ionic', category: 'UI Framework', pattern: /ion-app|ion-content/i },
    { name: 'Headless UI', category: 'UI Framework', pattern: /headlessui/i },
    
    // Backend/CMS
    { name: 'WordPress', category: 'Backend/CMS', pattern: /wp-content|wp-includes/i },
    { name: 'Shopify', category: 'E-commerce', pattern: /shopify/i },
    { name: 'Magento', category: 'E-commerce', pattern: /magento/i },
    { name: 'WooCommerce', category: 'E-commerce', pattern: /woocommerce/i },
    { name: 'Django', category: 'Backend/CMS', pattern: /csrfmiddlewaretoken/i },
    { name: 'PHP', category: 'Backend/CMS', pattern: /\.php/i },
    { name: 'Ruby on Rails', category: 'Backend/CMS', pattern: /csrf-param/i },
    { name: 'Laravel', category: 'Backend/CMS', pattern: /laravel/i },
    { name: 'Ghost', category: 'Backend/CMS', pattern: /ghost-sdk/i },
    { name: 'Webflow', category: 'Web Builder', pattern: /webflow/i },
    { name: 'Wix', category: 'Web Builder', pattern: /wix\.com/i },
    { name: 'Squarespace', category: 'Web Builder', pattern: /squarespace/i },
    { name: 'Jekyll', category: 'Static Site', pattern: /jekyll/i },
    { name: 'Hugo', category: 'Static Site', pattern: /hugo/i },
    
    // CSS Libraries
    { name: 'Bootstrap', category: 'CSS Framework', pattern: /bootstrap/i },
    { name: 'Tailwind CSS', category: 'CSS Framework', pattern: /tailwind/i },
    { name: 'Materialize', category: 'CSS Framework', pattern: /materialize/i },
    { name: 'Bulma', category: 'CSS Framework', pattern: /bulma/i },
    { name: 'Foundation', category: 'CSS Framework', pattern: /foundation\.css/i },
    
    // JS Libraries
    { name: 'jQuery', category: 'Library', pattern: /jquery/i },
    { name: 'Lodash', category: 'Library', pattern: /lodash/i },
    { name: 'Moment.js', category: 'Library', pattern: /moment/i },
    { name: 'D3.js', category: 'Library', pattern: /d3\.js/i },
    { name: 'Three.js', category: 'Library', pattern: /three\.js/i },
    { name: 'GSAP', category: 'Library', pattern: /gsap/i },
    
    // Analytics & Marketing
    { name: 'Google Analytics', category: 'Analytics', pattern: /google-analytics|gtag/i },
    { name: 'Mixpanel', category: 'Analytics', pattern: /mixpanel/i },
    { name: 'Hotjar', category: 'Analytics', pattern: /hotjar/i },
    { name: 'Segment', category: 'Analytics', pattern: /segment\.js/i },
    { name: 'HubSpot', category: 'Marketing', pattern: /hubspot/i },
    { name: 'Marketo', category: 'Marketing', pattern: /marketo/i },
    { name: 'Mailchimp', category: 'Marketing', pattern: /mailchimp/i },
    
    // Advertising
    { name: 'Google Ads (AdSense)', category: 'Advertising', pattern: /googlesyndication|adsbygoogle/i },
    { name: 'Facebook Pixel', category: 'Advertising', pattern: /fbevents\.js/i },
    { name: 'Amazon Advertising', category: 'Advertising', pattern: /amazon-adsystem/i },
    { name: 'Taboola', category: 'Advertising', pattern: /taboola/i },
    { name: 'Outbrain', category: 'Advertising', pattern: /outbrain/i },
    { name: 'Criteo', category: 'Advertising', pattern: /criteo/i },
    { name: 'AdRoll', category: 'Advertising', pattern: /adroll/i },
    { name: 'DoubleVerify', category: 'Advertising', pattern: /doubleverify/i },
    
    // Cloud & Infrastructure
    { name: 'Firebase', category: 'Cloud', pattern: /firebase/i },
    { name: 'Supabase', category: 'Cloud', pattern: /supabase/i },
    { name: 'Algolia', category: 'Search', pattern: /algolia/i },
    { name: 'Stripe', category: 'Payments', pattern: /stripe\.com/i },
    { name: 'Heroku', category: 'PaaS', pattern: /heroku/i },
    { name: 'Vercel', category: 'PaaS/Hosting', pattern: /vercel/i },
    { name: 'Netlify', category: 'PaaS/Hosting', pattern: /netlify/i },

    // Database Indicators (Heuristics)
    { name: 'MySQL', category: 'Database', pattern: /mysql/i, confidence: 40 },
    { name: 'PostgreSQL', category: 'Database', pattern: /postgresql|postgres/i, confidence: 40 },
    { name: 'MongoDB', category: 'Database', pattern: /mongodb/i, confidence: 40 },
    { name: 'Redis', category: 'Database', pattern: /redis/i, confidence: 30 }
  ];

  // Font Detection
  const fonts = new Set();
  try {
    const computedStyles = window.getComputedStyle(document.body);
    if (computedStyles.fontFamily) {
      computedStyles.fontFamily.split(',').forEach(f => fonts.add(f.trim().replace(/['"]/g, '')));
    }
    // Deep scan for unique fonts in headings
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach(h => {
      const f = window.getComputedStyle(h).fontFamily;
      if (f) f.split(',').forEach(font => fonts.add(font.trim().replace(/['"]/g, '')));
    });
  } catch (e) {}
  
  data.fonts = Array.from(fonts).slice(0, 10); // Top 10 fonts
  data.fonts.forEach(f => data.tech.push({ name: f, category: 'Font', confidence: 100 }));

  // Ad Slot Detection
  const adSelectors = ['.ad-slot', '.ad-container', '.adsbygoogle', '[id^="google_ads_"]', '.taboola-ad'];
  let adSlotsFound = 0;
  adSelectors.forEach(selector => {
    adSlotsFound += document.querySelectorAll(selector).length;
  });
  if (adSlotsFound > 0) {
    data.tech.push({ name: `${adSlotsFound} Ad Slots`, category: 'Advertising', confidence: 100 });
  }

  const html = document.documentElement.innerHTML;
  const scriptTags = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML).join(' ');
  const linkTags = Array.from(document.querySelectorAll('link')).map(l => l.href).join(' ');
  const combinedSource = html + ' ' + scriptTags + ' ' + linkTags;
  
  techSignatures.forEach(sig => {
    if (sig.pattern.test(combinedSource)) {
      data.tech.push({ 
        name: sig.name, 
        category: sig.category, 
        confidence: sig.confidence || 90 
      });
    }
  });

  // Web Sockets check
  if (/wss?:\/\//i.test(combinedSource) || window.WebSocket) {
    data.hasWebSockets = true;
    data.tech.push({ name: 'WebSockets', category: 'Network' });
  }
  
  // Security checks
  data.security.push({ name: 'HTTPS', passed: location.protocol === 'https:' });
  data.security.push({ name: 'CSP', passed: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]') });
  
  if (location.protocol === 'https:') {
    const insecure = Array.from(document.querySelectorAll('img, script, link')).filter(el => (el.src || el.href)?.startsWith('http:'));
    data.security.push({ name: 'Mixed Content', passed: insecure.length === 0 });
  }

  // Comprehensive SEO Analysis
  data.seo = {
    'Title': document.title || 'Untitled',
    'Description': document.querySelector('meta[name="description"]')?.content || 'Missing',
    'Canonical': document.querySelector('link[rel="canonical"]')?.href || 'Not set',
    'OG:Title': document.querySelector('meta[property="og:title"]')?.content || 'N/A',
    'OG:Image': document.querySelector('meta[property="og:image"]')?.content || 'N/A',
    'Twitter:Card': document.querySelector('meta[name="twitter:card"]')?.content || 'N/A',
    'Headings': {
      'H1': document.querySelectorAll('h1').length,
      'H2': document.querySelectorAll('h2').length,
      'H3': document.querySelectorAll('h3').length
    },
    'Images w/o Alt': Array.from(document.querySelectorAll('img')).filter(img => !img.alt).length
  };

  data.perf['Images'] = document.querySelectorAll('img').length;
  data.perf['Scripts'] = document.querySelectorAll('script').length;
  
  if (window.performance && window.performance.timing) {
    const t = window.performance.timing;
    data.perf = {
      'DNS Lookup': t.domainLookupEnd - t.domainLookupStart,
      'TCP Connect': t.connectEnd - t.connectStart,
      'TTFB': t.responseStart - t.navigationStart,
      'DOM Interactive': t.domInteractive - t.navigationStart,
      'Full Load': t.loadEventEnd - t.navigationStart,
      'Images': document.querySelectorAll('img').length,
      'Scripts': document.querySelectorAll('script').length
    };
  } else {
    data.perf['Full Load'] = 'N/A';
  }

  // Contact Extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|(?:\+?\d{1,3}[-.\s]?)?\d{10,12}/g;
  
  const emails = html.match(emailRegex) || [];
  const phones = html.match(phoneRegex) || [];
  
  data.contacts.emails = [...new Set(emails)].slice(0, 5);
  data.contacts.phones = [...new Set(phones)].slice(0, 5);

  // Path Discovery (Internal Links)
  const links = Array.from(document.querySelectorAll('a'));
  const internalPaths = new Set();
  links.forEach(a => {
    try {
      const url = new URL(a.href);
      if (url.hostname === location.hostname) {
        internalPaths.add(url.pathname);
      }
    } catch (e) {}
  });
  data.paths = Array.from(internalPaths).slice(0, 10);

  // Send results to background
  if (chrome.runtime && chrome.runtime.id) {
    try {
      chrome.runtime.sendMessage({
        action: 'AUTO_SCAN_RESULTS',
        data: data,
        hostname: location.hostname
      });
    } catch (e) {
      // Extension context invalidated (e.g. extension reloaded)
      console.log('Webpage Scanner: Extension context invalidated, stopping auto-scan.');
      if (observer) observer.disconnect();
    }
  }
}

if (document.readyState === 'complete') {
  performAutoScan();
} else {
  window.addEventListener('load', performAutoScan);
}

let timeout;
const observer = new MutationObserver(() => {
  clearTimeout(timeout);
  timeout = setTimeout(performAutoScan, 2000);
});
observer.observe(document.body, { childList: true, subtree: true });
