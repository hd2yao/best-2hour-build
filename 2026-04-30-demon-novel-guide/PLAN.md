# PLAN

## MVP Scope

- Build a static, local-first webpage for the novel guide.
- Organize content as a dashboard workspace with a left navigation rail: overview, plot arcs, worldbuilding, characters, and locations/factions.
- Use expandable sections so the page does not dump the full long-form summary at once.
- Present characters in a filterable table with generated visual portraits, faction, role, keywords, and short descriptions.
- Include imagegen-generated visual assets for the redesign mockup and worldbuilding concept art.

## Non-Goals

- No dependency installation.
- No backend, database, analytics, telemetry, or network calls.
- No full-text novel reproduction.
- No exact chapter-by-chapter encyclopedia for all 2624 chapters in this first version.
- No external network image dependencies; imagegen assets are copied into the project under `assets/`.

## Acceptance Criteria

- `index.html` can be opened directly in a browser.
- Tabs switch without page reload.
- Plot arcs and worldbuilding entries can be expanded and collapsed.
- Character table supports faction filtering, search, and detail view.
- Top command-bar search filters both plot arcs and character rows.
- Layout works on desktop and mobile widths without text overlap.
- README includes run instructions and verification results.

## Likely Files

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `PLAN.md`
- `REVIEW.md`
- `docs/plans/2026-04-30-demon-novel-guide.md`
- `assets/design-mockup.png`
- `assets/world-concept.png`
