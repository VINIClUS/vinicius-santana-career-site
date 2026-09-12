import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyRoutes, resolveLegacyDestination } from '../src/features/navigation/legacy-routes.ts';

const expectedRoutes = {
  '/work/': '/explore/',
  '/work/cnesdata/': '/explore/cnesdata/',
  '/work/limnopulse/': '/explore/limnopulse/',
  '/work/infrastructure/': '/explore/infrastructure/'
};

test('compatibility exposes exactly the four approved routes', () => {
  assert.deepEqual(legacyRoutes, expectedRoutes);
});

for (const [source, destination] of Object.entries(expectedRoutes)) {
  test(`${source} maps the retired architecture fragment to the canonical system fragment`, () => {
    const current = new URL(`${source}?tag=a&tag=b&encoded=%2F%3F%23+%20#architecture`, 'https://dev.vinisantana.com');
    assert.equal(resolveLegacyDestination(current), `${destination}?tag=a&tag=b&encoded=%2F%3F%23+%20#system`);
    assert.equal(current.pathname, source, 'resolution does not mutate the input');
  });

  test(`${source} resolves only to ${destination}, retaining all other opaque query and fragment data`, () => {
    for (const suffix of ['', '#component-api', '?tag=a&tag=b&encoded=%2F%3F%23+%20#component-api', '?next=https://evil.example/&url=%2F%2Fevil.example&redirect=https%3A%2F%2Fevil.example#https://evil.example/']) {
      const current = new URL(source + suffix, 'https://dev.vinisantana.com');
      assert.equal(resolveLegacyDestination(current), destination + suffix);
      assert.equal(current.pathname, source, 'resolution does not mutate the input');
    }
  });
}

test('unknown paths and inherited object keys never redirect', () => {
  for (const path of ['/work/unknown/', '/work/cnesdata/extra/', '/work', '/explore/', '/work/constructor/', '/toString', '/__proto__', '/work/%63nesdata/']) {
    assert.equal(resolveLegacyDestination(new URL(path + '?next=/explore/', 'https://example.com')), undefined);
  }
});
