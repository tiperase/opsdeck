import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const profile = {
  id: "opsdeck",
  name: "Opsdeck Control",
  version: "1.0.0",
  tagline: "Operational planning for product and support teams",
  description: "A focused MCP and A2A agent for runbooks, incident triage, rollout notes, and workflow scoring.",
  heroLabel: "Operations Profile",
  author: "dataweb",
  theme: {
    page: "#09111f",
    panel: "rgba(10, 17, 34, 0.82)",
    panelEdge: "rgba(96, 165, 250, 0.22)",
    accent: "#2563eb",
    accentSoft: "#60a5fa",
    glow: "rgba(37, 99, 235, 0.22)"
  },
  agents: {
    coordinator: (task) => `Coordinator sequenced the workstream for ${task}.`,
    auditor: (task) => `Auditor flagged the key operational risks for ${task}.`,
    closer: (task) => `Closer turned ${task} into a ready-to-ship checklist.`
  },
  tools: [
    {
      name: "build_runbook",
      description: "Build a runbook outline for a system or process.",
      inputSchema: { type: "object", properties: { system: { type: "string", description: "System, workflow, or process name" } }, required: ["system"] }
    },
    {
      name: "triage_incident",
      description: "Draft an incident triage note from a short report.",
      inputSchema: { type: "object", properties: { incident: { type: "string", description: "Incident description" } }, required: ["incident"] }
    },
    {
      name: "draft_status",
      description: "Draft a polished status update from raw notes.",
      inputSchema: { type: "object", properties: { update: { type: "string", description: "Raw update notes" } }, required: ["update"] }
    },
    {
      name: "workflow_score",
      description: "Score a workflow and suggest improvements.",
      inputSchema: { type: "object", properties: { workflow: { type: "string", description: "Workflow to evaluate" } }, required: ["workflow"] }
    },
    {
      name: "multi_agent",
      description: "Run the coordinator, auditor, and closer chain.",
      inputSchema: { type: "object", properties: { task: { type: "string", description: "Operational task to coordinate" } }, required: ["task"] }
    }
  ],
  prompts: [
    {
      name: "incident_review",
      description: "Prompt template for reviewing a live or recent incident.",
      arguments: [{ name: "severity", description: "Incident severity or urgency", required: false }]
    },
    {
      name: "launch_plan",
      description: "Prompt template for feature launch planning.",
      arguments: [{ name: "feature", description: "Feature or release name", required: false }]
    }
  ],
  skills: [
    { name: "incident_review", description: "Prompt template for reviewing a live or recent incident." },
    { name: "launch_plan", description: "Prompt template for feature launch planning." },
    { name: "build_runbook", description: "Build runbooks for systems, teams, and recurring workflows." },
    { name: "triage_incident", description: "Create fast incident triage notes from raw reports." },
    { name: "draft_status", description: "Turn rough updates into polished status communications." },
    { name: "workflow_score", description: "Score workflows and surface operational improvements." },
    { name: "release_readiness", description: "Assess if a release is ready to ship and what blocks it." },
    { name: "backlog_triage", description: "Sort work by urgency, dependency, and operational impact." },
    { name: "support_brief", description: "Summarize support conditions, queues, and team pressure." },
    { name: "root_cause_map", description: "Break incidents into likely root causes and signals." },
    { name: "postmortem_writer", description: "Draft clean postmortems with actions and owners." },
    { name: "sla_watch", description: "Track service levels and identify response-time risk." },
    { name: "escalation_plan", description: "Build escalation paths for urgent customer or system issues." },
    { name: "ops_checklist", description: "Generate execution checklists for repeatable operational tasks." },
    { name: "stakeholder_update", description: "Prepare targeted updates for leadership and partner teams." },
    { name: "qa_handoff", description: "Package release context into clear QA and validation handoffs." }
  ],
  resources: [
    {
      uri: "resource://opsdeck/queue-snapshot",
      name: "queue_snapshot",
      description: "Mock support and delivery queue overview.",
      mimeType: "application/json"
    },
    {
      uri: "resource://opsdeck/release-notes",
      name: "release_notes",
      description: "Recent release notes and follow-up tasks.",
      mimeType: "application/json"
    }
  ]
};

const memory = {};

function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  return `${protocol}://${req.get("host")}`;
}

function getSessionId(req) {
  return req.headers["x-session-id"] || "default";
}

function ensureSession(sessionId) {
  if (!memory[sessionId]) memory[sessionId] = [];
  return memory[sessionId];
}

function logEntry(sessionId, entry) {
  ensureSession(sessionId).push({ timestamp: Date.now(), ...entry });
}

function rpcSuccess(id, result) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }; }
function makeText(text) { return { content: [{ type: "text", text }] }; }

function buildAgentCard(req) {
  const baseUrl = getBaseUrl(req);
  return {
    name: profile.name,
    description: profile.description,
    url: `${baseUrl}/`,
    version: profile.version,
    author: profile.author,
    capabilities: ["mcp", "a2a", "tools", "prompts", "resources"],
    endpoints: { mcp: `${baseUrl}/mcp`, a2a: `${baseUrl}/a2a`, agentCard: `${baseUrl}/.well-known/agent-card.json` },
    skills: profile.skills
  };
}

function getOverview(req) {
  return {
    profile: profile.id,
    serverInfo: { name: profile.name, version: profile.version },
    protocol: "MCP over JSON-RPC 2.0",
    transport: { endpoint: `${getBaseUrl(req)}/mcp`, method: "POST", contentType: "application/json" },
    capabilities: { tools: {}, prompts: {}, resources: {} },
    tools: profile.tools,
    prompts: profile.prompts,
    resources: profile.resources
  };
}

function executeTool(toolName, args, sessionId) {
  logEntry(sessionId, { type: "tool", name: toolName, arguments: args });
  if (toolName === "build_runbook") return makeText(`Runbook for ${args.system}: detect, triage, communicate, remediate, verify, and close.`);
  if (toolName === "triage_incident") return makeText(`Incident triage: ${args.incident}. Severity candidate is medium-high with owner, timeline, and rollback path defined.`);
  if (toolName === "draft_status") return makeText(`Status draft: ${args.update}. Framed for leadership with highlights, blockers, and next milestones.`);
  if (toolName === "workflow_score") return makeText(`Workflow score for ${args.workflow}: 78/100. Main gains come from fewer handoffs and clearer exit criteria.`);
  if (toolName === "multi_agent") return makeText(["Opsdeck multi-agent run complete.", profile.agents.coordinator(args.task), profile.agents.auditor(args.task), profile.agents.closer(args.task)].join("\n"));
  throw new Error(`Unknown tool: ${toolName}`);
}

function getPrompt(promptName, args = {}) {
  if (promptName === "incident_review") {
    const severity = args.severity || "medium";
    return { description: "Incident review prompt.", messages: [{ role: "user", content: { type: "text", text: `Review a ${severity} incident. Include timeline, blast radius, owner actions, customer impact, and follow-up controls.` } }] };
  }
  if (promptName === "launch_plan") {
    const feature = args.feature || "the next release";
    return { description: "Launch planning prompt.", messages: [{ role: "user", content: { type: "text", text: `Build a launch plan for ${feature}. Include milestones, owners, rollback criteria, communication, and post-launch review.` } }] };
  }
  throw new Error(`Unknown prompt: ${promptName}`);
}

function readResource(uri) {
  if (uri === "resource://opsdeck/queue-snapshot") {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ support: { open: 18, urgent: 3, medianResponseMinutes: 12 }, delivery: { blocked: 2, atRisk: 4, plannedThisWeek: 9 } }, null, 2) }] };
  }
  if (uri === "resource://opsdeck/release-notes") {
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ releases: [
      { name: "billing-sync", status: "shipped", followUp: "monitor invoices" },
      { name: "mcp-console", status: "candidate", followUp: "final QA" }
    ] }, null, 2) }] };
  }
  throw new Error(`Unknown resource: ${uri}`);
}

function runA2A(agentName, task, sessionId) {
  const agent = profile.agents[agentName];
  if (!agent) throw new Error(`Unknown agent: ${agentName}`);
  logEntry(sessionId, { type: "a2a", agent: agentName, task });
  return { agent: agentName, result: agent(task || "default task"), status: "ok", profile: profile.id };
}

function handleRpc(req, res) {
  const body = req.body || {};
  const id = body.id ?? null;
  const method = body.method;
  const params = body.params || {};
  const sessionId = getSessionId(req);
  if (!method) return res.status(400).json(rpcError(id, -32600, "Missing JSON-RPC method"));

  try {
    if (method === "initialize") return res.json(rpcSuccess(id, { protocolVersion: "2024-11-05", capabilities: { tools: {}, prompts: {}, resources: {} }, serverInfo: { name: profile.name, version: profile.version }, instructions: "Use tools/list, prompts/list, and resources/list to inspect available capabilities." }));
    if (method === "ping") return res.json(rpcSuccess(id, {}));
    if (method === "notifications/initialized") return id === null ? res.status(202).end() : res.json(rpcSuccess(id, {}));
    if (method === "tools/list") return res.json(rpcSuccess(id, { tools: profile.tools }));
    if (method === "tools/call") return res.json(rpcSuccess(id, executeTool(params.name, params.arguments || {}, sessionId)));
    if (method === "prompts/list") return res.json(rpcSuccess(id, { prompts: profile.prompts }));
    if (method === "prompts/get") return res.json(rpcSuccess(id, getPrompt(params.name, params.arguments || {})));
    if (method === "resources/list") return res.json(rpcSuccess(id, { resources: profile.resources }));
    if (method === "resources/read") return res.json(rpcSuccess(id, readResource(params.uri)));
    return res.status(404).json(rpcError(id, -32601, `Method not found: ${method}`));
  } catch (error) {
    return res.status(400).json(rpcError(id, -32000, error instanceof Error ? error.message : "Internal error"));
  }
}

function buildUi() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${profile.name} is an AI-native operations control surface for release planning, incident coordination, and production execution." />
  <title>${profile.name} - AI Operations Control Surface</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --page: ${profile.theme.page};
      --panel: ${profile.theme.panel};
      --panel-edge: ${profile.theme.panelEdge};
      --accent: ${profile.theme.accent};
      --accent-soft: ${profile.theme.accentSoft};
      --glow: ${profile.theme.glow};
      --text: #eef4ff;
      --muted: #98abc9;
      --line: rgba(255, 255, 255, 0.09);
      --soft: rgba(255, 255, 255, 0.05);
      --hero: rgba(7, 13, 28, 0.74);
      --shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
    }

    * { box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: "Manrope", sans-serif;
      background:
        radial-gradient(circle at 15% 10%, var(--glow), transparent 30%),
        radial-gradient(circle at 85% 18%, rgba(255,255,255,0.05), transparent 24%),
        linear-gradient(180deg, rgba(255,255,255,0.02), transparent 18%),
        var(--page);
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(circle at center, black, transparent 82%);
      pointer-events: none;
      opacity: 0.24;
    }

    a { color: inherit; text-decoration: none; }

    .shell {
      position: relative;
      z-index: 1;
      width: min(1240px, calc(100% - 32px));
      margin: 0 auto;
      padding: 18px 0 48px;
    }

    .nav,
    .hero,
    .section,
    .tester {
      border: 1px solid var(--panel-edge);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)), var(--panel);
      box-shadow: var(--shadow);
    }

    .nav,
    .hero,
    .section,
    .tester,
    .mini-card,
    .surface-card,
    .skill-chip,
    .signal,
    .console-card {
      backdrop-filter: blur(14px);
    }

    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 16px 20px;
      border-radius: 22px;
      position: sticky;
      top: 12px;
      z-index: 5;
      background: rgba(8, 14, 27, 0.82);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-mark {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, var(--accent), var(--accent-soft));
      color: #07111d;
      font-family: "Space Grotesk", sans-serif;
      font-weight: 700;
    }

    .brand-text strong,
    .eyebrow,
    h1,
    h2,
    h3,
    .metric strong,
    .kpi strong {
      font-family: "Space Grotesk", sans-serif;
      letter-spacing: -0.03em;
    }

    .brand-text strong {
      display: block;
      font-size: 17px;
    }

    .brand-text span,
    .nav-links a,
    .subtext,
    p,
    .meta {
      color: var(--muted);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .nav-links a {
      font-size: 14px;
      transition: color 160ms ease;
    }

    .nav-links a:hover { color: var(--text); }

    .nav-cta,
    .primary-btn,
    .secondary-btn,
    button {
      border: 0;
      cursor: pointer;
      font: inherit;
      transition: transform 180ms ease, filter 180ms ease, border-color 180ms ease;
    }

    .nav-cta,
    .primary-btn,
    button {
      color: #07111d;
      background: linear-gradient(135deg, var(--accent), var(--accent-soft));
      font-weight: 800;
    }

    .nav-cta,
    .primary-btn,
    .secondary-btn,
    button {
      border-radius: 14px;
      padding: 12px 16px;
    }

    .secondary-btn {
      color: var(--text);
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--line);
    }

    .nav-cta:hover,
    .primary-btn:hover,
    .secondary-btn:hover,
    button:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
    }

    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 34px;
      margin-top: 18px;
      padding: 28px;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.06), transparent 36%),
        linear-gradient(180deg, rgba(7,13,28,0.78), rgba(7,13,28,0.38)),
        var(--hero);
    }

    .hero::after {
      content: "";
      position: absolute;
      right: -90px;
      top: -100px;
      width: 360px;
      height: 360px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(96,165,250,0.22), transparent 66%);
      pointer-events: none;
    }

    .hero-grid,
    .split,
    .surface-grid,
    .metric-grid,
    .skill-grid,
    .tester-grid,
    .footer-grid {
      display: grid;
      gap: 18px;
    }

    .hero-grid {
      grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      align-items: stretch;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 9px 13px;
      border-radius: 999px;
      border: 1px solid var(--panel-edge);
      background: rgba(255,255,255,0.05);
      color: var(--accent-soft);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    h1,
    h2,
    h3 {
      margin: 0;
      line-height: 0.96;
    }

    h1 {
      margin-top: 18px;
      font-size: clamp(44px, 7vw, 86px);
      max-width: 10ch;
    }

    .hero-copy p {
      max-width: 62ch;
      margin: 18px 0 0;
      font-size: 16px;
      line-height: 1.72;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 24px;
    }

    .hero-note {
      margin-top: 18px;
      font-size: 14px;
      color: var(--muted);
    }

    .hero-panel,
    .section,
    .tester,
    .console-card,
    .mini-card,
    .surface-card,
    .skill-chip,
    .signal {
      border-radius: 24px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
    }

    .hero-panel {
      padding: 18px;
      display: grid;
      gap: 14px;
      min-height: 100%;
    }

    .metric-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metric,
    .signal {
      padding: 16px;
      background: rgba(255,255,255,0.03);
    }

    .metric strong,
    .kpi strong {
      display: block;
      margin-top: 8px;
      font-size: 28px;
    }

    .signal-list {
      display: grid;
      gap: 12px;
    }

    .signal {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 16px;
    }

    .signal em {
      color: var(--accent-soft);
      font-style: normal;
      font-size: 13px;
    }

    .section,
    .tester {
      margin-top: 20px;
      padding: 24px;
    }

    .section-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .section-header p {
      max-width: 60ch;
      margin: 8px 0 0;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--line);
      color: var(--accent-soft);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      white-space: nowrap;
    }

    .split {
      grid-template-columns: 1.15fr 0.85fr;
    }

    .surface-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .surface-card {
      padding: 18px;
      min-height: 220px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .surface-card code,
    .console,
    .resource,
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .surface-card code,
    .resource {
      display: block;
      margin-top: 14px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,0,0,0.24);
      color: #d6def1;
      overflow-wrap: anywhere;
    }

    .mini-grid {
      display: grid;
      gap: 14px;
    }

    .mini-card {
      padding: 18px;
    }

    .skill-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .skill-chip {
      padding: 16px;
      min-height: 128px;
    }

    .skill-chip strong {
      display: block;
      margin-bottom: 8px;
      font-size: 16px;
    }

    .tester-grid {
      grid-template-columns: 280px minmax(0, 1fr);
      align-items: start;
    }

    .console-card {
      padding: 18px;
    }

    .toolbar {
      display: grid;
      gap: 10px;
    }

    button {
      text-align: left;
      padding: 14px 16px;
      border-radius: 16px;
    }

    pre {
      margin: 0;
      min-height: 320px;
      max-height: 520px;
      overflow: auto;
      padding: 18px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,0.30);
      color: #d7e0f5;
      line-height: 1.58;
    }

    .footer-grid {
      grid-template-columns: 1fr auto;
      margin-top: 16px;
      align-items: center;
      gap: 12px;
    }

    .footer-links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .footer-links a {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
    }

    @media (max-width: 1120px) {
      .hero-grid,
      .split,
      .tester-grid,
      .surface-grid,
      .skill-grid,
      .metric-grid,
      .footer-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .shell { width: min(100% - 20px, 1240px); }
      .nav { padding: 14px 16px; }
      .nav-links { display: none; }
      .hero,
      .section,
      .tester { padding: 18px; border-radius: 24px; }
      h1 { font-size: 46px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="nav">
      <div class="brand">
        <div class="brand-mark">OC</div>
        <div class="brand-text">
          <strong>${profile.name}</strong>
          <span>${profile.tagline}</span>
        </div>
      </div>
      <div class="nav-links">
        <a href="#surfaces">Surfaces</a>
        <a href="#skills">Skills</a>
        <a href="#console">Console</a>
      </div>
      <a class="nav-cta" href="#console">Launch tester</a>
    </nav>

    <section class="hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">${profile.heroLabel}</span>
          <h1>Operate launches, incidents, and delivery from one AI control surface.</h1>
          <p>${profile.description} Opsdeck packages MCP tools, A2A collaborators, and live operational context into a single environment that feels closer to a production desk than a demo page.</p>
          <div class="hero-actions">
            <a class="primary-btn" href="#console">Test live JSON-RPC</a>
            <a class="secondary-btn" href="/.well-known/agent-card.json">Open agent card</a>
          </div>
          <div class="hero-note">Built for release managers, support leads, and product operators who need clarity under pressure.</div>
        </div>

        <div class="hero-panel">
          <div class="metric-grid">
            <div class="metric">
              <span class="subtext">Skills</span>
              <strong>${profile.skills.length}</strong>
              <span class="meta">Operational workflows</span>
            </div>
            <div class="metric">
              <span class="subtext">Agents</span>
              <strong>${Object.keys(profile.agents).length}</strong>
              <span class="meta">Coordinator chain</span>
            </div>
            <div class="metric">
              <span class="subtext">MCP tools</span>
              <strong>${profile.tools.length}</strong>
              <span class="meta">Callable capabilities</span>
            </div>
            <div class="metric">
              <span class="subtext">Resources</span>
              <strong>${profile.resources.length}</strong>
              <span class="meta">Context surfaces</span>
            </div>
          </div>

          <div class="signal-list">
            <div class="signal">
              <div>
                <strong>Release readiness</strong>
                <div class="meta">Checklist health, blockers, rollback paths</div>
              </div>
              <em>live</em>
            </div>
            <div class="signal">
              <div>
                <strong>Incident coordination</strong>
                <div class="meta">Triage, escalation, postmortem, stakeholder updates</div>
              </div>
              <em>active</em>
            </div>
            <div class="signal">
              <div>
                <strong>Operator workflows</strong>
                <div class="meta">Runbooks, QA handoff, queue intelligence</div>
              </div>
              <em>ready</em>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="surfaces">
      <div class="section-header">
        <div>
          <span class="pill">Protocol surfaces</span>
          <h2>Everything the operations stack exposes.</h2>
          <p>Opsdeck presents the same primitives your scanners and agent clients care about, but in a more product-like surface with clearer route ownership.</p>
        </div>
      </div>

      <div class="surface-grid">
        <div class="surface-card">
          <div>
            <span class="pill">MCP</span>
            <h3>Machine-callable operations layer</h3>
            <p>Use JSON-RPC to initialize, list tools, call workflows, fetch prompts, and read context resources.</p>
          </div>
          <code>/mcp</code>
        </div>
        <div class="surface-card">
          <div>
            <span class="pill">A2A</span>
            <h3>Multi-agent execution path</h3>
            <p>Route work through the coordinator, auditor, and closer chain for operational decomposition.</p>
          </div>
          <code>/a2a</code>
        </div>
        <div class="surface-card">
          <div>
            <span class="pill">Metadata</span>
            <h3>Agent discovery card</h3>
            <p>Expose agent metadata, capability hints, and skill inventory for discovery tools and registries.</p>
          </div>
          <code>/.well-known/agent-card.json</code>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="split">
        <div>
          <div class="section-header">
            <div>
              <span class="pill">Capabilities</span>
              <h2>Workflow modules for operating teams.</h2>
            </div>
          </div>
          <div class="mini-grid">
            ${profile.tools.map((tool) => `<div class="mini-card"><span class="pill">Tool</span><h3>${tool.name}</h3><p>${tool.description}</p></div>`).join("")}
          </div>
        </div>

        <div>
          <div class="section-header">
            <div>
              <span class="pill">Context</span>
              <h2>Prompts and resources.</h2>
            </div>
          </div>
          <div class="mini-grid">
            ${profile.prompts.map((prompt) => `<div class="mini-card"><span class="pill">Prompt</span><h3>${prompt.name}</h3><p>${prompt.description}</p></div>`).join("")}
            ${profile.resources.map((resource) => `<div class="mini-card"><span class="pill">Resource</span><h3>${resource.name}</h3><p>${resource.description}</p><span class="resource">${resource.uri}</span></div>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="skills">
      <div class="section-header">
        <div>
          <span class="pill">Skill graph</span>
          <h2>Sixteen operational skills, arranged like a product stack.</h2>
          <p>The UI now foregrounds skills more clearly so scanners, humans, and partners can immediately see where the agent is useful.</p>
        </div>
      </div>
      <div class="skill-grid">
        ${profile.skills.map((skill) => `<div class="skill-chip"><strong>${skill.name}</strong><span class="meta">${skill.description}</span></div>`).join("")}
      </div>
    </section>

    <section class="tester" id="console">
      <div class="section-header">
        <div>
          <span class="pill">Live console</span>
          <h2>Test the runtime without leaving the page.</h2>
          <p>This keeps the old tester useful, but wraps it in a layout that feels closer to a real operations product.</p>
        </div>
      </div>

      <div class="tester-grid">
        <div class="console-card">
          <div class="toolbar">
            <button id="initializeBtn">Initialize MCP server</button>
            <button id="toolsBtn">List available tools</button>
            <button id="toolCallBtn">Call first tool</button>
            <button id="resourceBtn">Read first resource</button>
            <button id="a2aBtn">Run A2A collaborator</button>
          </div>
          <div class="footer-grid">
            <div class="footer-links">
              <a href="/mcp">View MCP endpoint</a>
              <a href="/resources/queue_snapshot">View resource</a>
            </div>
            <span class="meta">JSON-RPC + A2A ready</span>
          </div>
        </div>

        <pre id="output">Use the controls to inspect live MCP and A2A responses.</pre>
      </div>
    </section>
  </div>

  <script>
    const sampleToolArgs = {
      build_runbook: { system: "customer support escalation" },
      triage_incident: { incident: "API latency spike across billing" },
      draft_status: { update: "Launch stable, one blocker remains in payments" },
      workflow_score: { workflow: "release approval pipeline" },
      multi_agent: { task: "weekly launch review" }
    };

    async function postJson(body, endpoint) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      return response.json();
    }

    document.getElementById("initializeBtn").addEventListener("click", async function () {
      const data = await postJson({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "ui-tester", version: "1.0.0" }
        }
      }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("toolsBtn").addEventListener("click", async function () {
      const data = await postJson({ jsonrpc: "2.0", id: 2, method: "tools/list" }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("toolCallBtn").addEventListener("click", async function () {
      const firstTool = "build_runbook";
      const data = await postJson({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: firstTool, arguments: sampleToolArgs[firstTool] }
      }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("resourceBtn").addEventListener("click", async function () {
      const data = await postJson({
        jsonrpc: "2.0",
        id: 4,
        method: "resources/read",
        params: { uri: "resource://opsdeck/queue-snapshot" }
      }, "/mcp");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });

    document.getElementById("a2aBtn").addEventListener("click", async function () {
      const data = await postJson({ agent: "coordinator", task: "weekly launch review" }, "/a2a");
      document.getElementById("output").textContent = JSON.stringify(data, null, 2);
    });
  </script>
</body>
</html>`;
}

app.get("/.well-known/agent-card.json", (req, res) => { res.json(buildAgentCard(req)); });
app.get("/mcp", (req, res) => { res.json(getOverview(req)); });
app.post("/mcp", (req, res) => {
  if (req.body?.jsonrpc === "2.0") return handleRpc(req, res);
  const sessionId = getSessionId(req);
  try {
    const result = executeTool(req.body?.tool || profile.tools[0].name, req.body?.input || {}, sessionId);
    return res.json({ output: { profile: profile.id, result: result.content[0].text, agent: profile.name } });
  } catch {
    return res.status(400).json({ output: { profile: profile.id, result: "Recovered from error", agent: profile.name } });
  }
});
app.get("/resources/:resourceName", (req, res) => {
  const resource = profile.resources.find((item) => item.name === req.params.resourceName);
  if (!resource) return res.status(404).json({ error: "Resource not found" });
  return res.json(JSON.parse(readResource(resource.uri).contents[0].text));
});
app.post("/a2a", (req, res) => {
  try { res.json(runA2A(req.body?.agent, req.body?.task, getSessionId(req))); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "A2A failed" }); }
});
app.get("/", (req, res) => { res.send(buildUi()); });

export default app;
