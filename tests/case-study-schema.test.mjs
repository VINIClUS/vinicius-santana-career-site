import assert from 'node:assert/strict';
import { publicEvidenceUrl } from '../src/content/publicEvidenceUrl.js';

assert.equal(publicEvidenceUrl.safeParse('https://github.com/VINIClUS/CnesData').success, true);

for (const unsafeUrl of [
  'http://github.com/VINIClUS/CnesData',
  'ftp://github.com/VINIClUS/CnesData',
  'javascript:alert(1)'
]) {
  assert.equal(publicEvidenceUrl.safeParse(unsafeUrl).success, false, `${unsafeUrl} must not be accepted as public evidence`);
}
