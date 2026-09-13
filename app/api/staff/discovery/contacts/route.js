import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { collectPublicContacts } from "@/lib/prospect-contact-fetch";
export const runtime = "nodejs";
export const maxDuration = 60;
const reply = (body, status = 200) => Response.json(body, {status, headers:{"Cache-Control":"no-store"}});
export async function POST(request) {
  let staff;
  try { staff = await authenticateManagerRequest(request); } catch { /* fail closed */ }
  if (!staff) return reply({error:"Cần đăng nhập bằng tài khoản quản lý."},403);
  let id;
  try {
    const raw = await request.text();
    if(raw.length > 1000) throw new Error();
    const body = JSON.parse(raw); id = body.prospect_id;
    if(typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error();
  } catch { return reply({error:"Chọn một quán đã lưu để lấy liên hệ."},400); }
  const {data:source, error:reserveError} = await staff.admin.rpc('reserve_discovery_contacts',{p_id:id,p_user:staff.user.id});
  if(reserveError || !source) {
    const cooldown = reserveError?.message?.includes('collection_cooldown');
    return reply({error:cooldown ? "Quán này vừa được kiểm tra. Đợi một phút trước khi thử lại." : "Chưa thể đọc liên hệ. Kiểm tra thiết lập dữ liệu và trạng thái quán."},cooldown?429:409);
  }
  try {
    const result = await collectPublicContacts(source);
    if (result.contacts.length) {
      const {error} = await staff.admin.rpc('store_discovery_contacts',{p_id:id,p_contacts:result.contacts});
      if(error) return reply({error:"Đã đọc nguồn nhưng chưa lưu được liên hệ. Dữ liệu cũ được giữ lại; thử lại sau."},503);
    }
    return reply(result);
  } catch { return reply({error:"Chưa đọc được website. Liên hệ đã lưu được giữ nguyên."},502); }
}
