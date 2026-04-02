import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AGENTS } from "../../agents/index";

const router: IRouter = Router();

const ANALYZE_SYSTEM = `You are an expert AI agent architect. Analyze a user's plain-language description of an AI agent system and extract structured architecture parameters.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "topology": one of: "single" | "orchestrator" | "cooperative" | "pipeline" | "competing" | "hybrid",
  "autonomy": one of: "fully_autonomous" | "approval_key" | "approval_all" | "advisory",
  "memory": one of: "stateless" | "session" | "persistent" | "knowledge_base",
  "failure": one of: "retry" | "escalate" | "graceful" | "fallback",
  "platform": one of: "aws" | "azure" | "gcp" | "onprem" | "none",
  "scaleRuns": one of: "occasional" | "regular" | "high" | "burst",
  "scaleConcurrent": one of: "serial" | "low_concurrency" | "high_concurrency",
  "greenfield": one of: "greenfield" | "brownfield" | "migration",
  "modelPref": one of: "none" | "anthropic" | "openai" | "google" | "open_source" | "multi_model",
  "budget": one of: "minimal" | "moderate" | "generous",
  "security": array of zero or more: "none" | "mfa_rbac" | "audit" | "e2e_encryption" | "gdpr" | "hipaa" | "soc2" | "pci" | "zero_trust",
  "inferredTools": array of strings (tool/integration names inferred from context),
  "gaps": array of field names you could NOT infer with confidence (use field keys above),
  "summary": a single sentence describing the system in technical terms
}

Rules:
- If the user mentions Azure, Entra ID, M365, Teams, SharePoint → platform = "azure"
- If the user mentions AWS, Lambda, S3, Bedrock → platform = "aws"
- If the user mentions GCP, Vertex, Gemini, Cloud Run → platform = "gcp"
- Multi-agent systems with coordination → topology = "orchestrator"
- If any human approval is needed → autonomy = "approval_key"
- Always infer security based on domain: healthcare → hipaa, payment → pci, EU data → gdpr, enterprise/B2B → soc2
- Include "mfa_rbac", "audit", "e2e_encryption" as baseline for any shared or multi-user system
- inferredTools should be specific names like "Slack", "Jira", "Azure AI Foundry", "Microsoft Graph API" etc.`;

const SYNTHESIS_SYSTEM = `You are the Lead Architect producing the final, definitive architecture specification for an agentic AI system. You have received independent reviews from a seven-specialist panel, each reviewing the proposed system through their own lens:

- 🔧 CI/CD Engineer — deployment pipelines, authentication, environment parity, trip hazards
- 🖥️ UI Architect — frontend architecture, rendering strategy, ADRs, budget-tier calibration
- ⚙️ DevOps Architect — IaC, orchestration, observability, release safety, platform maturity
- ✍️ Technical Writer — implementation clarity, terminology consistency, flagged gaps ([UNRESOLVED] items)
- 🛡️ SENTINEL — security baseline, threat model, versioned tool manifest, pipeline gate manifest
- ⚡ Performance Engineer — latency budgets, bottleneck hierarchy, performance verdicts (APPROVED/CONCERN/BLOCKING)
- 🔍 Skeptical Architect — adversarial review, overall verdict (APPROVE WITH NOTES / CONDITIONAL APPROVAL / REJECT), complexity budget, agentic-specific risks

## YOUR MANDATE

1. Synthesize all seven reviews into one authoritative, actionable specification — no vague language, no "it depends"
2. The Skeptical Architect's overall verdict sets the tone: if it's CONDITIONAL APPROVAL or REJECT, name the conditions or blockers and how you resolve them
3. Every BLOCKING verdict from the Performance Engineer must be addressed with a concrete resolution
4. Every [UNRESOLVED] item flagged by the Technical Writer must be either resolved with a specific answer or explicitly escalated as a known open risk
5. SENTINEL's pipeline gate manifest and security controls must appear verbatim — do not summarize them away
6. Where specialists conflict, state the conflict clearly, name who disagrees with whom, and make a called decision with rationale
7. Be specific: real tool names, real version numbers, real configuration choices
8. The output must be implementable by a mid-level engineer without further clarification — if it isn't, the Technical Writer has already flagged why

## OUTPUT STRUCTURE

# Architecture Specification

## Panel Verdict Summary
The Skeptical Architect's formal verdict. Any BLOCKING performance concerns. SENTINEL's highest-severity security flags. One paragraph synthesizing overall design confidence.

## Executive Summary
What this system does, for whom, the core architectural pattern, and the single constraint that dominates all others.

## Architecture Decision
Chosen topology and orchestration model. What was explicitly rejected and why. Complexity budget assessment.

## Component Roles & Responsibilities
Each agent/service: role, decision authority, inputs, outputs, failure behavior. Specific, not generic.

## Orchestration & Communication
Communication protocol, event flow, inter-agent message contracts, error propagation model.

## Memory & State Architecture
Memory tier, storage technology, retrieval strategy, context budget, state isolation across sessions.

## Autonomy & Human-in-the-Loop
Approval gates, escalation triggers, blast radius limits, override mechanisms, irreversible-action checkpoints.

## Tools & Integrations
Each integration: auth method, rate limits, failure modes, data contract, fallback behavior.

## Frontend Architecture
Framework, rendering strategy, state management, caching, routing, client/server boundary. Budget-tier calibrated.

## Security Architecture
SENTINEL's required controls by layer. Pipeline gate manifest (full, verbatim). Threat model summary. Compliance gaps flagged.

## Performance Architecture
Critical path latency analysis. Bottleneck hierarchy at 10x/100x load. Performance Engineer verdicts on key decisions. Caching strategy. LLM call efficiency.

## Deployment & Infrastructure
Platform, compute model, IaC toolchain, deployment strategy, environment tier strategy, cost model.

## Observability & Incident Response
Logging standards, metrics (p50/p95/p99), distributed tracing requirements, SLI/SLO targets, alerting philosophy, runbook requirements.

## Failure Handling & Resilience
Retry strategy, circuit breakers, timeout configurations, fallback paths, database migration approach.

## Resolved Specialist Conflicts
For each conflict: who disagreed, what they disagreed about, the decision made, and why. Do not skip conflicts — name them.

## Open Risks & Unresolved Items
Items flagged [UNRESOLVED] by the Technical Writer or open questions from the Skeptical Architect that could not be resolved from the provided context. Each tagged with risk severity.

## Trip Hazards
The non-obvious things that will bite the implementing engineer. Pulled directly from specialist reviews — CI/CD, DevOps, and Skeptical Architect surface the best ones. Be blunt. No softening.

## Implementation Roadmap
Phase 1 (launch-critical, ≤4 weeks), Phase 2 (stability and scale, ≤12 weeks), Phase 3 (maturity). What must be true before each phase begins.

## Architecture Decision Records
One ADR per major decision in this format — Context | Decision | Alternatives Rejected | Rationale | Consequences | Review Trigger. Minimum 6 ADRs.`;

const FIELD_LABELS: Record<string, Record<string, string>> = {
  topology: { single: "Single agent", orchestrator: "Orchestrator + subagents", cooperative: "Cooperative team", pipeline: "Sequential pipeline", competing: "Competing agents", hybrid: "Hybrid cooperative-competitive" },
  autonomy: { fully_autonomous: "Fully autonomous", approval_key: "HITL on key actions", approval_all: "Full HITL", advisory: "Advisory only" },
  memory: { stateless: "Stateless", session: "Session memory", persistent: "Persistent memory", knowledge_base: "Long-term knowledge base" },
  failure: { retry: "Retry with backoff", escalate: "Escalate to human", graceful: "Graceful degradation", fallback: "Fallback path" },
  platform: { aws: "AWS", azure: "Azure", gcp: "Google Cloud", onprem: "On-premises", none: "No preference" },
  scaleRuns: { occasional: "Occasional (1-10/day)", regular: "Regular (dozens-hundreds)", high: "High (thousands+)", burst: "Bursty" },
  scaleConcurrent: { serial: "Serial", low_concurrency: "Low concurrency (<10)", high_concurrency: "High concurrency (10+)" },
  greenfield: { greenfield: "Greenfield", brownfield: "Brownfield", migration: "Migration" },
  modelPref: { none: "No preference", anthropic: "Anthropic (Claude)", openai: "OpenAI", google: "Google (Gemini)", open_source: "Open source", multi_model: "Multi-model routing" },
  budget: { minimal: "Minimal / cost-first", moderate: "Moderate / balanced", generous: "Performance-first" },
};

function buildSpecContext(body: {
  description: string;
  answers: Record<string, string>;
  security: string[];
  tools: string[];
  constraints?: string;
  customAgents?: string;
  legacyDesc?: string;
  summary?: string;
}): string {
  const { description, answers, security, tools, constraints, customAgents, legacyDesc, summary } = body;
  const params = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${FIELD_LABELS[k]?.[v] ?? v}`)
    .join("\n");

  return `## System Description
${description}

${summary ? `## Summary\n${summary}\n` : ""}

## Architecture Parameters
${params}

## Security Requirements
${security.length ? security.join(", ") : "None specified"}

## Tools & Integrations
${tools.length ? tools.join(", ") : "None specified"}

${constraints ? `## Hard Constraints\n${constraints}\n` : ""}
${legacyDesc ? `## Existing Systems to Integrate\n${legacyDesc}\n` : ""}
${customAgents ? `## Additional Specialist Context\n${customAgents}\n` : ""}`.trim();
}

router.post("/analyze", async (req, res) => {
  const { description } = req.body as { description: string };

  if (!description || typeof description !== "string" || description.trim().length < 10) {
    res.status(400).json({ error: "description must be at least 10 characters" });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: ANALYZE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Analyze this AI agent system description and return the structured JSON:\n\n${description}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from Claude" });
      return;
    }

    const raw = block.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err: unknown) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: "Failed to analyze description" });
  }
});

// ---------------------------------------------------------------------------
// In-memory job store for polling-based generation
// (SSE doesn't work reliably through Replit's workspace proxy)
// ---------------------------------------------------------------------------

type AgentStatus = { status: "working" | "done"; name: string; icon: string };

interface GenerateJob {
  phase: "specialists" | "synthesis" | "done" | "error";
  agentStatuses: Record<string, AgentStatus>;
  content: string;
  done: boolean;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, GenerateJob>();

// Clean up jobs older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 5 * 60 * 1000);

async function runGenerateJob(jobId: string, body: {
  description: string;
  answers: Record<string, string>;
  security: string[];
  tools: string[];
  constraints?: string;
  customAgents?: string;
  legacyDesc?: string;
  summary?: string;
}) {
  const job = jobs.get(jobId)!;
  const specContext = buildSpecContext(body);

  try {
    job.phase = "specialists";

    const agentResults = await Promise.all(
      AGENTS.map(async (agent) => {
        job.agentStatuses[agent.id] = { status: "working", name: agent.name, icon: agent.icon };
        try {
          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: agent.systemPrompt,
            messages: [
              {
                role: "user",
                content: `Review this proposed AI agent architecture from your specialist perspective. Be specific, opinionated, and surface the things others will miss.\n\n${specContext}`,
              },
            ],
          });
          const block = msg.content[0];
          const text = block.type === "text" ? block.text : "";
          job.agentStatuses[agent.id] = { status: "done", name: agent.name, icon: agent.icon };
          return { agent, text };
        } catch (err) {
          console.error(`Agent ${agent.id} error:`, err);
          job.agentStatuses[agent.id] = { status: "done", name: agent.name, icon: agent.icon };
          return { agent, text: `[${agent.name} review unavailable]` };
        }
      })
    );

    job.phase = "synthesis";

    const specialistReviews = agentResults
      .map(({ agent, text }) => `## ${agent.icon} ${agent.name} Review\n\n${text}`)
      .join("\n\n---\n\n");

    const synthesisUserPrompt = `You have received specialist reviews of the following proposed architecture. Synthesize them into the final, definitive specification.

${specContext}

---

## Specialist Reviews

${specialistReviews}

---

Now produce the final architecture specification. Be opinionated. Make the calls. Resolve the conflicts. Surface the trip hazards.`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYNTHESIS_SYSTEM,
      messages: [{ role: "user", content: synthesisUserPrompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        job.content += event.delta.text;
      }
    }

    job.phase = "done";
    job.done = true;
  } catch (err: unknown) {
    console.error("Generate error:", err);
    job.phase = "error";
    job.error = "Failed to generate specification. Please try again.";
    job.done = true;
  }
}

// POST /generate — start a job, return jobId immediately
router.post("/generate", (req, res) => {
  const body = req.body as {
    description: string;
    answers: Record<string, string>;
    security: string[];
    tools: string[];
    constraints?: string;
    customAgents?: string;
    legacyDesc?: string;
    summary?: string;
  };

  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  jobs.set(jobId, {
    phase: "specialists",
    agentStatuses: {},
    content: "",
    done: false,
    createdAt: Date.now(),
  });

  // Fire and forget — client polls for updates
  void runGenerateJob(jobId, body);

  res.json({ jobId });
});

// GET /generate/:jobId — poll for current job state
router.get("/generate/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({
    phase: job.phase,
    agentStatuses: job.agentStatuses,
    content: job.content,
    done: job.done,
    error: job.error,
  });
});

export default router;
