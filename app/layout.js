import "./globals.css";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import MetaPixel from "@/components/MetaPixel";

export const metadata = {
  title: "House of Hoàng Long — Trà Cổ Hà Giang",
  description:
    "Nhà làm Trà Hoàng Long — trà Shan Tuyết cổ thụ Hà Giang, chế biến bằng công nghệ Nhật Bản. Gia đình làm trà từ 1995.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Việc Hoàng Long",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        {/* Without this, iOS Safari auto-detects phone numbers/dates in plain text (contact
            fields, order IDs, tracking codes) and renders them as blue tappable links —
            inconsistent with desktop and with the app's own text color. */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Noto+Serif+SC:wght@600&display=swap"
        />
        <style>{`
          @font-face {
            font-family: "TMCOngDo";
            src: url("/fonts/TMC-Ong_Do.woff") format("woff"),
                 url("/fonts/TMC-Ong_Do.ttf") format("truetype");
            font-display: swap;
          }
        `}</style>
      </head>
      <body><LocaleProvider>{children}<MetaPixel /></LocaleProvider></body>
    </html>
  );
}
