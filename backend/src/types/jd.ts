export type SectionType = "title" | "paragraph" | "bullets";

export interface TemplateSection {
  title: string;
  type: SectionType;
  order: number;
}

export interface TemplateStructure {
  templateName: string;
  sections: TemplateSection[];
  brandingPrefix?: string;
  format?: "igs" | "generic";
}

export interface GeneratedSection {
  title: string;
  type?: SectionType;
  content?: string;
  items?: string[];
}

export interface GeneratedJd {
  jobTitle: string;
  sections: GeneratedSection[];
  format?: "igs" | "generic";
  html?: string;
}

export interface TemplateResponse {
  templateId: string;
  name: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  sections: TemplateSection[];
  isBuiltIn: boolean;
}
