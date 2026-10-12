import Link from 'next/link';
export default function MissingTea() {
  return <main style={{ minHeight: '80vh', padding: 'var(--space-xl) var(--page-gutter)' }}><p>Hoàng Long</p><h1>Trà này chưa có trong danh mục hiện tại.</h1><p>Bạn có thể xem những loại trà đang có hoặc liên hệ Nhà để hỏi thêm.</p><Link href="/shop">Xem danh mục trà</Link></main>;
}
