import type { GeneratedJd, TemplateInfo } from "../types/jd";

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // Fall through to generic message.
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  if (response.status === 204) {
    return null as T;
  }
  return (await response.json()) as T;
}

export async function getActiveTemplate(): Promise<TemplateInfo | null> {
  return request<TemplateInfo | null>("/api/templates/active");
}

export async function uploadTemplate(file: File): Promise<TemplateInfo> {
  const body = new FormData();
  body.append("file", file);
  return request<TemplateInfo>("/api/templates/upload", { method: "POST", body });
}

export async function deleteTemplate(id: string): Promise<TemplateInfo | null> {
  return request<TemplateInfo | null>(`/api/templates/${id}`, { method: "DELETE" });
}

export async function extractSourceJd(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const result = await request<{ text: string }>("/api/jd/extract", { method: "POST", body });
  return result.text;
}

export async function generateJd(templateId: string, sourceJd: string): Promise<GeneratedJd> {
  return request<GeneratedJd>("/api/jd/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, sourceJd }),
  });
}

export async function downloadJd(
  format: "docx" | "pdf",
  jobTitle: string,
  html: string,
  templateId?: string,
): Promise<void> {
  const response = await fetch(`/api/jd/download/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobTitle, html, templateId }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `Job_Description_JD.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
