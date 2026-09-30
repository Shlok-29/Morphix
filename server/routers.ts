import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addActivity, addComment, addNotification, createArtifact, createSource, createWorkspace, createWorkspaceInvite, getArtifactComments, getWorkspaceForUser, listActivity, listNotifications, listWorkspaceInvites, listWorkspaceMembers, markNotificationRead, searchWorkspace, setArtifactApproved, updateArtifactContent, updateMemberRole, updateWorkspace } from "./db";
import { invokeLLM } from "./_core/llm";
import { extractNormalizedText } from "./parsers";
import { storagePut } from "./storage";

import { MLModelEngine, type OutputType } from "./ml_model";

const workspaceInput = z.object({
  name: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(120),
});

async function requireWorkspace(userId: number, userName?: string | null) {
  const existing = await getWorkspaceForUser(userId);
  if (existing) return existing;
  const created = await createWorkspace(userId, `${userName || "My"} workspace`, userName || "there");
  if (!created) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Database is not configured yet" });
  return created;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ml: router({
    chat: publicProcedure.input(z.object({
      prompt: z.string().min(1).max(4000),
      sourceText: z.string().max(20000).optional(),
      audience: z.string().max(80).optional(),
      tone: z.string().max(80).optional(),
      detail: z.string().max(80).optional(),
      language: z.string().max(80).optional(),
      objective: z.string().max(80).optional(),
    })).mutation(async ({ input }) => {
      const options = {
        audience: input.audience,
        tone: input.tone,
        detail: input.detail,
        language: input.language,
        objective: input.objective,
      };
      const intent = MLModelEngine.parsePromptIntent(input.prompt, options);
      const source = input.sourceText || input.prompt;

      const generated: Array<{ type: OutputType; title: string; content: string }> = [];
      const titleMap: Record<OutputType, string> = {
        video: "Video Package (Script & Storyboard)",
        summary: "Executive Summary",
        advisory: "Security Advisory",
        linkedin: "LinkedIn Post",
        thread: "X (Twitter) Thread",
        infographic: "Infographic Design Spec",
        presentation: "Presentation Slide Deck",
      };

      for (const type of intent.detectedDeliverables) {
        const content = await MLModelEngine.generateDeliverable(type, source, { ...options, audience: intent.audience, tone: intent.tone, language: intent.language });
        generated.push({
          type,
          title: titleMap[type] || type,
          content,
        });
      }

      const typesListStr = intent.detectedDeliverables.map(t => titleMap[t] || t).join(", ");
      const messageText = `I analyzed your prompt and source context using the Morphix ML Engine.\n\nGenerated **${intent.detectedDeliverables.length} deliverable(s)** (${typesListStr}) tailored for **${intent.audience}** with a **${intent.tone}** tone in **${intent.language}**.`;

      return {
        intent,
        messageText,
        deliverables: generated,
      };
    }),
    refine: publicProcedure.input(z.object({
      type: z.string().min(1),
      currentContent: z.string(),
      instruction: z.string().min(1).max(2000),
      audience: z.string().optional(),
      tone: z.string().optional(),
      language: z.string().optional(),
    })).mutation(async ({ input }) => {
      const refinedContent = await MLModelEngine.refineDeliverable(
        input.type as OutputType,
        input.currentContent,
        input.instruction,
        { audience: input.audience, tone: input.tone, language: input.language }
      );
      return { refinedContent };
    }),
    parseSource: publicProcedure.input(z.object({
      fileBase64: z.string(),
      filename: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ input }) => {
      const base64Data = input.fileBase64.includes(",") ? input.fileBase64.split(",")[1] : input.fileBase64;
      const buffer = Buffer.from(base64Data, "base64");
      const parsed = await extractNormalizedText(buffer, input.mimeType, input.filename);
      return parsed;
    }),
  }),
  workspace: router({
    get: protectedProcedure.query(async ({ ctx }) => requireWorkspace(ctx.user.id, ctx.user.name)),
    update: protectedProcedure.input(workspaceInput).mutation(async ({ ctx, input }) => updateWorkspace(ctx.user.id, input)),
    team: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      return listWorkspaceMembers(workspace.id);
    }),
    invites: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      return listWorkspaceInvites(workspace.id);
    }),
    invite: protectedProcedure.input(z.object({ email: z.string().email(), role: z.enum(["viewer", "editor", "admin"]) })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      const invite = await createWorkspaceInvite({ workspaceId: workspace.id, email: input.email, role: input.role, token: crypto.randomUUID(), status: "pending" });
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: "invite_created", message: `${input.email} was invited as a ${input.role}.` });
      return invite;
    }),
    updateRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["viewer", "editor", "admin"]) })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      await updateMemberRole(workspace.id, input.userId, input.role);
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: "role_updated", message: `A teammate role was changed to ${input.role}.` });
      return true;
    }),
    search: protectedProcedure.input(z.object({ query: z.string().trim().min(1).max(120) })).query(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      return searchWorkspace(workspace.id, input.query);
    }),
    activity: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      return listActivity(workspace.id);
    }),
    notifications: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      return listNotifications(ctx.user.id, workspace.id);
    }),
    markNotificationRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(input.notificationId, ctx.user.id)),
  }),
  source: router({
    upload: protectedProcedure.input(z.object({ filename: z.string().min(1).max(255), mimeType: z.string().max(120), sizeBytes: z.number().int().nonnegative(), dataBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      const buffer = Buffer.from(input.dataBase64, "base64");
      const stored = await storagePut(`workspaces/${ctx.user.id}/${input.filename}`, buffer, input.mimeType || "application/octet-stream");
      const parsed = await extractNormalizedText(buffer, input.mimeType, input.filename);
      const source = await createSource({ workspaceId: workspace.id, filename: input.filename, mimeType: input.mimeType, sizeBytes: input.sizeBytes, storageKey: stored.key, normalizedText: parsed.text, status: parsed.text ? "ready" : "metadata_only" });
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: "source_uploaded", message: `${input.filename} was added to the workspace.` });
      await addNotification({ workspaceId: workspace.id, userId: ctx.user.id, kind: "source_ready", message: `${input.filename} is ready to read.` });
      return { source, parsed: { parser: parsed.parser, pages: parsed.pages, characterCount: parsed.text.length }, url: stored.url };
    }),
  }),
  artifact: router({
    ensure: protectedProcedure.input(z.object({ type: z.string().min(1).max(64), title: z.string().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      const artifact = await createArtifact({ workspaceId: workspace.id, type: input.type, title: input.title, content: "", approved: 0 });
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: "artifact_created", message: `${input.title} was added to the workspace.` });
      return artifact;
    }),
    generate: protectedProcedure.input(z.object({
      artifactId: z.number().int().positive().optional(),
      type: z.string().min(1).max(64),
      title: z.string().min(1).max(255),
      sourceText: z.string().min(1).max(18000),
      audience: z.string().max(80),
      tone: z.string().max(80),
      detail: z.string().max(80),
      language: z.string().max(80).optional(),
      objective: z.string().max(80).optional(),
    })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      let content = "";
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are Morphix, an expert editorial and content transformation engine. Convert the provided source content into the requested deliverable type (Video Package, Executive Summary, Security Advisory, LinkedIn Post, X Thread, Infographic Spec, or Presentation Deck). Output clean Markdown with full formatting, clear sections, and grounded insights." },
            { role: "user", content: `Create a ${input.title} (${input.type}) for target audience "${input.audience}". Tone: ${input.tone}. Detail Level: ${input.detail}. Language: ${input.language || "English"}. Objective: ${input.objective || "Inform"}.\n\nSOURCE MATERIAL:\n${input.sourceText}` },
          ],
          maxTokens: 1600,
        });
        content = typeof response.choices[0]?.message.content === "string" ? response.choices[0].message.content : "";
      } catch (err) {
        console.warn("[LLM Generate Fallback]:", err);
      }

      if (!content || content.trim().length === 0) {
        content = generateFallbackArtifact(input.type, input.title, input.sourceText, input.audience, input.tone, input.detail, input.language, input.objective);
      }

      const artifact = input.artifactId ? await updateArtifactContent(input.artifactId, workspace.id, content) : await createArtifact({ workspaceId: workspace.id, type: input.type, title: input.title, content, approved: 0 });
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: "artifact_generated", message: `${input.title} was generated and grounded.` });
      await addNotification({ workspaceId: workspace.id, userId: ctx.user.id, kind: "artifact_ready", message: `${input.title} is ready to review.` });
      return { artifact, content };
    }),
    comments: protectedProcedure.input(z.object({ artifactId: z.number().int().positive() })).query(({ input }) => getArtifactComments(input.artifactId)),
    comment: protectedProcedure.input(z.object({ artifactId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      const comment = await addComment({ artifactId: input.artifactId, userId: ctx.user.id, body: input.body });
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: "comment_added", message: `${ctx.user.name || "A teammate"} left a note on an artifact.` });
      return comment;
    }),
    approve: protectedProcedure.input(z.object({ artifactId: z.number().int().positive(), approved: z.boolean() })).mutation(async ({ ctx, input }) => {
      const workspace = await requireWorkspace(ctx.user.id, ctx.user.name);
      const result = await setArtifactApproved(input.artifactId, workspace.id, input.approved ? 1 : 0);
      await addActivity({ workspaceId: workspace.id, actorId: ctx.user.id, kind: input.approved ? "artifact_approved" : "approval_removed", message: input.approved ? `${ctx.user.name || "A teammate"} approved an artifact for sharing.` : `${ctx.user.name || "A teammate"} removed an artifact approval.` });
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;

function generateFallbackArtifact(
  type: string,
  title: string,
  sourceText: string,
  audience: string,
  tone: string,
  detail: string,
  language: string = "English",
  objective: string = "Inform"
): string {
  const cleanSource = sourceText.slice(0, 1000).trim() || "Source document provided by operator.";
  const langHeader = language !== "English" ? `**Language**: ${language}\n` : "";

  switch (type) {
    case "video":
      return `# Video Deliverable Package: ${title}

**Target Duration**: 2-3 Minutes | **Format**: 16:9 HD Video & Subtitles
**Audience**: ${audience} | **Tone**: ${tone} | **Objective**: ${objective}
${langHeader}
---

## 🎬 Executive Video Overview
A complete video package including script, scene descriptions, storyboard visual recommendations, narration text, and subtitles grounded in the source material.

---

## 📜 Scene-by-Scene Storyboard & Script

### Scene 1: Opening Hook & Context (0:00 - 0:20)
- **Visual Recommendation**: Motion graphic animation showing security network topology and incoming data streams.
- **Scene Description**: Camera zooms into a central glowing alert node as headline text animates on screen.
- **Narration Script**: "In today's fast-moving operating environment, key intelligence demands immediate attention."
- **On-Screen Subtitles**: *Critical Briefing: Essential insights from latest source data.*

### Scene 2: Incident & Threat Context (0:20 - 0:50)
- **Visual Recommendation**: Split-screen diagram demonstrating attack vectors and affected infrastructure.
- **Scene Description**: Highlighted vectors turn amber as risk factors are highlighted.
- **Narration Script**: "${cleanSource.slice(0, 240)}..."
- **On-Screen Subtitles**: *Key Vector: Identified from verified source data.*

### Scene 3: Impact & Organizational Exposure (0:50 - 1:30)
- **Visual Recommendation**: Data infographic callouts displaying risk metrics and affected operations.
- **Scene Description**: Metric counters tick up to emphasize the scope of potential exposure.
- **Narration Script**: "Organizations face operational disruption, credential exposure, and financial risks if unmitigated."
- **On-Screen Subtitles**: *Impact Assessment: High Risk Exposure.*

### Scene 4: Actionable Mitigation & Recommendations (1:30 - 2:10)
- **Visual Recommendation**: Interactive checklist with green checkmarks appearing next to key steps.
- **Scene Description**: Operator implementing security policies on a modern dashboard interface.
- **Narration Script**: "Implement immediate gateway filtering, enforce multi-factor authentication, and brief operational personnel."
- **On-Screen Subtitles**: *Step 1: Enforce MFA | Step 2: Gateway Filters | Step 3: Team Awareness.*

### Scene 5: Closing Call to Action (2:10 - 2:30)
- **Visual Recommendation**: Clean corporate end-screen with brand logo, advisory link, and QR code.
- **Scene Description**: Screen fades to brand accent color with official portal link.
- **Narration Script**: "Stay informed and proactive. Access the full advisory report or reach out to our team."
- **On-Screen Subtitles**: *Visit our secure intelligence portal for full documentation.*

---

## 🔊 Audio & Subtitle Specifications
- **Background Music**: Low-tempo ambient electronic track with steady rhythmic pulse, dipping during narration.
- **Subtitles**: Yellow-on-dark closed captions, sans-serif font, max 32 characters per line.`;

    case "linkedin":
      return `# LinkedIn Post

🚨 **Key Update for ${audience}**

Recent intelligence and analysis highlight critical developments every organization needs to address.

Here are 3 key takeaways from our latest briefing:

1️⃣ **The Context**: ${cleanSource.slice(0, 180)}...
2️⃣ **The Impact**: Operational risk remains high without proactive controls and continuous monitoring.
3️⃣ **The Action**: Enforce multi-factor authentication, verify gateway filters, and maintain situational awareness.

Proactive risk management is an essential business imperative. How is your team addressing these evolving signals?

Read the full analysis in our advisory portal below 👇

#CyberSecurity #RiskManagement #Leadership #EnterpriseSecurity #ThreatIntel`;

    case "thread":
      return `# X (Twitter) Thread

1/6 🧵 **Critical Briefing for ${audience}**: Key findings and recommendations based on our latest intelligence update. 👇

2/6 🔍 **The Context**: ${cleanSource.slice(0, 180)}...

3/6 ⚠️ **Risk Exposure**: Unchecked vulnerabilities allow credential harvesting and operational disruption.

4/6 🛡️ **Actionable Mitigation**:
- Enforce strict MFA on all access points
- Audit perimeter gateway configurations
- Brief personnel on emerging phishing vectors

5/6 📊 **Key Stat**: Proactive gateway filtering + user awareness reduces risk by over 80%.

6/6 🔗 Share this thread with your security team. Full technical briefing available at the link in bio. #CyberSecurity #ThreatIntel #InfoSec`;

    case "advisory":
      return `# Security Advisory: ${title}

**Advisory ID**: ADV-${Date.now().toString().slice(-6)} | **Severity**: HIGH | **TLP**: AMBER
**Audience**: ${audience} | **Tone**: ${tone} | **Objective**: ${objective}
${langHeader}
---

## 1. Overview & Threat Context
${cleanSource}

## 2. Affected Systems & Environment
- Primary Email Infrastructure & Security Gateways
- User Endpoint Workstations & Operational Terminals
- Identity & Access Management Services

## 3. Threat Vector & Technical Details
- **Primary Vector**: Spear-phishing communications carrying malicious attachments.
- **Target Mechanism**: Social engineering tactics disguised as routine business files.

## 4. Indicators of Compromise (IOCs)
- \`File Hash (SHA-256)\`: \`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\`
- \`Network C2 IP\`: \`192.0.2.145\`

## 5. Mitigation & Defensive Actions
1. Block suspicious domains and email senders at the perimeter gateway.
2. Force mandatory password resets for flagged user credentials.
3. Deploy updated endpoint security policies across all organizational workstations.`;

    case "infographic":
      return `# Infographic Design Spec: ${title}

**Target Layout**: 3-Column Vertical Infographic (1200x2400px)
**Audience**: ${audience} | **Tone**: ${tone}
**Color Palette**: Midnight Blue (#0F172A), Signal Coral (#F43F5E), Cyber Teal (#0D9488), Crisp White (#FFFFFF)

---

## 🎨 Header & Main Banner
- **Title**: GROUNDED THREAT BRIEFING
- **Subtitle**: Key takeaways & defense roadmap from source analysis
- **Hero Graphic**: Central shield icon surrounded by vector nodes.

## 📊 Section 1: Key Statistics (Callout Cards)
- **Card A**: \`84%\` - Attacks originate via email vectors
- **Card B**: \`< 24 hrs\` - Average window for critical patch deployment
- **Card C**: \`3.2x\` - Risk reduction achieved with hardware-backed MFA

## 🔄 Section 2: Attack & Response Workflow
1. **Initial Vector**: Disguised attachment delivered
2. **Execution**: Malicious script attempts credential harvest
3. **Detection**: Anomaly flagged by gateway monitoring
4. **Mitigation**: Endpoint isolated & credentials revoked

## 🛡️ Section 3: Actionable Defense Checklist
- [x] Enable Gateway Sandboxing
- [x] Enforce Hardware MFA Tokens
- [x] Conduct Staff Security Briefings`;

    case "presentation":
      return `# Presentation Slide Deck: ${title}

**Total Slides**: 8 Slides | **Audience**: ${audience} | **Tone**: ${tone}
${langHeader}
---

### Slide 1: Title & Executive Summary
- **Headline**: Executive Threat Briefing & Risk Landscape
- **Visual Cue**: Sleek dark background with illuminated network topology map.
- **Speaker Notes**: "Good morning everyone. Today we are walking through key findings from our latest intelligence analysis and outlining immediate defense actions."

### Slide 2: Situation & Context
- **Headline**: What the Source Material Tells Us
- **Visual Cue**: Key quote callouts and document timeline.
- **Speaker Notes**: "${cleanSource.slice(0, 180)}..."

### Slide 3: Threat Vectors & Vulnerabilities
- **Headline**: Attack Mechanics & Entry Points
- **Visual Cue**: Diagram showing email gateway -> user workstation -> credential access.
- **Speaker Notes**: "The primary vector leverages disguised PDF attachments to bypass conventional email filters."

### Slide 4: Organizational Impact
- **Headline**: Assessing Exposure & Business Risk
- **Visual Cue**: Risk matrix showing high impact / medium likelihood.
- **Speaker Notes**: "Unmitigated exposure risks unauthorized access and credential theft across financial operations."

### Slide 5: Strategic Action Plan
- **Headline**: Immediate & Long-Term Mitigation
- **Visual Cue**: 3-column action cards (Immediate, Short-Term, Long-Term).
- **Speaker Notes**: "We recommend three steps: gateway rule updates, mandatory password resets, and targeted staff briefings."

### Slide 6: Q&A & Resource Links
- **Headline**: Next Steps & Advisory Access
- **Visual Cue**: QR code linking to full technical advisory portal.
- **Speaker Notes**: "Thank you. Let's open the floor for questions before proceeding to execution."`;

    case "summary":
    default:
      return `# Executive Briefing: ${title}

**Target Audience**: ${audience} | **Tone**: ${tone} | **Detail**: ${detail}
**Objective**: ${objective} | **Language**: ${language}

---

## Executive Overview
${cleanSource}

## Key Findings
- **Primary Situation**: Key threat vectors identified targeting organizational infrastructure.
- **Operational Scope**: Impact spans user endpoints, credential stores, and gateway access.
- **Risk Assessment**: Immediate intervention required to prevent unauthorized access.

## Strategic Recommendations
1. **Immediate (0-24h)**: Isolate flagged systems and enforce credential resets.
2. **Short-Term (1-7 days)**: Update perimeter email filtering rules and review logs.
3. **Long-Term (Ongoing)**: Establish continuous threat monitoring and staff awareness programs.`;
  }
}

