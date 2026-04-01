import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const T = {
  bg: "#0d0e12",
  surface: "#14161e",
  surfaceRaised: "#1a1d28",
  border: "#252836",
  borderActive: "#c8a052",
  text: "#e8e6e0",
  muted: "#6b6a72",
  accent: "#c8a052",
  accentDim: "#c8a01510",
  accentBorder: "#c8a05240",
  warn: "#e06c3a",
  warnDim: "#e06c3a12",
  warnBorder: "#e06c3a40",
  danger: "#d04545",
  dangerDim: "#d0454512",
  dangerBorder: "#d0454540",
  green: "#52a87a",
  greenDim: "#52a87a12",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  fontSans: "'Sora', 'Nunito', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', 'Georgia', serif",
};

const SOFT_FLOOR = ["mfa_rbac", "audit", "e2e_encryption"];
const FORMAL_FRAMEWORKS = ["gdpr", "hipaa", "soc2", "pci"];

const getSecurityLevel = (selected: string[] = []) => {
  if (!selected.length || (selected.length === 1 && selected[0] === "none")) return 0;
  const hasSoftFloor = SOFT_FLOOR.every(s => selected.includes(s));
  const hasFramework = FORMAL_FRAMEWORKS.some(f => selected.includes(f));
  if (hasSoftFloor && hasFramework) return 3;
  if (hasSoftFloor) return 2;
  return 1;
};

const SECURITY_MESSAGES: Record<number, { headline: string; body: string; cta: string; ctaDismiss: string; color: string; dimColor: string; borderColor: string }> = {
  0: {
    headline: "No security selected",
    body: "We strongly recommend adding at minimum: multi-factor auth, role-based access controls, audit logging, and encryption. If you plan to share this agent with anyone — colleagues, customers, or the public — these aren't optional. They're what keeps you from getting sued.",
    cta: "Add security requirements",
    ctaDismiss: "Proceed anyway — this is personal use only",
    color: T.danger, dimColor: "#d0454512", borderColor: "#d0454540",
  },
  1: {
    headline: "Security is below the recommended baseline",
    body: "Your current selections fall short of the recommended minimum for any shared system: MFA + RBAC + audit logging + encryption. If anyone other than you will use this agent, please strengthen the security posture.",
    cta: "Strengthen security",
    ctaDismiss: "I understand — proceed with current selections",
    color: T.warn, dimColor: "#e06c3a12", borderColor: "#e06c3a40",
  },
  2: {
    headline: "Consider adding a compliance framework",
    body: "You've met the security baseline — good. For enterprise or regulated contexts, adding a formal compliance framework (SOC2, GDPR, HIPAA, or PCI-DSS) will significantly strengthen your architecture and make it easier to work with enterprise customers.",
    cta: "Add a compliance framework",
    ctaDismiss: "Not needed for my use case — continue",
    color: T.accent, dimColor: "#c8a01510", borderColor: "#c8a05240",
  },
};

const FIELDS: Record<string, { label: string; options: { value: string; icon: string; label: string; desc: string }[] }> = {
  topology: {
    label: "Agent structure",
    options: [
      { value: "single", icon: "🤖", label: "Single agent", desc: "One agent handles everything" },
      { value: "orchestrator", icon: "🎯", label: "Orchestrator + subagents", desc: "Coordinator delegates to specialists" },
      { value: "cooperative", icon: "🤝", label: "Cooperative team", desc: "Agents collaborate toward a shared goal" },
      { value: "pipeline", icon: "🏭", label: "Sequential pipeline", desc: "Agents hand off work in sequence" },
      { value: "competing", icon: "⚔️", label: "Competing agents", desc: "Multiple outputs — best one wins" },
      { value: "hybrid", icon: "🔀", label: "Hybrid cooperative-competitive", desc: "Teams cooperate, teams compete" },
    ],
  },
  autonomy: {
    label: "Autonomy level",
    options: [
      { value: "fully_autonomous", icon: "🚀", label: "Fully autonomous", desc: "Acts without human involvement" },
      { value: "approval_key", icon: "✋", label: "HITL on key actions", desc: "Pauses for approval on important steps" },
      { value: "approval_all", icon: "👤", label: "Full HITL", desc: "Human approves every action" },
      { value: "advisory", icon: "💡", label: "Advisory only", desc: "Recommends, never acts" },
    ],
  },
  memory: {
    label: "Memory",
    options: [
      { value: "stateless", icon: "🧹", label: "Stateless", desc: "Fresh every run" },
      { value: "session", icon: "⏱️", label: "Session memory", desc: "Within a session, then clears" },
      { value: "persistent", icon: "🗃️", label: "Persistent memory", desc: "Remembers between runs" },
      { value: "knowledge_base", icon: "🧠", label: "Long-term knowledge base", desc: "Accumulates over time" },
    ],
  },
  failure: {
    label: "Failure handling",
    options: [
      { value: "retry", icon: "🔁", label: "Retry with backoff", desc: "Try again automatically" },
      { value: "escalate", icon: "🚨", label: "Escalate to human", desc: "Alert a person to take over" },
      { value: "graceful", icon: "📝", label: "Graceful degradation", desc: "Stop cleanly and log it" },
      { value: "fallback", icon: "🛤️", label: "Fallback path", desc: "Degrade to safe behavior" },
    ],
  },
  platform: {
    label: "Deployment platform",
    options: [
      { value: "aws", icon: "🟠", label: "AWS", desc: "Amazon Web Services" },
      { value: "azure", icon: "🔵", label: "Azure", desc: "Microsoft Azure" },
      { value: "gcp", icon: "🟡", label: "Google Cloud", desc: "GCP" },
      { value: "onprem", icon: "🏠", label: "On-premises", desc: "Self-hosted" },
      { value: "none", icon: "🤷", label: "No preference", desc: "Happy to be guided" },
    ],
  },
  scaleRuns: {
    label: "Daily run volume",
    options: [
      { value: "occasional", icon: "🌱", label: "Occasional (1–10/day)", desc: "Low volume" },
      { value: "regular", icon: "⏰", label: "Regular (dozens–hundreds)", desc: "Predictable throughput" },
      { value: "high", icon: "🚀", label: "High (thousands+)", desc: "Significant volume" },
      { value: "burst", icon: "⚡", label: "Bursty", desc: "Unpredictable spikes" },
    ],
  },
  scaleConcurrent: {
    label: "Concurrency",
    options: [
      { value: "serial", icon: "1️⃣", label: "Serial", desc: "One at a time" },
      { value: "low_concurrency", icon: "👥", label: "Low concurrency (< 10)", desc: "Small parallel load" },
      { value: "high_concurrency", icon: "🏃", label: "High concurrency (10+)", desc: "Many parallel runs" },
    ],
  },
  greenfield: {
    label: "Greenfield / brownfield",
    options: [
      { value: "greenfield", icon: "🌱", label: "Greenfield", desc: "Starting from scratch" },
      { value: "brownfield", icon: "🏗️", label: "Brownfield", desc: "Integrating with existing systems" },
      { value: "migration", icon: "🔄", label: "Migration", desc: "Re-platforming an existing workflow" },
    ],
  },
  modelPref: {
    label: "Model preference",
    options: [
      { value: "none", icon: "🤷", label: "No preference", desc: "Recommend based on requirements" },
      { value: "anthropic", icon: "🟣", label: "Anthropic (Claude)", desc: "claude-sonnet-4-6 / claude-opus-4-6" },
      { value: "openai", icon: "⚫", label: "OpenAI", desc: "GPT-4o, o3" },
      { value: "google", icon: "🟡", label: "Google (Gemini)", desc: "Gemini 2.5 Pro / Flash" },
      { value: "open_source", icon: "🔓", label: "Open source", desc: "Llama, Mistral, DeepSeek" },
      { value: "multi_model", icon: "🔀", label: "Multi-model routing", desc: "Different models per task" },
    ],
  },
  budget: {
    label: "Budget",
    options: [
      { value: "minimal", icon: "🌱", label: "Minimal", desc: "Cost is the primary constraint" },
      { value: "moderate", icon: "⚖️", label: "Moderate", desc: "Balance quality and cost" },
      { value: "generous", icon: "🚀", label: "Performance-first", desc: "Quality over cost" },
    ],
  },
};

const SECURITY_OPTIONS = [
  { value: "none",           icon: "🤷", label: "Nothing specific",      desc: "No particular compliance requirements",                       techDesc: "No formal compliance requirements" },
  { value: "mfa_rbac",       icon: "🔑", label: "MFA + RBAC",            desc: "Multi-factor auth and role-based access controls",            techDesc: "MFA + RBAC — standard access control baseline" },
  { value: "audit",          icon: "📝", label: "Audit logging",         desc: "Immutable log of every action — who did what and when",       techDesc: "Audit logging — tamper-evident activity trail" },
  { value: "e2e_encryption", icon: "🔐", label: "End-to-end encryption", desc: "Data encrypted in transit and at rest",                       techDesc: "TLS 1.3 + AES-256 at rest, key management required" },
  { value: "gdpr",           icon: "🇪🇺", label: "GDPR",                 desc: "EU data privacy law — required if handling EU personal data", techDesc: "GDPR — data residency, right to erasure, DPA required" },
  { value: "hipaa",          icon: "🏥", label: "HIPAA",                 desc: "US healthcare data — required for patient information",        techDesc: "HIPAA — PHI handling, BAA required, access controls" },
  { value: "soc2",           icon: "✅", label: "SOC2",                  desc: "Security cert enterprise customers commonly require",          techDesc: "SOC2 Type II — availability, confidentiality, integrity" },
  { value: "pci",            icon: "💳", label: "PCI-DSS",               desc: "Required if the agent handles payment card data",             techDesc: "PCI-DSS — cardholder data environment, pen testing" },
  { value: "zero_trust",     icon: "🛡️", label: "Zero Trust",            desc: "Never trust, always verify — strict identity-based access",   techDesc: "Zero Trust — microsegmentation, continuous auth" },
];

const inferFromDescription = (description: string) => {
  const d = description.toLowerCase();
  const has = (...terms: string[]) => terms.some(t => d.includes(t));

  const topology = has("orchestrat", "coordinator", "delegates", "subagent") ? "orchestrator"
    : has("pipeline", "assembly", "sequential", "hand off", "handoff") ? "pipeline"
    : has("compet", "best answer", "multiple outputs") ? "competing"
    : has("cooperat", "team", "collaborate", "together") ? "cooperative"
    : has("multiple agent", "multi-agent", "several agent") ? "orchestrator"
    : "single";

  const autonomy = has("human approval", "human review", "sign off", "sign-off", "approve") ? "approval_key"
    : has("fully autonom", "no human", "without human") ? "fully_autonomous"
    : has("advisory", "recommend only", "never acts") ? "advisory"
    : "approval_key";

  const memory = has("knowledge base", "long-term", "accumulate", "learns over") ? "knowledge_base"
    : has("remember between", "persistent", "across session", "previous run") ? "persistent"
    : has("session", "within a conversation", "same conversation") ? "session"
    : "stateless";

  const failure = has("escalat", "alert", "notify a human", "page") ? "escalate"
    : has("retry", "try again", "backoff") ? "retry"
    : has("fallback", "degrade", "simpler path") ? "fallback"
    : "graceful";

  const platform = has("azure", "microsoft", "entra", "m365", "teams") ? "azure"
    : has("aws", "amazon", "lambda", "bedrock", "s3") ? "aws"
    : has("gcp", "google cloud", "vertex", "bigquery") ? "gcp"
    : has("on-prem", "on prem", "self-host", "our own server") ? "onprem"
    : null;

  const scaleRuns = has("thousand", "millions", "high volume", "massive") ? "high"
    : has("hundreds", "many user", "lots of") ? "regular"
    : has("burst", "spike", "unpredictable") ? "burst"
    : "occasional";

  const scaleConcurrent = has("many at once", "parallel", "concurrent", "simultaneously") ? "high_concurrency"
    : has("few at a time", "small number") ? "low_concurrency"
    : "serial";

  const greenfield = has("existing", "legacy", "integrate with", "connect to", "current system", "already have") ? "brownfield"
    : has("migrat", "replac", "re-platform") ? "migration"
    : "greenfield";

  const modelPref = has("claude", "anthropic") ? "anthropic"
    : has("gpt", "openai", "chatgpt") ? "openai"
    : has("gemini", "google ai") ? "google"
    : has("llama", "mistral", "open source", "open-source") ? "open_source"
    : "none";

  const budget = has("cheap", "low cost", "minimal", "budget", "free tier") ? "minimal"
    : has("performance", "best model", "quality") ? "generous"
    : "moderate";

  const security = new Set<string>();

  security.add("mfa_rbac");
  security.add("audit");
  security.add("e2e_encryption");

  if (scaleConcurrent === "low_concurrency" || scaleConcurrent === "high_concurrency" ||
    scaleRuns === "regular" || scaleRuns === "high" || scaleRuns === "burst") {
    security.add("mfa_rbac");
    security.add("audit");
    security.add("e2e_encryption");
  }

  if (autonomy === "fully_autonomous" || autonomy === "approval_key") {
    security.add("audit");
    security.add("e2e_encryption");
  }

  if (topology === "orchestrator" || topology === "cooperative" ||
    topology === "competing" || topology === "hybrid") {
    security.add("mfa_rbac");
    security.add("audit");
  }

  if (greenfield === "brownfield" || greenfield === "migration") {
    security.add("mfa_rbac");
    security.add("audit");
    security.add("e2e_encryption");
  }

  if (has("hipaa", "healthcare", "health care", "patient", "clinical", "medical record", "phi", "protected health", "ehr", "emr", "hospital", "clinic", "doctor", "nurse", "diagnos")) {
    security.add("hipaa");
    security.add("audit");
    security.add("e2e_encryption");
    security.add("mfa_rbac");
  }

  if (has("payment", "billing", "invoice", "financial", "bank", "transaction", "stripe", "paypal", "revenue", "money", "fund", "invest", "trading", "wallet", "fintech")) {
    security.add("e2e_encryption");
    security.add("audit");
    security.add("mfa_rbac");
    if (has("payment", "card", "checkout", "stripe", "paypal", "credit card", "debit card")) security.add("pci");
  }

  if (has("legal", "law firm", "attorney", "counsel", "compliance", "regulated", "regulator", "fda", "finra", "sec ", "gdpr", "ccpa", "hipaa", "sox", "pci", "iso 27001")) {
    security.add("audit");
    security.add("e2e_encryption");
    security.add("soc2");
  }

  if (has("european", "eu user", "europe", "uk user", "british", "german", "french", "dutch", "gdpr", "eu data", "data subject", "right to erasure", "data protection")) {
    security.add("gdpr");
    security.add("e2e_encryption");
  }

  if (has("california", "ccpa", "us privacy", "american user")) {
    security.add("audit");
  }

  if (has("personal data", "pii", "personally identifiable", "user data", "profile", "email address", "phone number", "home address", "date of birth", "social security", "passport", "identity")) {
    security.add("e2e_encryption");
    security.add("audit");
    security.add("mfa_rbac");
  }

  if (has("enterprise", "saas", "multi-tenant", "multitenant", "b2b", "corporate", "organization", "team plan", "business plan", "enterprise customer", "per-tenant")) {
    security.add("mfa_rbac");
    security.add("audit");
    security.add("e2e_encryption");
    security.add("soc2");
  }

  if (has("customer", "end user", "external user", "public-facing", "client portal", "user account", "sign up", "sign in", "login", "consumer")) {
    security.add("mfa_rbac");
    security.add("e2e_encryption");
  }

  if (has("zero trust", "zero-trust", "never trust", "microsegment", "continuous auth", "identity-based")) security.add("zero_trust");
  if (has("soc2", "soc 2", "aicpa", "trust service", "compliance cert", "type ii")) security.add("soc2");
  if (has("pci", "payment card", "cardholder", "credit card data")) security.add("pci");

  const inferredTools: string[] = [];
  if (has("slack")) inferredTools.push("Slack");
  if (has("jira")) inferredTools.push("Jira");
  if (has("email", "outlook", "exchange")) inferredTools.push("Email");
  if (has("github", "git")) inferredTools.push("GitHub");
  if (has("database", "postgres", "mysql", "sql", "dynamo")) inferredTools.push("Database");
  if (has("s3", "blob", "storage", "file")) inferredTools.push("File storage");
  if (has("salesforce", "crm", "hubspot")) inferredTools.push("CRM");
  if (has("teams", "microsoft teams")) inferredTools.push("Microsoft Teams");
  if (has("sharepoint")) inferredTools.push("SharePoint");
  if (has("graph api", "microsoft graph", "m365", "microsoft 365")) inferredTools.push("Microsoft Graph API");
  if (has("search", "web search")) inferredTools.push("Web search");
  if (has("rest api", "api call", "webhook")) inferredTools.push("REST APIs");

  const gaps: string[] = [];
  if (!platform) gaps.push("platform");
  if (budget === "moderate" && !has("budget", "cost", "spend", "cheap", "expensive")) gaps.push("budget");

  const topologyLabel: Record<string, string> = { single: "single agent", orchestrator: "orchestrator with subagents", cooperative: "cooperative agent team", pipeline: "sequential pipeline", competing: "competing agents" };
  const platformLabel = platform ? `on ${platform.toUpperCase()}` : "";
  const summary = `A ${topologyLabel[topology] || "agent system"} ${platformLabel} that ${description.split(".")[0].toLowerCase().replace(/^(build|create|make|design|implement)\s+(a|an|the)?\s*/i, "").trim()}.`.replace(/\s+/g, " ");

  return { topology, autonomy, memory, failure, platform, scaleRuns, scaleConcurrent, greenfield, modelPref, budget, security: Array.from(security), inferredTools, gaps, summary };
};

const STAGES_ORDER = ["describe", "refine", "constraints", "tools", "security", "review"];
const STAGE_LABELS: Record<string, string> = { describe: "Describe", refine: "Architecture", constraints: "Constraints", tools: "Tools", security: "Security", review: "Review" };

function BreadcrumbBar({ stage, setStageAndScroll }: { stage: string; setStageAndScroll: (s: string) => void }) {
  const activeIdx = STAGES_ORDER.indexOf(stage);
  const showNav = !["describe", "analyzing", "generating", "done"].includes(stage);
  if (!showNav) return null;
  return (
    <div style={{ maxWidth: "640px", width: "100%", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
        {STAGES_ORDER.map((s, i) => {
          const isActive = s === stage;
          const isPast = i < activeIdx;
          const clickable = isPast;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {i > 0 && <span style={{ color: T.border, fontSize: "12px" }}>›</span>}
              <button onClick={() => clickable && setStageAndScroll(s)} style={{
                background: isActive ? T.accentDim : "none",
                border: isActive ? `1px solid ${T.accentBorder}` : "1px solid transparent",
                cursor: clickable ? "pointer" : "default",
                fontFamily: T.fontMono, fontSize: "11px", letterSpacing: "0.06em",
                padding: "3px 8px", borderRadius: "6px",
                color: isActive ? T.accent : isPast ? T.text : T.muted,
                fontWeight: isActive ? "700" : "500",
                textTransform: "uppercase",
                textDecoration: clickable ? "underline" : "none",
                textUnderlineOffset: "2px",
              }}>
                {STAGE_LABELS[s]}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FooterBar({ saveFlash, onSave, onExport, onImport }: {
  saveFlash: boolean;
  onSave: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(13,14,18,0.92)", backdropFilter: "blur(12px)",
      borderTop: `1px solid ${T.border}`,
      padding: "14px 24px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
    }}>
      <div style={{ maxWidth: "640px", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {saveFlash && (
            <span style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.green, letterSpacing: "0.05em" }}>
              ✓ Draft saved
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onSave} style={{
            background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "8px",
            padding: "10px 18px", fontSize: "13px", fontFamily: T.fontSans, color: T.text,
            cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px",
          }}>💾 Save draft</button>
          <button onClick={onExport} style={{
            background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "8px",
            padding: "10px 18px", fontSize: "13px", fontFamily: T.fontSans, color: T.text,
            cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px",
          }}>⬇ Export JSON</button>
          <label style={{
            background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "8px",
            padding: "10px 18px", fontSize: "13px", fontFamily: T.fontSans, color: T.text,
            cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px",
          }}>
            ⬆ Load draft
            <input type="file" accept=".json" onChange={onImport} style={{ display: "none" }} />
          </label>
        </div>
      </div>
    </div>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: T.fontMono, fontSize: "10px", color: T.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{children}</div>;
}

function FieldCard({ fieldKey, value, onChange, inferred }: {
  fieldKey: string;
  value: string;
  onChange: (val: string) => void;
  inferred: boolean;
}) {
  const field = FIELDS[fieldKey];
  if (!field) return null;
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
        <MonoLabel>{field.label}</MonoLabel>
        {inferred && value && <span style={{ fontSize: "10px", fontFamily: T.fontMono, color: T.green, background: T.greenDim, border: `1px solid ${T.green}30`, borderRadius: "10px", padding: "1px 8px", letterSpacing: "0.04em", marginBottom: "6px" }}>INFERRED</span>}
        {!value && <span style={{ fontSize: "10px", fontFamily: T.fontMono, color: T.warn, background: T.warnDim, border: `1px solid ${T.warnBorder}`, borderRadius: "10px", padding: "1px 8px", letterSpacing: "0.04em", marginBottom: "6px" }}>NEEDS INPUT</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
        {field.options.map(opt => {
          const sel = value === opt.value;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)} style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px",
              borderRadius: "8px", cursor: "pointer", textAlign: "left",
              border: `1px solid ${sel ? T.borderActive : T.border}`,
              background: sel ? T.accentDim : T.surface,
              fontFamily: T.fontSans, fontSize: "12px", fontWeight: sel ? "700" : "500",
              color: sel ? T.accent : T.text, transition: "all 0.12s",
            }}>
              <span style={{ fontSize: "14px", flexShrink: 0 }}>{opt.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ lineHeight: 1.2 }}>{opt.label}</div>
                <div style={{ fontSize: "10px", color: T.muted, marginTop: "1px" }}>{opt.desc}</div>
              </div>
              {sel && <span style={{ marginLeft: "auto", color: T.accent, flexShrink: 0 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SecurityPanel({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const secLevel = getSecurityLevel(selected);
  const msg = SECURITY_MESSAGES[Math.min(secLevel, 2)];
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        {SECURITY_OPTIONS.map(opt => {
          const sel = (selected || []).includes(opt.value);
          return (
            <button key={opt.value} onClick={() => {
              const curr = selected || [];
              onChange(curr.includes(opt.value) ? curr.filter(x => x !== opt.value) : [...curr, opt.value]);
            }} style={{
              display: "flex", alignItems: "flex-start", gap: "14px", padding: "11px 14px",
              borderRadius: "10px", cursor: "pointer", textAlign: "left",
              border: `1px solid ${sel ? T.borderActive : T.border}`,
              background: sel ? T.accentDim : T.surface,
              fontFamily: T.fontSans, transition: "all 0.12s", width: "100%",
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>{opt.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: sel ? T.accent : T.text }}>{opt.label}</span>
                  <span style={{ fontSize: "10px", fontFamily: T.fontMono, color: T.muted }}>{opt.techDesc}</span>
                </div>
                <div style={{ fontSize: "11px", color: T.muted, marginTop: "2px", lineHeight: 1.5 }}>{opt.desc}</div>
              </div>
              <span style={{ color: sel ? T.accent : T.border, fontSize: "15px", flexShrink: 0, marginTop: "2px" }}>{sel ? "✓" : "○"}</span>
            </button>
          );
        })}
      </div>
      {secLevel < 3 && (
        <div style={{ padding: "14px 16px", borderRadius: "10px", border: `1px solid ${msg.borderColor}`, background: msg.dimColor }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>{secLevel === 0 ? "🚨" : secLevel === 1 ? "⚠️" : "💡"}</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: msg.color, marginBottom: "4px" }}>{msg.headline}</div>
              <div style={{ fontSize: "12px", color: T.muted, lineHeight: 1.6 }}>{msg.body}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityBanner({ selected }: { selected: string[] }) {
  const secLevel = getSecurityLevel(selected);
  if (secLevel >= 3) return null;
  const msg = SECURITY_MESSAGES[Math.min(secLevel, 2)];
  return (
    <div style={{ padding: "14px 16px", borderRadius: "10px", border: `1px solid ${msg.borderColor}`, background: msg.dimColor, marginBottom: "20px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>{secLevel === 0 ? "🚨" : secLevel === 1 ? "⚠️" : "💡"}</span>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: msg.color, marginBottom: "3px" }}>{msg.headline}</div>
          <div style={{ fontSize: "12px", color: T.muted, lineHeight: 1.5 }}>{msg.body}</div>
        </div>
      </div>
    </div>
  );
}

export default function ArchV4() {
  const [stage, setStage] = useState("describe");

  const setStageAndScroll = (s: string) => { setStage(s); window.scrollTo({ top: 0, behavior: "instant" }); };
  const [description, setDescription] = useState("");
  const [inferred, setInferred] = useState<ReturnType<typeof inferFromDescription> | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [security, setSecurity] = useState<string[]>([]);
  const [legacyDesc, setLegacyDesc] = useState("");
  const [constraints, setConstraints] = useState("");
  const [customAgents, setCustomAgents] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [toolSelections, setToolSelections] = useState(new Set<string>());
  const [saveFlash, setSaveFlash] = useState(false);
  const [specContent, setSpecContent] = useState("");
  const [specDone, setSpecDone] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, { status: "working" | "done"; name: string; icon: string }>>({});
  const [genPhase, setGenPhase] = useState<"idle" | "specialists" | "synthesis">("idle");
  const specRef = useRef<HTMLDivElement>(null);

  const getDraft = () => ({
    stage, description, answers, security, tools: Array.from(toolSelections),
    legacyDesc, constraints, customAgents, inferred,
  });

  const applyDraft = (d: Partial<ReturnType<typeof getDraft>>) => {
    if (d.description) setDescription(d.description);
    if (d.answers) setAnswers(d.answers);
    if (d.security) setSecurity(d.security);
    if (d.tools) setToolSelections(new Set(d.tools));
    if (d.legacyDesc) setLegacyDesc(d.legacyDesc);
    if (d.constraints) setConstraints(d.constraints);
    if (d.customAgents) setCustomAgents(d.customAgents);
    if (d.inferred) setInferred(d.inferred as ReturnType<typeof inferFromDescription>);
  };

  const autoSave = (overrides: Partial<ReturnType<typeof getDraft>> = {}) => {
    try {
      const snap = { ...getDraft(), ...overrides, savedAt: new Date().toISOString() };
      localStorage.setItem("arch_v4_draft", JSON.stringify(snap));
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1800);
    } catch (e) {}
  };

  const hasSavedDraft = (() => { try { return !!localStorage.getItem("arch_v4_draft"); } catch (e) { return false; } })();

  const loadLocalDraft = () => {
    try {
      const raw = localStorage.getItem("arch_v4_draft");
      if (!raw) return;
      const d = JSON.parse(raw);
      applyDraft(d);
      setStageAndScroll(d.stage || "refine");
    } catch (e) {}
  };

  const exportDraft = () => {
    const snap = { ...getDraft(), exportedAt: new Date().toISOString(), version: "v4" };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "arch-spec-draft.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importDraft = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target?.result as string);
        applyDraft(d);
        setStageAndScroll(d.stage || "refine");
      } catch (err) { alert("Could not load draft — invalid file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const setField = (key: string, val: string) => setAnswers(a => ({ ...a, [key]: val }));

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setStageAndScroll("analyzing");
    setError(null);
    try {
      const res = await fetch("/api/arch/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json() as ReturnType<typeof inferFromDescription>;
      setInferred(result);
      const prepped: Record<string, string> = {};
      Object.keys(FIELDS).forEach(k => {
        if ((result as Record<string, unknown>)[k]) prepped[k] = (result as Record<string, string>)[k];
      });
      setAnswers(prepped);
      if (result.security?.length) setSecurity(result.security);
      if (result.inferredTools?.length) setTools(result.inferredTools);
      setToolSelections(new Set());
      setStageAndScroll("refine");
    } catch (e: unknown) {
      setError(`Analysis failed: ${(e as Error).message}`);
      setStage("describe");
    }
  };

  const handleGenerate = async () => {
    setSpecContent("");
    setSpecDone(false);
    setSpecError(null);
    setAgentStatuses({});
    setGenPhase("idle");
    setStageAndScroll("generating");
    try {
      const res = await fetch("/api/arch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          answers,
          security,
          tools: Array.from(toolSelections),
          constraints,
          customAgents,
          legacyDesc,
          summary: inferred?.summary ?? "",
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json) as {
              content?: string;
              done?: boolean;
              error?: string;
              phase?: "specialists" | "synthesis";
              agentStart?: string;
              agentName?: string;
              agentDone?: string;
              icon?: string;
            };
            if (ev.error) { setSpecError(ev.error); break; }
            if (ev.phase) { setGenPhase(ev.phase); }
            if (ev.agentStart) {
              setAgentStatuses(prev => ({ ...prev, [ev.agentStart!]: { status: "working", name: ev.agentName ?? ev.agentStart!, icon: ev.icon ?? "🔧" } }));
            }
            if (ev.agentDone) {
              setAgentStatuses(prev => {
                const existing = prev[ev.agentDone!];
                return { ...prev, [ev.agentDone!]: { status: "done", name: existing?.name ?? ev.agentName ?? ev.agentDone!, icon: existing?.icon ?? ev.icon ?? "🔧" } };
              });
            }
            if (ev.content) {
              setSpecContent(prev => prev + ev.content);
              if (specRef.current) specRef.current.scrollTop = specRef.current.scrollHeight;
            }
            if (ev.done) { setSpecDone(true); setStageAndScroll("done"); }
          } catch { /* skip malformed events */ }
        }
      }
      setSpecDone(true);
      setStageAndScroll("done");
    } catch (e: unknown) {
      setSpecError(`Generation failed: ${(e as Error).message}`);
      setSpecDone(true);
      setStageAndScroll("done");
    }
  };

  const container: React.CSSProperties = {
    minHeight: "100vh", background: T.bg, fontFamily: T.fontSans, color: T.text,
    display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px 60px 16px",
    backgroundImage: "radial-gradient(ellipse at 30% 20%, #c8a05208 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, #c8a05205 0%, transparent 50%)",
  };

  const card: React.CSSProperties = {
    background: T.surface, borderRadius: "16px", padding: "36px",
    border: `1px solid ${T.border}`, boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    maxWidth: "640px", width: "100%", boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    background: T.accent, color: T.bg, border: "none", borderRadius: "8px",
    padding: "12px 28px", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", fontFamily: T.fontSans, transition: "all 0.15s",
  };

  const btnDisabled: React.CSSProperties = { ...btnPrimary, background: T.border, color: T.muted, cursor: "default", opacity: 0.5 };

  const btnGhost: React.CSSProperties = {
    background: "transparent", color: T.muted, border: `1px solid ${T.border}`,
    borderRadius: "8px", padding: "12px 20px", fontSize: "14px",
    cursor: "pointer", fontFamily: T.fontSans,
  };

  if (stage === "describe") {
    const ready = description.trim().length > 20;
    return (
      <div style={container}>
        <div style={{ maxWidth: "640px", width: "100%", marginBottom: "32px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "10px" }}>AGENT ARCHITECTURE RECOMMENDER</div>
          <h1 style={{ margin: "0 0 12px", fontSize: "34px", fontWeight: "400", fontFamily: T.fontDisplay, color: T.text, lineHeight: 1.2 }}>Describe your agentic system.</h1>
          <p style={{ margin: 0, fontSize: "14px", color: T.muted, lineHeight: 1.7, maxWidth: "520px" }}>
            Tell us what you're building in plain language. We'll extract the architecture parameters, identify gaps, and ask only the questions we can't answer from your description.
          </p>
        </div>
        <div style={card}>
          <MonoLabel>What are you building?</MonoLabel>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={"e.g. A multi-agent system that monitors our Jira board for tickets tagged 'needs-design', routes them to a UI/UX specialist agent that drafts a design brief, sends it to a senior architect agent for review, then posts the approved brief back to the ticket and notifies the design team in Slack. Runs on Azure, needs to integrate with our existing Entra ID auth. Team is ~15 engineers…"}
            style={{
              width: "100%", minHeight: "180px", padding: "16px", borderRadius: "10px",
              border: `1px solid ${ready ? T.borderActive : T.border}`, outline: "none",
              fontSize: "14px", fontFamily: T.fontSans, color: T.text, resize: "vertical",
              boxSizing: "border-box", background: T.bg, lineHeight: 1.7,
              transition: "border 0.15s", marginBottom: "16px",
            }}
          />
          {error && <div style={{ color: T.danger, fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {hasSavedDraft && (
                <button onClick={loadLocalDraft} style={{ ...btnGhost, fontSize: "13px", padding: "10px 16px", color: T.accent, borderColor: T.accentBorder, background: T.accentDim }}>
                  ↩ Resume saved draft
                </button>
              )}
              <label style={{ ...btnGhost, fontSize: "13px", padding: "10px 16px", cursor: "pointer", display: "inline-block" }}>
                ⬆ Load JSON draft
                <input type="file" accept=".json" onChange={importDraft} style={{ display: "none" }} />
              </label>
            </div>
            <button onClick={handleAnalyze} disabled={!ready} style={ready ? btnPrimary : btnDisabled}>
              Analyze description →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div style={{ ...container, justifyContent: "center" }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25}}`}</style>
        <div style={{ ...card, textAlign: "center", maxWidth: "480px" }}>
          <div style={{ fontSize: "32px", display: "inline-block", animation: "spin 2s linear infinite", marginBottom: "20px" }}>⚙️</div>
          <MonoLabel>Analyzing</MonoLabel>
          <h2 style={{ margin: "0 0 8px", fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "22px", color: T.text }}>Reading your description</h2>
          <p style={{ color: T.muted, fontSize: "13px", margin: "0 0 24px", lineHeight: 1.6 }}>Extracting architecture parameters, identifying gaps, inferring intent…</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {["Topology & orchestration", "Scale & concurrency", "Platform & deployment", "Security posture", "Integration surface"].map((item, i) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: T.surfaceRaised, borderRadius: "7px", fontSize: "12px", fontFamily: T.fontMono, color: T.muted, animation: `pulse 1.8s ease-in-out ${i * 0.25}s infinite` }}>
                <span style={{ color: T.accent, fontSize: "10px" }}>●</span>
                <span>{item}</span>
                <span style={{ marginLeft: "auto", fontSize: "10px", color: T.accent }}>inferring…</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "refine") {
    const coreFields = ["topology", "autonomy", "memory", "failure", "platform", "scaleRuns", "scaleConcurrent", "greenfield", "modelPref", "budget"];
    const needsInput = coreFields.filter(f => !answers[f]);
    return (
      <div style={container}>
        <BreadcrumbBar stage={stage} setStageAndScroll={setStageAndScroll} />

        <div style={{ maxWidth: "640px", width: "100%", marginBottom: "24px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "8px" }}>REVIEW & REFINE</div>
          <h2 style={{ margin: "0 0 10px", fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "26px", color: T.text }}>Here's what we understood</h2>
          {inferred?.summary && (
            <div style={{ fontSize: "14px", color: T.muted, lineHeight: 1.6, padding: "12px 16px", background: T.surface, borderRadius: "10px", borderLeft: `3px solid ${T.borderActive}`, fontStyle: "italic", border: `1px solid ${T.border}` }}>
              "{inferred.summary}"
            </div>
          )}
        </div>
        <div style={card}>
          {needsInput.length > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: T.warnDim, border: `1px solid ${T.warnBorder}`, marginBottom: "20px", fontSize: "12px", color: T.muted }}>
              <span style={{ color: T.warn, fontWeight: "700" }}>{needsInput.length} field{needsInput.length !== 1 ? "s" : ""} need your input</span> — we couldn't infer {needsInput.length === 1 ? "this" : "these"} from your description.
            </div>
          )}
          {coreFields.map(f => (
            <FieldCard key={f} fieldKey={f} value={answers[f]} onChange={val => setField(f, val)} inferred={!!(inferred && (inferred as Record<string, unknown>)[f])} />
          ))}
          {(answers.greenfield === "brownfield" || answers.greenfield === "migration") && (
            <div style={{ marginTop: "4px", marginBottom: "18px" }}>
              <MonoLabel>Existing systems to connect to</MonoLabel>
              <textarea value={legacyDesc} onChange={e => setLegacyDesc(e.target.value)}
                placeholder="Describe existing systems, databases, APIs, or infrastructure this must integrate with…"
                style={{ width: "100%", minHeight: "80px", padding: "12px", borderRadius: "8px", border: `1px solid ${legacyDesc ? T.borderActive : T.border}`, outline: "none", fontSize: "13px", fontFamily: T.fontSans, color: T.text, resize: "vertical", boxSizing: "border-box", background: T.bg, lineHeight: 1.6, transition: "border 0.15s" }}
              />
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px", paddingTop: "20px", borderTop: `1px solid ${T.border}` }}>
            <button style={btnGhost} onClick={() => setStageAndScroll("describe")}>← Edit description</button>
            <button style={btnPrimary} onClick={() => { autoSave(); setStageAndScroll("constraints"); }}>Constraints →</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "constraints") {
    return (
      <div style={container}>
        <BreadcrumbBar stage={stage} setStageAndScroll={setStageAndScroll} />

        <div style={{ maxWidth: "640px", width: "100%", marginBottom: "24px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "8px" }}>CONSTRAINTS & CONTEXT</div>
          <h2 style={{ margin: "0 0 8px", fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "26px", color: T.text }}>Anything we have to work around?</h2>
          <p style={{ margin: 0, fontSize: "14px", color: T.muted, lineHeight: 1.6 }}>Required technologies, languages, cost limits, latency requirements — anything fixed and non-negotiable.</p>
        </div>
        <div style={card}>
          <div style={{ marginBottom: "24px" }}>
            <MonoLabel>Hard constraints</MonoLabel>
            <textarea value={constraints} onChange={e => setConstraints(e.target.value)}
              placeholder="e.g. Must use TypeScript, Azure only, existing Postgres DB, team only knows React, p95 latency under 2s, max $0.05 per run…"
              style={{ width: "100%", minHeight: "110px", padding: "14px", borderRadius: "10px", border: `1px solid ${constraints ? T.borderActive : T.border}`, outline: "none", fontSize: "13px", fontFamily: T.fontSans, color: T.text, resize: "vertical", boxSizing: "border-box", background: T.bg, lineHeight: 1.7, transition: "border 0.15s" }}
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <MonoLabel>Additional specialist agents <span style={{ color: T.muted, textTransform: "none", fontSize: "10px", fontFamily: T.fontSans, letterSpacing: 0, fontWeight: "400" }}>(optional)</span></MonoLabel>
            <p style={{ fontSize: "12px", color: T.muted, margin: "0 0 8px", lineHeight: 1.5 }}>Our default panel covers most architectures. Add a specialist if yours has unusual domain requirements.</p>
            <textarea value={customAgents} onChange={e => setCustomAgents(e.target.value)}
              placeholder="e.g. agentic security specialist, RAG architecture expert, fintech compliance advisor, prompt injection red-teamer…"
              style={{ width: "100%", minHeight: "80px", padding: "14px", borderRadius: "10px", border: `1px solid ${customAgents ? T.borderActive : T.border}`, outline: "none", fontSize: "13px", fontFamily: T.fontSans, color: T.text, resize: "vertical", boxSizing: "border-box", background: T.bg, lineHeight: 1.7, transition: "border 0.15s" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "20px", borderTop: `1px solid ${T.border}` }}>
            <button style={btnGhost} onClick={() => setStageAndScroll("refine")}>← Architecture</button>
            <button style={btnPrimary} onClick={() => { autoSave(); setStageAndScroll("tools"); }}>Tools & integrations →</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "tools") {
    const platform = answers.platform;
    const VENDOR_TOOLS: Record<string, { value: string; label: string; desc: string; icon: string }[]> = {
      aws: [
        { value: "aws_agentcore", label: "AgentCore Runtime", desc: "Managed agent hosting, session isolation, A2A/MCP support", icon: "🟠" },
        { value: "aws_lambda", label: "Lambda", desc: "Serverless functions for lightweight agent tasks", icon: "⚡" },
        { value: "aws_s3", label: "S3", desc: "Object storage for documents and artifacts", icon: "🪣" },
        { value: "aws_sqs", label: "SQS / SNS / EventBridge", desc: "Async messaging and event-driven triggers", icon: "📨" },
        { value: "aws_bedrock", label: "Bedrock", desc: "Managed LLM access — Claude, Titan, Llama and more", icon: "🧠" },
        { value: "aws_dynamo", label: "DynamoDB / RDS / Aurora", desc: "NoSQL and relational database options", icon: "🗄️" },
        { value: "aws_secrets", label: "Secrets Manager", desc: "Secure credential storage with rotation", icon: "🔐" },
        { value: "aws_cloudwatch", label: "CloudWatch / X-Ray", desc: "Observability, tracing, and agent monitoring", icon: "📊" },
        { value: "aws_cognito", label: "Cognito / IAM", desc: "User auth and access control", icon: "🔑" },
        { value: "aws_apigw", label: "API Gateway", desc: "Expose your agent as a REST or WebSocket endpoint", icon: "🚪" },
        { value: "aws_kendra", label: "Kendra / OpenSearch", desc: "Enterprise search and RAG", icon: "🔍" },
        { value: "aws_stepfunctions", label: "Step Functions", desc: "State machine orchestration for multi-step workflows", icon: "🔄" },
      ],
      azure: [
        { value: "az_foundry", label: "AI Foundry Agent Service", desc: "Managed agent platform — orchestration, M365 publish, Entra Agent ID", icon: "🔵" },
        { value: "az_openai", label: "Azure OpenAI", desc: "GPT, Claude, Mistral, DeepSeek via Azure model router", icon: "🤖" },
        { value: "az_logic_apps", label: "Logic Apps", desc: "1,400+ connectors — SAP, Salesforce, and more", icon: "🔗" },
        { value: "az_functions", label: "Azure Functions", desc: "Serverless compute for lightweight agent tasks", icon: "⚡" },
        { value: "az_graph", label: "Microsoft Graph API", desc: "Unified M365 interface — mail, calendar, files, users", icon: "🏢" },
        { value: "az_sharepoint", label: "SharePoint", desc: "Documents, lists, and sites via Graph or REST", icon: "📋" },
        { value: "az_teams", label: "Microsoft Teams", desc: "Send messages, read channels, one-click Foundry publish", icon: "💬" },
        { value: "az_exchange", label: "Exchange / Outlook", desc: "Email and calendar via Graph API or EWS", icon: "📧" },
        { value: "az_entra", label: "Azure AD / Entra ID", desc: "Agent identity, RBAC, managed identity, OAuth 2.0", icon: "🔑" },
        { value: "az_keyvault", label: "Key Vault", desc: "Secrets, keys, and certificates with rotation", icon: "🔐" },
        { value: "az_ai_search", label: "Azure AI Search", desc: "Enterprise RAG, semantic search, permission-aware retrieval", icon: "🔍" },
        { value: "az_service_bus", label: "Service Bus / Event Grid", desc: "Async messaging and event-driven triggers", icon: "📨" },
        { value: "az_sql_cosmos", label: "Azure SQL / Cosmos DB", desc: "Relational and NoSQL managed databases", icon: "🗄️" },
        { value: "az_blob", label: "Azure Blob Storage", desc: "Object storage for documents and artifacts", icon: "🪣" },
        { value: "az_monitor", label: "Azure Monitor / App Insights", desc: "Observability, tracing, and agent monitoring", icon: "📊" },
        { value: "az_m365", label: "M365 Copilot", desc: "Publish your agent directly into the M365 surface", icon: "💼" },
        { value: "az_power_automate", label: "Power Automate", desc: "Trigger and run automated business flows", icon: "⚙️" },
        { value: "az_dynamics", label: "Dynamics 365", desc: "CRM, ERP, and business data via Dataverse API", icon: "📈" },
      ],
      gcp: [
        { value: "gcp_agent_engine", label: "Vertex AI Agent Engine", desc: "Managed agent runtime — sessions, memory, evaluation, A2A", icon: "🟡" },
        { value: "gcp_gemini", label: "Vertex AI / Gemini", desc: "Gemini 2.5, Claude via Model Garden, ADK-native", icon: "🤖" },
        { value: "gcp_adk", label: "Agent Development Kit (ADK)", desc: "Google's open-source agent framework — MCP, A2A, single-command deploy", icon: "🛠️" },
        { value: "gcp_workspace", label: "Google Workspace", desc: "Gmail, Drive, Calendar, Meet, Docs, Sheets via MCP servers", icon: "💼" },
        { value: "gcp_cloud_run", label: "Cloud Run / Cloud Functions", desc: "Serverless compute, ADK deploy target", icon: "⚡" },
        { value: "gcp_pubsub", label: "Pub/Sub / Eventarc", desc: "Async agent triggers and A2A event bus", icon: "📨" },
        { value: "gcp_bigquery", label: "BigQuery / Cloud SQL / Spanner", desc: "Analytics and relational databases", icon: "🗄️" },
        { value: "gcp_gcs", label: "Cloud Storage (GCS)", desc: "Object storage, CMEK, VPC-SC compliant", icon: "🪣" },
        { value: "gcp_vertex_search", label: "Vertex AI Search", desc: "Enterprise RAG, hybrid vector/keyword, Drive/Slack/Jira connectors", icon: "🔍" },
        { value: "gcp_secret_manager", label: "Secret Manager", desc: "IAM-scoped credentials with automatic rotation", icon: "🔐" },
        { value: "gcp_trace", label: "Cloud Trace / Logging / Monitoring", desc: "Observability and OpenTelemetry integration", icon: "📊" },
        { value: "gcp_iam", label: "IAM Agent Identity", desc: "First-class IAM principal, least-privilege, VPC-SC", icon: "🔑" },
        { value: "gcp_workflows", label: "Cloud Workflows", desc: "State machine orchestration, Eventarc-triggered", icon: "🔄" },
        { value: "gcp_apigee", label: "Apigee", desc: "API management and MCP gateway", icon: "🚪" },
        { value: "gcp_model_armor", label: "Model Armor", desc: "Prompt injection protection and tool call screening", icon: "🛡️" },
      ],
    };

    const UNIVERSAL_TOOLS = [
      { value: "web_search", label: "Web search", desc: "Find current information online", icon: "🔍" },
      { value: "rest_api", label: "REST APIs / OpenAPI", desc: "Connect to any external web service", icon: "🔌" },
      { value: "database", label: "Database queries", desc: "Read/write structured data", icon: "🗄️" },
      { value: "files", label: "File read / write", desc: "Access documents and data files", icon: "📁" },
      { value: "email", label: "Email", desc: "Send, read, or draft messages", icon: "📧" },
      { value: "slack", label: "Slack", desc: "Messages, channels, events", icon: "💬" },
      { value: "calendar", label: "Calendar / scheduling", desc: "Manage meetings and events", icon: "📅" },
      { value: "github", label: "GitHub / source control", desc: "Code, PRs, issues", icon: "🐙" },
      { value: "jira", label: "Jira / project management", desc: "Create, update, and track tasks", icon: "📌" },
      { value: "crm", label: "CRM (Salesforce / HubSpot)", desc: "Customer and sales data", icon: "☁️" },
      { value: "code_exec", label: "Code execution", desc: "Run scripts, process data, generate output", icon: "💻" },
      { value: "browser", label: "Browser / web scraping", desc: "Navigate pages, extract content", icon: "🌐" },
      { value: "other_agents", label: "Other agents / LLMs (A2A / MCP)", desc: "Coordinate with specialist agents", icon: "🤖" },
      { value: "knowledge_base", label: "Internal knowledge base / RAG", desc: "Retrieve from company docs", icon: "📚" },
    ];

    const inferToolSelections = () => {
      const selected = new Set(tools);
      const d = description.toLowerCase();
      const has = (...terms: string[]) => terms.some(t => d.includes(t));
      if (has("search", "web search", "google", "browse", "internet")) selected.add("web_search");
      if (has("slack")) selected.add("slack");
      if (has("jira", "ticket", "issue tracker")) selected.add("jira");
      if (has("email", "outlook", "gmail", "send mail")) selected.add("email");
      if (has("github", "git", "pull request", "pr", "repo")) selected.add("github");
      if (has("database", "postgres", "mysql", "sql", "dynamo", "data store")) selected.add("database");
      if (has("file", "document", "pdf", "docx", "xlsx", "csv")) selected.add("files");
      if (has("calendar", "meeting", "schedule", "event")) selected.add("calendar");
      if (has("salesforce", "hubspot", "crm", "customer data")) selected.add("crm");
      if (has("code", "script", "run", "execute", "python", "javascript")) selected.add("code_exec");
      if (has("rag", "knowledge base", "vector", "retriev", "internal doc")) selected.add("knowledge_base");
      if (has("multi-agent", "other agent", "subagent", "specialist agent")) selected.add("other_agents");
      if (platform === "aws") {
        if (has("lambda", "function")) selected.add("aws_lambda");
        if (has("s3", "bucket", "object storage")) selected.add("aws_s3");
        if (has("queue", "sqs", "event", "trigger")) selected.add("aws_sqs");
        if (has("bedrock", "llm", "model")) selected.add("aws_bedrock");
        if (has("secret", "credential", "api key")) selected.add("aws_secrets");
        if (has("monitor", "observ", "log", "trace")) selected.add("aws_cloudwatch");
        if (has("auth", "identity", "user", "cognito")) selected.add("aws_cognito");
        selected.add("aws_agentcore");
      }
      if (platform === "azure") {
        if (has("teams", "microsoft teams")) selected.add("az_teams");
        if (has("sharepoint")) selected.add("az_sharepoint");
        if (has("graph", "m365", "microsoft 365", "office 365")) selected.add("az_graph");
        if (has("exchange", "outlook", "email")) selected.add("az_exchange");
        if (has("logic app", "connector", "workflow")) selected.add("az_logic_apps");
        if (has("function", "serverless")) selected.add("az_functions");
        if (has("openai", "gpt", "model")) selected.add("az_openai");
        if (has("search", "rag", "retriev")) selected.add("az_ai_search");
        if (has("secret", "credential", "key vault")) selected.add("az_keyvault");
        if (has("auth", "identity", "entra", "aad")) selected.add("az_entra");
        if (has("monitor", "observ", "log", "trace", "insight")) selected.add("az_monitor");
        if (has("queue", "event", "service bus", "trigger")) selected.add("az_service_bus");
        selected.add("az_foundry");
      }
      if (platform === "gcp") {
        if (has("workspace", "gmail", "drive", "google docs", "sheets")) selected.add("gcp_workspace");
        if (has("cloud run", "cloud function", "serverless")) selected.add("gcp_cloud_run");
        if (has("pubsub", "pub/sub", "event", "trigger")) selected.add("gcp_pubsub");
        if (has("bigquery", "analytics", "data warehouse")) selected.add("gcp_bigquery");
        if (has("search", "rag", "retriev", "vertex search")) selected.add("gcp_vertex_search");
        if (has("secret", "credential", "key")) selected.add("gcp_secret_manager");
        if (has("monitor", "observ", "log", "trace")) selected.add("gcp_trace");
        if (has("auth", "identity", "iam")) selected.add("gcp_iam");
        if (has("gemini", "model", "llm", "vertex ai")) selected.add("gcp_gemini");
        selected.add("gcp_agent_engine");
        selected.add("gcp_adk");
      }
      return selected;
    };

    if (toolSelections.size === 0) {
      const initial = inferToolSelections();
      if (initial.size > 0) setToolSelections(initial);
    }

    const vendorTools = VENDOR_TOOLS[platform] || [];
    const toggleTool = (val: string) => setToolSelections(s => { const n = new Set(s); n.has(val) ? n.delete(val) : n.add(val); return n; });
    const sortedBySelected = (toolList: typeof UNIVERSAL_TOOLS) => [...toolList].sort((a, b) => (toolSelections.has(b.value) ? 1 : 0) - (toolSelections.has(a.value) ? 1 : 0));

    const renderToolGrid = (toolList: typeof UNIVERSAL_TOOLS, sectionLabel: string, accentColor?: string) => (
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontFamily: T.fontMono, fontSize: "10px", color: accentColor || T.accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>{sectionLabel}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {sortedBySelected(toolList).map(tool => {
            const sel = toolSelections.has(tool.value);
            return (
              <button key={tool.value} onClick={() => toggleTool(tool.value)} style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px",
                borderRadius: "8px", cursor: "pointer", textAlign: "left",
                border: `1px solid ${sel ? T.borderActive : T.border}`,
                background: sel ? T.accentDim : T.surface,
                fontFamily: T.fontSans, transition: "all 0.12s", width: "100%",
              }}>
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{tool.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: sel ? T.accent : T.text, lineHeight: 1.2 }}>{tool.label}</div>
                  <div style={{ fontSize: "11px", color: T.muted, marginTop: "1px" }}>{tool.desc}</div>
                </div>
                <span style={{ color: sel ? T.accent : T.border, fontSize: "14px", flexShrink: 0 }}>{sel ? "✓" : "○"}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

    const platformNames: Record<string, string> = { aws: "AWS Native", azure: "Azure Native", gcp: "GCP Native", onprem: "On-Premises" };
    const selectedCount = toolSelections.size;

    return (
      <div style={container}>
        <BreadcrumbBar stage={stage} setStageAndScroll={setStageAndScroll} />

        <div style={{ maxWidth: "640px", width: "100%", marginBottom: "24px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "8px" }}>TOOLS & INTEGRATIONS</div>
          <h2 style={{ margin: "0 0 8px", fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "26px", color: T.text }}>What does your agent need to reach?</h2>
          <p style={{ margin: 0, fontSize: "14px", color: T.muted, lineHeight: 1.6 }}>
            We've pre-selected tools inferred from your description. Add or remove as needed.
            {selectedCount > 0 && <span style={{ color: T.accent, fontWeight: "600" }}> {selectedCount} selected.</span>}
          </p>
        </div>
        <div style={card}>
          {vendorTools.length > 0 && renderToolGrid(vendorTools, platformNames[platform] || "Platform Services", T.accent)}
          {renderToolGrid(UNIVERSAL_TOOLS, "Universal Integrations", T.muted)}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "20px", borderTop: `1px solid ${T.border}` }}>
            <button style={btnGhost} onClick={() => setStageAndScroll("constraints")}>← Constraints</button>
            <button style={btnPrimary} onClick={() => { setTools(Array.from(toolSelections)); autoSave(); setStageAndScroll("security"); }}>Security →</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "security") {
    return (
      <div style={container}>
        <BreadcrumbBar stage={stage} setStageAndScroll={setStageAndScroll} />

        <div style={{ maxWidth: "640px", width: "100%", marginBottom: "24px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "8px" }}>SECURITY & COMPLIANCE</div>
          <h2 style={{ margin: "0 0 8px", fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "26px", color: T.text }}>Security requirements</h2>
          <p style={{ margin: 0, fontSize: "14px", color: T.muted, lineHeight: 1.6 }}>
            Select everything that applies. If you plan to share this agent with anyone — colleagues, customers, or the public — these choices directly affect your legal exposure.
          </p>
        </div>
        <div style={card}>
          <SecurityPanel selected={security} onChange={setSecurity} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "20px", borderTop: `1px solid ${T.border}` }}>
            <button style={btnGhost} onClick={() => setStageAndScroll("tools")}>← Tools</button>
            <button style={btnPrimary} onClick={() => { autoSave(); setStageAndScroll("review"); }}>Review & generate →</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "review") {
    const filledFields = Object.keys(FIELDS).filter(f => answers[f]);
    const displayVal = (fieldKey: string, val: string) => {
      const opt = FIELDS[fieldKey]?.options?.find(o => o.value === val);
      return opt ? `${opt.icon} ${opt.label}` : val;
    };

    return (
      <div style={container}>
        <BreadcrumbBar stage={stage} setStageAndScroll={setStageAndScroll} />

        <div style={{ maxWidth: "640px", width: "100%", marginBottom: "24px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "8px" }}>READY TO GENERATE</div>
          <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "26px", color: T.text }}>Review your specification</h2>
        </div>
        <div style={card}>
          <SecurityBanner selected={security} />

          {inferred?.summary && (
            <div style={{ marginBottom: "20px", padding: "12px 16px", background: T.surfaceRaised, borderRadius: "10px", borderLeft: `3px solid ${T.borderActive}`, fontSize: "13px", color: T.muted, fontStyle: "italic", lineHeight: 1.6 }}>
              "{inferred.summary}"
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <MonoLabel>Architecture parameters</MonoLabel>
            <button onClick={() => setStageAndScroll("refine")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.fontMono, fontSize: "10px", color: T.accent, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.accentBorder}` }}>EDIT ✎</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "20px" }}>
            {filledFields.map(f => (
              <button key={f} onClick={() => setStageAndScroll("refine")} style={{ padding: "9px 12px", background: T.surfaceRaised, borderRadius: "8px", border: `1px solid ${T.border}`, cursor: "pointer", textAlign: "left", transition: "border 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderActive)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
                <div style={{ fontSize: "10px", color: T.muted, fontFamily: T.fontMono, letterSpacing: "0.04em", marginBottom: "3px", textTransform: "uppercase" }}>{FIELDS[f].label}</div>
                <div style={{ fontSize: "12px", color: T.text, fontWeight: "600" }}>{displayVal(f, answers[f])}</div>
              </button>
            ))}
          </div>

          {security.length > 0 && <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <MonoLabel>Security & compliance</MonoLabel>
              <button onClick={() => setStageAndScroll("security")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.fontMono, fontSize: "10px", color: T.accent, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.accentBorder}` }}>EDIT ✎</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
              {security.map(s => { const o = SECURITY_OPTIONS.find(x => x.value === s); return o ? <button key={s} onClick={() => setStageAndScroll("security")} style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: "6px", padding: "4px 10px", fontSize: "12px", color: T.text, cursor: "pointer" }}>{o.icon} {o.label}</button> : null; })}
            </div>
          </>}

          {tools.length > 0 && <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <MonoLabel>Tools & integrations</MonoLabel>
              <button onClick={() => setStageAndScroll("tools")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.fontMono, fontSize: "10px", color: T.accent, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.accentBorder}` }}>EDIT ✎</button>
            </div>
            <p onClick={() => setStageAndScroll("tools")} style={{ fontSize: "12px", color: T.muted, margin: "0 0 20px", lineHeight: 1.6, cursor: "pointer" }}>{tools.length} integration{tools.length !== 1 ? "s" : ""} selected — click to edit</p>
          </>}

          {constraints && <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <MonoLabel>Constraints</MonoLabel>
              <button onClick={() => setStageAndScroll("constraints")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.fontMono, fontSize: "10px", color: T.accent, letterSpacing: "0.04em", padding: "2px 8px", borderRadius: "4px", border: `1px solid ${T.accentBorder}` }}>EDIT ✎</button>
            </div>
            <p onClick={() => setStageAndScroll("constraints")} style={{ fontSize: "13px", color: T.muted, margin: "0 0 20px", lineHeight: 1.6, fontStyle: "italic", cursor: "pointer" }}>"{constraints}"</p>
          </>}

          <MonoLabel>Agents being consulted</MonoLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "28px" }}>
            {["🏗️ Architect", "🔄 DevOps", "🔒 Security", "✍️ Tech Writing", "⚖️ Eval", "🛡️ Safety", "🧠 Memory", ...(customAgents ? [`🧪 ${customAgents.split(",")[0].trim()}`] : [])].map(a => (
              <span key={a} style={{ background: T.accentDim, border: `1px solid ${T.accentBorder}`, color: T.accent, borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontWeight: "600", fontFamily: T.fontMono }}>{a}</span>
            ))}
          </div>

          <button onClick={handleGenerate} style={{ ...btnPrimary, width: "100%", padding: "14px", fontSize: "15px" }}>
            ✨ Generate Architecture Spec
          </button>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={{ ...btnGhost, flex: 1 }} onClick={() => setStageAndScroll("security")}>← Security</button>
            <button style={{ ...btnGhost, flex: 1 }} onClick={() => setStageAndScroll("tools")}>← Tools</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "generating") {
    const hasContent = specContent.length > 0;
    const agentList = Object.entries(agentStatuses);
    const allAgentsDone = agentList.length > 0 && agentList.every(([, { status }]) => status === "done");

    return (
      <div style={{ ...container }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25}}@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ maxWidth: "760px", width: "100%", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "20px", display: "inline-block", animation: "spin 1.8s linear infinite", flexShrink: 0 }}>⚙️</div>
          <div>
            <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em" }}>
              {genPhase === "synthesis" ? "SYNTHESIZING" : genPhase === "specialists" ? "SPECIALIST REVIEW" : "INITIALIZING"}
            </div>
            <div style={{ fontSize: "13px", color: T.muted }}>
              {hasContent ? "Writing your architecture specification..." : genPhase === "synthesis" ? "Lead architect synthesizing all reviews..." : genPhase === "specialists" ? "Specialist panel reviewing your system..." : "Starting..."}
            </div>
          </div>
        </div>

        {agentList.length > 0 && (
          <div style={{ maxWidth: "760px", width: "100%", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "5px" }}>
            {agentList.map(([id, { status, name, icon }]) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", background: T.surface, borderRadius: "8px", border: `1px solid ${status === "done" ? T.accentBorder : T.border}`, fontSize: "12px", fontFamily: T.fontMono, animation: "fadeIn 0.2s ease-out", transition: "border 0.2s" }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>
                <span style={{ color: status === "done" ? T.muted : T.text }}>{name}</span>
                <span style={{ marginLeft: "auto", color: status === "done" ? T.green : T.accent, fontSize: "10px", animation: status === "working" ? "pulse 1.4s ease-in-out infinite" : "none" }}>
                  {status === "done" ? "✓ DONE" : "REVIEWING..."}
                </span>
              </div>
            ))}
            {allAgentsDone && genPhase === "synthesis" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", background: T.accentDim, borderRadius: "8px", border: `1px solid ${T.accentBorder}`, fontSize: "12px", fontFamily: T.fontMono, animation: "fadeIn 0.2s ease-out" }}>
                <span style={{ color: T.accent, fontSize: "10px", animation: "pulse 1.4s ease-in-out infinite" }}>●</span>
                <span style={{ color: T.accent }}>Lead Architect</span>
                <span style={{ marginLeft: "auto", color: T.accent, fontSize: "10px", animation: "pulse 1.4s ease-in-out infinite" }}>SYNTHESIZING...</span>
              </div>
            )}
          </div>
        )}

        {hasContent && (
          <div ref={specRef} style={{ maxWidth: "760px", width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "36px", boxSizing: "border-box", maxHeight: "55vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <style>{`
              .spec-content h1{font-family:${T.fontDisplay};font-weight:400;font-size:26px;color:${T.text};margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid ${T.border}}
              .spec-content h2{font-family:${T.fontDisplay};font-weight:400;font-size:20px;color:${T.accent};margin:28px 0 12px}
              .spec-content h3{font-size:14px;font-weight:700;color:${T.text};margin:20px 0 8px;font-family:${T.fontSans}}
              .spec-content p{font-size:13px;color:${T.muted};line-height:1.75;margin:0 0 12px}
              .spec-content ul,.spec-content ol{margin:0 0 14px;padding-left:20px}
              .spec-content li{font-size:13px;color:${T.muted};line-height:1.7;margin-bottom:4px}
              .spec-content strong{color:${T.text};font-weight:700}
              .spec-content code{font-family:${T.fontMono};font-size:11px;background:${T.surfaceRaised};border:1px solid ${T.border};border-radius:4px;padding:1px 5px;color:${T.accent}}
              .spec-content pre{background:${T.surfaceRaised};border:1px solid ${T.border};border-radius:8px;padding:14px;overflow-x:auto;margin:0 0 14px}
              .spec-content pre code{background:none;border:none;padding:0;font-size:12px;color:${T.text}}
              .spec-content blockquote{border-left:3px solid ${T.accentBorder};margin:0 0 14px;padding:8px 16px;background:${T.accentDim};border-radius:0 8px 8px 0}
              .spec-content blockquote p{color:${T.text};margin:0}
              .spec-content hr{border:none;border-top:1px solid ${T.border};margin:24px 0}
            `}</style>
            <div className="spec-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{specContent}</ReactMarkdown>
            </div>
            <span style={{ display: "inline-block", width: "2px", height: "14px", background: T.accent, animation: "cursor-blink 1s ease-in-out infinite", verticalAlign: "middle", marginLeft: "2px" }} />
          </div>
        )}
      </div>
    );
  }

  if (stage === "done") {
    const copySpec = () => { navigator.clipboard.writeText(specContent).catch(() => {}); };
    const downloadSpec = () => {
      const blob = new Blob([specContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "architecture-spec.md"; a.click();
      URL.revokeObjectURL(url);
    };
    return (
      <div style={container}>
        <style>{`
          .spec-content h1{font-family:${T.fontDisplay};font-weight:400;font-size:26px;color:${T.text};margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid ${T.border}}
          .spec-content h2{font-family:${T.fontDisplay};font-weight:400;font-size:20px;color:${T.accent};margin:28px 0 12px}
          .spec-content h3{font-size:14px;font-weight:700;color:${T.text};margin:20px 0 8px;font-family:${T.fontSans}}
          .spec-content p{font-size:13px;color:${T.muted};line-height:1.75;margin:0 0 12px}
          .spec-content ul,.spec-content ol{margin:0 0 14px;padding-left:20px}
          .spec-content li{font-size:13px;color:${T.muted};line-height:1.7;margin-bottom:4px}
          .spec-content strong{color:${T.text};font-weight:700}
          .spec-content code{font-family:${T.fontMono};font-size:11px;background:${T.surfaceRaised};border:1px solid ${T.border};border-radius:4px;padding:1px 5px;color:${T.accent}}
          .spec-content pre{background:${T.surfaceRaised};border:1px solid ${T.border};border-radius:8px;padding:14px;overflow-x:auto;margin:0 0 14px}
          .spec-content pre code{background:none;border:none;padding:0;font-size:12px;color:${T.text}}
          .spec-content blockquote{border-left:3px solid ${T.accentBorder};margin:0 0 14px;padding:8px 16px;background:${T.accentDim};border-radius:0 8px 8px 0}
          .spec-content blockquote p{color:${T.text};margin:0}
          .spec-content hr{border:none;border-top:1px solid ${T.border};margin:24px 0}
        `}</style>
        <div style={{ maxWidth: "760px", width: "100%", marginBottom: "20px" }}>
          <div style={{ fontFamily: T.fontMono, fontSize: "11px", color: T.accent, letterSpacing: "0.1em", marginBottom: "8px" }}>SPEC COMPLETE</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontWeight: "400", fontSize: "26px", color: T.text }}>Your architecture spec</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={copySpec} style={{ ...btnGhost, padding: "9px 16px", fontSize: "13px" }}>📋 Copy</button>
              <button onClick={downloadSpec} style={{ ...btnGhost, padding: "9px 16px", fontSize: "13px" }}>⬇ Download .md</button>
              <button onClick={() => {
                setStageAndScroll("describe"); setDescription(""); setInferred(null); setAnswers({});
                setSecurity([]); setTools([]); setToolSelections(new Set()); setConstraints(""); setCustomAgents(""); setLegacyDesc(""); setSpecContent("");
              }} style={{ ...btnGhost, padding: "9px 16px", fontSize: "13px" }}>↺ Start over</button>
            </div>
          </div>
        </div>
        {specError && (
          <div style={{ maxWidth: "760px", width: "100%", marginBottom: "16px", padding: "14px 16px", background: T.dangerDim, border: `1px solid ${T.dangerBorder}`, borderRadius: "10px", fontSize: "13px", color: T.danger }}>
            {specError}
          </div>
        )}
        <div style={{ maxWidth: "760px", width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "36px", boxSizing: "border-box", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
          {specContent ? (
            <div className="spec-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{specContent}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontSize: "14px" }}>
              No spec content was generated. Please try again.
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
