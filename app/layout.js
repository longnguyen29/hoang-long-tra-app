import "./globals.css";

export const metadata = {
  title: "House of Hoàng Long — Trà Cổ Hà Giang",
  description:
    "Nhà làm Trà Hoàng Long — trà Shan Tuyết cổ thụ Hà Giang, chế biến bằng công nghệ Nhật Bản. Gia đình làm trà từ 1995.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
