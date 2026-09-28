import assert from 'node:assert/strict';
import test from 'node:test';
import {PROCEDURE_STAGES,procedureTemplate,procedureProgress,preDispatchProblems} from './procedure-templates.js';

test('domestic and export procedures keep the same ordered operational spine',()=>{
  const domestic=procedureTemplate('domestic_b2b');
  const exportRows=procedureTemplate('export_b2b');
  assert.deepEqual([...new Set(domestic.map(item=>item.stage_key))],PROCEDURE_STAGES.map(([key])=>key));
  assert.ok(exportRows.length>domestic.length);
  assert.ok(exportRows.some(item=>item.item_key==='customs_export'&&item.evidence_required));
  assert.ok(domestic.some(item=>item.item_key==='clean_dry'&&item.critical&&item.verification_required));
  assert.ok(domestic.some(item=>item.item_key==='pod'&&item.evidence_required));
});

test('a tick awaiting second-person verification does not count as complete or release dispatch',()=>{
  const rows=procedureTemplate('domestic_b2b').map(item=>({...item,status:'verified'}));
  const inspection=rows.find(item=>item.item_key==='clean_dry');
  inspection.status='done';
  assert.equal(procedureProgress(rows).done,rows.length-1);
  assert.equal(preDispatchProblems(rows,[]).critical[0].item_key,'clean_dry');
  inspection.status='verified';
  assert.equal(preDispatchProblems(rows,[]).critical.length,0);
  assert.equal(preDispatchProblems(rows,[{stop_work:true,status:'resolved'}]).stop.length,1);
  assert.equal(preDispatchProblems(rows,[{stop_work:true,status:'verified'}]).stop.length,0);
});
