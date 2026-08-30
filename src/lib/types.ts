export type UserRole = 'admin' | 'mentor' | 'viewer';

export type PersonType = 'intern' | 'fte';

export type Stage =
  | 'applied'
  | 'onboarded'
  | 'training'
  | 'project'
  | 'mentor_review'
  | 'fte_offer'
  | 'fte_hired'
  | 'exit';

export type Proficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type RiskLevel = 'green' | 'amber' | 'red';

export type ComplianceStatus = 'pending' | 'complete' | 'expired';

export type ComplianceItemType =
  | 'contract'
  | 'id_verification'
  | 'tax_form'
  | 'work_authorization'
  | 'gdpr_consent';

export type Recommendation = 'recommend_fte' | 'extend' | 'exit';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
}
