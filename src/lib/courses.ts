export interface Course {
  id: string;
  title: string;
  category: 'Cloud' | 'AI' | 'Data' | 'Development' | 'Domain';
  provider: string;
  description: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  skills: string[];
  color: string;
}

export const COURSES: Course[] = [
  {
    id: 'aws-fundamentals',
    title: 'AWS Cloud Fundamentals',
    category: 'Cloud',
    provider: 'AWS Training',
    description:
      'Learn core AWS services including EC2, S3, Lambda, and IAM. Build foundational cloud skills.',
    duration: '12 hours',
    level: 'Beginner',
    skills: ['AWS'],
    color: '#FF9900',
  },
  {
    id: 'gcp-associate',
    title: 'GCP Associate Cloud Engineer',
    category: 'Cloud',
    provider: 'Google Cloud',
    description:
      'Prepare for GCP certification covering Compute Engine, GKE, BigQuery, and cloud networking.',
    duration: '16 hours',
    level: 'Intermediate',
    skills: ['GCP', 'BigQuery'],
    color: '#4285F4',
  },
  {
    id: 'azure-basics',
    title: 'Azure Fundamentals',
    category: 'Cloud',
    provider: 'Microsoft Learn',
    description:
      'Explore Azure cloud concepts, core services, security, and pricing.',
    duration: '10 hours',
    level: 'Beginner',
    skills: ['Azure'],
    color: '#0078D4',
  },
  {
    id: 'terraform-iac',
    title: 'Infrastructure as Code with Terraform',
    category: 'Cloud',
    provider: 'HashiCorp',
    description:
      'Master Terraform for provisioning and managing cloud infrastructure across providers.',
    duration: '8 hours',
    level: 'Intermediate',
    skills: ['Terraform'],
    color: '#7B42BC',
  },
  {
    id: 'python-data',
    title: 'Python for Data & Automation',
    category: 'Development',
    provider: 'Internal Academy',
    description:
      'Python programming essentials for data processing, scripting, and automation.',
    duration: '14 hours',
    level: 'Beginner',
    skills: ['Python'],
    color: '#3776AB',
  },
  {
    id: 'react-advanced',
    title: 'Advanced React Patterns',
    category: 'Development',
    provider: 'Internal Academy',
    description:
      'Deep dive into React hooks, context, performance optimization, and server components.',
    duration: '10 hours',
    level: 'Advanced',
    skills: ['React', 'TypeScript'],
    color: '#61DAFB',
  },
  {
    id: 'nodejs-microservices',
    title: 'Node.js Microservices',
    category: 'Development',
    provider: 'Internal Academy',
    description:
      'Build scalable microservices with Node.js, Express, and container orchestration.',
    duration: '12 hours',
    level: 'Intermediate',
    skills: ['Node.js', 'TypeScript'],
    color: '#339933',
  },
  {
    id: 'ml-foundations',
    title: 'Machine Learning Foundations',
    category: 'AI',
    provider: 'Google AI',
    description:
      'Introduction to ML concepts, supervised/unsupervised learning, and model evaluation.',
    duration: '20 hours',
    level: 'Intermediate',
    skills: ['Machine Learning', 'Python'],
    color: '#EA4335',
  },
  {
    id: 'nlp-essentials',
    title: 'NLP & Text Analytics',
    category: 'AI',
    provider: 'Internal Academy',
    description:
      'Natural language processing techniques for text classification, sentiment analysis, and chatbots.',
    duration: '12 hours',
    level: 'Advanced',
    skills: ['NLP', 'Python'],
    color: '#34A853',
  },
  {
    id: 'bigquery-analytics',
    title: 'BigQuery for Analytics',
    category: 'Data',
    provider: 'Google Cloud',
    description:
      'Master BigQuery for large-scale data analysis, SQL optimization, and dashboard creation.',
    duration: '8 hours',
    level: 'Intermediate',
    skills: ['BigQuery'],
    color: '#669DF6',
  },
  {
    id: 'data-pipeline',
    title: 'Building Data Pipelines',
    category: 'Data',
    provider: 'Internal Academy',
    description:
      'Design and implement ETL/ELT pipelines using modern data engineering tools.',
    duration: '14 hours',
    level: 'Intermediate',
    skills: ['Data Pipeline', 'Python'],
    color: '#F4B400',
  },
  {
    id: 'healthcare-it',
    title: 'Healthcare IT & HIPAA',
    category: 'Domain',
    provider: 'Industry Partner',
    description:
      'Healthcare IT standards, HIPAA compliance, HL7/FHIR, and health data management.',
    duration: '6 hours',
    level: 'Beginner',
    skills: ['Healthcare IT'],
    color: '#E91E63',
  },
];

export const COURSE_CATEGORIES = ['Cloud', 'AI', 'Data', 'Development', 'Domain'] as const;
