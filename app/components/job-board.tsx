"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Job } from "../data/jobs";
import {
  GIG_CATEGORIES,
  GIG_OPPORTUNITIES,
  type GigCategory,
} from "../data/gigs";

type View =
  | "discover"
  | "gigs"
  | "saved"
  | "applications"
  | "interviews"
  | "hidden";
type Tracking = {
  id?: number;
  jobId: string;
  saved: boolean;
  hidden: boolean;
  status: string;
  notes: string;
  appliedAt: string | null;
  interviewAt: string | null;
  followUpAt: string | null;
  outcome: string;
};
type Application = {
  id: number;
  jobId: string | null;
  company: string;
  title: string;
  sourceUrl: string;
  status: string;
  appliedAt: string;
  interviewAt: string | null;
  followUpAt: string | null;
  outcome: string;
  notes: string;
};

const EMPTY_APPLICATION = {
  id: 0,
  jobId: "",
  company: "",
  title: "",
  sourceUrl: "",
  status: "applied",
  appliedAt: new Date().toISOString().slice(0, 10),
  interviewAt: "",
  followUpAt: "",
  outcome: "",
  notes: "",
};

const TRACKING_STORAGE_KEY = "remote-support-board.tracking.v1";
const APPLICATION_STORAGE_KEY = "remote-support-board.applications.v1";

function displayDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(displayDate(value));
}

function daysAgo(value: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
  );
  return days === 0 ? "Today" : `${days}d ago`;
}

function initials(company: string) {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function JobBoard() {
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());
  const [view, setView] = useState<View>("discover");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mode, setMode] = useState<"loading" | "live" | "preview">("loading");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [salaryFloor, setSalaryFloor] = useState(40000);
  const [includeUnknownSalary, setIncludeUnknownSalary] = useState(true);
  const [channels, setChannels] = useState<string[]>([]);
  const [directOnly, setDirectOnly] = useState(false);
  const [noDegree, setNoDegree] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tracking, setTracking] = useState<Record<string, Tracking>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [editingApplication, setEditingApplication] = useState<
    typeof EMPTY_APPLICATION
  >(EMPTY_APPLICATION);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [toast, setToast] = useState("");
  const [trackerOnline, setTrackerOnline] = useState(true);
  const [trackerLoaded, setTrackerLoaded] = useState(false);
  const [gigQuery, setGigQuery] = useState("");
  const [gigCategory, setGigCategory] = useState<"All" | GigCategory>("All");
  const [selfPacedOnly, setSelfPacedOnly] = useState(false);

  useEffect(() => {
    fetch("./jobs.json", { cache: "no-store" })
      .then((response) => response.json())
      .then((jobData) => {
        setJobs(jobData.jobs ?? []);
        setMode(jobData.mode === "live" ? "live" : "preview");
        setLastUpdated(jobData.lastUpdated ?? null);
      })
      .catch(() => {
        setMode("preview");
      });

    try {
      const savedTracking = window.localStorage.getItem(TRACKING_STORAGE_KEY);
      const savedApplications = window.localStorage.getItem(APPLICATION_STORAGE_KEY);
      if (savedTracking) setTracking(JSON.parse(savedTracking));
      if (savedApplications) setApplications(JSON.parse(savedApplications));
      setTrackerOnline(true);
    } catch {
      setTrackerOnline(false);
    } finally {
      setTrackerLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!trackerLoaded) return;
    try {
      window.localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(tracking));
      setTrackerOnline(true);
    } catch {
      setTrackerOnline(false);
    }
  }, [tracking, trackerLoaded]);

  useEffect(() => {
    if (!trackerLoaded) return;
    try {
      window.localStorage.setItem(
        APPLICATION_STORAGE_KEY,
        JSON.stringify(applications),
      );
      setTrackerOnline(true);
    } catch {
      setTrackerOnline(false);
    }
  }, [applications, trackerLoaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      const activity = tracking[job.id];
      if (view === "saved" && !activity?.saved) return false;
      if (view === "hidden" && !activity?.hidden) return false;
      if (view === "discover" && activity?.hidden) return false;
      const search = `${job.title} ${job.company} ${job.description}`.toLowerCase();
      if (query && !search.includes(query.toLowerCase())) return false;
      if (
        job.salaryMin !== null
          ? job.salaryMin < salaryFloor
          : !includeUnknownSalary
      )
        return false;
      if (channels.length && !channels.includes(job.channel)) return false;
      if (directOnly && !job.directApply) return false;
      if (noDegree && job.degreeRequired === true) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "salary") return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
      if (sort === "company") return a.company.localeCompare(b.company);
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  }, [
    jobs,
    tracking,
    view,
    query,
    salaryFloor,
    includeUnknownSalary,
    channels,
    directOnly,
    noDegree,
    sort,
  ]);

  const filteredGigs = useMemo(() => {
    const normalizedQuery = gigQuery.trim().toLowerCase();
    return GIG_OPPORTUNITIES.filter((gig) => {
      if (gigCategory !== "All" && gig.category !== gigCategory) return false;
      if (selfPacedOnly && gig.liveInteraction) return false;
      if (
        normalizedQuery &&
        !`${gig.platform} ${gig.title} ${gig.description} ${gig.category}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
        return false;
      return true;
    }).sort(
      (a, b) =>
        Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) ||
        a.platform.localeCompare(b.platform),
    );
  }, [gigCategory, gigQuery, selfPacedOnly]);

  const upcoming = applications
    .filter((item) => item.followUpAt || item.interviewAt)
    .sort((a, b) =>
      String(a.followUpAt ?? a.interviewAt).localeCompare(
        String(b.followUpAt ?? b.interviewAt),
      ),
    )
    .slice(0, 3);

  const appliedCount = applications.filter((item) =>
    ["applied", "interviewing", "offer"].includes(item.status),
  ).length;
  const interviewCount = applications.filter(
    (item) => item.status === "interviewing" || item.interviewAt,
  ).length;

  function saveTracking(jobId: string, patch: Partial<Tracking>) {
    const current = tracking[jobId] ?? {
      jobId,
      saved: false,
      hidden: false,
      status: "not_applied",
      notes: "",
      appliedAt: null,
      interviewAt: null,
      followUpAt: null,
      outcome: "",
    };
    const next = { ...current, ...patch };
    setTracking((items) => ({ ...items, [jobId]: next }));
  }

  function openApplication(job?: Job) {
    setEditingApplication({
      ...EMPTY_APPLICATION,
      jobId: job?.id ?? "",
      company: job?.company ?? "",
      title: job?.title ?? "",
      sourceUrl: job?.url ?? "",
    });
    setShowApplicationForm(true);
  }

  function editApplication(item: Application) {
    setEditingApplication({
      ...EMPTY_APPLICATION,
      ...item,
      jobId: item.jobId ?? "",
      interviewAt: item.interviewAt ?? "",
      followUpAt: item.followUpAt ?? "",
    });
    setShowApplicationForm(true);
  }

  function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const applicationPayload = {
      ...editingApplication,
      company: String(form.get("company") ?? ""),
      title: String(form.get("title") ?? ""),
      appliedAt: String(form.get("appliedAt") ?? ""),
      status: String(form.get("status") ?? "applied"),
      interviewAt: String(form.get("interviewAt") ?? ""),
      followUpAt: String(form.get("followUpAt") ?? ""),
      sourceUrl: String(form.get("sourceUrl") ?? ""),
      outcome: String(form.get("outcome") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };
    const item: Application = {
      ...applicationPayload,
      id: applicationPayload.id || Date.now(),
      jobId: applicationPayload.jobId || null,
      interviewAt: applicationPayload.interviewAt || null,
      followUpAt: applicationPayload.followUpAt || null,
    };
    setApplications((items) => {
      const exists = items.some((existing) => existing.id === item.id);
      return exists
        ? items.map((existing) => (existing.id === item.id ? item : existing))
        : [item, ...items];
    });
    if (item.jobId) {
      saveTracking(item.jobId, {
        saved: true,
        status: item.status,
        appliedAt: item.appliedAt,
        interviewAt: item.interviewAt,
        followUpAt: item.followUpAt,
      });
    }
    setShowApplicationForm(false);
    setToast(editingApplication.id ? "Application updated" : "Application added");
  }

  function deleteApplication(id: number) {
    setApplications((items) => items.filter((item) => item.id !== id));
    setToast("Application removed");
  }

  function toggleChannel(channel: string) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  const nav = [
    { id: "discover" as View, label: "Discover", icon: "⌕", count: jobs.length },
    {
      id: "gigs" as View,
      label: "Gigs & paid studies",
      icon: "✦",
      count: GIG_OPPORTUNITIES.length,
    },
    {
      id: "saved" as View,
      label: "Saved",
      icon: "♡",
      count: Object.values(tracking).filter((item) => item.saved).length,
    },
    {
      id: "applications" as View,
      label: "Applications",
      icon: "▣",
      count: applications.length,
    },
    {
      id: "interviews" as View,
      label: "Interviews",
      icon: "◇",
      count: interviewCount,
    },
    {
      id: "hidden" as View,
      label: "Hidden",
      icon: "⊘",
      count: Object.values(tracking).filter((item) => item.hidden).length,
    },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">RS</div>
          <div>
            <strong>Remote Support</strong>
            <span>Job Board</span>
          </div>
        </div>

        <nav aria-label="Job board sections">
          <p className="nav-label">Workspace</p>
          {nav.map((item) => (
            <button
              className={`nav-item ${view === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count > 0 && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <span className="pulse-dot" />
          <div>
            <strong>Daily search active</strong>
            <p>Next refresh at 6:00 AM ET</p>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">SB</div>
          <div>
            <strong>On-device tracker</strong>
            <span>{trackerOnline ? "Private to this browser" : "Storage unavailable"}</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{todayLabel}</p>
            <h1>
              {view === "discover" && "Find your next support role"}
              {view === "gigs" && "Flexible ways to earn"}
              {view === "saved" && "Saved opportunities"}
              {view === "applications" && "Application history"}
              {view === "interviews" && "Interviews & follow-ups"}
              {view === "hidden" && "Hidden listings"}
            </h1>
            <p className="subtitle">
              {view === "applications"
                ? "Track current and past applications with every important date."
                : view === "gigs"
                  ? "Vetted paid studies, testing panels, AI projects, and remote contract work."
                  : "Verified remote roles, filtered for the work you actually want."}
            </p>
          </div>
          <div className="header-actions">
            <span className={`data-status ${mode}`}>
              <i />
              {view === "gigs"
                ? `${GIG_OPPORTUNITIES.length} vetted platforms`
                : mode === "loading"
                  ? "Checking sources"
                  : mode === "live"
                    ? "Live listings"
                    : "Preview listings"}
            </span>
            {view !== "gigs" && (
              <button className="primary-button" onClick={() => openApplication()}>
                <span>＋</span> Add past application
              </button>
            )}
          </div>
        </header>

        {(view === "discover" || view === "saved" || view === "hidden") && (
          <>
            <section className="search-row">
              <label className="search-box">
                <span>⌕</span>
                <input
                  aria-label="Search jobs"
                  placeholder="Search title, company, or skill"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Clear search">
                    ×
                  </button>
                )}
              </label>
              <button
                className={`filter-button ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters((value) => !value)}
              >
                <span>☷</span> Filters
                {(channels.length + Number(directOnly) + Number(noDegree) > 0) && (
                  <b>{channels.length + Number(directOnly) + Number(noDegree)}</b>
                )}
              </button>
              <label className="sort-control">
                <span>Sort:</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="salary">Highest salary</option>
                  <option value="company">Company A–Z</option>
                </select>
              </label>
            </section>

            {showFilters && (
              <section className="filter-panel">
                <div>
                  <label htmlFor="salary">Minimum salary</label>
                  <strong>${salaryFloor.toLocaleString()}+</strong>
                  <input
                    id="salary"
                    type="range"
                    min="40000"
                    max="100000"
                    step="5000"
                    value={salaryFloor}
                    onChange={(event) => setSalaryFloor(Number(event.target.value))}
                  />
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={includeUnknownSalary}
                      onChange={(event) => setIncludeUnknownSalary(event.target.checked)}
                    />
                    Include salary unavailable
                  </label>
                </div>
                <div>
                  <label>Support channel</label>
                  <div className="chip-group">
                    {["Email/chat", "Ticket-based", "Mixed phone"].map((channel) => (
                      <button
                        key={channel}
                        className={channels.includes(channel) ? "selected" : ""}
                        onClick={() => toggleChannel(channel)}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-toggles">
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={directOnly}
                      onChange={(event) => setDirectOnly(event.target.checked)}
                    />
                    Direct employer links only
                  </label>
                  <label className="check-line">
                    <input
                      type="checkbox"
                      checked={noDegree}
                      onChange={(event) => setNoDegree(event.target.checked)}
                    />
                    No degree required
                  </label>
                </div>
              </section>
            )}

            <section className="dashboard-grid">
              <div className="job-column">
                <div className="result-heading">
                  <div>
                    <strong>{filteredJobs.length} matching roles</strong>
                    <span>
                      {lastUpdated
                        ? `Updated ${formatDate(lastUpdated)}`
                        : "Refreshing sources…"}
                    </span>
                  </div>
                  <div className="active-pills">
                    <span>Fully remote</span>
                    <span>U.S.</span>
                    <span>Posted ≤ 7 days</span>
                  </div>
                </div>

                {mode === "loading" && (
                  <div className="job-skeletons" aria-label="Loading jobs">
                    {[1, 2, 3].map((item) => (
                      <div className="skeleton-card" key={item} />
                    ))}
                  </div>
                )}

                {mode !== "loading" && filteredJobs.length === 0 && (
                  <div className="empty-state">
                    <div>⌕</div>
                    <h2>No roles match these filters</h2>
                    <p>Try lowering the salary floor or clearing a channel filter.</p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setSalaryFloor(40000);
                        setChannels([]);
                        setDirectOnly(false);
                        setNoDegree(false);
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                )}

                {filteredJobs.map((job) => {
                  const activity = tracking[job.id];
                  return (
                    <article
                      className="job-card"
                      key={job.id}
                      aria-labelledby={`job-title-${job.id}`}
                    >
                      <div className="job-card-head">
                        <div className="job-identity">
                          <div className="company-logo">{initials(job.company)}</div>
                          <div>
                            <div className="job-source-line">
                              <span className="verified-badge">✓ Verified</span>
                              <span>{job.source}</span>
                              <span>{daysAgo(job.postedAt)}</span>
                            </div>
                            <h2 id={`job-title-${job.id}`}>{job.title}</h2>
                            <p className="job-company-line">
                              <strong>{job.company}</strong>
                              <span aria-hidden="true">•</span>
                              <span>{job.location}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          className={`save-button ${activity?.saved ? "saved" : ""}`}
                          aria-label={activity?.saved ? "Remove saved job" : "Save job"}
                          onClick={() => {
                            saveTracking(job.id, { saved: !activity?.saved });
                            setToast(activity?.saved ? "Removed from saved" : "Job saved");
                          }}
                        >
                          {activity?.saved ? "♥" : "♡"}
                        </button>
                      </div>

                      <div className="job-highlights" aria-label="Job highlights">
                        <div className="job-highlight salary">
                          <span>Salary</span>
                          <strong>{job.salaryLabel}</strong>
                        </div>
                        <div className="job-highlight">
                          <span>Work type</span>
                          <strong>{job.employmentType}</strong>
                        </div>
                        <div className="job-highlight">
                          <span>Support style</span>
                          <strong>{job.channel}</strong>
                        </div>
                      </div>

                      <p className="job-description">{job.description}</p>

                      <div className="tag-row">
                        <span>{job.experience}</span>
                        {job.degreeRequired === false && <span>No degree required</span>}
                        {job.directApply && <span>Direct employer link</span>}
                      </div>

                      <div className="job-footer">
                        <span className="job-freshness">
                          Posted {daysAgo(job.postedAt).toLowerCase()}
                        </span>
                        <div className="card-actions">
                          <button
                            className="ghost-button"
                            onClick={() => {
                              saveTracking(job.id, { hidden: !activity?.hidden });
                              setToast(activity?.hidden ? "Listing restored" : "Listing hidden");
                            }}
                          >
                            {activity?.hidden ? "Restore" : "Hide"}
                          </button>
                          <button
                            className="apply-button"
                            onClick={() => {
                              if (job.preview) {
                                openApplication(job);
                              } else {
                                window.open(job.url, "_blank", "noopener,noreferrer");
                              }
                            }}
                          >
                            {job.preview ? "Track application" : "View & apply"} ↗
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="insight-column">
                <section className="insight-card snapshot-card">
                  <div className="section-title">
                    <h2>Today’s snapshot</h2>
                    <span>Last 7 days</span>
                  </div>
                  <div className="stat-grid">
                    <div>
                      <strong>{jobs.length}</strong>
                      <span>New matches</span>
                    </div>
                    <div>
                      <strong>{appliedCount}</strong>
                      <span>Active applications</span>
                    </div>
                    <div>
                      <strong>
                        {Object.values(tracking).filter((item) => item.saved).length}
                      </strong>
                      <span>Saved jobs</span>
                    </div>
                    <div>
                      <strong>{interviewCount}</strong>
                      <span>Interviews</span>
                    </div>
                  </div>
                </section>

                <section className="insight-card">
                  <div className="section-title">
                    <h2>Upcoming</h2>
                    <button onClick={() => setView("interviews")}>View all</button>
                  </div>
                  {upcoming.length ? (
                    <div className="upcoming-list">
                      {upcoming.map((item) => (
                        <button key={item.id} onClick={() => editApplication(item)}>
                          <span className="calendar-block">
                            <b>
                              {new Date(
                                `${item.followUpAt ?? item.interviewAt ?? ""}T12:00:00`,
                              ).getDate()}
                            </b>
                            {new Intl.DateTimeFormat("en-US", { month: "short" }).format(
                              displayDate(item.followUpAt ?? item.interviewAt ?? ""),
                            )}
                          </span>
                          <span>
                            <strong>
                              {item.followUpAt ? "Follow up" : "Interview"}
                            </strong>
                            <small>{item.company}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mini-empty">
                      <span>◇</span>
                      <p>No upcoming interviews or follow-ups yet.</p>
                    </div>
                  )}
                </section>

                <section className="insight-card source-card">
                  <div className="section-title">
                    <h2>Search quality</h2>
                  </div>
                  <ul>
                    <li>
                      <span>✓</span>
                      <div>
                        <strong>Scam-aware sources</strong>
                        <p>Greenhouse, Workday, Lever, Ashby + verified boards</p>
                      </div>
                    </li>
                    <li>
                      <span>↻</span>
                      <div>
                        <strong>Daily deduplication</strong>
                        <p>One clean card per role</p>
                      </div>
                    </li>
                    <li>
                      <span>⌁</span>
                      <div>
                        <strong>Direct links preferred</strong>
                        <p>No Indeed or Glassdoor results</p>
                      </div>
                    </li>
                  </ul>
                </section>
              </aside>
            </section>
          </>
        )}

        {view === "gigs" && (
          <section className="gigs-panel">
            <section className="gig-toolbar">
              <label className="search-box gig-search">
                <span>⌕</span>
                <input
                  aria-label="Search gigs and paid studies"
                  placeholder="Search paid studies, testing, AI work, or support gigs"
                  value={gigQuery}
                  onChange={(event) => setGigQuery(event.target.value)}
                />
                {gigQuery && (
                  <button onClick={() => setGigQuery("")} aria-label="Clear gig search">
                    ×
                  </button>
                )}
              </label>
              <label className="self-paced-toggle">
                <input
                  type="checkbox"
                  checked={selfPacedOnly}
                  onChange={(event) => setSelfPacedOnly(event.target.checked)}
                />
                Written / self-paced only
              </label>
            </section>

            <div className="gig-categories" aria-label="Gig categories">
              {GIG_CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={gigCategory === category ? "active" : ""}
                  onClick={() => setGigCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <section className="gig-safety">
              <div className="safety-icon">✓</div>
              <div>
                <strong>Official links only</strong>
                <p>
                  Every card links to the platform’s official website or official
                  hiring board. Never pay to apply, buy equipment with a check, or
                  move an application to Telegram or WhatsApp.
                </p>
              </div>
              <span>Reviewed July 30, 2026</span>
            </section>

            <div className="gig-result-heading">
              <div>
                <strong>{filteredGigs.length} vetted earning platforms</strong>
                <span>Availability and acceptance are never guaranteed.</span>
              </div>
              <div className="active-pills">
                <span>No signup fees</span>
                <span>Remote-first</span>
                <span>Official domains</span>
              </div>
            </div>

            {filteredGigs.length === 0 ? (
              <div className="empty-state">
                <div>⌕</div>
                <h2>No earning platforms match these filters</h2>
                <p>Clear the search or include opportunities with live interaction.</p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setGigQuery("");
                    setGigCategory("All");
                    setSelfPacedOnly(false);
                  }}
                >
                  Reset gig filters
                </button>
              </div>
            ) : (
              <div className="gig-grid">
                {filteredGigs.map((gig) => (
                  <article className="gig-card" key={gig.id}>
                    <div className="gig-card-top">
                      <div className="gig-logo">{initials(gig.platform)}</div>
                      <div>
                        <div className="verified-line">
                          <span>✓ Official platform</span>
                          {gig.recommended && <b>Strong match</b>}
                        </div>
                        <h2>{gig.title}</h2>
                        <p className="gig-platform">{gig.platform}</p>
                      </div>
                    </div>
                    <p className="gig-description">{gig.description}</p>
                    <div className="gig-details">
                      <div>
                        <span>Typical pay</span>
                        <strong>{gig.pay}</strong>
                      </div>
                      <div>
                        <span>Time</span>
                        <strong>{gig.commitment}</strong>
                      </div>
                      <div>
                        <span>Eligibility</span>
                        <strong>{gig.eligibility}</strong>
                      </div>
                    </div>
                    <div className="gig-tags">
                      <span>{gig.category}</span>
                      <span>{gig.interaction}</span>
                    </div>
                    <p className="gig-note">
                      <span>i</span>
                      {gig.note}
                    </p>
                    <div className="gig-card-footer">
                      <span>{gig.officialDomain}</span>
                      <a href={gig.url} target="_blank" rel="noopener noreferrer">
                        View opportunities ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {(view === "applications" || view === "interviews") && (
          <section className="applications-panel">
            <div className="application-stats">
              <div>
                <span>All applications</span>
                <strong>{applications.length}</strong>
              </div>
              <div>
                <span>Active</span>
                <strong>{appliedCount}</strong>
              </div>
              <div>
                <span>Interviewing</span>
                <strong>{interviewCount}</strong>
              </div>
              <div>
                <span>Offers</span>
                <strong>
                  {applications.filter((item) => item.status === "offer").length}
                </strong>
              </div>
            </div>

            <div className="table-card">
              <div className="table-title">
                <div>
                  <h2>
                    {view === "interviews"
                      ? "Interviews and follow-ups"
                      : "Current and past applications"}
                  </h2>
                  <p>
                    Application dates and notes stay private in this browser on this
                    device.
                  </p>
                </div>
                <button className="primary-button" onClick={() => openApplication()}>
                  ＋ Add application
                </button>
              </div>

              {applications.length === 0 ? (
                <div className="empty-state application-empty">
                  <div>▣</div>
                  <h2>No applications added yet</h2>
                  <p>Add past applications or track a job when you apply.</p>
                  <button className="secondary-button" onClick={() => openApplication()}>
                    Add your first application
                  </button>
                </div>
              ) : (
                <div className="application-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Date applied</th>
                        <th>Status</th>
                        <th>Interview</th>
                        <th>Follow-up</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {applications
                        .filter(
                          (item) =>
                            view !== "interviews" ||
                            item.interviewAt ||
                            item.followUpAt ||
                            item.status === "interviewing",
                        )
                        .map((item) => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.title}</strong>
                              <span>{item.company}</span>
                            </td>
                            <td>{formatDate(item.appliedAt)}</td>
                            <td>
                              <span className={`status-pill ${item.status}`}>
                                {item.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>{item.interviewAt ? formatDate(item.interviewAt) : "—"}</td>
                            <td>{item.followUpAt ? formatDate(item.followUpAt) : "—"}</td>
                            <td>
                              <button
                                className="row-action"
                                onClick={() => editApplication(item)}
                              >
                                Edit
                              </button>
                              <button
                                className="row-action danger"
                                onClick={() => deleteApplication(item.id)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
          >
            <span>{item.icon}</span>
            {item.id === "gigs" ? "Gigs" : item.label}
          </button>
        ))}
      </nav>

      {showApplicationForm && (
        <div className="modal-backdrop" onMouseDown={() => setShowApplicationForm(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Personal tracker</p>
                <h2 id="application-title">
                  {editingApplication.id ? "Update application" : "Add application"}
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowApplicationForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={submitApplication}>
              <div className="form-grid">
                <label>
                  Company
                  <input
                    name="company"
                    required
                    value={editingApplication.company}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        company: event.target.value,
                      }))
                    }
                    placeholder="Company name"
                  />
                </label>
                <label>
                  Job title
                  <input
                    name="title"
                    required
                    value={editingApplication.title}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Customer Support Specialist"
                  />
                </label>
                <label>
                  Date applied
                  <input
                    name="appliedAt"
                    required
                    type="date"
                    value={editingApplication.appliedAt}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        appliedAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    name="status"
                    value={editingApplication.status}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="no_response">No response</option>
                  </select>
                </label>
                <label>
                  Interview date
                  <input
                    name="interviewAt"
                    type="date"
                    value={editingApplication.interviewAt}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        interviewAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Follow-up date
                  <input
                    name="followUpAt"
                    type="date"
                    value={editingApplication.followUpAt}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        followUpAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="full-field">
                  Application link
                  <input
                    name="sourceUrl"
                    type="url"
                    value={editingApplication.sourceUrl}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        sourceUrl: event.target.value,
                      }))
                    }
                    placeholder="https://company.com/careers/role"
                  />
                </label>
                <label className="full-field">
                  Outcome or reason
                  <input
                    name="outcome"
                    value={editingApplication.outcome}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        outcome: event.target.value,
                      }))
                    }
                    placeholder="Optional outcome, recruiter feedback, or next step"
                  />
                </label>
                <label className="full-field">
                  Personal notes
                  <textarea
                    name="notes"
                    rows={4}
                    value={editingApplication.notes}
                    onChange={(event) =>
                      setEditingApplication((item) => ({
                        ...item,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Contacts, interview preparation, questions, or follow-up details"
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowApplicationForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save application
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
