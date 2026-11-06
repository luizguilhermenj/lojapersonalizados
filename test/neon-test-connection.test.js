import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTestConnection } from './helpers/neon-test-connection.js';
test('opt-in Neon não usa fallback nem expõe URLs em erros de configuração', () => {
  const fixture='postgresql://test:private-test-password@ep-test.region.aws.neon.tech/test?sslmode=require';
  assert.equal(validateTestConnection(fixture),fixture);
  for(const [value,app] of [[undefined,fixture],[fixture,fixture],['private-test-password invalid URL',undefined],[fixture.replace('require','disable'),undefined],[fixture.replace('neon.tech','example.com'),undefined]]) {
    assert.throws(()=>validateTestConnection(value,app),error=>!error.message.includes('private-test-password')&&!Object.hasOwn(error,'input')&&!Object.hasOwn(error,'actual'));
  }
});
