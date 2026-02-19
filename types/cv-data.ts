export interface GeneratedLanding {
  markdown: string;
  html?: string;
  generatedAt: string;
  model: string;
}

export interface CVData {
  personal: {
    name: string;
    title: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    summary: string;
  };
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    location?: string;
    description: string[];
    technologies?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
    achievements?: string[];
  }>;
  skills: {
    technical: string[];
    soft?: string[];
    languages?: Array<{
      language: string;
      level: string;
    }>;
  };
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
    technologies: string[];
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    url?: string;
  }>;
  generatedLanding?: GeneratedLanding;
}

export type PortfolioTheme = "minimal" | "modern" | "bold";

export interface Portfolio {
  id: string;
  userId: string;
  cvData: CVData;
  theme: PortfolioTheme;
  isPublished: boolean;
  isPublic: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParseCVResponse {
  success: boolean;
  data?: CVData;
  portfolioId?: string;
  error?: string;
}
