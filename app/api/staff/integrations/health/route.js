import { NextResponse } from "next/server";
import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { readSmsGatewayConfig } from "@/lib/sms-gateway";

const ready = (value) => Boolean(String(value || "").trim());
const latestFor = (rows, carrier) => (rows || []).find((item) => item.shipping_carrier === carrier) || null;

export async function GET(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const [carrierResult, smsResult, notificationResult] = await Promise.all([
    staff.admin.from("orders").select("shipping_carrier,carrier_status_name,carrier_status_at")
      .not("carrier_status_at", "is", null).order("carrier_status_at", { ascending: false }).limit(50),
    staff.admin.from("sms_payment_reminders").select("status,updated_at,last_error")
      .order("updated_at", { ascending: false }).limit(25),
    staff.admin.from("customer_notifications").select("channel,status,updated_at,last_error")
      .order("updated_at", { ascending: false }).limit(25),
  ]);

  const carrierRows = carrierResult.data || [];
  const smsRows = smsResult.data || [];
  const notificationRows = notificationResult.data || [];
  const smsConfig = readSmsGatewayConfig();
  const smsLatest = smsRows[0] || null;
  const smsFailures = smsRows.filter((item) => item.status === "failed").length;
  const viettelLatest = latestFor(carrierRows, "viettel_post");
  const vnpostLatest = latestFor(carrierRows, "vietnam_post");
  const zaloLatest = notificationRows.find((item) => item.channel === "zalo_zbs") || null;
  const viettelConfigured = ready(process.env.VIETTEL_POST_WEBHOOK_SECRET);
  const cronConfigured = ready(process.env.CRON_SECRET);
  const zaloConfigured = ready(process.env.ZALO_APP_ID) && ready(process.env.ZALO_APP_SECRET);

  const services = [
    {
      id: "database", label: "Cơ sở dữ liệu", state: carrierResult.error || smsResult.error || notificationResult.error ? "action" : "healthy",
      detail: carrierResult.error || smsResult.error || notificationResult.error ? "Một phần dữ liệu vận hành chưa đọc được." : "Đã kết nối và đọc được dữ liệu vận hành.",
      lastAt: new Date().toISOString(),
    },
    {
      id: "viettel_post", label: "Viettel Post", state: !viettelConfigured ? "action" : viettelLatest ? "healthy" : "waiting",
      detail: !viettelConfigured ? "Chưa có webhook secret trên máy chủ." : viettelLatest ? `Lần cuối: ${viettelLatest.carrier_status_name || "đã nhận cập nhật"}.` : "Webhook đã sẵn sàng; đang chờ cập nhật đơn đầu tiên.",
      lastAt: viettelLatest?.carrier_status_at || null,
    },
    {
      id: "vietnam_post", label: "Vietnam Post", state: vnpostLatest ? "healthy" : "waiting",
      detail: vnpostLatest ? `Lần cuối: ${vnpostLatest.carrier_status_name || "đã nhận cập nhật"}.` : "Đường nhận webhook đã sẵn sàng; đang chờ Vietnam Post kích hoạt.",
      lastAt: vnpostLatest?.carrier_status_at || null,
    },
    {
      id: "sms", label: "SMS qua điện thoại Android", state: !smsConfig.ready ? "action" : smsFailures ? "action" : smsLatest ? "healthy" : "waiting",
      detail: !smsConfig.ready ? "Máy chủ chưa đủ thông tin để gửi qua điện thoại." : smsFailures ? `${smsFailures} lần gửi gần đây cần kiểm tra.` : smsLatest ? `Trạng thái gần nhất: ${smsLatest.status}.` : "Đã cấu hình; đang chờ tin nhắn đầu tiên.",
      lastAt: smsLatest?.updated_at || null,
    },
    {
      id: "scheduler", label: "Lịch tự động", state: cronConfigured ? "healthy" : "action",
      detail: cronConfigured ? "Đã bảo vệ lịch quét nhắc thanh toán và radar công thức." : "Chưa có khóa bảo vệ cho lịch tự động.",
      lastAt: null,
    },
    {
      id: "openai", label: "OpenAI cho công cụ nội dung", state: ready(process.env.OPENAI_API_KEY) ? "healthy" : "paused",
      detail: ready(process.env.OPENAI_API_KEY) ? "Sẵn sàng tạo bản nháp khi bạn yêu cầu." : "Đang tạm dừng; mẫu viết thủ công vẫn dùng được.",
      lastAt: null,
    },
    {
      id: "zalo", label: "Zalo doanh nghiệp", state: !zaloConfigured ? "paused" : ["failed", "pending_configuration"].includes(zaloLatest?.status) ? "action" : ["pending", "sending"].includes(zaloLatest?.status) ? "waiting" : zaloLatest ? "healthy" : "waiting",
      detail: !zaloConfigured ? "Đang tạm dừng theo quyết định hiện tại." : zaloLatest ? `Trạng thái gần nhất: ${zaloLatest.status}.` : "Đã cấu hình; chưa có lần gửi.",
      lastAt: zaloLatest?.updated_at || null,
    },
  ];

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services,
    summary: {
      healthy: services.filter((item) => item.state === "healthy").length,
      attention: services.filter((item) => item.state === "action").length,
      waiting: services.filter((item) => item.state === "waiting").length,
      paused: services.filter((item) => item.state === "paused").length,
    },
  });
}
