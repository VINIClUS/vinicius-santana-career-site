import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { publicEvidenceUrl } from './content/publicEvidenceUrl.js';
import { isPublicRepository } from './content/publicRepository.js';

const capabilityStatus = z.enum(['implemented', 'documented', 'planned', 'historical', 'illustrative']);
const nonEmptyText = z.string().trim().min(1);

const architectureItem = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: nonEmptyText,
  status: capabilityStatus,
  description: nonEmptyText
});

const evidenceItem = z.object({
  label: nonEmptyText,
  status: capabilityStatus,
  url: publicEvidenceUrl,
  description: nonEmptyText
});

const decisionItem = z.object({
  problem: nonEmptyText,
  decision: nonEmptyText,
  evidenceUrl: publicEvidenceUrl.optional()
});

const caseStudies = defineCollection({
  loader: file('src/content/case-studies.yaml'),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    order: z.number().int().positive(),
    title: nonEmptyText,
    eyebrow: nonEmptyText,
    summary: nonEmptyText,
    brief: z.object({ contribution: nonEmptyText, decision: nonEmptyText }),
    technologies: z.array(nonEmptyText).min(1),
    problem: nonEmptyText,
    context: nonEmptyText,
    contribution: z.array(nonEmptyText).min(1),
    architecture: z.array(architectureItem).min(1),
    decisions: z.array(decisionItem).length(3),
    reliability: z.array(nonEmptyText).min(1),
    outcomes: z.array(nonEmptyText).min(1),
    limitations: z.array(nonEmptyText).min(1),
    evidence: z.array(evidenceItem).min(1).refine(items => items.some(isPublicRepository), 'Evidence must include a public repository')
  })
});

export const collections = { caseStudies };
