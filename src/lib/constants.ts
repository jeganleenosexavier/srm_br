export const STAGES = [
  'applied',
  'onboarded',
  'training',
  'project',
  'mentor_review',
  'fte_offer',
  'fte_hired',
  'exit',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  onboarded: 'Onboarded',
  training: 'Training',
  project: 'Project',
  mentor_review: 'Mentor Review',
  fte_offer: 'FTE Offer',
  fte_hired: 'FTE Hired',
  exit: 'Exit',
};

export const COUNTRIES = [
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', flag: '🇬🇧' },
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo', flag: '🇱🇰' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
] as const;

export const SKILL_CATEGORIES = ['Cloud', 'AI', 'Data', 'Development', 'Domain'] as const;

export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

export const PROFICIENCY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export const RISK_LEVELS = ['green', 'amber', 'red'] as const;

export const COMPLIANCE_TYPES = [
  'contract',
  'id_verification',
  'tax_form',
  'work_authorization',
  'gdpr_consent',
] as const;

export const COMPLIANCE_LABELS: Record<string, string> = {
  contract: 'Employment Contract',
  id_verification: 'ID Verification',
  tax_form: 'Tax Form',
  work_authorization: 'Work Authorization',
  gdpr_consent: 'GDPR Consent',
};

export const PERSON_TYPES = ['intern', 'fte'] as const;

export const ROLES_LIST = ['admin', 'mentor', 'intern'] as const;

export type NavItem = {
  label: string;
  icon: string;
  phase: number;
  hideForRoles?: string[];
} & (
  | { href: string; children?: never }
  | { href?: never; children: { label: string; href: string; phase: number; hideForRoles?: string[] }[] }
);

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard', phase: 5 },
  { label: 'Pipeline', href: '/pipeline', icon: 'GitBranch', phase: 1, hideForRoles: ['intern'] },
  { label: 'People', href: '/people', icon: 'Users', phase: 1, hideForRoles: ['intern'] },
  {
    label: 'Skills',
    icon: 'Brain',
    phase: 2,
    children: [
      { label: 'Graph', href: '/skills/graph', phase: 2 },
      { label: 'Matrix', href: '/skills/matrix', phase: 2 },
      { label: 'Gaps', href: '/skills/gaps', phase: 2 },
    ],
  },
  {
    label: 'Compliance',
    icon: 'ShieldCheck',
    phase: 3,
    hideForRoles: ['intern'],
    children: [
      { label: 'Overview', href: '/compliance', phase: 3, hideForRoles: ['intern', 'mentor'] },
      { label: 'Alerts', href: '/compliance/alerts', phase: 3, hideForRoles: ['intern'] },
    ],
  },
  { label: 'Learning', href: '/lms', icon: 'GraduationCap', phase: 7, hideForRoles: ['admin'] },
  { label: 'Regions', href: '/regions', icon: 'Globe', phase: 4, hideForRoles: ['intern', 'mentor'] },
  { label: 'Impact', href: '/impact', icon: 'TrendingUp', phase: 4, hideForRoles: ['intern', 'mentor'] },
  { label: 'Reports', href: '/reports', icon: 'FileText', phase: 6, hideForRoles: ['intern', 'mentor'] },
  { label: 'Settings', href: '/settings', icon: 'Settings', phase: 0, hideForRoles: ['intern', 'mentor'] },
];
