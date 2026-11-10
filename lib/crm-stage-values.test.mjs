import test from 'node:test';
import assert from 'node:assert/strict';
import {latestOpenQuoteValues, stageQuoteTotal} from './crm-stage-values.js';
test('uses one latest open quote per customer, not paid revenue or closed quotes', () => {
 const values=latestOpenQuoteValues([{opportunity_id:'a',status:'sent',total:100,created_at:'2026-01-01'}, {opportunity_id:'a',status:'accepted',total:200,created_at:'2026-02-01'}, {opportunity_id:'a',status:'converted',total:500,created_at:'2026-03-01'}, {opportunity_id:'b',status:'draft',total:50}]);
 assert.deepEqual(stageQuoteTotal([{id:'a'},{id:'b'},{id:'c'}],values),{total:250,count:2});
 assert.equal(stageQuoteTotal([{id:'c'}],values),null);
});
