#!/usr/bin/env python3
"""Build Hoàng Long's public trade-cooperation brief and corporate profile.

This builder reads public editorial modules only, via Node. It does not read
.env files, fetch images, query customers, or turn missing evidence into claims.
Run with the bundled Python runtime (ReportLab, Pillow and Vietnamese Noto fonts).
The longer product catalogue remains a separate commercial appendix.

Usage: python3 scripts/build-institutional-pack.py --catalog-input /tmp/public-catalogue.json
"""
from __future__ import annotations

import argparse
from datetime import date
import html
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

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
W, H = A4
M = 45
CW = W - 2 * M
PAPER = HexColor('#F6F2E8')
GREEN = HexColor('#193C2C')
INK = HexColor('#243B30')
MUTED = HexColor('#647365')
GOLD = HexColor('#9A7840')
LINE = HexColor('#CCD3C5')
PALE = HexColor('#E8EBDC')
WHITE = HexColor('#FFFFFF')
FONT_DIR = Path('/Users/longnguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')


def text(value):
    return str(value or '').strip().replace('\u00a0', ' ')


def localized(value, locale, fallback=''):
    if isinstance(value, dict):
        return value.get(locale) or value.get('vi') or value.get('en') or fallback
    return value or fallback


def register_fonts(directory):
    for name, filename in {'Body': 'NotoSans-Regular.ttf', 'Bold': 'NotoSans-Bold.ttf',
                           'Serif': 'NotoSerif-Regular.ttf', 'SerifBold': 'NotoSerif-Bold.ttf'}.items():
        source = Path(directory) / filename
        if not source.is_file():
            raise FileNotFoundError(f'Missing Vietnamese-capable font: {source}')
        pdfmetrics.registerFont(TTFont(name, str(source)))
    pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Body', boldItalic='Bold')
    pdfmetrics.registerFontFamily('Serif', normal='Serif', bold='SerifBold', italic='Serif', boldItalic='SerifBold')


def public_payload():
    source = '''
import {INSTITUTIONAL_PACK,PACK_REVISION,PACK_DOCUMENTS} from './lib/institutional-pack.js';
import {COMPANY_PROFILE,PROFILE_CONTACT,PROFILE_EXPORT_CONTACT,PROFILE_LEGAL} from './lib/company-profile.js';
import * as media from './lib/company-media.js';
console.log(JSON.stringify({pack:INSTITUTIONAL_PACK,revision:PACK_REVISION,documents:PACK_DOCUMENTS,
profiles:COMPANY_PROFILE,contact:PROFILE_CONTACT,director:PROFILE_EXPORT_CONTACT,legal:PROFILE_LEGAL,media}));
'''
    result = subprocess.run(['node', '--input-type=module', '-e', source], cwd=ROOT,
                            check=True, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout)


COPY = {
 'vi': {
  'brand': 'HOUSE OF HOÀNG LONG', 'region': 'HÀ GIANG · VIỆT NAM',
  'brief': 'ĐỀ XUẤT HỢP TÁC THƯƠNG MẠI', 'profile': 'HỒ SƠ DOANH NGHIỆP',
  'edition': 'PHÁT HÀNH', 'proposal': 'ĐỀ XUẤT THẢO LUẬN', 'facts': 'THÔNG TIN DOANH NGHIỆP',
  'recipient': 'ĐƠN VỊ TIẾP NHẬN', 'market': 'THỊ TRƯỜNG TRAO ĐỔI', 'meetingDate': 'NGÀY LÀM VIỆC',
  'objective': 'MỤC TIÊU LÀM VIỆC', 'contribution': 'HOÀNG LONG ĐÓNG GÓP',
  'request': 'NỘI DUNG ĐỀ NGHỊ KẾT NỐI', 'path': 'LỘ TRÌNH ĐỀ XUẤT',
  'outcome': 'KẾT QUẢ CẦN THỐNG NHẤT', 'contact': 'ĐẦU MỐI LÀM VIỆC',
  'origin': 'NGUỒN TRÀ & VAI TRÒ KINH DOANH', 'capacity': 'CƠ SỞ SẢN XUẤT & CUNG ỨNG',
  'portfolio': 'DANH MỤC & ỨNG DỤNG', 'delivery': 'TỔ CHỨC THƯƠNG MẠI & GIAO NHẬN',
  'quality': 'CHẤT LƯỢNG & HỒ SƠ ĐỐI CHIẾU', 'development': 'CHƯƠNG TRÌNH HỢP TÁC',
  'working': 'Vai trò trong chương trình cung ứng', 'factory': 'Nhà máy & điểm nhận EXW',
  'office': 'Văn phòng giao dịch & kho', 'tax': 'Mã số thuế',
  'director': 'Phát triển xuất khẩu', 'house': 'Liên hệ Hoàng Long',
  'website': 'Hồ sơ và tài liệu trực tuyến', 'catalog': 'Danh mục trà & phụ lục thương mại',
  'current': 'Xem tài liệu trực tuyến', 'factoryValue': 'Nhà máy Trà Hoàng Long\nTân Lập, Hà Giang',
  'diligence': 'Hồ sơ phục vụ thẩm định', 'diligenceNote': 'Phạm vi tài liệu, thẩm quyền ký và trách nhiệm thực hiện được đối chiếu trước khi cam kết giao dịch. Hồ sơ có thông tin khách hàng được trao đổi riêng theo phạm vi cho phép.',
  'photoLabel': 'VỊ TRÍ ẢNH · CHỜ BỔ SUNG', 'photoBody': 'Bổ sung ảnh thực tế và chú thích trước khi sử dụng làm bằng chứng năng lực.',
  'archivalOrigin': 'Nguồn trà vùng cao · Ảnh trong tư liệu Hoàng Long',
  'archivalTea': 'Hình ảnh sản phẩm trong danh mục Hoàng Long',
  'exw': 'EXW · Tân Lập, Hà Giang', 'packing': 'Bao PP/PE 20 / 30 / 35 kg',
  'packingNote': 'Quy cách cho đơn lô lớn và xuất khẩu; điều chỉnh theo ngoại hình trà và yêu cầu sử dụng. Tách biệt quy cách bán lẻ.',
  'leadTime': '2–8 tuần', 'leadLabel': 'Khung thời gian giao dịch tham chiếu',
  'leadNote': 'Đã gồm thời gian vận chuyển; chưa gồm chậm trễ ngoài dự kiến. Trách nhiệm, phương án vận chuyển và mốc thực hiện được thỏa thuận riêng; giá EXW không mặc định bao gồm cước vận tải.',
  'factNote': 'Năng lực và địa điểm theo thông tin Hoàng Long cung cấp. Kế hoạch sản xuất, lượng sẵn có và phạm vi từng sản phẩm cần được xác nhận cho chương trình cụ thể.',
  'proposedNote': 'Các nội dung trên là đề xuất hợp tác để hai bên thống nhất; không thể hiện dự án đã ký, cam kết hỗ trợ hay sự bảo trợ của cơ quan nhà nước.',
  'contactNote': 'Chức danh phát triển xuất khẩu xác định đầu mối thương mại; thẩm quyền ký được xác nhận trong hồ sơ giao dịch.',
 },
 'en': {
  'brand': 'HOUSE OF HOÀNG LONG', 'region': 'HÀ GIANG · VIETNAM',
  'brief': 'TRADE COOPERATION BRIEF', 'profile': 'CORPORATE PROFILE',
  'edition': 'EDITION', 'proposal': 'PROPOSAL FOR DISCUSSION', 'facts': 'COMPANY INFORMATION',
  'recipient': 'PREPARED FOR', 'market': 'MARKET', 'meetingDate': 'MEETING DATE',
  'objective': 'MEETING OBJECTIVE', 'contribution': 'HOÀNG LONG’S CONTRIBUTION',
  'request': 'PROPOSED CONNECTIONS & SUPPORT', 'path': 'PROPOSED PATHWAY',
  'outcome': 'INTENDED WORKING OUTCOME', 'contact': 'WORKING CONTACT',
  'origin': 'TEA ORIGINS & COMMERCIAL ROLE', 'capacity': 'PRODUCTION & SUPPLY BASIS',
  'portfolio': 'PRODUCTS & APPLICATIONS', 'delivery': 'COMMERCIAL EXECUTION & DELIVERY',
  'quality': 'QUALITY & SUPPORTING RECORDS', 'development': 'COOPERATION PROGRAMME',
  'working': 'Responsibilities in a supply programme', 'factory': 'Factory & EXW collection point',
  'office': 'Commercial office & warehouse', 'tax': 'Tax ID',
  'director': 'Export development', 'house': 'Hoàng Long contact',
  'website': 'Profile and documents online', 'catalog': 'Tea catalogue & commercial appendix',
  'current': 'Open the online documents', 'factoryValue': 'Hoàng Long Tea Factory\nTân Lập, Hà Giang, Vietnam',
  'diligence': 'Records for due diligence', 'diligenceNote': 'The document scope, signing authority and execution responsibilities are reviewed before a transaction is agreed. Records containing customer information are shared privately within the authorised scope.',
  'photoLabel': 'PHOTO POSITION · TO BE ADDED', 'photoBody': 'Add an actual photograph and caption before using this position as evidence of capability.',
  'archivalOrigin': 'Highland tea origins · Photograph from the Hoàng Long archive',
  'archivalTea': 'Product photographs from the Hoàng Long range',
  'exw': 'EXW · Tân Lập, Hà Giang', 'packing': '20 / 30 / 35 kg PP/PE sacks',
  'packingNote': 'For large-bulk and export orders, adjusted to tea form and application. Separate from retail pack formats.',
  'leadTime': '2–8 weeks', 'leadLabel': 'Indicative transaction window',
  'leadNote': 'Includes transport time and excludes unforeseen delays. Transport arrangements, responsibilities and milestones are agreed separately; EXW pricing does not imply freight is included.',
  'factNote': 'Capacity and locations reflect information supplied by Hoàng Long. Production plans, stock availability and the scope of each product must be confirmed for the specific programme.',
  'proposedNote': 'These are proposed areas for discussion, not signed projects, commitments of support or endorsement by a public authority.',
  'contactNote': 'The export-development title identifies the commercial contact. Signing authority is confirmed in transaction documents.',
 }
}


class Document:
    def __init__(self, path, data, locale, kind, brief_meta=None):
        self.data, self.locale, self.kind = data, locale, kind
        self.brief_meta = brief_meta or {}
        self.t = dict(COPY[locale])
        self.p = data['pack'][locale]
        self.s = self.p['brief' if kind == 'brief' else 'company']
        self.profile = data['profiles'][locale]
        packing = self.profile.get('packing') or {}
        self.t['packing'] = packing.get('value') or self.t['packing']
        company_facts = self.p['company']['capability']['facts']
        if len(company_facts) == 4:
            self.t['leadTime'] = company_facts[3]['value']
        self.director = data['director']
        self.contact = data['contact']
        self.legal = data['legal']
        self.total = 2 if kind == 'brief' else 8
        self.page = 0
        self.revision = date.fromisoformat(data['revision']).strftime('%d.%m.%Y')
        self.base_url = text(self.contact['website']).rstrip('/')
        if not self.base_url.startswith('https://'):
            raise ValueError('A public HTTPS website is required')
        self.c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
        self.c.setTitle(('Đề xuất hợp tác thương mại' if locale == 'vi' else 'Trade Cooperation Brief') + ' — Hoàng Long' if kind == 'brief'
                        else ('Hồ sơ doanh nghiệp' if locale == 'vi' else 'Corporate Profile') + ' — Hoàng Long')
        self.c.setAuthor(self.legal['name'])
        self.c.setSubject(('Bản trao đổi ngày ' if locale == 'vi' else 'Discussion edition ') + self.revision)
        self.c.setCreator('House of Hoàng Long · public institutional pack builder')
        self.regions = []
        # Media export names are intentionally resolved without reading files outside public/.
        exports = data.get('media') or {}
        self.media = exports.get('COMPANY_MEDIA') or exports.get('COMPANY_MEDIA_SLOTS') or exports.get('default') or exports
        if isinstance(self.media, list):
            self.media = {item['id']: item for item in self.media}

    def url(self, path):
        value = path if path.startswith(('https:', 'tel:', 'mailto:')) else self.base_url + path
        if self.locale == 'en' and value.startswith(self.base_url):
            parts = urlsplit(value)
            query = dict(parse_qsl(parts.query)); query['lang'] = 'en'
            value = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
        return value

    def para(self, value, x, top, width, size=10.2, leading=None, font='Body', color=INK, max_height=None):
        value = text(value)
        if not value:
            return top
        ps = ParagraphStyle('measured', fontName=font, fontSize=size, leading=leading or size * 1.5,
                            textColor=color, allowOrphans=0, allowWidows=0, splitLongWords=0)
        paragraph = Paragraph(html.escape(value).replace('\n', '<br/>'), ps)
        _, height = paragraph.wrap(width, H)
        if max_height is not None and height > max_height + .1:
            raise ValueError(f'{self.kind}/{self.locale} page {self.page}: text height {height:.1f} > {max_height:.1f}: {value[:90]}')
        if top - height < 55:
            raise ValueError(f'{self.kind}/{self.locale} page {self.page}: text reaches footer: {value[:90]}')
        if top > H - 52:
            raise ValueError('Body text intrudes into running header')
        paragraph.drawOn(self.c, x, top - height)
        self.regions.append({'page': self.page, 'x': round(x, 2), 'y': round(top-height, 2), 'width': round(width, 2), 'height': round(height, 2)})
        return top - height

    def label(self, value, x, top, width=CW, color=GOLD, size=7.4):
        return self.para(value, x, top, width, size, size * 1.5, 'Bold', color)

    def rule(self, y, x=M, width=CW, color=LINE):
        self.c.setStrokeColor(color); self.c.setLineWidth(.65)
        self.c.line(x, y, x + width, y)

    def begin(self, label=None, dark=False):
        self.page += 1
        self.c.setFillColor(GREEN if dark else PAPER)
        self.c.rect(0, 0, W, H, fill=1, stroke=0)
        color = PAPER if dark else GREEN
        self.c.setFont('Bold', 7.8); self.c.setFillColor(color)
        self.c.drawString(M, H - 29, self.t['brand'])
        self.c.setFont('Body', 7); self.c.setFillColor(PALE if dark else MUTED)
        self.c.drawRightString(W - M, H - 29, self.t['edition'] + ' ' + self.revision)
        self.rule(H - 46, color=HexColor('#56705D') if dark else LINE)
        if label:
            self.label(label, M, H - 69, color=PALE if dark else GOLD)

    def end(self, dark=False):
        color = HexColor('#B8C7B7') if dark else MUTED
        self.rule(40, color=HexColor('#56705D') if dark else LINE)
        self.c.setFillColor(color); self.c.setFont('Body', 6.2)
        footer = self.legal['name'] + ' · ' + self.t['tax'] + ' ' + self.legal['taxNumber']
        self.c.drawString(M, 25, footer)
        self.c.setFont('Bold', 7)
        self.c.drawRightString(W - M, 25, f'{self.page:02d} / {self.total:02d}')
        self.c.linkURL(self.url('/company'), (M, 18, W - M - 35, 36), thickness=0)
        self.c.showPage()

    def heading(self, title, body='', title_size=26):
        top = self.para(title, M, 736, CW, title_size, title_size * 1.3, 'Serif', GREEN, 108)
        if body:
            top = self.para(body, M, top - 18, CW, 10.1, 15.5, max_height=96)
        return top - 27

    def image(self, source, x, top, width, height, crop=(.5, .5)):
        path = (ROOT / 'public' / source.lstrip('/')).resolve()
        if not path.is_relative_to((ROOT / 'public').resolve()) or not path.is_file():
            raise ValueError(f'Image must be an existing local public asset: {source}')
        im = Image.open(path); iw, ih = im.size
        scale = max(width / iw, height / ih); sw, sh = iw * scale, ih * scale
        self.c.saveState()
        clip = self.c.beginPath(); clip.rect(x, top-height, width, height); self.c.clipPath(clip, stroke=0)
        self.c.drawImage(str(path), x - (sw-width)*crop[0], top-height-(sh-height)*crop[1], sw, sh, mask='auto')
        self.c.restoreState()

    def media_panel(self, key, x, top, width, height, caption=True):
        aliases = {'factory': ('factorypanorama', 'factory-panorama', 'factoryPanorama', 'factory'),
                   'process': ('processing', 'process', 'production'),
                   'qc': ('quality-control', 'qualityControl', 'qc'),
                   'loading': ('bulkload', 'bulk-loading', 'bulkLoading', 'loading')}
        item = next((self.media.get(k) for k in aliases.get(key, (key,)) if self.media.get(k)), {})
        src = item.get('src') or item.get('image')
        caption_text = localized(item.get('caption'), self.locale)
        if src:
            self.image(src, x, top, width, height)
        else:
            self.c.setFillColor(PALE); self.c.rect(x, top-height, width, height, fill=1, stroke=0)
            self.c.setStrokeColor(LINE); self.c.setLineWidth(.6)
            self.c.rect(x+.5, top-height+.5, width-1, height-1, fill=0, stroke=1)
            # A quiet drafting motif makes an intentionally unfilled photo position clear.
            self.c.line(x+14, top-14, x+34, top-14); self.c.line(x+14, top-14, x+14, top-34)
            self.c.line(x+width-14, top-height+14, x+width-34, top-height+14)
            self.c.line(x+width-14, top-height+14, x+width-14, top-height+34)
            title = localized(item.get('placeholderTitle') or item.get('title'), self.locale) or {'factory': 'Toàn cảnh nhà máy' if self.locale=='vi' else 'Factory overview', 'qc': 'Kiểm soát chất lượng' if self.locale=='vi' else 'Quality-control activity', 'loading': 'Đóng bao & giao hàng' if self.locale=='vi' else 'Bulk packing & dispatch'}.get(key, self.t['photoLabel'])
            middle = top - max(19, (height-61)/2)
            self.label(self.t['photoLabel'], x+18, middle, width-36, color=MUTED, size=6.5)
            self.para(title, x+18, middle-17, width-36, 12.2 if width>250 else 10.5, 17, 'SerifBold', GREEN, 38)
            if height > 130:
                self.para(localized(item.get('placeholderBody'), self.locale) or self.t['photoBody'], x+18, middle-59, width-36, 8, 12, color=MUTED, max_height=37)
        if caption and caption_text:
            self.para(caption_text, x, top-height-8, width, 7.2, 10.8, color=MUTED, max_height=33)
        return top - height - (38 if caption and caption_text else 0)

    def rows(self, items, top, width=CW, x=M, body_size=9.8, gap=21, numbered=True, title_size=12.1):
        for index, item in enumerate(items):
            inset = 34 if numbered else 0
            if numbered:
                self.label(f'{index+1:02d}', x, top+1, 26, size=10)
            bottom = self.para(item['title'], x+inset, top+2, width-inset, title_size, title_size*1.4, 'SerifBold', GREEN, 54)
            bottom = self.para(item['body'], x+inset, bottom-8, width-inset, body_size, body_size*1.5, max_height=119)
            self.rule(bottom-12, x+inset, width-inset)
            top = bottom-gap-12
        return top

    def qr(self, uri, x, top, size=80):
        widget = QrCodeWidget(uri, barFillColor=GREEN, barBorder=2)
        a, b, c, d = widget.getBounds()
        shape = Drawing(size, size, transform=[size/(c-a), 0, 0, size/(d-b), 0, 0]); shape.add(widget)
        renderPDF.draw(shape, self.c, x, top-size)
        self.c.linkURL(uri, (x, top-size, x+size, top), thickness=0)

    def contact_line(self, x, top, width, compact=False, dark=False):
        color = PAPER if dark else GREEN
        muted = PALE if dark else MUTED
        size = 13 if compact else 19
        top = self.para(self.director['name'], x, top, width, size, size*1.4, 'SerifBold', color, 30)
        role = self.director['roleEn'] if self.locale == 'en' else self.director['role']
        top = self.para(role, x, top-6, width, 8.8 if compact else 10, 13.8, 'Body', muted, 30)
        top = self.para(self.director['phoneLabel'], x, top-8, width, 10.8 if compact else 13, 18, 'Bold', color, 22)
        self.c.linkURL('tel:'+self.director['phone'], (x, top-2, x+width, top+21), thickness=0)
        return top

    def callout(self, label, body, top, height=None, dark=False):
        bottom = top
        # Measure by rendering inside a known-height block; content errors fail rather than shrink.
        body_width = CW-32
        ps = ParagraphStyle('callout', fontName='Body', fontSize=9.2, leading=14)
        _, bh = Paragraph(html.escape(text(body)), ps).wrap(body_width, H)
        block_h = height or bh+59
        self.c.setFillColor(GREEN if dark else PALE); self.c.rect(M, top-block_h, CW, block_h, fill=1, stroke=0)
        color = PAPER if dark else GREEN
        self.label(label, M+16, top-15, CW-32, color=PALE if dark else GOLD)
        self.para(body, M+16, top-36, CW-32, 9.2, 14, color=color, max_height=block_h-46)
        return top-block_h

    def brief_page_one(self):
        self.begin(self.t['brief'])
        heading_top = 735
        if self.brief_meta:
            widths = [CW*.44, CW*.31, CW*.25]
            x = M
            for key, width in zip(('recipient','market','meetingDate'), widths):
                value = self.brief_meta.get(key)
                if value:
                    self.label(self.t[key], x, 746, width-14, size=6.5, color=MUTED)
                    self.para(value, x, 731, width-14, 8.2, 12.2, 'Body', GREEN, 25)
                x += width
            heading_top = 689
        top = self.para(self.s['title'], M, heading_top, CW, 29, 37, 'Serif', GREEN, 114)
        top = self.para(self.s['summary'], M, top-18, CW, 10.2, 15.8, max_height=80)-22
        top = self.callout(self.t['objective'], self.s['objective'], top)-26
        self.label(self.t['contribution'], M, top)
        top = self.rows(self.s['contribution'], top-24, body_size=9.4, gap=18, title_size=11.8)
        self.para(self.t['proposedNote'], M, top, CW, 7.3, 11, color=MUTED, max_height=43)
        self.end()

    def brief_page_two(self):
        self.begin(self.t['brief'] + ' / 02')
        top = self.para(self.t['request'].capitalize(), M, 735, CW, 24, 32, 'Serif', GREEN, 66)-24
        top = self.rows(self.s['request'], top, body_size=9.2, gap=17, title_size=11.7)
        self.label(self.t['path'], M, top)
        top -= 25
        gap, col = 18, (CW-36)/3
        row_bottom = top
        for index, step in enumerate(self.s['path']):
            x = M+index*(col+gap)
            self.label(f'{index+1:02d}', x, top, col, size=9)
            bottom = self.para(step['title'], x, top-22, col, 10.5, 15, 'SerifBold', GREEN, 45)
            bottom = self.para(step['body'], x, bottom-8, col, 8.4, 12.5, max_height=69)
            row_bottom = min(row_bottom, bottom)
        top = row_bottom-24
        top = self.callout(self.t['outcome'], self.s['outcome'], top)-21
        self.rule(top)
        bottom = self.contact_line(M, top-17, CW-112, compact=True)
        self.qr(self.url('/company#cooperation'), W-M-84, top-15, 75)
        self.para(self.base_url.replace('https://', ''), W-M-110, top-93, 110, 6.8, 10, color=MUTED, max_height=21)
        self.end()

    def company_cover(self):
        self.begin(self.t['profile'], dark=True)
        self.label(self.t['region'], M, 740, color=PALE, size=8.2)
        title = self.s['mandate']['title']
        top = self.para(title, M, 708, CW, 30, 40, 'Serif', PAPER, 125)
        top = self.para(self.s['mandate']['body'], M, top-20, CW, 10.1, 15.7, color=PALE, max_height=97)
        photo_top = top-28
        photo_h = photo_top-191
        if photo_h < 180:
            raise ValueError('Cover narrative leaves insufficient space for its origin photograph')
        self.image('/landing/1.jpg', M, photo_top, CW, photo_h, (.5, .4))
        self.para(self.t['archivalOrigin'], M, 178, CW, 7.3, 11, color=PALE, max_height=24)
        self.rule(142, color=HexColor('#56705D'))
        self.para(self.legal['name'], M, 125, CW, 10.8, 15.8, 'Bold', PAPER, 32)
        self.para(self.t['tax']+' '+self.legal['taxNumber']+'  ·  '+self.base_url.replace('https://', ''), M, 84, CW, 8.2, 12, color=PALE, max_height=24)
        self.end(dark=True)

    def company_origin(self):
        self.begin('01 / '+self.t['origin'])
        p = self.s['origin']
        top = self.heading(p['title'], p['body'])
        items = p.get('items') or self.profile['operatingModel']['links'][:3]
        # This page gives the narrative a practical commercial role rather than a second cover.
        self.label(self.t['working'].upper(), M, top)
        top = self.rows(items, top-28, body_size=9.5, gap=22)
        if top > 197:
            self.image('/landing/2.jpg', M, top, 125, 112, (.5,.5))
            self.para(self.profile['origins']['body'], M+145, top, CW-145, 8.9, 13.5, color=MUTED, max_height=112)
        self.end()

    def company_capacity(self):
        self.begin('02 / '+self.t['capacity'])
        p = self.s['capability']; top = self.heading(p['title'], p['body'])
        gap, width = 24, (CW-24)/2
        facts = p['facts']
        if len(facts) != 4:
            raise ValueError('Production page expects four owner-approved facts')
        for start in (0,2):
            row_bottom = top
            for offset, item in enumerate(facts[start:start+2]):
                x = M+offset*(width+gap)
                self.label(item['label'].upper(), x, top, width, color=MUTED, size=7)
                bottom = self.para(item['value'], x, top-22, width, 17, 23.5, 'SerifBold', GREEN, 50)
                bottom = self.para(item['note'], x, bottom-9, width, 8.5, 13, color=MUTED, max_height=65)
                row_bottom = min(row_bottom, bottom)
            top = row_bottom-24
        self.rule(top+4)
        top -= 15
        image_h = min(160, top-142)
        self.media_panel('process', M, top, width, image_h)
        self.media_panel('factory', M+width+gap, top, width, image_h)
        self.para(self.t['factNote'], M, 103, CW, 7.5, 11.4, color=MUTED, max_height=39)
        self.end()

    def company_portfolio(self):
        self.begin('03 / '+self.t['portfolio'])
        p = self.s['portfolio']; top = self.heading(p['title'], p['body'])
        top = self.rows(p['segments'], top, body_size=9.5, gap=20, title_size=12.2)
        image_h = min(134, top-147)
        if image_h < 65:
            raise ValueError('Portfolio copy leaves insufficient space for product photographs')
        gap=12; width=(CW-gap)/2
        self.image('/export/hong-tra-shan-khoi.jpeg', M, top, width, image_h, (.5,.45))
        self.image('/export/luc-tra-hoa-ngoc-lan.jpeg', M+width+gap, top, width, image_h, (.5,.45))
        self.para(self.t['archivalTea'], M, top-image_h-8, CW, 7.2, 10.8, color=MUTED, max_height=22)
        self.label(self.t['packing'], M, 100)
        self.para(self.t['packingNote'], M, 81, CW, 7.8, 11.5, color=MUTED, max_height=24)
        self.end()

    def company_delivery(self):
        self.begin('04 / '+self.t['delivery'])
        p = self.s['delivery']; top = self.heading(p['title'], p['body'])
        top = self.rows(p['steps'], top, body_size=9.3, gap=18, title_size=11.9)
        self.c.setFillColor(PALE); self.c.rect(M, 72, CW, 111, fill=1, stroke=0)
        self.label(self.t['leadLabel'].upper(), M+16, 166, CW-32, color=MUTED)
        self.para(self.t['leadTime'], M+16, 142, 145, 21, 29, 'SerifBold', GREEN, 32)
        self.para(self.t['leadNote'], M+178, 144, CW-195, 8.6, 13, color=MUTED, max_height=65)
        if top < 202:
            raise ValueError('Delivery copy overlaps the transaction-window panel')
        self.end()

    def company_quality(self):
        self.begin('05 / '+self.t['quality'])
        p = self.s['quality']; top = self.heading(p['title'], p['body'])
        top = self.rows(p['items'], top, body_size=9.5, gap=20, title_size=12)
        gap=18; width=(CW-gap)/2; image_h=min(144,top-128)
        if image_h < 85:
            raise ValueError('Quality copy leaves insufficient space for evidence photo positions')
        self.media_panel('qc', M, top, width, image_h)
        self.media_panel('loading', M+width+gap, top, width, image_h)
        self.para(self.t['diligenceNote'], M, 102, CW, 7.6, 11.5, color=MUTED, max_height=37)
        self.end()

    def company_development(self):
        self.begin('06 / '+self.t['development'])
        p = self.s['development']; top = self.heading(p['title'], p['body'])
        self.label(self.t['proposal'], M, top)
        top = self.rows(p['priorities'], top-30, body_size=9.7, gap=26, title_size=12.4)
        top = self.callout(self.t['outcome'], self.p['brief']['outcome'], top, dark=True)-16
        self.para(self.t['proposedNote'], M, top, CW, 7.6, 11.6, color=MUTED, max_height=48)
        self.end()

    def company_contact(self):
        self.begin('07 / '+self.t['contact'])
        p = self.s['contact']; top = self.heading(p['title'], p['body'])
        self.label(self.t['director'].upper(), M, top)
        bottom = self.contact_line(M, top-24, CW-130)
        self.qr(self.url('/company#cooperation'), W-M-101, top-14, 94)
        self.para(self.t['website'], W-M-118, top-117, 118, 7.1, 10.8, color=MUTED, max_height=24)
        top = min(bottom-21, top-158)
        self.rule(top)
        gap=25; width=(CW-gap)/2
        self.label(self.t['factory'].upper(), M, top-18, width)
        fbot=self.para(self.t['factoryValue'], M, top-39, width, 9.7, 15, 'Bold', GREEN, 49)
        self.label(self.t['office'].upper(), M+width+gap, top-18, width)
        obot=self.para(self.contact['address'], M+width+gap, top-39, width, 9.4, 14.5, max_height=58)
        top=min(fbot,obot)-23
        self.label(self.t['house'].upper(), M, top)
        top=self.para(self.contact['phoneLabel']+'  ·  hotro.trahoanglong@gmail.com', M, top-21, CW, 9.1, 14, max_height=31)
        self.c.linkURL('tel:'+self.contact['phone'], (M, top-2, M+95, top+16), thickness=0)
        self.c.linkURL('mailto:hotro.trahoanglong@gmail.com', (M+100, top-2, W-M, top+16), thickness=0)
        top-=23; self.rule(top); top-=20
        self.label(self.t['diligence'].upper(), M, top)
        top-=25
        items=self.profile['evidence']['items']
        for index,item in enumerate(items):
            top=self.para(f'{index+1:02d}  '+item['title'], M, top, CW, 9.1, 13.3, 'Bold', GREEN, 27)-5
            top=self.para(item['body'], M+22, top, CW-22, 8, 11.7, color=MUTED, max_height=37)-13
        # Signing scope is already stated in the contact introduction.
        self.end()

    def build(self):
        if self.kind == 'brief':
            self.brief_page_one(); self.brief_page_two()
        else:
            self.company_cover(); self.company_origin(); self.company_capacity()
            self.company_portfolio(); self.company_delivery(); self.company_quality()
            self.company_development(); self.company_contact()
        if self.page != self.total:
            raise ValueError(f'Unexpected page count: {self.page} (expected {self.total})')
        self.c.save()
        return self.regions


def build_annex(payload_path, output_dir, font_dir):
    """Reuse existing catalogue rendering without changing its long-form PDFs."""
    import importlib.util
    spec = importlib.util.spec_from_file_location('hl_catalogue_pdf', ROOT/'scripts'/'build-company-catalog-pdf.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.register_fonts(font_dir)
    data = json.loads(Path(payload_path).read_text())
    products = data.get('products') or []
    if len(products) != 17 or len({p['id'] for p in products}) != 17:
        raise ValueError('Current annex requires the 17 unique public teas; update pagination if the range changes')
    for locale in ('vi', 'en'):
        output = output_dir/f'hoang-long-product-annex-{locale}.pdf'
        document = module.Document(output, data, locale)
        document.count = 7
        document.t['cover'] = 'Phụ lục danh mục & kỹ thuật' if locale=='vi' else 'Product & technical reference'
        document.t['footer'] = document.t['cover']
        document.t['brand'] = 'HOÀNG LONG · DANH MỤC & KỸ THUẬT' if locale=='vi' else 'HOÀNG LONG · PRODUCT & TECHNICAL REFERENCE'
        document.t['guide_label'] = '02 / DANH MỤC & QUY CÁCH' if locale=='vi' else '02 / RANGE & PACKING'
        document.t['catalog_label'] = '03 / DANH MỤC TRÀ' if locale=='vi' else '03 / TEA CATALOGUE'
        document.t['buy_label'] = '04 / ĐẦU MỐI THƯƠNG MẠI' if locale=='vi' else '04 / COMMERCIAL CONTACT'
        document.c.setTitle(document.t['cover']+' — Hoàng Long')
        # Use the established measured technical layout, with an annex-specific section marker.
        original_start = document.start
        def start(section=None):
            if section and section.startswith('04 /') and 'TECHNICAL PROCUREMENT' in section:
                section='01 / TECHNICAL PROCUREMENT BASIS'
            elif section and section.startswith('04 /') and 'NỀN TẢNG KỸ THUẬT' in section:
                section='01 / NỀN TẢNG KỸ THUẬT'
            original_start(section)
        document.start=start
        document.technical_page()
        document.guide_page()
        index=0
        for count in (5,4,4,4):
            document.catalog_page(products[index:index+count],index+1)
            index+=count
        document.order_page()
        if document.page_no!=7:
            raise ValueError('Product annex page-count mismatch')
        document.c.save()
        print(f'{output} ({output.stat().st_size:,} bytes; 7 pages; 17 teas)')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recipient', help='Optional public recipient name for a meeting-specific brief')
    parser.add_argument('--market', help='Optional destination market for a meeting-specific brief')
    parser.add_argument('--meeting-date', help='Optional meeting date in YYYY-MM-DD format')
    parser.add_argument('--input', type=Path, help='Optional JSON export of the same public editorial modules')
    parser.add_argument('--catalog-input', type=Path, help='Explicit public catalogue payload for the separate technical/product annex')
    parser.add_argument('--output-dir', type=Path, default=ROOT/'public'/'downloads')
    parser.add_argument('--font-dir', type=Path, default=Path(os.environ.get('HL_PDF_FONT_DIR', str(FONT_DIR))))
    parser.add_argument('--qa-dir', type=Path, help='Optional location for measured text regions and QA renders')
    args=parser.parse_args()
    data=json.loads(args.input.read_text()) if args.input else public_payload()
    register_fonts(args.font_dir); args.output_dir.mkdir(parents=True, exist_ok=True)
    brief_meta = {}
    for key, value, limit in (('recipient',args.recipient,120),('market',args.market,80)):
        if value:
            value = re.sub(r'[\x00-\x1f\x7f]', ' ',value).strip()
            if len(value)>limit:
                parser.error(f'--{key} must be at most {limit} characters')
            brief_meta[key]=value
    if args.meeting_date:
        try:
            brief_meta['meetingDate']=date.fromisoformat(args.meeting_date).strftime('%d.%m.%Y')
        except ValueError:
            parser.error('--meeting-date must use YYYY-MM-DD')
    for kind,stem in (('brief','cooperation-brief'),('company','corporate-profile')):
        for locale in ('vi','en'):
            destination=args.output_dir/f'hoang-long-{stem}-{locale}.pdf'
            regions=Document(destination,data,locale,kind,brief_meta if kind=='brief' else None).build()
            if args.qa_dir:
                args.qa_dir.mkdir(parents=True, exist_ok=True)
                (args.qa_dir/(destination.stem+'-regions.json')).write_text(json.dumps(regions,indent=2))
            print(f'{destination} ({destination.stat().st_size:,} bytes; {2 if kind=="brief" else 8} pages)')
    if args.catalog_input:
        build_annex(args.catalog_input, args.output_dir, args.font_dir)


if __name__ == '__main__':
    main()
