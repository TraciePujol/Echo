const jiraResults = [
  {
    key: "ECHO-1248",
    status: "Fixed",
    title: "Saved-card authorization fails after 5.12 deployment",
    reason:
      "Matches release version, payment component, and the saved-card authorization error.",
  },
  {
    key: "PAY-883",
    status: "Resolved",
    title: "Gateway token refresh causes duplicate authorization attempt",
    reason:
      "Similar error message and workaround referenced in support comments.",
  },
  {
    key: "HELP-4421",
    status: "Open",
    title: "Customers reporting intermittent payment retry failures",
    reason:
      "Recent support ticket with matching symptoms but no confirmed resolution.",
  },
];

const docResults = [
  {
    key: "Runbook",
    status: "Support",
    title: "Payment Authorization Troubleshooting",
    reason:
      "Contains the temporary workaround and escalation criteria for payment failures.",
  },
];

const releaseResults = [
  {
    key: "Release 5.12",
    status: "Hotfix",
    title: "Payment Platform 5.12 Release Notes",
    reason:
      "Mentions a hotfix for saved-card token validation and gateway retry handling.",
  },
  {
    key: "Patch 5.12.2",
    status: "Fixed",
    title: "Authorization Retry Patch Notes",
    reason:
      "References the fixed version and the affected payment authorization component.",
  },
];

const momentumResults = [
  {
    key: "Operation log",
    status: "Completed",
    title: "Payment profile refreshed without ticket creation",
    reason:
      "A support analyst used the approved profile-refresh procedure and restored service without creating Jira work.",
  },
  {
    key: "Repeated action",
    status: "Review",
    title: "Saved-card token reset appears in multiple successful sessions",
    reason:
      "The same low-risk action resolved matching symptoms several times and may be a candidate for a documented self-service runbook.",
  },
];

const states = {
  idle: {
    label: "READY TO RESEARCH",
    title: "ECHO is ready to research.",
    message:
      "Paste a draft ticket, Jira key, symptom, error, release question, or support request.",
    speech: "Hello, I’m Echo.\nWhat are you investigating?",
    image: "assets/echo-state-idle.png",
  },
  searching: {
    label: "SEARCHING SOURCES",
    title: "ECHO is checking the selected research sources.",
    message:
      "Use this state while APIs are loading, results are being ranked, and the classification is being prepared.",
    speech: "Checking the selected research sources...",
    image: "assets/echo-state-searching.png",
  },
  results: {
    label: "RESULTS READY",
    title: "ECHO found related history.",
    message:
      "Jira tickets, Confluence documentation, Release Notes, and Momentum operational history are ready for support review.",
    speech: "I found something you should see.",
    image: "assets/echo-state-results.png",
  },
  empty: {
    label: "NO STRONG MATCH",
    title: "ECHO did not find enough evidence yet.",
    message:
      "Use this state when the research does not surface a strong duplicate, known fix, or documented workaround.",
    speech: "I do not see a strong match yet.",
    image: "assets/echo-state-nomatch.png",
  },
  permission: {
    label: "PERMISSION NEEDED",
    title: "One or more sources need access.",
    message:
      "This state helps users understand when Jira, Confluence, or Release Notes access is missing or expired.",
    speech: "I may need access to one of the sources.",
    image: "assets/echo-state-permission.png",
  },
  error: {
    label: "CONNECTION ISSUE",
    title: "ECHO could not complete the search.",
    message:
      "Use this state for API failures, unavailable services, or unexpected source errors.",
    speech: "Something blocked the research request.",
    image: "assets/echo-state-error.png",
  },
};

let latestResearchContext = null;
let activeModel = "local model";
let demoMode = null;
let brainCheckPromise;

const demoScenarios = [
  {
    matches: /momentum|no[- ]ticket|simple fix|self[- ]service/i,
    classification: "Self-service candidate",
    confidence: "84%",
    summary: "Simulated Momentum history shows that this low-risk action has been completed successfully without a ticket when the same permissions and conditions apply.",
    recommendations: [
      "Confirm the user has the approved role and the same conditions shown in the operational log.",
      "Use the documented self-service steps instead of opening a ticket when every safeguard matches.",
      "Create a ticket if permissions, symptoms, or the expected result differ from the approved pattern.",
    ],
  },
  {
    matches: /duplicate|already|incoming/i,
    classification: "Likely duplicate",
    confidence: "76%",
    summary: "Simulated Jira history contains a closely related open issue with overlapping symptoms and component details.",
    recommendations: [
      "Compare the affected version and reproduction steps with the existing issue.",
      "Link or route the incoming request to the existing work if the details match.",
      "Open separate work only when the evidence shows a different cause or impact.",
    ],
  },
  {
    matches: /document|runbook|confluence|instructions/i,
    classification: "Undocumented gap",
    confidence: "69%",
    summary: "Simulated results show a repeatable resolution in operational history but no matching published runbook.",
    recommendations: [
      "Validate the resolution with the owning team before wider reuse.",
      "Draft a runbook with prerequisites, steps, expected results, and escalation conditions.",
      "Track documentation work if the fix is being repeated across teams.",
    ],
  },
  {
    matches: /payment|release|error|timeout|failed|version/i,
    classification: "Known issue",
    confidence: "82%",
    summary: "Simulated Jira and release-note evidence indicates a known issue with an available workaround and a version-specific fix.",
    recommendations: [
      "Confirm the affected version and error pattern before applying the workaround.",
      "Use the approved workaround while planning the documented upgrade or patch.",
      "Escalate if the symptom remains after the expected fix is present.",
    ],
  },
];

function renderCards(targetId, items) {
  const target = document.getElementById(targetId);
  target.innerHTML = items
    .map(
      (item) => `
        <article class="result-card">
          <div class="card-topline">
            <span class="key">${item.key}</span>
            <span class="status ${item.status === "Open" ? "open" : ""}">${item.status}</span>
          </div>
          <h4>${item.title}</h4>
          <p>${item.reason}</p>
        </article>
      `,
    )
    .join("");
}

function setState(stateName) {
  const state = states[stateName];
  if (!state) return;

  document.getElementById("state-label").textContent = state.label;
  document.getElementById("state-title").textContent = state.title;
  document.getElementById("state-message").textContent = state.message;
  document.getElementById("bot-speech").textContent = state.speech;
  document.getElementById("state-image").src = state.image;

  const preview = document.getElementById("state-preview");
  preview.className = `state-preview is-${stateName}`;

  document.querySelectorAll("[data-state]").forEach((button) => {
    button.classList.toggle("active", button.dataset.state === stateName);
  });
}

function setBrainStatus(state, text) {
  const status = document.getElementById("brain-status");
  status.className = `brain-status is-${state}`;
  document.getElementById("brain-status-text").textContent = text;
}

function enableDemoMode() {
  demoMode = true;
  activeModel = "simulated demo";
  document.getElementById("brain-status-label").textContent = "Online Demo";
  document.getElementById("demo-disclosure").hidden = false;
  setBrainStatus("demo", "Simulated research - safe for public demonstration");
}

function getDemoResearchResult(query) {
  return demoScenarios.find((scenario) => scenario.matches.test(query)) || {
    classification: "Needs investigation",
    confidence: "58%",
    summary: "The simulated evidence contains partial matches, but it is not strong enough to recommend avoiding or closing a ticket.",
    recommendations: [
      "Collect the affected version, exact symptom, timing, and reproduction details.",
      "Review the closest Jira, documentation, release, and Momentum matches with an analyst.",
      "Create or route a ticket when the issue cannot be safely resolved from approved history.",
    ],
  };
}

function showResearchResult(result, query, selectedLabels, sourceList, isDemo) {
  latestResearchContext = {
    query,
    sources: selectedLabels,
    classification: result.classification,
    confidence: result.confidence,
    summary: result.summary,
    recommendations: result.recommendations,
    evidenceMode: isDemo ? "online-demo" : result.evidenceMode,
  };

  document.getElementById("classification").textContent = result.classification;
  document.getElementById("confidence").textContent = result.confidence;
  document.getElementById("summary").textContent = result.summary;
  document.getElementById("recommendation-list").replaceChildren(
    ...result.recommendations.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }),
  );

  const resultState = result.classification === "Needs investigation" ? "empty" : "results";
  setState(resultState);
  document.getElementById("state-message").textContent = isDemo
    ? `Simulated analysis of demo evidence from ${sourceList} is ready for review.`
    : `Local-AI analysis of prototype evidence from ${sourceList} is ready for review.`;
}

async function requestJson(url, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed with ${response.status}.`);
  return data;
}

async function checkBrain() {
  try {
    const health = await requestJson("/api/health");
    activeModel = health.model || "local model";
    if (!health.ready) throw new Error(`${activeModel} is not available in Ollama.`);
    demoMode = false;
    document.getElementById("brain-status-label").textContent = "Local AI";
    document.getElementById("demo-disclosure").hidden = true;
    setBrainStatus("ready", `Ready - ${activeModel} through ${health.provider}`);
  } catch {
    enableDemoMode();
  }
}

async function runResearch(query) {
  if (demoMode === null) await brainCheckPromise;
  const trimmedQuery = query.trim();
  const selectedSources = Array.from(
    document.querySelectorAll('input[name="source"]:checked'),
    (input) => input.value,
  );

  if (!trimmedQuery) {
    setState("empty");
    document.getElementById("state-title").textContent = "Tell Echo what you are investigating.";
    document.getElementById("state-message").textContent =
      "Enter a Jira key, symptom, error, release question, or support request.";
    return;
  }

  if (!selectedSources.length) {
    document.querySelectorAll("[data-result-source]").forEach((column) => {
      column.hidden = true;
    });
    setState("empty");
    document.getElementById("state-title").textContent = "Select at least one research source.";
    document.getElementById("state-message").textContent =
      "Choose Jira, Confluence, Release Notes, or Momentum Logs before asking Echo to research.";
    document.getElementById("bot-speech").textContent = "Choose a source and I will check the history.";
    return;
  }

  const sourceLabels = {
    jira: "Jira",
    confluence: "Confluence",
    release: "Release Notes",
    momentum: "Momentum Logs",
  };
  const selectedLabels = selectedSources.map((source) => sourceLabels[source]);
  const sourceList = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(
    selectedLabels,
  );

  document.querySelectorAll("[data-result-source]").forEach((column) => {
    column.hidden = !selectedSources.includes(column.dataset.resultSource);
  });

  setState("searching");
  document.getElementById("state-title").textContent = `ECHO is checking ${sourceList}.`;
  document.getElementById("state-message").textContent = demoMode
    ? `The online demo is analyzing simulated evidence from ${sourceList}.`
    : `The local AI is analyzing prototype evidence from ${sourceList}.`;
  document.getElementById("bot-speech").textContent = `Thinking with ${activeModel}...`;
  setBrainStatus("thinking", demoMode ? "Analyzing simulated evidence..." : `Analyzing with ${activeModel}...`);

  const submitButton = document.querySelector('#research-form button[type="submit"]');
  submitButton.disabled = true;

  try {
    if (demoMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      const result = getDemoResearchResult(trimmedQuery);
      showResearchResult(result, trimmedQuery, selectedLabels, sourceList, true);
      setBrainStatus("demo", "Simulated result - no live company data used");
      return;
    }

    const result = await requestJson("/api/research", {
      query: trimmedQuery,
      sources: selectedSources,
    });
    activeModel = result.model || activeModel;
    showResearchResult(result, trimmedQuery, selectedLabels, sourceList, false);
    setBrainStatus("ready", `Live - ${activeModel} through ${result.provider}`);
  } catch (error) {
    setState("error");
    document.getElementById("state-title").textContent = "The local brain could not complete this request.";
    document.getElementById("state-message").textContent = error.message;
    document.getElementById("bot-speech").textContent = "The local AI needs attention before I can answer.";
    setBrainStatus("error", error.message);
  } finally {
    submitButton.disabled = false;
  }
}

function addChatMessage(sender, text) {
  const messages = document.getElementById("chat-messages");
  const message = document.createElement("div");
  message.className = `chat-message ${sender.toLowerCase()}`;
  const label = document.createElement("strong");
  label.textContent = sender;
  const content = document.createElement("p");
  content.textContent = text;
  message.append(label, content);
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}

async function askEcho(question) {
  if (demoMode === null) await brainCheckPromise;
  const trimmed = question.trim();
  if (!trimmed) return;

  addChatMessage("You", trimmed);
  const pendingMessage = addChatMessage("Echo", `Thinking with ${activeModel}...`);
  const pendingText = pendingMessage.querySelector("p");

  try {
    if (demoMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      const context = latestResearchContext;
      pendingText.textContent = context
        ? `Demo response: ${context.classification} (${context.confidence}). ${context.recommendations[0]} This is a simulated recommendation; verify it against approved live sources before acting.`
        : "Demo response: Run a research example first, then I can explain the simulated classification and next step. No live company data is being queried.";
      setBrainStatus("demo", "Simulated conversation - no live company data used");
      return;
    }

    setBrainStatus("thinking", `Answering with ${activeModel}...`);
    const result = await requestJson("/api/chat", {
      question: trimmed,
      context:
        latestResearchContext ||
        {
          evidenceMode: "prototype",
          note: "No research request has been completed in this session yet.",
        },
    });
    activeModel = result.model || activeModel;
    pendingText.textContent = result.reply;
    setBrainStatus("ready", `Live - ${activeModel} through ${result.provider}`);
  } catch (error) {
    pendingText.textContent = `I could not reach the local AI: ${error.message}`;
    setBrainStatus("error", error.message);
  }
}

document.getElementById("research-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = new FormData(event.currentTarget).get("query")?.toString() || "";
  void runResearch(query);
});

document.getElementById("query").addEventListener("focus", () => {
  document.getElementById("bot-speech").textContent =
    "Paste an issue — I’ll check the history.";
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.dataset.query;
    const input = document.getElementById("query");
    input.value = query;
    void runResearch(query);
  });
});

document.querySelectorAll("[data-state]").forEach((button) => {
  button.addEventListener("click", () => setState(button.dataset.state));
});

document.getElementById("chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  void askEcho(input.value);
  input.value = "";
});

document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
  button.addEventListener("click", () => void askEcho(button.dataset.chatPrompt));
});

renderCards("jira-results", jiraResults);
renderCards("doc-results", docResults);
renderCards("release-results", releaseResults);
renderCards("momentum-results", momentumResults);
setState("idle");
brainCheckPromise = checkBrain();
