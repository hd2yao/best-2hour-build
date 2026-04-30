# Demon Novel Guide Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static, browsable webpage that summarizes the novel's arcs, worldbuilding, factions, and characters without dumping the full text.

**Architecture:** A dependency-free static site with `index.html` for structure, `styles.css` for responsive presentation, and `app.js` for local data plus tab, accordion, search, filter, and detail-panel interactions. Documentation lives in the project root.

**Tech Stack:** HTML, CSS, vanilla JavaScript, local generated visual treatments.

---

### Task 1: Project Documentation

**Files:**
- Create: `/Users/dysania/program/best 2-hour build/2026-04-30-demon-novel-guide/README.md`
- Create: `/Users/dysania/program/best 2-hour build/2026-04-30-demon-novel-guide/PLAN.md`
- Create: `/Users/dysania/program/best 2-hour build/2026-04-30-demon-novel-guide/REVIEW.md`

**Steps:**
1. Document MVP scope, non-goals, files, run instructions, and verification plan.
2. Keep the documentation specific to this static webpage prototype.
3. Update `REVIEW.md` after implementation with manual review notes and residual risks.

### Task 2: Static Page Shell

**Files:**
- Create: `/Users/dysania/program/best 2-hour build/2026-04-30-demon-novel-guide/index.html`

**Steps:**
1. Add the top-level layout, tab controls, content containers, character detail dialog, and script/style links.
2. Keep all user-facing content in Chinese.
3. Ensure the first viewport is the usable guide dashboard, not a marketing hero.

### Task 3: Styling and Visual System

**Files:**
- Create: `/Users/dysania/program/best 2-hour build/2026-04-30-demon-novel-guide/styles.css`

**Steps:**
1. Build a restrained archive/database visual style with responsive grid, tables, accordions, and generated portraits.
2. Use stable dimensions for avatars, cards, tabs, and controls to avoid layout shifts.
3. Make mobile layout readable with no overlapping text.

### Task 4: Data and Interactions

**Files:**
- Create: `/Users/dysania/program/best 2-hour build/2026-04-30-demon-novel-guide/app.js`

**Steps:**
1. Add curated data for arcs, worldbuilding sections, location/faction cards, and character profiles.
2. Render tabs, accordions, filters, search, character table, visual panels, and a detail dialog.
3. Keep summaries concise but useful, with click-to-expand detail.

### Task 5: Verification

**Commands:**
- `node --check app.js`
- `python3 - <<'PY' ... PY` to confirm required files and references exist.
- `git diff --check`

**Expected:** JavaScript syntax passes, required files exist, no whitespace errors.
