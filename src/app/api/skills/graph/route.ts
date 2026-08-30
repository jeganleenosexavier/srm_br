import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const type = searchParams.get('type');
  const category = searchParams.get('category');

  const personWhere: Record<string, unknown> = {};
  if (region) personWhere.region = region;
  if (type) personWhere.type = type;

  const people = await prisma.person.findMany({
    where: personWhere,
    include: {
      skills: { include: { skill: true } },
      project: true,
    },
  });

  const skillWhere: Record<string, unknown> = {};
  if (category) skillWhere.category = category;

  const allSkills = await prisma.skill.findMany({ where: skillWhere });
  const skillIds = new Set(allSkills.map((s) => s.id));

  const nodes: { id: string; type: string; data: Record<string, unknown> }[] = [];
  const edges: { id: string; source: string; target: string; data: Record<string, unknown> }[] = [];
  const addedProjects = new Set<string>();

  for (const skill of allSkills) {
    nodes.push({
      id: `skill-${skill.id}`,
      type: 'skill',
      data: { label: skill.name, category: skill.category, demandLevel: skill.demandLevel },
    });
  }

  for (const person of people) {
    nodes.push({
      id: `person-${person.id}`,
      type: 'person',
      data: { label: person.name, personType: person.type, region: person.region },
    });

    for (const ps of person.skills) {
      if (!skillIds.has(ps.skillId)) continue;
      edges.push({
        id: `edge-${person.id}-${ps.skillId}`,
        source: `person-${person.id}`,
        target: `skill-${ps.skillId}`,
        data: { proficiency: ps.proficiency },
      });
    }

    if (person.project && !addedProjects.has(person.project.id)) {
      addedProjects.add(person.project.id);
      nodes.push({
        id: `project-${person.project.id}`,
        type: 'project',
        data: { label: person.project.name, domain: person.project.domain },
      });
    }

    if (person.project) {
      edges.push({
        id: `edge-${person.id}-proj-${person.project.id}`,
        source: `person-${person.id}`,
        target: `project-${person.project.id}`,
        data: { type: 'project' },
      });
    }
  }

  return NextResponse.json({ nodes, edges });
}
