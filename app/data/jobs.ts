export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryLabel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: string;
  employmentType: string;
  description: string;
  url: string;
  source: string;
  channel: "Email/chat" | "Ticket-based" | "Mixed phone" | "Not specified";
  experience: "Entry level" | "Mid level" | "Senior" | "Not specified";
  directApply: boolean;
  degreeRequired: boolean | null;
  verified: boolean;
  preview?: boolean;
};

const dateFromNow = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

export const PREVIEW_JOBS: Job[] = [
  {
    id: "preview-northstar-1",
    title: "Product Support Specialist",
    company: "Northstar Cloud",
    location: "Remote — United States",
    salaryLabel: "$62,000–$74,000",
    salaryMin: 62000,
    salaryMax: 74000,
    postedAt: dateFromNow(1),
    employmentType: "Full-time",
    description:
      "Resolve product questions through email and tickets, reproduce customer issues, and work with Product and Engineering on escalations.",
    url: "",
    source: "Preview listing",
    channel: "Email/chat",
    experience: "Mid level",
    directApply: true,
    degreeRequired: false,
    verified: true,
    preview: true,
  },
  {
    id: "preview-lattice-2",
    title: "Customer Support Specialist II",
    company: "Lattice Harbor",
    location: "Remote — United States",
    salaryLabel: "$55,000–$68,000",
    salaryMin: 55000,
    salaryMax: 68000,
    postedAt: dateFromNow(2),
    employmentType: "Full-time",
    description:
      "Support SaaS customers over chat and email, document solutions, and own complex Tier II troubleshooting from first reply through resolution.",
    url: "",
    source: "Preview listing",
    channel: "Email/chat",
    experience: "Mid level",
    directApply: true,
    degreeRequired: false,
    verified: true,
    preview: true,
  },
  {
    id: "preview-cedar-3",
    title: "Application Support Analyst",
    company: "Cedarline Systems",
    location: "Remote — U.S.",
    salaryLabel: "Salary unavailable",
    salaryMin: null,
    salaryMax: null,
    postedAt: dateFromNow(1),
    employmentType: "Full-time",
    description:
      "Investigate application issues, manage a ticket queue, maintain knowledge-base articles, and partner with QA on reproducible bugs.",
    url: "",
    source: "Preview listing",
    channel: "Ticket-based",
    experience: "Mid level",
    directApply: true,
    degreeRequired: null,
    verified: true,
    preview: true,
  },
  {
    id: "preview-ember-4",
    title: "Technical Customer Support Specialist",
    company: "EmberGrid",
    location: "Remote — United States",
    salaryLabel: "$70,000–$82,000",
    salaryMin: 70000,
    salaryMax: 82000,
    postedAt: dateFromNow(3),
    employmentType: "Full-time",
    description:
      "Troubleshoot integrations and account configurations, guide customers through fixes, and escalate confirmed platform defects.",
    url: "",
    source: "Preview listing",
    channel: "Mixed phone",
    experience: "Mid level",
    directApply: true,
    degreeRequired: false,
    verified: true,
    preview: true,
  },
  {
    id: "preview-mosaic-5",
    title: "Customer Success Associate, Support",
    company: "MosaicPath",
    location: "Remote — U.S. time zones",
    salaryLabel: "$58,000–$66,000",
    salaryMin: 58000,
    salaryMax: 66000,
    postedAt: dateFromNow(4),
    employmentType: "Full-time",
    description:
      "Answer customer questions through written channels, lead light onboarding, identify product friction, and improve self-service resources.",
    url: "",
    source: "Preview listing",
    channel: "Email/chat",
    experience: "Entry level",
    directApply: false,
    degreeRequired: false,
    verified: true,
    preview: true,
  },
  {
    id: "preview-summit-6",
    title: "Customer Operations Specialist",
    company: "SummitWorks",
    location: "Remote — United States",
    salaryLabel: "Salary unavailable",
    salaryMin: null,
    salaryMax: null,
    postedAt: dateFromNow(5),
    employmentType: "Full-time",
    description:
      "Own customer requests, troubleshoot account and billing issues, coordinate escalations, and keep internal support documentation current.",
    url: "",
    source: "Preview listing",
    channel: "Ticket-based",
    experience: "Not specified",
    directApply: true,
    degreeRequired: null,
    verified: true,
    preview: true,
  },
];

export const TARGET_TITLE_PATTERN =
  /(customer|client|member|product|application|technical|tier\s*(ii|2)|systems?).{0,24}(support|success|service|care|operations)|support.{0,24}(specialist|analyst|associate|representative|advisor|engineer)/i;

export function stableJobId(source: string, company: string, title: string) {
  return `${source}-${company}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 140);
}
