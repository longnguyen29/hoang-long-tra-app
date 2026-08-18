// Document HTML builders — invoice (moved out of TeaConsole's old inline printInvoice,
// behaviour unchanged) and the new packing slip, plus the shared print-window helper both use.
//
// Deliberately still "browser print → Save as PDF", not a PDF-generation library: no new
// dependency, and it's the same mechanism staff already use today for invoices, just now with
// a live preview first (see components/DocumentModal.jsx) instead of a blind popup.

// Escape user-controlled text before interpolating into raw HTML — without this, a malicious
// order name/address/note could run arbitrary script in the admin's browser when printing.
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DOC_STYLE = `
  body{font-family:Georgia,serif;color:#1C2B24;padding:40px;max-width:600px;margin:0 auto;}
  table{width:100%;border-collapse:collapse;}
  .seal{width:48px;height:48px;border-radius:50%;border:1.5px solid #AD8A4E;display:flex;align-items:center;justify-content:center;font-size:18px;color:#AD8A4E;margin-bottom:12px;}
  .brand{font-size:22px;font-weight:600;margin-bottom:2px;}
  .meta{font-size:13px;color:#2E4A40;margin-bottom:24px;}
  hr{border:none;border-top:1px solid #AD8A4E55;margin:16px 0;}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#AD8A4E;margin:0 0 10px;}
`;

// Unchanged from the original printInvoice — same markup, same copy, same disclaimer.
export function buildInvoiceHtml(order) {
  const itemRows = order.lines
    .map((l) => `<tr><td style="padding:8px 0;">${esc(l.name.en || l.name.vi)}${l.price ? ` <span style="color:#AD8A4E;">(${l.price.toLocaleString("vi-VN")}đ)</span>` : ""}</td><td style="padding:8px 0;text-align:right;">${l.qty} ${l.unit === "kg" ? "kg" : l.unit === "pack" ? "pack" : "pcs"}${l.price ? ` = ${(l.price * l.qty).toLocaleString("vi-VN")}đ` : ""}</td></tr>`)
    .join("");
  const totalLine =
    order.type === "retail"
      ? `<tr><td style="padding:10px 0;font-weight:700;">Total items</td><td style="padding:10px 0;text-align:right;font-weight:700;">${order.totalItems} pcs</td></tr>`
      : `<tr><td style="padding:10px 0;font-weight:700;">Total volume</td><td style="padding:10px 0;text-align:right;font-weight:700;">${order.totalKg} kg</td></tr>
         <tr><td colspan="2" style="padding:2px 0 10px;color:#AD8A4E;">${esc(order.tier.range.en)} · ${esc(order.tier.off.en)}</td></tr>`;
  const estimatedTotalLine = order.estimatedTotal
    ? `<tr><td style="padding:6px 0;font-weight:700;color:#AD8A4E;">Estimated total</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#AD8A4E;">${order.estimatedTotal.toLocaleString("vi-VN")}đ</td></tr>`
    : "";
  const promoLine = order.promo ? `<tr><td colspan="2" style="padding:2px 0 10px;color:#9C3B2E;">Promo: ${esc(order.promo.code)} (-${order.promo.percent}%)</td></tr>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(order.id)}</title>
    <style>${DOC_STYLE}</style></head>
    <body>
      <div class="seal">皇龍</div>
      <div class="brand">House of Hoàng Long</div>
      <div class="meta">Invoice · Order ${esc(order.id)}<br/>${esc(new Date(order.ts).toLocaleString("vi-VN"))}</div>
      <hr/>
      <h2>Customer</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${esc(order.customerName)}<br/>${esc(order.contact)}${order.address ? `<br/>${esc(order.address)}` : ""}${order.taxNumber ? `<br/>Tax No: ${esc(order.taxNumber)}` : ""}
      </p>
      <h2>Items</h2>
      <table>${itemRows}${totalLine}${estimatedTotalLine}${promoLine}</table>
      ${order.note ? `<p style="font-size:13px;font-style:italic;color:#2E4A40;margin-top:16px;">Note: ${esc(order.note)}</p>` : ""}
      <hr/>
      <p style="font-size:11px;color:#2E4A40;">This is a preliminary invoice. Final pricing is confirmed by our team.</p>
    </body></html>`;
}

// New: a packing slip — what's going in the box, not what it costs. No prices at all (a
// packer checking off items shouldn't be reading pricing off the same sheet a customer might
// glimpse), plus a checklist the packer can physically tick and a tracking-code line to fill
// in by hand if it isn't captured yet.
export function buildPackingSlipHtml(order) {
  const itemRows = order.lines
    .map((l) => `<tr><td style="padding:8px 0;width:24px;"><span style="display:inline-block;width:14px;height:14px;border:1.5px solid #AD8A4E;border-radius:3px;"></span></td><td style="padding:8px 0;">${esc(l.name.en || l.name.vi)}</td><td style="padding:8px 0;text-align:right;">${l.qty} ${l.unit === "kg" ? "kg" : l.unit === "pack" ? "pack" : "pcs"}</td></tr>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Packing Slip ${esc(order.id)}</title>
    <style>${DOC_STYLE}</style></head>
    <body>
      <div class="seal">皇龍</div>
      <div class="brand">House of Hoàng Long</div>
      <div class="meta">Packing Slip · Order ${esc(order.id)}<br/>${esc(new Date(order.ts).toLocaleString("vi-VN"))}</div>
      <hr/>
      <h2>Ship to</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${esc(order.customerName)}<br/>${esc(order.contact)}${order.address ? `<br/>${esc(order.address)}` : ""}
      </p>
      <h2>Items to pack</h2>
      <table>${itemRows}</table>
      <hr/>
      <h2>Tracking code</h2>
      <p style="font-size:14px;">${order.trackingCode ? esc(order.trackingCode) : "_________________________"}</p>
      ${order.note ? `<p style="font-size:13px;font-style:italic;color:#2E4A40;margin-top:16px;">Note: ${esc(order.note)}</p>` : ""}
      <hr/>
      <p style="font-size:11px;color:#2E4A40;">Internal document — not shown to the customer.</p>
    </body></html>`;
}

// Shared by the quick "Print invoice" button and the Documents preview modal.
export function printHtml(html) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}
