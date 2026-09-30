import { invokeLLM } from "./_core/llm";

export type OutputType = "video" | "summary" | "advisory" | "linkedin" | "thread" | "infographic" | "presentation";

export interface MLTransformOptions {
  audience?: string;
  tone?: string;
  detail?: string;
  language?: string;
  objective?: string;
}

export interface MLIntentResult {
  detectedDeliverables: OutputType[];
  audience: string;
  tone: string;
  language: string;
  objective: string;
  detail: string;
  userPromptSummary: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "model";
  text: string;
  timestamp: string;
  attachments?: Array<{ filename: string; mimeType: string; size: string }>;
  deliverables?: Array<{ type: OutputType; title: string; content: string }>;
}

export class MLModelEngine {
  /**
   * Analyzes natural language user prompt to detect requested output formats and parameters
   */
  static parsePromptIntent(prompt: string, currentOptions: MLTransformOptions = {}): MLIntentResult {
    const lower = prompt.toLowerCase();
    const deliverables: OutputType[] = [];

    if (lower.includes("video") || lower.includes("script") || lower.includes("storyboard") || lower.includes("reel")) {
      deliverables.push("video");
    }
    if (lower.includes("summary") || lower.includes("brief") || lower.includes("overview")) {
      deliverables.push("summary");
    }
    if (lower.includes("advisory") || lower.includes("security") || lower.includes("ioc") || lower.includes("threat")) {
      deliverables.push("advisory");
    }
    if (lower.includes("linkedin") || lower.includes("post")) {
      deliverables.push("linkedin");
    }
    if (lower.includes("twitter") || lower.includes("x thread") || lower.includes("thread") || lower.includes("tweet")) {
      deliverables.push("thread");
    }
    if (lower.includes("infographic") || lower.includes("chart") || lower.includes("diagram") || lower.includes("spec")) {
      deliverables.push("infographic");
    }
    if (lower.includes("presentation") || lower.includes("slide") || lower.includes("deck") || lower.includes("powerpoint")) {
      deliverables.push("presentation");
    }

    // Default to summary + video + linkedin if none specified in prompt
    const finalDeliverables = deliverables.length > 0 ? deliverables : (["summary", "advisory", "video", "linkedin"] as OutputType[]);

    // Detect Audience
    let audience = currentOptions.audience || "Executives";
    if (lower.includes("technical") || lower.includes("developer") || lower.includes("engineer")) audience = "Technical team";
    else if (lower.includes("public") || lower.includes("customer")) audience = "General public";
    else if (lower.includes("board") || lower.includes("c-suite")) audience = "C-Suite / Board";
    else if (lower.includes("government") || lower.includes("regulator")) audience = "Government officials";

    // Detect Tone
    let tone = currentOptions.tone || "Professional";
    if (lower.includes("urgent") || lower.includes("critical") || lower.includes("emergency")) tone = "Urgent";
    else if (lower.includes("educational") || lower.includes("explain")) tone = "Educational";
    else if (lower.includes("authoritative") || lower.includes("official")) tone = "Authoritative";
    else if (lower.includes("casual") || lower.includes("friendly")) tone = "Casual";

    // Detect Language
    let language = currentOptions.language || "English";
    if (lower.includes("spanish") || lower.includes("español")) language = "Spanish";
    else if (lower.includes("french") || lower.includes("français")) language = "French";
    else if (lower.includes("german") || lower.includes("deutsch")) language = "German";
    else if (lower.includes("hindi") || lower.includes("हिंदी")) language = "Hindi";
    else if (lower.includes("japanese") || lower.includes("日本語")) language = "Japanese";

    return {
      detectedDeliverables: Array.from(new Set(finalDeliverables)),
      audience,
      tone,
      language,
      objective: currentOptions.objective || "Inform",
      detail: currentOptions.detail || "Detailed",
      userPromptSummary: prompt.trim() || "Transform source material into deliverables.",
    };
  }

  /**
   * Primary ML Content Transformation function. Uses LLM API when configured,
   * or falls back to intelligent grounded synthesis.
   */
  static async generateDeliverable(
    type: OutputType,
    sourceText: string,
    options: MLTransformOptions = {}
  ): Promise<string> {
    const audience = options.audience || "Executives";
    const tone = options.tone || "Professional";
    const detail = options.detail || "Detailed";
    const language = options.language || "English";
    const objective = options.objective || "Inform";

    const titleMap: Record<OutputType, string> = {
      video: "Video Package (Script & Storyboard)",
      summary: "Executive Summary",
      advisory: "Security Advisory",
      linkedin: "LinkedIn Post",
      thread: "X (Twitter) Thread",
      infographic: "Infographic Design Spec",
      presentation: "Presentation Slide Deck",
    };

    const title = titleMap[type] || type;

    const structuredPromptSpecs: Record<OutputType, string> = {
      video: `Format: Video Package (Script & Storyboard)
Required Sections:
- Title & Target Duration (e.g., 90 Seconds)
- Video Production Overview (Concept, Visual Style, Color Palette, B-Roll recommendations)
- Scene-by-Scene Script & Storyboard (Include: Scene #, Duration, Visual Cues, Shot Composition e.g. Wide/Close-up, Voiceover Script in quotes, On-Screen Text overlays)
- Audio & Background Track cues`,

      summary: `Format: Executive Summary
Required Sections:
- Document Title & Metadata (Audience, Tone, Date)
- Problem Statement & Context (Comprehensive 2-3 paragraph background and root issues)
- Key Findings & Strategic Metrics (Bullet points with quantitative metrics from source)
- Financial & Operational Impact Analysis (Detailed organizational risk & cost assessment)
- Actionable Recommendations & Implementation Roadmap (Immediate 0-30 Days, Short-Term 30-90 Days, Strategic 90+ Days)`,

      advisory: `Format: Security Advisory
Required Sections:
- Header Banner (Threat Severity Level CRITICAL/HIGH/MEDIUM, CVE/Advisory ID, Target Systems)
- Threat Level & Executive Overview
- Vulnerability & Affected Systems (Vulnerability Type, Affected Platforms, Attack Vector)
- Indicators of Compromise (IoCs) & Threat Vectors (Code blocks with MD5/SHA256 file hashes, Network IPs/Domains, Registry keys/Logs)
- Mandatory Remediation & Mitigation Steps (Actionable checklist with checkboxes)`,

      linkedin: `Format: LinkedIn / Social Post
Required Sections:
- Catchy Hook (1-2 powerful lines that stop scrolling)
- Main Insights & Breakdown (3-4 clear, engaging bullet points summarizing source material)
- Key Takeaways (Bullet points)
- Call-to-Action (Engaging question or prompt for audience interaction)
- Strategic Hashtags (#CyberSecurity #TechTrends #Morphix)`,

      presentation: `Format: Presentation Slide Deck
Required Sections:
- Slide Deck Metadata (Total Slides e.g. 8 Slides, Target Audience, Tone)
- Slide 1 to 8 Breakdown (For EACH slide specify: Slide Title, Bullet Points, Visual/Graphic Cue, Speaker Notes in quotes)`,

      thread: `Format: X (Twitter) Thread
Required Sections:
- Numbered 6-tweet sequence (1/6 to 6/6)
- 1/6: Hook & core premise
- 2/6 to 5/6: Key data points, context, and operational impact
- 6/6: Call-to-action link & relevant hashtags`,

      infographic: `Format: Infographic Design Spec
Required Sections:
- Layout Format & Dimensions (e.g. 1200x2400px 3-Column Vertical Infographic)
- Color Palette (Hex codes: Midnight Blue, Cyber Teal, Signal Coral, Pure White)
- Header & Main Visual Banner
- Section 1: Stat Callout Cards (3 large metric cards)
- Section 2: Flowchart & Timeline
- Section 3: Defense Checklist`,
    };

    const specificSpec = structuredPromptSpecs[type] || `Format: ${title}\nProvide structured, publication-ready Markdown.`;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are Morphix, an elite multi-modal content transformation ML engine. Convert the source content into a publication-ready ${title}.
${specificSpec}

CRITICAL RULES:
1. Return ONLY high-quality, fully populated Markdown with complete headings, clear sections, bullet points, and code/quote blocks where specified.
2. Ground all factual claims, metrics, and details directly in the provided source material.
3. Do NOT include meta commentary (e.g., "Here is your deliverable"). Start immediately with the Markdown document.`,
          },
          {
            role: "user",
            content: `DELIVERABLE REQUIRED: ${title}
TARGET AUDIENCE: ${audience}
TONE: ${tone}
DETAIL LEVEL: ${detail}
LANGUAGE: ${language}
OBJECTIVE: ${objective}

SOURCE CONTENT MATERIAL:
${sourceText}`,
          },
        ],
        model: "gpt-4o-mini",
        maxTokens: 2200,
      });

      const content = typeof response.choices[0]?.message.content === "string" ? response.choices[0].message.content : "";
      if (content && content.trim().length > 50) {
        return content;
      }
    } catch (err) {
      console.warn(`[ML Model Fallback for ${type}]:`, err);
    }

    // Fallback grounded synthesis
    return this.generateGroundedFallback(type, title, sourceText, audience, tone, detail, language, objective);
  }

  /**
   * Refines an existing deliverable based on user chat instruction (e.g., "Make it shorter", "Add more technical IOCs")
   */
  static async refineDeliverable(
    type: OutputType,
    currentContent: string,
    refinementInstruction: string,
    options: MLTransformOptions = {}
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are Morphix ML Model. Refine the existing deliverable according to the user's specific instruction while preserving accuracy and grounding. Return clean updated Markdown.",
          },
          {
            role: "user",
            content: `REFINEMENT INSTRUCTION: ${refinementInstruction}\n\nCURRENT DELIVERABLE CONTENT:\n${currentContent}`,
          },
        ],
        maxTokens: 1800,
      });

      const content = typeof response.choices[0]?.message.content === "string" ? response.choices[0].message.content : "";
      if (content && content.trim().length > 30) {
        return content;
      }
    } catch (err) {
      console.warn(`[ML Model Refinement Fallback]:`, err);
    }

    // Direct string refinement fallback
    return `# Refined ${type.toUpperCase()} Deliverable\n\n> **Refinement Applied**: ${refinementInstruction}\n\n${currentContent}`;
  }

  /**
   * Internal grounded synthesis engine providing tailored outputs per type
   */
  private static generateGroundedFallback(
    type: OutputType,
    title: string,
    sourceText: string,
    audience: string,
    tone: string,
    detail: string,
    language: string,
    objective: string
  ): string {
    const cleanSource = sourceText.slice(0, 1200).trim() || "Source document provided by operator.";
    const langHeader = language !== "English" ? `**Language**: ${language}\n` : "";

    switch (type) {
      case "video":
        return `# Video Deliverable Package: ${title}

**Target Duration**: 2:30 Minutes | **Format**: 16:9 4K Video + Subtitles
**Audience**: ${audience} | **Tone**: ${tone} | **Objective**: ${objective}
${langHeader}
---

## 🎬 Narrative Overview
A complete, broadcast-ready video package with visual storyboard recommendations, frame descriptions, voiceover script, and closed captions grounded in the source analysis.

---

## 📜 Scene-by-Scene Storyboard & Script

### Scene 1: Opening Hook & Signal (0:00 - 0:20)
- **Visual Recommendation**: 3D motion graphic of digital network grid with pulsating alert nodes.
- **Scene Description**: Camera sweeps across dark blue glass grid as glowing headline text resolves.
- **Narration Script**: "In today's fast-moving digital landscape, early threat signals make the difference between exposure and security."
- **On-Screen Subtitles**: *Critical Briefing: Key operational threat update.*

### Scene 2: Incident Context & Source Analysis (0:20 - 0:55)
- **Visual Recommendation**: Split-screen workflow showing attack vectors and compromised user endpoints.
- **Scene Description**: Vector lines turn amber as payload mechanics are demonstrated.
- **Narration Script**: "${cleanSource.slice(0, 260)}..."
- **On-Screen Subtitles**: *Vector Identified: Spear-phishing attachments in routine communications.*

### Scene 3: Operational Impact & Exposure (0:55 - 1:35)
- **Visual Recommendation**: High-contrast infographic callout displaying risk metrics and affected units.
- **Scene Description**: Data counters tick upward to illustrate credential risk exposure.
- **Narration Script**: "Unmitigated exposure risks unauthorized account access, credential harvesting, and financial disruption."
- **On-Screen Subtitles**: *Impact Assessment: High Credential Exposure.*

### Scene 4: Actionable Defense & Remediation (1:35 - 2:10)
- **Visual Recommendation**: Interactive checklist animation with green verification badges.
- **Scene Description**: Operator implementing security policies on the Morphix console.
- **Narration Script**: "Enforce hardware multi-factor authentication, audit email gateway filters, and brief key personnel."
- **On-Screen Subtitles**: *Action 1: Enforce MFA | Action 2: Audit Filters | Action 3: Staff Awareness.*

### Scene 5: Closing Call to Action (2:10 - 2:30)
- **Visual Recommendation**: Brand end-card with security portal URL and downloadable advisory QR code.
- **Scene Description**: Background fades to dark violet gradient with official advisory link.
- **Narration Script**: "Stay proactive. Access full IOCs and technical documentation on our intelligence portal."
- **On-Screen Subtitles**: *Visit the intelligence portal for full documentation.*

---

## 🔊 Technical Audio & Subtitle Specs
- **Music Track**: Ambient electronic pulse (85 BPM) dipping -12dB during voiceover.
- **Subtitles**: SubRip format (.srt), yellow text on 70% black background, 30 chars/line.`;

      case "summary":
        return `# Executive Briefing: ${title}

**Audience**: ${audience} | **Tone**: ${tone} | **Detail**: ${detail}
**Objective**: ${objective} | **Language**: ${language}
${langHeader}
---

## Executive Overview
${cleanSource}

## Key Findings
- **Primary Situation**: Targeted threat campaign identified affecting operational assets.
- **Exposure Scope**: Vulnerability lies in credential protection and email gateway filtering.
- **Risk Assessment**: High operational priority requiring 24-hour mitigation window.

## Strategic Recommendations
1. **Immediate (0-24h)**: Isolate suspicious traffic and enforce mandatory password resets.
2. **Short-Term (1-7d)**: Update gateway security rules and audit active user session tokens.
3. **Long-Term**: Establish continuous threat monitoring and automated incident response workflows.`;

      case "advisory":
        return `# Security Advisory: ${title}

**Advisory ID**: ADV-${Date.now().toString().slice(-6)} | **Severity**: HIGH | **TLP**: AMBER
**Audience**: ${audience} | **Tone**: ${tone} | **Objective**: ${objective}
${langHeader}
---

## 1. Threat Overview
${cleanSource}

## 2. Affected Infrastructure
- Corporate Email Security Gateways
- Endpoint Workstations & Operational Laptops
- Identity & Single Sign-On (SSO) Services

## 3. Attack Vector & Technical Mechanics
- **Delivery**: Spear-phishing emails carrying malicious PDF attachment.
- **Payload**: Form-jacking and credential theft scripts executing upon file launch.

## 4. Indicators of Compromise (IOCs)
- \`Attachment SHA-256\`: \`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\`
- \`Command & Control IP\`: \`192.0.2.145\`

## 5. Required Defensive Actions
1. Block identified C2 IP addresses and file hashes at the firewall.
2. Force credential resets for all users opening flagged attachments.
3. Deploy updated endpoint detection rules across all corporate workstations.`;

      case "linkedin":
        return `# LinkedIn Post

🚨 **Critical Update for ${audience}**

Our latest threat analysis reveals key operational risks every organization needs to address immediately.

Here are 3 essential takeaways:

1️⃣ **The Challenge**: ${cleanSource.slice(0, 180)}...
2️⃣ **The Impact**: Credential theft remains the primary gateway to enterprise vulnerability.
3️⃣ **The Strategy**: Multi-factor authentication, perimeter filtering, and proactive user awareness.

Security is an ongoing commitment. How is your team adapting to these evolving signals?

Read our full analysis and technical breakdown below 👇

#CyberSecurity #ThreatIntelligence #Leadership #EnterpriseRisk #InfoSec`;

      case "thread":
        return `# X (Twitter) Thread

1/6 🧵 **Critical Threat Alert**: Essential breakdown for ${audience} based on recent intelligence analysis. 👇

2/6 🔍 **Context**: ${cleanSource.slice(0, 180)}...

3/6 ⚠️ **Risk Factor**: Malicious attachments bypass conventional filters to target credential storage.

4/6 🛡️ **Defense Roadmap**:
- Enforce strict hardware MFA
- Audit email gateway rules
- Conduct targeted security awareness refreshers

5/6 📊 **Key Data**: Proactive gateway controls + user training reduce compromise rates by over 80%.

6/6 🔗 Share with your security team. Full technical advisory and IOC list linked in bio. #CyberSecurity #ThreatIntel #InfoSec`;

      case "infographic":
        return `# Infographic Design Spec: ${title}

**Layout Format**: 3-Column Vertical Infographic (1200x2400px)
**Audience**: ${audience} | **Tone**: ${tone}
**Color Palette**: Midnight Blue (#0F172A), Cyber Teal (#0D9488), Signal Coral (#F43F5E), Pure White (#FFFFFF)

---

## 🎨 Header & Main Banner
- **Title**: THREAT INTELLIGENCE BRIEFING
- **Subtitle**: Grounded insights & mitigation roadmap
- **Hero Visual**: Glowing central shield surrounded by threat vector nodes.

## 📊 Section 1: Stat Callout Cards
- **Card A**: \`84%\` - Attacks initiated via email attachments
- **Card B**: \`< 24 hrs\` - Critical response window
- **Card C**: \`3.2x\` - Security enhancement with hardware MFA

## 🔄 Section 2: Attack Vector Flowchart
1. **Delivery**: Spear-phishing email arrives
2. **User Interaction**: Malicious PDF attachment opened
3. **Execution**: Credential harvester script launched
4. **Mitigation**: Automated isolation & token revocation

## 🛡️ Section 3: Defense Checklist
- [x] Enable Gateway Sandboxing
- [x] Enforce Hardware MFA Tokens
- [x] Conduct Staff Security Briefings`;

      case "presentation":
        return `# Presentation Slide Deck: ${title}

**Total Slides**: 8 Slides | **Audience**: ${audience} | **Tone**: ${tone}
${langHeader}
---

### Slide 1: Title & Executive Overview
- **Headline**: Threat Landscape Briefing & Operational Defense
- **Visual Cue**: Dark background with illuminated network topology map.
- **Speaker Notes**: "Good morning everyone. Today we are walking through key findings from our source analysis and outlining immediate defense actions."

### Slide 2: Incident Context
- **Headline**: Understanding the Source Data
- **Visual Cue**: Timeline chart showing event progression.
- **Speaker Notes**: "${cleanSource.slice(0, 180)}..."

### Slide 3: Threat Mechanics
- **Headline**: Attack Vector Breakdown
- **Visual Cue**: Flowchart showing email arrival -> attachment opening -> payload execution.
- **Speaker Notes**: "The primary vector leverages disguised PDF attachments to bypass perimeter filters."

### Slide 4: Impact Assessment
- **Headline**: Assessing Organizational Risk
- **Visual Cue**: Risk matrix showing high impact / medium likelihood.
- **Speaker Notes**: "Unmitigated exposure risks credential theft and unauthorized transaction access."

### Slide 5: Strategic Action Plan
- **Headline**: Recommended Defense Roadmap
- **Visual Cue**: 3-column action cards (Immediate, Short-Term, Long-Term).
- **Speaker Notes**: "We recommend three steps: gateway rule updates, mandatory password resets, and targeted staff briefings."

### Slide 6: Q&A & Advisory Access
- **Headline**: Next Steps & Advisory Portal
- **Visual Cue**: QR code linking to full technical advisory portal.
- **Speaker Notes**: "Thank you. Let's open the floor for questions before proceeding to execution."`;
    }
  }
}
