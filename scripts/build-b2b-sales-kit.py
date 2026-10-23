#!/usr/bin/env python3
"""Build the public, Vietnamese three-page B2B sales kit.

Usage: python3 scripts/build-b2b-sales-kit.py [--profile house|anh-long]
       [--font-dir /path/to/noto/fonts] [--output /path/to/output.pdf]

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
      import {EXPORT_SALES_PROFILES, EXPORT_DELIVERY_WINDOW, EXPORT_DEVELOPMENT_CONTACT} from './lib/export-sales-profiles.js';
      import {TAIWAN_EXPORT_COPY} from './lib/export-taiwan-copy.js';
      import {B2B_BULK_PACKING} from './lib/b2b-packing.js';
      import {PROFILE_LEGAL, PROFILE_REVISION} from './lib/company-profile.js';
      console.log(JSON.stringify({teas: EXPORT_TEAS, revision: EXPORT_PRICE_REVISION, contact: EVENT_CONTACT,
        profiles: EXPORT_SALES_PROFILES, delivery: EXPORT_DELIVERY_WINDOW, copy: TAIWAN_EXPORT_COPY.vi,
        packing: B2B_BULK_PACKING.vi, director: EXPORT_DEVELOPMENT_CONTACT, legal: PROFILE_LEGAL,
        edition: PROFILE_REVISION}));
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
    date.fromisoformat(data["edition"])
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
    def __init__(self, path, data, profile):
        self.data = data
        self.profile = profile
        self.contact = data["contact"]
        self.director = data["director"]
        self.revision = date.fromisoformat(data["revision"]).strftime("%d.%m.%Y")
        self.edition = date.fromisoformat(data["edition"]).strftime("%d.%m.%Y")
        self.url = self.contact["website"].rstrip("/") + "/export/taiwan"
        if self.profile["id"] != "house":
            self.url += "?profile=" + self.profile["id"]
        self.c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
        self.c.setTitle("Hoàng Long - Bộ chào hàng B2B" + (" - " + profile["label"] if profile["contact"] else ""))
        self.c.setAuthor("Nhà làm Trà Hoàng Long")
        self.c.setSubject("Bốn dòng trà, giá EXW VND/kg, quy trình và liên hệ. Bản " + self.edition)
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
        self.c.drawRightString(W - M, H - 35.6, f"B2B / {self.edition}")
        self.rule(H - 49)
        self.label(section, M, H - 66)
        self.rule(42)
        self.c.setFillColor(MUTED)
        self.c.setFont("Body", 6.8)
        self.c.drawString(M, 27, self.data["legal"]["name"] + " · MST " + self.data["legal"]["taxNumber"])
        self.c.drawRightString(W - M, 27, f"{self.page:02d} / 03")

    def cover(self):
        self.start("01 / SẢN PHẨM & ĐIỀU KIỆN CUNG ỨNG")
        self.para("Nguồn trà Việt.\nNền tảng cung ứng B2B.", M, 751, CW, 29, 37, "DisplayBold", JADE)
        self.para("Danh mục nguyên liệu cho nhà nhập khẩu, phân phối và thương hiệu trà.\nLựa chọn sản phẩm gắn với ứng dụng, yêu cầu kỹ thuật và kế hoạch mua.",
                  M, 659, CW, 10.4, 15.6, max_height=33)
        facts = [("NĂNG LỰC CÔNG BỐ", "50-100 tấn/tháng"),
                 ("THỜI GIAN GIAO HÀNG", clean(self.data["delivery"]["value"])),
                 ("ĐIỀU KIỆN GIÁ", "EXW · VND/kg")]
        cell = CW / 3
        for idx, (label, value) in enumerate(facts):
            x = M + idx * cell
            self.label(label, x, 609, MUTED, 7.2)
            self.para(value, x, 592, cell - 12, 14.1, 19, "DisplayBold", JADE, max_height=21)
        self.para(self.data["delivery"]["note"],
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
        self.para("Danh mục chào hàng EXW", M, 355, CW, 18, 25, "DisplayBold", JADE)
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
        self.para("Đã gồm bao " + self.data["packing"]["value"].removeprefix("Bao ") + ". EXW: " + FACTORY + ".",
                  M, 134, CW, 9.2, 14.3, "BodyBold", max_height=29)
        self.para(self.data["packing"]["note"] + " Giá VND/kg ngày " + self.revision + "; xác nhận theo báo giá. "
                  "Vận chuyển, thuế, thủ tục xuất/nhập khẩu, bao bì và nhãn riêng, kiểm nghiệm: chốt riêng trong báo giá.",
                  M, 97, CW, 8.3, 12.2, color=MUTED, max_height=37)
        self.c.showPage()

    def workflow(self):
        self.start("02 / LÀM VIỆC CÙNG HOÀNG LONG")
        self.para("Từ đề bài mua hàng\nđến lô hàng cụ thể.", M, 751, CW, 27.8, 36, "DisplayBold", JADE)
        self.para("Mỗi bước cần một kết quả rõ ràng: mẫu tham chiếu, quy cách đặt hàng,\nđiều kiện giao dịch và kế hoạch bàn giao của hai bên.",
                  M, 666, CW, 10.2, 15.5, max_height=33)
        for idx, step in enumerate(self.data["copy"]["process"]["steps"]):
            top = 607 - idx * 70
            self.label(f"0{idx + 1}", M, top, BRASS, 10)
            self.para(step["title"], M + 37, top + 1, CW - 37, 12, 17, "BodyBold", max_height=18)
            self.para(step["body"], M + 37, top - 25, CW - 37, 9.5, 14.4, max_height=32)
            self.rule(top - 63)
        self.image("landing/1.jpg", M, 296, 135, 176, crop=(0.5, 0.5))
        x = M + 154
        self.label("VÙNG TRÀ · NHÀ MÁY · KIỂM NGHIỆM", x, 296, BRASS, 7.8)
        self.para("Nguồn nguyên liệu.\nCơ sở kỹ thuật.", x, 275, CW - 154, 16, 23, "DisplayBold", JADE)
        self.para("Nguồn vùng cao và phương án chế biến được xem xét cùng phẩm cấp, ngoại hình, hương vị và hiệu quả sử dụng. Khảo sát nhà máy tại Tân Lập, Hà Giang theo lịch hẹn và phạm vi làm việc.",
                  x, 218, CW - 154, 9.1, 13.8, max_height=43)
        self.para("Yêu cầu thị trường đích làm cơ sở xác định chỉ tiêu kiểm nghiệm, phòng lab, chi phí, thời hạn và lô áp dụng. Hồ sơ kỹ thuật đi cùng mẫu và điều kiện nghiệm thu đã thống nhất.",
                  x, 161, CW - 154, 9.1, 13.8, max_height=43)
        self.para("Nguồn trà · Hà Giang", M, 111, 135, 7.4, 11, color=MUTED, max_height=14)
        self.para("Thời gian giao hàng " + clean(self.data["delivery"]["value"]) + ". " + self.data["delivery"]["note"] +
                  " Giá EXW chưa gồm cước vận chuyển; phương án và chi phí được chốt riêng.",
                  M, 96, CW, 8.1, 12.1, color=MUTED, max_height=37)
        self.c.showPage()

    def contact_page(self):
        self.start("03 / THÔNG TIN TRAO ĐỔI & LIÊN HỆ")
        self.para("Trao đổi đúng người.\nTriển khai đúng việc.", M, 751, CW, 28.5, 36, "DisplayBold", JADE)
        self.para("Sáu nội dung cho buổi làm việc với đối tác nhập khẩu, phân phối\nvà đơn vị kết nối thương mại; chưa chốt thì ghi nhu cầu dự kiến.",
                  M, 666, CW, 10.3, 15.5, max_height=33)
        briefs = [
            ("Đơn vị & người liên hệ", "Tên doanh nghiệp/quán, người trao đổi, điện thoại/email và kênh liên hệ phù hợp."),
            ("Dòng trà & ứng dụng", "Trà muốn thử, phẩm cấp nếu có; dùng pha đồ uống, phân phối hay đóng gói lại."),
            ("Khối lượng & lịch mua", "Lượng dự kiến mỗi đơn/tháng, ngày cần hàng; ghi bằng kg hoặc tấn."),
            ("Bao bì & nhãn", "Bao PP/PE 20 / 30 / 35 kg, điều chỉnh theo ngoại hình trà hoặc yêu cầu sử dụng; chốt nhãn riêng."),
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
        self.para("Đầu mối phát triển xuất khẩu.", left, 292, 298, 15.5, 22, "DisplayBold", PAPER, max_height=45)
        person = self.profile["contact"] or self.director
        self.para(person["name"] + " · " + person["phoneLabel"], left, 257, 294, 10.6, 16, "BodyBold", PAPER, max_height=18)
        self.c.linkURL("tel:" + person["phone"], (left, 241, left + 275, 258), relative=0, thickness=0)
        self.para(person["role"], left, 232, 294, 9, 13.5, color=HexColor("#D4DDD4"), max_height=29)
        house_phone = "Hoàng Long · " + self.contact["phoneLabel"]
        self.para(house_phone + " · Zalo", left, 208, 294, 10.2, 15, "BodyBold", PAPER, max_height=17)
        self.c.linkURL("tel:" + self.contact["phone"], (left, 192, left + 275, 210), relative=0, thickness=0)
        zalo_x = left + pdfmetrics.stringWidth(house_phone + " · ", "BodyBold", 10.2)
        self.c.linkURL(self.contact["zaloUrl"], (zalo_x, 192, zalo_x + 29, 210), relative=0, thickness=0)
        self.para(EMAIL, left, 184, 294, 9.2, 14, color=PAPER, max_height=16)
        self.c.linkURL("mailto:" + EMAIL, (left, 169, left + 275, 186), relative=0, thickness=0)
        self.para("Văn phòng giao dịch & kho: " + self.contact["address"], left, 158, 294, 8.1, 11.5, color=PAPER, max_height=24)
        qr_x = W - M - 111
        self.qr(qr_x, 212, 84)
        self.para("Quét để xem tỷ giá,\ngửi nhu cầu và hỏi mẫu.", qr_x - 7, 193, 106, 8.1, 12.1, color=PAPER, max_height=37)
        self.para("hoanglongtra.com/export/taiwan", left, 132 if self.profile["contact"] else 138, CW - 42, 8.3, 12.2, "BodyBold", PAPER)
        self.c.linkURL(self.url, (left, 119, W - M - 21, 140), relative=0, thickness=0)
        self.para("PDF là bản tham khảo ngày " + self.edition + ", gồm đầy đủ 4 dòng trà. Giá quy đổi trên website chỉ mang tính tham khảo; giá, quy cách, điều khoản thanh toán và lịch sẵn hàng có hiệu lực theo báo giá/PO/hợp đồng đã xác nhận.",
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
    parser.add_argument("--profile", default="house", help="Public presentation profile from lib/export-sales-profiles.js")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    register_fonts(args.font_dir)
    data = public_data()
    profile = next((item for item in data["profiles"] if item["id"] == args.profile), None)
    if not profile:
        parser.error("Unknown profile; select an owner-approved public sales profile")
    output = args.output or ROOT / "public" / profile["pdf"].lstrip("/")
    output.parent.mkdir(parents=True, exist_ok=True)
    SalesKit(output, data, profile).build()
    print(f"Built {output} (3 pages; profile {profile['id']}; edition {data['edition']}; price revision {data['revision']}; complete four-product range)")


if __name__ == "__main__":
    main()
