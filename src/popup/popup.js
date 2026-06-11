import { generatePDFReport } from '../utils/pdfGenerator.js';
import { formatPhoneNumber } from '../utils/phoneFormatter.js';

document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scan-btn');
  const resultsMain = document.getElementById('results');
  const loader = document.getElementById('loader');
  const statusIndicator = document.getElementById('scan-status');

  let lastResults = null;

  async function loadData() {
    statusIndicator.textContent = 'Fetching data...';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

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
          hostname: data.hostname || new URL(tab.url).hostname
        };
        lastResults = merged;
        displayResults(merged);
        statusIndicator.textContent = merged.hostname;
        loader.classList.add('hidden');
        resultsMain.classList.remove('hidden');
      } else {
        // If no auto-scan data yet, trigger manual
        startManualScan();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      statusIndicator.textContent = 'Error loading data';
    }
  }

  async function startManualScan() {
    loader.classList.remove('hidden');
    resultsMain.classList.add('hidden');
    // Manual scan logic if needed...
  }

  function displayResults(data) {
    // Tech List (Grouped)
    const techList = document.getElementById('tech-list');
    const techCount = document.getElementById('tech-count');
    techList.innerHTML = '';
    
    // De-duplicate tech
    const uniqueTech = [];
    const seen = new Set();
    data.tech.forEach(t => {
      if (!seen.has(t.name)) {
        uniqueTech.push(t);
        seen.add(t.name);
      }
    });

    const categories = groupTechByCategory(uniqueTech);
    let totalTech = 0;

    Object.entries(categories).forEach(([category, items]) => {
      const catTitle = document.createElement('div');
      catTitle.className = 'category-title';
      catTitle.textContent = category;
      techList.appendChild(catTitle);

      items.forEach(item => {
        totalTech++;
        const el = document.createElement('div');
        el.className = 'tech-item';
        el.innerHTML = `
          <div class="tech-info">
            <span class="tech-name">${item.name}</span>
            ${item.version ? `<span class="tech-version">${item.version}</span>` : ''}
          </div>
          <div class="tech-confidence" title="Detection Confidence">
            <div class="confidence-bar" style="width: ${item.confidence || 50}%"></div>
            <span>${item.confidence || 50}%</span>
          </div>
        `;
        techList.appendChild(el);
      });
    });

    techCount.textContent = totalTech;
    if (totalTech === 0) techList.innerHTML = '<div class="empty-state">No technologies detected</div>';

    // Security List
    const securityList = document.getElementById('security-list');
    securityList.innerHTML = '';
    data.security.forEach(s => {
      const item = document.createElement('div');
      item.className = 'security-item';
      item.innerHTML = `
        <span class="status-dot ${s.passed ? 'pass' : 'fail'}"></span>
        <span>${s.name}</span>
      `;
      securityList.appendChild(item);
    });

    // Insights Grid
    const insightsGrid = document.getElementById('insights-grid');
    insightsGrid.innerHTML = '';
    
    const insights = [
      { label: 'Title', value: data.seo['Title'] },
      { label: 'Images', value: data.perf['Images'] },
      { label: 'Load Time', value: data.perf['Load Time'] || 'N/A' },
      { label: 'Scripts', value: data.perf['Scripts'] }
    ];

    insights.forEach(i => {
      const card = document.createElement('div');
      card.className = 'insight-card';
      card.innerHTML = `
        <span class="insight-label">${i.label}</span>
        <span class="insight-value">${i.value}</span>
      `;
      insightsGrid.appendChild(card);
    });

    // Domain Intel
    const intelDetails = document.getElementById('intel-details');
    intelDetails.innerHTML = '<div class="data-grid"></div>';
    const grid = intelDetails.querySelector('.data-grid');
    
    const intelItems = [
      { label: 'IP Address', value: data.ip?.address || 'Detecting...' },
      { label: 'ASN / Provider', value: data.ip?.asn || 'N/A' },
      { label: 'Server OS', value: data.os },
      { label: 'Sitemap', value: data.hasSitemap ? 'Available' : 'Missing' }
    ];

    intelItems.forEach(item => {
      const label = document.createElement('div');
      label.className = 'data-label';
      label.textContent = item.label;
      
      const value = document.createElement('div');
      value.className = 'data-value';
      value.textContent = item.value;
      
      grid.appendChild(label);
      grid.appendChild(value);
    });

    // Contacts
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    
    if (data.contacts.emails.length > 0 || data.contacts.phones.length > 0) {
      data.contacts.emails.forEach(email => {
        const el = document.createElement('div');
        el.className = 'contact-item';
        el.innerHTML = `<span class="contact-icon">📧</span> <span>${email}</span>`;
        contactsList.appendChild(el);
      });
      data.contacts.phones.forEach(phone => {
        const el = document.createElement('div');
        el.className = 'contact-item';
        const formatted = formatPhoneNumber(phone, data.ip?.country);
        el.innerHTML = `<span class="contact-icon">📞</span> <span>${formatted}</span>`;
        contactsList.appendChild(el);
      });
    } else {
      contactsList.innerHTML = '<div class="empty-state">No contacts found</div>';
    }
  }

  function groupTechByCategory(tech) {
    const categories = {};
    tech.forEach(t => {
      const cat = t.category || 'Misc';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(t);
    });
    return categories;
  }

  // Event Listeners
  scanBtn.addEventListener('click', loadData);
  
  document.getElementById('export-json').addEventListener('click', () => {
    if (!lastResults) return;
    const blob = new Blob([JSON.stringify(lastResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-${Date.now()}.json`;
    a.click();
  });

  document.getElementById('copy-btn').addEventListener('click', () => {
    if (!lastResults) return;
    navigator.clipboard.writeText(JSON.stringify(lastResults, null, 2));
    alert('Copied!');
  });

  document.getElementById('export-pdf').addEventListener('click', async () => {
    if (!lastResults) {
      alert('No scan data available to export.');
      return;
    }
    const hostname = statusIndicator.textContent || 'unknown-site';
    try {
      // Capture screenshot first
      const screenResponse = await chrome.runtime.sendMessage({ action: 'CAPTURE_SCREENSHOT' });
      const screenshot = screenResponse?.screenshot;
      
      await generatePDFReport({ ...lastResults, screenshot }, hostname);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Failed to generate PDF. Check console for details.');
    }
  });

  // Load latest data on open
  loadData();
});
