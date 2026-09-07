export type GigCategory =
  | "Paid research"
  | "Product testing"
  | "AI training"
  | "Support gigs"
  | "Virtual assistance";

export type GigOpportunity = {
  id: string;
  platform: string;
  title: string;
  category: GigCategory;
  description: string;
  pay: string;
  commitment: string;
  eligibility: string;
  interaction: string;
  liveInteraction: boolean;
  url: string;
  officialDomain: string;
  note: string;
  recommended?: boolean;
};

export const GIG_CATEGORIES: Array<"All" | GigCategory> = [
  "All",
  "Paid research",
  "Product testing",
  "AI training",
  "Support gigs",
  "Virtual assistance",
];

export const GIG_OPPORTUNITIES: GigOpportunity[] = [
  {
    id: "user-interviews",
    platform: "User Interviews",
    title: "Paid interviews, surveys & product research",
    category: "Paid research",
    description:
      "Browse online research studies, apply through a short screener, and get paid if selected and the session is completed.",
    pay: "Compensation shown on each study",
    commitment: "One-time studies",
    eligibility: "U.S. and other supported countries",
    interaction: "Surveys, video calls, or diary studies",
    liveInteraction: true,
    url: "https://www.userinterviews.com/studies",
    officialDomain: "userinterviews.com",
    note: "Applications do not guarantee selection.",
    recommended: true,
  },
  {
    id: "respondent",
    platform: "Respondent",
    title: "Focus groups & professional research",
    category: "Paid research",
    description:
      "Apply to remote focus groups, interviews, surveys, diary studies, and self-directed product research.",
    pay: "$50–$400+ per study",
    commitment: "Usually 15–90 minutes",
    eligibility: "U.S. and international",
    interaction: "Live or self-paced",
    liveInteraction: true,
    url: "https://www.respondent.io/research-projects",
    officialDomain: "respondent.io",
    note: "Higher-paying studies usually have narrower screening criteria.",
    recommended: true,
  },
  {
    id: "prolific",
    platform: "Prolific",
    title: "Academic studies, surveys & AI research",
    category: "Paid research",
    description:
      "Complete online studies and research tasks from universities, companies, and AI teams on your own schedule.",
    pay: "$8/hr enforced platform minimum",
    commitment: "Short, self-paced tasks",
    eligibility: "Most OECD countries; waitlist may apply",
    interaction: "Written / self-paced",
    liveInteraction: false,
    url: "https://www.prolific.com/participants",
    officialDomain: "prolific.com",
    note: "New participants may be placed on a waitlist.",
    recommended: true,
  },
  {
    id: "cloudresearch-connect",
    platform: "CloudResearch Connect",
    title: "Paid surveys & online research",
    category: "Paid research",
    description:
      "Choose paid studies from academic, corporate, government, and nonprofit researchers through a participant dashboard.",
    pay: "$7.50/hr minimum; many studies $9–$10/hr",
    commitment: "Short, self-paced studies",
    eligibility: "Availability varies by profile",
    interaction: "Written / self-paced",
    liveInteraction: false,
    url: "https://www.cloudresearch.com/products/connect-for-participants/",
    officialDomain: "cloudresearch.com",
    note: "Study volume depends on demographics and researcher demand.",
  },
  {
    id: "dscout",
    platform: "Dscout",
    title: "Mobile missions, diary studies & interviews",
    category: "Paid research",
    description:
      "Share real-life experiences through mobile missions, app tests, diary entries, and occasional live interviews.",
    pay: "Compensation shown before accepting",
    commitment: "One-time or multi-day missions",
    eligibility: "Location and profile dependent",
    interaction: "Mobile tasks, video, or live interview",
    liveInteraction: true,
    url: "https://dscout.com/participate-in-research-studies",
    officialDomain: "dscout.com",
    note: "Mission applications are unpaid and selection is not guaranteed.",
  },
  {
    id: "usertesting",
    platform: "UserTesting",
    title: "Test websites, apps & prototypes",
    category: "Product testing",
    description:
      "Record your screen and thoughts while testing digital experiences, or join live customer-research conversations.",
    pay: "Payment shown before each test",
    commitment: "Usually short individual tests",
    eligibility: "Practice test and device requirements apply",
    interaction: "Recorded voice or live interview",
    liveInteraction: true,
    url: "https://www.usertesting.com/get-paid-to-test",
    officialDomain: "usertesting.com",
    note: "A microphone is commonly required.",
    recommended: true,
  },
  {
    id: "utest",
    platform: "uTest",
    title: "Freelance app, device & software testing",
    category: "Product testing",
    description:
      "Browse paid testing projects and earn through approved bugs, test cases, usability studies, and other testing tasks.",
    pay: "Varies by project and approved work",
    commitment: "Project-based",
    eligibility: "Worldwide; requirements vary",
    interaction: "Mostly written / on-device",
    liveInteraction: false,
    url: "https://www.utest.com/projects",
    officialDomain: "utest.com",
    note: "Read each project’s device, location, and payment requirements.",
    recommended: true,
  },
  {
    id: "outlier",
    platform: "Outlier",
    title: "Freelance AI response evaluation",
    category: "AI training",
    description:
      "Evaluate and improve AI-generated answers using writing, reasoning, language, coding, or subject-matter expertise.",
    pay: "Rate shown for each opportunity",
    commitment: "Flexible project work",
    eligibility: "Assessment and country eligibility apply",
    interaction: "Written / self-paced",
    liveInteraction: false,
    url: "https://app.outlier.ai/expert/jobs",
    officialDomain: "outlier.ai",
    note: "Project availability and weekly hours can fluctuate.",
    recommended: true,
  },
  {
    id: "dataannotation",
    platform: "DataAnnotation",
    title: "Train and evaluate AI models",
    category: "AI training",
    description:
      "Work on reasoning, writing, coding, language, and professional-domain projects that improve AI systems.",
    pay: "$20–$60+/hr depending on expertise",
    commitment: "Flexible contractor work",
    eligibility: "Starter assessment and country eligibility apply",
    interaction: "Written / self-paced",
    liveInteraction: false,
    url: "https://www.dataannotation.tech/",
    officialDomain: "dataannotation.tech",
    note: "Apply only through the exact official domain shown here.",
    recommended: true,
  },
  {
    id: "telus-ai",
    platform: "TELUS Digital AI Community",
    title: "AI rater, annotator & data-quality roles",
    category: "AI training",
    description:
      "Search official AI Community openings for raters, data annotators, language specialists, and model-quality projects.",
    pay: "Rate shown on each position",
    commitment: "Part-time, contract, or project-based",
    eligibility: "Country and language dependent",
    interaction: "Mostly written / self-paced",
    liveInteraction: false,
    url: "https://jobs.telusdigital.com/search/cfm5/ai-community/jobs",
    officialDomain: "jobs.telusdigital.com",
    note: "Use the country filter before applying.",
  },
  {
    id: "oneforma",
    platform: "OneForma",
    title: "AI data, annotation & language projects",
    category: "AI training",
    description:
      "Browse remote annotation, transcription, data collection, quality review, and language-based AI projects.",
    pay: "Fixed hourly or per approved task",
    commitment: "Flexible projects",
    eligibility: "Country, language, and certification dependent",
    interaction: "Written / self-paced",
    liveInteraction: false,
    url: "https://www.oneforma.com/jobs/",
    officialDomain: "oneforma.com",
    note: "Some projects require a free qualification or certification.",
  },
  {
    id: "welocalize",
    platform: "Welocalize / Welo Data",
    title: "Search-quality, localization & AI projects",
    category: "AI training",
    description:
      "Explore official freelance and project opportunities in search quality, localization, language, testing, and AI data.",
    pay: "Rate shown on each role",
    commitment: "Freelance or project-based",
    eligibility: "Location and language dependent",
    interaction: "Mostly written / self-paced",
    liveInteraction: false,
    url: "https://jobs.lever.co/weloglobal?department=Welocalize",
    officialDomain: "jobs.lever.co/weloglobal",
    note: "Confirm that the listing identifies Welocalize or Welo Global.",
  },
  {
    id: "modsquad",
    platform: "ModSquad",
    title: "Freelance customer support & moderation",
    category: "Support gigs",
    description:
      "Apply for fully remote contractor projects in customer support, content moderation, trust and safety, or community management.",
    pay: "Varies by project",
    commitment: "Part-time or full-time project slots",
    eligibility: "90+ countries; project dependent",
    interaction: "Email, chat, forums, social, or phone",
    liveInteraction: true,
    url: "https://modsquad.wd5.myworkdayjobs.com/ModSquad_Contractor",
    officialDomain: "modsquad.wd5.myworkdayjobs.com",
    note: "Check the channel mix before accepting a project.",
    recommended: true,
  },
  {
    id: "working-solutions",
    platform: "Working Solutions",
    title: "Remote customer-service contracts",
    category: "Support gigs",
    description:
      "Browse work-from-home independent-contractor opportunities supporting customers for different client programs.",
    pay: "Pay shown per contract",
    commitment: "Flexible contract hours",
    eligibility: "United States, Canada, or Jamaica",
    interaction: "Often phone; some digital support",
    liveInteraction: true,
    url: "https://apply.workingsolutions.com/jobs",
    officialDomain: "apply.workingsolutions.com",
    note: "Review equipment, state, schedule, and channel requirements.",
  },
  {
    id: "omni-interactions",
    platform: "Omni Interactions",
    title: "Flexible customer & technical-support gigs",
    category: "Support gigs",
    description:
      "Choose U.S. independent-contractor customer service and tech-support contracts with flexible scheduling.",
    pay: "$14–$20/hr on current U.S. listings",
    commitment: "Flexible contract hours",
    eligibility: "United States; state restrictions may apply",
    interaction: "Phone, chat, email, or social",
    liveInteraction: true,
    url: "https://omniinteractions.com/apply/",
    officialDomain: "omniinteractions.com",
    note: "Omni says it does not charge fees to access contracts or certification.",
  },
  {
    id: "fancy-hands",
    platform: "Fancy Hands",
    title: "Remote virtual-assistant tasks",
    category: "Virtual assistance",
    description:
      "Apply to complete short research, scheduling, coordination, and customer-service tasks for platform users.",
    pay: "Pay details provided during application",
    commitment: "Task-based",
    eligibility: "United States",
    interaction: "Research plus some phone tasks",
    liveInteraction: true,
    url: "https://www.fancyhands.com/jobs",
    officialDomain: "fancyhands.com",
    note: "Phone comfort and strong web-research skills are requested.",
  },
];
