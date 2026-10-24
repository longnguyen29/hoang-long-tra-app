#!/usr/bin/env python3
"""Build Hoàng Long's public trade-cooperation brief and corporate profile.

This builder reads public editorial modules only, via Node. It does not read
.env files, fetch images, query customers, or turn missing evidence into claims.
Run with the bundled Python runtime (ReportLab, Pillow and Vietnamese Noto fonts).
The export product profile presents the four core lines separately from the
longer retail/product catalogue. It contains no brewing or retail-pack advice.

Usage: python3 scripts/build-institutional-pack.py --catalog-input /tmp/public-core-teas.json
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
import {CORE_EXPORT_PRODUCTS,EXPORT_PRODUCT_COPY} from './lib/export-product-profile.js';
console.log(JSON.stringify({pack:INSTITUTIONAL_PACK,revision:PACK_REVISION,documents:PACK_DOCUMENTS,
profiles:COMPANY_PROFILE,contact:PROFILE_CONTACT,director:PROFILE_EXPORT_CONTACT,legal:PROFILE_LEGAL,media,
coreProducts:CORE_EXPORT_PRODUCTS,coreCopy:EXPORT_PRODUCT_COPY}));
'''
    result = subprocess.run(['node', '--input-type=module', '-e', source], cwd=ROOT,
                            check=True, capture_output=True, text=True, timeout=30)
    return json.loads(result.stdout)


COPY = {
 'vi': {
  'brand': 'HOUSE OF HOÀNG LONG', 'region': 'HÀ GIANG · VIỆT NAM',
  'brief': 'GIỚI THIỆU CHÀO HÀNG XUẤT KHẨU', 'profile': 'HỒ SƠ DOANH NGHIỆP',
  'edition': 'PHÁT HÀNH', 'proposal': 'ĐỀ XUẤT THẢO LUẬN', 'facts': 'THÔNG TIN DOANH NGHIỆP',
  'recipient': 'ĐƠN VỊ TIẾP NHẬN', 'market': 'THỊ TRƯỜNG TRAO ĐỔI', 'meetingDate': 'NGÀY LÀM VIỆC',
  'objective': 'PHẠM VI CHÀO HÀNG', 'contribution': 'SẢN PHẨM & CUNG ỨNG',
  'request': 'THÔNG TIN YÊU CẦU BÁO GIÁ', 'path': 'QUY TRÌNH CHÀO HÀNG',
  'outcome': 'CƠ SỞ CHÀO HÀNG', 'contact': 'ĐẦU MỐI LÀM VIỆC',
  'origin': 'NGUỒN TRÀ & VAI TRÒ KINH DOANH', 'capacity': 'CƠ SỞ SẢN XUẤT & CUNG ỨNG',
  'portfolio': 'DANH MỤC XUẤT KHẨU', 'delivery': 'THƯƠNG MẠI & GIAO NHẬN',
  'quality': 'CHẤT LƯỢNG & HỒ SƠ ĐỐI CHIẾU', 'development': 'CHƯƠNG TRÌNH HỢP TÁC',
  'working': 'Vai trò trong chương trình cung ứng', 'factory': 'Nhà máy & điểm nhận EXW',
  'office': 'Văn phòng giao dịch & kho', 'tax': 'Mã số thuế',
  'director': 'Phát triển xuất khẩu', 'house': 'Liên hệ Hoàng Long',
  'website': 'Hồ sơ và tài liệu trực tuyến', 'catalog': 'Hồ sơ sản phẩm xuất khẩu',
  'current': 'Xem tài liệu trực tuyến', 'factoryValue': 'Nhà máy Trà Hoàng Long\nTân Lập, Hà Giang',
  'diligence': 'Hồ sơ phục vụ thẩm định', 'diligenceNote': 'Phạm vi tài liệu, thẩm quyền ký và trách nhiệm thực hiện được đối chiếu trước khi cam kết giao dịch. Hồ sơ có thông tin khách hàng được trao đổi riêng theo phạm vi cho phép.',
  'photoLabel': 'VỊ TRÍ ẢNH · CHỜ BỔ SUNG', 'photoBody': 'Bổ sung ảnh thực tế và chú thích trước khi sử dụng làm bằng chứng năng lực.',
  'archivalOrigin': 'Nguồn trà vùng cao · Ảnh trong tư liệu Hoàng Long',
  'archivalTea': 'Hình ảnh sản phẩm trong danh mục Hoàng Long',
  'exw': 'EXW · Tân Lập, Hà Giang', 'packing': 'Bao PP/PE 20 / 30 / 35 kg',
  'packingNote': 'Quy cách cho đơn lô lớn và xuất khẩu; điều chỉnh theo ngoại hình trà và yêu cầu sử dụng. Tách biệt quy cách bán lẻ.',
  'leadTime': '2–8 tuần', 'leadLabel': 'Khung thời gian giao dịch tham chiếu',
  'leadNote': 'Đã gồm thời gian vận chuyển; chưa gồm chậm trễ ngoài dự kiến. Trách nhiệm, phương án vận chuyển và mốc thực hiện được thỏa thuận riêng; giá EXW không mặc định bao gồm cước vận tải.',
  'factNote': 'Công suất khả dụng, cơ cấu sản phẩm và mốc hàng sẵn được xác nhận theo kế hoạch sản xuất của từng đơn hàng.',
  'proposedNote': 'Phạm vi cung ứng, giá và tiến độ được xác nhận theo báo giá và hợp đồng của từng giao dịch.',
  'contactNote': 'Chức danh phát triển xuất khẩu xác định đầu mối thương mại; thẩm quyền ký được xác nhận trong hồ sơ giao dịch.',
 },
 'en': {
  'brand': 'HOUSE OF HOÀNG LONG', 'region': 'HÀ GIANG · VIETNAM',
  'brief': 'EXPORT SALES BRIEF', 'profile': 'CORPORATE PROFILE',
  'edition': 'EDITION', 'proposal': 'PROPOSAL FOR DISCUSSION', 'facts': 'COMPANY INFORMATION',
  'recipient': 'PREPARED FOR', 'market': 'MARKET', 'meetingDate': 'MEETING DATE',
  'objective': 'OFFER SCOPE', 'contribution': 'PRODUCTS & SUPPLY',
  'request': 'INFORMATION FOR A QUOTATION', 'path': 'OFFER PROCESS',
  'outcome': 'BASIS OF THE OFFER', 'contact': 'WORKING CONTACT',
  'origin': 'TEA ORIGINS & COMMERCIAL ROLE', 'capacity': 'PRODUCTION & SUPPLY BASIS',
  'portfolio': 'EXPORT PRODUCT RANGE', 'delivery': 'COMMERCIAL TERMS & DELIVERY',
  'quality': 'QUALITY & SUPPORTING RECORDS', 'development': 'COOPERATION PROGRAMME',
  'working': 'Responsibilities in a supply programme', 'factory': 'Factory & EXW collection point',
  'office': 'Commercial office & warehouse', 'tax': 'Tax ID',
  'director': 'Export development', 'house': 'Hoàng Long contact',
  'website': 'Profile and documents online', 'catalog': 'Export product portfolio',
  'current': 'Open the online documents', 'factoryValue': 'Hoàng Long Tea Factory\nTân Lập, Hà Giang, Vietnam',
  'diligence': 'Records for due diligence', 'diligenceNote': 'The document scope, signing authority and execution responsibilities are reviewed before a transaction is agreed. Records containing customer information are shared privately within the authorised scope.',
  'photoLabel': 'PHOTO POSITION · TO BE ADDED', 'photoBody': 'Add an actual photograph and caption before using this position as evidence of capability.',
  'archivalOrigin': 'Highland tea origins · Photograph from the Hoàng Long archive',
  'archivalTea': 'Product photographs from the Hoàng Long range',
  'exw': 'EXW · Tân Lập, Hà Giang', 'packing': '20 / 30 / 35 kg PP/PE sacks',
  'packingNote': 'For large-bulk and export orders, adjusted to tea form and application. Separate from retail pack formats.',
  'leadTime': '2–8 weeks', 'leadLabel': 'Indicative transaction window',
  'leadNote': 'Includes transport time and excludes unforeseen delays. Transport arrangements, responsibilities and milestones are agreed separately; EXW pricing does not imply freight is included.',
  'factNote': 'Available capacity, product mix and goods-readiness dates are confirmed against the production plan for each order.',
  'proposedNote': 'Supply scope, prices and schedules are confirmed in the quotation and contract for each transaction.',
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
        self.c.setTitle(('Giới thiệu chào hàng xuất khẩu' if locale == 'vi' else 'Export Sales Brief') + ' — Hoàng Long' if kind == 'brief'
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

    def image(self, source, x, top, width, height, crop=(.5, .5), contain=False):
        path = (ROOT / 'public' / source.lstrip('/')).resolve()
        if not path.is_relative_to((ROOT / 'public').resolve()) or not path.is_file():
            raise ValueError(f'Image must be an existing local public asset: {source}')
        im = Image.open(path); iw, ih = im.size
        if contain:
            scale=min(width/iw,height/ih);sw,sh=iw*scale,ih*scale
            self.c.setFillColor(HexColor('#E9E7DF'));self.c.rect(x,top-height,width,height,fill=1,stroke=0)
            self.c.drawImage(str(path),x+(width-sw)/2,top-height+(height-sh)/2,sw,sh,mask='auto')
            return
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
        products = self.data.get('coreProducts') or []
        if len(products) != 4:
            raise ValueError('Corporate portfolio requires the four approved export product lines')
        gap=22; width=(CW-gap)/2
        for start in (0,2):
            bottoms=[]
            for offset, product in enumerate(products[start:start+2]):
                x=M+offset*(width+gap)
                self.label(f'{start+offset+1:02d} / '+localized(product['category'],self.locale).upper(),x,top,width,size=6.6)
                bottom=self.para(localized(product['name'],self.locale),x,top-22,width,16,22,'SerifBold',GREEN,67)
                bottom=self.para(localized(product['subtitle'],self.locale),x,bottom-9,width,9.1,13.6,'Body',INK,55)
                bottom=self.para(localized(product['commercialUse'],self.locale),x,bottom-11,width,8.7,13.2,'Body',MUTED,81)
                self.rule(bottom-14,x,width)
                bottoms.append(bottom)
            top=min(bottoms)-42
        if top < 129:
            raise ValueError('Four-product corporate portfolio reaches packing note')
        image_gap=12;image_width=(CW-image_gap*3)/4;image_height=min(151,top-155)
        if image_height>=75:
            for index,product in enumerate(products):
                self.image(product['photoUrl'],M+index*(image_width+image_gap),top,image_width,image_height,contain=True)
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


class ExportProductDocument(Document):
    """An editorial product dossier, with one actual export line per spread/page."""
    def __init__(self, path, data, locale):
        super().__init__(path,data,locale,'company')
        self.kind='export-products'
        self.total=6
        self.products=data.get('coreProducts') or []
        self.copy=data['coreCopy'][locale]
        expected={'hong-tra-shan-mat','hong-tra-shan-khoi','luc-tra-shan-moc','luc-tra-ngoc-lan'}
        actual={p.get('catalogId') or p['id'] for p in self.products}
        if len(self.products)!=4 or actual!=expected:
            raise ValueError('Export product profile must contain exactly the four core catalogue products')
        self.c.setTitle(('Hồ sơ sản phẩm xuất khẩu' if locale=='vi' else 'Export Product Portfolio')+' — Hoàng Long')
        self.c.setSubject('Four core tea lines · Bulk / export · '+self.revision)

    def product_photo(self,product,x,top,width,height):
        src=product.get('photoUrl')
        if src and not src.startswith(('https:','http:')):
            self.image(src,x,top,width,height,contain=True)
            return
        self.c.setFillColor(PALE);self.c.rect(x,top-height,width,height,fill=1,stroke=0)
        self.c.setStrokeColor(LINE);self.c.rect(x+.5,top-height+.5,width-1,height-1,fill=0,stroke=1)
        self.label(self.t['photoLabel'],x+20,top-height/2+18,width-40,color=MUTED,size=6.8)
        self.para(localized(product['name'],self.locale),x+20,top-height/2-2,width-40,15,21,'Serif',GREEN,55)

    def cover(self):
        self.begin('HỒ SƠ SẢN PHẨM XUẤT KHẨU' if self.locale=='vi' else 'EXPORT PRODUCT PORTFOLIO',dark=True)
        self.label('04 / VIETNAMESE TEA',M,740,color=PALE,size=8)
        top=self.para(self.copy['title'],M,708,CW,29,39,'Serif',PAPER,118)
        top=self.para(self.copy['intro'],M,top-17,CW,10,15.5,color=PALE,max_height=95)-27
        gap=17;width=(CW-gap)/2
        image_h=150
        for start in (0,2):
            bottoms=[]
            for offset,product in enumerate(self.products[start:start+2]):
                x=M+offset*(width+gap)
                self.product_photo(product,x,top,width,image_h)
                bottom=self.para(localized(product['name'],self.locale),x,top-image_h-11,width,12,17,'SerifBold',PAPER,51)
                bottom=self.para(localized(product['category'],self.locale),x,bottom-5,width,7.3,11,color=PALE,max_height=22)
                bottoms.append(bottom)
            top=min(bottoms)-24
        if top<78:
            raise ValueError('Export cover portfolio reaches footer')
        self.end(dark=True)

    def product_page(self,product,index):
        self.begin(f'{index:02d} / '+localized(product['category'],self.locale).upper())
        title=localized(product['name'],self.locale)
        top=self.para(title,M,737,CW,30,40,'Serif',GREEN,84)
        top=self.para(localized(product['subtitle'],self.locale),M,top-12,CW,11.1,16,'Body',GOLD,49)
        top=self.para(localized(product['description'],self.locale),M,top-15,CW,9.7,14.8,max_height=94)-23
        image_h=320
        image_w=298
        self.product_photo(product,M,top,image_w,image_h)
        labels=self.copy['labels']
        aroma=localized(product.get('aroma'),self.locale)
        right_x=M+image_w+23;right_w=CW-image_w-23
        self.label(labels['form'].upper(),right_x,top-10,right_w,color=MUTED)
        self.para(localized(product['form'],self.locale),right_x,top-35,right_w,12,18,'SerifBold',GREEN,42)
        if aroma:
            self.rule(top-91,right_x,right_w)
            self.label(labels['aroma'].upper(),right_x,top-112,right_w)
            self.para(aroma,right_x,top-138,right_w,14,21,'SerifBold',GREEN,86)
        top-=image_h+25
        # Empty sensory data is not replaced with invented leaf/infusion/grade claims.
        fields=[(labels[key],localized(product.get(key),self.locale)) for key in ('taste','appearance','liquor') if localized(product.get(key),self.locale)]
        if fields:
            for label,value in fields:
                self.label(label.upper(),M,top,136,size=6.7,color=MUTED)
                top=self.para(value,M+148,top,CW-148,9,13.5,max_height=42)-15
        self.label(labels['commercialUse'].upper(),M,top,CW)
        top=self.para(localized(product['commercialUse'],self.locale),M,top-20,CW,9.6,14.7,max_height=83)-20
        self.rule(top+5)
        note=localized(product.get('lotNote'),self.locale) or self.copy['lotProfile']
        self.para(note,M,top-9,CW,7.6,11.5,color=MUTED,max_height=47)
        self.end()

    def technical_page(self):
        self.begin('05 / '+('QUY CÁCH & HỒ SƠ XUẤT KHẨU' if self.locale=='vi' else 'BULK SPECIFICATION & EXPORT RECORDS'))
        top=self.heading(self.copy['technicalTitle'],self.copy['technicalIntro'],24)
        checks=self.copy['technicalChecks']
        for item in checks:
            self.label(item['title'].upper(),M,top,142,size=6.7,color=GOLD)
            bottom=self.para(item['body'],M+157,top+1,CW-157,8.6,13,max_height=67)
            self.rule(bottom-11)
            top=bottom-26
        facts=self.copy['commercialFacts']
        gap=22; width=(CW-gap)/2
        top-=2
        for start in range(0,len(facts),2):
            row_bottom=top
            for offset,fact in enumerate(facts[start:start+2]):
                x=M+offset*(width+gap)
                self.label(fact['label'].upper(),x,top,width,size=6.5,color=MUTED)
                bottom=self.para(fact['value'],x,top-20,width,10.2,14.8,'SerifBold',GREEN,45)
                if fact.get('note'):
                    bottom=self.para(fact['note'],x,bottom-6,width,7.4,10.7,color=MUTED,max_height=66)
                row_bottom=min(row_bottom,bottom)
            top=row_bottom-20
        if top<162:
            raise ValueError('Technical matrix leaves insufficient room for commercial contact')
        self.rule(top)
        self.contact_line(M,top-17,CW-115,compact=True)
        self.qr(self.url('/company#core-export-products'),W-M-84,top-13,75)
        self.para(self.base_url.replace('https://',''),M,top-96,CW-115,8.3,12,color=MUTED,max_height=20)
        self.end()

    def build(self):
        self.cover()
        for index,product in enumerate(self.products,1):
            self.product_page(product,index)
        self.technical_page()
        if self.page!=self.total:
            raise ValueError('Export product profile page-count mismatch')
        self.c.save()
        return self.regions


def build_annex(data, output_dir, qa_dir=None):
    for locale in ('vi','en'):
        output=output_dir/f'hoang-long-product-annex-{locale}.pdf'
        regions=ExportProductDocument(output,data,locale).build()
        if qa_dir:
            (qa_dir/(output.stem+'-regions.json')).write_text(json.dumps(regions,indent=2))
        print(f'{output} ({output.stat().st_size:,} bytes; 6 pages; 4 core export teas)')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recipient', help='Optional public recipient name for a meeting-specific brief')
    parser.add_argument('--market', help='Optional destination market for a meeting-specific brief')
    parser.add_argument('--meeting-date', help='Optional meeting date in YYYY-MM-DD format')
    parser.add_argument('--input', type=Path, help='Optional JSON export of the same public editorial modules')
    parser.add_argument('--catalog-input', type=Path, help='Optional public core-product snapshot used to confirm the four catalogue IDs')
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
        snapshot=json.loads(args.catalog_input.read_text())
        source_ids={p['id'] for p in snapshot.get('products',[])}
        profile_ids={p.get('catalogId') or p['id'] for p in data['coreProducts']}
        if source_ids!=profile_ids or len(snapshot.get('products',[]))!=4:
            raise ValueError('Public catalogue snapshot does not match the four core export lines')
    build_annex(data,args.output_dir,args.qa_dir)


if __name__ == '__main__':
    main()
