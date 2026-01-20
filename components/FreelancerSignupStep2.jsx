"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Plus, Briefcase, X } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";

const SKILL_SUGGESTIONS_BY_CATEGORY = {
  frontend: [
    "HTML",
    "CSS",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Vue.js",
    "Nuxt.js",
    "Svelte",
    "SvelteKit",
    "Angular",
    "SolidJS",
    "Astro",
    "Remix",
    "Gatsby",
    "Vite",
    "Webpack",
    "Rollup",
    "Parcel",
    "Babel",
    "ESLint",
    "Prettier",
    "Jest",
    "Vitest",
    "React Testing Library",
    "Cypress",
    "Playwright",
    "Storybook",
    "Tailwind CSS",
    "Bootstrap",
    "Material UI",
    "Chakra UI",
    "Ant Design",
    "Sass",
    "Less",
    "PostCSS",
    "CSS Modules",
    "Styled Components",
    "Emotion",
    "Web Components",
    "Lit",
    "Stencil",
    "D3.js",
    "Three.js",
    "Canvas API",
    "WebGL",
    "SVG",
    "PWA",
    "Service Workers",
    "IndexedDB",
    "WebSockets",
    "GraphQL Client",
    "Apollo Client",
    "Relay",
    "React Query",
    "SWR",
    "Redux",
    "Redux Toolkit",
    "Zustand",
    "Recoil",
    "MobX",
    "RxJS",
    "Accessibility",
    "Responsive Design",
    "Cross Browser Testing",
    "Performance Optimization",
    "Lighthouse",
    "Core Web Vitals",
    "Web Animations API",
    "GSAP",
    "Framer Motion",
    "Formik",
    "React Hook Form",
    "Zod",
    "Yup",
    "i18next",
    "Localization",
    "Design Systems",
    "Design Tokens",
    "Micro Frontends",
    "Module Federation",
    "SSR",
    "CSR",
    "SSG",
    "ISR",
    "SPA Architecture",
    "REST Integration",
    "OAuth",
    "JWT",
    "Auth0",
    "Firebase Auth",
    "Stripe Elements",
    "Mapbox GL JS",
    "Leaflet",
    "Socket.IO Client",
    "Progressive Enhancement",
    "Feature Flags",
    "A/B Testing",
    "Sentry",
    "HTML5 APIs",
    "CSS Grid",
    "Flexbox",
    "BEM",
    "Atomic Design",
    "Accessibility Audits",
    "Performance Budgets",
    "Lazy Loading",
    "Code Splitting",
    "Tree Shaking",
    "Bundler Optimization",
  ],
  backend: [
    "Node.js",
    "Express.js",
    "NestJS",
    "Koa.js",
    "Fastify",
    "Hapi.js",
    "Django",
    "Flask",
    "FastAPI",
    "Celery",
    "Ruby on Rails",
    "Sinatra",
    "Spring Boot",
    "Spring Framework",
    ".NET Core",
    "ASP.NET",
    "Laravel",
    "Symfony",
    "CodeIgniter",
    "CakePHP",
    "Phoenix",
    "Elixir",
    "Go",
    "Gin",
    "Fiber",
    "Echo",
    "Rust",
    "Actix",
    "Rocket",
    "Java",
    "Kotlin",
    "Scala",
    "C#",
    "PHP",
    "Python",
    "GraphQL API",
    "REST API",
    "gRPC",
    "SOAP",
    "WebSockets Server",
    "PostgreSQL",
    "MySQL",
    "MariaDB",
    "SQLite",
    "MongoDB",
    "DynamoDB",
    "Cassandra",
    "CouchDB",
    "Redis",
    "Memcached",
    "Elasticsearch",
    "OpenSearch",
    "Solr",
    "Neo4j",
    "InfluxDB",
    "TimescaleDB",
    "Snowflake",
    "BigQuery",
    "SQL Server",
    "Oracle Database",
    "Prisma",
    "TypeORM",
    "Sequelize",
    "Mongoose",
    "Hibernate",
    "Entity Framework",
    "SQLAlchemy",
    "Knex.js",
    "Objection.js",
    "API Gateway",
    "NGINX",
    "Apache",
    "Load Balancing",
    "Rate Limiting",
    "Authentication",
    "Authorization",
    "OAuth 2.0",
    "OpenID Connect",
    "JWT",
    "Session Management",
    "RBAC",
    "ABAC",
    "Multi-tenancy",
    "Microservices",
    "Service Mesh",
    "Event Driven Architecture",
    "Message Queues",
    "RabbitMQ",
    "Kafka",
    "SQS",
    "SNS",
    "Pub/Sub",
    "Background Jobs",
    "Cron Jobs",
    "Webhooks",
    "Observability",
    "Logging",
    "Metrics",
    "Tracing",
    "OpenTelemetry",
    "Caching Strategies",
    "Database Indexing",
    "Query Optimization",
    "Data Migration",
    "Schema Design",
    "Data Validation",
    "API Versioning",
    "Feature Flags",
    "Secrets Management",
  ],
  ai: [
    "Machine Learning",
    "Deep Learning",
    "Neural Networks",
    "Convolutional Neural Networks",
    "Recurrent Neural Networks",
    "Transformers",
    "Natural Language Processing",
    "Computer Vision",
    "Speech Recognition",
    "Text to Speech",
    "Prompt Engineering",
    "LLM Fine-tuning",
    "Reinforcement Learning",
    "Supervised Learning",
    "Unsupervised Learning",
    "Semi-supervised Learning",
    "Self-supervised Learning",
    "Transfer Learning",
    "Few-shot Learning",
    "Zero-shot Learning",
    "Feature Engineering",
    "Model Evaluation",
    "Hyperparameter Tuning",
    "Cross-validation",
    "Data Labeling",
    "Data Augmentation",
    "Model Interpretability",
    "Explainable AI",
    "Bias Mitigation",
    "Fairness Metrics",
    "MLOps",
    "Model Deployment",
    "Model Monitoring",
    "MLflow",
    "DVC",
    "Weights and Biases",
    "TensorFlow",
    "Keras",
    "PyTorch",
    "JAX",
    "Hugging Face Transformers",
    "Sentence Transformers",
    "spaCy",
    "NLTK",
    "Gensim",
    "Scikit-learn",
    "XGBoost",
    "LightGBM",
    "CatBoost",
    "OpenCV",
    "MediaPipe",
    "YOLO",
    "Detectron2",
    "Segment Anything",
    "GANs",
    "Variational Autoencoders",
    "Diffusion Models",
    "Stable Diffusion",
    "Image Classification",
    "Object Detection",
    "Image Segmentation",
    "Pose Estimation",
    "OCR",
    "Information Retrieval",
    "Semantic Search",
    "Embeddings",
    "Vector Databases",
    "FAISS",
    "Pinecone",
    "Weaviate",
    "Milvus",
    "RAG",
    "Retrieval Augmented Generation",
    "Knowledge Graphs",
    "Graph Neural Networks",
    "Time Series Forecasting",
    "Anomaly Detection",
    "Recommender Systems",
    "Collaborative Filtering",
    "Content Based Filtering",
    "A/B Testing for Models",
    "Model Compression",
    "Quantization",
    "Pruning",
    "Distillation",
    "Edge AI",
    "On-device Inference",
    "CUDA",
    "ONNX",
    "TensorRT",
    "ML Pipelines",
    "Data Pipelines",
    "Feature Stores",
    "Data Drift Detection",
    "LLM Evaluation",
    "Prompt Testing",
    "RLHF",
    "Synthetic Data Generation",
    "AutoML",
    "Bayesian Optimization",
    "Experiment Tracking",
    "Model Registry",
    "Active Learning",
    "Named Entity Recognition",
    "Text Classification",
    "Sentiment Analysis",
    "Topic Modeling",
    "Speech Synthesis",
    "Speaker Diarization",
    "Image Captioning",
    "Multimodal Models",
    "LLM Agents",
  ],
  devops: [
    "Linux",
    "Bash Scripting",
    "Git",
    "GitHub",
    "GitLab",
    "Bitbucket",
    "CI/CD",
    "Jenkins",
    "GitHub Actions",
    "GitLab CI",
    "CircleCI",
    "Travis CI",
    "Argo CD",
    "Tekton",
    "Spinnaker",
    "Docker",
    "Docker Compose",
    "Kubernetes",
    "Helm",
    "Kustomize",
    "Terraform",
    "Pulumi",
    "CloudFormation",
    "Ansible",
    "Chef",
    "Puppet",
    "SaltStack",
    "Packer",
    "Vagrant",
    "AWS",
    "Azure",
    "GCP",
    "EC2",
    "S3",
    "RDS",
    "Lambda",
    "ECS",
    "EKS",
    "CloudWatch",
    "IAM",
    "VPC",
    "Route 53",
    "ELB",
    "CloudFront",
    "DynamoDB",
    "Azure DevOps",
    "Azure Functions",
    "Azure Kubernetes Service",
    "Azure Monitor",
    "GKE",
    "Cloud Run",
    "Cloud Storage",
    "Cloud Build",
    "Cloud Pub/Sub",
    "Prometheus",
    "Grafana",
    "Loki",
    "ELK Stack",
    "OpenSearch",
    "Datadog",
    "New Relic",
    "Sentry",
    "Jaeger",
    "Zipkin",
    "OpenTelemetry",
    "NGINX",
    "Apache",
    "HAProxy",
    "Traefik",
    "Consul",
    "Vault",
    "Secrets Management",
    "Infrastructure as Code",
    "Configuration Management",
    "Blue Green Deployments",
    "Canary Releases",
    "Rolling Deployments",
    "Auto Scaling",
    "Load Balancing",
    "Disaster Recovery",
    "Backup Automation",
    "High Availability",
    "Container Security",
    "Image Scanning",
    "Policy as Code",
    "Kubernetes RBAC",
    "Network Policies",
    "Service Mesh",
    "Istio",
    "Linkerd",
    "Monitoring",
    "Logging",
    "Incident Response",
    "SRE Practices",
    "Cost Optimization",
    "FinOps",
    "SSL/TLS",
    "Certificate Management",
    "DNS Management",
    "CDN",
    "Nginx Ingress",
    "Kubernetes Operators",
    "Syslog",
    "Log Rotation",
    "Systemd",
    "Cron",
    "Linux Networking",
    "Firewall Configuration",
    "WAF",
    "Rate Limiting",
    "API Gateway",
    "Observability",
  ],
  sales: [
    "Lead Generation",
    "Prospecting",
    "Cold Calling",
    "Cold Email",
    "Sales Outreach",
    "Sales Development",
    "Qualifying Leads",
    "BANT Qualification",
    "MEDDIC",
    "SPIN Selling",
    "Challenger Sales",
    "Consultative Selling",
    "Solution Selling",
    "Relationship Building",
    "Account Management",
    "Key Account Management",
    "Territory Management",
    "Pipeline Management",
    "Forecasting",
    "Sales Analytics",
    "CRM Management",
    "Salesforce",
    "HubSpot CRM",
    "Pipedrive",
    "Zoho CRM",
    "Microsoft Dynamics",
    "Sales Cadence",
    "Objection Handling",
    "Negotiation",
    "Closing Techniques",
    "Contract Negotiation",
    "Proposal Writing",
    "RFP Response",
    "Pricing Strategy",
    "Value Proposition",
    "Sales Presentations",
    "Product Demos",
    "Discovery Calls",
    "Needs Assessment",
    "Upselling",
    "Cross-selling",
    "Customer Retention",
    "Churn Reduction",
    "Renewal Management",
    "Account Expansion",
    "Referral Programs",
    "Partner Sales",
    "Channel Sales",
    "Reseller Management",
    "Distributor Management",
    "Enterprise Sales",
    "SMB Sales",
    "B2B Sales",
    "B2C Sales",
    "SaaS Sales",
    "Inside Sales",
    "Outside Sales",
    "Field Sales",
    "Strategic Accounts",
    "Lead Nurturing",
    "Sales Enablement",
    "Sales Playbooks",
    "Competitive Analysis",
    "Market Research",
    "Sales Operations",
    "Quote Management",
    "CPQ",
    "Sales Compensation",
    "Commission Planning",
    "Territory Planning",
    "Activity Tracking",
    "Call Recording",
    "Sales Coaching",
    "Sales Training",
    "Social Selling",
    "LinkedIn Sales Navigator",
    "Prospect List Building",
    "Data Enrichment",
    "Lead Scoring",
    "Pipeline Hygiene",
    "Deal Desk",
    "Stakeholder Management",
    "Multi-threading",
    "Decision Maker Mapping",
    "ROI Modeling",
    "Business Case Development",
    "Contract Lifecycle Management",
    "Legal Coordination",
    "Forecast Accuracy",
    "Quarterly Business Reviews",
    "Revenue Growth",
    "Customer Success Handoff",
    "Account Planning",
    "Win Loss Analysis",
    "Sales Metrics",
    "Sales KPIs",
    "Pipeline Velocity",
    "Sales Funnel Optimization",
    "Price Objections",
    "Discovery Questions",
    "Email Sequencing",
    "Call Scripts",
    "Demo Storytelling",
    "Trial Management",
    "Partner Enablement",
    "Territory Coverage",
    "Sales Reporting",
    "Quote to Cash",
    "Account Segmentation",
    "Competitive Positioning",
  ],
  marketing: [
    "SEO",
    "On-page SEO",
    "Technical SEO",
    "Off-page SEO",
    "Keyword Research",
    "Content Marketing",
    "Blog Writing",
    "Copywriting",
    "Social Media Marketing",
    "Social Media Strategy",
    "Community Management",
    "Influencer Marketing",
    "Email Marketing",
    "Marketing Automation",
    "Drip Campaigns",
    "Lead Magnet Creation",
    "Landing Page Optimization",
    "Conversion Rate Optimization",
    "A/B Testing",
    "Google Analytics",
    "GA4",
    "Google Tag Manager",
    "Search Engine Marketing",
    "PPC",
    "Google Ads",
    "Bing Ads",
    "Meta Ads",
    "LinkedIn Ads",
    "TikTok Ads",
    "YouTube Ads",
    "Display Advertising",
    "Programmatic Advertising",
    "Retargeting",
    "Paid Social",
    "Organic Social",
    "Brand Strategy",
    "Brand Positioning",
    "Go-to-Market Strategy",
    "Product Marketing",
    "Market Research",
    "Customer Segmentation",
    "Persona Development",
    "Competitive Analysis",
    "Pricing Positioning",
    "Marketing Analytics",
    "Attribution Modeling",
    "Marketing Mix Modeling",
    "Campaign Management",
    "Campaign Reporting",
    "Event Marketing",
    "Webinar Marketing",
    "PR Outreach",
    "Media Relations",
    "Press Release Writing",
    "Thought Leadership",
    "Newsletter Strategy",
    "Lifecycle Marketing",
    "CRM Marketing",
    "Marketing Operations",
    "Content Strategy",
    "Content Calendar",
    "Editorial Planning",
    "UX Writing",
    "Video Marketing",
    "Podcast Marketing",
    "App Store Optimization",
    "ASO",
    "Local SEO",
    "Reputation Management",
    "Review Generation",
    "Affiliate Marketing",
    "Partnership Marketing",
    "Co-marketing",
    "Referral Marketing",
    "Growth Marketing",
    "Viral Marketing",
    "Demand Generation",
    "Lead Generation",
    "Lead Nurturing",
    "Lead Scoring",
    "Funnel Optimization",
    "Customer Journey Mapping",
    "Customer Retention",
    "Churn Reduction",
    "Promotions Strategy",
    "Pricing Promotions",
    "Survey Design",
    "NPS Programs",
    "Conversion Tracking",
    "UTM Tracking",
    "Email Deliverability",
    "Marketing Compliance",
    "GDPR Compliance",
    "Brand Guidelines",
    "Visual Identity",
    "Creative Briefs",
    "Marketing Project Management",
    "Marketing KPIs",
    "ROI Reporting",
    "Budget Planning",
    "Influencer Outreach",
    "Hashtag Strategy",
    "Social Listening",
    "Community Growth",
    "Mobile Marketing",
    "SMS Marketing",
    "Push Notifications",
    "Marketplace Marketing",
    "B2B Marketing",
    "B2C Marketing",
  ],
  design: [
    "Graphic Design",
    "Logo Design",
    "Brand Identity",
    "Visual Identity",
    "Typography",
    "Layout Design",
    "Print Design",
    "Packaging Design",
    "Poster Design",
    "Flyer Design",
    "Brochure Design",
    "Business Cards",
    "Magazine Layout",
    "Book Cover Design",
    "Editorial Design",
    "Infographic Design",
    "Icon Design",
    "Illustration",
    "Digital Illustration",
    "Vector Art",
    "Raster Editing",
    "Photo Retouching",
    "Photo Manipulation",
    "Color Theory",
    "Color Grading",
    "Art Direction",
    "Creative Direction",
    "Brand Guidelines",
    "Style Guides",
    "Mood Boards",
    "Concept Art",
    "Storyboarding",
    "Motion Graphics",
    "Video Editing",
    "Video Post-production",
    "Video Color Correction",
    "Video Color Grading",
    "Sound Design",
    "Audio Editing",
    "Voiceover Editing",
    "Subtitle Creation",
    "Closed Captions",
    "Kinetic Typography",
    "2D Animation",
    "3D Animation",
    "3D Modeling",
    "3D Rendering",
    "Product Mockups",
    "Presentation Design",
    "Slide Deck Design",
    "Canva",
    "Adobe Photoshop",
    "Adobe Illustrator",
    "Adobe InDesign",
    "Adobe After Effects",
    "Adobe Premiere Pro",
    "Adobe Lightroom",
    "Adobe XD",
    "Figma",
    "CorelDRAW",
    "Affinity Designer",
    "Affinity Photo",
    "Affinity Publisher",
    "Sketch",
    "Procreate",
    "Blender",
    "Cinema 4D",
    "Maya",
    "3ds Max",
    "DaVinci Resolve",
    "Final Cut Pro",
    "Avid Media Composer",
    "HitFilm",
    "CapCut",
    "Audition",
    "OBS Studio",
    "Prepress",
    "Printing Production",
    "Screen Printing",
    "Brand Collateral",
    "Social Media Graphics",
    "Banner Design",
    "Ad Creative",
    "Motion Design",
    "Title Sequences",
    "Lower Thirds",
    "Video Transitions",
    "Green Screen Keying",
    "Compositing",
    "VFX",
    "Rigging",
    "Texturing",
    "UV Mapping",
    "Layout Grids",
    "Color Palette Design",
    "Image Compression",
    "Asset Management",
    "Photo Editing",
    "Vector Tracing",
    "Poster Mockups",
    "Photo Restoration",
    "Album Cover Design",
    "Merchandise Design",
    "Environmental Graphics",
    "Signage Design",
    "Exhibition Design",
    "Storyboard Animatics",
    "Brand Illustration",
    "Social Media Templates",
    "Print Proofing",
    "Rasterization",
    "Vectorization",
  ],
};

const SKILL_SUGGESTIONS = Array.from(
  new Set(Object.values(SKILL_SUGGESTIONS_BY_CATEGORY).flat())
);

const MONTHS = [
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 },
];

function formatMonthValue(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthValue(value) {
  if (!value || typeof value !== "string") return null;
  const [y, m] = value.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month) return null;
  return { year, month };
}

function MonthPicker({
  name,
  value,
  onChange,
  min,
  max,
  placeholder = "Select month",
  disabled = false,
}) {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const parsedMin = parseMonthValue(min);
  const parsedMax = parseMonthValue(max);
  const currentYear = new Date().getFullYear();
  const minYear = parsedMin ? parsedMin.year : currentYear - 50;
  const maxYear = parsedMax ? parsedMax.year : currentYear + 10;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const parsedValue = parseMonthValue(value);
    if (parsedValue?.year) {
      setViewYear(parsedValue.year);
      return;
    }
    if (parsedMin?.year) {
      setViewYear(parsedMin.year);
      return;
    }
    if (parsedMax?.year) {
      setViewYear(parsedMax.year);
      return;
    }
    setViewYear(currentYear);
  }, [value, min, max, currentYear, parsedMin?.year, parsedMax?.year]);

  const canPrev = viewYear > minYear;
  const canNext = viewYear < maxYear;

  function isDisabled(year, month) {
    const candidate = formatMonthValue(year, month);
    if (min && candidate < min) return true;
    if (max && candidate > max) return true;
    return false;
  }

  function handleSelect(month) {
    if (disabled) return;
    const next = formatMonthValue(viewYear, month);
    if (isDisabled(viewYear, month)) return;
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value || ""} />
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full border border-gray-200 rounded-[14px] px-4 py-3 text-sm flex items-center gap-3 transition-colors ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:border-gray-300"
          }`}
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className={value ? "text-gray-700" : "text-gray-400"}>
          {value || placeholder}
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-100 bg-white shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => canPrev && setViewYear((y) => y - 1)}
              disabled={!canPrev}
              className={`rounded-full p-2 transition-colors ${canPrev ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"
                }`}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-gray-700">{viewYear}</span>
            <button
              type="button"
              onClick={() => canNext && setViewYear((y) => y + 1)}
              disabled={!canNext}
              className={`rounded-full p-2 transition-colors ${canNext ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"
                }`}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => {
              const monthValue = formatMonthValue(viewYear, month.value);
              const isSelected = value === monthValue;
              const disabledMonth = isDisabled(viewYear, month.value);
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => handleSelect(month.value)}
                  disabled={disabledMonth}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${disabledMonth
                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                    : isSelected
                      ? "bg-[#10b8a6] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FreelancerSignupStep2({ onBack, onNext, submitting = false }) {
  const todayMonth = new Date().toISOString().slice(0, 7);

  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [projects, setProjects] = useState([0]);
  const [presentProjects, setPresentProjects] = useState({});
  const [startDates, setStartDates] = useState({});
  const [endDates, setEndDates] = useState({});
  const [catOptions, setCatOptions] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("category_id, name, slug, parent_id, sort_order")
        .order("parent_id", { ascending: true, nullsFirst: true })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error || !data) {
        console.error("categories load error:", error?.message);
        if (mounted) setCatOptions([]);
        return;
      }

      const rows = data.map((c) => ({
        id: Number(c.category_id),
        name: c.name,
        slug: c.slug,
        parentId: c.parent_id === null ? null : Number(c.parent_id),
      }));

      const blocked = new Set(["tech"]);
      const filteredRows = rows.filter((c) => {
        const name = String(c.name || "").toLowerCase();
        const slug = String(c.slug || "").toLowerCase();
        return !(blocked.has(name) || blocked.has(slug));
      });
      const parents = filteredRows.filter((c) => c.parentId === null);
      const childMap = new Map(parents.map((p) => [p.id, []]));
      filteredRows.forEach((c) => {
        if (c.parentId !== null && childMap.has(c.parentId)) {
          childMap.get(c.parentId).push(c);
        }
      });

      const options = [];
      for (const p of parents) {
        const kids = childMap.get(p.id) || [];
        if (kids.length === 0) {
          options.push({ id: p.id, label: p.name });
        } else {
          kids.forEach((k) => options.push({ id: k.id, label: `${p.name} — ${k.name}` }));
        }
      }

      if (mounted) setCatOptions(options);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function handleAddSkill(name) {
    const parts = name
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setSkills((prev) => {
      const next = [...prev];
      parts.forEach((part) => {
        if (!next.includes(part)) next.push(part);
      });
      return next;
    });
    setSkillInput("");
  }

  function handleRemoveSkill(name) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  const filteredSuggestions = SKILL_SUGGESTIONS
    .filter(
      (s) =>
        skillInput &&
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skills.includes(s)
    )
    .slice(0, 6);

  function handleAddProject() {
    setProjects((prev) => {
      const newId = prev.length ? Math.max(...prev) + 1 : 0;
      return [...prev, newId];
    });
  }

  function handleDeleteProject(id) {
    setProjects((prev) => prev.filter((p) => p !== id));
    setPresentProjects((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setStartDates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEndDates((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function togglePresent(id) {
    setPresentProjects((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        setEndDates((endPrev) => ({ ...endPrev, [id]: "" }));
      }
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const jobTitle = (fd.get("jobTitle") || "").toString().trim();
    const bio = (fd.get("bio") || "").toString().trim();
    const categoryIdNum = Number(categoryId);
    if (!Number.isFinite(categoryIdNum) || categoryIdNum <= 0) {
      alert("Please choose a category.");
      return;
    }

    const projRows = projects.map((pid, index) => {
      const start = startDates[pid] || "";
      const end = presentProjects[pid] ? "" : (endDates[pid] || "");
      return {
        name: (fd.get(`projectName-${index}`) || "").toString().trim(),
        start: start || null,
        end: presentProjects[pid] ? null : end || null,
        summary: (fd.get(`projectSummary-${index}`) || "").toString().trim(),
        hasData:
          !!(fd.get(`projectName-${index}`) || "").toString().trim() ||
          !!(fd.get(`projectSummary-${index}`) || "").toString().trim() ||
          !!start ||
          !!end ||
          !!presentProjects[pid],
        isPresent: !!presentProjects[pid],
      };
    });

    const missingDates = projRows.some((p) => {
      if (!p.hasData) return false;
      if (!p.start) return true;
      if (!p.isPresent && !p.end) return true;
      return false;
    });
    if (missingDates) {
      alert("Please select start and end dates for each project.");
      return;
    }

    const invalidDates = projRows.some(
      (p) => p.hasData && p.start && p.end && p.end < p.start
    );
    if (invalidDates) {
      alert("End date must be the same as or after the start date.");
      return;
    }

    const proj = projRows
      .filter((p) => p.hasData)
      .map(({ name, start, end, summary }) => ({ name, start, end, summary }));

    onNext({ jobTitle, bio, skills, projects: proj, categoryId: categoryIdNum });
  }

  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f] antialiased min-h-screen pt-12 pb-12">
      <main className="max-w-[1000px] mx-auto px-6 py-12 md:py-16 animate-fade-in flex flex-col items-center">
        <div className="w-full max-w-[720px] bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-12 border border-white">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-teal-50 text-[#10b8a6] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-gray-400 mb-3">
              Step 2 of 3
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-black mb-4">
              Your professional profile
            </h1>
            <p className="text-lg text-gray-500 font-medium leading-relaxed">
              Showcase your expertise and past work to attract high-quality clients.
            </p>
          </div>

          <div className="h-px bg-gray-100 w-full mb-12" />

          <form className="space-y-12" onSubmit={handleSubmit}>
            {/* CORE INFO */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="jobTitle" className="text-[14px] font-semibold text-gray-900 ml-1">
                  Job title
                </label>
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  placeholder="e.g. Machine Learning Engineer"
                  required
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-[14px] font-semibold text-gray-900 ml-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-200 rounded-[18px] px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm text-gray-700"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {catOptions.map((opt) => (
                    <option key={opt.id} value={String(opt.id)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="bio" className="text-[14px] font-semibold text-gray-900 ml-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  required
                  placeholder="A short introduction about your professional journey…"
                  className="w-full bg-white border border-gray-200 rounded-[22px] px-5 py-4 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all placeholder:text-gray-300 shadow-sm resize-none"
                />
              </div>
            </div>

            {/* SKILLS */}
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <div>
                <label className="text-[14px] font-semibold text-gray-900 ml-1 block mb-1">
                  Skills
                </label>
                <p className="text-sm text-gray-500 ml-1">
                  Type skills and press Enter or comma to add.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    id="skillsInput"
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddSkill(skillInput);
                      }
                    }}
                    placeholder="e.g. Python, React, UI Design"
                    className="flex-1 rounded-[18px] border border-gray-200 bg-white px-5 py-3.5 text-sm focus:border-[#10b8a6] focus:ring-4 focus:ring-[#10b8a6]/5 outline-none transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(skillInput)}
                    className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-black/5"
                  >
                    Add
                  </button>
                </div>

                {filteredSuggestions.length > 0 && (
                  <div className="rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-xl shadow-2xl p-2 animate-fade-in overflow-hidden">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left rounded-xl hover:bg-white hover:text-[#10b8a6] transition-colors text-sm font-medium"
                      >
                        <span>{s}</span>
                        <Plus className="w-4 h-4 opacity-30" />
                      </button>
                    ))}
                  </div>
                )}

                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 animate-fade-in"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 border-2 border-dashed border-gray-100 rounded-[32px] text-center text-gray-400 font-medium">
                    <p className="text-sm">No skills added yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* PROJECTS */}
            <div className="space-y-6 pt-4 border-t border-gray-100 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[14px] font-semibold text-gray-900 ml-1 block mb-1">
                    Projects
                  </label>
                  <p className="text-sm text-gray-500 ml-1">
                    Highlight your best work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="text-[#10b8a6] hover:text-[#0e9f8e] font-semibold text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} /> Add another
                </button>
              </div>

              <div className="space-y-6">
                {projects.map((pid, index) => (
                  <div
                    key={pid}
                    className="rounded-2xl border border-gray-100 bg-white p-6 space-y-5 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                        Project {index + 1}
                      </p>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(pid)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove project ${index + 1}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`projectName-${index}`}
                        className="text-[13px] font-medium text-gray-500 ml-1"
                      >
                        Project name
                      </label>
                      <input
                        id={`projectName-${index}`}
                        name={`projectName-${index}`}
                        type="text"
                        placeholder="e.g. E-commerce Mobile App"
                        className="w-full bg-white border border-gray-200 rounded-[16px] px-4 py-3 text-sm focus:ring-2 focus:ring-[#10b8a6]/10 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-gray-500 ml-1">
                          Start date
                        </label>
                        <MonthPicker
                          name={`startDate-${index}`}
                          value={startDates[pid] || ""}
                          max={todayMonth}
                          placeholder="Select month"
                          onChange={(next) => {
                            setStartDates((prev) => ({ ...prev, [pid]: next }));
                            setEndDates((prev) => {
                              if (prev[pid] && prev[pid] < next) {
                                return { ...prev, [pid]: "" };
                              }
                              return prev;
                            });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-gray-500 ml-1 flex items-center justify-between">
                          <span>End date</span>
                          <div className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 rounded bg-gray-50 border-gray-200 text-[#10b8a6] focus:ring-0"
                              checked={!!presentProjects[pid]}
                              onChange={() => togglePresent(pid)}
                            />
                            <span className="text-[11px] text-gray-400">Present</span>
                          </div>
                        </label>
                        <MonthPicker
                          name={`endDate-${index}`}
                          value={endDates[pid] || ""}
                          min={startDates[pid] || ""}
                          max={todayMonth}
                          placeholder={startDates[pid] ? "Select month" : "Pick start date first"}
                          disabled={!!presentProjects[pid] || !startDates[pid]}
                          onChange={(next) => setEndDates((prev) => ({ ...prev, [pid]: next }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-gray-500 ml-1">
                        Summary
                      </label>
                      <textarea
                        id={`projectSummary-${index}`}
                        name={`projectSummary-${index}`}
                        rows={3}
                        placeholder="What was your specific role and impact?"
                        className="w-full bg-white border border-gray-200 rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-[#10b8a6]/10 outline-none resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NAV BUTTONS */}
            <div className="pt-8 flex items-center justify-between border-t border-gray-100">
              <button
                type="button"
                onClick={onBack}
                className="text-lg font-medium text-gray-400 hover:text-black transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#10b8a6] hover:bg-[#0e9f8e] text-white font-semibold rounded-full px-10 py-4 text-lg shadow-lg shadow-[#10b8a6]/20 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Processing..." : "Continue"}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
