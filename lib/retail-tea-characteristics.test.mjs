import test from 'node:test';
import assert from 'node:assert/strict';
import { retailTeaCharacteristics } from './retail-tea-characteristics.js';

test('black and green tea offer sensory cues and daytime moments in both languages', () => {
  const black = retailTeaCharacteristics({ id: 'hong-tra-shan-tuyen-mti6jlyg' });
  const green = retailTeaCharacteristics({ id: 'luc-tra-shan-moc' }, 'en');
  assert.match(black.feeling, /Ấm áp/);
  assert.match(black.moment, /Buổi sáng/);
  assert.match(green.feeling, /Refreshing/);
  assert.match(green.moment, /daytime/);
  assert.match(green.serving, /refrigerator/);
  assert.match(black.labels.caffeine, /caffeine/);
  assert.doesNotMatch(JSON.stringify([black, green]), /bedtime|night|before sleep|tạng|giải độc|detox|liver|kidney|tim mạch/i);
});

test('signature notes prefer current localized catalogue flavors without changing the product', () => {
  const product = { id: 'hong-tra-shan-khoi', name: { vi: 'Hồng Trà Shan Khói' }, flavors: { vi: ['  Hương gỗ ', '', null, 'Mật nhẹ'], en: ['Wood'] }, brew: { vi: 'Hướng dẫn riêng' } };
  const before = JSON.stringify(product);
  assert.deepEqual(retailTeaCharacteristics(product).signatureNotes, ['Hương gỗ', 'Mật nhẹ']);
  assert.deepEqual(retailTeaCharacteristics(product, 'en').signatureNotes, ['Wood']);
  assert.equal(JSON.stringify(product), before);
});

test('smoke and honey fallback belong only to the explicitly named SKUs', () => {
  assert.deepEqual(retailTeaCharacteristics({ id: 'hong-tra-shan-khoi', name: { vi: 'Hồng Trà Shan Khói' } }, 'en').signatureNotes, ['Smoke']);
  assert.deepEqual(retailTeaCharacteristics({ id: 'hong-tra-shan-mat', name: { en: 'Honey Shan Black Tea' } }).signatureNotes, ['Mật ong']);
  assert.deepEqual(retailTeaCharacteristics({ id: 'hong-tra-shan-tuyen-mti6jlyg', name: { vi: 'Hồng Trà Shan Tuyển' } }).signatureNotes, []);
  assert.deepEqual(retailTeaCharacteristics({ id: 'hong-tra-shan-khoi', name: { vi: 'Tên mới chưa xác nhận' } }).signatureNotes, []);
  assert.deepEqual(retailTeaCharacteristics({ id: 'hong-tra-shan-mat' }).signatureNotes, []);
});

test('goods, samples and unclassified products do not inherit tea guidance', () => {
  assert.equal(retailTeaCharacteristics({ id: 'luc-tra-shan-moc', kind: 'goods' }), null);
  assert.equal(retailTeaCharacteristics({ id: 'luc-tra-shan-moc', line: 'sample' }), null);
  assert.equal(retailTeaCharacteristics({ id: 'future-tea' }), null);
  assert.equal(retailTeaCharacteristics(), null);
  for (const id of ['bach-mau-don', 'oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a', 'luc-tra-hoa-sen', 'pho-nhi-banh-mv2k6syd']) {
    assert.ok(retailTeaCharacteristics({ id }, 'en').moment);
  }
});
