import type { GeneratedJd, GeneratedSection, TemplateSection, TemplateStructure } from "../types/jd";

export const IGS_ABOUT = `We, at IGS, offer Solution based Quality Engineering Services to many enterprises and D2C's across the globe. Over the last five years we have supported epic transformations for organizations to scale faster with the technologies we love. IGS' culture of inclusiveness has stood out for our teams and customers where we keep people above everything and implement technology to spearhead problem-solving. Our multi-platform and domain-specific expertise in Quality Engineering have let us build evolutionary solutions and service portfolios to enable our customers to achieve their business objectives. We have achieved success through the success of our customers in several domains, such as, Healthcare, Telco, OTT, BFSI, Fintech, Gaming, Airlines, Big Data & Analytics.

We have over 300 Testing professionals who are experts in creating intuitive solutions and best-in-class tools and technologies both Java and Java-Script based, such as, Selenium Web-driver, Webdrive.io, Nightwatch JS, jUnit5 frameworks, Appium, Rest Assured Framework for API automation and Python based framework for DFP and Analytics validation. We are proud of our in-house test automation framework, which is highly effective in delighting our customers.`;

export const IGS_SECTIONS: TemplateSection[] = [
  { title: "About IGS", type: "paragraph", order: 1 },
  { title: "Job Summary", type: "paragraph", order: 2 },
  { title: "Overview", type: "paragraph", order: 3 },
  { title: "Responsibilities & Skills", type: "bullets", order: 4 },
  { title: "Required Qualifications", type: "bullets", order: 5 },
];

export function igsTemplateStructure(templateName = "IGS Standard JD"): TemplateStructure {
  return {
    templateName,
    format: "igs",
    brandingPrefix: `About IGS:\n\n${IGS_ABOUT}`,
    sections: IGS_SECTIONS,
  };
}

export function isIgsTemplate(name: string, fileName?: string): boolean {
  const haystack = `${name} ${fileName ?? ""}`.toLowerCase();
  return haystack.includes("igs");
}

export interface IgsGroup {
  heading: string;
  description?: string;
  items?: string[];
}

export interface IgsGenerated {
  jobTitle: string;
  jobLocation: string;
  experience: string;
  jobFamily: string;
  openings: string;
  availability: string;
  overview: string;
  responsibilityGroups: IgsGroup[];
  qualificationGroups: IgsGroup[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asGroups(value: unknown): IgsGroup[] {
  if (!Array.isArray(value)) return [];
  const groups: IgsGroup[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const group = item as Record<string, unknown>;
    const heading = asString(group.heading || group.title);
    const description = asString(group.description || group.content);
    const items = asItems(group.items);
    if (!heading && !description && items.length === 0) continue;
    groups.push({ heading: heading || "Details", description, items });
  }
  return groups;
}

export function normalizeIgsGenerated(raw: unknown): IgsGenerated {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const summary = (data.jobSummary && typeof data.jobSummary === "object" ? data.jobSummary : data) as Record<
    string,
    unknown
  >;

  const qualificationGroups = asGroups(data.qualificationGroups);
  const qualificationItems = asItems(data.requiredQualifications || data.qualifications);

  return {
    jobTitle: asString(data.jobTitle || summary.jobTitle) || "Job Description",
    jobLocation: asString(data.jobLocation || summary.jobLocation) || "Bengaluru",
    experience: asString(data.experience || summary.experience),
    jobFamily: asString(data.jobFamily || summary.jobFamily),
    openings: asString(data.openings || summary.openings),
    availability: asString(data.availability || summary.availability),
    overview: asString(data.overview),
    responsibilityGroups: asGroups(data.responsibilityGroups),
    qualificationGroups:
      qualificationGroups.length > 0
        ? qualificationGroups
        : qualificationItems.length > 0
          ? [{ heading: "Experience & Technical Skills", items: qualificationItems }]
          : [],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphsHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function labeledCell(label: string, value: string): string {
  return `<td><p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || " ")}</p></td>`;
}

function groupHtml(group: IgsGroup): string {
  const parts: string[] = [];
  if (group.heading) parts.push(`<p><strong>${escapeHtml(group.heading)}</strong></p>`);
  if (group.description?.trim()) parts.push(paragraphsHtml(group.description));
  if (group.items && group.items.length > 0) {
    parts.push(`<ul>${group.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
  }
  return parts.join("");
}

export function igsToHtml(jd: IgsGenerated): string {
  const aboutParas = IGS_ABOUT.split(/\n{2,}/).filter(Boolean);
  const summaryPairs: [string, string][] = [
    ["Job Title", jd.jobTitle],
    ["Job Location", jd.jobLocation],
    ["Experience", jd.experience],
    ["Job Family", jd.jobFamily],
    ["Openings", jd.openings],
    ["Availability", jd.availability],
  ];
  const summaryRows: string[] = [];
  for (let index = 0; index < summaryPairs.length; index += 2) {
    const left = summaryPairs[index];
    const right = summaryPairs[index + 1];
    if (!left[1] && !right?.[1]) continue;
    summaryRows.push(`<tr>${labeledCell(left[0], left[1])}${right ? labeledCell(right[0], right[1]) : "<td></td>"}</tr>`);
  }

  return [
    `<table><tr><th colspan="2">About IGS:</th></tr><tr><td colspan="2">${aboutParas.map((para) => `<p>${escapeHtml(para)}</p>`).join("")}</td></tr></table>`,
    `<table><tr><th colspan="2">Job Summary:</th></tr>${summaryRows.join("")}</table>`,
    `<table><tr><th>Overview</th></tr><tr><td>${paragraphsHtml(jd.overview)}</td></tr></table>`,
    "<hr>",
    `<table><tr><th>Responsibilities &amp; Skills:</th></tr><tr><td>${jd.responsibilityGroups.map(groupHtml).join("")}</td></tr></table>`,
    `<table><tr><th>Required Qualifications</th></tr><tr><td>${jd.qualificationGroups.map(groupHtml).join("")}</td></tr></table>`,
  ].join("");
}

export function igsToGeneratedJd(jd: IgsGenerated): GeneratedJd {
  const summaryLines = [
    jd.jobTitle && `Job Title: ${jd.jobTitle}`,
    jd.jobLocation && `Job Location: ${jd.jobLocation}`,
    jd.experience && `Experience: ${jd.experience}`,
    jd.jobFamily && `Job Family: ${jd.jobFamily}`,
    jd.openings && `Openings: ${jd.openings}`,
    jd.availability && `Availability: ${jd.availability}`,
  ].filter(Boolean);

  const sections: GeneratedSection[] = [
    { title: "About IGS", type: "paragraph", content: IGS_ABOUT, items: [] },
    { title: "Job Summary", type: "paragraph", content: summaryLines.join("\n"), items: [] },
    { title: "Overview", type: "paragraph", content: jd.overview, items: [] },
    {
      title: "Responsibilities & Skills",
      type: "bullets",
      content: jd.responsibilityGroups.map((group) => group.heading).join(", "),
      items: jd.responsibilityGroups.flatMap((group) =>
        group.items && group.items.length > 0
          ? group.items.map((item) => `${group.heading}: ${item}`)
          : group.description
            ? [`${group.heading}: ${group.description}`]
            : [group.heading],
      ),
    },
    {
      title: "Required Qualifications",
      type: "bullets",
      items: jd.qualificationGroups.flatMap((group) => group.items ?? []),
    },
  ];

  return {
    jobTitle: jd.jobTitle,
    format: "igs",
    html: igsToHtml(jd),
    sections,
  };
}

export function buildIgsPrompt(sourceJd: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You convert a source job description into Intact Green Services (IGS) JD format.

You are a formatter, not a requirement inventor.

Rules:
1. Keep every meaningful requirement from the SOURCE JD: skills, years of experience, location, domain, technologies, responsibilities.
2. Do not invent skills, tools, years, locations, openings, or qualifications.
3. Do not copy anything from a sample QA Tester / Game QA JD. The source JD is the only source of job facts.
4. Keep About IGS out of your JSON. The application inserts that company text itself.
5. Use professional wording, remove duplication, and keep original intent.
6. If a field is not in the source JD, return an empty string or omit it.
7. Responsibilities must follow IGS style: a short heading, then 1-2 sentences. Create headings from the SOURCE JD, not from any sample template.
8. Return JSON only.

Return this JSON shape:
{
  "jobTitle": "",
  "jobLocation": "",
  "experience": "",
  "jobFamily": "",
  "openings": "",
  "availability": "",
  "overview": "",
  "responsibilityGroups": [
    { "heading": "", "description": "" }
  ],
  "qualificationGroups": [
    { "heading": "Experience & Technical Skills", "items": [""] }
  ]
}

Layout meaning:
- jobTitle, jobLocation, experience, jobFamily, openings, availability fill the Job Summary lines. If the source JD has no location, leave jobLocation empty; the application defaults it to Bengaluru.
- overview is 1-2 short paragraphs about the role, written from the source JD.
- responsibilityGroups are IGS-style skill/responsibility blocks.
- qualificationGroups are required qualifications as bullet items.`;

  const userPrompt = `Convert this SOURCE JD into IGS format. Use only facts from this text.

SOURCE JD:
${sourceJd}`;

  return { systemPrompt, userPrompt };
}
