# AnSci chat conventions for the AI agent

Read this file when working with the user through a conversational AI client.
It defines how the agent should interpret short follow-ups and how it should
leave each exchange ready for continued work. Repository commands and longer
work procedures live in `cmd.md`; Foundry's testbed contract lives in
`loop/FOUNDRY.md`.

## Keep work moving

- When a response concerns AnSci, Foundry, or ongoing repository work, finish
  with a concise recommendation for the next useful action. Name a concrete
  existing command or task when one applies. Do not append a recommendation if
  the user explicitly asks for none.
- If the user sends a message consisting of a single period (`.`), treat it as
  authorization to carry out the primary next action recommended in the
  immediately preceding assistant response. Continue the active task and its
  established scope; do not ask the user to repeat the recommendation. If the
  prior response offered several choices, the primary/recommended choice is
  selected. If no clear action was recommended, inspect `cmd.md` and the task
  tracker, then determine the smallest well-supported next action. Ask only if
  an essential choice, timeframe, or authorization is genuinely missing.
- Continue through dependent steps that are already authorized. Report useful
  progress during longer work, and update the Foundry tracker and progress
  record when the work changes task status or establishes new evidence.

## Commit and push shorthand

- If the user sends a message consisting of a single backtick character
  (U+0060, `` ` ``), interpret it as: **commit the completed changes for the
  current authorized task and push them to its configured upstream branch**.
- Before committing, inspect the branch, upstream, staged and unstaged diff,
  and repository status. Include only changes belonging to the authorized
  task. Preserve unrelated user changes; do not stage or commit them. If a
  coherent task change is not ready or checks reveal a problem, finish or
  report that issue before pushing.
- Run the relevant checks for the changes, commit with a clear message, then
  push to the configured upstream. Do not force-push, rewrite history, change
  branches, or push unrelated commits as part of this shorthand.
- If no uncommitted task changes exist, push the current task's already
  committed local commits when they are ahead of the configured upstream. If
  there is nothing to commit or push, say so plainly.
- Report the commit hash(es), push result and branch. If a repository or
  permission error prevents the push, preserve the commit and explain exactly
  what remains blocked. This shorthand applies because the user explicitly
  defined it; newer instructions in the conversation override it.

## Command guide

When the user invokes `cmd.md: ...`, follow the matching procedure in `cmd.md`.
After any command, recommend the most useful next command as described by its
“Next commands” tree, unless the user has asked to omit suggestions.
