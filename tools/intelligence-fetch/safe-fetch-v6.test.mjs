import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicEvidence} from './safe-public-fetch.mjs';
test('robots private-network result remains a terminal security denial',async()=>{
 let calls=0;const transport=async()=>{calls++;throw new Error('private_network')};
 await assert.rejects(()=>extractPublicEvidence('https://tea.example.com/menu',{transport}),/private_network/);
 assert.equal(calls,1);
});
test('robots unsafe cross-origin redirect is never downgraded to transient',async()=>{
 let calls=0;const transport=async()=>{calls++;return {status:302,headers:{location:'https://evil.example.com/private'},body:''}};
 await assert.rejects(()=>extractPublicEvidence('https://tea.example.com/menu',{transport}),/unsafe_redirect/);
 assert.equal(calls,1);
});
test('true network robots failure remains retryable robots_unavailable',async()=>{
 const transport=async()=>{throw new Error('ECONNRESET')};
 await assert.rejects(()=>extractPublicEvidence('https://tea.example.com/menu',{transport}),/robots_unavailable/);
});
