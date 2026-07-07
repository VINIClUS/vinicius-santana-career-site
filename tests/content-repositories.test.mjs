import assert from 'node:assert/strict';
import { caseNotes, projects } from '../src/data/content.js';

const expectedPublicRepositoryUrls = [
  'https://github.com/VINIClUS/CnesData',
  'https://github.com/VINIClUS/CnesForm',
  'https://github.com/VINIClUS/aquafarm',
  'https://github.com/VINIClUS/esus-pec-bootstrap',
  'https://github.com/VINIClUS/infra-ansible',
  'https://github.com/VINIClUS/vinicius-santana-career-site',
  'https://github.com/VINIClUS/vinicius-santana-linguist'
];

const repositoryUrls = projects
  .flatMap((project) => project.links)
  .filter((link) => link.label === 'View repository')
  .map((link) => link.href)
  .sort();

assert.deepEqual(repositoryUrls, expectedPublicRepositoryUrls.sort());

const caseNoteIds = new Set(caseNotes.map((note) => `#${note.id}`));
const brokenCaseStudyLinks = projects
  .flatMap((project) => project.links)
  .filter((link) => link.label === 'Read case study')
  .filter((link) => !caseNoteIds.has(link.href));

assert.deepEqual(brokenCaseStudyLinks, []);
