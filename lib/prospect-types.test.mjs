import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_TYPES, VERTICAL_TAGS, accountMetadata, validateDiscoverySearch } from './prospect-types.js';
import { normalizeProspect, discoveryQuery, outreachDraft } from './prospect-discovery.js';

test('legacy metadata defaults and all controlled account types survive normalization', () => {
  assert.deepEqual(accountMetadata(), { account_type:'shop', country_code:'VN', vertical_tags:[], is_watchlisted:false });
  assert.equal(Object.keys(ACCOUNT_TYPES).length,9);
  for (const account_type of Object.keys(ACCOUNT_TYPES)) {
    const p=normalizeProspect({name:'Business',source_url:'https://business.example',account_type,country_code:' us ',vertical_tags:Object.keys(VERTICAL_TAGS),is_watchlisted:true});
    assert.equal(p.account_type,account_type);assert.equal(p.country_code,'US');assert.equal(p.vertical_tags.length,19);assert.equal(p.is_watchlisted,true);
  }
});
test('metadata rejects nulls, malformed values and unrecognized vocabulary', () => {
  for(const input of [null,[],{account_type:null},{account_type:'watchlist'},{account_type:'constructor'},{country_code:null},{country_code:'V'},{country_code:'123'},{country_code:'VNXX'},{vertical_tags:null},{vertical_tags:{}},{vertical_tags:['unknown']},{vertical_tags:[1]},{vertical_tags:[['coffee']]},{vertical_tags:Array(31).fill('coffee')},{is_watchlisted:'false'},{is_watchlisted:1},{is_watchlisted:null}]) assert.throws(()=>accountMetadata(input),JSON.stringify(input));
  assert.deepEqual(accountMetadata({vertical_tags:['coffee','coffee']}).vertical_tags,['coffee']);
});
test('search matrix allows only the unchanged Vietnam shop flow',()=>{
  validateDiscoverySearch({});validateDiscoverySearch({account_type:'shop',country_code:' vn ',segment:'milk'});
  for(const input of [{account_type:'chain'},{country_code:'US'},{vertical_tags:['coffee']},{is_watchlisted:true},{segment:null},{segment:'hotel'}]) assert.throws(()=>validateDiscoverySearch(input));
  for (const [segment,product] of [['all','("trà sữa" OR "trà trái cây")'],['milk','"trà sữa"'],['fruit','"trà trái cây"']]) {
    assert.equal(discoveryQuery('',segment),`Việt Nam (cafe OR coffee OR "quán trà") menu ${product} -site:hoanglongtra.com`);
    assert.equal(discoveryQuery('Huế',segment),`Huế (cafe OR coffee OR "quán trà") menu ${product} -site:hoanglongtra.com`);
  }
});
test('non-shop drafts are neutral, shop drafts unchanged and DNC never gets a suggestion',()=>{
  const legacy=outreachDraft({name:'Cafe',status:'qualified'});
  assert.equal(outreachDraft({name:'Cafe',status:'qualified',account_type:'shop'}),legacy);
  assert.match(legacy,/nền trà cho menu/);
  for(const account_type of Object.keys(ACCOUNT_TYPES).filter(t=>t!=='shop')) {
    assert.doesNotMatch(outreachDraft({name:'Business',status:'qualified',account_type}),/menu|café|nguyên liệu|sản lượng|nhà cung cấp/);
    assert.equal(outreachDraft({status:'do_not_contact',account_type}),'');
  }
});
