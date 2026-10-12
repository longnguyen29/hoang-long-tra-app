"use client";
import Link from 'next/link';
export default function TeaError({ reset }) {
  return <main style={{ minHeight: '80vh', padding: 'var(--space-xl) var(--page-gutter)' }}><h1>Chưa tải được thông tin trà.</h1><p>Thử lại hoặc quay về danh mục để tiếp tục chọn trà.</p><button type="button" onClick={reset}>Thử lại</button> <Link href="/shop">Về danh mục</Link></main>;
}
