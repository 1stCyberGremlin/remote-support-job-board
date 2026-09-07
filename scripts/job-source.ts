import {
  PREVIEW_JOBS,
  TARGET_TITLE_PATTERN,
  type Job,
  stableJobId,
} from "../app/data/jobs";

export const dynamic = "force-dynamic";

const SOURCE_TIMEOUT_MS = 9500;

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function plainText(value: string | undefined) {
  return decodeEntities(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferChannel(text: string): Job["channel"] {
  if (/\b(phone|calls?|voice)\b/i.test(text)) return "Mixed phone";
  if (/\b(chat|email|written|messaging)\b/i.test(text)) return "Email/chat";
  if (/\b(ticket|zendesk|freshdesk|intercom|service desk)\b/i.test(text))
    return "Ticket-based";
  return "Not specified";
}

function inferExperience(text: string): Job["experience"] {
  if (/\b(senior|sr\.?|lead|tier\s*(iii|3))\b/i.test(text)) return "Senior";
  if (/\b(entry|junior|associate|0[-– ]?2 years?)\b/i.test(text))
    return "Entry level";
  if (/\b(2|3|4)[+ -](years?|yrs?)\b/i.test(text)) return "Mid level";
  return "Not specified";
}

function inferDegree(text: string) {
  if (/\b(bachelor'?s|college degree|university degree).{0,25}(required|must)\b/i.test(text))
    return true;
  if (/\b(no degree|degree not required|equivalent experience)\b/i.test(text))
    return false;
  return null;
}

function directApply(url: string) {
  return /(greenhouse\.io|lever\.co|ashbyhq\.com|workdayjobs\.com|myworkdayjobs\.com|smartrecruiters\.com|jobvite\.com|icims\.com)/i.test(
    url,
  );
}

function parseSalary(label: string) {
  const values = [...label.matchAll(/\$?\s*([\d,.]+)\s*([kK])?/g)]
    .map((match) => {
      const raw = Number(match[1].replace(/,/g, ""));
      return match[2] ? raw * 1000 : raw;
    })
    .filter((value) => value > 0 && value <= 500000);
  const hourly = /hourly|\/\s*(?:hr|hour)|per hour/i.test(label);
  const normalized = hourly
    ? values.filter((value) => value <= 1000).map((value) => value * 2080)
    : values.filter((value) => value >= 10000);
  return {
    min: normalized.length ? Math.min(...normalized) : null,
    max: normalized.length ? Math.max(...normalized) : null,
  };
}

function salaryFromDescription(value: string) {
  const text = plainText(value);
  const relevant = text.match(
    /(?:base salary|salary range|base pay|pay range|compensation)[\s\S]{0,220}/i,
  )?.[0];
  if (!relevant) {
    return { label: "Salary unavailable", min: null, max: null };
  }
  const range = relevant.match(
    /\$\s*([\d,.]+)\s*([kK])?\s*(?:-|–|—|to)\s*\$?\s*([\d,.]+)\s*([kK])?/i,
  );
  const single = relevant.match(/\$\s*([\d,.]+)\s*([kK])?/i);
  const salaryText = range?.[0] ?? single?.[0] ?? "";
  if (!salaryText) {
    return { label: "Salary unavailable", min: null, max: null };
  }
  const parsed = parseSalary(
    `${salaryText}${/hour|\/\s*hr/i.test(relevant) ? " per hour" : ""}`,
  );
  if (parsed.min === null) {
    return { label: "Salary unavailable", min: null, max: null };
  }
  const hourly = /hour|\/\s*hr/i.test(relevant);
  const rawValues = [...salaryText.matchAll(/\$\s*([\d,.]+)\s*([kK])?/g)].map(
    (match) => {
      const raw = Number(match[1].replace(/,/g, ""));
      return match[2] ? raw * 1000 : raw;
    },
  );
  const label = hourly
    ? `$${rawValues[0]?.toLocaleString()}${
        rawValues[1] ? `–$${rawValues[1].toLocaleString()}` : "+"
      }/hour`
    : `$${Math.round(parsed.min).toLocaleString()}${
        parsed.max && parsed.max !== parsed.min
          ? `–$${Math.round(parsed.max).toLocaleString()}`
          : "+"
      }`;
  return { label, min: parsed.min, max: parsed.max };
}

function isRemoteUSLocation(location: string) {
  const normalized = location.toLowerCase();
  if (!/(remote|anywhere|work from home)/i.test(location)) return false;
  if (/hybrid/i.test(location)) return false;
  if (
    /\b(emea|europe|european|apac|asia|latam|latin america|uk|united kingdom|ireland|india|poland|germany|france|spain|mexico|brazil|philippines|australia|new zealand|africa)\b/i.test(
      normalized,
    ) &&
    !/\b(united states|u\.s\.|usa|us[- ]?based|north america|worldwide|global)\b/i.test(
      normalized,
    )
  )
    return false;
  return true;
}

function postedFromLabel(label: string) {
  const date = new Date();
  const days = label.match(/(\d+)\s*days?\s*ago/i);
  const hours = label.match(/(\d+)\s*hours?\s*ago/i);
  if (days) date.setDate(date.getDate() - Number(days[1]));
  else if (hours) date.setHours(date.getHours() - Number(hours[1]));
  else if (/yesterday/i.test(label)) date.setDate(date.getDate() - 1);
  else if (!/(today|just posted)/i.test(label)) return new Date(0).toISOString();
  return date.toISOString();
}

function eligible(job: Job) {
  const remoteUS = isRemoteUSLocation(job.location);
  const fresh =
    Date.now() - new Date(job.postedAt).getTime() <= 8 * 24 * 60 * 60 * 1000;
  const salaryEligible = job.salaryMin === null || job.salaryMin >= 40000;
  const fullTime = /\bfull[- ]?time\b/i.test(job.employmentType);
  return (
    TARGET_TITLE_PATTERN.test(job.title) &&
    remoteUS &&
    fresh &&
    salaryEligible &&
    fullTime &&
    !/\b(sales|account executive|business development)\b/i.test(job.title)
  );
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "User-Agent": "RemoteSupportJobBoard/1.0",
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; RemoteSupportJobBoard/1.0; +https://remote-support-job-board.kushumpeng.chatgpt.site)",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function relativePostedAt(label: string) {
  const now = new Date();
  const normalized = label.toLowerCase();
  const hourMatch = normalized.match(/(\d+)\s*hours?\s*ago/);
  const dayMatch = normalized.match(/(\d+)\s*days?\s*ago/);
  if (hourMatch) now.setHours(now.getHours() - Number(hourMatch[1]));
  else if (dayMatch) now.setDate(now.getDate() - Number(dayMatch[1]));
  else if (normalized.includes("yesterday")) now.setDate(now.getDate() - 1);
  return now.toISOString();
}

function builtInCompensation(label: string) {
  const values = [...label.matchAll(/([\d,.]+)\s*([kK])?/g)].map((match) => {
    const raw = Number(match[1].replace(/,/g, ""));
    return match[2] ? raw * 1000 : raw;
  });
  if (!values.length) {
    return { label: "Salary unavailable", min: null, max: null };
  }
  const hourly = /hourly|\/\s*hr|per hour/i.test(label);
  const annualValues = hourly ? values.map((value) => value * 2080) : values;
  const display = hourly
    ? `$${values[0].toLocaleString()}${values[1] ? `–$${values[1].toLocaleString()}` : "+"}/hour`
    : `$${annualValues[0].toLocaleString()}${
        annualValues[1] ? `–$${annualValues[1].toLocaleString()}` : "+"
      }`;
  return {
    label: display,
    min: Math.min(...annualValues),
    max: Math.max(...annualValues),
  };
}

async function builtInJobs(): Promise<Job[]> {
  const queries = ["customer support specialist", "product support specialist"];
  const pages = await Promise.all(
    queries.map((query) =>
      fetchText(
        `https://builtin.com/jobs/remote?search=${encodeURIComponent(
          query,
        )}&daysSinceUpdated=7&location=United%20States&country=USA`,
      ),
    ),
  );

  return pages.flatMap((page) =>
    page
      .split(/<div id="job-card-\d+" data-id="job-card"/g)
      .slice(1)
      .map((card) => {
        const titleMatch = card.match(
          /<a href="([^"]+)"[^>]*data-id="job-card-title"[^>]*>([\s\S]*?)<\/a>/i,
        );
        const companyMatch = card.match(
          /data-id="company-title"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i,
        );
        const descriptionMatch = card.match(
          /<div class="fs-sm fw-regular mb-md text-gray-04">([\s\S]*?)<\/div>/i,
        );
        const arrangementMatch = card.match(
          /fa-house-building[\s\S]{0,350}?<span[^>]*>([\s\S]*?)<\/span>/i,
        );
        const experienceMatch = card.match(
          /fa-trophy[\s\S]{0,300}?<span[^>]*>([\s\S]*?)<\/span>/i,
        );
        const compensationMatch = card.match(
          /<span class="font-barlow text-gray-04">([^<]*(?:Annually|Hourly))<\/span>/i,
        );
        const freshnessMatch = plainText(card).match(
          /(?:Reposted\s+)?(?:Today|Yesterday|\d+\s+(?:Hours?|Days?)\s+Ago)/i,
        );
        if (!titleMatch || !companyMatch) return null;

        const arrangement = plainText(arrangementMatch?.[1]);
        if (arrangement !== "Remote") return null;

        const title = plainText(titleMatch[2]);
        const company = plainText(companyMatch[1]);
        const description = plainText(descriptionMatch?.[1]);
        const salary = builtInCompensation(
          plainText(compensationMatch?.[1]) || "Salary unavailable",
        );
        return {
          id: stableJobId("builtin", company, title),
          title,
          company,
          location: "Remote — United States",
          salaryLabel: salary.label,
          salaryMin: salary.min,
          salaryMax: salary.max,
          postedAt: relativePostedAt(freshnessMatch?.[0] ?? "Today"),
          employmentType: "Full-time",
          description,
          url: new URL(titleMatch[1], "https://builtin.com").toString(),
          source: "Built In",
          channel: inferChannel(description),
          experience: inferExperience(
            `${title} ${plainText(experienceMatch?.[1])} ${description}`,
          ),
          directApply: false,
          degreeRequired: inferDegree(description),
          verified: true,
        } satisfies Job;
      })
      .filter((job): job is NonNullable<typeof job> => job !== null),
  );
}

type HiringCafeHit = {
  apply_url?: string;
  job_information?: { title?: string; job_title_raw?: string };
  v5_processed_job_data?: Record<string, unknown>;
};

function numericValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function hiringCafeSalary(data: Record<string, unknown>) {
  const yearlyMin = numericValue(data.yearly_min_compensation);
  const yearlyMax = numericValue(data.yearly_max_compensation);
  const hourlyMin = numericValue(data.hourly_min_compensation);
  const hourlyMax = numericValue(data.hourly_max_compensation);
  const min = yearlyMin ?? (hourlyMin ? hourlyMin * 2080 : null);
  const max = yearlyMax ?? (hourlyMax ? hourlyMax * 2080 : min);
  const label = hourlyMin
    ? `$${hourlyMin.toLocaleString()}${hourlyMax ? `–$${hourlyMax.toLocaleString()}` : "+"}/hour`
    : min
      ? `$${Math.round(min).toLocaleString()}${
          max && max !== min ? `–$${Math.round(max).toLocaleString()}` : "+"
        }`
      : "Salary unavailable";
  return { min, max, label };
}

async function hiringCafeJobs(): Promise<Job[]> {
  const queries = ["customer support specialist", "product support specialist"];
  const pages = await Promise.all(
    queries.map((searchQuery) => {
      const searchState = encodeURIComponent(JSON.stringify({ searchQuery }));
      return fetchText(`https://hiring.cafe/?searchState=${searchState}`);
    }),
  );

  return pages.flatMap((page) => {
    const nextData = page.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i,
    )?.[1];
    if (!nextData) return [];
    const parsed = JSON.parse(nextData) as {
      props?: { pageProps?: { ssrHits?: HiringCafeHit[] } };
    };
    return (parsed.props?.pageProps?.ssrHits ?? [])
      .map((hit) => {
        const data = hit.v5_processed_job_data ?? {};
        const workplaceType = String(data.workplace_type ?? "");
        const countries = Array.isArray(data.workplace_countries)
          ? data.workplace_countries.map(String)
          : [];
        const commitments = Array.isArray(data.commitment)
          ? data.commitment.map(String)
          : [];
        const remoteUS =
          workplaceType === "Remote" &&
          (countries.includes("US") || Boolean(data.is_workplace_worldwide_ok));
        if (!remoteUS || !commitments.includes("Full Time")) return null;

        const title = String(
          data.core_job_title ??
            hit.job_information?.title ??
            hit.job_information?.job_title_raw ??
            "",
        );
        const company = String(data.company_name ?? "Employer");
        const description = String(
          data.requirements_summary ?? data.company_tagline ?? "",
        );
        const salary = hiringCafeSalary(data);
        const postedAt = String(
          data.estimated_publish_date ?? new Date().toISOString(),
        );
        const url = String(hit.apply_url ?? "");
        if (!title || !url) return null;
        return {
          id: stableJobId("hiringcafe", company, title),
          title,
          company,
          location: `Remote — ${
            String(data.formatted_workplace_location ?? "United States")
          }`,
          salaryLabel: salary.label,
          salaryMin: salary.min,
          salaryMax: salary.max,
          postedAt,
          employmentType: "Full-time",
          description,
          url,
          source: "HiringCafe",
          channel: inferChannel(description),
          experience: inferExperience(
            `${title} ${String(data.seniority_level ?? "")} ${description}`,
          ),
          directApply: true,
          degreeRequired:
            String(data.bachelors_degree_requirement ?? "").toLowerCase() ===
            "required"
              ? true
              : null,
          verified: true,
        } satisfies Job;
      })
      .filter((job): job is NonNullable<typeof job> => job !== null);
  });
}

const GREENHOUSE_BOARDS = [
  ["customerio", "Customer.io"],
  ["gitlab", "GitLab"],
  ["calendly", "Calendly"],
  ["remotecom", "Remote"],
  ["webflow", "Webflow"],
  ["gusto", "Gusto"],
  ["intercom", "Intercom"],
  ["postman", "Postman"],
] as const;

async function greenhouseJobs(): Promise<Job[]> {
  const settled = await Promise.allSettled(
    GREENHOUSE_BOARDS.map(([board]) =>
      fetchJson(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`,
      ),
    ),
  );
  if (!settled.some((result) => result.status === "fulfilled")) {
    throw new Error("Greenhouse boards unavailable");
  }

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    const payload = result.value as { jobs?: Array<Record<string, unknown>> };
    return (payload.jobs ?? []).map((item) => {
      const title = String(item.title ?? "");
      const company = String(
        item.company_name ?? GREENHOUSE_BOARDS[index]?.[1] ?? "Employer",
      );
      const description = plainText(String(item.content ?? ""));
      const location = String(
        (item.location as { name?: string } | undefined)?.name ?? "Remote",
      );
      const salary = salaryFromDescription(description);
      const employmentType = /\bpart[- ]?time\b/i.test(description)
        ? "Part-time"
        : /\b(contract|freelance|temporary)\b/i.test(description)
          ? "Contract"
          : "Full-time";
      return {
        id: stableJobId("greenhouse", company, title),
        title,
        company,
        location,
        salaryLabel: salary.label,
        salaryMin: salary.min,
        salaryMax: salary.max,
        postedAt: String(
          item.first_published ?? item.updated_at ?? new Date().toISOString(),
        ),
        employmentType,
        description,
        url: String(item.absolute_url ?? ""),
        source: "Greenhouse",
        channel: inferChannel(description),
        experience: inferExperience(`${title} ${description}`),
        directApply: true,
        degreeRequired: inferDegree(description),
        verified: true,
      } satisfies Job;
    });
  });
}

const LEVER_SITES = [
  ["peoplegrove", "PeopleGrove"],
  ["Instrumentl", "Instrumentl"],
  ["tenna", "Tenna"],
  ["nextech", "Nextech"],
] as const;

async function leverJobs(): Promise<Job[]> {
  const settled = await Promise.allSettled(
    LEVER_SITES.map(([site]) =>
      fetchJson(
        `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`,
      ),
    ),
  );
  if (!settled.some((result) => result.status === "fulfilled")) {
    throw new Error("Lever boards unavailable");
  }

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value)) return [];
    return (result.value as Array<Record<string, unknown>>).map((item) => {
      const title = String(item.text ?? "");
      const company = LEVER_SITES[index]?.[1] ?? "Employer";
      const description = String(
        item.descriptionPlain ?? item.descriptionBodyPlain ?? item.additionalPlain ?? "",
      );
      const categories = (item.categories ?? {}) as Record<string, unknown>;
      const range = item.salaryRange as
        | { min?: number; max?: number; currency?: string; interval?: string }
        | undefined;
      const annual = range?.interval === "per-year-salary";
      const hourly = range?.interval === "per-hour-salary";
      const min =
        range?.currency === "USD" && range.min
          ? annual
            ? range.min
            : hourly
              ? range.min * 2080
              : null
          : null;
      const max =
        range?.currency === "USD" && range.max
          ? annual
            ? range.max
            : hourly
              ? range.max * 2080
              : min
          : min;
      const salaryLabel = min
        ? hourly
          ? `$${range?.min?.toLocaleString()}${
              range?.max ? `–$${range.max.toLocaleString()}` : "+"
            }/hour`
          : `$${Math.round(min).toLocaleString()}${
              max && max !== min ? `–$${Math.round(max).toLocaleString()}` : "+"
            }`
        : "Salary unavailable";
      return {
        id: stableJobId("lever", company, title),
        title,
        company,
        location: String(categories.location ?? "Remote"),
        salaryLabel,
        salaryMin: min,
        salaryMax: max,
        postedAt: new Date(Number(item.createdAt ?? Date.now())).toISOString(),
        employmentType: String(categories.commitment ?? "Full-time"),
        description,
        url: String(item.applyUrl ?? item.hostedUrl ?? ""),
        source: "Lever",
        channel: inferChannel(description),
        experience: inferExperience(`${title} ${description}`),
        directApply: true,
        degreeRequired: inferDegree(description),
        verified: true,
      } satisfies Job;
    });
  });
}

const ASHBY_BOARDS = [
  ["hauler-hero", "Hauler Hero"],
  ["puzzle.io", "Puzzle"],
  ["aiwyn", "Aiwyn"],
  ["knowtex", "Knowtex"],
  ["junipersquare", "Juniper Square"],
  ["hubstaff", "Hubstaff"],
] as const;

async function ashbyJobs(): Promise<Job[]> {
  const settled = await Promise.allSettled(
    ASHBY_BOARDS.map(([board]) =>
      fetchJson(
        `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`,
      ),
    ),
  );
  if (!settled.some((result) => result.status === "fulfilled")) {
    throw new Error("Ashby boards unavailable");
  }

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    const payload = result.value as { jobs?: Array<Record<string, unknown>> };
    return (payload.jobs ?? []).map((item) => {
      const title = String(item.title ?? "");
      const company = ASHBY_BOARDS[index]?.[1] ?? "Employer";
      const description = String(
        item.descriptionPlain ?? plainText(String(item.descriptionHtml ?? "")),
      );
      const salary = salaryFromDescription(description);
      return {
        id: stableJobId("ashby", company, title),
        title,
        company,
        location: String(item.location ?? "Remote"),
        salaryLabel: salary.label,
        salaryMin: salary.min,
        salaryMax: salary.max,
        postedAt: String(item.publishedAt ?? new Date().toISOString()),
        employmentType: String(item.employmentType ?? "Full-time").replace(
          /FullTime/i,
          "Full-time",
        ),
        description,
        url: String(item.applyUrl ?? item.jobUrl ?? ""),
        source: "Ashby",
        channel: inferChannel(description),
        experience: inferExperience(`${title} ${description}`),
        directApply: true,
        degreeRequired: inferDegree(description),
        verified: true,
      } satisfies Job;
    });
  });
}

const SMARTRECRUITERS_COMPANIES = [
  "SmartRecruiters",
  "Samsara",
  "Deel",
  "Contentsquare",
  "Pipedrive",
  "Canva",
] as const;

async function smartRecruitersJobs(): Promise<Job[]> {
  const settled = await Promise.allSettled(
    SMARTRECRUITERS_COMPANIES.map((company) =>
      fetchJson(
        `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100`,
      ),
    ),
  );
  if (!settled.some((result) => result.status === "fulfilled")) {
    throw new Error("SmartRecruiters boards unavailable");
  }

  const candidates = settled.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    const payload = result.value as { content?: Array<Record<string, unknown>> };
    return (payload.content ?? []).filter((item) => {
      const location = (item.location ?? {}) as Record<string, unknown>;
      const employment = (item.typeOfEmployment ?? {}) as Record<string, unknown>;
      const fresh =
        Date.now() - new Date(String(item.releasedDate ?? 0)).getTime() <=
        8 * 24 * 60 * 60 * 1000;
      return (
        TARGET_TITLE_PATTERN.test(String(item.name ?? "")) &&
        Boolean(location.remote) &&
        String(location.country ?? "").toLowerCase() === "us" &&
        /full[- ]?time/i.test(String(employment.label ?? "")) &&
        fresh
      );
    });
  });
  const details = await Promise.allSettled(
    candidates.map((item) => fetchJson(String(item.ref ?? ""))),
  );

  return candidates.map((item, index) => {
    const title = String(item.name ?? "");
    const companyInfo = (item.company ?? {}) as Record<string, unknown>;
    const company = String(companyInfo.name ?? "Employer");
    const identifier = String(companyInfo.identifier ?? "");
    const locationInfo = (item.location ?? {}) as Record<string, unknown>;
    const employment = (item.typeOfEmployment ?? {}) as Record<string, unknown>;
    const detail =
      details[index]?.status === "fulfilled"
        ? (details[index].value as Record<string, unknown>)
        : {};
    const jobAd = (detail.jobAd ?? {}) as Record<string, unknown>;
    const sections = (jobAd.sections ?? {}) as Record<string, unknown>;
    const description = plainText(
      Object.values(sections)
        .map((section) =>
          typeof section === "string"
            ? section
            : String((section as Record<string, unknown>)?.text ?? ""),
        )
        .join(" "),
    );
    const salary = salaryFromDescription(description);
    return {
      id: stableJobId("smartrecruiters", company, title),
      title,
      company,
      location: String(locationInfo.fullLocation ?? "Remote"),
      salaryLabel: salary.label,
      salaryMin: salary.min,
      salaryMax: salary.max,
      postedAt: String(item.releasedDate ?? new Date().toISOString()),
      employmentType: String(employment.label ?? "Full-time"),
      description,
      url: `https://jobs.smartrecruiters.com/${identifier}/${String(item.id ?? "")}`,
      source: "SmartRecruiters",
      channel: inferChannel(description),
      experience: inferExperience(`${title} ${description}`),
      directApply: true,
      degreeRequired: inferDegree(description),
      verified: true,
    } satisfies Job;
  });
}

const WORKDAY_FEEDS = [
  {
    host: "workiva.wd503.myworkdayjobs.com",
    tenant: "workiva",
    site: "careers",
    company: "Workiva",
  },
  {
    host: "evercommerce.wd1.myworkdayjobs.com",
    tenant: "evercommerce",
    site: "EverCommerce_Careers",
    company: "EverCommerce",
  },
  {
    host: "wexinc.wd5.myworkdayjobs.com",
    tenant: "wexinc",
    site: "WEXInc",
    company: "WEX",
  },
  {
    host: "philips.wd3.myworkdayjobs.com",
    tenant: "philips",
    site: "jobs-and-careers",
    company: "Philips",
  },
] as const;

async function workdayJobs(): Promise<Job[]> {
  const settled = await Promise.allSettled(
    WORKDAY_FEEDS.map((feed) =>
      fetchJson(
        `https://${feed.host}/wday/cxs/${feed.tenant}/${feed.site}/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliedFacets: {},
            limit: 20,
            offset: 0,
            searchText: "support",
          }),
        },
      ),
    ),
  );
  if (!settled.some((result) => result.status === "fulfilled")) {
    throw new Error("Workday boards unavailable");
  }

  return settled.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    const feed = WORKDAY_FEEDS[index];
    const payload = result.value as {
      jobPostings?: Array<Record<string, unknown>>;
    };
    return (payload.jobPostings ?? []).map((item) => {
      const title = String(item.title ?? "");
      const location = String(item.locationsText ?? "");
      const description = `${title} at ${feed.company}. ${location}.`;
      return {
        id: stableJobId("workday", feed.company, title),
        title,
        company: feed.company,
        location,
        salaryLabel: "Salary unavailable",
        salaryMin: null,
        salaryMax: null,
        postedAt: postedFromLabel(String(item.postedOn ?? "")),
        employmentType: "Full-time",
        description,
        url: `https://${feed.host}/en-US/${feed.site}${String(item.externalPath ?? "")}`,
        source: "Workday",
        channel: "Not specified",
        experience: inferExperience(title),
        directApply: true,
        degreeRequired: null,
        verified: true,
      } satisfies Job;
    });
  });
}

const JOBVITE_COMPANIES = [
  ["leadventure", "LeadVenture"],
  ["ninjaone", "NinjaOne"],
  ["progress", "Progress"],
  ["enverus", "Enverus"],
] as const;

async function jobviteJobs(): Promise<Job[]> {
  const listingPages = await Promise.allSettled(
    JOBVITE_COMPANIES.map(([company]) =>
      fetchText(`https://jobs.jobvite.com/${company}/jobs`),
    ),
  );
  if (!listingPages.some((result) => result.status === "fulfilled")) {
    throw new Error("Jobvite boards unavailable");
  }

  const candidates = listingPages.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    const matches = [...result.value.matchAll(/<a href="([^"]+\/job\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const seen = new Set<string>();
    return matches.flatMap((match) => {
      const title = plainText(match[2]);
      const url = new URL(match[1], "https://jobs.jobvite.com").toString();
      if (!TARGET_TITLE_PATTERN.test(title) || seen.has(url)) return [];
      seen.add(url);
      return [{ title, url, company: JOBVITE_COMPANIES[index]?.[1] ?? "Employer" }];
    });
  }).slice(0, 12);
  const detailPages = await Promise.allSettled(
    candidates.map((candidate) => fetchText(candidate.url)),
  );

  return candidates.flatMap((candidate, index) => {
    const result = detailPages[index];
    if (!result || result.status !== "fulfilled") return [];
    const scripts = [...result.value.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    let data: Record<string, unknown> | null = null;
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script[1]) as Record<string, unknown>;
        if (String(parsed["@type"] ?? "").toLowerCase() === "jobposting") {
          data = parsed;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!data) return [];
    const description = plainText(String(data.description ?? ""));
    const locations = Array.isArray(data.jobLocation)
      ? data.jobLocation
      : data.jobLocation
        ? [data.jobLocation]
        : [];
    const locationText = locations
      .map((location) => {
        const address = ((location as Record<string, unknown>)?.address ?? {}) as Record<
          string,
          unknown
        >;
        return [address.addressLocality, address.addressRegion, address.addressCountry]
          .filter(Boolean)
          .map(String)
          .join(", ");
      })
      .filter(Boolean)
      .join("; ");
    const remote = String(data.jobLocationType ?? "").includes("TELECOMMUTE");
    const baseSalary = (data.baseSalary ?? {}) as Record<string, unknown>;
    const salaryValue = (baseSalary.value ?? {}) as Record<string, unknown>;
    const unit = String(salaryValue.unitText ?? "");
    const rawMin = numericValue(salaryValue.minValue ?? salaryValue.value);
    const rawMax = numericValue(salaryValue.maxValue) ?? rawMin;
    const hourly = /hour/i.test(unit);
    const min = rawMin ? (hourly ? rawMin * 2080 : rawMin) : null;
    const max = rawMax ? (hourly ? rawMax * 2080 : rawMax) : min;
    const salaryLabel = min
      ? hourly
        ? `$${rawMin?.toLocaleString()}${
            rawMax && rawMax !== rawMin ? `–$${rawMax.toLocaleString()}` : "+"
          }/hour`
        : `$${Math.round(min).toLocaleString()}${
            max && max !== min ? `–$${Math.round(max).toLocaleString()}` : "+"
          }`
      : salaryFromDescription(description).label;
    const fallbackSalary = salaryFromDescription(description);
    return [
      {
        id: stableJobId("jobvite", candidate.company, candidate.title),
        title: String(data.title ?? candidate.title),
        company: candidate.company,
        location: remote ? `Remote — ${locationText || "United States"}` : locationText,
        salaryLabel,
        salaryMin: min ?? fallbackSalary.min,
        salaryMax: max ?? fallbackSalary.max,
        postedAt: String(data.datePosted ?? new Date(0).toISOString()),
        employmentType: String(data.employmentType ?? "Full-time").replace(
          /FULL_TIME/i,
          "Full-time",
        ),
        description,
        url: candidate.url,
        source: "Jobvite",
        channel: inferChannel(description),
        experience: inferExperience(`${candidate.title} ${description}`),
        directApply: true,
        degreeRequired: inferDegree(description),
        verified: true,
      } satisfies Job,
    ];
  });
}

async function remotiveJobs(): Promise<Job[]> {
  const payload = (await fetchJson(
    "https://remotive.com/api/remote-jobs?category=customer-support&limit=100",
  )) as {
    jobs?: Array<Record<string, unknown>>;
  };
  return (payload.jobs ?? []).map((item) => {
    const title = String(item.title ?? "");
    const company = String(item.company_name ?? "Employer");
    const description = plainText(String(item.description ?? ""));
    const salaryLabel = String(item.salary ?? "").trim() || "Salary unavailable";
    const salary = parseSalary(salaryLabel);
    const url = String(item.url ?? "");
    return {
      id: stableJobId("remotive", company, title),
      title,
      company,
      location: String(item.candidate_required_location ?? "Remote"),
      salaryLabel,
      salaryMin: salary.min,
      salaryMax: salary.max,
      postedAt: String(item.publication_date ?? new Date().toISOString()),
      employmentType: String(item.job_type ?? "Full-time"),
      description,
      url,
      source: "Remotive",
      channel: inferChannel(description),
      experience: inferExperience(`${title} ${description}`),
      directApply: directApply(url),
      degreeRequired: inferDegree(description),
      verified: true,
    };
  });
}

async function jobicyJobs(): Promise<Job[]> {
  const payload = (await fetchJson(
    "https://jobicy.com/api/v2/remote-jobs?count=100&geo=usa&tag=support",
  )) as {
    jobs?: Array<Record<string, unknown>>;
  };
  return (payload.jobs ?? []).map((item) => {
    const title = String(item.jobTitle ?? "");
    const company = String(item.companyName ?? "Employer");
    const description = plainText(String(item.jobDescription ?? ""));
    const min = Number(item.annualSalaryMin ?? 0) || null;
    const max = Number(item.annualSalaryMax ?? 0) || null;
    const currency = String(item.salaryCurrency ?? "USD");
    const salaryLabel =
      min && currency === "USD"
        ? `$${min.toLocaleString()}${max ? `–$${max.toLocaleString()}` : "+"}`
        : "Salary unavailable";
    const url = String(item.url ?? "");
    return {
      id: stableJobId("jobicy", company, title),
      title,
      company,
      location: String(item.jobGeo ?? "Remote"),
      salaryLabel,
      salaryMin: min,
      salaryMax: max,
      postedAt: String(item.pubDate ?? new Date().toISOString()),
      employmentType: String(item.jobType ?? "Full-time"),
      description,
      url,
      source: "Jobicy",
      channel: inferChannel(description),
      experience: inferExperience(`${title} ${description}`),
      directApply: directApply(url),
      degreeRequired: inferDegree(description),
      verified: true,
    };
  });
}

async function arbeitnowJobs(): Promise<Job[]> {
  const payload = (await fetchJson(
    "https://www.arbeitnow.com/api/job-board-api",
  )) as {
    data?: Array<Record<string, unknown>>;
  };
  return (payload.data ?? [])
    .filter((item) => Boolean(item.remote))
    .map((item) => {
      const title = String(item.title ?? "");
      const company = String(item.company_name ?? "Employer");
      const description = plainText(String(item.description ?? ""));
      const url = String(item.url ?? "");
      return {
        id: stableJobId("arbeitnow", company, title),
        title,
        company,
        location: String(item.location ?? "Remote"),
        salaryLabel: "Salary unavailable",
        salaryMin: null,
        salaryMax: null,
        postedAt: String(item.created_at ?? new Date().toISOString()),
        employmentType: Array.isArray(item.job_types)
          ? String(item.job_types[0] ?? "Full-time")
          : "Full-time",
        description,
        url,
        source: "Arbeitnow",
        channel: inferChannel(description),
        experience: inferExperience(`${title} ${description}`),
        directApply: directApply(url),
        degreeRequired: inferDegree(description),
        verified: true,
      };
    });
}

function dedupe(jobs: Job[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.company}-${job.title}`.toLowerCase().replace(/\W/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function secondsUntilNextSixEastern() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const elapsed =
    Number(values.hour) * 3600 + Number(values.minute) * 60 + Number(values.second);
  const six = 6 * 3600;
  return elapsed < six ? six - elapsed : 24 * 3600 - elapsed + six;
}

export async function GET() {
  const sourceNames = [
    "Greenhouse",
    "Workday",
    "Lever",
    "Ashby",
    "SmartRecruiters",
    "Jobvite",
    "HiringCafe",
    "Built In",
    "Jobicy",
    "Arbeitnow",
    "Remotive",
  ];
  const settled = await Promise.allSettled([
    greenhouseJobs(),
    workdayJobs(),
    leverJobs(),
    ashbyJobs(),
    smartRecruitersJobs(),
    jobviteJobs(),
    hiringCafeJobs(),
    builtInJobs(),
    jobicyJobs(),
    arbeitnowJobs(),
    remotiveJobs(),
  ]);
  const liveJobs = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const jobs = dedupe(liveJobs.filter(eligible)).slice(0, 80);
  const live = jobs.length > 0;
  const maxAge = Math.max(300, secondsUntilNextSixEastern());

  return Response.json(
    {
      jobs: live ? jobs : PREVIEW_JOBS,
      mode: live ? "live" : "preview",
      lastUpdated: new Date().toISOString(),
      nextRefresh: "6:00 AM ET",
      sourcesChecked: settled.length,
      sourcesResponding: settled.filter((result) => result.status === "fulfilled")
        .length,
      sourceStatus: sourceNames.map((source, index) => ({
        source,
        responding: settled[index]?.status === "fulfilled",
      })),
    },
    {
      headers: {
        "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      },
    },
  );
}
