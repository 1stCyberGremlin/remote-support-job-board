# Remote Support Job Board

A focused board for fully remote U.S. customer, product, technical, software,
and application support roles. The site is hosted with GitHub Pages at no cost.

## How it works

- Job listings refresh automatically every day at 6:00 AM Eastern.
- Search, salary, support-channel, direct-link, and degree filters run in the browser.
- Saved jobs, hidden jobs, applications, interviews, follow-ups, outcomes, and notes
  are stored privately in the visitor's browser.
- Clearing browser data or switching devices does not carry tracking data over.

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
```

The static site is generated in `out/` and deployed by the GitHub Actions workflow.
