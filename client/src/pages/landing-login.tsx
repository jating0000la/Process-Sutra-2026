import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FaCogs, FaChartLine, FaRocket, FaCheckCircle, FaUsers, FaTasks,
  FaClipboardCheck, FaBrain, FaCode, FaLayerGroup, FaArrowRight,
  FaStar, FaIndustry, FaGlobe, FaRobot, FaMagic, FaNetworkWired,
  FaShieldAlt, FaBolt, FaEye, FaChevronDown, FaBars, FaTimes,
  FaQuoteLeft, FaBuilding, FaTruck, FaHospital, FaLaptopCode,
  FaGraduationCap, FaChevronUp, FaWhatsapp, FaPlay,
  FaCertificate, FaAward, FaScroll
} from "react-icons/fa";
import logoImage from "@/logo/ProcessSutra(icon).png";
import muxroLogo from "@/logo/muxro.png";

/* ─────────────────── Typewriter Hook ─────────────────── */

function useTypewriter(words: string[], typingSpeed = 100, deletingSpeed = 60, pauseTime = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currentWord.substring(0, text.length + 1));
        if (text.length + 1 === currentWord.length) {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        setText(currentWord.substring(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

/* ─────────────────── Intersection Observer Hook ─────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─────────────────── Animated Counter ─────────────────── */

function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─────────────────── AI Neural Network SVG ─────────────────── */

function NeuralNetworkSVG() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full opacity-20" aria-hidden="true">
      {/* Input layer */}
      {[60, 120, 180, 240].map((y, i) => (
        <circle key={`i${i}`} cx="50" cy={y} r="8" fill="#6366f1" className="animate-node-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      {/* Hidden layer 1 */}
      {[40, 100, 150, 200, 260].map((y, i) => (
        <circle key={`h1${i}`} cx="150" cy={y} r="8" fill="#8b5cf6" className="animate-node-pulse" style={{ animationDelay: `${i * 0.2 + 0.5}s` }} />
      ))}
      {/* Hidden layer 2 */}
      {[80, 150, 220].map((y, i) => (
        <circle key={`h2${i}`} cx="250" cy={y} r="8" fill="#a78bfa" className="animate-node-pulse" style={{ animationDelay: `${i * 0.4 + 1}s` }} />
      ))}
      {/* Output layer */}
      {[120, 180].map((y, i) => (
        <circle key={`o${i}`} cx="350" cy={y} r="8" fill="#06b6d4" className="animate-node-pulse" style={{ animationDelay: `${i * 0.5 + 1.5}s` }} />
      ))}
      {/* Connections */}
      {[60, 120, 180, 240].flatMap(y1 =>
        [40, 100, 150, 200, 260].map(y2 => (
          <line key={`c1-${y1}-${y2}`} x1="58" y1={y1} x2="142" y2={y2} stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
        ))
      )}
      {[40, 100, 150, 200, 260].flatMap(y1 =>
        [80, 150, 220].map(y2 => (
          <line key={`c2-${y1}-${y2}`} x1="158" y1={y1} x2="242" y2={y2} stroke="#8b5cf6" strokeWidth="0.5" opacity="0.3" />
        ))
      )}
      {[80, 150, 220].flatMap(y1 =>
        [120, 180].map(y2 => (
          <line key={`c3-${y1}-${y2}`} x1="258" y1={y1} x2="342" y2={y2} stroke="#a78bfa" strokeWidth="0.5" opacity="0.3" />
        ))
      )}
    </svg>
  );
}

/* ─────────────────── Workflow Animation SVG ─────────────────── */

function WorkflowAnimationSVG() {
  return (
    <svg viewBox="0 0 500 200" className="w-full max-w-lg mx-auto" aria-hidden="true">
      {/* Nodes */}
      <rect x="20" y="70" width="80" height="60" rx="12" fill="#6366f1" opacity="0.9" />
      <text x="60" y="105" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Trigger</text>

      <rect x="150" y="30" width="80" height="60" rx="12" fill="#8b5cf6" opacity="0.9" />
      <text x="190" y="62" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">AI Analyze</text>

      <rect x="150" y="110" width="80" height="60" rx="12" fill="#a78bfa" opacity="0.9" />
      <text x="190" y="145" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Validate</text>

      {/* Diamond (decision) */}
      <polygon points="330,60 370,100 330,140 290,100" fill="#06b6d4" opacity="0.9" />
      <text x="330" y="105" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Route</text>

      <rect x="410" y="70" width="70" height="60" rx="12" fill="#10b981" opacity="0.9" />
      <text x="445" y="105" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Complete</text>

      {/* Animated path connectors */}
      <path d="M100,100 L150,60" stroke="#6366f1" strokeWidth="2" fill="none" className="animate-path-draw" strokeDasharray="200" />
      <path d="M100,100 L150,140" stroke="#6366f1" strokeWidth="2" fill="none" className="animate-path-draw" style={{ animationDelay: '0.3s' }} />
      <path d="M230,60 L290,100" stroke="#8b5cf6" strokeWidth="2" fill="none" className="animate-path-draw" style={{ animationDelay: '0.6s' }} />
      <path d="M230,140 L290,100" stroke="#a78bfa" strokeWidth="2" fill="none" className="animate-path-draw" style={{ animationDelay: '0.6s' }} />
      <path d="M370,100 L410,100" stroke="#06b6d4" strokeWidth="2" fill="none" className="animate-path-draw" style={{ animationDelay: '0.9s' }} />

      {/* Pulse dots along paths */}
      <circle r="4" fill="#6366f1">
        <animateMotion dur="3s" repeatCount="indefinite" path="M100,100 L150,60 L230,60 L290,100 L370,100 L410,100" />
      </circle>
      <circle r="4" fill="#a78bfa">
        <animateMotion dur="3s" repeatCount="indefinite" begin="1.5s" path="M100,100 L150,140 L230,140 L290,100 L370,100 L410,100" />
      </circle>
    </svg>
  );
}

/* ─────────────────── Main Component ─────────────────── */

const LandingLogin: React.FC = () => {
  const heroSec = useInView(0.1);
  const aiSec = useInView(0.15);
  const featureSec = useInView(0.1);
  const dashSec = useInView(0.15);
  const workflowSec = useInView(0.15);
  const pricingSec = useInView(0.1);
  const storySec = useInView(0.1);
  const videoSec = useInView(0.1);
  const testimonialSec = useInView(0.1);
  const industrySec = useInView(0.1);
  const faqSec = useInView(0.1);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const rotatingText = useTypewriter(["Manufacturing", "IT Services", "Logistics", "Healthcare", "Education", "Finance", "Real Estate"], 80, 50, 1800);

  useEffect(() => {
    document.title = "ProcessSutra - AI-Powered Business Process Automation & Workflow Management Platform";

    const metaTags = [
      { name: "description", content: "Automate your business operations with ProcessSutra. AI-powered workflow management, real-time tracking, and productivity analytics. See your business health in 2 seconds. No coding required." },
      { name: "keywords", content: "AI business automation, workflow management, process automation, TAT tracking, AI workflow builder, productivity tools, efficiency measurement, workflow engine, business intelligence, task management, form builder, no-code automation" },
      { name: "author", content: "ProcessSutra" },
      { name: "robots", content: "index, follow" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: "#6366f1" },
      { property: "og:title", content: "ProcessSutra - AI-Powered Business Automation Platform" },
      { property: "og:description", content: "Transform your business with AI-powered automation. Monitor productivity, track efficiency, and see your business health in 2 seconds." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.processsutra.com" },
      { property: "og:image", content: logoImage },
      { property: "og:site_name", content: "ProcessSutra" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ProcessSutra - AI Business Automation Platform" },
      { name: "twitter:description", content: "Automate workflows with AI, track productivity, and scale your business without limits." },
      { name: "twitter:image", content: logoImage },
    ];

    metaTags.forEach(({ name, property, content }) => {
      const attr = property ? 'property' : 'name';
      const value = property || name || '';
      let meta = document.querySelector(`meta[${attr}="${value}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attr, value); document.head.appendChild(meta); }
      meta.setAttribute('content', content);
    });

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', window.location.href);

    const structuredData = {
      "@context": "https://schema.org", "@type": "SoftwareApplication",
      "name": "ProcessSutra", "applicationCategory": "BusinessApplication",
      "description": "AI-powered business process automation and workflow management platform.",
      "operatingSystem": "Web-based",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "description": "Free for All Now!" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "1000" },
      "featureList": ["AI Workflow Builder", "Visual Workflow Engine", "Real-time Task Tracking", "TAT Management", "Form Builder", "Analytics & Reporting", "API Integration"]
    };
    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) { scriptTag = document.createElement('script'); scriptTag.setAttribute('type', 'application/ld+json'); document.head.appendChild(scriptTag); }
    scriptTag.textContent = JSON.stringify(structuredData);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ━━━━━━━━━━ NAVBAR ━━━━━━━━━━ */}
      <header>
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 z-50" role="navigation">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="ProcessSutra Logo" className="h-9 w-auto" />
              <span className="text-xl font-bold text-gradient-blue">ProcessSutra</span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600" role="menubar">
              <a href="#ai" className="hover:text-indigo-600 transition-colors" role="menuitem">AI Engine</a>
              <a href="#features" className="hover:text-indigo-600 transition-colors" role="menuitem">Features</a>
              <a href="#solutions" className="hover:text-indigo-600 transition-colors" role="menuitem">Solutions</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors" role="menuitem">Pricing</a>
              <a href="#about" className="hover:text-indigo-600 transition-colors" role="menuitem">About</a>
            </div>
            <div className="flex items-center gap-3">
              <a href="/login" className="hidden sm:inline-block px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-indigo-300/40 transform hover:scale-105 transition-all duration-200">
                Get Started
              </a>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600 hover:text-indigo-600 transition-colors" aria-label="Toggle menu">
                {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
              </button>
            </div>
          </div>
          {/* Mobile drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in">
              <div className="px-6 py-4 space-y-3">
                {[{l:"AI Engine",h:"#ai"},{l:"Features",h:"#features"},{l:"Solutions",h:"#solutions"},{l:"Pricing",h:"#pricing"},{l:"About",h:"#about"}].map(n=>
                  <a key={n.h} href={n.h} onClick={()=>setMobileMenuOpen(false)} className="block text-gray-700 font-medium py-2 hover:text-indigo-600 transition-colors">{n.l}</a>
                )}
                <a href="/login" className="block w-full text-center px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-lg mt-2">Get Started Free</a>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main>

        {/* ━━━━━━━━━━ HERO — Dark, techy, AI-forward ━━━━━━━━━━ */}
        <section ref={heroSec.ref} className="relative pt-24 pb-20 md:pt-32 md:pb-28 bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 overflow-hidden" aria-labelledby="hero-heading">
          {/* Grid background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40" aria-hidden="true" />
          {/* Neural net background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <NeuralNetworkSVG />
          </div>
          {/* Glow orbs */}
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-blob" aria-hidden="true" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-violet-600 rounded-full blur-[120px] opacity-20 animate-blob animation-delay-2000" aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500 rounded-full blur-[160px] opacity-10 animate-blob animation-delay-4000" aria-hidden="true" />

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center max-w-4xl mx-auto">
              {/* AI badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold mb-4 backdrop-blur ${heroSec.inView ? 'animate-fade-in' : 'opacity-0'}`}>
                <FaRobot className="text-indigo-400" />
                <span>AI-Powered Workflow Automation</span>
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              </div>

              {/* Patent badge */}
              <div className={`inline-flex items-center gap-2 px-5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold mb-8 backdrop-blur animate-pulse-glow ${heroSec.inView ? 'animate-fade-in animation-delay-100' : 'opacity-0'}`}>
                <FaCertificate className="text-amber-400" />
                <span>Patented Technology</span>
                <FaShieldAlt className="text-amber-400 text-[10px]" />
              </div>

              <h1 id="hero-heading" className={`text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight ${heroSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                Your Business on
                <br />
                <span className="text-gradient-blue">Autopilot with AI</span>
              </h1>

              {/* Rotating industry text */}
              <div className={`text-lg md:text-xl text-gray-500 mb-3 h-8 ${heroSec.inView ? 'animate-fade-in-up animation-delay-150' : 'opacity-0'}`}>
                Perfect for <span className="text-indigo-400 font-semibold">{rotatingText}</span><span className="animate-pulse text-indigo-400">|</span>
              </div>

              <p className={`text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed ${heroSec.inView ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
                Design workflows visually. Let AI optimize routes, predict bottlenecks, and auto-assign tasks.
                See your entire business health in <span className="text-white font-semibold">2 seconds</span>.
              </p>

              {/* CTA */}
              <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center ${heroSec.inView ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
                <a href="/login" className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-lg font-bold rounded-xl hover:shadow-2xl hover:shadow-indigo-500/30 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 animate-pulse-glow">
                  Start Free — No Card Needed
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="#demo" className="px-8 py-4 glass text-gray-300 text-lg font-semibold rounded-xl hover:bg-white/10 transition-all duration-200">
                  Watch Demo
                </a>
              </div>

              {/* Trust */}
              <div className={`mt-12 flex flex-wrap justify-center items-center gap-6 text-xs text-gray-500 ${heroSec.inView ? 'animate-fade-in-up animation-delay-600' : 'opacity-0'}`}>
                <span className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500" /> Free 1-month trial</span>
                <span className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500" /> No credit card</span>
                <span className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500" /> Cancel anytime</span>
                <span className="flex items-center gap-1.5"><FaShieldAlt className="text-green-500" /> SOC 2 Ready</span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-bold"><FaCertificate className="text-amber-400" /> Patented</span>
              </div>
            </div>

            {/* Animated Workflow Diagram */}
            <div className={`mt-16 ${heroSec.inView ? 'animate-fade-in-up animation-delay-800' : 'opacity-0'}`}>
              <WorkflowAnimationSVG />
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { value: 1000, suffix: "+", label: "Businesses Analyzed" },
                { value: 14, suffix: "+", label: "Years of R&D" },
                { value: 50, suffix: "%", label: "Average Time Saved" },
                { value: 100, suffix: "%", label: "Process Visibility" },
              ].map((s, i) => (
                <div key={i} className={`glass rounded-xl p-5 text-center hover:bg-white/10 transition ${heroSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${0.8 + i * 0.15}s`, animationFillMode: 'both' }}>
                  <div className="text-3xl font-bold text-white"><AnimatedCounter end={s.value} suffix={s.suffix} /></div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-500 animate-bounce">
            <FaChevronDown />
          </div>
        </section>

        {/* ━━━━━━━━━━ TRUSTED BY / INDUSTRY STRIP ━━━━━━━━━━ */}
        <section className="py-12 px-6 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">Trusted Across Industries</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-60 hover:opacity-80 transition-opacity">
              {[
                { icon: <FaIndustry />, name: "Manufacturing" },
                { icon: <FaLaptopCode />, name: "IT Services" },
                { icon: <FaTruck />, name: "Logistics" },
                { icon: <FaHospital />, name: "Healthcare" },
                { icon: <FaGraduationCap />, name: "Education" },
                { icon: <FaBuilding />, name: "Real Estate" },
                { icon: <FaGlobe />, name: "Consulting" },
              ].map((ind, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-500">
                  <span className="text-lg">{ind.icon}</span>
                  <span className="text-sm font-medium">{ind.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ AI ENGINE SHOWCASE ━━━━━━━━━━ */}
        <section id="ai" ref={aiSec.ref} className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-30" aria-hidden="true" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold mb-3">
                <FaBrain /> ARTIFICIAL INTELLIGENCE ENGINE
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-bold mb-4">
                <FaCertificate /> PATENT-PROTECTED INNOVATION
              </div>
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${aiSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                AI That Understands <span className="text-gradient-blue">Your Business</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Our AI engine doesn't just automate — it learns your business patterns, predicts delays, and designs optimal workflows.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <AICard icon={<FaMagic />} title="AI Workflow Builder" description="Describe your process in plain English. AI generates the complete workflow with decision boxes, parallel steps, and merge conditions." gradient="from-indigo-500 to-violet-500" delay={0} inView={aiSec.inView} />
              <AICard icon={<FaBrain />} title="Smart Task Routing" description="AI analyzes workload, skills, and availability to auto-assign tasks. Predicts bottlenecks before they happen." gradient="from-violet-500 to-purple-500" delay={0.2} inView={aiSec.inView} />
              <AICard icon={<FaChartLine />} title="Predictive Analytics" description="ML-powered insights forecast TAT violations, capacity issues, and process inefficiencies with actionable recommendations." gradient="from-purple-500 to-pink-500" delay={0.4} inView={aiSec.inView} />
            </div>

            {/* AI Demo Preview — interactive feel */}
            <div className={`mt-16 bg-gradient-to-br from-gray-900 to-indigo-950 rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-800 ${aiSec.inView ? 'animate-fade-in-up animation-delay-600' : 'opacity-0'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-gray-500 text-sm font-mono">ProcessSutra AI Assistant</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live</span>
              </div>

              <div className="space-y-4">
                {/* User message */}
                <div className="flex gap-3 justify-end">
                  <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-4 max-w-sm">
                    <p className="text-indigo-200 text-sm">Build me an order management workflow for my e-commerce business</p>
                  </div>
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaUsers className="text-gray-300 text-xs" />
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaRobot className="text-white text-xs" />
                  </div>
                  <div className="glass rounded-xl p-4 max-w-xl">
                    <p className="text-gray-300 text-sm">I'll design an optimized workflow for your <span className="text-indigo-400 font-semibold">e-commerce order management</span>. Here's the AI-generated flow with parallel processing and smart decision routing:</p>
                  </div>
                </div>

                {/* Generated workflow */}
                <div className="flex gap-3 ml-12">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 max-w-lg w-full">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-indigo-300 text-xs font-mono">Generated Workflow:</p>
                      <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">7 steps &bull; 3 decision points</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span className="px-2 py-1 bg-indigo-500/20 rounded text-indigo-300">Order Entry</span>
                      <span className="text-indigo-500">&rarr;</span>
                      <span className="px-2 py-1 bg-violet-500/20 rounded text-violet-300">AI Validate</span>
                      <span className="text-indigo-500">&rarr;</span>
                      <span className="px-2 py-1 bg-cyan-500/20 rounded text-cyan-300">Auto-Route</span>
                      <span className="text-indigo-500">&rarr;</span>
                      <span className="px-2 py-1 bg-green-500/20 rounded text-green-300">Complete</span>
                    </div>
                    <div className="mt-3 flex gap-3 text-[10px] text-gray-500">
                      <span>Est. TAT: <span className="text-white">2.5 hrs</span></span>
                      <span>Auto-assign: <span className="text-green-400">ON</span></span>
                      <span>Parallel steps: <span className="text-cyan-400">2</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ FEATURES GRID ━━━━━━━━━━ */}
        <section id="features" ref={featureSec.ref} className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mb-4">
                <FaBolt /> ENTERPRISE-GRADE PLATFORM
              </div>
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${featureSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                Built for <span className="text-gradient-blue">Scale & Speed</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Everything you need to automate, optimize, and scale your business operations
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <FaCogs />, title: "Visual Workflow Engine", description: "Drag-and-drop builder with decision boxes, parallel steps, merge conditions, and conditional routing.", color: "indigo" },
                { icon: <FaRobot />, title: "AI Assistant", description: "Ask AI to build workflows, analyze performance, and generate reports from natural language queries.", color: "violet" },
                { icon: <FaTasks />, title: "Smart Task Routing", description: "Auto-assign tasks based on TAT, workload, and business rules. Zero manual intervention.", color: "green" },
                { icon: <FaClipboardCheck />, title: "Dynamic Form Builder", description: "Create rich forms with conditional fields, validations, file uploads, and auto-calculations.", color: "blue" },
                { icon: <FaChartLine />, title: "Real-Time Analytics", description: "Live dashboards with productivity, efficiency, TAT compliance, and team performance metrics.", color: "cyan" },
                { icon: <FaCode />, title: "Developer APIs", description: "RESTful APIs, webhooks, and integration layer. Connect with ERP, CRM, or custom systems.", color: "pink" },
                { icon: <FaEye />, title: "Process Visibility", description: "Visual flow tracker showing exactly where every task sits — completed, active, and upcoming.", color: "amber" },
                { icon: <FaNetworkWired />, title: "Multi-Step Workflows", description: "Complex workflows with parallel branches, decision nodes, sub-flows, and merge conditions.", color: "purple" },
                { icon: <FaShieldAlt />, title: "Role-Based Access", description: "Granular permissions. Admins, managers, and users see only what they need. Full audit trail.", color: "rose" },
              ].map((f, i) => (
                <FeatureCard key={i} {...f} index={i} inView={featureSec.inView} />
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ DASHBOARD PREVIEW ━━━━━━━━━━ */}
        <section ref={dashSec.ref} className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" aria-hidden="true" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold mb-4">
                ⚡ INSTANT BUSINESS INTELLIGENCE
              </div>
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${dashSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                Business Health in <span className="text-gradient-blue">2 Seconds</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Productivity and efficiency are the ultimate measuring tools. Get instant visibility into your business condition.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className={`${dashSec.inView ? 'animate-slide-in-left' : 'opacity-0'}`}>
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-2xl p-8 text-white">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <FaChartLine /> Live Dashboard
                  </h3>
                  <div className="space-y-4">
                    <DashMetric label="Productivity Score" value="92%" width="92%" color="bg-green-400" />
                    <DashMetric label="Efficiency Rating" value="88%" width="88%" color="bg-yellow-400" />
                    <DashMetric label="TAT Compliance" value="95%" width="95%" color="bg-cyan-400" />
                    <div className="grid grid-cols-3 gap-3 mt-6">
                      <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">127</div>
                        <div className="text-xs text-blue-200">Active Tasks</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">15</div>
                        <div className="text-xs text-blue-200">Delayed</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">8</div>
                        <div className="text-xs text-blue-200">Workflows</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`space-y-5 ${dashSec.inView ? 'animate-slide-in-right' : 'opacity-0'}`}>
                <InsightCard icon={<FaChartLine className="text-indigo-600" />} title="Productivity Tracking" description="Monitor tasks completed vs. pending, on-time delivery rates, and individual performance in real-time." border="border-indigo-500" />
                <InsightCard icon={<FaRocket className="text-green-600" />} title="Efficiency Measurement" description="Track TAT compliance, identify bottleneck locations, and surface optimization opportunities instantly." border="border-green-500" />
                <InsightCard icon={<FaBrain className="text-violet-600" />} title="AI-Powered Insights" description="Get actionable recommendations powered by machine learning. Know exactly where to focus for maximum impact." border="border-violet-500" />
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ SOLUTIONS (Problems → Solutions) ━━━━━━━━━━ */}
        <section id="solutions" ref={workflowSec.ref} className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${workflowSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                From Chaos to <span className="text-gradient-blue">Clarity</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Traditional operations are manual, invisible, and unpredictable. ProcessSutra transforms every layer.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <SolutionCard emoji="💔" problem="No Central System" solution="Unified AI Platform" description="Replace disconnected tools with one intelligent system. AI connects data, tasks, and workflows seamlessly." gradient="from-red-500 to-orange-500" inView={workflowSec.inView} delay={0} />
              <SolutionCard emoji="⏰" problem="Invisible Delays" solution="Real-Time Visibility" description="See exactly what's pending, who's working on what, and where bottlenecks occur — all in real-time with AI alerts." gradient="from-orange-500 to-yellow-500" inView={workflowSec.inView} delay={0.2} />
              <SolutionCard emoji="📊" problem="No Performance Data" solution="AI-Driven Analytics" description="Measure efficiency with precision. AI tracks TAT, productivity, and process performance like Six Sigma." gradient="from-indigo-500 to-violet-500" inView={workflowSec.inView} delay={0.4} />
            </div>

            {/* Example workflow */}
            <div className={`mt-16 bg-gradient-to-br from-gray-50 to-indigo-50 rounded-2xl p-8 md:p-12 border border-gray-200 ${workflowSec.inView ? 'animate-fade-in-up animation-delay-600' : 'opacity-0'}`}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Example: Order Management Workflow</h3>
              <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
                {["Order Entry", "AI Validate", "Stock Check", "Route Decision", "Dispatch", "Invoice", "Delivery Confirm"].map((step, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <FaArrowRight className="text-indigo-400 hidden sm:block" />}
                    <span className={`px-4 py-2 rounded-lg font-medium ${i === 3 ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' : 'bg-white shadow-sm border border-gray-200 text-gray-700'}`}>
                      {i === 1 && <FaRobot className="inline mr-1 text-violet-500" />}
                      {i === 3 && <FaNetworkWired className="inline mr-1 text-cyan-500" />}
                      {step}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Each step has a responsible user, a TAT deadline, a data-collection form, and automatic status tracking.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ VIDEO SECTION ━━━━━━━━━━ */}
        <section id="demo" ref={videoSec.ref} className="py-24 px-6 bg-gradient-to-br from-gray-950 via-indigo-950 to-gray-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" aria-hidden="true" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-15 animate-blob" aria-hidden="true" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[120px] opacity-15 animate-blob animation-delay-2000" aria-hidden="true" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold mb-4 backdrop-blur">
                🎥 WATCH & LEARN
              </div>
              <h2 className={`text-4xl md:text-5xl font-extrabold mb-4 ${videoSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                See ProcessSutra in Action
              </h2>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                Watch how AI transforms business process management
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <VideoCard icon={<FaBrain />} iconBg="bg-red-500" title="Problem Explained" subtitle="Understanding the business challenge" url="https://youtu.be/QRvI6a6FE9Y" thumb="https://img.youtube.com/vi/QRvI6a6FE9Y/hqdefault.jpg" borderHover="hover:border-red-400/50" />
              <VideoCard icon={<FaCogs />} iconBg="bg-green-500" title="Setup Guide" subtitle="Get started in minutes" url="https://youtu.be/iiqJIOZQt-8" thumb="https://img.youtube.com/vi/iiqJIOZQt-8/hqdefault.jpg" borderHover="hover:border-green-400/50" />
              <VideoCard icon={<FaPlay />} iconBg="bg-blue-500" title="How to Create a Flow" subtitle="Step-by-step workflow creation" url="https://youtu.be/peGACHJogbg" thumb="https://img.youtube.com/vi/peGACHJogbg/hqdefault.jpg" borderHover="hover:border-blue-400/50" />
            </div>

            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { val: "5 min", label: "Setup Time", color: "text-blue-400" },
                { val: "100%", label: "Cloud-Based", color: "text-green-400" },
                { val: "24/7", label: "AI Automation", color: "text-purple-400" },
                { val: "Zero", label: "Coding Required", color: "text-yellow-400" },
              ].map((s, i) => (
                <div key={i} className="glass rounded-xl p-5 text-center">
                  <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.val}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ PRICING ━━━━━━━━━━ */}
        <section id="pricing" ref={pricingSec.ref} className="py-24 px-6 bg-white">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mb-4">
              <FaStar className="text-yellow-500" /> TRANSPARENT PRICING
            </div>
            <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${pricingSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
              Pay Only for <span className="text-gradient-blue">What You Use</span>
            </h2>
            <p className="text-lg text-gray-600 mb-16">Scale seamlessly. No lock-in. No hidden fees.</p>

            <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl shadow-xl p-10 md:p-14 border border-indigo-100 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400 rounded-full blur-[80px] opacity-10" aria-hidden="true" />

              <div className="relative z-10">
                <div className="inline-block px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-xs font-bold mb-6">
                  USAGE-BASED MODEL
                </div>

                <div className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-100">
                  <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg p-5 mb-6">
                    <p className="font-mono text-xl md:text-2xl font-bold text-gray-900 mb-1">
                      Total = (Flows &times; Rate) + (Users &times; Rate) + (Forms &times; Rate)
                    </p>
                    <p className="text-sm text-gray-500 italic">Pay only for what you actually use</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <PricingItem icon={<FaCogs />} label="Flow Executions" detail="Per workflow run" />
                    <PricingItem icon={<FaUsers />} label="Active Users" detail="Per user/month" />
                    <PricingItem icon={<FaClipboardCheck />} label="Form Submissions" detail="Per submission" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                  <a href="/login" className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-lg font-bold rounded-xl hover:shadow-2xl hover:shadow-indigo-300/40 transform hover:scale-105 transition-all duration-200">
                    Start 1-Month Free Trial
                  </a>
                </div>

                <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500" /> No setup fees</span>
                  <span className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500" /> Cancel anytime</span>
                  <span className="flex items-center gap-1.5"><FaCheckCircle className="text-green-500" /> Volume discounts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ STORY / ABOUT ━━━━━━━━━━ */}
        <section id="about" ref={storySec.ref} className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${storySec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                The Story Behind <span className="text-gradient-blue">ProcessSutra</span>
              </h2>
              <p className="text-lg text-gray-600">14 years of research. 1000+ businesses. One mission.</p>
              <div className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 text-amber-800 rounded-full text-sm font-bold shadow-md">
                <FaCertificate className="text-amber-500" />
                Fully Patented Technology — Protected Innovation
                <FaShieldAlt className="text-amber-500" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div className={`space-y-6 ${storySec.inView ? 'animate-slide-in-left' : 'opacity-0'}`}>
                <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">The Problem We Discovered</h3>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#9679;</span> Employees execute workflows unconsciously — no timing awareness</li>
                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#9679;</span> Heavy reliance on memory and email leads to missed deadlines</li>
                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#9679;</span> Disconnected tools create data silos across departments</li>
                    <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">&#9679;</span> ERP systems focus on data entry, not process orchestration</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl shadow-lg p-8 text-white">
                  <h3 className="text-xl font-bold mb-3">Our AI-Powered Solution</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    We studied 1000+ businesses, mapped workflows and TAT patterns, then built an AI-powered platform that
                    designs, manages, and optimizes business processes automatically — from spreadsheets to cloud-native automation.
                  </p>
                </div>
              </div>

              <div className={`space-y-6 ${storySec.inView ? 'animate-slide-in-right' : 'opacity-0'}`}>
                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={muxroLogo} alt="Muxro Technologies" className="h-12 w-auto" />
                    <div>
                      <p className="text-xs text-gray-500">Developed by</p>
                      <p className="font-bold text-gray-900">Muxro Technologies</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold text-indigo-600">Jatin Gola</span> — Business Operations & Technology Expert
                    <br />
                    <span className="text-gray-500">14+ years of cross-industry implementation experience</span>
                  </p>
                </div>

                <div className="bg-indigo-50 border-l-4 border-indigo-600 rounded-r-xl p-6">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>The breakthrough:</strong> Organizations don't just need data entry systems. They need a platform that
                    <strong> orchestrates workflows with AI, auto-assigns tasks, and provides real-time visibility</strong> — while
                    accounting for shifts, holidays, and complex business calendars.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {["Cognitive Load Reduction", "Workflow Awareness", "Efficiency Science", "Human-AI Synergy"].map((b, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm text-center">
                      <p className="text-xs font-bold text-gray-900">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ TESTIMONIALS ━━━━━━━━━━ */}
        <section ref={testimonialSec.ref} className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold mb-4">
                <FaStar /> WHAT OUR USERS SAY
              </div>
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${testimonialSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                Trusted by <span className="text-gradient-blue">Business Leaders</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Hear from businesses that transformed their operations with ProcessSutra
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { quote: "ProcessSutra replaced 5 different tools we were using. Our team productivity jumped 40% in the first month. The AI workflow builder alone saved us weeks of manual design.", name: "Rajesh Kumar", role: "COO, TechManufact Pvt Ltd", industry: "Manufacturing", rating: 5 },
                { quote: "We went from tracking tasks on spreadsheets to a fully automated system. Now I can see my entire business health in seconds. The TAT tracking is a game-changer.", name: "Priya Sharma", role: "Founder, LogiSwift Solutions", industry: "Logistics", rating: 5 },
                { quote: "The AI assistant literally designs workflows by understanding our business. We describe the process in English and it creates the complete flow. Incredible technology.", name: "Amit Patel", role: "CTO, HealthPlus Clinics", industry: "Healthcare", rating: 5 },
              ].map((t, i) => (
                <div key={i} className={`bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-300 relative ${testimonialSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${i * 0.15}s`, animationFillMode: 'both' }}>
                  <FaQuoteLeft className="text-indigo-200 text-3xl mb-4" />
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">{t.quote}</p>
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <FaStar key={j} className="text-yellow-400 text-sm" />
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-semibold rounded-full">{t.industry}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof numbers */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
              {[
                { val: "4.8/5", label: "Average Rating" },
                { val: "95%", label: "Recommend to Others" },
                { val: "40%", label: "Avg Productivity Gain" },
                { val: "< 5 min", label: "Setup Time" },
              ].map((s, i) => (
                <div key={i} className="px-6">
                  <div className="text-2xl font-bold text-indigo-600">{s.val}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ INDUSTRY USE CASES ━━━━━━━━━━ */}
        <section id="industries" ref={industrySec.ref} className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold mb-4">
                <FaGlobe /> INDUSTRY SOLUTIONS
              </div>
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${industrySec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                Built for <span className="text-gradient-blue">Your Industry</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Pre-built workflow templates and AI models tailored for your specific business vertical
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <FaIndustry />, name: "Manufacturing", workflows: "Order-to-Delivery, Quality Control, Inventory Management", benefit: "Reduce production delays by 45%", gradient: "from-blue-500 to-blue-600" },
                { icon: <FaLaptopCode />, name: "IT Services", workflows: "Ticket Routing, Sprint Management, Client Onboarding", benefit: "Automate 80% of task assignments", gradient: "from-violet-500 to-violet-600" },
                { icon: <FaTruck />, name: "Logistics", workflows: "Dispatch Planning, Delivery Tracking, Return Processing", benefit: "Real-time fleet visibility", gradient: "from-green-500 to-green-600" },
                { icon: <FaHospital />, name: "Healthcare", workflows: "Patient Intake, Lab Routing, Appointment Follow-up", benefit: "Cut patient wait time by 60%", gradient: "from-red-500 to-red-600" },
                { icon: <FaGraduationCap />, name: "Education", workflows: "Admissions, Course Scheduling, Fee Management", benefit: "Paperless admin in 2 weeks", gradient: "from-amber-500 to-amber-600" },
                { icon: <FaBuilding />, name: "Real Estate", workflows: "Lead Tracking, Site Visits, Agreement Processing", benefit: "Close deals 35% faster", gradient: "from-cyan-500 to-cyan-600" },
              ].map((ind, i) => (
                <div key={i} className={`group bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1 ${industrySec.inView ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
                  <div className={`w-12 h-12 bg-gradient-to-br ${ind.gradient} rounded-lg flex items-center justify-center mb-4 text-white text-xl group-hover:scale-110 transition-transform`}>
                    {ind.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{ind.name}</h3>
                  <p className="text-gray-500 text-xs mb-3">{ind.workflows}</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <FaCheckCircle className="text-green-500" />
                    <span className="font-semibold text-green-700">{ind.benefit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ FAQ ━━━━━━━━━━ */}
        <section id="faq" ref={faqSec.ref} className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 ${faqSec.inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
                Frequently Asked <span className="text-gradient-blue">Questions</span>
              </h2>
              <p className="text-lg text-gray-600">Everything you need to know before getting started</p>
            </div>

            <div className="space-y-3">
              {[
                { q: "How long does it take to set up ProcessSutra?", a: "Most businesses are up and running in under 5 minutes. Simply sign up, describe your workflow to AI or use our drag-and-drop builder, and you're live. No coding or complex configuration needed." },
                { q: "Do I need technical knowledge to use the platform?", a: "Not at all. ProcessSutra is designed for business users. Our AI assistant can build workflows from plain English descriptions, and the visual builder uses simple drag-and-drop. Zero coding required." },
                { q: "How does the AI workflow builder work?", a: "Simply describe your business process in natural language — e.g., 'Create an order management workflow with approval steps.' The AI analyzes your description and generates a complete workflow with decision points, parallel branches, forms, and TAT rules." },
                { q: "What happens after the 1-month free trial?", a: "You transition to our usage-based pricing. Pay only for what you use — flow executions, active users, and form submissions. No lock-in contracts, no hidden fees, cancel anytime." },
                { q: "Can ProcessSutra integrate with my existing tools?", a: "Yes. We offer RESTful APIs, webhooks, and a growing integration library. Connect with ERP systems, CRM tools, email, Slack, Google Workspace, and more. Custom integrations are also supported." },
                { q: "Is my data secure?", a: "Absolutely. We use enterprise-grade encryption (AES-256), role-based access controls, and maintain SOC 2 readiness. Your data is never shared with third parties. Full audit trails are available for compliance." },
                { q: "How is ProcessSutra different from project management tools?", a: "Project management tools track tasks. ProcessSutra orchestrates entire business processes — with AI-powered routing, automatic task assignment, TAT tracking, form-based data collection at each step, and real-time productivity analytics. It's process automation, not just task management." },
              ].map((faq, i) => (
                <div key={i} className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 ${openFaq === i ? 'shadow-lg border-indigo-200' : 'shadow-sm hover:shadow-md'}`}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                    {openFaq === i ? <FaChevronUp className="text-indigo-500 flex-shrink-0" /> : <FaChevronDown className="text-gray-400 flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 animate-fade-in">
                      <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━ FINAL CTA ━━━━━━━━━━ */}
        <section className="py-24 px-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" aria-hidden="true" />
          <div className="absolute w-96 h-96 bg-white rounded-full mix-blend-soft-light blur-[120px] opacity-10 animate-blob top-0 left-0" aria-hidden="true" />
          <div className="absolute w-96 h-96 bg-white rounded-full mix-blend-soft-light blur-[120px] opacity-10 animate-blob animation-delay-2000 bottom-0 right-0" aria-hidden="true" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              Ready to Put Your Business
              <br />on AI Autopilot?
            </h2>
            <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto">
              Join businesses that have already automated their workflows with AI. Start free, scale unlimited.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <a href="/login" className="group px-12 py-5 bg-white text-indigo-600 text-xl font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3">
                Start Free Trial
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#contact" className="px-12 py-5 bg-transparent text-white text-xl font-semibold rounded-xl border-2 border-white/40 hover:bg-white hover:text-indigo-600 transition-all duration-200">
                Talk to Sales
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { val: "14+", label: "Years R&D" },
                { val: "1000+", label: "Businesses" },
                { val: "AI", label: "Powered Engine" },
                { val: "50%", label: "Time Saved" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold mb-1">{s.val}</div>
                  <div className="text-indigo-200 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ━━━━━━━━━━ FOOTER ━━━━━━━━━━ */}
      <footer className="py-12 px-6 bg-gray-950 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logoImage} alt="ProcessSutra" className="h-8 w-auto" />
                <span className="text-lg font-bold text-white">ProcessSutra</span>
              </div>
              <p className="text-sm text-gray-500">
                AI-powered workflow automation built on 14 years of research and 1000+ business implementations.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-400">
                <FaCertificate /> Patented Technology
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#ai" className="hover:text-indigo-400 transition">AI Engine</a></li>
                <li><a href="#features" className="hover:text-indigo-400 transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-indigo-400 transition">Pricing</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">API Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-indigo-400 transition">About</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">Contact</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">Careers</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">Terms</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm mb-1">&copy; {new Date().getFullYear()} ProcessSutra by Muxro Technologies. All rights reserved.</p>
            <p className="text-xs text-gray-600">Developed by Jatin Gola – Business Operations Process & Technology Implementation Expert</p>
            <p className="text-xs text-amber-500 mt-2 flex items-center justify-center gap-1.5 font-semibold"><FaCertificate /> ProcessSutra is a fully patented technology. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ━━━━━━━━━━ STICKY MOBILE CTA ━━━━━━━━━━ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <a href="/login" className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-lg text-center hover:shadow-lg transition-all">
          Start Free Trial
        </a>
        <a href="https://wa.me/919876543210?text=Hi%2C%20I%27m%20interested%20in%20ProcessSutra" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white hover:bg-green-600 transition-colors flex-shrink-0" aria-label="Chat on WhatsApp">
          <FaWhatsapp size={20} />
        </a>
      </div>
      {/* Spacer for sticky bar on mobile */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   Helper Components
   ═════════════════════════════════════════════════════════════ */

/* AI Feature Card */
function AICard({ icon, title, description, gradient, delay, inView }: {
  icon: React.ReactNode; title: string; description: string; gradient: string; delay: number; inView: boolean;
}) {
  return (
    <div className={`group relative bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${inView ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}>
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-5 text-white text-2xl group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* Feature Card */
function FeatureCard({ icon, title, description, color, index, inView }: {
  icon: React.ReactNode; title: string; description: string; color: string; index: number; inView: boolean;
}) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
    cyan: "from-cyan-500 to-cyan-600",
    pink: "from-pink-500 to-pink-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
    rose: "from-rose-500 to-rose-600",
  };

  return (
    <div className={`group bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 hover:-translate-y-1 ${inView ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'both' }}>
      <div className={`w-12 h-12 bg-gradient-to-br ${colorMap[color]} rounded-lg flex items-center justify-center mb-4 text-white text-xl group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* Dashboard Metric */
function DashMetric({ label, value, width, color }: { label: string; value: string; width: string; color: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-blue-100 text-sm">{label}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-1000`} style={{ width }} />
      </div>
    </div>
  );
}

/* Insight Card */
function InsightCard({ icon, title, description, border }: {
  icon: React.ReactNode; title: string; description: string; border: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${border} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">{icon}</div>
        <div>
          <h4 className="text-lg font-bold text-gray-900 mb-1">{title}</h4>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* Solution Card */
function SolutionCard({ emoji, problem, solution, description, gradient, inView, delay }: {
  emoji: string; problem: string; solution: string; description: string; gradient: string; inView: boolean; delay: number;
}) {
  return (
    <div className={`group bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${inView ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}>
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-5 text-2xl group-hover:scale-110 transition-transform`}>
        {emoji}
      </div>
      <div className="mb-3">
        <div className="text-xs text-gray-400 line-through mb-1">{problem}</div>
        <h3 className={`text-xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{solution}</h3>
      </div>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* Video Card */
function VideoCard({ icon, iconBg, title, subtitle, url, thumb, borderHover }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle: string; url: string; thumb: string; borderHover: string;
}) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`group glass rounded-2xl p-6 border border-white/10 ${borderHover} transition-all duration-300 hover:scale-[1.02] block`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center text-white text-lg`}>{icon}</div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden shadow-xl">
        <img src={thumb} alt={title} className="w-full object-cover rounded-lg" loading="lazy" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all duration-300 rounded-lg">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <FaPlay className="text-white text-xl ml-1" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-300 group-hover:text-white transition-colors">
        <FaPlay className="text-xs" /> Watch on YouTube
      </div>
    </a>
  );
}

/* Pricing Item */
function PricingItem({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 text-center border border-gray-100">
      <div className="text-2xl text-indigo-600 mb-2">{icon}</div>
      <div className="font-bold text-gray-900 text-sm mb-1">{label}</div>
      <div className="text-xs text-gray-500">{detail}</div>
    </div>
  );
}

export default LandingLogin;
