export type ArticleSection = {
  heading: string;
  body: string[];
};

export type Article = {
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  excerpt: string;
  author: string;
  image: string;
  imageAlt: string;
  sections: ArticleSection[];
};

export const articles: Article[] = [
  {
    slug: "hire-fast-without-sacrificing-quality",
    title: "How to hire fast without sacrificing quality",
    category: "Hiring",
    date: "Sep 12, 2024",
    readTime: "6 min read",
    excerpt:
      "A practical checklist for screening, scoping, and shortlisting so you can move quickly and still land senior talent.",
    author: "Nour El-Sayed",
    image: "/blog/hire-fast.svg",
    imageAlt: "Gradient checklist with teal highlights",
    sections: [
      {
        heading: "Define a tight brief",
        body: [
          "Start with outcomes, not tasks. Spell out the problem, what success looks like, and what constraints matter most.",
          "Include scope boundaries and a clear handoff. Ambiguity slows hiring more than a smaller budget ever will.",
          "List must-haves versus nice-to-haves so candidates can propose realistic timelines and trade-offs.",
        ],
      },
      {
        heading: "Screen quickly with proof",
        body: [
          "Ask for one relevant work sample and one short answer about approach. It filters faster than long portfolios.",
          "Use a short paid test only when the role needs it. Time-box it to 2 to 3 hours and pay promptly.",
          "Prioritize evidence of outcomes over tool lists so you see how they think, not just what they use.",
        ],
      },
      {
        heading: "Move fast on interviews",
        body: [
          "Batch interviews into one or two blocks. Decision lag is the biggest reason top candidates drop off.",
          "Close with a clear offer and next step. Good talent values certainty more than the last 5% of negotiation.",
          "Share your decision timeline up front and send a follow-up within 24 hours to keep momentum.",
        ],
      },
    ],
  },
  {
    slug: "briefs-that-get-better-proposals",
    title: "Briefs that get better proposals",
    category: "Workflow",
    date: "Aug 28, 2024",
    readTime: "5 min read",
    excerpt:
      "Clear briefs attract clearer bids. Learn the sections that matter and the details freelancers actually need.",
    author: "Karim Badr",
    image: "/blog/briefs-proposals.svg",
    imageAlt: "Abstract cards stacked with teal accents",
    sections: [
      {
        heading: "Make the goal unmissable",
        body: [
          "Lead with a one-sentence mission. It helps specialists self-select quickly.",
          "Share success metrics and constraints like time, budget range, or tooling limits.",
          "Include the audience and context so talent can tailor choices to the real user.",
        ],
      },
      {
        heading: "Provide reference material",
        body: [
          "Show two or three examples of the output you want. It anchors quality and style.",
          "Include assets, brand guidelines, or existing systems to reduce guesswork.",
          "Add one anti-example to clarify what to avoid and prevent misaligned proposals.",
        ],
      },
      {
        heading: "Define milestones",
        body: [
          "Break work into checkpoints with clear acceptance criteria.",
          "Milestones reduce scope creep and help proposals become more accurate.",
          "Set a review cadence so proposals reflect the real collaboration rhythm.",
        ],
      },
    ],
  },
  {
    slug: "budgeting-for-milestones-and-escrow",
    title: "Budgeting for milestones and escrow",
    category: "Payments",
    date: "Aug 08, 2024",
    readTime: "4 min read",
    excerpt:
      "Break down work into milestones, reduce risk, and keep progress steady with transparent payment checkpoints.",
    author: "Salma Adel",
    image: "/blog/milestones-escrow.svg",
    imageAlt: "Stepped path with shield icon",
    sections: [
      {
        heading: "Price by outcomes",
        body: [
          "Tie each milestone to a tangible deliverable and acceptance check.",
          "This makes budget approvals easier and keeps expectations aligned.",
          "Use ranges when scope is fuzzy so both sides can align before committing.",
        ],
      },
      {
        heading: "Front-load discovery",
        body: [
          "Reserve a smaller discovery phase to reduce downstream changes.",
          "Use escrow to protect both parties while scope is clarified.",
          "End discovery with a prioritized backlog that makes the next steps obvious.",
        ],
      },
      {
        heading: "Pay on acceptance",
        body: [
          "Release funds only when the milestone is reviewed and approved.",
          "It keeps the workflow predictable and builds trust on both sides.",
          "Set a short feedback window so approvals stay timely and momentum stays high.",
        ],
      },
    ],
  },
  {
    slug: "design-review-rituals-that-save-time",
    title: "Design review rituals that save time",
    category: "Collaboration",
    date: "Jul 22, 2024",
    readTime: "7 min read",
    excerpt:
      "Run weekly reviews that keep feedback focused, prevent rework, and keep creative momentum high.",
    author: "Hana Mahmoud",
    image: "/blog/design-review-rituals.svg",
    imageAlt: "Floating review notes and timeline dots",
    sections: [
      {
        heading: "Set a cadence",
        body: [
          "Keep reviews on the same day and time each week.",
          "Consistency allows the team to prepare and reduces surprise changes.",
          "Limit attendees to decision-makers so feedback stays focused and actionable.",
        ],
      },
      {
        heading: "Use a decision log",
        body: [
          "Capture final decisions immediately after each review.",
          "It avoids re-litigating the same topics in future rounds.",
          "Keep the log in a shared doc so anyone can reference past decisions quickly.",
        ],
      },
      {
        heading: "Keep feedback actionable",
        body: [
          "Frame feedback as a user problem to solve, not just a visual preference.",
          "Actionable notes speed up revisions and reduce churn.",
          "Bundle notes by priority to prevent a long list of low-impact tweaks.",
        ],
      },
    ],
  },
  {
    slug: "sourcing-specialists-in-egypt",
    title: "Sourcing specialists in Egypt",
    category: "Talent",
    date: "Jul 10, 2024",
    readTime: "5 min read",
    excerpt:
      "Where to look, what to ask, and how to verify expertise when you need specialized skills quickly.",
    author: "Youssef Ali",
    image: "/blog/sourcing-specialists-egypt.svg",
    imageAlt: "Map lines connecting expert profiles",
    sections: [
      {
        heading: "Go where specialists gather",
        body: [
          "Niche communities and local events often yield stronger candidates than general platforms.",
          "Ask for references from peers who hired in similar domains.",
          "Share a clear, honest project summary so specialists can self-select fast.",
        ],
      },
      {
        heading: "Validate with scenario questions",
        body: [
          "Ask candidates how they would approach a real problem you face.",
          "Strong answers show judgment, not just tool familiarity.",
          "Look for trade-off thinking to see how they prioritize quality, speed, and cost.",
        ],
      },
      {
        heading: "Check depth over breadth",
        body: [
          "Prioritize one or two deep case studies over dozens of unrelated samples.",
          "Specialists stand out by clarity of process and measurable impact.",
          "Ask for metrics, timelines, and constraints to verify the story behind the work.",
        ],
      },
    ],
  },
  {
    slug: "the-freelancer-handoff-playbook",
    title: "The freelancer handoff playbook",
    category: "Operations",
    date: "Jun 30, 2024",
    readTime: "6 min read",
    excerpt:
      "Make transitions smooth with clear timelines, assets, and documentation that keep projects moving.",
    author: "Lina Farouk",
    image: "/blog/freelancer-handoff.svg",
    imageAlt: "Handoff arrows with checklist cards",
    sections: [
      {
        heading: "Document everything once",
        body: [
          "Centralize specs, files, and timelines in one place.",
          "One source of truth prevents confusion across multiple collaborators.",
          "Use lightweight templates so each new project starts with the same structure.",
        ],
      },
      {
        heading: "Schedule a live handoff",
        body: [
          "Pair a short walkthrough with written docs to cover nuances.",
          "Recording the session helps future contributors ramp faster.",
          "Invite key stakeholders so alignment happens immediately, not weeks later.",
        ],
      },
      {
        heading: "Define what done means",
        body: [
          "Agree on acceptance criteria before delivery to avoid last-minute changes.",
          "It keeps the wrap-up clean and protects timelines.",
          "List deliverables and a final sign-off step to keep accountability clear.",
        ],
      },
    ],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
