let currentData = {};
let activeDownloads = {};

// Capture headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === 'main_frame') {
      const headers = details.responseHeaders || [];
      const headerMap = {};
      headers.forEach(h => {
        const name = h.name.toLowerCase();
        if (headerMap[name]) {
          headerMap[name] += '; ' + h.value;
        } else {
          headerMap[name] = h.value;
        }
      });

      const security = [
        { name: 'HSTS', passed: !!headerMap['strict-transport-security'] },
        { name: 'CSP', passed: !!headerMap['content-security-policy'] },
        { name: 'X-Frame-Options', passed: !!headerMap['x-frame-options'] },
        { name: 'X-Content-Type', passed: headerMap['x-content-type-options'] === 'nosniff' },
        { name: 'Referrer Policy', passed: !!headerMap['referrer-policy'] },
        { name: 'Permissions Policy', passed: !!headerMap['permissions-policy'] || !!headerMap['feature-policy'] }
      ];

      // Improved Secure Cookies check
      const setCookies = headers.filter(h => h.name.toLowerCase() === 'set-cookie');
      if (setCookies.length > 0) {
        const allSecure = setCookies.every(h => h.value.toLowerCase().includes('secure'));
        security.push({ name: 'Secure Cookies', passed: allSecure });
      } else {
        security.push({ name: 'Secure Cookies', passed: true }); // No cookies = no insecure cookies
      }

      const tech = [];
      const server = (headerMap['server'] || '').toLowerCase();
      const xPoweredBy = (headerMap['x-powered-by'] || '').toLowerCase();
      
      // Server/Backend (High confidence if in headers)
      if (server.includes('nginx')) tech.push({ name: 'Nginx', category: 'Web Server', confidence: 100 });
      if (server.includes('apache')) tech.push({ name: 'Web Server', category: 'Server', confidence: 100 });
      if (server.includes('litespeed')) tech.push({ name: 'LiteSpeed', category: 'Web Server', confidence: 100 });
      if (server.includes('express') || xPoweredBy.includes('express')) tech.push({ name: 'Express', category: 'Backend', confidence: 100 });
      if (xPoweredBy.includes('next.js')) tech.push({ name: 'Next.js', category: 'Frontend Framework', confidence: 100 });
      if (xPoweredBy.includes('php')) tech.push({ name: 'PHP', category: 'Backend', confidence: 100 });
      
      // CDN/PaaS/Cloud/Hosting
      if (server.includes('cloudflare') || headerMap['cf-ray']) tech.push({ name: 'Cloudflare', category: 'CDN', confidence: 100 });
      if (server.includes('gse') || server.includes('ghs')) tech.push({ name: 'Google Cloud (GCP)', category: 'Cloud', confidence: 100 });
      if (server.includes('amazons3') || headerMap['x-amz-cf-id']) tech.push({ name: 'AWS', category: 'Cloud', confidence: 100 });
      if (server.includes('github.com')) tech.push({ name: 'GitHub Pages', category: 'Hosting', confidence: 100 });
      
      if (headerMap['x-vercel-id']) tech.push({ name: 'Vercel', category: 'Hosting', confidence: 100 });
      if (headerMap['x-nf-request-id']) tech.push({ name: 'Netlify', category: 'Hosting', confidence: 100 });
      if (headerMap['x-heroku-id'] || xPoweredBy.includes('heroku')) tech.push({ name: 'Heroku', category: 'Hosting', confidence: 100 });
      if (headerMap['x-azure-ref'] || server.includes('microsoft')) tech.push({ name: 'Microsoft Azure', category: 'Cloud', confidence: 100 });
      if (headerMap['x-do-cf-id']) tech.push({ name: 'DigitalOcean', category: 'Cloud', confidence: 100 });
      if (headerMap['x-pantheon-endpoint']) tech.push({ name: 'Pantheon', category: 'Hosting', confidence: 100 });
      if (headerMap['x-powered-by']?.includes('WP Engine')) tech.push({ name: 'WP Engine', category: 'Hosting', confidence: 100 });
      if (headerMap['via']?.includes('fastly')) tech.push({ name: 'Fastly', category: 'CDN', confidence: 100 });

      // OS Detection
      let os = 'Unknown';
      const combinedHeaders = (server + ' ' + xPoweredBy).toLowerCase();
      if (combinedHeaders.includes('ubuntu')) os = 'Ubuntu (Linux)';
      else if (combinedHeaders.includes('debian')) os = 'Debian (Linux)';
      else if (combinedHeaders.includes('centos')) os = 'CentOS (Linux)';
      else if (combinedHeaders.includes('redhat') || combinedHeaders.includes('rhel')) os = 'Red Hat (Linux)';
      else if (combinedHeaders.includes('win64') || combinedHeaders.includes('win32') || combinedHeaders.includes('windows')) os = 'Windows Server';
      else if (combinedHeaders.includes('linux')) os = 'Linux';

      currentData[details.tabId] = {
        headers: headers,
        headerTech: tech,
        headerSecurity: security,
        timestamp: Date.now(),
        hostname: new URL(details.url).hostname,
        os: os,
        rdap: null,
        dns: {},
        ip: {},
        subdomains: [],
        hasSitemap: false
      };
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Listen for results from content script (Auto-Detect)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTO_SCAN_RESULTS') {
    const tabId = sender.tab.id;
    const existing = currentData[tabId] || {};
    
    currentData[tabId] = {
      ...existing,
      domResults: request.data,
      hostname: request.hostname || existing.hostname
    };

    // Trigger async fetches for sitemap and intelligence suite
    fetchExtraData(tabId, currentData[tabId].hostname);

    // Update Badge
    const techCount = (existing.headerTech?.length || 0) + (request.data.tech?.length || 0);
    chrome.action.setBadgeText({
      text: techCount > 0 ? techCount.toString() : '',
      tabId: tabId
    });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId: tabId });
  }

  if (request.action === 'GET_LATEST_DATA') {
    sendResponse(currentData[request.tabId]);
  }

  if (request.action === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl });
    });
    return true; // Keep channel open for async
  }

  if (request.action === 'START_MEDIA_DOWNLOAD') {
    const tabId = request.tabId;
    const media = request.media || [];
    const hostname = request.hostname || 'unknown';

    activeDownloads[tabId] = {
      total: media.length,
      downloaded: 0,
      failed: 0,
      hostname: hostname,
      status: 'downloading',
      urls: media
    };

    startBackgroundDownload(tabId);
    sendResponse({ status: 'started', total: media.length });
    return false;
  }

  if (request.action === 'GET_MEDIA_DOWNLOAD_STATUS') {
    sendResponse(activeDownloads[request.tabId] || { status: 'idle' });
    return false;
  }
});

function getRootDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  
  // Common double-barrelled TLDs
  const doubleTlds = [
    'co.uk', 'org.uk', 'gov.uk', 'me.uk', 'net.uk', 'com.au', 'net.au', 'org.au', 
    'com.br', 'net.br', 'com.cn', 'edu.cn', 'gov.cn', 'com.eg', 'com.fr', 'com.hk', 
    'org.hk', 'com.id', 'co.id', 'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 
    'ind.in', 'co.jp', 'org.jp', 'com.mx', 'com.my', 'com.sg', 'com.tw', 'org.tw', 
    'com.tr', 'co.za', 'org.za'
  ];
  
  const lastTwo = parts.slice(-2).join('.');
  if (doubleTlds.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

async function fetchExtraData(tabId, hostname) {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return;
  const rootDomain = getRootDomain(hostname);

  // 1. Check Sitemap
  fetch(`https://${hostname}/sitemap.xml`, { method: 'HEAD' }).then(res => {
    if (res.ok && currentData[tabId]) currentData[tabId].hasSitemap = true;
  }).catch(() => {});

  // 2. WHOIS (RDAP)
  fetch(`https://rdap.org/domain/${rootDomain}`).then(res => res.json()).then(data => {
    if (currentData[tabId]) currentData[tabId].rdap = data;
  }).catch(() => {});

  // 3. DNS Intelligence (Passive via Google DNS)
  const dnsTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS'];
  dnsTypes.forEach(type => {
    fetch(`https://dns.google/resolve?name=${hostname}&type=${type}`)
      .then(res => res.json())
      .then(data => {
        if (currentData[tabId]) {
          currentData[tabId].dns[type] = data.Answer ? data.Answer.map(a => a.data) : [];
          // If we got an A record, trigger IP Intel
          if (type === 'A' && data.Answer?.[0]) {
             fetchIPIntel(tabId, data.Answer[0].data);
          }
        }
      }).catch(() => {});
  });

  // 4. Subdomain Discovery (Passive Probing with 40 common subdomains)
  const subPrefixes = [
    'www', 'api', 'mail', 'dev', 'test', 'admin', 'cdn', 'blog', 'shop', 'staging', 
    'status', 'docs', 'git', 'secure', 'portal', 'app', 'vpn', 'dns', 'support', 
    'files', 'news', 'monitor', 'demo', 'm', 'internal', 'billing', 'api-docs', 
    'api-dev', 'ftp', 'local', 'services', 'analytics', 'console', 'dashboard',
    'prod', 'qa', 'client', 'server', 'db', 'media', 'assets', 'static', 'beta'
  ];
  subPrefixes.forEach(sub => {
    const subHost = `${sub}.${rootDomain}`;
    // Don't scan the current hostname if it matches
    if (subHost === hostname) return;
    
    fetch(`https://dns.google/resolve?name=${subHost}&type=A`)
      .then(res => res.json())
      .then(data => {
        if (data.Answer && currentData[tabId]) {
          if (!currentData[tabId].subdomains.includes(subHost)) {
            currentData[tabId].subdomains.push(subHost);
            
            // Notify active popups if they are open and listening
            chrome.runtime.sendMessage({
              action: 'SUBDOMAIN_FOUND',
              subdomain: subHost,
              tabId: tabId
            }).catch(() => {}); // Catch if popup is closed (expected)
          }
        }
      }).catch(() => {});
  });
}

async function fetchIPIntel(tabId, ip) {
  // Using ip-api.com (free for non-commercial/low volume)
  fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,isp,as,reverse`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && currentData[tabId]) {
        currentData[tabId].ip = {
          address: ip,
          asn: data.as,
          provider: data.isp,
          country: data.country,
          reverse: data.reverse
        };
      }
    }).catch(() => {});
}

chrome.tabs.onRemoved.addListener((tabId) => {
  delete currentData[tabId];
  delete activeDownloads[tabId];
});

async function startBackgroundDownload(tabId) {
  const downloadState = activeDownloads[tabId];
  if (!downloadState || downloadState.urls.length === 0) return;

  const urls = downloadState.urls;
  const hostname = downloadState.hostname;

  for (let i = 0; i < urls.length; i++) {
    if (!activeDownloads[tabId] || activeDownloads[tabId].status !== 'downloading') {
      break;
    }

    const url = urls[i];
    try {
      let filename = '';
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      } catch (e) {}

      if (!filename || !filename.includes('.')) {
        filename = `media_${i + 1}.png`;
      }

      filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const downloadPath = `Scanify_Media/${hostname}/${filename}`;

      await new Promise((resolve) => {
        chrome.downloads.download({
          url: url,
          filename: downloadPath,
          conflictAction: 'uniquify'
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Background download warning:', chrome.runtime.lastError.message);
            if (activeDownloads[tabId]) activeDownloads[tabId].failed++;
          } else {
            if (activeDownloads[tabId]) activeDownloads[tabId].downloaded++;
          }
          resolve();
        });
      });

      if (activeDownloads[tabId]) {
        chrome.runtime.sendMessage({
          action: 'MEDIA_DOWNLOAD_PROGRESS',
          tabId: tabId,
          downloaded: activeDownloads[tabId].downloaded,
          failed: activeDownloads[tabId].failed,
          total: activeDownloads[tabId].total,
          status: 'downloading'
        }).catch(() => {});
      }

      await new Promise(r => setTimeout(r, 120));
    } catch (err) {
      console.error('Background download loop error:', err);
      if (activeDownloads[tabId]) activeDownloads[tabId].failed++;
    }
  }

  if (activeDownloads[tabId]) {
    activeDownloads[tabId].status = 'completed';
    chrome.runtime.sendMessage({
      action: 'MEDIA_DOWNLOAD_PROGRESS',
      tabId: tabId,
      downloaded: activeDownloads[tabId].downloaded,
      failed: activeDownloads[tabId].failed,
      total: activeDownloads[tabId].total,
      status: 'completed'
    }).catch(() => {});
  }
}