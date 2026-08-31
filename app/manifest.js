export default function manifest() {
  return {
    name: "Việc Hoàng Long",
    short_name: "Việc HL",
    description: "Phiếu việc dành cho nhân viên Nhà làm Trà Hoàng Long.",
    start_url: "/admin/work",
    scope: "/admin/",
    display: "standalone",
    background_color: "#F7F3EA",
    theme_color: "#1C2B24",
    lang: "vi",
    icons: [
      { src: "/work-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
    ],
  };
}
