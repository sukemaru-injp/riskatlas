---
name: manage-task
description: Manage project tickets through tone MCP. Use when the user asks Codex to create a ticket, inspect or work from a taskId such as ta-xxxxxxxxxx, update ticket status, assign work, create subtasks, or close a ticket after implementation and approval. This skill coordinates tone task state with codebase investigation, todo planning, implementation verification, and requester confirmation.
---

# Manage Task

Use tone as the source of truth for project tickets. Coordinate ticket state with the actual repository state before creating, updating, or closing work.

## Tone Tools

Use the tone MCP tools when available:

| Operation | Tool |
| --- | --- |
| Discover workspace/list IDs | `mcp__tone.get_workspaces` |
| Discover users | `mcp__tone.get_users` |
| Read a ticket by ID | `mcp__tone.get_task_by_id` |
| Read list tasks | `mcp__tone.get_tasks` |
| Read assigned tasks | `mcp__tone.get_mytasks` |
| Create a ticket | `mcp__tone.create_task` |
| Create a subtask | `mcp__tone.create_sub_task` |
| Update status | `mcp__tone.update_task_status` |
| Update assignees | `mcp__tone.update_task_assignees` |

If tone tools are not currently loaded, use tool discovery for `tone` before falling back. Do not invent ticket data when tone is unavailable; explain the blocker and continue with local investigation if useful.

## Status Policy

Tone statuses are `TODO`, `DOING`, and `DONE`.

- Move a requested implementation task to `DOING` when starting real work on it.
- Keep tickets out of `DONE` until implementation is complete, relevant checks pass, and the requester explicitly approves closing the ticket.
- Do not close tickets just because code was edited. Summarize verification and ask for approval when needed.
- If work is blocked, leave the ticket in its current non-DONE state and report the blocker clearly.
- If a status update fails because IDs are missing, fetch the ticket or workspace metadata first; ask the user only when the target list/workspace cannot be inferred.

## Workflow: Existing Ticket

When the user provides `taskId: ta-xxxxx` or asks to work on a known ticket:

1. Fetch workspace metadata with `get_workspaces` if the workspace ID is not known.
2. Fetch the ticket with `get_task_by_id`.
3. Read the ticket title, description, status, list ID, teamspace ID, assignees, subtasks, and any acceptance criteria.
4. Inspect the relevant codebase state before planning. Use repository instructions, existing patterns, and fast searches such as `rg`.
5. Summarize the ticket and the current implementation state.
6. Organize a todo list that separates:
   - confirmed requirements,
   - codebase gaps,
   - verification steps,
   - open questions.
7. Move the ticket to `DOING` before implementing, unless it is already `DOING` or the user only asked for analysis.
8. Implement the work following the repository quality gates.
9. Run the narrowest relevant checks first, then broader checks when the change can affect shared behavior.
10. Report results and ask whether to close the ticket if requester approval has not already been given.
11. After approval, move the ticket to `DONE`.

## Workflow: Ticket Creation

When the user asks to create a ticket:

1. Clarify the target list/workspace only if it cannot be inferred from context or tone metadata.
2. Investigate the current codebase before writing the ticket. Do not create tickets based only on the user's desired outcome when implementation state is discoverable.
3. Compare the request with the repository state and identify the gap.
4. Ask targeted questions before creation when requirements, user-facing behavior, data model choices, rollout constraints, or design direction would materially affect the ticket.
5. Create the ticket with a concise title, preferably under 20 characters and always within tone's 50 character limit.
6. Write the description in Markdown with enough context for another engineer to execute:
   - Background
   - Current state
   - Required change
   - Acceptance criteria
   - Verification
   - Open questions, if any
7. Assign the ticket to the requester or current implementer when that is the project convention; otherwise ask or leave assignees explicit from the user's instruction.
8. Return the created task ID and a brief summary.

## Workflow: Status Update or Close

When the user asks to update status:

1. Fetch the ticket when list/teamspace/workspace IDs are not already known.
2. Confirm the requested transition is consistent with the project state.
3. Use `update_task_status` for `TODO`, `DOING`, or `DONE`.
4. For `DONE`, require completed implementation, passing relevant verification, and requester approval.
5. If the user asks to close a ticket before verification or approval, explain what is missing and ask whether they still want the status changed.

## Ticket Writing Guidelines

- Keep ticket titles action-oriented and specific.
- Put implementation detail in the description, not the title.
- Make acceptance criteria observable.
- Include verification commands or manual checks that should prove completion.
- Link to relevant files, routes, packages, or commands when they are known.
- Separate facts discovered from the codebase from assumptions and open questions.
- Prefer creating subtasks only when the parent ticket contains distinct deliverables that can be completed independently.

## Communication

- State when a ticket has been moved to `DOING` or `DONE`.
- Do not silently change ticket state.
- If local code changes and tone state diverge, call out the divergence and recommend the next state transition.
- Keep the requester in the loop when investigation changes the scope implied by the original ticket.
