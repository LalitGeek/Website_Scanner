# Scanify | Web Auditor - Professional SaaS Audit Tool

Scanify is a powerful, enterprise-grade Chrome extension designed for developers, security researchers, and SEO analysts. Featuring an industry-level, responsive glassmorphic SaaS dashboard interface, Scanify performs high-fidelity audits of any active tab, extracting security postures, technology stacks, SEO parameters, and DNS/subdomain architecture.

## 🚀 Key Features

* **SaaS-Level Dark Mode Dashboard**: Elegant UI/UX panel compartmentalized into intuitive tabs (**Overview**, **Stack**, **Intel**, **SEO**) with custom scrollbars, animated circular audit score gauges, and glowing micro-actions.
* **Advanced Technology Stack Engine**: Evaluates global window properties, HTML structures, and scripts against a signature database of **60+ modern technologies** (React, Angular, Nginx, WordPress, etc.) to list versions without cluttering confidence meters.
* **Real-time Stack Filter**: Interactive search input inside the Stack tab allowing users to filter identified frameworks, CMS, and servers instantly.
* **Passive Subdomain Probing**: Dynamically queries Google DNS for **40 popular subdomains** in the background, rendering active instances in real-time as they resolve.
* **Comprehensive DNS Zone Listing**: Retrieves and renders key DNS records (A, AAAA, MX, NS, TXT) inside the dashboard.
* **Security Checklists**: Checks for HTTPS, Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), Secure Cookies, and Mixed Content.
* **SEO Insights**: Scans Meta Title, Meta Description length, Canonical links, and H1-H3 heading summaries.
* **Sponsorship Channel**: Integrated quick-sponsorship button in the header actions linking directly to a secure Razorpay gateway.
* **Professional PDF Exports**: Generates executive-ready PDF audit reports featuring the brand logo, color-coded grid tables, subdomain lists, sitemaps, and screenshot capture.

---

## 📂 Project Structure

```text
├── manifest.json         # Extension configuration (Manifest V3)
├── usage.txt             # Step-by-step extension user guide
├── src/
│   ├── popup/            # SaaS tabbed popup UI files (HTML, CSS, JS)
│   ├── scripts/          # Background worker, DNS resolvers, Content scripts
│   │   ├── content.js        # DOM scraping & global variables scanner
│   │   ├── background.js     # DNS prober, subdomain scanner, screenshot taker
│   │   └── techSignatures.js # Multi-dimensional signature database
│   ├── icons/            # Translucent brand logo assets (16x16, 48x48, 128x128, 512x512)
│   └── utils/            # PDF Generator core, Phone formatters, libraries
```

---

## ⚙️ Installation (Development Mode)

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top right corner.
4. Click the **Load unpacked** button.
5. Select the root directory of this project.
6. The **Scanify | Web Auditor** icon will appear on your toolbar.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details (if applicable).
