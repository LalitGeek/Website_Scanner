/**
 * Professional High-Quality Enterprise PDF Report Generator
 * Designed to be "Beautiful" and "Content-Responsive"
 */

import { formatPhoneNumber } from './phoneFormatter.js';

export async function generatePDFReport(data, hostname) {
  if (!window.jspdf) {
    throw new Error('jsPDF library not loaded');
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Modern Color Palette
  const colors = {
    primary: [37, 99, 235],    // Royal Blue
    secondary: [71, 85, 105],  // Slate Gray
    success: [16, 185, 129],   // Emerald
    danger: [239, 68, 68],     // Rose Red
    bg: [248, 250, 252],       // Soft Blue-Gray
    border: [226, 232, 240],   // Light Gray
    white: [255, 255, 255]
  };

  let currentY = 0;

  // Helper: Draw a card-like container
  function drawCard(y, height, title) {
    doc.setFillColor(...colors.white);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(15, y, 180, height, 2, 2, 'FD');
    
    if (title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colors.primary);
      doc.text(title.toUpperCase(), 20, y + 8);
      doc.setDrawColor(...colors.border);
      doc.line(20, y + 12, 190, y + 12);
      return y + 18;
    }
    return y + 5;
  }

  function checkPageBreak(requiredHeight) {
    if (currentY + requiredHeight > 275) {
      doc.addPage();
      drawPageAccent();
      currentY = 25;
      return true;
    }
    return false;
  }

  function drawPageAccent() {
    // Elegant left sidebar accent
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 5, 297, 'F');
  }

  // --- Start Generation ---
  drawPageAccent();

  // Header Section
  doc.setFillColor(...colors.primary);
  doc.rect(5, 0, 205, 45, 'F');
  
  doc.setTextColor(...colors.white);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('AUDIT REPORT', 15, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('WEBPAGE SCANNER ENTERPRISE EDITION', 15, 30);

  // PRO Badge
  doc.setFillColor(255, 255, 255, 0.2);
  doc.roundedRect(165, 12, 30, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.text('PLATINUM PRO', 180, 18.5, { align: 'center' });

  // Host info on header right
  doc.setFontSize(9);
  doc.text(`TARGET: ${hostname.toUpperCase()}`, 195, 30, { align: 'right' });
  doc.text(`DATE: ${timestamp.toUpperCase()}`, 195, 35, { align: 'right' });

  currentY = 55;

  // --- 1. Executive Summary Card ---
  currentY = drawCard(currentY, 45, 'Executive Summary');
  
  const metrics = [
    { l: 'Sitemap', v: data.hasSitemap ? 'Available' : 'Missing', c: data.hasSitemap ? colors.success : colors.danger },
    { l: 'Server OS', v: data.os || 'Unknown', c: colors.secondary },
    { l: 'WebSockets', v: data.hasWebSockets ? 'Detected' : 'Not Used', c: data.hasWebSockets ? colors.success : colors.secondary },
    { l: 'Ad Network', v: data.tech.some(t => t.category === 'Advertising') ? 'Found' : 'Clean', c: data.tech.some(t => t.category === 'Advertising') ? colors.danger : colors.success }
  ];

  metrics.forEach((m, i) => {
    const x = 25 + (i * 42);
    doc.setFontSize(8);
    doc.setTextColor(...colors.secondary);
    doc.text(m.l, x, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...m.c);
    doc.text(m.v, x, currentY + 6);
  });
  currentY += 25;

  // --- 2. Tech Stack Section ---
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.secondary);
  doc.text('Technology Blueprint', 15, currentY);
  currentY += 6;

  const techRows = [];
  const techCategories = {};
  data.tech.forEach(t => {
    const cat = t.category || 'Core';
    if (!techCategories[cat]) techCategories[cat] = [];
    techCategories[cat].push(t);
  });

  Object.entries(techCategories).forEach(([cat, items]) => {
    // Show tech name with its confidence score
    const confidenceStr = items.map(i => `${i.name} (${i.confidence || 50}%)`).join(', ');
    techRows.push([cat, confidenceStr]);
  });

  doc.autoTable({
    startY: currentY,
    head: [['Domain Layer', 'Technologies Detected (Confidence)']],
    body: techRows,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: colors.primary, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: colors.bg },
    theme: 'grid'
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // --- 3. Security & Domain Intel ---
  checkPageBreak(80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.secondary);
  doc.text('Security & Infrastructure Audit', 15, currentY);
  currentY += 8;

  const securityRows = data.security.map(s => [s.name, s.passed ? 'PASSED' : 'FAILED']);
  
  doc.autoTable({
    startY: currentY,
    head: [['Security Parameter', 'Audit Result']],
    body: securityRows,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: colors.secondary },
    didParseCell: (d) => {
      if (d.column.index === 1 && d.cell.section === 'body') {
        d.cell.styles.textColor = d.cell.raw === 'PASSED' ? colors.success : colors.danger;
        d.cell.styles.fontStyle = 'bold';
      }
    },
    theme: 'grid'
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // --- 4. Contacts Card (Responsive List) ---
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Discovered Communication Channels', 15, currentY);
  currentY += 8;

  const contactRows = [];
  data.contacts.emails.forEach(e => contactRows.push(['Email Address', e]));
  data.contacts.phones.forEach(p => contactRows.push(['Phone Number', formatPhoneNumber(p, data.ip?.country)]));

  if (contactRows.length === 0) {
    contactRows.push(['Notice', 'No public contact information discovered on this domain']);
  }

  doc.autoTable({
    startY: currentY,
    head: [['Channel Type', 'Contact Detail']],
    body: contactRows,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: colors.primary },
    alternateRowStyles: { fillColor: colors.bg },
    theme: 'striped'
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // --- 5. Navigation Architecture ---
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Website Path Architecture', 15, currentY);
  currentY += 6;

  const pathRows = [['HOME (/)', 'ROOT']];
  data.paths.slice(0, 6).forEach(p => pathRows.push([`  L ${p}`, 'INTERNAL_LINK']));

  doc.autoTable({
    startY: currentY,
    head: [['Pathname Structure', 'Type']],
    body: pathRows,
    margin: { left: 15, right: 15 },
    styles: { font: 'courier', fontSize: 8 },
    headStyles: { fillColor: colors.primary },
    theme: 'striped'
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // --- 6. Visual Snapshot ---
  if (data.screenshot) {
    checkPageBreak(120);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Visual Audit Snapshot', 15, currentY);
    currentY += 6;
    
    doc.setDrawColor(...colors.border);
    doc.rect(15, currentY, 180, 100); // Placeholder/Frame
    doc.addImage(data.screenshot, 'JPEG', 16, currentY + 1, 178, 98);
    currentY += 105;
  }

  // --- 7. SEO Analytics ---
  if (data.seo) {
    checkPageBreak(80);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.secondary);
    doc.text('SEO & Metadata Analytics', 15, currentY);
    currentY += 6;

    const seoRows = [
      ['Meta Description', data.seo.Description],
      ['Canonical URL', data.seo.Canonical],
      ['OpenGraph Title', data.seo['OG:Title']],
      ['Twitter Card', data.seo['Twitter:Card']],
      ['Heading Structure', `H1: ${data.seo.Headings.H1} | H2: ${data.seo.Headings.H2} | H3: ${data.seo.Headings.H3}`],
      ['Image SEO', `${data.seo['Images w/o Alt']} images missing ALT tags`]
    ];

    doc.autoTable({
      startY: currentY,
      head: [['SEO Property', 'Value / Audit Status']],
      body: seoRows,
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: colors.secondary },
      theme: 'grid'
    });
    currentY = doc.lastAutoTable.finalY + 15;
  }

  // --- 8. Domain & WHOIS Intelligence ---
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.secondary);
  doc.text('Domain & WHOIS Intelligence', 15, currentY);
  currentY += 6;

  const whoisRows = [
    ['Registrar', data.rdap?.entities?.[0]?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || 'N/A'],
    ['Created Date', data.rdap?.events?.find(e => e.eventAction === 'registration')?.eventDate || 'N/A'],
    ['Expiry Date', data.rdap?.events?.find(e => e.eventAction === 'expiration')?.eventDate || 'N/A'],
    ['Domain Status', (data.rdap?.status || []).join(', ') || 'Active']
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Registry Property', 'Value']],
    body: whoisRows,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: colors.primary }
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // --- 9. Infrastructure & DNS Intelligence ---
  checkPageBreak(100);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Infrastructure & DNS Intelligence', 15, currentY);
  currentY += 6;

  const ipInfo = [
    ['Primary IP Address', data.ip?.address || 'N/A'],
    ['Network Provider', data.ip?.provider || 'N/A'],
    ['Autonomous System', data.ip?.asn || 'N/A'],
    ['Physical Location', data.ip?.country || 'N/A'],
    ['Reverse DNS (PTR)', data.ip?.reverse || 'N/A']
  ];

  // IP Table (Full Width)
  doc.autoTable({
    startY: currentY,
    head: [['IP Intelligence Metric', 'Technical Details']],
    body: ipInfo,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    headStyles: { fillColor: colors.secondary },
    theme: 'grid'
  });
  currentY = doc.lastAutoTable.finalY + 8;

  const dnsRows = Object.entries(data.dns || {}).map(([type, records]) => [type, records.join('\n')]);

  // DNS Table (Full Width)
  doc.autoTable({
    startY: currentY,
    head: [['DNS Record Type', 'Resource Record Values']],
    body: dnsRows.length > 0 ? dnsRows : [['N/A', 'No records found']],
    margin: { left: 15, right: 15 },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    headStyles: { fillColor: colors.secondary },
    theme: 'striped'
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // --- 10. Subdomain Surface Analysis ---
  if (data.subdomains && data.subdomains.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Subdomain Surface Analysis', 15, currentY);
    currentY += 6;

    doc.autoTable({
      startY: currentY,
      head: [['Active Subdomain', 'Discovery Method']],
      body: data.subdomains.map(s => [s, 'Passive DNS Probing']),
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, font: 'courier' },
      headStyles: { fillColor: colors.primary }
    });
    currentY = doc.lastAutoTable.finalY + 15;
  }

  // --- Final Footer ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...colors.border);
    doc.line(15, 285, 195, 285);
    doc.setFontSize(7);
    doc.setTextColor(...colors.secondary);
    doc.text(`CONFIDENTIAL AUDIT | PAGE ${i} OF ${totalPages}`, 15, 290);
    doc.text(`GENERATED BY WEBPAGE SCANNER PRO`, 195, 290, { align: 'right' });
  }

  doc.save(`audit-${hostname.replace(/\./g, '-')}-${Date.now()}.pdf`);
}
