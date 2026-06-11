# Webpage Scanner - Professional Audit Tool

Webpage Scanner is a powerful Chrome extension designed for developers, security researchers, and SEO analysts. It performs a comprehensive analysis of any active tab, providing insights into its technology stack, security posture, SEO optimization, and performance metrics.

## 🚀 Key Features

- **Technology Detection**: Identifies frameworks (React, Angular, Vue), CMS (WordPress, Joomla), web servers (Nginx, Apache), and more with confidence scoring.
- **Security Audit**: Checks for HTTPS, Content Security Policy (CSP), HSTS, Secure Cookies, and X-Frame-Options.
- **SEO Analysis**: Analyzes Title, Meta Description, OpenGraph tags, Canonical URLs, and Heading structure.
- **Performance Metrics**: Reports on asset counts (images, scripts, CSS) and basic load time insights.
- **Infrastructure Intel**: Provides IP address details, ASN/Provider information, and Server OS detection.
- **Contact Discovery**: Automatically finds public email addresses and phone numbers on the page.
- **Professional Export**: Export your findings as a high-quality, enterprise-ready PDF report or a raw JSON file.

## 🛠️ Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3.
- **Extension API**: Chrome Extensions Manifest V3.
- **Libraries**: 
  - `jsPDF`: For generating professional PDF reports.
  - `jsPDF-AutoTable`: For rendering tables within PDF reports.
- **Utilities**: Custom phone number formatter and report generator.

## 📂 Project Structure

```text
├── manifest.json         # Extension configuration (Manifest V3)
├── PRD.md                # Product Requirements Document
├── src/
│   ├── popup/            # UI components for the extension popup
│   ├── scripts/          # Background and Content scripts for scanning
│   ├── icons/            # Extension icons
│   └── utils/            # Shared utilities (PDF gen, formatting)
└── README.md             # Project documentation
```

## ⚙️ Installation (Development Mode)

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top right corner.
4. Click the **Load unpacked** button.
5. Select the root directory of this project.
6. The Webpage Scanner icon should now appear in your extension list.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details (if applicable).
