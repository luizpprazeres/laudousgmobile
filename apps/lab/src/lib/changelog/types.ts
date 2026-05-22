export type ChangelogStatus = "planned" | "in-progress" | "shipped" | "paused";
export type ChangelogSize = "small" | "medium" | "large" | "epic";

export type ChangelogFrontmatter = {
  slug: string;
  title: string;
  date: string;
  status: ChangelogStatus;
  size: ChangelogSize;
  tags?: string[];
  sprint?: string;
  related_adrs?: number[];
  commits?: string[];
  files_touched?: number;
};

export type ChangelogBody = {
  leigo: string;
  tecnico: string;
  impacto: string;
};

export type ChangelogEntry = ChangelogFrontmatter & {
  body: ChangelogBody;
};

export type Audience = "leigo" | "tecnico" | "impacto";
