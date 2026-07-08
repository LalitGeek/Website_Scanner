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
        
        const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='16 18 22 12 16 6'></polyline><polyline points='8 6 2 12 8 18'></polyline></svg>`;
        const iconUrl = getTechIconUrl(item.name);
        
        itemRow.innerHTML = `
          <div class="tech-meta-wrapper">
            <img class="tech-logo-img" src="${iconUrl}" alt="${item.name}" onerror="this.src='${fallbackSvg}'; this.onerror=null;">
            <span class="tech-name-lbl">${item.name}</span>
            ${item.version ? `<span class="tech-ver-lbl">${item.version}</span>` : ''}
          </div>
        `;
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

    const sortedSubs = [...subdomains].sort();

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

  // Listen for real-time subdomain updates from background
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
  });

  // Helper: Get CDN icon URL for a technology
  function getTechIconUrl(name) {
    const slug = name.toLowerCase()
      .replace('.js', 'js')
      .replace('.org', '')
      .replace(/\s+/g, '');
    
    const mapping = {
      'vuejs': 'vuejs',
      'react': 'react',
      'angular': 'angularjs',
      'angularjs': 'angularjs',
      'jquery': 'jquery',
      'wordpress': 'wordpress',
      'nginx': 'nginx',
      'apache': 'apache',
      'laravel': 'laravel',
      'nodejs': 'nodejs',
      'tailwindcss': 'tailwindcss',
      'bootstrap': 'bootstrap',
      'google': 'google',
      'googleanalytics': 'google',
      'cloudflare': 'cloudflare',
      'shopify': 'shopify',
      'nextjs': 'nextjs',
      'nuxtjs': 'nuxtjs',
      'gatsby': 'gatsby',
      'svelte': 'svelte',
      'django': 'django',
      'rails': 'rails',
      'rubyonrails': 'rails',
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
      'vite': 'vite'
    };
    
    const finalSlug = mapping[slug] || slug;
    
    const plainIcons = ['wordpress', 'php', 'mysql', 'apache', 'shopify'];
    const type = plainIcons.includes(finalSlug) ? 'plain' : 'original';
    
    return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${finalSlug}/${finalSlug}-${type}.svg`;
  }

  // Auto load on popup mount
  loadData();
});
