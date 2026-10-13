#!/usr/bin/env python3
"""Build the public, Vietnamese three-page B2B sales kit.

Usage: python3 scripts/build-b2b-sales-kit.py [--font-dir /path/to/noto/fonts]

Requires Node, ReportLab and Pillow. Uses the repository's export-teas.js prices,
public contact details and published photographs; no network or credentials.
The bundled PDF always contains the complete four-product range. A selected
web offer is saved separately with the browser's Print / Save PDF action.

Rebuild when the approved EXW prices or facts change; review all rendered pages
before publishing. Static PDF prices are dated, not live currency quotations.
"""
from __future__ import annotations

import argparse
from datetime import date
import html
import json
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/downloads/hoang-long-b2b-sales-kit-vi.pdf"
RUNTIME = Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies"
FONT_DIR = RUNTIME / "native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype"
W, H = A4
M = 44
CW = W - M * 2
PAPER = HexColor("#F7F3E9")
JADE = HexColor("#173D2E")
INK = HexColor("#243A2D")
MUTED = HexColor("#617066")
BRASS = HexColor("#9B7940")
LINE = HexColor("#D8D9CD")
PALE = HexColor("#EBEBDD")
WHITE = HexColor("#FFFFFF")
EMAIL = "hotro.trahoanglong@gmail.com"
FACTORY = "Nhà máy Trà Hoàng Long - Tân Lập, Hà Giang"


def public_data():
    node = shutil.which("node") or str(RUNTIME / "node/bin/node")
    code = """
      import {EXPORT_TEAS, EXPORT_PRICE_REVISION} from './lib/export-teas.js';
      import {EVENT_CONTACT} from './lib/event-contact.js';
      console.log(JSON.stringify({teas: EXPORT_TEAS, revision: EXPORT_PRICE_REVISION, contact: EVENT_CONTACT}));
    """
    result = subprocess.run([node, "--input-type=module", "-e", code], cwd=ROOT,
                            capture_output=True, check=True, text=True)
    data = json.loads(result.stdout)
    if len(data["teas"]) != 4:
        raise ValueError("The brochure layout expects four approved EXW products.")
    for tea in data["teas"]:
        if not tea["name"].get("vi") or not isinstance(tea["priceVndPerKg"], (int, float)) or tea["priceVndPerKg"] <= 0:
            raise ValueError("Each export product requires a Vietnamese name and positive VND/kg price.")
    date.fromisoformat(data["revision"])
    return data


def register_fonts(directory):
    for name, filename in {"Body": "NotoSans-Regular.ttf", "BodyBold": "NotoSans-Bold.ttf",
                           "Display": "NotoSerif-Regular.ttf", "DisplayBold": "NotoSerif-Bold.ttf"}.items():
        path = Path(directory) / filename
        if not path.is_file():
            raise FileNotFoundError(f"Missing Vietnamese-capable font {path}. Pass --font-dir with the four Noto font files.")
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily("Body", normal="Body", bold="BodyBold", italic="Body", boldItalic="BodyBold")


def clean(text):
    return str(text).replace("–", "-").replace("—", "-").replace("‑", "-")


class SalesKit:
    def __init__(self, path, data):
        self.data = data
        self.contact = data["contact"]
        self.revision = date.fromisoformat(data["revision"]).strftime("%d.%m.%Y")
        self.url = self.contact["website"].rstrip("/") + "/export/taiwan"
        self.c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
        self.c.setTitle("Hoàng Long - Bộ chào hàng B2B")
        self.c.setAuthor("Nhà làm Trà Hoàng Long")
        self.c.setSubject("Bốn dòng trà, giá EXW VND/kg, quy trình và liên hệ. Bản " + self.revision)
        self.c.setCreator("Hoàng Long B2B sales kit builder")
        self.page = 0

    def para(self, text, x, top, width, size=10, leading=None, font="Body", color=INK, max_height=None):
        paragraph = Paragraph(html.escape(clean(text)).replace("\n", "<br/>"),
            ParagraphStyle("text", fontName=font, fontSize=size, leading=leading or size * 1.48,
                           textColor=color, allowWidows=0, allowOrphans=0))
        _, height = paragraph.wrap(width, H)
        if max_height is not None and height > max_height + 0.1:
            raise ValueError(f"Page {self.page} overflow {height:.1f} > {max_height}: {text[:80]}")
        if top - height < 53:
            raise ValueError(f"Page {self.page} touches footer: {text[:80]}")
        paragraph.drawOn(self.c, x, top - height)
        return top - height

    def label(self, text, x, top, color=BRASS, size=8):
        self.c.setFillColor(color)
        self.c.setFont("BodyBold", size)
        self.c.drawString(x, top - size, clean(text))

    def rule(self, y, x=M, width=CW, color=LINE):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(0.7)
        self.c.line(x, y, x + width, y)

    def image(self, relative, x, top, width, height, crop=(0.5, 0.5)):
        path = ROOT / "public" / relative
        with Image.open(path) as photo:
            iw, ih = photo.size
        scale = max(width / iw, height / ih)
        sw, sh = iw * scale, ih * scale
        self.c.saveState()
        rect = self.c.beginPath()
        rect.rect(x, top - height, width, height)
        self.c.clipPath(rect, stroke=0)
        self.c.drawImage(str(path), x - (sw - width) * crop[0], top - height - (sh - height) * crop[1],
                         sw, sh, mask="auto")
        self.c.restoreState()

    def qr(self, x, y, size):
        widget = QrCodeWidget(self.url)
        bounds = widget.getBounds()
        scale = size / (bounds[2] - bounds[0])
        drawing = Drawing(size, size, transform=[scale, 0, 0, scale, 0, 0])
        drawing.add(widget)
        self.c.setFillColor(WHITE)
        self.c.rect(x - 5, y - 5, size + 10, size + 10, fill=1, stroke=0)
        renderPDF.draw(drawing, self.c, x, y)
        self.c.linkURL(self.url, (x - 5, y - 5, x + size + 5, y + size + 5), relative=0, thickness=0)

    def start(self, section):
        self.page += 1
        self.c.setFillColor(PAPER)
        self.c.rect(0, 0, W, H, fill=1, stroke=0)
        self.label("NHÀ LÀM TRÀ HOÀNG LONG", M, H - 27, JADE, 8.6)
        self.c.setFillColor(MUTED)
        self.c.setFont("Body", 7.5)
        self.c.drawRightString(W - M, H - 35.6, f"B2B / {self.revision}")
        self.rule(H - 49)
        self.label(section, M, H - 66)
        self.rule(42)
        self.c.setFillColor(MUTED)
        self.c.setFont("Body", 7.2)
        self.c.drawString(M, 27, "Bộ chào hàng B2B · Danh mục đầy đủ 4 dòng trà")
        self.c.drawRightString(W - M, 27, f"{self.page:02d} / 03")

    def cover(self):
        self.start("01 / SẢN PHẨM & ĐIỀU KIỆN CUNG ỨNG")
        self.para("Trà Việt cho\nhợp tác dài hạn.", M, 751, CW, 30.5, 38, "DisplayBold", JADE)
        self.para("Bộ thông tin để connector giới thiệu Hoàng Long, tìm hiểu nhu cầu\nkhách mua và phối hợp thử mẫu. Giao dịch được chốt với bên mua.",
                  M, 659, CW, 10.4, 15.6, max_height=33)
        facts = [("NĂNG LỰC CÔNG BỐ", "50-100 tấn/tháng"),
                 ("CHUẨN BỊ XUẤT HÀNG", "2-6 tuần"),
                 ("ĐIỀU KIỆN GIÁ", "EXW · VND/kg")]
        cell = CW / 3
        for idx, (label, value) in enumerate(facts):
            x = M + idx * cell
            self.label(label, x, 609, MUTED, 7.2)
            self.para(value, x, 592, cell - 12, 14.1, 19, "DisplayBold", JADE, max_height=21)
        self.para("Lịch sẵn hàng phụ thuộc khối lượng, quy cách và yêu cầu đã xác nhận cho từng đơn.",
                  M, 562, CW, 8.7, 13, color=MUTED, max_height=14)
        photo_gap = 12
        photo_w = (CW - photo_gap * 2) / 3
        photos = [
            ("export/hong-tra-shan-khoi.jpeg", "Ảnh danh mục\nHồng Trà Shan Khói", (0.5, 0.5)),
            ("export/luc-tra-hoa-ngoc-lan.jpeg", "Ảnh danh mục\nLục Trà Hoa Ngọc Lan", (0.5, 0.5)),
            ("landing/3.jpg", "Dây chuyền Hoàng Long\nẢnh nhà máy", (0.5, 0.93)),
        ]
        for idx, (path, caption, crop) in enumerate(photos):
            x = M + idx * (photo_w + photo_gap)
            self.image(path, x, 535, photo_w, 139, crop=crop)
            self.para(caption, x, 386, photo_w, 7.3, 10.1, color=MUTED, max_height=21)
        self.para("Bốn dòng trà để bắt đầu", M, 355, CW, 18, 25, "DisplayBold", JADE)
        self.para("Ảnh danh mục tham khảo; mẫu và lô chào hàng được xác nhận riêng.", M, 326, CW, 7.5, 11, color=MUTED, max_height=12)
        self.label("SẢN PHẨM", M, 304, MUTED, 7.8)
        self.c.setFont("BodyBold", 7.8)
        self.c.setFillColor(MUTED)
        self.c.drawRightString(W - M, 296.2, "GIÁ THAM KHẢO EXW / KG")
        self.rule(288)
        for idx, tea in enumerate(self.data["teas"]):
            top = 276 - idx * 35
            self.label(f"0{idx + 1}", M, top, BRASS, 8.6)
            self.para(tea["name"]["vi"], M + 29, top + 2, 321, 10.8, 15, "BodyBold", max_height=16)
            value = f'{tea["priceVndPerKg"]:,.0f}'.replace(",", ".") + "đ"
            self.c.setFont("DisplayBold", 14.7)
            self.c.setFillColor(JADE)
            self.c.drawRightString(W - M, top - 12, value)
            self.rule(top - 23)
        self.para("Đã gồm bao bì tiêu chuẩn. Nhận hàng tại " + FACTORY + ".",
                  M, 134, CW, 9.2, 14.3, "BodyBold", max_height=29)
        self.para("Giá VND/kg tại ngày " + self.revision + "; xác nhận lại trong báo giá chính thức. "
                  "Không gồm vận chuyển, thuế và thủ tục xuất/nhập khẩu. Bao bì riêng, nhãn, xét nghiệm và hỗ trợ khác: thỏa thuận theo báo giá.",
                  M, 97, CW, 8.3, 12.2, color=MUTED, max_height=37)
        self.c.showPage()

    def workflow(self):
        self.start("02 / QUY TRÌNH & VAI TRÒ BA BÊN")
        self.para("Ba bên rõ vai trò.\nCùng một lộ trình.", M, 751, CW, 28.5, 36, "DisplayBold", JADE)
        self.para("Connector là người kết nối, hỗ trợ trao đổi và theo dõi việc tiếp theo.\nHoàng Long cùng khách mua xác nhận giá, đơn hàng và thanh toán.",
                  M, 666, CW, 10.2, 15.5, max_height=33)
        gap = 18
        col_w = (CW - gap * 2) / 3
        cols = [M, M + col_w + gap, M + (col_w + gap) * 2]
        self.label("HOÀNG LONG · CUNG CẤP", cols[0], 613, MUTED, 7.5)
        self.label("CONNECTOR · KẾT NỐI", cols[1], 613, MUTED, 7.5)
        self.label("KHÁCH HÀNG · BÊN MUA", cols[2], 613, MUTED, 7.5)
        self.rule(597)
        steps = [
            ("Trao đổi nhu cầu", "Đề xuất trà, mẫu và thông tin cần làm rõ.",
             "Tổng hợp nhu cầu; chuyển liên hệ khi khách đồng ý.", "Gửi ứng dụng, lượng, thị trường và lịch cần hàng."),
            ("Mẫu & kiểm nghiệm", "Sắp xếp mẫu; xác nhận quy cách và khả năng cung cấp hồ sơ.",
             "Phối hợp gửi mẫu, thu phản hồi và hẹn trao đổi.", "Thử, duyệt mẫu; chốt chỉ tiêu kiểm nghiệm cần thiết."),
            ("Báo giá, PO & thanh toán", "Chốt bằng văn bản giá, bao bì, hồ sơ và lịch sẵn hàng.",
             "Chuyển yêu cầu và theo dõi; không tự cam kết giá.", "Duyệt báo giá, ký PO/hợp đồng và thanh toán theo thỏa thuận."),
            ("Khảo sát, chuẩn bị & QC", "Hẹn kiểm tra xưởng; chuẩn bị hàng, mã lô và QC đã chốt.",
             "Phối hợp lịch kiểm tra; cập nhật tiến độ hai bên.", "Chốt nội dung khảo sát, nhãn và tiêu chí nghiệm thu."),
            ("Bàn giao EXW", "Thông báo hàng sẵn tại nhà máy; chuẩn bị chứng từ đã chốt.",
             "Theo dõi lịch nhận; chuyển thông tin giữa hai bên.", "Tổ chức bốc hàng, vận tải và thủ tục xuất/nhập khẩu."),
            ("Phản hồi & đặt lại", "Xử lý vấn đề theo thỏa thuận; trao đổi nguồn cung tiếp.",
             "Thu phản hồi; theo dõi vấn đề và cuộc trao đổi tiếp.", "Xác nhận lượng nhận, chất lượng và kế hoạch mua tiếp."),
        ]
        for idx, (title, seller, connector, buyer) in enumerate(steps):
            top = 585 - idx * 60
            self.label(f"0{idx + 1}", M, top, BRASS, 9)
            self.para(title, M + 28, top + 1, CW - 28, 9.7, 14, "BodyBold", max_height=15)
            for x, text in zip(cols, [seller, connector, buyer]):
                self.para(text, x, top - 20, col_w, 8.55, 12.3, max_height=37)
            self.rule(top - 57)
        self.label("THĂM XƯỞNG & NGUỒN TRÀ", M, 207, BRASS, 7.8)
        right = M + CW / 2 + 12
        self.label("THỬ MẪU & KIỂM NGHIỆM", right, 207, BRASS, 7.8)
        half = CW / 2 - 12
        self.para("Xác nhận vùng nguyên liệu theo dòng trà và lô. Hẹn trước khi thăm nhà máy tại Tân Lập, Hà Giang; gửi nội dung khảo sát, số người và ngày mong muốn.",
                  M, 185, half, 9.1, 13.8, max_height=70)
        self.para("Chốt cảm quan, độ ẩm, dư lượng, vi sinh hoặc hồ sơ thị trường yêu cầu. Xác nhận chỉ tiêu, phòng lab, chi phí và thời gian trước khi làm; không mặc định đã có chứng nhận/kết quả.",
                  right, 185, half, 9.1, 13.8, max_height=70)
        self.para("Connector hỗ trợ kết nối; không thay bên mua ký đơn, trả tiền hoặc chịu vận tải nếu chưa có thỏa thuận riêng.",
                  M, 100, CW, 8.2, 12.1, color=MUTED, max_height=25)
        self.c.showPage()

    def contact_page(self):
        self.start("03 / THÔNG TIN TRAO ĐỔI & LIÊN HỆ")
        self.para("Chuẩn bị thông tin.\nBắt đầu bằng mẫu.", M, 751, CW, 28.5, 36, "DisplayBold", JADE)
        self.para("Connector thu thập sáu thông tin về bên mua để chọn mẫu và báo giá.\nBàn giao riêng người kết nối và liên hệ khách đã cho phép chia sẻ.",
                  M, 666, CW, 10.3, 15.5, max_height=33)
        briefs = [
            ("Khách mua & liên hệ", "Tên doanh nghiệp/quán của bên mua; người được phép trao đổi và liên hệ khách đồng ý chia sẻ."),
            ("Dòng trà & ứng dụng", "Trà muốn thử, phẩm cấp nếu có; dùng pha đồ uống, phân phối hay đóng gói lại."),
            ("Khối lượng & lịch mua", "Lượng dự kiến mỗi đơn/tháng, ngày cần hàng; ghi bằng kg hoặc tấn."),
            ("Bao bì & nhãn", "Chọn bao bì tiêu chuẩn hoặc yêu cầu riêng; quy cách, ngôn ngữ nhãn và thông tin lô."),
            ("Thị trường & nhận hàng", "Quốc gia/thị trường bán, đầu mối nhận; đơn vị tổ chức vận chuyển và thủ tục từ điểm EXW."),
            ("Mẫu, kiểm tra & hồ sơ", "Mẫu tham chiếu, tiêu chí cần thử, chứng từ yêu cầu và kế hoạch khảo sát nhà máy."),
        ]
        gap = 24
        card_w = (CW - gap) / 2
        for idx, (title, text) in enumerate(briefs):
            x = M + (idx % 2) * (card_w + gap)
            top = 613 - (idx // 2) * 89
            self.label(f"0{idx + 1}", x, top, BRASS, 8.7)
            self.para(title, x + 27, top + 1, card_w - 27, 10.1, 14.2, "BodyBold", max_height=29)
            self.para(text, x + 27, top - 30, card_w - 27, 9.1, 13.8, max_height=43)
            self.rule(top - 75, x, card_w)
        top = 331
        self.c.setFillColor(JADE)
        self.c.rect(M, 117, CW, top - 117, fill=1, stroke=0)
        left = M + 21
        self.label("TRAO ĐỔI TRỰC TIẾP VỚI HOÀNG LONG", left, 312, HexColor("#C7B481"), 7.8)
        self.para("Chọn trà. Hẹn thử mẫu.", left, 292, 310, 17.5, 24, "DisplayBold", PAPER)
        self.para(self.contact["phoneLabel"] + " · Điện thoại / Zalo", left, 257, 305, 10.6, 16, "BodyBold", PAPER)
        self.c.linkURL("tel:" + self.contact["phone"], (left, 241, left + 263, 258), relative=0, thickness=0)
        self.para(EMAIL, left, 232, 305, 9.5, 15, color=PAPER)
        self.c.linkURL("mailto:" + EMAIL, (left, 217, left + 275, 234), relative=0, thickness=0)
        self.para("Văn phòng / kho: " + self.contact["address"], left, 206, 294, 8.8, 13.1, color=PAPER, max_height=27)
        self.para("Đây không phải địa chỉ nhà máy. Vui lòng gọi trước nếu ghé trao đổi hoặc uống trà.",
                  left, 173, 294, 8.2, 12.2, color=HexColor("#D4DDD4"), max_height=26)
        qr_x = W - M - 111
        self.qr(qr_x, 212, 84)
        self.para("Quét để xem tỷ giá,\ngửi nhu cầu và hỏi mẫu.", qr_x - 7, 193, 106, 8.1, 12.1, color=PAPER, max_height=37)
        self.para("hoanglongtra.com/export/taiwan", left, 138, CW - 42, 8.3, 12.2, "BodyBold", PAPER)
        self.c.linkURL(self.url, (left, 122, W - M - 21, 140), relative=0, thickness=0)
        self.para("PDF là bản tham khảo ngày " + self.revision + ", gồm đầy đủ 4 dòng trà. Giá quy đổi trên website chỉ mang tính tham khảo; giá, quy cách, điều khoản thanh toán và lịch sẵn hàng có hiệu lực theo báo giá/PO/hợp đồng đã xác nhận.",
                  M, 97, CW, 8.3, 12.2, color=MUTED, max_height=37)
        self.c.showPage()

    def build(self):
        self.cover()
        self.workflow()
        self.contact_page()
        if self.page != 3:
            raise ValueError("Sales kit must contain exactly three pages.")
        self.c.save()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font-dir", default=os.environ.get("HOANG_LONG_PDF_FONT_DIR", str(FONT_DIR)))
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    register_fonts(args.font_dir)
    data = public_data()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    SalesKit(args.output, data).build()
    print(f"Built {args.output} (3 pages; revision {data['revision']}; complete four-product range)")


if __name__ == "__main__":
    main()
