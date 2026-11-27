import test from "node:test";
import assert from "node:assert/strict";
import { currentBusinessCycle, validateBusinessCycle, reviewLabel, vnToday } from "./business-cycle.js";

test("plan phase must begin in the selected month and have real dates and a review criterion",()=>{
  const phase={phase:"plant",startsOn:"2026-11-27",reviewOn:"2026-12-11",readyWhen:"  đủ phản hồi  "};
  assert.deepEqual(validateBusinessCycle(phase,"2026-11-01"),{...phase,readyWhen:"đủ phản hồi"});
  for (const adjustment of [{phase:"none"},{startsOn:"2026-12-01"},{reviewOn:"2026-11-31"},{reviewOn:"2026-11-26"},{readyWhen:" "}]) {
    assert.equal(validateBusinessCycle({...phase,...adjustment},"2026-11-01"),undefined);
  }
});

test("future plan stays scheduled; overdue reviews do not switch phase",()=>{
  const previous={cycle:{phase:"plant",startsOn:"2026-11-01",reviewOn:"2026-11-12"}};
  const scheduled={cycle:{phase:"grow",startsOn:"2026-12-12",reviewOn:"2027-01-01"}};
  assert.equal(currentBusinessCycle([scheduled,previous],"2026-12-10"),previous);
  assert.equal(currentBusinessCycle([scheduled,previous],"2026-12-12"),scheduled);
  assert.equal(currentBusinessCycle([],"2026-12-12"),null);
  assert.equal(reviewLabel("2026-11-12","2026-11-27"),"Trễ 15 ngày");
  assert.equal(reviewLabel("2026-12-11","2026-12-11"),"Xem lại hôm nay");
  assert.equal(vnToday(new Date("2026-11-26T17:00:00Z")),"2026-11-27");
});
