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

const SYNTHESIS_SYSTEM = `You are the lead architect responsible for producing the final, definitive architecture specification. You have received independent reviews from a panel of specialist engineers, each of whom has examined the proposed system from their own lens.

Your job is to:
1. Synthesize their findings into a single, highly opinionated, fully actionable architecture recommendation
2. Surface genuine conflicts between specialists and make a clear, justified call on each one
3. Be specific — name real technologies, real services, real libraries
4. Be opinionated — don't list options and say "it depends." Pick one and defend it
5. Preserve the specialists' most important warnings — especially trip hazards — verbatim or nearly so

Structure the output as follows:

# Architecture Specification

## Executive Summary
One tight paragraph. What this system does, the core architectural pattern chosen, and the single most important constraint driving the design.

## Architecture Decision
The chosen topology and orchestration pattern. Why this one. What was explicitly rejected and why.

## Agent Roles & Responsibilities
Each agent/component, its role, decision authority, inputs, and outputs. Be specific.

## Orchestration & Communication
How agents communicate. Protocol choices. Event flow. Error propagation model.

## Memory & State
Chosen memory tier, storage technology, retrieval strategy, context budget.

## Autonomy & Human-in-the-Loop
Approval gates, escalation triggers, blast radius limits, override mechanisms.

## Tools & Integrations
Each integration: auth method, rate limits, failure modes, data contract.

## Security Architecture
How each selected requirement is actually met. Not aspirations — specific controls.

## Deployment & Infrastructure
Platform, compute model, scaling, cold start, cost estimate.

## Failure Handling & Resilience
Retry strategy, circuit breakers, fallback paths, alert triggers.

## Evaluation & Observability
What good looks like. Metrics, evals, tracing, dashboards.

## Specialist Conflicts Resolved
Where specialists disagreed, what the conflict was, and the call made.

## Trip Hazards
The non-obvious things that will bite the implementing engineer. Pull from specialist reviews. Be blunt.

## Recommended Implementation Order
Phase 1 / Phase 2 / Phase 3. What to build first and why.

## Architecture Decision Records
4–6 key decisions as ADRs: Context | Decision | Alternatives Rejected | Rationale | Consequences.`;

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

router.post("/generate", async (req, res) => {
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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const specContext = buildSpecContext(body);

  try {
    // Phase 1: Run all specialist agents in parallel
    sendEvent({ phase: "specialists", message: `Consulting ${AGENTS.length} specialist${AGENTS.length !== 1 ? "s" : ""}...` });

    const agentResults = await Promise.all(
      AGENTS.map(async (agent) => {
        sendEvent({ agentStart: agent.id, agentName: agent.name, icon: agent.icon });
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
          sendEvent({ agentDone: agent.id, agentName: agent.name, icon: agent.icon });
          return { agent, text };
        } catch (err) {
          console.error(`Agent ${agent.id} error:`, err);
          sendEvent({ agentDone: agent.id, agentName: agent.name, icon: agent.icon });
          return { agent, text: `[${agent.name} review unavailable]` };
        }
      })
    );

    // Phase 2: Stream the synthesis
    sendEvent({ phase: "synthesis", message: "Synthesizing specialist reviews..." });

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
        sendEvent({ content: event.delta.text });
      }
    }

    sendEvent({ done: true });
    res.end();
  } catch (err: unknown) {
    console.error("Generate error:", err);
    sendEvent({ error: "Failed to generate spec" });
    res.end();
  }
});

export default router;
