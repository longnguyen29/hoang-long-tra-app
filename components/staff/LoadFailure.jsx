import { RefreshCw } from "lucide-react";
export default function LoadFailure({onRetry,loading,title="Chưa tải đủ dữ liệu"}) {
 return <main className="hl-admin-state" role="alert"><section><h1>{title}</h1><p>Không thể xác nhận số liệu và công việc lúc này. Kiểm tra kết nối rồi tải lại.</p><button onClick={onRetry} disabled={loading}><RefreshCw size={16}/>{loading ? "Đang tải…" : "Thử tải lại"}</button></section></main>;
}
