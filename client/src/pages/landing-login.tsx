import React, { useEffect } from "react";
import { FaCogs, FaChartLine, FaRocket, FaCheckCircle, FaUsers, FaTasks, FaClipboardCheck, FaBrain, FaCode, FaLayerGroup, FaArrowRight, FaStar, FaIndustry, FaGlobe } from "react-icons/fa";
import logoImage from "@/logo/ProcessSutra(icon).png";
import muxroLogo from "@/logo/muxro.png";

const LandingLogin: React.FC = () => {
  useEffect(() => {
    // Set page title
    document.title = "ProcessSutra - Business Process Automation & Workflow Management Platform";
    
    // Create or update meta tags
    const metaTags = [
      { name: "description", content: "Automate your business operations with ProcessSutra. Intelligent workflow management, real-time tracking, and productivity analytics. See your business health in 2 seconds. No coding required." },
      { name: "keywords", content: "business automation, workflow management, process automation, TAT tracking, productivity tools, efficiency measurement, workflow engine, business intelligence, task management, form builder, no-code automation" },
      { name: "author", content: "ProcessSutra" },
      { name: "robots", content: "index, follow" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: "#2563eb" },
      
      // Open Graph tags
      { property: "og:title", content: "ProcessSutra - Business Process Automation Platform" },
      { property: "og:description", content: "Transform your business with intelligent automation. Monitor productivity, track efficiency, and see your business health in 2 seconds." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.processsutra.com" },
      { property: "og:image", content: logoImage },
      { property: "og:site_name", content: "ProcessSutra" },
      
      // Twitter Card tags
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ProcessSutra - Business Automation Platform" },
      { name: "twitter:description", content: "Automate workflows, track productivity, and scale your business without limits." },
      { name: "twitter:image", content: logoImage },
      
      // Additional SEO tags
      { name: "language", content: "English" },
      { name: "revisit-after", content: "7 days" },
      { name: "distribution", content: "global" },
      { name: "rating", content: "general" },
    ];

    metaTags.forEach(({ name, property, content }) => {
      const attr = property ? 'property' : 'name';
      const value = property || name || '';
      let meta = document.querySelector(`meta[${attr}="${value}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, value);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Add canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);

    // Add structured data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "ProcessSutra",
      "applicationCategory": "BusinessApplication",
      "description": "Business process automation and workflow management platform that helps businesses automate operations, track productivity, and improve efficiency.",
      "operatingSystem": "Web-based",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "description": "Usage-based pricing: (Flow × Rate) + (User Count × Rate) + (Form Submission × Rate)"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1000"
      },
      "featureList": [
        "Visual Workflow Builder",
        "Real-time Task Tracking",
        "TAT (Turnaround Time) Management",
        "Form Builder",
        "Role-based Access Control",
        "Analytics & Reporting",
        "Email Notifications",
        "API Integration",
        "Mobile Responsive",
        "Cloud-based"
      ]
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    // Cleanup function
    return () => {
      // Optional: Remove tags on unmount if needed
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <header>
        <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="ProcessSutra - Business Process Automation Platform Logo" className="h-10 w-auto" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ProcessSutra</span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-700" role="menubar">
              <a href="#features" className="hover:text-blue-600 transition-colors duration-200" role="menuitem">Features</a>
              <a href="#solutions" className="hover:text-blue-600 transition-colors duration-200" role="menuitem">Solutions</a>
              <a href="#pricing" className="hover:text-blue-600 transition-colors duration-200" role="menuitem">Pricing</a>
              <a href="#about" className="hover:text-blue-600 transition-colors duration-200" role="menuitem">About</a>
            </div>
            <a href="/login" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200" aria-label="Sign in to your account">
              Sign In
            </a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-24 px-6 relative overflow-hidden" aria-labelledby="hero-heading">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-8 animate-fade-in">
              <FaStar className="text-yellow-500" />
              <span>Built on research from 1000+ businesses</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-fade-in-up">
              Automate Your Business.
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Scale Without Limits.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 mb-4 animate-fade-in-up animation-delay-200">
              Run your entire business operation autonomously—no business owner involvement required
            </p>

            {/* Credentials */}
            <div className="mt-10 mb-12 animate-fade-in-up animation-delay-400">
              <div className="inline-flex items-center gap-3 bg-white rounded-xl shadow-lg px-6 py-4 mb-4">
                <img src={muxroLogo} alt="Muxro Technologies Logo" className="h-10 w-auto" />
                <div className="text-left">
                  <p className="text-sm text-gray-500">Developed by</p>
                  <p className="font-bold text-gray-900">Muxro Technologies</p>
                </div>
              </div>
              <p className="text-base text-gray-700 max-w-2xl mx-auto">
                <span className="font-bold text-blue-600">Jatin Gola</span> — Business Operations & Technology Expert
                <br />
                <span className="text-gray-500">14+ years of cross-industry implementation experience</span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-600">
              <a href="/login" className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2">
                Start Free Trial
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#demo" className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200">
                Watch Demo
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500 animate-fade-in-up animation-delay-800">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <StatCard number="1000+" label="Businesses Researched" />
            <StatCard number="14+" label="Years Experience" />
            <StatCard number="100%" label="Workflow Visibility" />
            <StatCard number="50%" label="Time Saved" />
          </div>
        </div>
      </section>

      {/* Problems We Solve - Transformed into Solutions */}
      <section id="solutions" className="py-24 px-6 bg-white relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              The Challenge <span className="text-blue-600">We Solve</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Traditional business operations are plagued by inefficiencies. ProcessSutra transforms chaos into clarity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <SolutionCard
              emoji="💔"
              problem="No Central System"
              solution="Unified Platform"
              description="Replace disconnected tools with one intelligent system that connects data, tasks, and workflows seamlessly."
              gradient="from-red-500 to-orange-500"
            />
            <SolutionCard
              emoji="⏰"
              problem="Invisible Delays"
              solution="Real-Time Visibility"
              description="See exactly what's pending, who's working on what, and where bottlenecks occur—all in real-time."
              gradient="from-orange-500 to-yellow-500"
            />
            <SolutionCard
              emoji="📊"
              problem="No Performance Metrics"
              solution="Data-Driven Insights"
              description="Measure efficiency with precision. Track TAT, productivity, and process performance like Six Sigma."
              gradient="from-blue-500 to-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-24 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              Enterprise-Grade <span className="text-blue-600">Features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to automate, optimize, and scale your business operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCardNew 
              icon={<FaCogs className="text-4xl" />}
              title="Visual Workflow Engine"
              description="Design complex workflows with drag-and-drop simplicity. No coding required—just pure business logic."
              color="blue"
            />
            <FeatureCardNew 
              icon={<FaTasks className="text-4xl" />}
              title="Intelligent Task Routing"
              description="Auto-assign tasks based on TAT, workload, availability, and business rules. Smart distribution, zero manual work."
              color="green"
            />
            <FeatureCardNew 
              icon={<FaClipboardCheck className="text-4xl" />}
              title="Dynamic Form Builder"
              description="Create custom forms for every workflow step. Conditional fields, validations, and integrations built-in."
              color="purple"
            />
            <FeatureCardNew 
              icon={<FaRocket className="text-4xl" />}
              title="Workflow Simulator"
              description="Test processes before deployment. Identify bottlenecks, optimize throughput, and predict outcomes."
              color="orange"
            />
            <FeatureCardNew 
              icon={<FaChartLine className="text-4xl" />}
              title="Real-Time Analytics"
              description="Live dashboards showing productivity, efficiency, delays, and performance metrics across all teams."
              color="indigo"
            />
            <FeatureCardNew 
              icon={<FaCode className="text-4xl" />}
              title="Developer-Friendly APIs"
              description="RESTful APIs, webhooks, and SDK support. Integrate with any system—ERP, CRM, or custom tools."
              color="red"
            />
          </div>
        </div>
      </section>

      {/* Productivity & Efficiency Section */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
              ⚡ INSTANT BUSINESS INTELLIGENCE
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              See Your Business Health in <span className="text-blue-600">2 Seconds</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Productivity and efficiency are the ultimate measuring tools for business operations. 
              Get instant visibility into your business condition.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-10 text-white">
                <h3 className="text-3xl font-bold mb-6">Real-Time Dashboard</h3>
                <div className="space-y-6">
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-100">Productivity Score</span>
                      <span className="text-3xl font-bold">92%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                      <div className="bg-green-400 h-3 rounded-full" style={{width: '92%'}}></div>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-100">Efficiency Rating</span>
                      <span className="text-3xl font-bold">88%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-3">
                      <div className="bg-yellow-400 h-3 rounded-full" style={{width: '88%'}}></div>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-xl p-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-3xl font-bold">127</div>
                        <div className="text-sm text-blue-100">Active Tasks</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold">15</div>
                        <div className="text-sm text-blue-100">Delayed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-600">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaChartLine className="text-blue-600 text-2xl" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Productivity Tracking</h4>
                    <p className="text-gray-600">
                      Monitor tasks completed vs. pending, on-time delivery rates, and employee performance in real-time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-green-600">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaRocket className="text-green-600 text-2xl" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Efficiency Measurement</h4>
                    <p className="text-gray-600">
                      Track TAT compliance, bottleneck locations, and process optimization opportunities instantly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-purple-600">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaBrain className="text-purple-600 text-2xl" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Business Intelligence</h4>
                    <p className="text-gray-600">
                      Get actionable insights with AI-powered analytics. Know exactly where to focus for maximum impact.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl shadow-xl p-10 border border-gray-200">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Business Owners See These Critical Parameters Instantly
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-4xl mb-2">📊</div>
                <div className="font-bold text-gray-900 mb-1">Productivity</div>
                <div className="text-sm text-gray-600">Tasks completed vs assigned</div>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-4xl mb-2">⚡</div>
                <div className="font-bold text-gray-900 mb-1">Efficiency</div>
                <div className="text-sm text-gray-600">TAT compliance & speed</div>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-4xl mb-2">🎯</div>
                <div className="font-bold text-gray-900 mb-1">Performance</div>
                <div className="text-sm text-gray-600">Team & individual metrics</div>
              </div>
              <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                <div className="text-4xl mb-2">🚨</div>
                <div className="font-bold text-gray-900 mb-1">Bottlenecks</div>
                <div className="text-sm text-gray-600">Delay points & alerts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Components */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">System Components</h2>
          <p className="text-center text-gray-600 mb-12">
            Everything you need to manage workflows, tasks, and data at scale
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <ComponentCard title="Task Dashboard" description="Personalized to-do list for each user with priorities and deadlines" />
            <ComponentCard title="Performance Module" description="Efficiency metrics, completed tasks, delays, and employee scorecards" />
            <ComponentCard title="Flow Management" description="Visual flowchart builder for creating and managing workflows" />
            <ComponentCard title="Form Builder" description="Create forms linked to workflow steps with custom fields" />
            <ComponentCard title="TAT Configuration" description="Define working hours, deadlines, shifts, and holidays" />
            <ComponentCard title="Flow Tracker" description="Visual map showing workflow progress (completed vs pending)" />
            <ComponentCard title="Flow Simulator" description="Test workflows to predict bottlenecks before going live" />
            <ComponentCard title="User Management" description="Add/remove users, assign roles, and allocate workflow steps" />
            <ComponentCard title="Form Data Viewer" description="Managers/Admins view all entered data step by step" />
            <ComponentCard title="Integration Layer" description="APIs and Webhooks for connecting external systems" />
            <ComponentCard title="AI Assistance" description="Analyze workflows, auto-generate rules, and optimize forms" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Fair, Transparent <span className="text-blue-600">Pricing</span>
          </h2>
          <p className="text-xl text-gray-600 mb-16">Scale seamlessly. Pay only for what you use.</p>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-2xl p-12 border-2 border-blue-200 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            
            <div className="relative z-10">
              <div className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-sm font-bold mb-6">
                USAGE-BASED MODEL
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">Pay As You Grow</h3>
              
              {/* Pricing Formula */}
              <div className="bg-white rounded-xl shadow-lg p-8 mb-10 max-w-4xl mx-auto border-2 border-blue-200">
                <h4 className="text-xl font-bold text-gray-900 mb-6 text-center">Simple Usage-Based Formula</h4>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                  <div className="text-center font-mono text-2xl font-bold text-gray-900 mb-2">
                    Total Cost = (Flow × Rate) + (User Count × Rate) + (Form Submission × Rate)
                  </div>
                  <p className="text-center text-sm text-gray-600 italic">
                    Pay only for what you actually use
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6 text-left">
                  <PricingItem icon={<FaCogs />} label="Flow Executions" detail="Per workflow run" />
                  <PricingItem icon={<FaUsers />} label="Active Users" detail="Per user/month" />
                  <PricingItem icon={<FaClipboardCheck />} label="Form Submissions" detail="Per submission" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <a href="/login" className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                  Start 14-Day Free Trial
                </a>
                <a href="#contact" className="px-10 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200">
                  Request Quote
                </a>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-500" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-500" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-500" />
                  <span>Volume discounts available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Background Section */}
      <section id="about" className="py-24 px-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              The Story Behind <span className="text-blue-600">ProcessSutra</span>
            </h2>
            <p className="text-xl text-gray-600">From research to reality—14 years in the making</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-600">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">The Problem We Discovered</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">•</span>
                    <span>Employees execute workflows unconsciously—no awareness of timing or dependencies</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">•</span>
                    <span>Heavy reliance on memory and email leads to missed deadlines</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">•</span>
                    <span>Disconnected tools (notebooks, spreadsheets, ERP) create data silos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">•</span>
                    <span>ERP systems focus on data entry, not process orchestration</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Our Solution Approach</h3>
                <p className="text-blue-100 leading-relaxed">
                  We studied 1000+ businesses across multiple industries, mapping workflows, task patterns, and turnaround times. 
                  Starting with spreadsheets, then Google Workspace, we evolved to a complete cloud-based system capable of 
                  managing processes, data, and tasks at enterprise scale.
                </p>
              </div>
            </div>

            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                In most organizations, <strong>employees work unconsciously</strong>—they know their specific task but lack 
                visibility into the broader workflow. This creates a fundamental problem: <em>they don't know WHEN tasks must 
                be completed</em>, only WHAT needs to be done.
              </p>
              <p>
                Through years of research, we mapped business process science: task allocation mechanisms, employee behavior 
                patterns, TAT calculations, and workflow dependencies. We created flowcharts and spreadsheet templates, 
                implementing them across hundreds of organizations.
              </p>
              <p className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                <strong>The breakthrough:</strong> Organizations needed MORE than data entry systems. They needed a platform 
                that could <strong>orchestrate workflows, auto-assign tasks, and provide real-time visibility</strong>—all 
                while accounting for shifts, holidays, and business calendars.
              </p>
              <p>
                As data volumes grew, spreadsheets couldn't scale. That's when ProcessSutra was born: a cloud-native workflow 
                and task management system built for modern enterprises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Purpose Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Purpose of the Invention</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <PurposeCard text="Convert hidden, unconscious workflows into visible, measurable steps" />
            <PurposeCard text="Automatically assign tasks to employees based on defined process rules" />
            <PurposeCard text="Enable custom data-entry forms for each step of a process" />
            <PurposeCard text="Provide real-time dashboards for both employees and managers" />
            <PurposeCard text="Use Turnaround Time (TAT) rules that account for shifts, holidays, and working hours" />
            <PurposeCard text="Allow managers to see live progress and pending work" />
            <PurposeCard text="Provide measurable metrics for productivity, efficiency, and process performance" />
            <PurposeCard text="Simulate workflows before deployment to predict and resolve bottlenecks" />
            <PurposeCard text="Integrate with ERP and other tools using APIs and Webhooks" />
            <PurposeCard text="Use AI assistance to design workflows and suggest improvements" />
          </div>
        </div>
      </section>

      {/* Example Workflow */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">Example: Order Management Workflow</h2>
          <p className="text-center text-gray-600 mb-12">See how ProcessSutra handles a complete order lifecycle</p>
          <div className="space-y-4">
            <WorkflowStep number={1} text="Salesperson enters order in a form → Task is created" />
            <WorkflowStep number={2} text="System assigns next task: Inventory team checks stock" />
            <WorkflowStep number={3} text="If stock is available → Dispatch team gets a task" />
            <WorkflowStep number={4} text="Accounts team automatically gets a task to generate invoices" />
            <WorkflowStep number={5} text="Delivery confirmation form is assigned to logistics" />
          </div>
          <div className="mt-8 bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
            <h3 className="font-semibold text-lg mb-2 text-gray-900">Each step has:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>✓ A responsible user</li>
              <li>✓ A deadline (TAT)</li>
              <li>✓ A form to collect data</li>
              <li>✓ Automatic tracking of time and status</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scientific Benefits */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">Scientific & Research-Based Benefits</h2>
          <p className="text-center text-gray-600 mb-12">
            Built on proven methodologies from lean manufacturing and organizational behavior
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <BenefitCard 
              icon={<FaBrain className="text-3xl text-purple-600" />}
              title="Cognitive Load Reduction"
              description="System guides and reminds users, reducing stress and mistakes. Employees don't need to remember every task."
            />
            <BenefitCard 
              icon={<FaUsers className="text-3xl text-blue-600" />}
              title="Workflow Awareness"
              description="Employees understand the 'big picture' of the business, not just their small role in the process."
            />
            <BenefitCard 
              icon={<FaChartLine className="text-3xl text-green-600" />}
              title="Efficiency Science"
              description="TAT tracking makes performance measurable, similar to lean manufacturing or Six Sigma methodologies."
            />
            <BenefitCard 
              icon={<FaLayerGroup className="text-3xl text-orange-600" />}
              title="Human-System Synergy"
              description="Combines human judgment (filling forms) with automation (workflow engine) for optimal results."
            />
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-500/20 backdrop-blur text-blue-200 rounded-full text-sm font-semibold mb-4 border border-blue-400/30">
              🎥 WATCH & LEARN
            </div>
            <h2 className="text-5xl font-bold mb-4">
              See ProcessSutra in Action
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Watch our comprehensive videos to understand the problem we solve and how to get started
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Problem Explanation Video */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 hover:border-blue-400/50 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <FaBrain className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Problem Explained</h3>
                  <p className="text-sm text-gray-300">Understanding the business challenge</p>
                </div>
              </div>
              <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden shadow-xl">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/QRvI6a6FE9Y"
                  title="ProcessSutra - Problem Explanation"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="mt-4 text-gray-300 text-sm">
                Learn how traditional business processes fail and why automation is essential for modern enterprises.
              </p>
            </div>

            {/* Setup Guide Video */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 hover:border-green-400/50 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <FaCogs className="text-white text-2xl" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Setup Guide</h3>
                  <p className="text-sm text-gray-300">Get started in minutes</p>
                </div>
              </div>
              <div className="relative pb-[56.25%] h-0 rounded-lg overflow-hidden shadow-xl">
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src="https://www.youtube.com/embed/-_CI-3FRwSo"
                  title="ProcessSutra - Setup Guide"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="mt-4 text-gray-300 text-sm">
                Follow our step-by-step guide to set up your first automated workflow and start seeing results immediately.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="text-4xl font-bold text-blue-400 mb-2">5 min</div>
              <div className="text-sm text-gray-300">Setup Time</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="text-4xl font-bold text-green-400 mb-2">100%</div>
              <div className="text-sm text-gray-300">Cloud-Based</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-sm text-gray-300">Automation</div>
            </div>
            <div className="text-center p-6 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="text-4xl font-bold text-yellow-400 mb-2">Zero</div>
              <div className="text-sm text-gray-300">Coding Required</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-white rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob top-0 left-0"></div>
          <div className="absolute w-96 h-96 bg-white rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob animation-delay-2000 bottom-0 right-0"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Transform Your Business Today
          </h2>
          <p className="text-2xl mb-4 text-blue-100">
            Join 1000+ businesses that have automated their workflows
          </p>
          <p className="text-lg mb-12 text-blue-200 max-w-2xl mx-auto">
            Stop relying on memory and disconnected tools. Start building intelligent, automated workflows that scale with your business.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <a href="/login" className="group px-12 py-5 bg-white text-blue-600 text-xl font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3">
              Start Free Trial
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#contact" className="px-12 py-5 bg-transparent text-white text-xl font-semibold rounded-xl border-2 border-white hover:bg-white hover:text-blue-600 transition-all duration-200">
              Talk to Sales
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">14+</div>
              <div className="text-blue-200 text-sm">Years Experience</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-blue-200 text-sm">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-blue-200 text-sm">Visibility</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">50%</div>
              <div className="text-blue-200 text-sm">Time Saved</div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImage} alt="ProcessSutra Logo" className="h-8 w-auto" />
                <span className="text-xl font-bold text-white">ProcessSutra</span>
              </div>
              <p className="text-sm text-gray-400">
                Enterprise workflow automation built on 14 years of research and 1000+ business implementations.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-blue-400 transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-blue-400 transition">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">API Docs</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-blue-400 transition">About</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Contact</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Careers</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-400 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Terms</a></li>
                <li><a href="#" className="hover:text-blue-400 transition">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm mb-2">
              &copy; {new Date().getFullYear()} ProcessSutra by Muxro Technologies. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Developed by Jatin Gola – Business Operations Process & Technology Implementation Expert
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============= Helper Components =============

// StatCard Component
const StatCard = ({ number, label }: { number: string; label: string }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-all duration-200">
    <div className="text-4xl font-bold text-blue-600 mb-2">{number}</div>
    <div className="text-sm text-gray-600">{label}</div>
  </div>
);

// SolutionCard Component
const SolutionCard = ({ 
  emoji, 
  problem, 
  solution, 
  description, 
  gradient 
}: { 
  emoji: string; 
  problem: string; 
  solution: string; 
  description: string; 
  gradient: string;
}) => (
  <div className="group bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
    <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      <span className="text-3xl">{emoji}</span>
    </div>
    <div className="mb-4">
      <div className="text-sm text-gray-500 line-through mb-1">{problem}</div>
      <h3 className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{solution}</h3>
    </div>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

// FeatureCardNew Component
const FeatureCardNew = ({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
}) => {
  const colorMap: { [key: string]: string } = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      <div className={`w-16 h-16 bg-gradient-to-br ${colorMap[color]} rounded-xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

// PricingItem Component
const PricingItem = ({ 
  icon, 
  label, 
  detail 
}: { 
  icon: React.ReactNode; 
  label: string; 
  detail: string;
}) => (
  <div className="bg-white rounded-xl p-6 shadow-md">
    <div className="text-3xl text-blue-600 mb-3">{icon}</div>
    <div className="font-bold text-gray-900 mb-1">{label}</div>
    <div className="text-sm text-gray-600">{detail}</div>
  </div>
);

// Keep existing helper components for backward compatibility
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const ComponentCard = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
    <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);

const PurposeCard = ({ text }: { text: string }) => (
  <div className="bg-white rounded-lg p-5 border border-gray-200 flex items-start gap-3">
    <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
    <p className="text-gray-700">{text}</p>
  </div>
);

const WorkflowStep = ({ number, text }: { number: number; text: string }) => (
  <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-5 border border-gray-200">
    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
      {number}
    </div>
    <p className="text-gray-700 text-lg">{text}</p>
  </div>
);

const BenefitCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-white rounded-lg p-6 border border-gray-200">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingLogin;
