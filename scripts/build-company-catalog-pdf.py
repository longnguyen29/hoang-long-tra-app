#!/usr/bin/env python3
"""Build the two public company-profile/catalogue PDFs from an exported payload.

Usage: python3 scripts/build-company-catalog-pdf.py --input /path/to/public-data.json
Uses ReportLab and local, published photographs. It never reads credentials,
fetches remote images, or queries stock. Run again when the public catalogue changes.
"""
from __future__ import annotations

import argparse
from datetime import date
import html
import json
import os
import math
from pathlib import Path
import re
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

from PIL import Image
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
W, H = A4
M = 46
CW = W - M * 2
GREEN = HexColor('#183D2A')
CREAM = HexColor('#F6F2E8')
INK = HexColor('#24372C')
MUTED = HexColor('#687265')
RULE = HexColor('#D7DBCF')
PALE = HexColor('#E9ECDD')
GOLD = HexColor('#A7864B')
WHITE = HexColor('#FFFFFF')
FONT_BASE = Path('/Users/longnguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')


def clean(value):
    return str(value or '').replace('–', '-').replace('—', '-').replace('‑', '-').strip()


def loc(value, locale, fallback=''):
    if isinstance(value, dict):
        return value.get(locale) or value.get('vi') or value.get('en') or fallback
    return value or fallback


def register_fonts(font_dir):
    fonts = {'Body': 'NotoSans-Regular.ttf', 'BodyBold': 'NotoSans-Bold.ttf',
             'Display': 'NotoSerif-Regular.ttf', 'DisplayBold': 'NotoSerif-Bold.ttf'}
    for name, filename in fonts.items():
        path = Path(font_dir) / filename
        if not path.exists():
            raise FileNotFoundError(f'Missing font {path}; pass --font-dir with Vietnamese-capable Noto fonts')
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold', italic='Body', boldItalic='BodyBold')
    pdfmetrics.registerFontFamily('Display', normal='Display', bold='DisplayBold', italic='Display', boldItalic='DisplayBold')


COPY = {
    'vi': {
        'brand': 'NHÀ LÀM TRÀ HOÀNG LONG', 'cover': 'Hồ sơ doanh nghiệp\nvà danh mục trà',
        'cover_sub': 'Năng lực chế biến trà Việt và cơ sở làm việc cùng đối tác thương mại, đơn vị xúc tiến và nhà phân phối.',
        'edition': 'Bản phát hành 11.10.2026', 'catalog': 'Xem danh mục trực tuyến', 'quote': 'Yêu cầu báo giá',
        'profile_label': '01 / NHÀ LÀM TRÀ', 'profile_title': 'Từ vùng trà đến đối tác',
        'guide_label': '08 / CẤU TRÚC DANH MỤC', 'guide_title': 'Một danh mục, nhiều nhu cầu',
        'guide_intro': 'Bắt đầu từ cách dùng trà của bạn. Chọn nhóm phù hợp, pha thử trong điều kiện thực tế và xác nhận quy cách với Hoàng Long.',
        'catalog_label': '09 / DANH MỤC TRÀ', 'catalog_title': 'Danh mục sản phẩm',
        'catalog_intro': 'Tên và thông tin dưới đây theo danh mục công khai ở thời điểm phát hành.',
        'pack': 'Quy cách niêm yết', 'brew': 'Hướng dẫn pha niêm yết', 'flavor': 'Hương vị niêm yết',
        'notes': 'Ghi chú sản phẩm', 'unknown_pack': 'Liên hệ xác nhận quy cách',
        'unknown_brew': 'Liên hệ để được hướng dẫn pha', 'catalog_cta': 'Mở trang trà hoặc yêu cầu báo giá để xác nhận quy cách và lô hàng.',
        'buy_label': '10 / ĐẦU MỐI HỢP TÁC', 'buy_title': 'Từ trao đổi ban đầu\nđến kế hoạch cung ứng',
        'buy_intro': 'Gửi sản phẩm quan tâm, cách dùng và lượng dự kiến. Hoàng Long sẽ trao đổi về mẫu thử, quy cách và báo giá phù hợp với yêu cầu cụ thể.',
        'steps': [
            ('Chọn trà và mục đích sử dụng', 'Ghi rõ loại đồ uống, kênh bán hoặc nhu cầu phục vụ mà bạn đang chuẩn bị.'),
            ('Đề nghị mẫu để pha thử', 'Thử trà theo công thức, nguồn nước và thiết bị bạn sẽ sử dụng.'),
            ('Xác nhận báo giá và đơn hàng', 'Thống nhất quy cách, khối lượng, thời gian giao và các yêu cầu của đơn hàng trước khi đặt.')
        ],
        'ask_title': 'Thông tin hữu ích khi hỏi hàng',
        'ask': 'Tên trà • Khối lượng dự kiến • Quy cách mong muốn • Địa điểm nhận hàng • Thời điểm cần hàng',
        'contact': 'Liên hệ', 'office': 'Văn phòng / kho', 'not_factory': 'Địa chỉ văn phòng và kho, không phải địa chỉ nhà máy.',
        'scan': 'Quét để mở hồ sơ\nvà tải bản mới nhất', 'phone': 'Gọi điện', 'zalo': 'Nhắn Zalo',
        'edition_note': 'Tài liệu tham khảo theo danh mục công khai ngày 11.10.2026. Quy cách, giá, số lượng sẵn có và thời gian giao cần được xác nhận cho từng yêu cầu.',
        'footer': 'Hồ sơ doanh nghiệp & danh mục trà',
        'photo_tree': 'Cây trà Shan cổ thụ tại Hà Giang - hình ảnh Hoàng Long đang công bố.',
        'photo_process': 'Hình ảnh dây chuyền chế biến đang được Hoàng Long công bố.',
        'guide_groups': [
            ('Lục trà và trà ướp hoa', 'Chọn giữa trà Shan mộc và các sản phẩm mang tên hoa lài, hoa ngọc lan, hoa sen. Với trà dùng cho quán, pha thử trực tiếp theo công thức dự kiến.'),
            ('Hồng trà Shan', 'Danh mục có Shan Khói, Shan Mật và Shan Tuyển. So sánh các mẫu trước khi chọn nền trà cho đồ uống hoặc trà uống nóng.'),
            ('Bạch trà và trà sen', 'Bạch Mẫu Đơn và Trà Gạo Sen 3 Lần, 7 Lần thuộc dòng Reserve. Xác nhận quy cách nếu danh mục chưa niêm yết.'),
            ('Oolong và Phổ Nhĩ', 'Danh mục có Oolong Kim Tuyên, Phổ Nhĩ Bánh và Phổ Nhĩ Viên. Hỏi thêm quy cách cùng hướng dẫn pha trước khi đặt.')
        ],
        'guide_note_title': 'Pha thử trước khi đưa vào menu',
        'guide_note': 'Hướng dẫn pha trong danh mục là điểm bắt đầu. Hãy điều chỉnh lượng trà, nước, thời gian hãm và công thức theo kết quả mẫu thử của bạn.',
        'line_everyday': 'Everyday', 'line_reserve': 'Reserve',
    },
    'en': {
        'brand': 'HOUSE OF HOÀNG LONG', 'cover': 'Company profile\nand tea catalogue',
        'cover_sub': 'Vietnamese tea processing capability and a working brief for trade partners, trade-promotion organisations and distributors.',
        'edition': 'Edition 11 October 2026', 'catalog': 'View the online catalogue', 'quote': 'Request a quote',
        'profile_label': '01 / THE TEA HOUSE', 'profile_title': 'From tea region to trade partner',
        'guide_label': '08 / RANGE STRUCTURE', 'guide_title': 'A range for different needs',
        'guide_intro': 'Start with how you plan to use the tea. Choose a relevant group, test it in your working conditions and confirm the pack specification with Hoàng Long.',
        'catalog_label': '09 / TEA CATALOGUE', 'catalog_title': 'Product catalogue',
        'catalog_intro': 'Names and details below reflect the public catalogue at the date of this edition.',
        'pack': 'Listed pack format', 'brew': 'Listed brewing guide', 'flavor': 'Listed flavour',
        'notes': 'Product note', 'unknown_pack': 'Contact to confirm pack format',
        'unknown_brew': 'Contact for brewing guidance', 'catalog_cta': 'Open a tea page or request a quote to confirm the pack specification and batch.',
        'buy_label': '10 / COOPERATION CONTACT', 'buy_title': 'From first discussion\nto a supply programme',
        'buy_intro': 'Share the teas you are considering, their intended use and your planned volume. Hoàng Long can discuss samples, pack formats and a quote for your specific enquiry.',
        'steps': [
            ('Choose the tea and intended use', 'Describe your drinks, sales channel or serving requirements.'),
            ('Ask about samples for testing', 'Test the tea with the recipe, water and equipment you plan to use.'),
            ('Confirm the quote and order details', 'Agree on pack format, volume, delivery timing and any order requirements before placing an order.')
        ],
        'ask_title': 'Useful details for your enquiry',
        'ask': 'Tea name • Planned volume • Preferred pack format • Delivery location • Required date',
        'contact': 'Contact', 'office': 'Office / warehouse', 'not_factory': 'This is the office and warehouse address, not the factory address.',
        'scan': 'Scan for the profile\nand latest PDF edition', 'phone': 'Call', 'zalo': 'Message on Zalo',
        'edition_note': 'Reference edition based on the public catalogue on 11 October 2026. Pack specifications, price, available quantity and delivery timing must be confirmed for each enquiry.',
        'footer': 'Company profile & tea catalogue',
        'photo_tree': 'Ancient Shan tea tree in Hà Giang - image currently published by Hoàng Long.',
        'photo_process': 'Processing-line image currently published by Hoàng Long.',
        'guide_groups': [
            ('Green tea and flower-scented tea', 'Choose between plain Shan green tea and products named for jasmine, orchid or lotus. For café use, test the tea in the recipe you plan to serve.'),
            ('Shan black tea', 'The range includes Shan Khói, Shan Mật and Shan Tuyển. Compare samples before selecting tea for drinks or hot tea service.'),
            ('White tea and lotus tea', 'White Peony and Three-Times / Seven-Times Lotus-Scented Rice Tea are in the Reserve range. Confirm the pack format where none is listed.'),
            ('Oolong and Pu-erh', 'The catalogue includes Kim Tuyên Oolong, Pu-erh Cake and Pu-erh Mini Portions. Ask about pack formats and brewing guidance before ordering.')
        ],
        'guide_note_title': 'Test before adding tea to your menu',
        'guide_note': 'The listed brewing guide is a starting point. Adjust tea dose, water, steeping time and recipe based on your own sample results.',
        'line_everyday': 'Everyday', 'line_reserve': 'Reserve',
    }
}


class Document:
    def __init__(self, output, data, locale):
        self.locale = locale
        self.t = dict(COPY[locale])
        revision = date.fromisoformat(data['revision'])
        if locale == 'vi':
            edition_date = revision.strftime('%d.%m.%Y')
            self.t['edition'] = 'Bản phát hành ' + edition_date
            self.t['edition_note'] = self.t['edition_note'].replace('11.10.2026', edition_date)
        else:
            months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            edition_date = f'{revision.day} {months[revision.month - 1]} {revision.year}'
            self.t['edition'] = 'Edition ' + edition_date
            self.t['edition_note'] = self.t['edition_note'].replace('11 October 2026', edition_date)
        self.data = data
        self.profile = loc(data.get('profiles') or data.get('companyProfile') or data.get('profile'), locale, {})
        packing = self.profile.get('packing') if isinstance(self.profile, dict) else None
        if not packing or not packing.get('value') or not packing.get('note'):
            raise ValueError('The public company-profile payload must include approved B2B packing facts')
        self.t['guide_note_title'] = packing['title']
        self.t['guide_note'] = packing['value'] + '. ' + packing['note']
        self.t['catalog_intro'] += (' Quy cách xuất khẩu/lô lớn xem mục Cấu trúc danh mục; khác quy cách sản phẩm niêm yết.' if locale == 'vi'
                                     else ' See Range structure for export / large-bulk packing, separate from listed product packs.')
        self.contact = data.get('contact') or {}
        imagery = self.profile.get('images') or {}
        self.t['photo_tree'] = imagery.get('origin') or self.t['photo_tree']
        self.t['photo_process'] = imagery.get('production') or self.t['photo_process']
        self.director = data.get('director') or {}
        self.legal = data.get('legal') or {}
        self.products = data['products']
        self.base_url = clean(data.get('baseUrl') or self.contact.get('website')).rstrip('/')
        if not self.base_url.startswith('https://'):
            raise ValueError('Payload must include a public HTTPS website URL')
        self.company_url = self.url('/company')
        self.catalog_url = self.url('/catalog')
        self.quote_url = self.url('/wholesale?intent=quote#trade-brief')
        self.c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
        self.c.setTitle(self.t['cover'].replace('\n', ' ') + ' - Hoàng Long')
        self.c.setAuthor('House of Hoàng Long')
        self.c.setSubject(self.t['edition'])
        self.c.setCreator('Hoàng Long public catalogue PDF builder')
        self.page_no = 0
        self.count = 10 + math.ceil(len(self.products) / 5)

    def url(self, path):
        uri = path if path.startswith(('https://', 'http://', 'tel:', 'mailto:')) else self.base_url + path
        if self.locale == 'en' and uri.startswith(self.base_url):
            parts = urlsplit(uri)
            query = dict(parse_qsl(parts.query))
            query['lang'] = 'en'
            uri = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
        return uri

    def para(self, text, x, top, width, size=10.3, leading=None, font='Body', color=INK, max_height=None):
        if not text:
            return top
        style = ParagraphStyle('x', fontName=font, fontSize=size, leading=leading or size * 1.5,
                               textColor=color, spaceAfter=0, allowWidows=0, allowOrphans=0)
        value = html.escape(clean(text)).replace('\n', '<br/>')
        paragraph = Paragraph(value, style)
        _, height = paragraph.wrap(width, H)
        if max_height is not None and height > max_height + .1:
            raise ValueError(f'Page {self.page_no} text overflow {height:.1f}>{max_height}: {text[:70]}')
        if top - height < 48:
            raise ValueError(f'Page {self.page_no} reaches footer: {text[:70]}')
        paragraph.drawOn(self.c, x, top - height)
        return top - height

    def section_heading(self, section, p):
        self.start(section)
        top = self.para(p['title'], M, 735, CW, 27, 35, 'Display', GREEN, 106)
        return self.para(p.get('body') or '', M, top - 20, CW, 10.5, 16.3, max_height=100) - 28

    def editorial_rows(self, items, top, body_key='body', output_key=None, body_size=10.1):
        """Measured editorial rows; never shrink copy to hide an overflow."""
        for index, item in enumerate(items):
            self.label(f'{index + 1:02d}', M, top - 1, color=GOLD, size=10)
            x, width = M + 36, CW - 36
            bottom = self.para(item['title'], x, top + 1, width, 13, 18.5,
                               'DisplayBold', GREEN, 58)
            bottom = self.para(item.get(body_key) or '', x, bottom - 9, width,
                               body_size, body_size * 1.52, max_height=114)
            if output_key and item.get(output_key):
                label = 'Kết quả làm việc' if self.locale == 'vi' else 'Working output'
                bottom = self.para(label.upper(), x, bottom - 12, width, 7.1, 10.5,
                                   'BodyBold', MUTED, 12)
                bottom = self.para(re.sub(r'^(?:Đầu ra|Output):\s*', '', item[output_key]), x, bottom - 5, width, 9.1, 13.8,
                                   'BodyBold', GREEN, 58)
            self.rule(bottom - 17, x, width)
            top = bottom - 36
        return top

    def portfolio_page(self):
        p = self.profile.get('portfolio') or {}
        if not p.get('segments'):
            raise ValueError('Approved product-market portfolio is required')
        top = self.section_heading('02 / SẢN PHẨM & THỊ TRƯỜNG' if self.locale == 'vi'
                                   else '02 / PRODUCTS & MARKETS', p)
        labels = ('Đối tác', 'Dòng trà', 'Cách triển khai') if self.locale == 'vi' else ('Partners', 'Tea range', 'Programme approach')
        for index, item in enumerate(p['segments']):
            self.label(f'{index + 1:02d}', M, top - 1, color=GOLD, size=10)
            x, width = M + 36, CW - 36
            bottom = self.para(item['title'], x, top + 1, width, 13.2, 18.5, 'DisplayBold', GREEN, 58)
            for label, key in zip(labels, ('buyer', 'products', 'approach')):
                bottom = self.para(label.upper(), x, bottom - 11, 90, 7.2, 10.5, 'BodyBold', MUTED, 24)
                line_top = bottom + 10.5
                body_bottom = self.para(item[key], x + 97, line_top, width - 97, 9.5, 14.4, max_height=100)
                bottom = min(bottom, body_bottom)
            self.rule(bottom - 18, x, width)
            top = bottom - 37
        self.end()

    def operating_page(self):
        p = self.profile.get('operatingModel') or {}
        if not p.get('links'):
            raise ValueError('Approved operating model is required')
        top = self.section_heading('03 / TỔ CHỨC CHUỖI CUNG ỨNG' if self.locale == 'vi'
                                   else '03 / SUPPLY-CHAIN ORGANISATION', p)
        self.editorial_rows(p['links'], top, output_key='output', body_size=9.8)
        self.end()

    def technical_page(self):
        p = self.profile.get('technical') or {}
        if not p.get('checks'):
            raise ValueError('Approved technical procurement brief is required')
        top = self.section_heading('04 / NỀN TẢNG KỸ THUẬT' if self.locale == 'vi'
                                   else '04 / TECHNICAL PROCUREMENT BASIS', p)
        self.editorial_rows(p['checks'], top, body_size=10.1)
        self.end()

    def direction_page(self):
        p = self.profile.get('direction') or {}
        if not p.get('priorities'):
            raise ValueError('Approved long-term development direction is required')
        top = self.section_heading('06 / ĐỊNH HƯỚNG PHÁT TRIỂN' if self.locale == 'vi'
                                   else '06 / DEVELOPMENT DIRECTION', p)
        top = self.editorial_rows(p['priorities'], top)
        # The origin is tangible context for the development agenda, not an award or claim of estate ownership.
        origins = self.profile.get('origins') or {}
        if top > 230 and origins.get('body'):
            self.image('landing/1.jpg', M, top - 5, 144, 159, (.5, .38))
            x = M + 163
            bottom = self.para(origins['title'], x, top - 5, CW - 163, 12, 18, 'DisplayBold', GREEN, 58)
            self.para(origins['body'], x, bottom - 10, CW - 163, 9.4, 14.3, max_height=134)
        self.end()

    def label(self, text, x, top, color=GREEN, size=8):
        self.c.setFont('BodyBold', size)
        self.c.setFillColor(color)
        self.c.drawString(x, top - size, clean(text))

    def rule(self, top, x=M, width=CW):
        self.c.setStrokeColor(RULE)
        self.c.setLineWidth(.65)
        self.c.line(x, top, x + width, top)

    def link(self, label, x, top, width, uri, dark=True, size=9.4):
        height = 33
        self.c.setFillColor(GREEN if dark else CREAM)
        self.c.setStrokeColor(GREEN)
        self.c.setLineWidth(.8)
        self.c.roundRect(x, top - height, width, height, 3, stroke=int(not dark), fill=1)
        self.c.setFillColor(CREAM if dark else GREEN)
        self.c.setFont('BodyBold', size)
        self.c.drawCentredString(x + width / 2, top - 21, clean(label))
        self.c.linkURL(uri, (x, top - height, x + width, top), relative=0, thickness=0)
        return top - height

    def image(self, filename, x, top, width, height, crop=(.5, .5)):
        path = ROOT / 'public' / filename
        im = Image.open(path)
        iw, ih = im.size
        scale = max(width / iw, height / ih)
        sw, sh = iw * scale, ih * scale
        self.c.saveState()
        p = self.c.beginPath()
        p.rect(x, top - height, width, height)
        self.c.clipPath(p, stroke=0)
        self.c.drawImage(str(path), x - (sw - width) * crop[0], top - height - (sh - height) * crop[1],
                         sw, sh, mask='auto')
        self.c.restoreState()

    def start(self, section=None):
        self.page_no += 1
        self.c.setFillColor(CREAM)
        self.c.rect(0, 0, W, H, fill=1, stroke=0)
        self.label(self.t['brand'], M, H - 27, size=7.6)
        self.label(self.t['edition'], W - M - 163, H - 27, color=MUTED, size=7.2)
        self.rule(H - 49)
        if section:
            self.label(section, M, H - 69, size=8)

    def end(self):
        self.rule(39)
        self.c.setFont('Body', 6.8)
        self.c.setFillColor(MUTED)
        footer = self.t['footer']
        if self.legal.get('name') and self.legal.get('taxNumber'):
            footer = self.legal['name'] + (' · MST ' if self.locale == 'vi' else ' · Tax ID ') + self.legal['taxNumber']
        self.c.drawString(M, 25, footer)
        self.c.drawRightString(W - M, 25, f'{self.page_no:02d} / {self.count:02d}')
        self.c.linkURL(self.company_url, (M, 20, W - M - 35, 34), relative=0, thickness=0)
        self.c.showPage()

    def cover(self):
        self.start()
        self.label('HÀ GIANG / VIỆT NAM', M, 765, color=GOLD, size=8.8)
        p = self.profile
        title = p.get('title') or self.t['cover']
        bottom = self.para(title, M, 733, CW, 29, 38, 'Display', GREEN, 117)
        bottom = self.para(p.get('intro') or self.t['cover_sub'], M, bottom - 20,
                           CW, 10.5, 16.2, max_height=98)
        image_top = bottom - 26
        self.image('landing/1.jpg', M, image_top, CW, image_top - 219, (.5, .35))
        self.para(self.t['photo_tree'], M, 208, CW, 7.4, 11, color=MUTED, max_height=23)
        self.link(self.t['catalog'], M, 163, 246, self.catalog_url)
        self.link(self.t['quote'], M + 259, 163, CW - 259, self.quote_url, dark=False)
        self.para(self.t['edition_note'], M, 108, CW, 8.4, 12.5, color=MUTED, max_height=48)
        self.end()

    def profile_page(self):
        self.start(self.t['profile_label'])
        p = self.profile
        overview = p.get('overview') or {}
        title = overview.get('title') or self.t['profile_title']
        bottom = self.para(title, M, 735, CW, 26, 34, 'Display', GREEN, 106)
        bottom = self.para(overview.get('body') or p.get('intro'), M, bottom - 19,
                           CW, 10.2, 15.6, max_height=100)
        facts = overview.get('facts') or []
        gap, cardw = 23, (CW - 23) / 2
        top = bottom - 26
        for row in range(math.ceil(len(facts[:4]) / 2)):
            row_bottom = top
            for index, item in enumerate(facts[row * 2:row * 2 + 2]):
                x = M + index * (cardw + gap)
                self.label(item.get('label', '').upper(), x, top, color=MUTED, size=7.4)
                value_bottom = self.para(item.get('value'), x, top - 20, cardw,
                                         14.1, 20, 'DisplayBold', GREEN, 43)
                note_bottom = self.para(item.get('note'), x, value_bottom - 9, cardw,
                                        8.1, 12.3, color=MUTED, max_height=63)
                row_bottom = min(row_bottom, note_bottom)
            top = row_bottom - 24
        self.rule(top + 4)
        origins = p.get('origins') or {}
        top -= 15
        self.image('landing/3.jpg', M, top, 164, 154)
        self.para(self.t['photo_process'], M, top - 164, 164, 7.3, 11,
                  color=MUTED, max_height=35)
        x, width = M + 186, CW - 186
        if origins.get('entries'):
            for item in origins['entries']:
                top = self.para(item['title'], x, top, width, 10.1, 14.5,
                                 'BodyBold', GREEN, 30) - 6
                top = self.para(item['body'], x, top, width, 8.8, 13.2, max_height=81) - 16
        else:
            top = self.para(origins.get('title'), x, top, width, 11.2, 16,
                             'BodyBold', GREEN, 48) - 9
            self.para(origins.get('body'), x, top, width, 9.4, 14, max_height=145)
        self.end()

    def guide_page(self):
        self.start(self.t['guide_label'])
        self.para(self.t['guide_title'], M, 732, CW, 27, 35, 'Display', GREEN, 76)
        self.para(self.t['guide_intro'], M, 650, CW, 10.3, 16, max_height=50)
        active = {self.product_fact(p).get('groupId') for p in self.products}
        groups = [g for g in self.data.get('groups', []) if g['id'] in active]
        if not groups or len(groups) > 8:
            raise ValueError('The guide layout supports one to eight active tea groups')
        cardw = (CW - 17) / 2
        row_pitch = 432 / math.ceil(len(groups) / 2)
        card_height = row_pitch - 15
        for index, group in enumerate(groups):
            x = M + (index % 2) * (cardw + 17)
            top = 573 - (index // 2) * row_pitch
            self.c.setFillColor(PALE)
            self.c.roundRect(x, top - card_height, cardw, card_height, 3, fill=1, stroke=0)
            title = loc(group['label'], self.locale)
            body = loc(group['guidance'], self.locale)
            self.para(title, x + 14, top - 15, cardw - 28, 12, 17, 'BodyBold', GREEN, 24)
            self.para(body, x + 14, top - 43, cardw - 28, 9.1 if len(groups) <= 6 else 8.6, 14 if len(groups) <= 6 else 12.2, max_height=card_height - 49)
        self.label(self.t['guide_note_title'].upper(), M, 118)
        self.para(self.t['guide_note'], M, 96, CW, 9.1, 14, max_height=45)
        self.end()

    def cooperation_page(self):
        p = self.profile.get('cooperation') or {}
        if not p.get('title') or not p.get('tracks') or not p.get('brief'):
            raise ValueError('Approved institutional cooperation and meeting brief are required')
        self.start('05 / CHƯƠNG TRÌNH HỢP TÁC' if self.locale == 'vi' else '05 / COOPERATION AGENDA')
        bottom = self.para(p['title'], M, 732, CW, 26, 34, 'Display', GREEN, 75)
        bottom = self.para(p['body'], M, bottom - 20, CW, 10.2, 15.5, max_height=64)
        top = bottom - 25
        for index, track in enumerate(p['tracks']):
            self.label(f'0{index + 1}', M, top, color=GOLD, size=10)
            bottom = self.para(track['title'], M + 36, top + 2, CW - 36, 11.8, 17, 'BodyBold', GREEN, 35)
            bottom = self.para(track['body'], M + 36, bottom - 7, CW - 36, 9.5, 14.3, max_height=58)
            self.rule(bottom - 13, M + 36, CW - 36)
            top = bottom - 30
        title = 'Nội dung chuẩn bị cho buổi làm việc' if self.locale == 'vi' else 'Brief for the first working meeting'
        top -= 2
        top = self.para(title, M, top, CW, 13.4, 19, 'DisplayBold', GREEN, 42) - 12
        for index, item in enumerate(p['brief']):
            bottom = self.para(f'{index + 1:02d}', M, top, 24, 8.2, 12.5, 'BodyBold', GOLD)
            bottom = self.para(item, M + 28, top, CW - 28, 9.1, 13.5, max_height=43)
            top = bottom - 9
        self.end()

    def evidence_page(self):
        p = self.profile.get('evidence') or {}
        if not p.get('title') or not p.get('items'):
            raise ValueError('Approved evidence / due-diligence brief is required')
        self.start('07 / HỒ SƠ & THẨM ĐỊNH' if self.locale == 'vi' else '07 / EVIDENCE & DUE DILIGENCE')
        bottom = self.para(p['title'], M, 732, CW, 26, 34, 'Display', GREEN, 75)
        bottom = self.para(p['body'], M, bottom - 19, CW, 10.2, 15.5, max_height=65)
        top = bottom - 30
        for index, item in enumerate(p['items']):
            self.label(f'0{index + 1}', M, top, color=GOLD, size=10)
            bottom = self.para(item['title'], M + 36, top + 1, CW - 36, 11.4, 16.3, 'BodyBold', GREEN, 34)
            bottom = self.para(item['body'], M + 36, bottom - 7, CW - 36, 9.5, 14.3, max_height=58)
            self.rule(bottom - 14, M + 36, CW - 36)
            top = bottom - 33
        packing = self.profile['packing']
        self.label(packing['title'].upper(), M, top, size=8)
        self.para(packing['value'] + '. ' + packing['note'], M, top - 21, CW, 9.2, 14, max_height=60)
        self.end()

    def product_fact(self, product):
        if self.locale in product:
            return product[self.locale]
        facts = product.get('facts') or product.get('tradeFacts') or {}
        return loc(facts, self.locale, {}) if isinstance(facts, dict) and self.locale in facts else facts

    def product_name(self, product, facts):
        return clean(facts.get('name') or loc(product.get('name'), self.locale))

    def product_link(self, product, facts):
        return self.url(facts.get('href') or product.get('href') or '/catalog#' + product['id'])

    def catalog_page(self, products, start_number):
        self.start(self.t['catalog_label'])
        self.para(self.t['catalog_title'], M, 732, CW, 27, 35, 'Display', GREEN, 43)
        self.para(self.t['catalog_intro'], M, 677, CW, 9.4, 14, max_height=31)
        top = 625
        # Five rows per page preserve space for real notes without tiny typography.
        for offset, product in enumerate(products):
            f = self.product_fact(product) or {}
            name = self.product_name(product, f)
            line = f.get('groupLabel') or ''
            self.label(f'{start_number + offset:02d}', M, top, color=GOLD, size=9)
            nbot = self.para(name, M + 35, top + 2, CW - 118, 12, 17, 'DisplayBold', GREEN, 38)
            self.label(line.upper(), W - M - 80, top, color=MUTED, size=7)
            self.c.linkURL(self.product_link(product, f), (M + 30, nbot - 3, W - M, top + 6), relative=0, thickness=0)
            # Keep product labels identical to the public data; blanks are clearly marked.
            pack = f.get('packing') or f.get('packSize') or f.get('pack_size') or clean(product.get('pack_size')) or self.t['unknown_pack']
            brew = f.get('brew') or f.get('brewing') or loc(product.get('brew'), self.locale) or self.t['unknown_brew']
            body_top = top - 41
            half = (CW - 35 - 18) / 2
            self.label(self.t['pack'], M + 35, body_top, color=MUTED, size=7.2)
            self.para(pack, M + 35, body_top - 15, half, 9.2, 13.5, max_height=29)
            bx = M + 35 + half + 18
            self.label(self.t['brew'], bx, body_top, color=MUTED, size=7.2)
            self.para(brew, bx, body_top - 15, half, 9.2, 13.5, max_height=29)
            flavors = f.get('flavors') or loc(product.get('flavors'), self.locale, [])
            if isinstance(flavors, list):
                flavors = ', '.join(flavors)
            note = clean(f.get('note') or f.get('notes') or loc(product.get('notes'), self.locale))
            detail = (self.t['flavor'] + ': ' + clean(flavors)) if flavors else note
            if detail:
                self.para(detail, M + 35, body_top - 49, CW - 35, 8.5, 12.5, color=MUTED, max_height=27)
            self.rule(top - 105, M + 35, CW - 35)
            top -= 116
        if len(products) < 5:
            self.para(self.t['catalog_cta'], M, 112, CW, 8.5, 12.5, color=MUTED, max_height=32)
        self.end()

    def qr(self, uri, x, top, size=90):
        widget = QrCodeWidget(uri, barFillColor=GREEN, barBorder=2)
        x1, y1, x2, y2 = widget.getBounds()
        d = Drawing(size, size, transform=[size / (x2-x1), 0, 0, size / (y2-y1), 0, 0])
        d.add(widget)
        renderPDF.draw(d, self.c, x, top - size)
        self.c.linkURL(uri, (x, top - size, x + size, top), relative=0, thickness=0)

    def order_page(self):
        self.start(self.t['buy_label'])
        self.para(self.t['buy_title'], M, 732, CW, 27, 35, 'Display', GREEN, 75)
        supply = self.profile.get('supply') or {}
        self.para(supply.get('intro') or self.t['buy_intro'], M, 645, CW, 10.2, 15.5, max_height=49)
        steps = supply.get('steps') or [dict(title=title, body=body) for title, body in self.t['steps']]
        top = 568
        for i, step in enumerate(steps, 1):
            self.c.setFillColor(GREEN)
            self.c.circle(M + 14, top - 13, 13, fill=1, stroke=0)
            self.c.setFillColor(CREAM)
            self.c.setFont('BodyBold', 10)
            self.c.drawCentredString(M + 14, top - 16.5, str(i))
            self.para(step['title'], M + 43, top, CW - 43, 11.1, 15.5, 'BodyBold', GREEN, 32)
            self.para(step['body'], M + 43, top - 24, CW - 43, 9.2, 13.5, max_height=41)
            top -= 76
        self.c.setFillColor(PALE)
        self.c.roundRect(M, 82, CW, 188, 3, fill=1, stroke=0)
        x = M + 16
        self.label(self.t['contact'].upper(), x, 255)
        person = self.director
        if not person.get('name') or not person.get('phone'):
            raise ValueError('Owner-approved export-development director is required')
        self.para(person['name'], x, 234, CW - 145, 17, 23, 'DisplayBold', GREEN, 25)
        role = person.get('roleEn') if self.locale == 'en' else person.get('role')
        self.para(role, x, 204, CW - 145, 10.2, 15, 'BodyBold', GREEN, 31)
        phone = clean(person['phoneLabel'])
        phone_uri = 'tel:' + re.sub(r'[^+\d]', '', person['phone'])
        zalo_uri = clean(self.contact.get('zaloHref') or self.contact.get('zaloUrl') or self.contact.get('zalo'))
        if not phone or not zalo_uri:
            raise ValueError('Public phone and Zalo contact details are required')
        self.para(phone, x, 178, CW - 145, 12.5, 18, 'BodyBold', GREEN, 21)
        self.c.linkURL(phone_uri, (x, 158, x + 230, 180), relative=0, thickness=0)
        house = 'Hoàng Long · ' + clean(self.contact.get('phoneLabel') or self.contact.get('phone'))
        self.para(house, x, 152, CW - 145, 8.9, 13, color=MUTED, max_height=16)
        self.c.linkURL(zalo_uri, (x, 136, x + 245, 154), relative=0, thickness=0)
        email = clean(self.contact.get('email') or 'hotro.trahoanglong@gmail.com')
        if email:
            self.para(email, x, 132, CW - 145, 8.6, 12.8, color=MUTED, max_height=15)
            self.c.linkURL('mailto:' + email, (x, 117, x + 245, 134), relative=0, thickness=0)
        office = loc(self.contact.get('officeAddress') or self.contact.get('address'), self.locale)
        self.para(self.t['office'] + ': ' + office, x, 113, CW - 145, 7.9, 11.6, color=MUTED, max_height=25)
        self.qr(self.company_url, W - M - 107, 242, 88)
        self.para(self.t['scan'], W - M - 116, 144, 110, 7.3, 10.5, color=MUTED, max_height=24)
        self.para(self.base_url.replace('https://', ''), M, 67, CW, 8.7, 13, color=MUTED, max_height=17)
        self.c.linkURL(self.company_url, (M, 50, W - M, 68), relative=0, thickness=0)
        self.end()

    def build(self):
        if not self.products or len({p['id'] for p in self.products}) != len(self.products):
            raise ValueError('The public tea catalogue must be nonempty and contain unique product IDs')
        if any(p.get('kind') not in (None, 'tea') for p in self.products):
            raise ValueError('Catalogue payload must contain tea products only')
        self.cover()
        self.profile_page()
        self.portfolio_page()
        self.operating_page()
        self.technical_page()
        self.cooperation_page()
        self.direction_page()
        self.evidence_page()
        self.guide_page()
        catalogue_pages = math.ceil(len(self.products) / 5)
        per_page, extra = divmod(len(self.products), catalogue_pages)
        index = 0
        for page_index in range(catalogue_pages):
            page_size = per_page + int(page_index < extra)
            self.catalog_page(self.products[index:index + page_size], index + 1)
            index += page_size
        self.order_page()
        if self.page_no != self.count:
            raise ValueError(f'Page-count mismatch: {self.page_no} pages built, expected {self.count}')
        self.c.save()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path, help='Exported public company/profile/product payload JSON')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'public' / 'downloads')
    parser.add_argument('--font-dir', type=Path, default=Path(os.environ.get('HL_PDF_FONT_DIR', str(FONT_BASE))))
    args = parser.parse_args()
    data = json.loads(args.input.read_text())
    register_fonts(args.font_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for locale in ('vi', 'en'):
        output = args.output_dir / f'hoang-long-profile-catalog-{locale}.pdf'
        Document(output, data, locale).build()
        print(f'{output} ({output.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
