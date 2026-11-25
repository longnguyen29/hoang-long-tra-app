import test from "node:test";
import assert from "node:assert/strict";
import { MISSIONS, weekKey, shiftWeek, missionScore, missionRank, trackedPosts, normalizeWeek } from "./growth-missions.mjs";
test("Vietnam Monday boundary and year crossover",()=>{
 assert.equal(weekKey("2026-11-29T16:59:59Z"),"2026-11-23");
 assert.equal(weekKey("2026-11-29T17:00:00Z"),"2026-11-30");
 assert.equal(shiftWeek("2026-12-28",1),"2027-01-04");
});
test("weighted XP caps repeated actions",()=>{
 assert.equal(missionScore({}),0);
 assert.equal(missionScore({posts:9999}),20);
 assert.equal(missionScore(Object.fromEntries(MISSIONS.map(m=>[m.id,m.target]))),100);
 assert.equal(missionRank(100),"Vườn trà vững mạnh");
});
test("tracked publications are deduplicated",()=>{
 const v={id:"x",published_at:"2026-11-29T17:00:00Z",threads_post_url:"https://threads.net/post/x"};
 assert.equal(trackedPosts([{variants:[v,v,{...v,id:"bad",published_at:"bad"}]}],"2026-11-30"),1);
 assert.equal(trackedPosts([{variants:[v]}],"2026-11-23"),0);
});
test("corrupt storage is sanitized",()=>{
 assert.equal(normalizeWeek({counts:{posts:-1,replies:"15"}}).counts.posts,0);
 assert.equal(normalizeWeek({counts:{replies:"15"}}).counts.replies,0);
 assert.equal(normalizeWeek(null).focus,"");
});
