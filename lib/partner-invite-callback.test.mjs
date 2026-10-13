import test from "node:test";
import assert from "node:assert/strict";
import { parsePartnerInviteFragment } from "./partner-invite-callback.js";

const fragment = "#type=invite&token_type=bearer&access_token=header.payload.signature&refresh_token=example_refresh_token";
test("only a complete invitation callback supplies session tokens", () => {
  assert.deepEqual(parsePartnerInviteFragment(fragment), { access_token: "header.payload.signature", refresh_token: "example_refresh_token" });
  for (const value of ["", fragment.replace("type=invite", "type=recovery"), fragment.replace("bearer", "other"), `${fragment}&error=expired`, `${fragment}&error_description=private_provider_detail`, `${fragment}&access_token=duplicate`, `${fragment}&refresh_token=duplicate`, fragment.replace("example_refresh_token", "short"), fragment.replace("header.payload.signature", "not_a_jwt"), `${fragment}&type=invite`, `${fragment}&token_type=bearer`, `${fragment}&padding=${"x".repeat(24576)}`]) assert.equal(parsePartnerInviteFragment(value), null);
});
