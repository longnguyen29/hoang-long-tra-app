import test from 'node:test';
import assert from 'node:assert/strict';
import { retailOptionGrams, retailVolumeBenefits } from './retail-volume-policy.js';
import { prepareRetailCheckout } from './retail-checkout.js';
import { retailOptions } from './retail-catalog.js';

const tea={id:'loose',kind:'tea',line:'everyday',available:true,price:100000,name:{vi:'Trà thử'}};
const line=(qty,price=100000,fields={})=>({product:tea,qty,price,unit:'kg',...fields});

test('mass uses actual kg or an explicit package weight, never inferred piece counts',()=>{
  assert.equal(retailOptionGrams(line(1)),1000);
  for(const [weight,expected] of [['500g',500],['0,5 kg',500],['1 viên (8g)',8],['1 bánh (357g)',357],['20 x 8g',160],['20 viên',null],['100g / 500g',null],['8g per serving',null]]) {
    assert.equal(retailOptionGrams(line(1,10000,{unit:'pcs',weight})),expected,weight);
  }
  assert.equal(retailOptionGrams(line(1,10000,{product:{...tea,kind:'goods'}})),0);
  assert.equal(retailOptionGrams(line(1,10000,{product:{...tea,line:'sample'}})),0);
});

test('thresholds are inclusive, highest tier only and do not round a sub-threshold pack up',()=>{
  for(const [grams,rate,free] of [[4999.999,0,false],[5000,0,true],[19999.999,0,true],[20000,3,true],[49999.999,3,true],[50000,5,true],[99999.999,5,true],[100000,7,true]]){
    const benefit=retailVolumeBenefits([line(1,100000,{unit:'pcs',weight:`${grams}g`})]);
    assert.equal(benefit.percent,rate,String(grams));assert.equal(benefit.freeShippingEligible,free,String(grams));
  }
});

test('mixed carts discount only tea with known mass and leave goods and unknown tea unchanged',()=>{
  const result=retailVolumeBenefits([line(20),line(1,300000,{product:{...tea,kind:'goods'}}),line(1,200000,{unit:'pcs',weight:'20 viên'})]);
  assert.equal(result.teaKg,20);assert.equal(result.percent,3);assert.equal(result.discount,60000);
  assert.equal(result.subtotal,2500000);assert.equal(result.total,2440000);assert.equal(result.unknownTeaWeight,true);
  assert.equal(retailVolumeBenefits([]).total,0);
});

test('fractional gram packs accumulate before comparison and discounts round once to whole VND',()=>{
  const result=retailVolumeBenefits([line(40,12345,{unit:'pcs',weight:'500g'})]);
  assert.equal(result.teaKg,20);assert.equal(result.discount,14814);assert.equal(result.total,478986);
  const cakes=retailVolumeBenefits([line(14,200000,{unit:'bánh',weight:'1 bánh (357g)'})]);
  assert.equal(cakes.teaGrams,4998);assert.equal(cakes.freeShippingEligible,false);
  assert.equal(retailVolumeBenefits([line(1,1.2)]).total,1.2);
});

test('checkout recomputes volume benefit and ignores forged client mass, discount or free shipping',()=>{
  const [option]=retailOptions(tea);
  const payload={cart:{loose:100},expectedTotal:9300000,expectedLines:[{key:option.key,price:option.price,unit:option.unit,weight:option.weight,packing:''}],customer:{name:'Buyer',contact:'buyer@example.test',address:'Test',consent:true,payment:'qr'},discount:99,teaKg:9000,freeShipping:true};
  const result=prepareRetailCheckout(payload,[tea]);
  assert.equal(result.benefits.percent,7);assert.equal(result.total,9300000);assert.equal(result.lines[0].price,100000);
  assert.throws(()=>prepareRetailCheckout({...payload,expectedTotal:100000},[tea]),/price_changed/);
});
