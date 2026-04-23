# Global rules for codex

## Operating principles
- Prefer small, reviewable diffs. Avoid sweeping refactors unless explicitly requested.
- Before editing, identify the file(s) to change and state the plan in 3-6 bullets.
- Never invent APIs, configs, or file paths. If unsure, search the repo first.
- Keep changes consistent with existing style and architecture.

## Multi-project workspace rules
- This parent directory stores independent "today's 2-hour build" projects.
- For every new build, create a new subdirectory first and do all work inside it.
- Name new project directories as `YYYY-MM-DD-short-slug`, for example `2026-04-23-habit-timer`.
- Keep planning, review, and project-specific notes inside the project subdirectory.
- Each project should include at least `README.md`, `PLAN.md`, and `REVIEW.md` unless the user explicitly says otherwise.
- Do not install dependencies, create lockfiles, or generate build artifacts in the parent directory.
- Before implementation, summarize MVP scope, non-goals, acceptance criteria, and likely files to create or change.
- At completion, update the project `README.md` with run instructions, verification results, and current status.
- Treat each project subdirectory as the working boundary unless the user explicitly asks for cross-project changes.

## Safety and secrets
- Never paste secrets, tokens, private keys, .env values, or credentials into code or logs.
- If a task requires secrets, ask me to provide them via environment variables.
- Do not add analytics, telemetry, or network calls unless I ask.

## Code quality bar
- Add or update tests for behavior changes when the project has tests.
- Prefer type safety and explicit error handling.
- Add comments only when the intent is non-obvious.

## Build and run etiquette
- If you need to run commands, propose the exact command and why.
- When you make changes that may break build, run the fastest relevant check first.

## Commit strategy
- For code updates, commit in small and independent rollback units.
- Do not bundle unrelated changes into one commit.
- Finish one small change -> verify quickly -> commit, then continue.
- For short-lived prototypes, commit and PR gates apply after the subproject is initialized as a git repository or when the user explicitly asks for repository-backed delivery.

## Commit completion hard gate
- Do not end a coding turn with tracked file edits left uncommitted, unless the user explicitly asks to defer commit.
- Required end-of-work sequence for each independent change unit:
  1. Run the fastest relevant verification command(s).
  2. Run a focused code review on the diff.
  3. Commit immediately.
- Before final response for coding work, run `git status --short`.
- If tracked files from current task are still modified, either commit them or explicitly report the blocker and ask for user direction.
- Keep unrelated untracked files out of commits by default.
- If the current workspace is not a git repository, report that commit completion is not applicable.

## PR and merge completion gate
- For repository-backed code changes, do not treat local commit as completion.
- After commit, continue through the repository's integration flow: push branch, create or update PR, wait for required checks, and merge when gates pass.
- If the repository does not use PRs, or push/PR/merge cannot be completed, explicitly report the blocker and current state instead of claiming the task is finished.
- Before final response for repository-backed coding work, verify and report:
  1. commit SHA(s)
  2. branch pushed status
  3. PR status or blocker
  4. merge status or blocker
- Do not stop at "code committed" unless the user explicitly asks to stop before PR/merge.
- If the current workspace is not repository-backed, report that push, PR, and merge gates are not applicable.

## Conversation end gate
- Before ending any coding conversation, run a code review.
- If review finds blocking issues, do not end the conversation.
- Continue fixing and re-reviewing until all blocking issues are resolved.

## Output formatting
- For code changes: include a short summary + list of files changed.
- For debugging: include hypotheses, experiments run, and the minimal fix.

## My preferences
- I like concise explanations, concrete steps, and copy-pastable commands.
- Default language for explanations: Chinese.
