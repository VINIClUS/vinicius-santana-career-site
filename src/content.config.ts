import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { publicEvidenceUrl } from './content/publicEvidenceUrl.js';

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

const caseStudies = defineCollection({
  loader: file('src/content/case-studies.yaml'),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    order: z.number().int().positive(),
    title: nonEmptyText,
    eyebrow: nonEmptyText,
    summary: nonEmptyText,
    technologies: z.array(nonEmptyText).min(1),
    problem: nonEmptyText,
    context: nonEmptyText,
    contribution: z.array(nonEmptyText).min(1),
    architecture: z.array(architectureItem).min(1),
    decisions: z.array(nonEmptyText).min(1),
    reliability: z.array(nonEmptyText).min(1),
    outcomes: z.array(nonEmptyText).min(1),
    limitations: z.array(nonEmptyText).min(1),
    evidence: z.array(evidenceItem).min(1)
  })
});

export const collections = { caseStudies };
