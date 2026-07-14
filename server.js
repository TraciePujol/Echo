const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 4173);
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const root = __dirname;

const sourceNames = {
  jira: "Jira",
  confluence: "Confluence",
  release: "Release Notes",
  momentum: "Momentum Logs",
};

const prototypeEvidence = {
  jira: [
    "ECHO-1248 (Fixed): Saved-card authorization fails after 5.12 deployment.",
    "PAY-883 (Resolved): Gateway token refresh causes duplicate authorization attempt.",
    "HELP-4421 (Open): Intermittent payment retry failures with no confirmed resolution.",
  ],
  confluence: [
    "Payment Authorization Troubleshooting runbook: temporary workaround and escalation criteria.",
  ],
  release: [
    "Payment Platform 5.12 Release Notes: hotfix for saved-card token validation and retry handling.",
    "Patch 5.12.2: authorization retry fix for the affected payment component.",
  ],
  momentum: [
    "Completed operational record: an approved payment-profile refresh restored service without a Jira ticket.",
    "Repeated-action record: saved-card token reset resolved matching symptoms several times; approval review is still required before self-service use.",
  ],
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function callOllama(messages, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 90_000);

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages,
        stream: false,
        format: options.json ? "json" : undefined,
        options: {
          temperature: options.temperature ?? 0.2,
          num_predict: options.numPredict || 500,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama returned ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data?.message?.content?.trim();
    if (!content) throw new Error("The local model returned an empty response.");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeResearch(value) {
  const allowedClassifications = new Set([
    "Known issue",
    "Likely duplicate",
    "Fixed",
    "Unresolved",
    "Undocumented gap",
    "Self-service candidate",
    "Needs investigation",
  ]);
  const classification = allowedClassifications.has(value.classification)
    ? value.classification
    : "Needs investigation";
  const confidenceNumber = Math.max(0, Math.min(100, Number(value.confidence) || 50));
  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.filter((item) => typeof item === "string" && item.trim()).slice(0, 4)
    : [];

  return {
    classification,
    confidence: `${Math.round(confidenceNumber)}%`,
    summary:
      typeof value.summary === "string" && value.summary.trim()
        ? value.summary.trim().slice(0, 900)
        : "The available prototype evidence is not strong enough for a confident classification.",
    recommendations:
      recommendations.length > 0
        ? recommendations
        : ["Review the available evidence and create a ticket if the issue cannot be safely resolved."],
  };
}

async function handleHealth(response) {
  try {
    const ollamaResponse = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(4_000) });
    if (!ollamaResponse.ok) throw new Error("Ollama is unavailable.");
    const data = await ollamaResponse.json();
    const models = Array.isArray(data.models) ? data.models.map((item) => item.name) : [];
    sendJson(response, 200, {
      ready: models.includes(ollamaModel),
      provider: "Ollama",
      model: ollamaModel,
      modelAvailable: models.includes(ollamaModel),
    });
  } catch (error) {
    sendJson(response, 503, {
      ready: false,
      provider: "Ollama",
      model: ollamaModel,
      error: "The local AI service is not reachable.",
    });
  }
}

async function handleResearch(request, response) {
  const body = await readJson(request);
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 8_000) : "";
  const sources = Array.isArray(body.sources)
    ? body.sources.filter((source) => sourceNames[source])
    : [];

  if (!query) return sendJson(response, 400, { error: "Enter something for Echo to research." });
  if (!sources.length) return sendJson(response, 400, { error: "Select at least one research source." });

  const evidence = sources.flatMap((source) =>
    prototypeEvidence[source].map((item) => `[${sourceNames[source]}] ${item}`),
  );
  const system = `You are ECHO AI, a cautious internal research assistant. Analyze only the supplied prototype evidence. Never claim that live Jira, Confluence, Release Notes, or Momentum systems were searched. Treat operational logs as evidence of what happened, not proof that an action is approved. Recommend no-ticket self-service only when the evidence explicitly says the action is approved, low risk, repeatable, and the current conditions match. Otherwise recommend review or ticket creation. Return JSON only with: classification, confidence (integer 0-100), summary, and recommendations (array of 2-4 concise actions). classification must be one of: Known issue, Likely duplicate, Fixed, Unresolved, Undocumented gap, Self-service candidate, Needs investigation.`;
  const user = `User request:\n${query}\n\nSelected sources:\n${sources.map((source) => sourceNames[source]).join(", ")}\n\nPrototype evidence:\n${evidence.join("\n")}`;

  const raw = await callOllama(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true, numPredict: 550 },
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The local model did not return a valid research result.");
  }

  sendJson(response, 200, {
    ...normalizeResearch(parsed),
    provider: "Ollama",
    model: ollamaModel,
    evidenceMode: "prototype",
  });
}

async function handleChat(request, response) {
  const body = await readJson(request);
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 4_000) : "";
  if (!question) return sendJson(response, 400, { error: "Enter a follow-up question." });

  const context = body.context && typeof body.context === "object" ? body.context : {};
  const system = `You are ECHO AI, a concise internal research assistant. Answer the follow-up using only the provided prototype research context. Make clear when evidence is simulated or incomplete. Do not invent live system access. Operational logs show what happened, not necessarily what is approved. Keep the answer under 130 words and give the safest useful next step.`;
  const user = `Research context:\n${JSON.stringify(context).slice(0, 8_000)}\n\nFollow-up question:\n${question}`;
  const reply = await callOllama(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.25, numPredict: 260 },
  );

  sendJson(response, 200, { reply, provider: "Ollama", model: ollamaModel });
}

function serveStatic(request, response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${path.resolve(root)}${path.sep}`) && filePath !== path.join(root, "index.html")) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Not found");
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") return await handleHealth(response);
    if (request.method === "POST" && url.pathname === "/api/research") return await handleResearch(request, response);
    if (request.method === "POST" && url.pathname === "/api/chat") return await handleChat(request, response);
    if (request.method === "GET" || request.method === "HEAD") return serveStatic(request, response, url.pathname);
    return sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error(`[ECHO] ${error.message}`);
    return sendJson(response, 500, {
      error: error.name === "AbortError" ? "The local AI request timed out." : error.message,
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`ECHO AI is running at http://127.0.0.1:${port}`);
  console.log(`Local brain: ${ollamaModel} through ${ollamaBaseUrl}`);
});
