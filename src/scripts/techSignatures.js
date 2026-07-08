/**
 * Webpage Scanner - Comprehensive Technology Signatures Database
 * Contains patterns for HTML, scripts, stylesheets, meta tags, headers, cookies, and global JS variables.
 */

const TECH_SIGNATURES = [
  // ================= CMS & Site Builders =================
  {
    name: 'WordPress',
    category: 'CMS',
    html: [/wp-content|wp-includes/i],
    scripts: [/wp-content|wp-includes/i],
    links: [/wp-content|wp-includes/i],
    meta: { generator: /WordPress/i },
    headers: { 'x-powered-by': /wp/i, 'link': /wp-json/i },
    cookies: ['wordpress_', 'wp-settings-'],
    js: ['wp_theme', 'wp_api', 'wpcf7'],
    confidence: 100
  },
  {
    name: 'Shopify',
    category: 'E-commerce',
    html: [/shopify/i],
    scripts: [/shopify/i],
    links: [/shopify/i],
    meta: { generator: /Shopify/i },
    headers: { 'x-shopify-stage': /.*/i, 'x-shopid': /.*/i },
    js: ['Shopify', 'ShopifyAnalytics'],
    confidence: 100
  },
  {
    name: 'Magento',
    category: 'E-commerce',
    html: [/mage\/|magento/i],
    scripts: [/magento/i],
    links: [/magento/i],
    js: ['Mage', 'VarienForm'],
    confidence: 100
  },
  {
    name: 'WooCommerce',
    category: 'E-commerce',
    html: [/woocommerce/i],
    scripts: [/woocommerce/i],
    links: [/woocommerce/i],
    js: ['woocommerce_params', 'wc_add_to_cart_params'],
    confidence: 100
  },
  {
    name: 'Wix',
    category: 'Web Builder',
    html: [/wixsite\.com|wix\.com/i],
    scripts: [/wix\.com|wix-code/i],
    links: [/wix\.com/i],
    meta: { generator: /Wix\.com/i },
    js: ['wixDeveloperAnalytics', 'wixEmbedsAPI'],
    confidence: 100
  },
  {
    name: 'Squarespace',
    category: 'Web Builder',
    html: [/squarespace/i],
    scripts: [/squarespace/i],
    links: [/squarespace/i],
    js: ['Squarespace', 'Y.Squarespace'],
    confidence: 100
  },
  {
    name: 'Webflow',
    category: 'Web Builder',
    html: [/data-wf-page|data-wf-site|webflow/i],
    scripts: [/webflow\.js/i],
    js: ['Webflow'],
    confidence: 100
  },
  {
    name: 'Ghost',
    category: 'CMS',
    html: [/ghost-sdk/i],
    scripts: [/ghost-sdk/i],
    meta: { generator: /Ghost/i },
    js: ['ghost'],
    confidence: 100
  },
  {
    name: 'HubSpot CMS',
    category: 'CMS',
    html: [/hs-script|hubspot/i],
    scripts: [/hubspot/i],
    meta: { generator: /HubSpot/i },
    js: ['_hsq', 'hubspot'],
    confidence: 100
  },
  {
    name: 'Drupal',
    category: 'CMS',
    html: [/drupal/i, /sites\/all/i],
    scripts: [/drupal\.js/i],
    meta: { generator: /Drupal/i },
    headers: { 'x-generator': /Drupal/i, 'x-drupal-cache': /.*/i },
    js: ['Drupal'],
    confidence: 100
  },
  {
    name: 'Joomla',
    category: 'CMS',
    html: [/joomla/i],
    meta: { generator: /Joomla/i },
    headers: { 'x-content-encoded-by': /Joomla/i },
    js: ['Joomla'],
    confidence: 100
  },
  {
    name: 'Blogger',
    category: 'CMS',
    meta: { generator: /Blogger/i },
    confidence: 100
  },

  // ================= Frontend Frameworks & Tech =================
  {
    name: 'React',
    category: 'Frontend Framework',
    html: [/react/i],
    scripts: [/react/i],
    js: ['React', 'ReactQuery', 'Recoil', 'Redux'],
    confidence: 90
  },
  {
    name: 'Angular',
    category: 'Frontend Framework',
    html: [/ng-app|ng-controller|angular/i, /_nghost/i, /_ngcontent/i],
    scripts: [/angular/i],
    js: ['angular', 'ng'],
    confidence: 100
  },
  {
    name: 'Vue.js',
    category: 'Frontend Framework',
    html: [/v-bind|v-model|vue/i, /data-v-/i],
    scripts: [/vue/i],
    js: ['Vue', '__VUE__'],
    confidence: 100
  },
  {
    name: 'Svelte',
    category: 'Frontend Framework',
    html: [/svelte-/i],
    scripts: [/svelte/i],
    confidence: 90
  },
  {
    name: 'Next.js',
    category: 'Frontend Framework',
    html: [/_next\/static/i, /id="__NEXT_DATA__"/i],
    scripts: [/_next\/static/i],
    headers: { 'x-powered-by': /Next\.js/i, 'x-nextjs-cache': /.*/i },
    js: ['__NEXT_DATA__'],
    confidence: 100
  },
  {
    name: 'Nuxt.js',
    category: 'Frontend Framework',
    html: [/id="__nuxt"/i, /data-n-head/i],
    js: ['__NUXT__'],
    confidence: 100
  },
  {
    name: 'Gatsby',
    category: 'Frontend Framework',
    html: [/id="___gatsby"/i, /gatsby-image/i],
    js: ['___gatsby'],
    confidence: 100
  },
  {
    name: 'Alpine.js',
    category: 'Frontend Framework',
    html: [/x-data|x-init|x-show|x-on/i],
    js: ['Alpine'],
    confidence: 100
  },
  {
    name: 'SolidJS',
    category: 'Frontend Framework',
    confidence: 70
  },
  {
    name: 'Preact',
    category: 'Frontend Framework',
    js: ['preact'],
    confidence: 90
  },
  {
    name: 'Astro',
    category: 'Frontend Framework',
    html: [/astro-/i, /class="astro-/i],
    confidence: 95
  },
  {
    name: 'Remix',
    category: 'Frontend Framework',
    js: ['__remixContext'],
    confidence: 100
  },
  {
    name: 'Backbone.js',
    category: 'Frontend Framework',
    js: ['Backbone'],
    confidence: 100
  },
  {
    name: 'Ember.js',
    category: 'Frontend Framework',
    html: [/ember-application/i],
    js: ['Ember'],
    confidence: 100
  },
  {
    name: 'HTMX',
    category: 'JavaScript Library',
    html: [/hx-get|hx-post|hx-target/i],
    scripts: [/htmx/i],
    js: ['htmx'],
    confidence: 100
  },

  // ================= CSS Frameworks =================
  {
    name: 'Bootstrap',
    category: 'CSS Framework',
    html: [/bootstrap/i, /btn-primary/i, /col-md-/i, /col-xs-/i, /col-lg-/i],
    links: [/bootstrap/i],
    js: ['bootstrap'],
    confidence: 85
  },
  {
    name: 'Tailwind CSS',
    category: 'CSS Framework',
    html: [/tailwind/i, /space-x-/i, /space-y-/i, /focus:ring-/i, /dark:bg-/i],
    links: [/tailwind/i],
    js: ['tailwind'],
    confidence: 85
  },
  {
    name: 'Materialize',
    category: 'CSS Framework',
    html: [/materialize/i, /s12 m6/i],
    links: [/materialize/i],
    js: ['Materialize'],
    confidence: 95
  },
  {
    name: 'Bulma',
    category: 'CSS Framework',
    html: [/bulma/i, /is-primary/i, /columns is-multiline/i],
    links: [/bulma/i],
    confidence: 90
  },
  {
    name: 'Foundation',
    category: 'CSS Framework',
    html: [/foundation\.css|foundation\.min\.css/i, /small-12 medium-6/i],
    links: [/foundation/i],
    js: ['Foundation'],
    confidence: 95
  },
  {
    name: 'UIkit',
    category: 'CSS Framework',
    html: [/uk-container|uk-grid|uk-button/i],
    links: [/uikit/i],
    js: ['UIkit'],
    confidence: 100
  },

  // ================= UI Component Libraries =================
  {
    name: 'Material UI (MUI)',
    category: 'UI Library',
    html: [/MuiButton-|MuiTypography-|MuiGrid-/i],
    confidence: 95
  },
  {
    name: 'Ant Design',
    category: 'UI Library',
    html: [/ant-btn|ant-layout|ant-row|ant-col/i],
    confidence: 100
  },
  {
    name: 'Chakra UI',
    category: 'UI Library',
    html: [/chakra-ui/i, /css-.*chakra-/i],
    confidence: 95
  },
  {
    name: 'Element Plus',
    category: 'UI Library',
    html: [/el-button|el-input|el-table/i],
    confidence: 100
  },
  {
    name: 'Vuetify',
    category: 'UI Library',
    html: [/v-btn|v-card|v-application|v-row|v-col/i],
    confidence: 100
  },
  {
    name: 'Ionic',
    category: 'UI Library',
    html: [/ion-app|ion-content|ion-button|ion-card/i],
    js: ['Ionic'],
    confidence: 100
  },
  {
    name: 'Headless UI',
    category: 'UI Library',
    html: [/headlessui/i],
    confidence: 80
  },
  {
    name: 'PrimeVue',
    category: 'UI Library',
    html: [/p-button|p-inputtext|p-datatable/i],
    confidence: 100
  },

  // ================= JS Libraries =================
  {
    name: 'jQuery',
    category: 'JavaScript Library',
    scripts: [/jquery/i],
    js: ['jQuery', '$'],
    confidence: 100
  },
  {
    name: 'Lodash',
    category: 'JavaScript Library',
    scripts: [/lodash/i],
    js: ['_'],
    confidence: 95
  },
  {
    name: 'Moment.js',
    category: 'JavaScript Library',
    scripts: [/moment/i],
    js: ['moment'],
    confidence: 100
  },
  {
    name: 'D3.js',
    category: 'JavaScript Library',
    scripts: [/d3\.js|d3\.min\.js/i],
    js: ['d3'],
    confidence: 100
  },
  {
    name: 'Three.js',
    category: 'JavaScript Library',
    scripts: [/three/i],
    js: ['THREE'],
    confidence: 100
  },
  {
    name: 'GSAP (GreenSock)',
    category: 'JavaScript Library',
    scripts: [/gsap|greensock/i],
    js: ['gsap', 'TweenMax'],
    confidence: 100
  },
  {
    name: 'Chart.js',
    category: 'JavaScript Library',
    scripts: [/chart\.js/i],
    js: ['Chart'],
    confidence: 100
  },
  {
    name: 'Axios',
    category: 'JavaScript Library',
    scripts: [/axios/i],
    js: ['axios'],
    confidence: 100
  },
  {
    name: 'RxJS',
    category: 'JavaScript Library',
    js: ['rxjs'],
    confidence: 90
  },
  {
    name: 'Swiper',
    category: 'JavaScript Library',
    html: [/swiper-container|swiper-wrapper|swiper-slide/i],
    scripts: [/swiper/i],
    links: [/swiper/i],
    js: ['Swiper'],
    confidence: 100
  },

  // ================= Analytics & Marketing =================
  {
    name: 'Google Analytics',
    category: 'Analytics',
    html: [/google-analytics|gtag/i],
    scripts: [/google-analytics\.com\/analytics\.js/i, /googletagmanager\.com\/gtag\/js/i],
    js: ['ga', 'gaplugins', 'gtag', 'GoogleAnalyticsObject'],
    confidence: 100
  },
  {
    name: 'Google Tag Manager',
    category: 'Analytics',
    html: [/googletagmanager/i],
    scripts: [/googletagmanager\.com\/gtm\.js/i],
    js: ['google_tag_manager', 'dataLayer'],
    confidence: 100
  },
  {
    name: 'Mixpanel',
    category: 'Analytics',
    scripts: [/mixpanel/i],
    js: ['mixpanel'],
    confidence: 100
  },
  {
    name: 'Hotjar',
    category: 'Analytics',
    html: [/hjSiteSettings/i],
    scripts: [/hotjar/i],
    js: ['hj', '_hjSettings'],
    confidence: 100
  },
  {
    name: 'Segment',
    category: 'Analytics',
    scripts: [/segment\.js|analytics\.js\/v1/i],
    js: ['analytics'],
    confidence: 100
  },
  {
    name: 'Amplitude',
    category: 'Analytics',
    js: ['amplitude'],
    confidence: 100
  },
  {
    name: 'Microsoft Clarity',
    category: 'Analytics',
    scripts: [/clarity\.js|c\.gif/i],
    js: ['clarity'],
    confidence: 100
  },
  {
    name: 'Plausible Analytics',
    category: 'Analytics',
    scripts: [/plausible\.js|plausible\.outbound\.js/i],
    confidence: 100
  },

  // ================= Advertising =================
  {
    name: 'Google Ads (AdSense)',
    category: 'Advertising',
    html: [/googlesyndication|adsbygoogle/i],
    scripts: [/adsbygoogle\.js|googlesyndication/i],
    js: ['adsbygoogle'],
    confidence: 100
  },
  {
    name: 'Facebook Pixel',
    category: 'Advertising',
    html: [/connect\.facebook\.net/i, /fbevents/i],
    scripts: [/fbevents\.js/i],
    js: ['fbq', '_fbq'],
    confidence: 100
  },
  {
    name: 'Amazon Advertising',
    category: 'Advertising',
    scripts: [/amazon-adsystem/i],
    js: ['amznads'],
    confidence: 100
  },
  {
    name: 'Taboola',
    category: 'Advertising',
    html: [/taboola/i],
    scripts: [/taboola/i],
    js: ['_taboola'],
    confidence: 100
  },
  {
    name: 'Outbrain',
    category: 'Advertising',
    scripts: [/outbrain/i],
    js: ['OBR'],
    confidence: 100
  },
  {
    name: 'Criteo',
    category: 'Advertising',
    scripts: [/criteo/i],
    js: ['criteo_q'],
    confidence: 100
  },
  {
    name: 'LinkedIn Insight Tag',
    category: 'Advertising',
    scripts: [/snap\.licdn\.com/i],
    js: ['_linkedin_data_partner_id'],
    confidence: 100
  },
  {
    name: 'TikTok Pixel',
    category: 'Advertising',
    js: ['ttq'],
    confidence: 100
  },

  // ================= Utilities & Tools =================
  {
    name: 'Stripe',
    category: 'Payments',
    scripts: [/js\.stripe\.com\/v3/i],
    js: ['Stripe'],
    confidence: 100
  },
  {
    name: 'PayPal',
    category: 'Payments',
    scripts: [/paypal\.com\/sdk\/js/i],
    js: ['paypal'],
    confidence: 100
  },
  {
    name: 'ReCAPTCHA',
    category: 'Security',
    html: [/g-recaptcha/i, /recaptcha\/api\.js/i],
    scripts: [/recaptcha/i],
    js: ['grecaptcha'],
    confidence: 100
  },
  {
    name: 'hCaptcha',
    category: 'Security',
    html: [/h-captcha/i],
    scripts: [/hcaptcha\.com\/1\/api\.js/i],
    js: ['hcaptcha'],
    confidence: 100
  },
  {
    name: 'Cloudflare Turnstile',
    category: 'Security',
    html: [/cf-turnstile/i],
    scripts: [/turnstile\/v0/i],
    js: ['turnstile'],
    confidence: 100
  },

  // ================= Cloud & Platform =================
  {
    name: 'Firebase',
    category: 'Cloud',
    scripts: [/firebase/i],
    js: ['firebase'],
    confidence: 90
  },
  {
    name: 'Supabase',
    category: 'Cloud',
    scripts: [/supabase/i],
    confidence: 80
  },
  {
    name: 'Algolia',
    category: 'Search',
    scripts: [/algolia/i],
    js: ['algoliasearch'],
    confidence: 100
  },
  {
    name: 'Vercel',
    category: 'Hosting',
    headers: { 'server': /vercel/i, 'x-vercel-id': /.*/i },
    confidence: 100
  },
  {
    name: 'Netlify',
    category: 'Hosting',
    headers: { 'server': /netlify/i, 'x-nf-request-id': /.*/i },
    confidence: 100
  },
  {
    name: 'Heroku',
    category: 'Hosting',
    headers: { 'x-heroku-id': /.*/i, 'via': /heroku/i },
    confidence: 100
  },
  {
    name: 'Cloudflare',
    category: 'CDN',
    headers: { 'server': /cloudflare/i, 'cf-ray': /.*/i, 'cf-cache-status': /.*/i },
    confidence: 100
  },
  {
    name: 'AWS',
    category: 'Cloud',
    headers: { 'server': /amazons3/i, 'x-amz-cf-id': /.*/i },
    confidence: 100
  },
  {
    name: 'WP Engine',
    category: 'Hosting',
    headers: { 'x-powered-by': /WP Engine/i, 'server': /wpe/i },
    confidence: 100
  },

  // ================= Web Servers & OS =================
  {
    name: 'Nginx',
    category: 'Web Server',
    headers: { 'server': /nginx/i },
    confidence: 100
  },
  {
    name: 'Apache',
    category: 'Web Server',
    headers: { 'server': /apache/i },
    confidence: 100
  },
  {
    name: 'LiteSpeed',
    category: 'Web Server',
    headers: { 'server': /litespeed/i },
    confidence: 100
  },
  {
    name: 'Express',
    category: 'Backend',
    headers: { 'x-powered-by': /express/i },
    confidence: 100
  },
  {
    name: 'PHP',
    category: 'Backend',
    headers: { 'x-powered-by': /php/i },
    confidence: 90
  },
  {
    name: 'Ruby on Rails',
    category: 'Backend',
    html: [/csrf-param/i, /authenticity_token/i],
    headers: { 'x-runtime': /.*/i },
    confidence: 90
  },
  {
    name: 'Django',
    category: 'Backend',
    html: [/csrfmiddlewaretoken/i],
    confidence: 90
  },
  {
    name: 'Laravel',
    category: 'Backend',
    cookies: ['laravel_session', 'XSRF-TOKEN'],
    confidence: 90
  }
];

// If in Node.js or CommonJS environment (for tests/validation)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TECH_SIGNATURES };
}
