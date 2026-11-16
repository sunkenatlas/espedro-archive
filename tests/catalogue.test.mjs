import { test } from 'node:test';
import assert from 'node:assert/strict';

const entities = [
  { id:'EA-001', name:'指节', english:'The Knuckle', family:'手指', tags:['躯体扭曲'], summary:'夜间街道中的人形', rules:[{ text:'保持距离' }] },
  { id:'EA-030', name:'余数', english:'The Remainder', family:'四肢', tags:['躯体扭曲','巨型实体'], summary:'由手臂构成的球体', rules:[{ text:'远离封锁区域' }] },
  { id:'EA-035', name:'降神', english:'The Deus', family:'降神', tags:['概念异常'], summary:'异常什么都不是', rules:[] },
];
test('catalogue search accepts Chinese, case-insensitive English and fullwidth archive codes', async () => {
  const { filterEntities } = await import('../src/catalogue-core.js');
  for (const q of ['余数','REMAINDER','ＥＡ－０３０']) assert.deepEqual(filterEntities(entities,{q}).map(x=>x.id),['EA-030']);
});
test('search and both filters combine instead of overwriting one another', async () => {
  const { filterEntities } = await import('../src/catalogue-core.js');
  assert.equal(filterEntities(entities,{q:'手臂',family:'四肢',tag:'巨型实体'}).length,1);
  assert.equal(filterEntities(entities,{family:'手指',tag:'巨型实体'}).length,0);
  assert.equal(filterEntities(entities,{q:'保持距离'})[0].id,'EA-001');
  assert.equal(filterEntities(entities,{}).length,3);
});
test('shared URLs preserve non-ASCII filters and normalize invalid view modes', async () => {
  const { stateFromSearch, searchFromState } = await import('../src/catalogue-core.js');
  const state = {q:'掌心 灯光',family:'手指',tag:'认知影响',view:'index'};
  assert.deepEqual(stateFromSearch(searchFromState(state)),state);
  assert.equal(stateFromSearch('?view=bogus').view,'gallery');
  assert.equal(searchFromState({q:'',family:'',tag:'',view:'gallery'}),'');
});
