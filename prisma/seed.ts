import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await clearAll();
  const users = await seedUsers();
  const countries = await seedCountries();
  const skills = await seedSkills();
  const roles = await seedRoles(skills);
  const projects = await seedProjects();
  const people = await seedPeople(projects);
  await seedPersonSkills(people, skills);
  await seedComplianceItems(people);
  await seedReviews(people);
  await seedStageHistories(people, users);

  // Link user accounts to person records
  await linkUsersToPeople(users, people);

  // LMS Enrollments
  await seedEnrollments(people);

  console.log('Seed complete:', {
    users: users.length,
    countries: countries.length,
    skills: skills.length,
    roles: roles.length,
    projects: projects.length,
    people: people.length,
  });
}

async function clearAll() {
  await prisma.stageHistory.deleteMany();
  await prisma.review.deleteMany();
  await prisma.complianceItem.deleteMany();
  await prisma.personSkill.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.roleSkill.deleteMany();
  await prisma.role.deleteMany();
  await prisma.person.deleteMany();
  await prisma.project.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.country.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const accounts = [
    { email: 'admin@beauroi.demo', password: 'admin123', role: 'admin' },
    { email: 'mentor@beauroi.demo', password: 'mentor123', role: 'mentor' },
    { email: 'intern@beauroi.demo', password: 'intern123', role: 'intern' },
  ];

  const created = [];
  for (const a of accounts) {
    const user = await prisma.user.create({
      data: {
        email: a.email,
        passwordHash: await bcrypt.hash(a.password, 10),
        role: a.role,
      },
    });
    created.push(user);
  }
  return created;
}

async function seedCountries() {
  const data = [
    { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', benefitsSummary: 'CPF pension, national health insurance', hubRole: 'Governance', overlapHoursRecommended: 'Best overlap with IN: 09:00–17:30 SGT', playbookUrl: '/playbooks/sg.pdf', hrContactName: 'Outsourced HR Partner (SG)', hrContactEmail: 'hr-sg@beauroi.demo' },
    { code: 'UK', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', benefitsSummary: 'NHS healthcare, auto-enrolment pension, 28 days leave', hubRole: 'Governance', overlapHoursRecommended: 'Best overlap with IN: 13:00–17:00 IST / 08:30–12:30 GMT', playbookUrl: '/playbooks/uk.pdf', hrContactName: 'Outsourced HR Partner (UK)', hrContactEmail: 'hr-uk@beauroi.demo' },
    { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', benefitsSummary: 'PF/gratuity, ESI health insurance, 15 days earned leave', hubRole: 'Delivery', overlapHoursRecommended: 'Best overlap with UK: 13:00–17:00 IST', playbookUrl: '/playbooks/in.pdf', hrContactName: 'Outsourced HR Partner (IN)', hrContactEmail: 'hr-in@beauroi.demo' },
    { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo', benefitsSummary: 'EPF/ETF pension, 14 days annual leave', hubRole: 'Satellite', overlapHoursRecommended: 'Best overlap with IN: Full overlap (same timezone)', playbookUrl: '/playbooks/lk.pdf', hrContactName: 'Outsourced HR Partner (LK)', hrContactEmail: 'hr-lk@beauroi.demo' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', benefitsSummary: 'UIF, medical aid (voluntary), 21 days annual leave', hubRole: 'Satellite', overlapHoursRecommended: 'Best overlap with UK: 09:00–17:00 SAST / 07:00–15:00 GMT', playbookUrl: '/playbooks/za.pdf', hrContactName: 'Outsourced HR Partner (ZA)', hrContactEmail: 'hr-za@beauroi.demo' },
  ];

  const created = [];
  for (const c of data) {
    created.push(await prisma.country.create({ data: c }));
  }
  return created;
}

async function seedSkills() {
  const data = [
    { name: 'AWS', category: 'Cloud', demandLevel: 'high' },
    { name: 'GCP', category: 'Cloud', demandLevel: 'high' },
    { name: 'Azure', category: 'Cloud', demandLevel: 'medium' },
    { name: 'Terraform', category: 'Cloud', demandLevel: 'medium' },
    { name: 'Python', category: 'Development', demandLevel: 'high' },
    { name: 'React', category: 'Development', demandLevel: 'high' },
    { name: 'Node.js', category: 'Development', demandLevel: 'medium' },
    { name: 'TypeScript', category: 'Development', demandLevel: 'medium' },
    { name: 'BigQuery', category: 'Data', demandLevel: 'high' },
    { name: 'Data Pipeline', category: 'Data', demandLevel: 'medium' },
    { name: 'Machine Learning', category: 'AI', demandLevel: 'high' },
    { name: 'NLP', category: 'AI', demandLevel: 'medium' },
    { name: 'Computer Vision', category: 'AI', demandLevel: 'low' },
    { name: 'Healthcare IT', category: 'Domain', demandLevel: 'medium' },
    { name: 'EdTech', category: 'Domain', demandLevel: 'low' },
  ];

  const created = [];
  for (const s of data) {
    created.push(await prisma.skill.create({ data: s }));
  }
  return created;
}

type SkillRecord = Awaited<ReturnType<typeof seedSkills>>[number];

async function seedRoles(skills: SkillRecord[]) {
  const find = (name: string) => skills.find((s) => s.name === name)!;

  const rolesData = [
    {
      name: 'Cloud Engineer',
      skills: [
        { skill: find('AWS'), min: 'advanced' },
        { skill: find('GCP'), min: 'advanced' },
        { skill: find('Terraform'), min: 'intermediate' },
      ],
    },
    {
      name: 'Full Stack Developer',
      skills: [
        { skill: find('React'), min: 'advanced' },
        { skill: find('Node.js'), min: 'advanced' },
        { skill: find('TypeScript'), min: 'intermediate' },
        { skill: find('Python'), min: 'intermediate' },
      ],
    },
    {
      name: 'Data Engineer',
      skills: [
        { skill: find('BigQuery'), min: 'advanced' },
        { skill: find('Python'), min: 'advanced' },
        { skill: find('Data Pipeline'), min: 'intermediate' },
      ],
    },
    {
      name: 'AI/ML Engineer',
      skills: [
        { skill: find('Python'), min: 'advanced' },
        { skill: find('Machine Learning'), min: 'advanced' },
        { skill: find('BigQuery'), min: 'intermediate' },
      ],
    },
  ];

  const created = [];
  for (const r of rolesData) {
    const role = await prisma.role.create({ data: { name: r.name } });
    for (const rs of r.skills) {
      await prisma.roleSkill.create({
        data: { roleId: role.id, skillId: rs.skill.id, minimumLevel: rs.min },
      });
    }
    created.push(role);
  }
  return created;
}

async function seedProjects() {
  const data = [
    { name: 'CloudSpanner E-commerce', domain: 'E-commerce', region: 'IN' },
    { name: 'HMS Platform', domain: 'Healthcare', region: 'IN' },
    { name: 'Marketing Analytics', domain: 'Marketing', region: 'UK' },
    { name: 'Manufacturing Data Engine', domain: 'Manufacturing', region: 'SG' },
    { name: 'EdTech LMS', domain: 'EdTech', region: 'LK' },
  ];

  const created = [];
  for (const p of data) {
    created.push(await prisma.project.create({ data: p }));
  }
  return created;
}

type ProjectRecord = Awaited<ReturnType<typeof seedProjects>>[number];

async function seedPeople(projects: ProjectRecord[]) {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const people = [
    // Demo personae
    { name: 'Priya Sharma', email: 'priya.s@beauroi.demo', type: 'intern', region: 'IN', stage: 'project', riskLevel: 'amber', complianceStatus: 'green', projectIdx: 0, startDate: daysAgo(95) },
    { name: 'James Okonkwo', email: 'james.o@beauroi.demo', type: 'fte', region: 'UK', stage: 'project', riskLevel: 'red', complianceStatus: 'green', projectIdx: 2, startDate: daysAgo(400) },
    { name: 'Amara Kumari', email: 'amara.k@beauroi.demo', type: 'intern', region: 'LK', stage: 'training', riskLevel: 'green', complianceStatus: 'amber', projectIdx: 4, startDate: daysAgo(60) },
    // IN team (~40% = 9 people, 3 already above → 6 more)
    { name: 'Ravi Kumar', email: 'ravi.k@beauroi.demo', type: 'fte', region: 'IN', stage: 'project', riskLevel: 'green', complianceStatus: 'green', projectIdx: 0, startDate: daysAgo(500) },
    { name: 'Ananya Patel', email: 'ananya.p@beauroi.demo', type: 'intern', region: 'IN', stage: 'applied', riskLevel: 'green', complianceStatus: 'green', projectIdx: null, startDate: daysAgo(10) },
    { name: 'Vikram Singh', email: 'vikram.s@beauroi.demo', type: 'intern', region: 'IN', stage: 'onboarded', riskLevel: 'green', complianceStatus: 'green', projectIdx: null, startDate: daysAgo(20) },
    { name: 'Deepa Nair', email: 'deepa.n@beauroi.demo', type: 'fte', region: 'IN', stage: 'fte_hired', riskLevel: 'green', complianceStatus: 'green', projectIdx: 1, startDate: daysAgo(600) },
    { name: 'Arjun Reddy', email: 'arjun.r@beauroi.demo', type: 'intern', region: 'IN', stage: 'training', riskLevel: 'green', complianceStatus: 'green', projectIdx: null, startDate: daysAgo(35) },
    { name: 'Meera Joshi', email: 'meera.j@beauroi.demo', type: 'intern', region: 'IN', stage: 'mentor_review', riskLevel: 'green', complianceStatus: 'green', projectIdx: 0, startDate: daysAgo(80) },
    { name: 'Suresh Pillai', email: 'suresh.p@beauroi.demo', type: 'fte', region: 'IN', stage: 'project', riskLevel: 'amber', complianceStatus: 'green', projectIdx: 1, startDate: daysAgo(350) },
    { name: 'Kavitha Rajan', email: 'kavitha.r@beauroi.demo', type: 'intern', region: 'IN', stage: 'fte_offer', riskLevel: 'green', complianceStatus: 'green', projectIdx: 0, startDate: daysAgo(120) },
    // UK team (~20% = 4 people, 1 already → 3 more)
    { name: 'Sarah Chen', email: 'sarah.c@beauroi.demo', type: 'fte', region: 'UK', stage: 'project', riskLevel: 'green', complianceStatus: 'green', projectIdx: 2, startDate: daysAgo(450) },
    { name: 'David Williams', email: 'david.w@beauroi.demo', type: 'intern', region: 'UK', stage: 'onboarded', riskLevel: 'green', complianceStatus: 'green', projectIdx: null, startDate: daysAgo(15) },
    { name: 'Emma Brown', email: 'emma.b@beauroi.demo', type: 'fte', region: 'UK', stage: 'fte_hired', riskLevel: 'green', complianceStatus: 'red', projectIdx: 2, startDate: daysAgo(300) },
    // SG team (~15% = 3 people)
    { name: 'Wei Lin Tan', email: 'weilin.t@beauroi.demo', type: 'fte', region: 'SG', stage: 'project', riskLevel: 'green', complianceStatus: 'green', projectIdx: 3, startDate: daysAgo(550) },
    { name: 'Aisha Binte', email: 'aisha.b@beauroi.demo', type: 'intern', region: 'SG', stage: 'training', riskLevel: 'green', complianceStatus: 'green', projectIdx: null, startDate: daysAgo(25) },
    { name: 'Jun Wei Lim', email: 'junwei.l@beauroi.demo', type: 'fte', region: 'SG', stage: 'fte_hired', riskLevel: 'green', complianceStatus: 'green', projectIdx: 3, startDate: daysAgo(480) },
    // LK team (~15% = 3 people, 1 already → 2 more)
    { name: 'Tharindu Fernando', email: 'tharindu.f@beauroi.demo', type: 'intern', region: 'LK', stage: 'applied', riskLevel: 'green', complianceStatus: 'green', projectIdx: null, startDate: daysAgo(5) },
    { name: 'Nishadi Perera', email: 'nishadi.p@beauroi.demo', type: 'fte', region: 'LK', stage: 'project', riskLevel: 'green', complianceStatus: 'green', projectIdx: 4, startDate: daysAgo(380) },
    // ZA team (~10% = 2 people)
    { name: 'Thabo Mokoena', email: 'thabo.m@beauroi.demo', type: 'intern', region: 'ZA', stage: 'fte_offer', riskLevel: 'green', complianceStatus: 'amber', projectIdx: null, startDate: daysAgo(110) },
    { name: 'Zandile Ndlovu', email: 'zandile.n@beauroi.demo', type: 'fte', region: 'ZA', stage: 'project', riskLevel: 'green', complianceStatus: 'green', projectIdx: 2, startDate: daysAgo(280) },
    { name: 'Lakshmi Venkat', email: 'lakshmi.v@beauroi.demo', type: 'intern', region: 'IN', stage: 'project', riskLevel: 'green', complianceStatus: 'green', projectIdx: 1, startDate: daysAgo(70) },
  ];

  const created = [];
  for (const p of people) {
    const data: Record<string, unknown> = {
      name: p.name,
      email: p.email,
      type: p.type,
      region: p.region,
      stage: p.stage,
      riskLevel: p.riskLevel,
      complianceStatus: p.complianceStatus,
      startDate: p.startDate,
    };
    if (p.projectIdx !== null) {
      data.projectId = projects[p.projectIdx].id;
    }
    created.push(await prisma.person.create({ data: data as Parameters<typeof prisma.person.create>[0]['data'] }));
  }

  // Assign mentors: FTEs mentor some interns
  const ftes = created.filter((p) => people[created.indexOf(p)].type === 'fte');
  const internPersons = created.filter((p) => people[created.indexOf(p)].type === 'intern');
  for (let i = 0; i < internPersons.length; i++) {
    const mentor = ftes[i % ftes.length];
    await prisma.person.update({
      where: { id: internPersons[i].id },
      data: { mentorId: mentor.id },
    });
  }

  return created;
}

type PersonRecord = Awaited<ReturnType<typeof seedPeople>>[number];

async function seedPersonSkills(people: PersonRecord[], skills: SkillRecord[]) {
  const find = (name: string) => skills.find((s) => s.name === name)!;
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const assignments: { personIdx: number; skills: { skill: SkillRecord; prof: string; stale?: boolean }[] }[] = [
    { personIdx: 0, skills: [{ skill: find('GCP'), prof: 'intermediate', stale: true }, { skill: find('Python'), prof: 'beginner', stale: true }, { skill: find('React'), prof: 'beginner', stale: true }] },
    { personIdx: 1, skills: [{ skill: find('AWS'), prof: 'advanced', stale: true }, { skill: find('React'), prof: 'advanced', stale: true }, { skill: find('Node.js'), prof: 'advanced', stale: true }, { skill: find('Python'), prof: 'intermediate', stale: true }] },
    { personIdx: 2, skills: [{ skill: find('React'), prof: 'beginner' }, { skill: find('Python'), prof: 'beginner' }] },
    { personIdx: 3, skills: [{ skill: find('GCP'), prof: 'expert' }, { skill: find('AWS'), prof: 'advanced' }, { skill: find('BigQuery'), prof: 'advanced' }, { skill: find('Terraform'), prof: 'intermediate' }] },
    { personIdx: 4, skills: [{ skill: find('Python'), prof: 'beginner' }] },
    { personIdx: 5, skills: [{ skill: find('React'), prof: 'beginner' }, { skill: find('Node.js'), prof: 'beginner' }] },
    { personIdx: 6, skills: [{ skill: find('Python'), prof: 'expert' }, { skill: find('Machine Learning'), prof: 'advanced' }, { skill: find('BigQuery'), prof: 'advanced' }, { skill: find('Healthcare IT'), prof: 'intermediate' }] },
    { personIdx: 7, skills: [{ skill: find('Python'), prof: 'intermediate' }, { skill: find('Data Pipeline'), prof: 'beginner' }] },
    { personIdx: 8, skills: [{ skill: find('GCP'), prof: 'intermediate' }, { skill: find('React'), prof: 'intermediate' }, { skill: find('Python'), prof: 'intermediate' }] },
    { personIdx: 9, skills: [{ skill: find('AWS'), prof: 'intermediate', stale: true }, { skill: find('Python'), prof: 'advanced' }, { skill: find('Machine Learning'), prof: 'intermediate' }] },
    { personIdx: 10, skills: [{ skill: find('GCP'), prof: 'advanced' }, { skill: find('React'), prof: 'advanced' }, { skill: find('Node.js'), prof: 'intermediate' }, { skill: find('TypeScript'), prof: 'intermediate' }] },
    { personIdx: 11, skills: [{ skill: find('AWS'), prof: 'advanced' }, { skill: find('React'), prof: 'expert' }, { skill: find('TypeScript'), prof: 'advanced' }] },
    { personIdx: 12, skills: [{ skill: find('React'), prof: 'beginner' }, { skill: find('TypeScript'), prof: 'beginner' }] },
    { personIdx: 13, skills: [{ skill: find('AWS'), prof: 'advanced' }, { skill: find('Node.js'), prof: 'advanced' }, { skill: find('React'), prof: 'intermediate' }] },
    { personIdx: 14, skills: [{ skill: find('GCP'), prof: 'expert' }, { skill: find('BigQuery'), prof: 'expert' }, { skill: find('Terraform'), prof: 'advanced' }, { skill: find('Python'), prof: 'advanced' }] },
    { personIdx: 15, skills: [{ skill: find('Python'), prof: 'intermediate' }, { skill: find('Machine Learning'), prof: 'beginner' }] },
    { personIdx: 16, skills: [{ skill: find('GCP'), prof: 'advanced' }, { skill: find('AWS'), prof: 'intermediate' }, { skill: find('Azure'), prof: 'intermediate' }] },
    { personIdx: 17, skills: [{ skill: find('React'), prof: 'beginner' }] },
    { personIdx: 18, skills: [{ skill: find('Python'), prof: 'advanced' }, { skill: find('EdTech'), prof: 'intermediate' }, { skill: find('React'), prof: 'intermediate' }] },
    { personIdx: 19, skills: [{ skill: find('Azure'), prof: 'intermediate' }, { skill: find('Python'), prof: 'beginner' }] },
    { personIdx: 20, skills: [{ skill: find('AWS'), prof: 'intermediate' }, { skill: find('React'), prof: 'advanced' }, { skill: find('Node.js'), prof: 'intermediate' }] },
    { personIdx: 21, skills: [{ skill: find('Python'), prof: 'intermediate' }, { skill: find('Machine Learning'), prof: 'beginner' }, { skill: find('Healthcare IT'), prof: 'beginner' }] },
  ];

  for (const a of assignments) {
    for (const s of a.skills) {
      await prisma.personSkill.create({
        data: {
          personId: people[a.personIdx].id,
          skillId: s.skill.id,
          proficiency: s.prof,
          lastUpdated: s.stale ? daysAgo(120) : daysAgo(Math.floor(Math.random() * 30)),
        },
      });
    }
  }
}

async function seedComplianceItems(people: PersonRecord[]) {
  const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
  const types = ['contract', 'id_verification', 'tax_form', 'work_authorization', 'gdpr_consent'];

  for (let i = 0; i < people.length; i++) {
    for (const t of types) {
      let status = 'complete';
      let expiryDate: Date | null = null;

      // Amara K. (idx 2) — visa expiring soon → amber
      if (i === 2 && t === 'work_authorization') {
        status = 'complete';
        expiryDate = daysFromNow(45);
      }
      // Emma Brown (idx 13) — GDPR missing → red
      else if (i === 13 && t === 'gdpr_consent') {
        status = 'pending';
      }
      // Thabo (idx 19) — visa expiring → amber
      else if (i === 19 && t === 'work_authorization') {
        status = 'complete';
        expiryDate = daysFromNow(55);
      }
      // Everyone else with work_authorization gets far future expiry
      else if (t === 'work_authorization') {
        expiryDate = daysFromNow(365);
      }

      await prisma.complianceItem.create({
        data: {
          personId: people[i].id,
          itemType: t,
          status,
          expiryDate,
        },
      });
    }
  }
}

async function seedReviews(people: PersonRecord[]) {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  // Find FTEs to act as mentors for reviews
  const mentorPerson = people[3]; // Ravi Kumar, IN FTE

  const reviews = [
    { personIdx: 0, date: daysAgo(20), technical: 3.5, communication: 3, learning: 4, notes: 'Good progress on GCP fundamentals. Needs more hands-on with cloud architecture.', rec: 'extend' },
    { personIdx: 8, date: daysAgo(5), technical: 4, communication: 4.5, learning: 4, notes: 'Strong all-round performance. Ready for FTE consideration.', rec: 'recommend_fte' },
    { personIdx: 10, date: daysAgo(10), technical: 4.5, communication: 4, learning: 4.5, notes: 'Excellent skills across GCP and full-stack. Converting to FTE.', rec: 'recommend_fte' },
    // James O. has NO recent review (> 30 days) — triggers risk signal
    { personIdx: 1, date: daysAgo(50), technical: 2.5, communication: 3.5, learning: 2.0, notes: 'Performance has plateaued. Needs new challenges and skill refresh.', rec: 'extend' },
  ];

  for (const r of reviews) {
    await prisma.review.create({
      data: {
        personId: people[r.personIdx].id,
        mentorId: mentorPerson.id,
        date: r.date,
        technical: r.technical,
        communication: r.communication,
        learningAgility: r.learning,
        notes: r.notes,
        recommendation: r.rec,
      },
    });
  }
}

async function seedStageHistories(people: PersonRecord[], users: { id: string }[]) {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const adminUser = users[0];

  const stageOrder = ['applied', 'onboarded', 'training', 'project', 'mentor_review', 'fte_offer', 'fte_hired'];
  const stageIndex = (s: string) => stageOrder.indexOf(s);

  const STAGE_BACKDATES: Record<number, number> = {
    0: 50,  // Priya — in "project" stage for 50 days (triggers stage_stuck)
    1: 60,  // James — in "project" stage for 60 days (triggers stage_stuck)
  };

  for (let pIdx = 0; pIdx < people.length; pIdx++) {
    const person = people[pIdx];
    const currentIdx = stageIndex(person.stage);
    if (currentIdx < 0) continue;

    const currentStageAge = STAGE_BACKDATES[pIdx] ?? 1;

    for (let j = 0; j <= currentIdx; j++) {
      const age = j === currentIdx
        ? currentStageAge
        : currentStageAge + (currentIdx - j) * 15;
      await prisma.stageHistory.create({
        data: {
          personId: person.id,
          stage: stageOrder[j],
          timestamp: daysAgo(age),
          userId: adminUser.id,
        },
      });
    }
  }
}

async function linkUsersToPeople(users: { id: string; email: string }[], people: { id: string }[]) {
  // intern@beauroi.demo → Priya Sharma (index 0)
  const internUser = users.find((u) => u.email === 'intern@beauroi.demo');
  if (internUser) {
    await prisma.user.update({
      where: { id: internUser.id },
      data: { personId: people[0].id },
    });
  }

  // mentor@beauroi.demo → Ravi Kumar (index 3)
  const mentorUser = users.find((u) => u.email === 'mentor@beauroi.demo');
  if (mentorUser) {
    await prisma.user.update({
      where: { id: mentorUser.id },
      data: { personId: people[3].id },
    });
  }
}

async function seedEnrollments(people: PersonRecord[]) {
  const enrollData = [
    { pIdx: 0, courseId: 'gcp-associate', status: 'in_progress', progress: 45 },
    { pIdx: 0, courseId: 'python-data', status: 'completed', progress: 100 },
    { pIdx: 2, courseId: 'react-advanced', status: 'enrolled', progress: 0 },
    { pIdx: 7, courseId: 'python-data', status: 'in_progress', progress: 30 },
    { pIdx: 8, courseId: 'gcp-associate', status: 'completed', progress: 100 },
    { pIdx: 8, courseId: 'ml-foundations', status: 'in_progress', progress: 60 },
    { pIdx: 3, courseId: 'terraform-iac', status: 'completed', progress: 100 },
    { pIdx: 3, courseId: 'aws-fundamentals', status: 'in_progress', progress: 70 },
  ];
  for (const e of enrollData) {
    await prisma.enrollment.create({
      data: {
        personId: people[e.pIdx].id,
        courseId: e.courseId,
        status: e.status,
        progress: e.progress,
      },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
