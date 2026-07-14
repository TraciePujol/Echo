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
    setBrainStatus("ready", `Ready — ${activeModel} through ${health.provider}`);
  } catch (error) {
    setBrainStatus("error", error.message || "The local AI service is unavailable.");
  }
}

async function runResearch(query) {
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
  document.getElementById("state-message").textContent =
    `The local AI is analyzing prototype evidence from ${sourceList}.`;
  document.getElementById("bot-speech").textContent = `Thinking with ${activeModel}...`;
  setBrainStatus("thinking", `Analyzing with ${activeModel}...`);

  const submitButton = document.querySelector('#research-form button[type="submit"]');
  submitButton.disabled = true;

  try {
    const result = await requestJson("/api/research", {
      query: trimmedQuery,
      sources: selectedSources,
    });
    activeModel = result.model || activeModel;
    latestResearchContext = {
      query: trimmedQuery,
      sources: selectedLabels,
      classification: result.classification,
      confidence: result.confidence,
      summary: result.summary,
      recommendations: result.recommendations,
      evidenceMode: result.evidenceMode,
    };

    document.getElementById("classification").textContent = result.classification;
    document.getElementById("confidence").textContent = result.confidence;
    document.getElementById("summary").textContent = result.summary;
    const recommendationList = document.getElementById("recommendation-list");
    recommendationList.replaceChildren(
      ...result.recommendations.map((text) => {
        const item = document.createElement("li");
        item.textContent = text;
        return item;
      }),
    );

    const resultState = result.classification === "Needs investigation" ? "empty" : "results";
    setState(resultState);
    if (resultState === "results") {
      document.getElementById("state-message").textContent =
        `Local-AI analysis of prototype evidence from ${sourceList} is ready for review.`;
    }
    setBrainStatus("ready", `Live — ${activeModel} through ${result.provider}`);
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
  const trimmed = question.trim();
  if (!trimmed) return;

  addChatMessage("You", trimmed);
  const pendingMessage = addChatMessage("Echo", `Thinking with ${activeModel}...`);
  const pendingText = pendingMessage.querySelector("p");

  try {
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
    setBrainStatus("ready", `Live — ${activeModel} through ${result.provider}`);
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
void checkBrain();
