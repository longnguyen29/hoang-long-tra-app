-- A phone number or email is not proof of identity. The old public reorder lookup returned
-- a customer's name, delivery address, tax number, and previous basket to anyone who knew
-- that contact value. Keep the function for migration compatibility, but remove all client
-- execution. A future reorder flow should send a one-time code before returning order data.

revoke execute on function reorder_lookup(text, text) from anon;
revoke execute on function reorder_lookup(text, text) from authenticated;
