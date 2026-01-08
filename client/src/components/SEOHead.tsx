import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  structuredData?: object;
}

const defaultMeta = {
  title: 'ProcessSutra - Business Workflow Builder & Automation Platform',
  description: 'Create flow chart with drag-and-drop. Automate processes, track productivity in real-time, and scale operations effortlessly.',
  keywords: 'FMS, Business Automation, Flowchart management tools, BAS Tool, CRM, Muxro, Jatin Gola, Business Simulator, Business Technology',
  siteUrl: 'https://www.processsutra.com',
  ogImage: 'https://www.processsutra.com/og-image.png',
};

export default function SEOHead({
  title,
  description = defaultMeta.description,
  keywords = defaultMeta.keywords,
  canonical,
  ogImage = defaultMeta.ogImage,
  ogType = 'website',
  noIndex = false,
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title 
    ? `${title} | ProcessSutra` 
    : defaultMeta.title;
  
  const canonicalUrl = canonical 
    ? `${defaultMeta.siteUrl}${canonical}` 
    : defaultMeta.siteUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}
      
      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="ProcessSutra" />
      
      {/* Twitter
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@MuxroTech" />
      <meta name="twitter:creator" content="@JatinGola" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="ProcessSutra - Visual Workflow Builder" /> */}
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

// Pre-defined SEO configurations for each page
export const pageSEO = {
  dashboard: {
    title: 'Dashboard - Analytics & Insights',
    description: 'View your business analytics, task completion rates, and workflow performance metrics in real-time on the ProcessSutra dashboard.',
    keywords: 'dashboard, analytics, business metrics, workflow analytics, productivity tracking',
    canonical: '/analytics',
  },
  tasks: {
    title: 'Task Management',
    description: 'Manage and track all your workflow tasks. View pending tasks, deadlines, and completion status in one centralized location.',
    keywords: 'task management, task tracking, workflow tasks, deadline management, task list',
    canonical: '/tasks',
  },
  flowBuilder: {
    title: 'Visual Flow Builder - Drag & Drop Workflow Designer',
    description: 'Create and design workflows visually with our intuitive drag-and-drop flow builder. Build complex business processes without coding.',
    keywords: 'visual flow builder, workflow designer, drag drop workflow, process builder, no-code automation, flowchart builder',
    canonical: '/visual-flow-builder',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "ProcessSutra Visual Flow Builder",
      "applicationCategory": "DesignApplication",
      "operatingSystem": "Web Browser",
      "description": "Drag-and-drop visual workflow builder for creating business process automations without coding.",
      "featureList": [
        "Drag-and-drop node placement",
        "Visual connection lines",
        "Zoom and pan controls",
        "Export to PNG",
        "Real-time collaboration",
        "Keyboard shortcuts",
        "Search functionality"
      ],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  },
  flows: {
    title: 'Workflow Management',
    description: 'View and manage all your business workflows. Monitor flow status, track progress, and optimize your business processes.',
    keywords: 'workflow management, business flows, process tracking, workflow status, flow monitoring',
    canonical: '/flows',
  },
  formBuilder: {
    title: 'Form Builder - Create Custom Forms',
    description: 'Build custom forms for your workflows with our drag-and-drop form builder. Create surveys, data collection forms, and more.',
    keywords: 'form builder, custom forms, survey builder, data collection, form designer',
    canonical: '/form-builder',
  },
  analytics: {
    title: 'Analytics & Reports',
    description: 'Comprehensive analytics and reporting for your workflows. Track KPIs, measure productivity, and generate insights.',
    keywords: 'workflow analytics, business reports, KPI tracking, productivity metrics, performance reports',
    canonical: '/analytics',
  },
  userManagement: {
    title: 'User Management',
    description: 'Manage users, roles, and permissions for your organization. Control access and assign workflow responsibilities.',
    keywords: 'user management, role management, permissions, team management, access control',
    canonical: '/user-management',
  },
  settings: {
    title: 'Settings',
    description: 'Configure your ProcessSutra account settings, integrations, and preferences.',
    keywords: 'settings, configuration, account settings, preferences',
    canonical: '/settings',
  },
  login: {
    title: 'Login',
    description: 'Sign in to ProcessSutra to access your workflows, tasks, and business automation tools.',
    keywords: 'login, sign in, processsutra login',
    canonical: '/login',
    noIndex: true,
  },
  welcome: {
    title: 'Welcome - Business Process Automation Made Simple',
    description: 'ProcessSutra helps you automate business processes with visual workflow builder, real-time tracking, and powerful analytics. Start for free today.',
    keywords: 'business automation, workflow software, process management, BPM, automation platform',
    canonical: '/welcome',
  },
};
