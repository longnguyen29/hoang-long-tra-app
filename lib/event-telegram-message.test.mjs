import test from 'node:test';
import assert from 'node:assert/strict';
import { eventEnquiryTelegramMessage } from './event-telegram-message.js';
test('formats an incoming sample enquiry with customer contact and request details', () => {
  const message = eventEnquiryTelegramMessage({intent:'sample',name:'Quán thử',business:'Quán A',contact:'0900000000',note:'Trà mật _ 10kg',source:'website',medium:'owned'});
  assert.match(message,/Yêu cầu mẫu/); assert.match(message,/Quán A/); assert.match(message,/0900000000/); assert.match(message,/Trà mật _ 10kg/);
});
test('handles optional contact fields without inventing details', () => {
  const message = eventEnquiryTelegramMessage({intent:'cooperation'});
  assert.match(message,/Yêu cầu hợp tác/); assert.doesNotMatch(message,/undefined|null/);
});
