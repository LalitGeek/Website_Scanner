import { generatePDFReport } from '../utils/pdfGenerator.js';
import { formatPhoneNumber } from '../utils/phoneFormatter.js';

document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scan-btn');
  const resultsMain = document.getElementById('results');
  const loader = document.getElementById('loader');
  const statusIndicator = document.getElementById('scan-status');
  const techSearch = document.getElementById('tech-search');

  let lastResults = null;
  let currentTabId = null;

  // 1. Tab Navigation Logic
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(`panel-${tab.dataset.tab}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // 2. Fetch/Load Data
  async function loadData() {
    statusIndicator.textContent = 'Scanning...';
    loader.classList.remove('hidden');
    resultsMain.classList.add('hidden');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      currentTabId = tab.id;

      const data = await chrome.runtime.sendMessage({ 
        action: 'GET_LATEST_DATA', 
        tabId: tab.id 
      });

      // Fetch cookies using chrome.cookies API (requires tab.url)
      let cookiesList = [];
      try {
        if (chrome.cookies && tab.url && !tab.url.startsWith('chrome:')) {
          cookiesList = await chrome.cookies.getAll({ url: tab.url });
        }
      } catch (e) {
        console.error('Failed to get cookies:', e);
      }

      // Execute MAIN world script to get loaded libraries and custom window globals
      let jsInsights = { customGlobals: [], libraries: [] };
      try {
        if (chrome.scripting && tab.id && !tab.url.startsWith('chrome:')) {
          const executionResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: () => {
              // Get standard browser window keys
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              document.body.appendChild(iframe);
              const iframeWindow = iframe.contentWindow;
              const standardGlobals = new Set(Object.keys(iframeWindow));
              document.body.removeChild(iframe);

              // Filter out standard globals
              const currentPageGlobals = Object.keys(window);
              const customGlobals = currentPageGlobals.filter(key => {
                return !standardGlobals.has(key) && 
                       key !== 'chrome' && 
                       key !== 'TECH_SIGNATURES' &&
                       key !== 'performAutoScan';
              });

              // Check for loaded libraries
              const libraries = [];
              if (window.jQuery || window.$) {
                libraries.push({ name: 'jQuery', version: window.jQuery?.fn?.jquery || window.$?.fn?.jquery || 'detected' });
              }
              if (window.React) {
                libraries.push({ name: 'React', version: window.React.version || 'detected' });
              }
              if (window.Vue) {
                libraries.push({ name: 'Vue', version: window.Vue.version || 'detected' });
              }
              if (window.angular) {
                libraries.push({ name: 'AngularJS', version: window.angular.version?.full || 'detected' });
              }
              if (window.Modernizr) {
                libraries.push({ name: 'Modernizr', version: window.Modernizr._version || 'detected' });
              }
              if (window.Lodash || window._) {
                libraries.push({ name: 'Lodash', version: (window.Lodash || window._).VERSION || 'detected' });
              }
              if (window.axios) {
                libraries.push({ name: 'Axios', version: window.axios.VERSION || 'detected' });
              }
              if (window.Redux) {
                libraries.push({ name: 'Redux', version: 'detected' });
              }
              if (window.Htmx) {
                libraries.push({ name: 'HTMX', version: window.Htmx?.version || 'detected' });
              }
              if (window.Alpine) {
                libraries.push({ name: 'Alpine.js', version: window.Alpine?.version || 'detected' });
              }

              return {
                customGlobals: customGlobals.slice(0, 30),
                libraries
              };
            }
          });
          jsInsights = executionResult?.[0]?.result || { customGlobals: [], libraries: [] };
        }
      } catch (e) {
        console.error('Failed to run main world JS insights:', e);
      }

      if (data && data.domResults) {
        // Merge and display
        const merged = {
          tech: [...(data.headerTech || []), ...(data.domResults.tech || [])],
          security: [...(data.headerSecurity || []), ...(data.domResults.security || [])],
          seo: data.domResults.seo || {},
          perf: data.domResults.perf || {},
          contacts: data.domResults.contacts || { emails: [], phones: [] },
          paths: data.domResults.paths || [],
          hasWebSockets: data.domResults.hasWebSockets || false,
          hasSitemap: data.hasSitemap || false,
          fonts: data.domResults.fonts || [],
          os: data.os || 'Unknown',
          rdap: data.rdap || null,
          dns: data.dns || {},
          ip: data.ip || {},
          subdomains: data.subdomains || [],
          hostname: data.hostname || new URL(tab.url).hostname,
          
          // NEW FIELDS FROM SCAN!
          pwa: data.domResults.pwa || { hasManifest: false, hasServiceWorker: false },
          storage: data.domResults.storage || { localStorageKeys: [], sessionStorageKeys: [], localStorageCount: 0, sessionStorageCount: 0 },
          media: data.domResults.media || [],
          
          // COOKIES & INSIGHTS FROM POPUP INJECTION!
          cookies: cookiesList,
          jsInsights: jsInsights,
          
          tabId: tab.id
        };
        lastResults = merged;
        displayResults(merged);
        statusIndicator.textContent = 'Scanned';
        loader.classList.add('hidden');
        resultsMain.classList.remove('hidden');
      } else {
        // Trigger page reload scan or wait
        statusIndicator.textContent = 'No data';
        loader.classList.add('hidden');
        resultsMain.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      statusIndicator.textContent = 'Scan error';
      loader.classList.add('hidden');
      resultsMain.classList.remove('hidden');
    }
  }

  // 3. Render Dashboard results
  function displayResults(data) {
    // A. Hero Domain & IP Info
    document.getElementById('domain-title').textContent = data.hostname;
    document.getElementById('ip-subtitle').textContent = `IP: ${data.ip?.address || 'Detecting...'}`;

    // B. Calculate Overall Audit Score (out of 100)
    let securityScore = 0;
    let passedSecurityCount = 0;
    data.security.forEach(s => {
      if (s.passed) {
        passedSecurityCount++;
        securityScore += 12; // 5 checks * 12 = 60 max points
      }
    });

    let seoScore = 0;
    if (data.seo['Title'] && data.seo['Title'] !== 'Untitled') seoScore += 10;
    if (data.seo['Description'] && data.seo['Description'] !== 'Missing') seoScore += 15;
    if (data.hasSitemap) seoScore += 5;
    if (data.seo['Canonical'] && data.seo['Canonical'] !== 'Not set') seoScore += 10; // Total 40

    const overallScore = Math.min(100, securityScore + seoScore);
    document.getElementById('overall-score').textContent = overallScore;

    // Animate/Draw score circle ring
    const strokeDash = 201.06; // 2 * PI * r (r=32)
    const offset = strokeDash - (strokeDash * overallScore / 100);
    const circleBar = document.getElementById('score-circle-bar');
    if (circleBar) {
      circleBar.style.strokeDashoffset = offset;
    }

    // Hero quick pills
    // De-duplicate technologies count
    const uniqueTechNames = new Set(data.tech.map(t => t.name));
    document.getElementById('pill-tech-count').textContent = uniqueTechNames.size;
    document.getElementById('pill-sec-passed').textContent = passedSecurityCount;

    // C. Overview Tab Content
    // Load Time formatting
    const loadTimeVal = data.perf['Full Load'];
    const loadTimeText = (loadTimeVal && loadTimeVal !== 'N/A') ? `${loadTimeVal} ms` : 'N/A';
    document.getElementById('stat-load-time').textContent = loadTimeText;

    // Assets count
    const totalAssets = (data.perf['Images'] || 0) + (data.perf['Scripts'] || 0);
    document.getElementById('stat-assets-count').textContent = `${totalAssets} elements`;

    // Update Media Assets badge & button
    const mediaCountBadge = document.getElementById('media-assets-count');
    const downloadMediaBtn = document.getElementById('download-media-btn');
    if (mediaCountBadge) {
      mediaCountBadge.textContent = `${data.media?.length || 0} files`;
    }
    if (downloadMediaBtn) {
      downloadMediaBtn.disabled = !data.media || data.media.length === 0;
      
      chrome.runtime.sendMessage({
        action: 'GET_MEDIA_DOWNLOAD_STATUS',
        tabId: data.tabId
      }, (statusResponse) => {
        if (chrome.runtime.lastError) return;
        if (statusResponse && statusResponse.status === 'downloading') {
          downloadMediaBtn.disabled = true;
          downloadMediaBtn.innerHTML = `Downloading (${statusResponse.downloaded}/${statusResponse.total})...`;
        }
      });
    }

    // Security health list
    const securityList = document.getElementById('security-list');
    securityList.innerHTML = '';
    data.security.forEach(s => {
      const el = document.createElement('div');
      el.className = 'security-item';
      el.innerHTML = `
        <div class="sec-info">
          <span class="status-dot ${s.passed ? 'pass' : 'fail'}"></span>
          <span class="sec-title">${s.name}</span>
        </div>
        <span class="sec-pill ${s.passed ? 'pass' : 'fail'}">${s.passed ? 'PASSED' : 'FAILED'}</span>
      `;
      securityList.appendChild(el);
    });

    // Key Indicators mini-cards
    const indicatorsList = document.getElementById('key-indicators-list');
    indicatorsList.innerHTML = '';
    const indicators = [
      { label: 'WebSockets', value: data.hasWebSockets ? 'Active' : 'None' },
      { label: 'Server OS', value: data.os || 'Unknown' },
      { label: 'Sitemap.xml', value: data.hasSitemap ? 'Discovered' : 'Missing' },
      { label: 'Fonts', value: `${data.fonts?.length || 0} unique` }
    ];
    indicators.forEach(ind => {
      const card = document.createElement('div');
      card.className = 'indicator-mini-card';
      card.innerHTML = `
        <span class="ind-label">${ind.label}</span>
        <span class="ind-value">${ind.value}</span>
      `;
      indicatorsList.appendChild(card);
    });

    // D. Tech Stack Tab
    renderTechStack(data.tech);

    // E. Domain Intel Tab
    // Network Details grid
    const intelDetails = document.getElementById('intel-details');
    intelDetails.innerHTML = '';
    const intelItems = [
      { label: 'IP Address', value: data.ip?.address || 'Detecting...' },
      { label: 'ASN / Code', value: data.ip?.asn || 'N/A' },
      { label: 'ISP / Provider', value: data.ip?.provider || 'N/A' },
      { label: 'Host Location', value: data.ip?.country || 'Unknown' },
      { label: 'Server OS', value: data.os || 'Unknown' }
    ];
    intelItems.forEach(item => {
      const lbl = document.createElement('div');
      lbl.className = 'data-label';
      lbl.textContent = item.label;
      const val = document.createElement('div');
      val.className = 'data-value';
      val.textContent = item.value;
      intelDetails.appendChild(lbl);
      intelDetails.appendChild(val);
    });

    // Subdomains List
    renderSubdomains(data.subdomains || []);

    // DNS zone entries
    const dnsRecordsList = document.getElementById('dns-records-list');
    dnsRecordsList.innerHTML = '';
    let hasDnsRecords = false;

    if (data.dns && Object.keys(data.dns).length > 0) {
      Object.entries(data.dns).forEach(([type, records]) => {
        if (records && records.length > 0) {
          hasDnsRecords = true;
          records.forEach(rec => {
            const row = document.createElement('div');
            row.className = 'dns-row';
            row.innerHTML = `
              <span class="dns-type-lbl">${type}</span>
              <span class="dns-data-val">${rec}</span>
            `;
            dnsRecordsList.appendChild(row);
          });
        }
      });
    }

    if (!hasDnsRecords) {
      dnsRecordsList.innerHTML = '<div class="empty-state">No DNS entries discovered.</div>';
    }

    // F. SEO & Contacts Tab
    // SEO fields
    document.getElementById('seo-meta-title').textContent = data.seo['Title'] || 'Missing';
    document.getElementById('seo-meta-desc').textContent = data.seo['Description'] || 'Missing';
    document.getElementById('seo-meta-canonical').textContent = data.seo['Canonical'] || 'Not set';

    // Heading tags summary
    const headingsGroup = document.getElementById('seo-headings-group');
    headingsGroup.innerHTML = '';
    const heads = data.seo['Headings'] || { 'H1': 0, 'H2': 0, 'H3': 0 };
    Object.entries(heads).forEach(([tag, count]) => {
      const pill = document.createElement('div');
      pill.className = 'heading-pill';
      pill.innerHTML = `${tag}: <span>${count}</span>`;
      headingsGroup.appendChild(pill);
    });

    // Contacts
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    
    if (data.contacts.emails.length > 0 || data.contacts.phones.length > 0) {
      data.contacts.emails.forEach(email => {
        const row = document.createElement('div');
        row.className = 'contact-card-row';
        row.innerHTML = `
          <div class="contact-icon-wrapper">📧</div>
          <div class="contact-text-wrapper">${email}</div>
        `;
        contactsList.appendChild(row);
      });
      data.contacts.phones.forEach(phone => {
        const row = document.createElement('div');
        row.className = 'contact-card-row';
        row.innerHTML = `
          <div class="contact-icon-wrapper">📞</div>
          <div class="contact-text-wrapper">${formatPhoneNumber(phone, data.ip?.country)}</div>
        `;
        contactsList.appendChild(row);
      });
    } else {
      contactsList.innerHTML = '<div class="empty-state">No contact details found.</div>';
    }

    // G. Console & PWA Rendering
    // PWA Support
    const pwa = data.pwa || { hasManifest: false, hasServiceWorker: false, serviceWorkerStatus: 'Not detected' };
    const manifestStatusEl = document.getElementById('pwa-manifest-status');
    const swStatusEl = document.getElementById('pwa-sw-status');
    const complianceEl = document.getElementById('pwa-compliance-status');
    
    if (manifestStatusEl) {
      manifestStatusEl.textContent = pwa.hasManifest ? 'Detected' : 'Missing';
      manifestStatusEl.className = `status-badge ${pwa.hasManifest ? 'success' : 'error'}`;
    }
    if (swStatusEl) {
      swStatusEl.textContent = pwa.hasServiceWorker ? 'Active' : 'Not detected';
      swStatusEl.className = `status-badge ${pwa.hasServiceWorker ? 'success' : 'error'}`;
    }
    if (complianceEl) {
      const isCompliant = pwa.hasManifest && pwa.hasServiceWorker;
      complianceEl.textContent = isCompliant ? 'Yes' : 'No';
      complianceEl.className = `status-badge ${isCompliant ? 'success' : 'error'}`;
    }

    // JavaScript Libraries
    const librariesList = document.getElementById('js-libraries-list');
    if (librariesList) {
      librariesList.innerHTML = '';
      const libs = data.jsInsights?.libraries || [];
      if (libs.length > 0) {
        libs.forEach(lib => {
          const card = document.createElement('div');
          card.className = 'js-lib-card';
          card.innerHTML = `
            <span class="js-lib-name">${lib.name}</span>
            <span class="js-lib-ver">${lib.version}</span>
          `;
          librariesList.appendChild(card);
        });
      } else {
        librariesList.innerHTML = '<div class="empty-state">No library runtime objects detected.</div>';
      }
    }

    // Custom Globals
    const globalsList = document.getElementById('js-globals-list');
    if (globalsList) {
      globalsList.innerHTML = '';
      const globals = data.jsInsights?.customGlobals || [];
      if (globals.length > 0) {
        globals.forEach(g => {
          const badge = document.createElement('span');
          badge.className = 'subdomain-badge';
          badge.textContent = g;
          globalsList.appendChild(badge);
        });
      } else {
        globalsList.innerHTML = '<div class="empty-state">No custom globals detected.</div>';
      }
    }

    // Storage Statistics Counts
    const cookiesCountEl = document.getElementById('count-cookies');
    const localCountEl = document.getElementById('count-localstorage');
    const sessionCountEl = document.getElementById('count-sessionstorage');
    
    const cookiesList = data.cookies || [];
    const storageData = data.storage || { localStorageKeys: [], sessionStorageKeys: [], localStorageCount: 0, sessionStorageCount: 0 };

    if (cookiesCountEl) cookiesCountEl.textContent = cookiesList.length;
    if (localCountEl) localCountEl.textContent = storageData.localStorageCount;
    if (sessionCountEl) sessionCountEl.textContent = storageData.sessionStorageCount;

    // Cookies List Table
    const cookiesBody = document.getElementById('cookies-list-body');
    if (cookiesBody) {
      cookiesBody.innerHTML = '';
      if (cookiesList.length > 0) {
        cookiesList.slice(0, 25).forEach(c => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td title="${c.name}">${c.name}</td>
            <td title="${c.value}">${c.value}</td>
            <td class="${c.secure ? 'badge-secure-yes' : 'badge-secure-no'}">${c.secure ? 'Yes' : 'No'}</td>
            <td class="${c.httpOnly ? 'badge-secure-yes' : 'badge-secure-no'}">${c.httpOnly ? 'Yes' : 'No'}</td>
          `;
          cookiesBody.appendChild(row);
        });
      } else {
        cookiesBody.innerHTML = '<tr><td colspan="4" class="empty-state">No active cookies found.</td></tr>';
      }
    }

    // Local Storage Keys
    const localKeysList = document.getElementById('localstorage-keys-list');
    if (localKeysList) {
      localKeysList.innerHTML = '';
      const localKeys = storageData.localStorageKeys || [];
      if (localKeys.length > 0) {
        localKeys.forEach(k => {
          const badge = document.createElement('span');
          badge.className = 'subdomain-badge';
          badge.textContent = k;
          localKeysList.appendChild(badge);
        });
      } else {
        localKeysList.innerHTML = '<div class="empty-state">Storage is empty.</div>';
      }
    }

    // Session Storage Keys
    const sessionKeysList = document.getElementById('sessionstorage-keys-list');
    if (sessionKeysList) {
      sessionKeysList.innerHTML = '';
      const sessionKeys = storageData.sessionStorageKeys || [];
      if (sessionKeys.length > 0) {
        sessionKeys.forEach(k => {
          const badge = document.createElement('span');
          badge.className = 'subdomain-badge';
          badge.textContent = k;
          sessionKeysList.appendChild(badge);
        });
      } else {
        sessionKeysList.innerHTML = '<div class="empty-state">Storage is empty.</div>';
      }
    }
  }

  // Helper: Render Tech Stack with optional filtering
  function renderTechStack(tech, filterQuery = '') {
    const techList = document.getElementById('tech-list');
    techList.innerHTML = '';

    // De-duplicate
    const uniqueTech = [];
    const seen = new Set();
    tech.forEach(t => {
      if (!seen.has(t.name)) {
        uniqueTech.push(t);
        seen.add(t.name);
      }
    });

    // Filter if query is provided
    const query = filterQuery.toLowerCase().trim();
    const filteredTech = query 
      ? uniqueTech.filter(t => t.name.toLowerCase().includes(query) || (t.category || '').toLowerCase().includes(query))
      : uniqueTech;

    if (filteredTech.length === 0) {
      techList.innerHTML = '<div class="empty-state">No matching technologies.</div>';
      return;
    }

    const categories = groupTechByCategory(filteredTech);
    Object.entries(categories).forEach(([category, items]) => {
      const groupBlock = document.createElement('div');
      groupBlock.className = 'tech-group-block';

      const catTitle = document.createElement('div');
      catTitle.className = 'tech-cat-title';
      catTitle.textContent = category;
      groupBlock.appendChild(catTitle);

      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'tech-items-grid';

      items.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'tech-item';
        
        const category = item.category || 'Other';
        const iconUrl = getTechIconUrl(item.name);
        
        itemRow.innerHTML = `
          <div class="tech-meta-wrapper">
            <div class="tech-icon-container" data-tech="${item.name}">
              <img class="tech-logo-img" src="${iconUrl}" alt="${item.name}">
            </div>
            <span class="tech-name-lbl">${item.name}</span>
            ${item.version ? `<span class="tech-ver-lbl">${item.version}</span>` : ''}
          </div>
        `;

        const img = itemRow.querySelector('.tech-logo-img');
        if (img) {
          img.addEventListener('error', () => {
            const container = itemRow.querySelector('.tech-icon-container');
            if (container) {
              container.innerHTML = getCategorySvgInline(category);
            }
          }, { once: true });
        }

        itemsGrid.appendChild(itemRow);
      });

      groupBlock.appendChild(itemsGrid);
      techList.appendChild(groupBlock);
    });
  }

  // Helper: Render subdomains
  function renderSubdomains(subdomains) {
    const subdomainsList = document.getElementById('subdomains-list');
    const subdomainsCount = document.getElementById('subdomains-count');
    if (!subdomainsList || !subdomainsCount) return;
    subdomainsList.innerHTML = '';

    const uniqueSubs = Array.from(new Set(subdomains));
    const sortedSubs = [...uniqueSubs].sort();

    if (sortedSubs.length > 0) {
      subdomainsCount.textContent = sortedSubs.length;
      sortedSubs.forEach(sub => {
        const badge = document.createElement('span');
        badge.className = 'subdomain-badge';
        badge.textContent = sub;
        subdomainsList.appendChild(badge);
      });
    } else {
      subdomainsCount.textContent = '0';
      subdomainsList.innerHTML = '<div class="empty-state">No subdomains discovered.</div>';
    }
  }

  // Helper: Group tech by category
  function groupTechByCategory(tech) {
    const categories = {};
    tech.forEach(t => {
      const cat = t.category || 'Misc';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(t);
    });
    return categories;
  }

  // 4. Real-time Search filter event binding
  if (techSearch) {
    techSearch.addEventListener('input', (e) => {
      if (lastResults) {
        renderTechStack(lastResults.tech, e.target.value);
      }
    });
  }

  // 5. Event Listeners for action buttons
  if (scanBtn) {
    scanBtn.addEventListener('click', loadData);
  }

  document.getElementById('export-json').addEventListener('click', () => {
    if (!lastResults) return;
    const blob = new Blob([JSON.stringify(lastResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-${lastResults.hostname.replace(/\./g, '-')}-${Date.now()}.json`;
    a.click();
  });

  document.getElementById('copy-btn').addEventListener('click', () => {
    if (!lastResults) return;
    navigator.clipboard.writeText(JSON.stringify(lastResults, null, 2));
    alert('Scan JSON data copied to clipboard!');
  });

  const downloadMediaBtn = document.getElementById('download-media-btn');
  if (downloadMediaBtn) {
    downloadMediaBtn.addEventListener('click', () => {
      if (!lastResults || !lastResults.media || lastResults.media.length === 0) return;

      downloadMediaBtn.disabled = true;
      downloadMediaBtn.innerHTML = 'Starting background download...';

      chrome.runtime.sendMessage({
        action: 'START_MEDIA_DOWNLOAD',
        tabId: lastResults.tabId,
        media: lastResults.media,
        hostname: lastResults.hostname
      }, (response) => {
        if (chrome.runtime.lastError) {
          downloadMediaBtn.innerHTML = 'Failed to start';
          setTimeout(() => {
            downloadMediaBtn.disabled = false;
            downloadMediaBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Download All Media`;
          }, 2000);
          return;
        }
        if (response && response.status === 'started') {
          downloadMediaBtn.innerHTML = `Downloading (0/${response.total})...`;
        }
      });
    });
  }

  document.getElementById('export-pdf').addEventListener('click', async () => {
    if (!lastResults) {
      alert('No scan data available to export.');
      return;
    }
    const hostname = lastResults.hostname || 'unknown-site';
    try {
      statusIndicator.textContent = 'Exporting...';
      const screenResponse = await chrome.runtime.sendMessage({ action: 'CAPTURE_SCREENSHOT' });
      const screenshot = screenResponse?.screenshot;
      
      await generatePDFReport({ ...lastResults, screenshot }, hostname);
      statusIndicator.textContent = 'Exported';
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Failed to generate PDF report.');
      statusIndicator.textContent = 'PDF error';
    }
  });

  // Listen for real-time subdomain and download progress updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SUBDOMAIN_FOUND' && message.tabId === currentTabId) {
      if (lastResults) {
        if (!lastResults.subdomains) {
          lastResults.subdomains = [];
        }
        if (!lastResults.subdomains.includes(message.subdomain)) {
          lastResults.subdomains.push(message.subdomain);
          renderSubdomains(lastResults.subdomains);
        }
      }
    }

    if (message.action === 'MEDIA_DOWNLOAD_PROGRESS' && lastResults && message.tabId === lastResults.tabId) {
      const downloadBtn = document.getElementById('download-media-btn');
      if (downloadBtn) {
        if (message.status === 'downloading') {
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = `Downloading (${message.downloaded}/${message.total})...`;
        } else if (message.status === 'completed') {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = `Success (${message.downloaded}/${message.total})`;
          setTimeout(() => {
            downloadBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Download All Media`;
          }, 3500);
        }
      }
    }
  });

  // Helper: Get CDN icon URL for a technology
  function getTechIconUrl(name) {
    const slug = name.toLowerCase()
      .replace('.js', 'js')
      .replace('.org', '')
      .replace(/\s+/g, '');
    
    // Devicon mapping (for colored original logos)
    const deviconMap = {
      'react': 'react',
      'angular': 'angularjs',
      'angularjs': 'angularjs',
      'vuejs': 'vuejs',
      'vue.js': 'vuejs',
      'jquery': 'jquery',
      'wordpress': 'wordpress',
      'nginx': 'nginx',
      'apache': 'apache',
      'laravel': 'laravel',
      'nodejs': 'nodejs',
      'tailwindcss': 'tailwindcss',
      'bootstrap': 'bootstrap',
      'cloudflare': 'cloudflare',
      'cloudflareturnstile': 'cloudflare',
      'shopify': 'shopify',
      'nextjs': 'nextjs',
      'next.js': 'nextjs',
      'nuxtjs': 'nuxtjs',
      'nuxt.js': 'nuxtjs',
      'gatsby': 'gatsby',
      'svelte': 'svelte',
      'django': 'django',
      'rails': 'rails',
      'ruby-on-rails': 'rails',
      'flask': 'flask',
      'spring': 'spring',
      'express': 'express',
      'mysql': 'mysql',
      'postgresql': 'postgresql',
      'mongodb': 'mongodb',
      'redis': 'redis',
      'firebase': 'firebase',
      'php': 'php',
      'python': 'python',
      'java': 'java',
      'ruby': 'ruby',
      'swift': 'swift',
      'go': 'go',
      'rust': 'rust',
      'typescript': 'typescript',
      'sass': 'sass',
      'less': 'less',
      'npm': 'npm',
      'yarn': 'yarn',
      'git': 'git',
      'github': 'github',
      'gitlab': 'gitlab',
      'bitbucket': 'bitbucket',
      'docker': 'docker',
      'kubernetes': 'kubernetes',
      'webrtc': 'webrtc',
      'webpack': 'webpack',
      'vite': 'vite',
      'aws': 'amazonwebservices',
      'heroku': 'heroku',
      'netlify': 'netlify',
      'vercel': 'vercel',
      'supabase': 'supabase',
      'ionic': 'ionic',
      'joomla': 'joomla',
      'drupal': 'drupal',
      'magento': 'magento',
      'woocommerce': 'woocommerce',
      'wix': 'wix',
      'squarespace': 'squarespace',
      'webflow': 'webflow',
      'backbonejs': 'backbonejs',
      'emberjs': 'ember',
      'bulma': 'bulma',
      'd3js': 'd3js',
      'threejs': 'threejs',
      'vuetify': 'vuetify',
      'alpinejs': 'alpinejs',
      'astro': 'astro'
    };

    // If it is in deviconMap, load the colorful original devicon logo
    if (deviconMap[slug]) {
      const finalSlug = deviconMap[slug];
      const plainIcons = ['wordpress', 'php', 'mysql', 'apache', 'shopify'];
      const type = plainIcons.includes(finalSlug) ? 'plain' : 'original';
      return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${finalSlug}/${finalSlug}-${type}.svg`;
    }

    // Iconify/Simple-Icons mapping for brand icons not in Devicon (using #cbd5e1 for high visibility)
    const iconifyMap = {
      'algolia': 'algolia',
      'amplitude': 'amplitude',
      'axios': 'axios',
      'blogger': 'blogger',
      'chakraui': 'chakraui',
      'chartjs': 'chartdotjs',
      'criteo': 'criteo',
      'facebookpixel': 'facebook',
      'ghost': 'ghost',
      'googleads(adsense)': 'googleads',
      'googleanalytics': 'googleanalytics',
      'googletagmanager': 'googletagmanager',
      'headlessui': 'headlessui',
      'hotjar': 'hotjar',
      'hubspotcms': 'hubspot',
      'linkedininsighttag': 'linkedin',
      'litespeed': 'litespeed',
      'lodash': 'lodash',
      'materialui(mui)': 'mui',
      'materialize': 'materialdesign',
      'microsoftclarity': 'microsoft',
      'mixpanel': 'mixpanel',
      'momentjs': 'momentjs',
      'outbrain': 'outbrain',
      'paypal': 'paypal',
      'plausibleanalytics': 'plausibleanalytics',
      'preact': 'preact',
      'primevue': 'primevue',
      'recaptcha': 'google',
      'remix': 'remix',
      'rxjs': 'reactivex',
      'segment': 'segment',
      'solidjs': 'solid',
      'stripe': 'stripe',
      'swiper': 'swiper',
      'taboola': 'taboola',
      'tiktokpixel': 'tiktok',
      'uikit': 'uikit',
      'hcaptcha': 'hcaptcha',
      'wpengine': 'wordpress'
    };

    const finalIconifySlug = iconifyMap[slug] || slug;
    return `https://api.iconify.design/simple-icons:${finalIconifySlug}.svg?color=%23cbd5e1`;
  }

  // Helper: Get inline category SVG fallback
  function getCategorySvgInline(category) {
    const cat = (category || '').toLowerCase();
    const strokeColor = '#94a3b8'; // Premium slate gray
    
    if (cat.includes('database')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>`;
    }
    if (cat.includes('server')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
    }
    if (cat.includes('cdn') || cat.includes('hosting') || cat.includes('paas')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
    }
    if (cat.includes('analytics') || cat.includes('advertising') || cat.includes('tag manager')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
    }
    if (cat.includes('security') || cat.includes('captcha')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
    }
    if (cat.includes('cms')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`;
    }
    if (cat.includes('css') || cat.includes('ui framework') || cat.includes('design')) {
      return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
    }
    
    // Default fallback: Code tag </>
    return `<svg class="tech-fallback-svg" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
  }

  // Auto load on popup mount
  loadData();
});
