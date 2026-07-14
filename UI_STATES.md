# ECHO AI UI States

ECHO AI should feel helpful, trustworthy, and calm across every user state. The assistant mascot can support the experience, but the interface should always keep evidence and next actions clear.

## Core States

### 1. Idle

Use when the user has not started a search.

Display:

- Welcoming assistant message
- Clear research input
- Example prompts
- Source toggles for Jira, Confluence, Release Notes, and Momentum Logs

User goal:

- Understand what they can paste or search.

### 2. Searching

Use while ECHO AI is querying Jira, Confluence, Release Notes, and Momentum operational logs.

Display:

- Loading indicator
- Source-by-source progress if available
- Calm message that research is in progress

User goal:

- Trust that the system is working.

### 3. Results Ready

Use when ECHO AI finds relevant evidence before a ticket is submitted or after an incoming ticket needs research review.

Display:

- Classification
- Confidence
- Similar Jira tickets
- Related Confluence documentation
- Related Release Notes
- Related Momentum actions and outcomes
- Recommended next steps
- Ticket submission or routing recommendation

User goal:

- Quickly narrow whether to resolve, link, escalate, document, or create new work.

### 4. No Strong Match

Use when search results are weak or missing.

Display:

- Clear explanation that no strong historical match was found
- Suggestions to broaden the query
- Recommendation to create a new Jira ticket if appropriate
- Evidence that no strong duplicate was found
- Prompt to document findings after review

User goal:

- Know what to do when history is not available.

### 5. Permission Needed

Use when one or more sources cannot be accessed.

Display:

- Which source has the access issue
- Plain-language reason
- Action to reconnect, request access, or retry

User goal:

- Understand whether the issue is with their access or the source system.

### 6. Error

Use when the search fails unexpectedly.

Display:

- Simple error message
- Source that failed if known
- Retry option
- Support or admin escalation path if needed

User goal:

- Recover without losing their query.

## Recommended State Model

```ts
type EchoResearchState =
  | "idle"
  | "searching"
  | "results"
  | "empty"
  | "permission"
  | "error";
```

## Design Notes

- Keep states short and useful.
- Never make users guess what happened.
- Preserve the user's query when errors occur.
- Always show evidence links when results are available.
- Make Release Notes visible as a first-class source in every relevant state.
- Treat Momentum history as evidence of what worked, not automatic proof that an action is approved.
- Recommend no-ticket self-service only when the logged action is approved, low-risk, and matches the current conditions and permissions.
- Use the assistant mascot to add warmth, not to replace evidence or instructions.
- Treat ECHO AI as the research step before Jira ticket submission whenever the user starts from a problem description.
- Treat ECHO AI as an incoming-ticket research assistant when the user starts from an existing Jira key or submitted ticket.
- Make it clear that ECHO AI supports the analyst; it does not replace the analyst's review, judgment, or ownership.
