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
  <title>${profile.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root{--page:#090603;--panel:rgba(19,12,5,.9);--panel-edge:rgba(255,179,71,.18);--accent:#ff9f1c;--accent-soft:#ffd166;--glow:rgba(255,159,28,.22);--text:#fffaf2;--muted:#d8c6a9;--line:rgba(255,255,255,.09)}
    *{box-sizing:border-box}
    body{margin:0;font-family:"Manrope",sans-serif;color:var(--text);background:radial-gradient(circle at top left,var(--glow),transparent 30%),radial-gradient(circle at 85% 20%,rgba(255,209,102,.08),transparent 18%),linear-gradient(180deg,rgba(255,255,255,.02),transparent 24%),var(--page);min-height:100vh;overflow-x:hidden}
    body::before{content:"";position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:42px 42px;mask-image:radial-gradient(circle at center,black,transparent 82%);pointer-events:none;opacity:.18}
    .shell{max-width:1200px;margin:0 auto;padding:24px;position:relative}
    .hero,.panel{border:1px solid var(--panel-edge);background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.02)),var(--panel);border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.34)}
    .hero{padding:30px;position:relative;overflow:hidden;animation:fadeUp .7s ease both}
    .hero::after,.hero::before{content:"";position:absolute;border-radius:999px;pointer-events:none}
    .hero::after{width:260px;height:260px;right:-80px;top:-80px;background:radial-gradient(circle,var(--glow),transparent 65%);animation:floatOrb 7s ease-in-out infinite}
    .hero::before{width:180px;height:180px;left:-30px;bottom:-50px;background:radial-gradient(circle,rgba(255,209,102,.12),transparent 70%);animation:floatOrb 9s ease-in-out infinite reverse}
    .eyebrow,.badge,.logo-chip{display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;border:1px solid var(--panel-edge);color:var(--accent-soft);background:rgba(255,255,255,.05);font-size:12px;text-transform:uppercase;letter-spacing:.12em}
    h1,h2{margin:0;font-family:"Space Grotesk",sans-serif;letter-spacing:-.03em}
    h1{margin-top:16px;font-size:clamp(40px,8vw,74px);line-height:.95;max-width:11ch}
    p{color:var(--muted);line-height:1.7}
    .hero-grid,.main-grid,.stats,.endpoints,.logo-row{display:grid;gap:18px}
    .hero-grid{grid-template-columns:1.3fr .9fr;align-items:end}
    .main-grid{grid-template-columns:1.15fr .85fr;margin-top:24px}
    .stats,.endpoints{grid-template-columns:repeat(2,minmax(0,1fr))}
    .logo-row{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:22px}
    .panel{padding:22px;animation:fadeUp .8s ease both}
    .panel:nth-of-type(2){animation-delay:.08s}.panel:nth-of-type(3){animation-delay:.16s}.panel:nth-of-type(4){animation-delay:.24s}
    .card,.endpoint,.logo-tile{border-radius:22px;border:1px solid var(--line);background:rgba(255,255,255,.03);padding:18px;transform:translateY(0);transition:transform .22s ease,border-color .22s ease,background .22s ease}
    .card:hover,.endpoint:hover,.logo-tile:hover,.item:hover{transform:translateY(-4px);border-color:rgba(255,209,102,.34);background:rgba(255,255,255,.05)}
    .card strong,.endpoint strong,.logo-mark{display:block;margin-top:10px;font-size:24px;font-family:"Space Grotesk",sans-serif}
    .logo-tile{display:flex;align-items:center;gap:14px;animation:pulseGlow 4s ease-in-out infinite}
    .logo-mark{margin:0;width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-soft));color:#281100;font-size:14px;box-shadow:0 10px 24px rgba(255,159,28,.22)}
    .list{display:grid;gap:12px}
    .item{padding:14px 16px;border-radius:18px;border:1px solid var(--line);background:rgba(255,255,255,.03);transition:transform .2s ease,border-color .2s ease,background .2s ease}
    .item strong{display:block;margin-bottom:6px}
    .endpoint code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .endpoint code{display:block;margin-top:10px;padding:12px;border-radius:14px;background:rgba(0,0,0,.26);overflow-wrap:anywhere;color:#ffe7b8}
    .toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
    button{border:0;cursor:pointer;border-radius:14px;padding:12px 16px;font:inherit;font-weight:800;color:#2a1400;background:linear-gradient(135deg,var(--accent),var(--accent-soft));box-shadow:0 10px 26px rgba(255,159,28,.18)}
    button:hover{transform:translateY(-2px);filter:brightness(1.03)}
    pre{margin:14px 0 0;min-height:260px;max-height:420px;overflow:auto;padding:16px;border-radius:18px;background:rgba(0,0,0,.34);color:#ffe8c5;border:1px solid rgba(255,209,102,.12)}
    .section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
    .section-copy{margin:0 0 18px;max-width:52ch}
    @keyframes floatOrb{0%,100%{transform:translateY(0)}50%{transform:translateY(16px)}}
    @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 rgba(255,159,28,0)}50%{box-shadow:0 0 0 1px rgba(255,209,102,.05),0 18px 34px rgba(255,159,28,.1)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @media (max-width:980px){.hero-grid,.main-grid,.stats,.endpoints,.logo-row{grid-template-columns:1fr}}
    @media (max-width:640px){.shell{padding:16px}h1{font-size:42px}.hero,.panel{border-radius:24px}}
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="eyebrow">${profile.heroLabel}</span>
          <h1>${profile.name}</h1>
          <p>${profile.description}</p>
          <div class="logo-row">
            <div class="logo-tile"><div class="logo-mark">OC</div><div><span class="logo-chip">Core</span><p>Ops control</p></div></div>
            <div class="logo-tile"><div class="logo-mark">MCP</div><div><span class="logo-chip">Protocol</span><p>JSON-RPC surface</p></div></div>
            <div class="logo-tile"><div class="logo-mark">A2A</div><div><span class="logo-chip">Agents</span><p>Coordinator chain</p></div></div>
            <div class="logo-tile"><div class="logo-mark">OPS</div><div><span class="logo-chip">Runtime</span><p>Release desk</p></div></div>
          </div>
        </div>
        <div class="stats">
          <div class="card"><span class="badge">Tools</span><strong>${profile.tools.length}</strong><p>Callable MCP capabilities</p></div>
          <div class="card"><span class="badge">Prompts</span><strong>${profile.prompts.length}</strong><p>Prompt templates for repeatable work</p></div>
          <div class="card"><span class="badge">Resources</span><strong>${profile.resources.length}</strong><p>Readable context sources</p></div>
          <div class="card"><span class="badge">Agents</span><strong>${Object.keys(profile.agents).length}</strong><p>Internal A2A collaborators</p></div>
        </div>
      </div>
    </section>

    <section class="main-grid">
      <div class="panel">
        <div class="section-title"><h2>Capabilities</h2><span class="badge">MCP</span></div>
        <p class="section-copy">Operational workflows built for launches, incident response, triage, and post-release coordination.</p>
        <div class="list">${profile.tools.map((tool) => `<div class="item"><strong>${tool.name}</strong><p>${tool.description}</p></div>`).join("")}</div>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Endpoints</h2><span class="badge">Live</span></div>
        <p class="section-copy">Route scanners and clients into the correct Opsdeck surfaces.</p>
        <div class="endpoints">
          <div class="endpoint"><span class="badge">MCP</span><code>/mcp</code></div>
          <div class="endpoint"><span class="badge">A2A</span><code>/a2a</code></div>
          <div class="endpoint"><span class="badge">Agent Card</span><code>/.well-known/agent-card.json</code></div>
          <div class="endpoint"><span class="badge">Resource</span><code>/resources/queue_snapshot</code></div>
        </div>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Prompts and Resources</h2><span class="badge">Context</span></div>
        <p class="section-copy">Reusable operator context for reviews, launch prep, and support intelligence.</p>
        <div class="list">${profile.prompts.map((prompt) => `<div class="item"><strong>${prompt.name}</strong><p>${prompt.description}</p></div>`).join("")}${profile.resources.map((resource) => `<div class="item"><strong>${resource.name}</strong><p>${resource.uri}</p></div>`).join("")}</div>
      </div>

      <div class="panel">
        <div class="section-title"><h2>Interactive Tester</h2><span class="badge">JSON-RPC</span></div>
        <p class="section-copy">Test the runtime directly from the landing page without changing the current structure.</p>
        <div class="toolbar"><button id="initializeBtn">Initialize</button><button id="toolsBtn">Tools List</button><button id="toolCallBtn">Call First Tool</button><button id="resourceBtn">Read First Resource</button><button id="a2aBtn">Run A2A</button></div>
        <pre id="output">Use the tester to inspect MCP and A2A responses.</pre>
      </div>
    </section>
  </div>
  <script>const sampleToolArgs={build_runbook:{system:"customer support escalation"},triage_incident:{incident:"API latency spike across billing"},draft_status:{update:"Launch stable, one blocker remains in payments"},workflow_score:{workflow:"release approval pipeline"},multi_agent:{task:"weekly launch review"}};async function postJson(body,endpoint){const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return response.json()}document.getElementById("initializeBtn").addEventListener("click",async function(){const data=await postJson({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"ui-tester",version:"1.0.0"}}},"/mcp");document.getElementById("output").textContent=JSON.stringify(data,null,2)});document.getElementById("toolsBtn").addEventListener("click",async function(){const data=await postJson({jsonrpc:"2.0",id:2,method:"tools/list"},"/mcp");document.getElementById("output").textContent=JSON.stringify(data,null,2)});document.getElementById("toolCallBtn").addEventListener("click",async function(){const firstTool="build_runbook";const data=await postJson({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:firstTool,arguments:sampleToolArgs[firstTool]}},"/mcp");document.getElementById("output").textContent=JSON.stringify(data,null,2)});document.getElementById("resourceBtn").addEventListener("click",async function(){const data=await postJson({jsonrpc:"2.0",id:4,method:"resources/read",params:{uri:"resource://opsdeck/queue-snapshot"}},"/mcp");document.getElementById("output").textContent=JSON.stringify(data,null,2)});document.getElementById("a2aBtn").addEventListener("click",async function(){const data=await postJson({agent:"coordinator",task:"weekly launch review"},"/a2a");document.getElementById("output").textContent=JSON.stringify(data,null,2)});</script></body></html>`;
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
