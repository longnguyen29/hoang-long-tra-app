// Public photographs for the corporate/trade pack. Set src only after the
// owner has supplied an image and approved its public use. A null source is a
// visibly labelled space for a real photograph, never an assertion of proof.
export const COMPANY_MEDIA = Object.freeze({
  factorypanorama: {
    src: null,
    replacementPath: "public/company-media/factory-panorama.jpg",
    alt: { vi: "Toàn cảnh Nhà máy Trà Hoàng Long tại Tân Lập", en: "Panorama of Hoàng Long Tea Factory in Tân Lập" },
    caption: { vi: "Nhà máy · Tân Lập, Hà Giang", en: "Factory · Tân Lập, Hà Giang" },
    placeholderTitle: { vi: "Toàn cảnh nhà máy", en: "Factory panorama" },
    placeholderBody: { vi: "Không gian nhà máy, khu vực chế biến và chuẩn bị hàng tại Tân Lập, Hà Giang.", en: "Factory site, processing areas and goods preparation in Tân Lập, Hà Giang." },
  },
  process: {
    src: "/landing/3.jpg",
    replacementPath: "public/company-media/processing-line.jpg",
    alt: { vi: "Ảnh dây chuyền chế biến trong hồ sơ Hoàng Long", en: "Processing-line photographs from the Hoàng Long profile" },
    caption: { vi: "Chế biến · Ảnh trong hồ sơ Hoàng Long", en: "Processing · Photographs from the Hoàng Long profile" },
    placeholderTitle: { vi: "Công đoạn chế biến", en: "Processing operations" },
    placeholderBody: { vi: "Công đoạn và thiết bị liên quan đến dòng trà được giới thiệu.", en: "Operations and equipment relevant to the tea being presented." },
  },
  qc: {
    src: null,
    replacementPath: "public/company-media/product-quality.jpg",
    alt: { vi: "Đánh giá mẫu và chất lượng sản phẩm", en: "Sample evaluation and product quality review" },
    caption: { vi: "Sản phẩm & chất lượng", en: "Products & quality" },
    placeholderTitle: { vi: "Mẫu trà & kiểm tra chất lượng", en: "Tea samples & quality checks" },
    placeholderBody: { vi: "Mẫu trà tham chiếu, nhận diện lô và hoạt động đánh giá chất lượng sản phẩm.", en: "Reference tea samples, lot identification and product-quality evaluation." },
  },
  bulkload: {
    src: null,
    replacementPath: "public/company-media/bulk-packing-handover.jpg",
    alt: { vi: "Đóng bao và chuẩn bị giao nhận lô trà", en: "Bulk tea packing and handover preparation" },
    caption: { vi: "Đóng gói & giao nhận", en: "Packing & handover" },
    placeholderTitle: { vi: "Quy cách lô lớn & chuẩn bị hàng", en: "Bulk packing & goods preparation" },
    placeholderBody: { vi: "Bao PP/PE, quy cách đóng gói, nhãn lô và chuẩn bị hàng bàn giao theo đơn.", en: "PP/PE sacks, packing formats, lot labels and order-specific handover preparation." },
  },
});
