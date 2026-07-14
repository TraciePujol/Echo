# ECHO AI MVP Plan

## Product Positioning

ECHO AI should feel like a practical ticket research console, not a chatbot-first toy. The core value is speed, evidence, and confidence: users should be able to paste a draft issue or incoming submitted ticket, scan the findings, and narrow down what the analyst should review next. It supports the work; it does not substitute for analyst judgment.

## MVP Personas

| Persona | Primary Need | Success Moment |
| --- | --- | --- |
| Business Analyst | Understand whether an issue is new or already known | Finds related tickets, release references, and documentation before creating duplicate work |
| Help Desk Agent | Resolve or route a support request faster | Gets a known workaround, release note, or linked issue in minutes |
| Support Engineer | Investigate recurring defects | Sees similar incidents, fix history, and affected components |
| Technical Writer | Find documentation gaps | Sees undocumented issues and pages needing updates |

## MVP Screens

### 1. Research Console

- Main search input
- Accepted input examples:
  - Draft ticket summary
  - Incoming Jira ticket key
  - Jira key
  - Issue title
  - Error text
  - Problem description
- Source toggles:
  - Jira
  - Confluence
  - Release notes
  - Momentum operational logs
- Search button

### 2. Results Summary

- Issue classification
- Confidence score
- Plain-language explanation
- Recommended next action

### 3. Related Jira Tickets

- Ticket key
- Summary
- Status
- Resolution
- Similarity reason
- Link to Jira

### 4. Related Documentation

- Page title
- Space
- Excerpt
- Relevance reason
- Link to Confluence

### 5. Release Notes

- Release/version
- Change summary
- Fixed issue references
- Known issue references
- Patch or hotfix notes
- Link to the release note source

### 6. Momentum Operational History

- Logged action and outcome
- User role or permission context when available
- Evidence that the action resolved the symptom
- Repeat frequency and recency
- Approved-procedure or review-needed status

### 7. Evidence and Next Steps

- Workarounds
- Fix notes
- Release references
- Suggested action checklist
- Ticket submission recommendation
- Approved no-ticket/self-service recommendation

### 8. Ticket Decision

- Create a new Jira ticket
- Route or review an incoming submitted ticket
- Link to an existing Jira ticket
- Use a known workaround
- Update Confluence documentation
- Submit an enhancement idea
- Escalate to an owning team

## Backend Services

### Search Orchestrator

Receives a user query and coordinates searches across Jira, Confluence, release notes, and Momentum operational logs.

Responsibilities:

- Normalize input
- Detect whether input is a Jira key, draft ticket, incoming submitted ticket, or free text
- Call Jira search
- Call Confluence search
- Call release notes search
- Call Momentum operational-log search
- Merge and deduplicate findings
- Return ranked results

### Jira Connector

Responsibilities:

- Fetch issue by key
- Search issues with JQL
- Retrieve comments, linked issues, components, labels, fix versions, and resolution
- Normalize Jira output

### Confluence Connector

Responsibilities:

- Search pages with CQL
- Retrieve page excerpts
- Prioritize known issue pages, troubleshooting docs, and support articles
- Normalize Confluence output

### Release Notes Connector

Responsibilities:

- Search release notes by version, component, date, fix ID, keyword, and error text
- Identify fixed versions, affected versions, patches, hotfixes, and known limitations
- Normalize release note entries into the same evidence format as Jira and Confluence results

### Ranking Engine

Initial ranking signals:

- Keyword overlap
- Shared component
- Shared labels
- Similar error messages
- Matching fix version or affected version
- Release note version references
- Patch or hotfix references
- Issue status and resolution
- Linked issue relationships
- Recency
- Documentation title and excerpt relevance
- Repeated successful Momentum actions
- Approval status and permission match for no-ticket procedures

### Classification Engine

Initial classification rules:

- **Duplicated:** high-similarity Jira ticket exists with duplicate links or matching summary/error.
- **Fixed:** related ticket has fixed, done, resolved, or released status with fix notes.
- **Known:** multiple related tickets, docs, or release notes mention the same behavior.
- **Unresolved:** related tickets exist but remain open, blocked, or unresolved.
- **Undocumented:** related tickets exist but no supporting Confluence documentation is found.
- **New ticket recommended:** no strong match exists and the issue has enough detail to submit.
- **Do not submit duplicate:** a high-confidence existing issue already covers the problem.
- **Self-service candidate:** an approved, low-risk Momentum action repeatedly resolved the same conditions without a ticket.

## Recommended Tech Stack

### Frontend

- React with Vite
- TypeScript
- Basic component library or custom lightweight styling

### Backend

- Python FastAPI
- Pydantic models
- Jira and Confluence REST APIs
- Environment-based configuration

### Optional Local AI Layer

- Local summarization model or internal approved model endpoint
- Use only after deterministic retrieval and ranking
- Keep source links and evidence visible

## Configuration Needed

Create environment variables for:

- `JIRA_BASE_URL`
- `JIRA_EMAIL` or service account username
- `JIRA_API_TOKEN`
- `CONFLUENCE_BASE_URL`
- `CONFLUENCE_EMAIL` or service account username
- `CONFLUENCE_API_TOKEN`
- `RELEASE_NOTES_SOURCE_URL` or internal release notes location

## First Prototype Data Shape

```json
{
  "query": "payment error after release 5.12",
  "classification": "Known",
  "confidence": 0.82,
  "summary": "Similar Jira tickets and release notes suggest this is a known issue introduced after release 5.12.",
  "recommendations": [
    "Link the current issue to ECHO-1248",
    "Apply the documented workaround from the release notes",
    "Update the troubleshooting page with the latest symptoms"
  ],
  "jiraResults": [],
  "confluenceResults": [],
  "releaseNoteResults": []
}
```

## Build Order

1. Build the static web interface with mock results.
2. Add backend API routes with mock service responses.
3. Add Jira search integration.
4. Add Confluence search integration.
5. Add release notes search integration.
6. Add ranking and classification rules.
7. Add optional summarization.
8. Add audit-friendly evidence links and exportable reports.
