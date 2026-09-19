/**
 * End-to-End API Test Suite — Beau Roi Talent Hub
 *
 * Tests all API endpoints and validates data integrity against spec.
 * Requires: dev server running on localhost:3000 with seed data loaded.
 */

const BASE = 'http://localhost:3000';
let cookies = '';

// ── Helpers ─────────────────────────────────────────────────────────

async function login(email: string, password: string): Promise<{ cookies: string; user: any }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });
  const data = await res.json();
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookieStr = setCookie.map((c: string) => c.split(';')[0]).join('; ');
  return { cookies: cookieStr, user: data.user };
}

async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...opts.headers as Record<string, string>, Cookie: cookies },
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function apiPost(path: string, body: any): Promise<any> {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function apiPut(path: string, body: any): Promise<any> {
  return api(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Test Runner ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: { name: string; error: string }[] = [];

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    const msg = detail || 'Assertion failed';
    failures.push({ name, error: msg });
    console.log(`  ❌ ${name} — ${msg}`);
  }
}

function section(title: string) {
  console.log(`\n━━ ${title} ━━`);
}

// ── Tests ───────────────────────────────────────────────────────────

async function runTests() {
  console.log('🧪 Beau Roi Talent Hub — E2E Test Suite\n');

  // ────────────────────────────────────────────────────
  section('Phase 0: Authentication & Foundation');
  // ────────────────────────────────────────────────────

  const badLogin = await apiPost('/api/auth/login', { email: 'bad@test.com', password: 'wrong' });
  assert('Invalid login returns 401/error', badLogin.status >= 400, `Got ${badLogin.status}`);

  const adminAuth = await login('admin@beauroi.demo', 'admin123');
  cookies = adminAuth.cookies;
  assert('Admin login succeeds', !!adminAuth.user, 'No user returned');
  assert('Admin role is admin', adminAuth.user?.role === 'admin', `Got ${adminAuth.user?.role}`);

  const me = await api('/api/auth/me');
  assert('GET /api/auth/me returns user', me.status === 200 && !!me.data.user);
  assert('Session persists (correct email)', me.data.user?.email === 'admin@beauroi.demo');

  const mentorAuth = await login('mentor@beauroi.demo', 'mentor123');
  assert('Mentor login succeeds', mentorAuth.user?.role === 'mentor');

  const internAuth = await login('intern@beauroi.demo', 'intern123');
  assert('Intern login succeeds', internAuth.user?.role === 'intern');

  cookies = adminAuth.cookies;

  // ────────────────────────────────────────────────────
  section('Phase 0: Seed Data Integrity');
  // ────────────────────────────────────────────────────

  const people = await api('/api/people');
  assert('GET /api/people returns 200', people.status === 200);
  assert('Seed data has 22 people', people.data?.length === 22, `Got ${people.data?.length}`);

  const regions = ['IN', 'UK', 'SG', 'LK', 'ZA'];
  for (const r of regions) {
    const count = people.data?.filter((p: any) => p.region === r).length;
    assert(`Region ${r} has people`, count > 0, `Count: ${count}`);
  }

  const interns = people.data?.filter((p: any) => p.type === 'intern').length;
  const ftes = people.data?.filter((p: any) => p.type === 'fte').length;
  assert('Mix of interns and FTEs', interns > 0 && ftes > 0, `Interns: ${interns}, FTEs: ${ftes}`);

  const projects = await api('/api/projects');
  assert('GET /api/projects returns projects', projects.status === 200 && projects.data?.length >= 5, `Got ${projects.data?.length}`);

  const skills = await api('/api/skills');
  assert('GET /api/skills returns skills', skills.status === 200 && skills.data?.length >= 15, `Got ${skills.data?.length}`);

  const roles = await api('/api/roles');
  assert('GET /api/roles returns roles', roles.status === 200 && roles.data?.length >= 4, `Got ${roles.data?.length}`);

  // ────────────────────────────────────────────────────
  section('Phase 1: People Directory');
  // ────────────────────────────────────────────────────

  const searchPriya = await api('/api/people?search=Priya');
  assert('Search people by name works', searchPriya.data?.length === 1 && searchPriya.data[0].name === 'Priya Sharma');

  const filterIN = await api('/api/people?region=IN');
  assert('Filter by region=IN returns IN people', filterIN.data?.every((p: any) => p.region === 'IN'));

  const filterFTE = await api('/api/people?type=fte');
  assert('Filter by type=fte returns only FTEs', filterFTE.data?.every((p: any) => p.type === 'fte'));

  const priya = searchPriya.data?.[0];
  if (priya) {
    const detail = await api(`/api/people/${priya.id}`);
    assert('Person detail includes skills', Array.isArray(detail.data?.skills));
    assert('Person detail includes reviews', Array.isArray(detail.data?.reviewsReceived));
    assert('Person detail includes stage history', Array.isArray(detail.data?.stageHistories));
    assert('Person detail has mentor info', detail.data?.mentor !== undefined);
    assert('Person detail has project info', detail.data?.project !== undefined);
  }

  // Pipeline grouping
  const pipeline = await api('/api/pipeline');
  assert('GET /api/pipeline returns stage groups', pipeline.status === 200);
  const stages = ['applied', 'onboarded', 'training', 'project', 'mentor_review', 'fte_offer', 'fte_hired'];
  for (const stage of stages) {
    assert(`Pipeline has "${stage}" stage`, pipeline.data?.[stage] !== undefined, `Missing "${stage}"`);
  }

  // Funnel — API returns { stageCounts, totalEntered, conversionRate, byRegion }
  const funnel = await api('/api/pipeline/funnel');
  assert('Conversion funnel returns 200', funnel.status === 200);
  assert('Funnel has stageCounts array', funnel.data?.stageCounts?.length > 0, `Got ${JSON.stringify(Object.keys(funnel.data || {}))}`);

  // Reviews
  if (priya) {
    const reviews = await api(`/api/people/${priya.id}/reviews`);
    assert('GET person reviews returns 200', reviews.status === 200);

    const newReview = await apiPost(`/api/people/${priya.id}/reviews`, {
      technical: '4',
      communication: '3.5',
      learningAgility: '4',
      notes: 'E2E test review',
      recommendation: 'extend',
    });
    assert('POST review succeeds', newReview.status === 200 || newReview.status === 201);
  }

  // ────────────────────────────────────────────────────
  section('Phase 1: Pipeline Transitions & Access Control');
  // ────────────────────────────────────────────────────

  const james = people.data?.find((p: any) => p.name === 'James Okonkwo');

  // Intern cannot transition
  cookies = internAuth.cookies;
  if (james) {
    const internTransition = await apiPost('/api/pipeline/transition', { personId: james.id, newStage: 'training' });
    assert('Intern cannot transition stages', internTransition.status === 403);
  }
  cookies = adminAuth.cookies;

  // ────────────────────────────────────────────────────
  section('Phase 2: Skills');
  // ────────────────────────────────────────────────────

  const graph = await api('/api/skills/graph');
  assert('Skills graph returns nodes and edges', graph.status === 200 && graph.data?.nodes?.length > 0);
  assert('Graph has skill-type nodes', graph.data?.nodes?.some((n: any) => n.type === 'skill'));
  assert('Graph has person-type nodes', graph.data?.nodes?.some((n: any) => n.type === 'person'));

  if (priya) {
    const personSkills = await api(`/api/people/${priya.id}/skills`);
    assert('Person skills returns array', personSkills.status === 200 && Array.isArray(personSkills.data));
    assert('Skills have proficiency field', personSkills.data?.[0]?.proficiency !== undefined);
    assert('Skills have isStale flag', personSkills.data?.[0]?.isStale !== undefined);
    assert('Skills have certName field', personSkills.data?.[0]?.certName !== undefined);

    const hasStale = personSkills.data?.some((s: any) => s.isStale);
    assert('Priya has stale skills (spec: 120 days)', hasStale);
  }

  if (roles.data?.length > 0) {
    const roleId = roles.data[0].id;
    const gaps = await api(`/api/roles/${roleId}/gaps`);
    assert('Role gap analysis returns data', gaps.status === 200 && gaps.data?.skills);
  }

  // ────────────────────────────────────────────────────
  section('Phase 3: Compliance');
  // ────────────────────────────────────────────────────

  const compliance = await api('/api/compliance');
  assert('Compliance overview returns countries', compliance.status === 200 && compliance.data?.length === 5);

  const alerts = await api('/api/compliance/alerts');
  assert('Compliance alerts returns data', alerts.status === 200 && Array.isArray(alerts.data));

  const amara = people.data?.find((p: any) => p.name === 'Amara Kumari');
  if (amara) {
    const pc = await api(`/api/people/${amara.id}/compliance`);
    assert('Person compliance returns badge', pc.status === 200 && !!pc.data?.badge);
    assert('Amara has compliance items', pc.data?.items?.length === 5);
    assert('Amara compliance badge is amber', pc.data?.badge?.level === 'amber', `Got ${pc.data?.badge?.level}`);
  }

  const emma = people.data?.find((p: any) => p.name === 'Emma Brown');
  if (emma) {
    const emmaComp = await api(`/api/people/${emma.id}/compliance`);
    assert('Emma Brown compliance is red (GDPR pending)', emmaComp.data?.badge?.level === 'red', `Got ${emmaComp.data?.badge?.level}`);
  }

  // ────────────────────────────────────────────────────
  section('Phase 4: Risk Engine');
  // ────────────────────────────────────────────────────

  if (james) {
    const jamesRisk = await api(`/api/people/${james.id}/risk`);
    assert('James risk level is red', jamesRisk.data?.level === 'red', `Got ${jamesRisk.data?.level}`);
    assert('James has 4+ triggered signals', jamesRisk.data?.signalCount >= 4, `Got ${jamesRisk.data?.signalCount}`);

    const triggeredNames = jamesRisk.data?.signals?.filter((s: any) => s.triggered).map((s: any) => s.id);
    assert('James: skill_stagnation triggered', triggeredNames?.includes('skill_stagnation'));
    assert('James: no_review triggered', triggeredNames?.includes('no_review'));
    assert('James: stage_stuck triggered', triggeredNames?.includes('stage_stuck'));
    assert('James: low_scorecard triggered', triggeredNames?.includes('low_scorecard'));
  }

  if (priya) {
    const priyaRisk = await api(`/api/people/${priya.id}/risk`);
    assert('Priya risk level is amber', priyaRisk.data?.level === 'amber', `Got ${priyaRisk.data?.level}`);
    assert('Priya has 2-3 triggered signals', priyaRisk.data?.signalCount >= 2 && priyaRisk.data?.signalCount <= 3, `Got ${priyaRisk.data?.signalCount}`);
  }

  // Admin recalculate
  if (james) {
    const recalc = await apiPost(`/api/people/${james.id}/risk/recalculate`, {});
    assert('Admin can recalculate risk', recalc.status === 200 && recalc.data?.level);
  }

  // Intern cannot recalculate
  cookies = internAuth.cookies;
  if (james) {
    const internRecalc = await apiPost(`/api/people/${james.id}/risk/recalculate`, {});
    assert('Intern cannot recalculate risk', internRecalc.status === 403);
  }
  cookies = adminAuth.cookies;

  // Stage transition (run AFTER risk tests to avoid affecting stage history)
  if (james) {
    const origStage = james.stage;
    const transition = await apiPost('/api/pipeline/transition', { personId: james.id, newStage: 'mentor_review' });
    assert('Stage transition succeeds (admin)', transition.status === 200);

    const jamesDetail = await api(`/api/people/${james.id}`);
    const histories = jamesDetail.data?.stageHistories;
    const latestHistory = histories?.[histories.length - 1];
    assert('Stage history records the transition', latestHistory?.stage === 'mentor_review');

    // Revert
    await apiPost('/api/pipeline/transition', { personId: james.id, newStage: origStage });
  }

  // ────────────────────────────────────────────────────
  section('Phase 4: Impact Calculator');
  // ────────────────────────────────────────────────────

  const impactInputs = {
    monthlyInternVolume: 100,
    currentConversionPercent: 8,
    targetConversionPercent: 15,
    avgAgencyHireCost: 8000,
    currentRetentionPercent: 85,
    targetRetentionPercent: 99,
    avgReplacementCost: 25000,
    headcountGrowthTarget: 60,
    baselineTalentOpsCost: 500000,
    marginAssumption: 30,
  };

  const impact = await apiPost('/api/impact', impactInputs);
  assert('Impact calculator returns 200', impact.status === 200);
  assert('Impact: additionalFTEPerYear > 0', impact.data?.additionalFTEPerYear > 0, `Got ${impact.data?.additionalFTEPerYear}`);
  assert('Impact: totalAnnualSavings > 0', impact.data?.totalAnnualSavings > 0);
  assert('Impact: costReductionPercent > 0', impact.data?.costReductionPercent > 0);
  assert('Impact: profitImpactPercent > 0', impact.data?.profitImpactPercent > 0);
  assert('Impact: recruitingCostSaved calculated', impact.data?.recruitingCostSaved > 0);
  assert('Impact: retentionSavings calculated', impact.data?.retentionSavings > 0);
  assert('Impact: opsEfficiencySaving = 75000', impact.data?.opsEfficiencySaving === 75000, `Got ${impact.data?.opsEfficiencySaving}`);
  assert('Impact: growthCapacityIndex > 0', impact.data?.growthCapacityIndex > 0);

  // ────────────────────────────────────────────────────
  section('Phase 4: Regions');
  // ────────────────────────────────────────────────────

  const regionsApi = await api('/api/regions');
  assert('Regions list returns 5 countries', regionsApi.data?.length === 5, `Got ${regionsApi.data?.length}`);

  const expectedRoles: Record<string, string> = {
    SG: 'Governance (HQ)', UK: 'Governance', IN: 'Delivery (anchor)',
    LK: 'Satellite (delivery support)', ZA: 'Satellite',
  };
  for (const r of regionsApi.data || []) {
    assert(`Region ${r.code} hub role correct`, r.hubRole === expectedRoles[r.code], `Got "${r.hubRole}"`);
    assert(`Region ${r.code} has headcount`, r.totalPeople > 0);
    assert(`Region ${r.code} has compliance breakdown`, r.compliance?.green !== undefined);
  }

  const regionIN = await api('/api/regions/IN');
  assert('Region IN detail returns data', regionIN.status === 200);
  assert('Region IN has people list', regionIN.data?.people?.length > 0);
  assert('Region IN has top skills', regionIN.data?.topSkills?.length > 0);
  assert('Region IN has stage distribution', Object.keys(regionIN.data?.stageDistribution || {}).length > 0);

  const badRegion = await api('/api/regions/XX');
  assert('Invalid region returns 404', badRegion.status === 404);

  // ────────────────────────────────────────────────────
  section('Phase 5: Dashboard');
  // ────────────────────────────────────────────────────

  const dashboard = await api('/api/dashboard');
  assert('Dashboard API returns 200', dashboard.status === 200);
  assert('Dashboard has KPIs', !!dashboard.data?.kpis);
  assert('KPI: activeInterns > 0', dashboard.data?.kpis?.activeInterns > 0, `Got ${dashboard.data?.kpis?.activeInterns}`);
  assert('KPI: fteCount > 0', dashboard.data?.kpis?.fteCount > 0);
  assert('KPI: atRiskCount >= 0', dashboard.data?.kpis?.atRiskCount >= 0);
  assert('KPI: complianceIssues >= 0', dashboard.data?.kpis?.complianceIssues >= 0);
  assert('KPI: skillsCoverage 0-100', dashboard.data?.kpis?.skillsCoverage >= 0 && dashboard.data?.kpis?.skillsCoverage <= 100);
  assert('Dashboard has funnel', dashboard.data?.funnel?.length === 8, `Got ${dashboard.data?.funnel?.length}`);
  assert('Dashboard has 5 regions', dashboard.data?.regions?.length === 5);
  assert('Dashboard has retention trend (3 months)', dashboard.data?.retentionTrend?.length === 3);
  assert('Dashboard has at-risk queue', Array.isArray(dashboard.data?.topAtRisk));

  // At-risk ordering: red should come before amber (if any reds exist)
  const topAtRisk = dashboard.data?.topAtRisk || [];
  if (topAtRisk.length > 1) {
    const redIdx = topAtRisk.findIndex((p: any) => p.riskLevel === 'red');
    const amberIdx = topAtRisk.findIndex((p: any) => p.riskLevel === 'amber');
    const ordered = redIdx === -1 || amberIdx === -1 || redIdx < amberIdx;
    assert('At-risk queue has Red-before-Amber ordering', ordered, `Red at ${redIdx}, Amber at ${amberIdx}`);
  } else {
    assert('At-risk queue has at least 1 entry', topAtRisk.length >= 1, `Got ${topAtRisk.length}`);
  }

  // ────────────────────────────────────────────────────
  section('Phase 6: Exit Reason');
  // ────────────────────────────────────────────────────

  // Clean up any leftover test person first
  const existingTest = await api('/api/people?search=E2E Test Person');
  if (existingTest.data?.length > 0) {
    for (const p of existingTest.data) {
      await api(`/api/people/${p.id}`, { method: 'DELETE' });
    }
  }

  const testPerson = await apiPost('/api/people', {
    name: 'E2E Test Person',
    email: 'e2e-test@beauroi.demo',
    type: 'intern',
    region: 'IN',
  });
  assert('Test person created', testPerson.status === 201, `Status: ${testPerson.status}, body: ${JSON.stringify(testPerson.data)}`);

  const testId = testPerson.data?.id;
  if (testId) {
    const exitTransition = await apiPost('/api/pipeline/transition', {
      personId: testId,
      newStage: 'exit',
      exitReason: 'skills_gap',
    });
    assert('Exit with reason succeeds', exitTransition.status === 200, `Status: ${exitTransition.status}, body: ${JSON.stringify(exitTransition.data)}`);

    const exited = await api(`/api/people/${testId}`);
    assert('Exit reason saved on person', exited.data?.exitReason === 'skills_gap', `Got "${exited.data?.exitReason}"`);

    await api(`/api/people/${testId}`, { method: 'DELETE' });
  }

  // ────────────────────────────────────────────────────
  section('Phase 6: Certification Tracking');
  // ────────────────────────────────────────────────────

  if (priya) {
    const priyaSkills = await api(`/api/people/${priya.id}/skills`);
    const firstSkill = priyaSkills.data?.[0];
    if (firstSkill) {
      const certUpdate = await apiPut(`/api/people/${priya.id}/skills`, {
        action: 'update_cert',
        personSkillId: firstSkill.id,
        certName: 'GCP Associate Cloud Engineer',
        certExpiry: '2027-06-15',
      });
      assert('Certification update succeeds', certUpdate.status === 200);

      const updatedSkills = await api(`/api/people/${priya.id}/skills`);
      const updated = updatedSkills.data?.find((s: any) => s.id === firstSkill.id);
      assert('Cert name saved', updated?.certName === 'GCP Associate Cloud Engineer', `Got "${updated?.certName}"`);
      assert('Cert expiry saved', updated?.certExpiry?.includes('2027'), `Got "${updated?.certExpiry}"`);

      // Clear cert
      await apiPut(`/api/people/${priya.id}/skills`, {
        action: 'update_cert',
        personSkillId: firstSkill.id,
        certName: null,
        certExpiry: null,
      });
    }
  }

  // ────────────────────────────────────────────────────
  section('Access Control');
  // ────────────────────────────────────────────────────

  cookies = internAuth.cookies;
  const internPeople = await api('/api/people');
  assert('Intern can read people', internPeople.status === 200);

  const internDashboard = await api('/api/dashboard');
  assert('Intern can read dashboard', internDashboard.status === 200);

  const internCreate = await apiPost('/api/people', {
    name: 'Should Fail', email: 'fail@test.com', type: 'intern', region: 'IN',
  });
  assert('Intern cannot create people', internCreate.status === 403);

  const internSeed = await apiPost('/api/seed', {});
  assert('Intern cannot seed data', internSeed.status === 403);

  cookies = adminAuth.cookies;

  // ────────────────────────────────────────────────────
  section('Demo Persona Verification');
  // ────────────────────────────────────────────────────

  if (priya) {
    assert('Priya: region is IN', priya.region === 'IN');
    assert('Priya: type is intern', priya.type === 'intern');
  }
  if (james) {
    assert('James: region is UK', james.region === 'UK');
    assert('James: type is FTE', james.type === 'fte');
  }
  if (amara) {
    assert('Amara: region is LK', amara.region === 'LK');
    assert('Amara: type is intern', amara.type === 'intern');
  }

  // ────────────────────────────────────────────────────
  section('Data Consistency Checks');
  // ────────────────────────────────────────────────────

  const validStages = ['applied', 'onboarded', 'training', 'project', 'mentor_review', 'fte_offer', 'fte_hired', 'exit'];
  const allValidStages = people.data?.every((p: any) => validStages.includes(p.stage));
  assert('All people have valid stages', allValidStages);

  const validRisk = ['green', 'amber', 'red'];
  const allValidRisk = people.data?.every((p: any) => validRisk.includes(p.riskLevel));
  assert('All people have valid risk levels', allValidRisk);

  const allValidRegion = people.data?.every((p: any) => regions.includes(p.region));
  assert('All people have valid regions', allValidRegion);

  if (priya) {
    const priyaComp = await api(`/api/people/${priya.id}/compliance`);
    assert('Each person has 5 compliance items', priyaComp.data?.items?.length === 5, `Got ${priyaComp.data?.items?.length}`);
  }

  // Funnel counts match total people
  const funnelTotal = funnel.data?.stageCounts?.reduce((sum: number, s: any) => sum + s.count, 0) || 0;
  assert('Funnel total matches people count', funnelTotal === people.data?.length, `Funnel: ${funnelTotal}, People: ${people.data?.length}`);

  // ════════════════════════════════════════════════════
  // Report
  // ════════════════════════════════════════════════════

  console.log('\n' + '═'.repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);

  if (failures.length > 0) {
    console.log('🔴 Failures:');
    for (const f of failures) {
      console.log(`   • ${f.name}: ${f.error}`);
    }
  } else {
    console.log('🟢 All tests passed!');
  }

  console.log();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(2);
});
