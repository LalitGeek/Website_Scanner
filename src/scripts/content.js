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
