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

  // Multi-dimensional Technology Detection Engine using external TECH_SIGNATURES
  const htmlContent = document.documentElement.innerHTML;
  const scriptElements = Array.from(document.querySelectorAll('script'));
  const scriptSources = scriptElements.map(s => s.src || '').filter(Boolean).join(' ');
  const inlineScripts = scriptElements.map(s => s.innerHTML || '').filter(Boolean).join(' ');
  const stylesheetSources = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href || '').filter(Boolean).join(' ');

  if (typeof TECH_SIGNATURES !== 'undefined') {
    TECH_SIGNATURES.forEach(sig => {
      let detected = false;
      let matchedConfidence = sig.confidence || 90;

      // 1. Detect by HTML patterns
      if (sig.html && sig.html.some(pattern => pattern.test(htmlContent))) {
        detected = true;
      }
      
      // 2. Detect by Script source patterns
      if (!detected && sig.scripts && sig.scripts.some(pattern => pattern.test(scriptSources))) {
        detected = true;
      }

      // 3. Detect by Stylesheet/Link patterns
      if (!detected && sig.links && sig.links.some(pattern => pattern.test(stylesheetSources))) {
        detected = true;
      }

      // 4. Detect by Meta tag patterns
      if (!detected && sig.meta) {
        for (const [metaName, metaPattern] of Object.entries(sig.meta)) {
          const metaEl = document.querySelector(`meta[name="${metaName}"], meta[property="${metaName}"]`);
          if (metaEl && metaPattern.test(metaEl.content || '')) {
            detected = true;
            break;
          }
        }
      }

      // 5. Detect by global window variables
      if (!detected && sig.js) {
        const hasJsVar = sig.js.some(varName => {
          try {
            // Check if variable exists on the window object
            return typeof window[varName] !== 'undefined';
          } catch (e) {
            return false;
          }
        });
        if (hasJsVar) {
          detected = true;
        }
      }

      if (detected) {
        data.tech.push({
          name: sig.name,
          category: sig.category || 'Other',
          confidence: matchedConfidence
        });
      }
    });
  }

  // Web Sockets check
  const combinedSourceForSockets = htmlContent + ' ' + scriptSources + ' ' + inlineScripts + ' ' + stylesheetSources;
  if (/wss?:\/\//i.test(combinedSourceForSockets) || window.WebSocket) {
    data.hasWebSockets = true;
    data.tech.push({ name: 'WebSockets', category: 'Network', confidence: 100 });
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
  
  const emails = htmlContent.match(emailRegex) || [];
  const phones = htmlContent.match(phoneRegex) || [];
  
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

  // Media Discovery (Highest Quality, All Types, No Duplicates)
  const mediaUrls = new Set();
  const mediaExtensions = /\.(jpg|jpeg|png|gif|webp|svg|avif|ico|mp4|webm|ogv|mov|mp3|wav|ogg|aac|m4a)$/i;

  function cleanAndAdd(url) {
    if (!url) return;
    try {
      const absoluteUrl = new URL(url, location.href).href;
      const cleaned = getHighestQualityUrl(absoluteUrl);
      const u = new URL(cleaned);
      if (u.protocol.startsWith('http')) {
        mediaUrls.add(cleaned);
      }
    } catch (e) {}
  }

  function getHighestQualitySrcset(srcset) {
    if (!srcset) return null;
    const candidates = srcset.split(',').map(item => {
      const parts = item.trim().split(/\s+/);
      const url = parts[0];
      let val = 1;
      if (parts[1]) {
        if (parts[1].endsWith('w')) {
          val = parseInt(parts[1].slice(0, -1), 10) || 1;
        } else if (parts[1].endsWith('x')) {
          val = parseFloat(parts[1].slice(0, -1)) * 1000 || 1000;
        }
      }
      return { url, val };
    });
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.val - a.val);
    return candidates[0].url;
  }

  function getHighestQualityUrl(url) {
    try {
      const u = new URL(url);
      // Remove resizing query parameters to retrieve the original master resolution
      const paramsToRemove = ['w', 'width', 'h', 'height', 'resize', 'size', 'thumb', 'thumbnail'];
      paramsToRemove.forEach(p => {
        if (u.searchParams.has(p)) u.searchParams.delete(p);
      });
      if (u.hostname.includes('gravatar.com')) {
        u.searchParams.set('s', '2048');
      }
      return u.href;
    } catch (e) {
      return url;
    }
  }

  try {
    // 1. Img elements
    document.querySelectorAll('img').forEach(img => {
      if (img.srcset) {
        const bestSrc = getHighestQualitySrcset(img.srcset);
        if (bestSrc) cleanAndAdd(bestSrc);
      } else if (img.src) {
        cleanAndAdd(img.src);
      }
    });

    // 2. Picture source tags
    document.querySelectorAll('picture source').forEach(source => {
      if (source.srcset) {
        const bestSrc = getHighestQualitySrcset(source.srcset);
        if (bestSrc) cleanAndAdd(bestSrc);
      }
    });

    // 3. Audio & Video elements
    document.querySelectorAll('video, audio, video source, audio source').forEach(el => {
      if (el.src) cleanAndAdd(el.src);
    });

    // 4. CSS Background assets
    document.querySelectorAll('*').forEach(el => {
      const bgImg = window.getComputedStyle(el).backgroundImage;
      if (bgImg && bgImg !== 'none') {
        const match = bgImg.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match && match[1]) {
          cleanAndAdd(match[1]);
        }
      }
    });

    // 5. Lightboxes / Anchors leading directly to media files
    document.querySelectorAll('a').forEach(a => {
      if (a.href) {
        try {
          const urlObj = new URL(a.href);
          if (mediaExtensions.test(urlObj.pathname)) {
            cleanAndAdd(a.href);
          }
        } catch (e) {}
      }
    });

    // 6. Site favicons & page icons
    document.querySelectorAll('link[rel*="icon"]').forEach(link => {
      if (link.href) cleanAndAdd(link.href);
    });

    // 7. Embedded media objects
    document.querySelectorAll('object').forEach(obj => {
      if (obj.data) cleanAndAdd(obj.data);
    });
    document.querySelectorAll('embed').forEach(emb => {
      if (emb.src) cleanAndAdd(emb.src);
    });
  } catch (e) {
    console.error('Error scanning media assets:', e);
  }

  data.media = Array.from(mediaUrls);

  // 1. PWA Detection
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const hasServiceWorker = !!navigator.serviceWorker?.controller;
  data.pwa = {
    hasManifest: !!manifestLink,
    manifestUrl: manifestLink ? manifestLink.href : null,
    hasServiceWorker: hasServiceWorker,
    serviceWorkerStatus: hasServiceWorker ? 'Active' : 'Not detected',
    isPwa: !!manifestLink && hasServiceWorker
  };

  // 2. Client-side storage inspection
  data.storage = {
    localStorageKeys: [],
    sessionStorageKeys: [],
    localStorageCount: 0,
    sessionStorageCount: 0
  };

  try {
    data.storage.localStorageCount = localStorage.length;
    for (let i = 0; i < Math.min(localStorage.length, 30); i++) {
      data.storage.localStorageKeys.push(localStorage.key(i));
    }
  } catch (e) {}

  try {
    data.storage.sessionStorageCount = sessionStorage.length;
    for (let i = 0; i < Math.min(sessionStorage.length, 30); i++) {
      data.storage.sessionStorageKeys.push(sessionStorage.key(i));
    }
  } catch (e) {}

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
