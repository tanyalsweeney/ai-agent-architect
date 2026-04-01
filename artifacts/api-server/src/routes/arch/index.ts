import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

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

const GENERATE_SYSTEM = `You are a panel of senior AI agent architects. Generate a comprehensive, detailed architecture specification document for the AI agent system described.

The spec should be structured as follows:

# Architecture Specification

## Executive Summary
Brief description of the system and what it does.

## Architecture Decision: Topology
Explain the chosen topology (e.g. orchestrator + subagents), why it's the right choice, and what alternatives were rejected and why.

## Agent Roles & Responsibilities
List each agent/component, its role, inputs, outputs, and decision authority.

## Orchestration & Communication
How agents communicate (A2A protocol, MCP, message queues, etc.), event flow, error propagation.

## Memory & State Architecture
Chosen memory tier and why. Storage technology, context window management, retrieval strategy if RAG.

## Autonomy & Human-in-the-Loop Design
Approval gates, escalation triggers, blast radius limits, override mechanisms.

## Tool & Integration Architecture
Each tool/integration: authentication method, rate limits to handle, failure modes, data contracts.

## Security Architecture
How each selected requirement is met: auth model, encryption approach, audit strategy, compliance controls.

## Deployment & Infrastructure
Platform, compute model, scaling approach, cold start considerations, cost estimate.

## Failure Handling & Resilience
Retry strategy, circuit breakers, fallback paths, alert triggers, incident runbook outline.

## Evaluation & Observability
How to measure if the agent is working: metrics, evals, tracing, dashboards.

## Architecture Decision Records
List 4-6 key decisions as ADRs: Decision, Context, Options Considered, Chosen Option, Rationale, Consequences.

## Known Risks & Trip Hazards
5-8 specific risks with likelihood, impact, and mitigation.

## Recommended Implementation Order
Phased approach: what to build first, second, third.

Be specific, technical, and opinionated. Name real technologies. Flag real risks.`;

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
  const { description, answers, security, tools, constraints, customAgents, legacyDesc, summary } = req.body as {
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

  const params = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${FIELD_LABELS[k]?.[v] ?? v}`)
    .join("\n");

  const userPrompt = `Generate a comprehensive architecture specification for this AI agent system.

## System Description
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
${customAgents ? `## Additional Specialist Agents\n${customAgents}\n` : ""}

Generate the full architecture specification now.`;

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: GENERATE_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    console.error("Generate error:", err);
    res.write(`data: ${JSON.stringify({ error: "Failed to generate spec" })}\n\n`);
    res.end();
  }
});

export default router;
