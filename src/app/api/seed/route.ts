import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { recalculateAllRisks } from '@/services/risk.engine';

export async function POST() {
  try {
    const headersList = await headers();
    const role = headersList.get('x-user-role');

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Clear all data
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

    // Users
    const users: { id: string; email: string }[] = [];
    for (const a of [
      { email: 'admin@beauroi.demo', password: 'admin123', role: 'admin' },
      { email: 'mentor@beauroi.demo', password: 'mentor123', role: 'mentor' },
      { email: 'intern@beauroi.demo', password: 'intern123', role: 'intern' },
    ]) {
      const u = await prisma.user.create({
        data: { email: a.email, passwordHash: await bcrypt.hash(a.password, 10), role: a.role },
      });
      users.push({ id: u.id, email: u.email });
    }

    // Countries
    const countriesData = [
      { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', benefitsSummary: 'CPF pension, national health insurance', hubRole: 'Governance', overlapHoursRecommended: 'Best overlap with IN: 09:00–17:30 SGT', playbookUrl: '/playbooks/sg.pdf', hrContactName: 'Outsourced HR Partner (SG)', hrContactEmail: 'hr-sg@beauroi.demo' },
      { code: 'UK', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', benefitsSummary: 'NHS healthcare, auto-enrolment pension, 28 days leave', hubRole: 'Governance', overlapHoursRecommended: 'Best overlap with IN: 13:00–17:00 IST', playbookUrl: '/playbooks/uk.pdf', hrContactName: 'Outsourced HR Partner (UK)', hrContactEmail: 'hr-uk@beauroi.demo' },
      { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', benefitsSummary: 'PF/gratuity, ESI health insurance, 15 days earned leave', hubRole: 'Delivery', overlapHoursRecommended: 'Best overlap with UK: 13:00–17:00 IST', playbookUrl: '/playbooks/in.pdf', hrContactName: 'Outsourced HR Partner (IN)', hrContactEmail: 'hr-in@beauroi.demo' },
      { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo', benefitsSummary: 'EPF/ETF pension, 14 days annual leave', hubRole: 'Satellite', overlapHoursRecommended: 'Full overlap with IN (same timezone)', playbookUrl: '/playbooks/lk.pdf', hrContactName: 'Outsourced HR Partner (LK)', hrContactEmail: 'hr-lk@beauroi.demo' },
      { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg', benefitsSummary: 'UIF, medical aid (voluntary), 21 days annual leave', hubRole: 'Satellite', overlapHoursRecommended: 'Best overlap with UK: 09:00–17:00 SAST', playbookUrl: '/playbooks/za.pdf', hrContactName: 'Outsourced HR Partner (ZA)', hrContactEmail: 'hr-za@beauroi.demo' },
    ];
    for (const c of countriesData) { await prisma.country.create({ data: c }); }

    // Skills
    const skillsData = [
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
    const skills: Record<string, string> = {};
    for (const s of skillsData) {
      const created = await prisma.skill.create({ data: s });
      skills[s.name] = created.id;
    }

    // Roles
    const rolesCreated = [];
    const rolesData = [
      { name: 'Cloud Engineer', skills: [{ s: 'AWS', min: 'advanced' }, { s: 'GCP', min: 'advanced' }, { s: 'Terraform', min: 'intermediate' }] },
      { name: 'Full Stack Developer', skills: [{ s: 'React', min: 'advanced' }, { s: 'Node.js', min: 'advanced' }, { s: 'TypeScript', min: 'intermediate' }, { s: 'Python', min: 'intermediate' }] },
      { name: 'Data Engineer', skills: [{ s: 'BigQuery', min: 'advanced' }, { s: 'Python', min: 'advanced' }, { s: 'Data Pipeline', min: 'intermediate' }] },
      { name: 'AI/ML Engineer', skills: [{ s: 'Python', min: 'advanced' }, { s: 'Machine Learning', min: 'advanced' }, { s: 'BigQuery', min: 'intermediate' }] },
    ];
    for (const r of rolesData) {
      const role = await prisma.role.create({ data: { name: r.name } });
      for (const rs of r.skills) {
        await prisma.roleSkill.create({ data: { roleId: role.id, skillId: skills[rs.s], minimumLevel: rs.min } });
      }
      rolesCreated.push(role);
    }

    // Projects
    const projectsData = [
      { name: 'CloudSpanner E-commerce', domain: 'E-commerce', region: 'IN' },
      { name: 'HMS Platform', domain: 'Healthcare', region: 'IN' },
      { name: 'Marketing Analytics', domain: 'Marketing', region: 'UK' },
      { name: 'Manufacturing Data Engine', domain: 'Manufacturing', region: 'SG' },
      { name: 'EdTech LMS', domain: 'EdTech', region: 'LK' },
    ];
    const projects: string[] = [];
    for (const p of projectsData) {
      const created = await prisma.project.create({ data: p });
      projects.push(created.id);
    }

    // People
    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
    const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

    const peopleData = [
      { name: 'Priya Sharma', email: 'priya.s@beauroi.demo', type: 'intern', region: 'IN', stage: 'project', riskLevel: 'amber', cs: 'green', pIdx: 0, sd: 95 },
      { name: 'James Okonkwo', email: 'james.o@beauroi.demo', type: 'fte', region: 'UK', stage: 'project', riskLevel: 'red', cs: 'green', pIdx: 2, sd: 400 },
      { name: 'Amara Kumari', email: 'amara.k@beauroi.demo', type: 'intern', region: 'LK', stage: 'training', riskLevel: 'green', cs: 'amber', pIdx: 4, sd: 60 },
      { name: 'Ravi Kumar', email: 'ravi.k@beauroi.demo', type: 'fte', region: 'IN', stage: 'project', riskLevel: 'green', cs: 'green', pIdx: 0, sd: 500 },
      { name: 'Ananya Patel', email: 'ananya.p@beauroi.demo', type: 'intern', region: 'IN', stage: 'applied', riskLevel: 'green', cs: 'green', pIdx: null, sd: 10 },
      { name: 'Vikram Singh', email: 'vikram.s@beauroi.demo', type: 'intern', region: 'IN', stage: 'onboarded', riskLevel: 'green', cs: 'green', pIdx: null, sd: 20 },
      { name: 'Deepa Nair', email: 'deepa.n@beauroi.demo', type: 'fte', region: 'IN', stage: 'fte_hired', riskLevel: 'green', cs: 'green', pIdx: 1, sd: 600 },
      { name: 'Arjun Reddy', email: 'arjun.r@beauroi.demo', type: 'intern', region: 'IN', stage: 'training', riskLevel: 'green', cs: 'green', pIdx: null, sd: 35 },
      { name: 'Meera Joshi', email: 'meera.j@beauroi.demo', type: 'intern', region: 'IN', stage: 'mentor_review', riskLevel: 'green', cs: 'green', pIdx: 0, sd: 80 },
      { name: 'Suresh Pillai', email: 'suresh.p@beauroi.demo', type: 'fte', region: 'IN', stage: 'project', riskLevel: 'amber', cs: 'green', pIdx: 1, sd: 350 },
      { name: 'Kavitha Rajan', email: 'kavitha.r@beauroi.demo', type: 'intern', region: 'IN', stage: 'fte_offer', riskLevel: 'green', cs: 'green', pIdx: 0, sd: 120 },
      { name: 'Sarah Chen', email: 'sarah.c@beauroi.demo', type: 'fte', region: 'UK', stage: 'project', riskLevel: 'green', cs: 'green', pIdx: 2, sd: 450 },
      { name: 'David Williams', email: 'david.w@beauroi.demo', type: 'intern', region: 'UK', stage: 'onboarded', riskLevel: 'green', cs: 'green', pIdx: null, sd: 15 },
      { name: 'Emma Brown', email: 'emma.b@beauroi.demo', type: 'fte', region: 'UK', stage: 'fte_hired', riskLevel: 'green', cs: 'red', pIdx: 2, sd: 300 },
      { name: 'Wei Lin Tan', email: 'weilin.t@beauroi.demo', type: 'fte', region: 'SG', stage: 'project', riskLevel: 'green', cs: 'green', pIdx: 3, sd: 550 },
      { name: 'Aisha Binte', email: 'aisha.b@beauroi.demo', type: 'intern', region: 'SG', stage: 'training', riskLevel: 'green', cs: 'green', pIdx: null, sd: 25 },
      { name: 'Jun Wei Lim', email: 'junwei.l@beauroi.demo', type: 'fte', region: 'SG', stage: 'fte_hired', riskLevel: 'green', cs: 'green', pIdx: 3, sd: 480 },
      { name: 'Tharindu Fernando', email: 'tharindu.f@beauroi.demo', type: 'intern', region: 'LK', stage: 'applied', riskLevel: 'green', cs: 'green', pIdx: null, sd: 5 },
      { name: 'Nishadi Perera', email: 'nishadi.p@beauroi.demo', type: 'fte', region: 'LK', stage: 'project', riskLevel: 'green', cs: 'green', pIdx: 4, sd: 380 },
      { name: 'Thabo Mokoena', email: 'thabo.m@beauroi.demo', type: 'intern', region: 'ZA', stage: 'fte_offer', riskLevel: 'green', cs: 'amber', pIdx: null, sd: 110 },
      { name: 'Zandile Ndlovu', email: 'zandile.n@beauroi.demo', type: 'fte', region: 'ZA', stage: 'project', riskLevel: 'green', cs: 'green', pIdx: 2, sd: 280 },
      { name: 'Lakshmi Venkat', email: 'lakshmi.v@beauroi.demo', type: 'intern', region: 'IN', stage: 'project', riskLevel: 'green', cs: 'green', pIdx: 1, sd: 70 },
    ];

    const people: { id: string; type: string }[] = [];
    for (const p of peopleData) {
      const person = await prisma.person.create({
        data: {
          name: p.name, email: p.email, type: p.type, region: p.region,
          stage: p.stage, riskLevel: p.riskLevel, complianceStatus: p.cs,
          startDate: daysAgo(p.sd),
          ...(p.pIdx !== null ? { projectId: projects[p.pIdx] } : {}),
        },
      });
      people.push({ id: person.id, type: p.type });
    }

    // Assign mentors
    const ftes = people.filter((p) => p.type === 'fte');
    const interns = people.filter((p) => p.type === 'intern');
    for (let i = 0; i < interns.length; i++) {
      await prisma.person.update({
        where: { id: interns[i].id },
        data: { mentorId: ftes[i % ftes.length].id },
      });
    }

    // Person skills
    const skillAssign = [
      [0, [['GCP', 'intermediate'], ['Python', 'beginner'], ['React', 'beginner']]],
      [1, [['AWS', 'advanced'], ['React', 'advanced'], ['Node.js', 'advanced'], ['Python', 'intermediate']]],
      [2, [['React', 'beginner'], ['Python', 'beginner']]],
      [3, [['GCP', 'expert'], ['AWS', 'advanced'], ['BigQuery', 'advanced'], ['Terraform', 'intermediate']]],
      [4, [['Python', 'beginner']]],
      [5, [['React', 'beginner'], ['Node.js', 'beginner']]],
      [6, [['Python', 'expert'], ['Machine Learning', 'advanced'], ['BigQuery', 'advanced'], ['Healthcare IT', 'intermediate']]],
      [7, [['Python', 'intermediate'], ['Data Pipeline', 'beginner']]],
      [8, [['GCP', 'intermediate'], ['React', 'intermediate'], ['Python', 'intermediate']]],
      [9, [['AWS', 'intermediate'], ['Python', 'advanced'], ['Machine Learning', 'intermediate']]],
      [10, [['GCP', 'advanced'], ['React', 'advanced'], ['Node.js', 'intermediate'], ['TypeScript', 'intermediate']]],
      [11, [['AWS', 'advanced'], ['React', 'expert'], ['TypeScript', 'advanced']]],
      [12, [['React', 'beginner'], ['TypeScript', 'beginner']]],
      [13, [['AWS', 'advanced'], ['Node.js', 'advanced'], ['React', 'intermediate']]],
      [14, [['GCP', 'expert'], ['BigQuery', 'expert'], ['Terraform', 'advanced'], ['Python', 'advanced']]],
      [15, [['Python', 'intermediate'], ['Machine Learning', 'beginner']]],
      [16, [['GCP', 'advanced'], ['AWS', 'intermediate'], ['Azure', 'intermediate']]],
      [17, [['React', 'beginner']]],
      [18, [['Python', 'advanced'], ['EdTech', 'intermediate'], ['React', 'intermediate']]],
      [19, [['Azure', 'intermediate'], ['Python', 'beginner']]],
      [20, [['AWS', 'intermediate'], ['React', 'advanced'], ['Node.js', 'intermediate']]],
      [21, [['Python', 'intermediate'], ['Machine Learning', 'beginner'], ['Healthcare IT', 'beginner']]],
    ] as [number, [string, string][]][];

    const stalePersonIdxs = new Set([0, 1, 9]);
    for (const [pIdx, skillList] of skillAssign) {
      const isStale = stalePersonIdxs.has(pIdx);
      for (const [sName, prof] of skillList) {
        await prisma.personSkill.create({
          data: {
            personId: people[pIdx].id, skillId: skills[sName],
            proficiency: prof,
            lastUpdated: isStale ? daysAgo(120) : daysAgo(Math.floor(Math.random() * 30)),
          },
        });
      }
    }

    // Compliance items
    const compTypes = ['contract', 'id_verification', 'tax_form', 'work_authorization', 'gdpr_consent'];
    for (let i = 0; i < people.length; i++) {
      for (const t of compTypes) {
        let status = 'complete';
        let expiryDate: Date | null = null;
        if (i === 2 && t === 'work_authorization') { expiryDate = daysFromNow(45); }
        else if (i === 13 && t === 'gdpr_consent') { status = 'pending'; }
        else if (i === 19 && t === 'work_authorization') { expiryDate = daysFromNow(55); }
        else if (t === 'work_authorization') { expiryDate = daysFromNow(365); }
        await prisma.complianceItem.create({ data: { personId: people[i].id, itemType: t, status, expiryDate } });
      }
    }

    // Reviews
    const mentorPersonId = people[3].id;
    for (const r of [
      { pIdx: 0, d: 20, t: 3.5, c: 3, l: 4, n: 'Good progress on GCP. Needs more cloud architecture hands-on.', rec: 'extend' },
      { pIdx: 8, d: 5, t: 4, c: 4.5, l: 4, n: 'Strong all-round. Ready for FTE consideration.', rec: 'recommend_fte' },
      { pIdx: 10, d: 10, t: 4.5, c: 4, l: 4.5, n: 'Excellent skills. Converting to FTE.', rec: 'recommend_fte' },
      { pIdx: 1, d: 50, t: 2.5, c: 3.5, l: 2.0, n: 'Performance plateaued. Needs new challenges.', rec: 'extend' },
    ]) {
      await prisma.review.create({
        data: { personId: people[r.pIdx].id, mentorId: mentorPersonId, date: daysAgo(r.d), technical: r.t, communication: r.c, learningAgility: r.l, notes: r.n, recommendation: r.rec },
      });
    }

    // Stage histories (backdate James and Priya for risk signals)
    const stageOrder = ['applied', 'onboarded', 'training', 'project', 'mentor_review', 'fte_offer', 'fte_hired'];
    const stageBackdates: Record<number, number> = { 0: 50, 1: 60 };
    for (let i = 0; i < people.length; i++) {
      const currentStage = peopleData[i].stage;
      const currentIdx = stageOrder.indexOf(currentStage);
      if (currentIdx < 0) continue;
      const currentAge = stageBackdates[i] ?? 1;
      for (let j = 0; j <= currentIdx; j++) {
        const age = j === currentIdx ? currentAge : currentAge + (currentIdx - j) * 15;
        await prisma.stageHistory.create({
          data: { personId: people[i].id, stage: stageOrder[j], timestamp: daysAgo(age), userId: users[0].id },
        });
      }
    }

    // Link user accounts to person records
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

    // Recalculate risk levels based on live signals
    await recalculateAllRisks();

    // LMS Enrollments
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

    const counts = {
      people: people.length,
      skills: Object.keys(skills).length,
      projects: projects.length,
      countries: countriesData.length,
      roles: rolesCreated.length,
      users: users.length,
    };

    // Clear the current session since user IDs have changed
    const cookieStore = await cookies();
    cookieStore.delete('token');

    return NextResponse.json({ success: true, counts });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: 'Seed failed', details: String(err) }, { status: 500 });
  }
}
