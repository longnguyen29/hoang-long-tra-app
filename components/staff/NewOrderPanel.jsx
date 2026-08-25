"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Store, X } from "lucide-react";
import { fromCatalogRow, fromOrderRow, fromVariantRow, toOrderRow } from "@/lib/mappers";
import styles from "./NewOrderPanel.module.css";

const blankLine = () => ({ id: crypto.randomUUID(), productKey: "", qty: 1 });

const formatMoney = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value || 0);

function flattenProducts(products) {
  return products.flatMap((product) => {
    if (product.variants?.length) {
      return product.variants.map((variant) => ({
        key: `${product.id}__${variant.weight}`,
        productId: product.id,
        weight: variant.weight,
        line: product.line,
        name: product.name,
        price: variant.price || 0,
        available: product.available,
      }));
    }

    return [{
      key: product.id,
      productId: product.id,
      weight: null,
      line: product.line,
      name: product.name,
      price: product.price || 0,
      available: product.available,
    }];
  });
}

export default function NewOrderPanel({ supabase, onClose, onCreated }) {
  const [type, setType] = useState("retail");
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [lines, setLines] = useState(() => [blankLine()]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      const [productResult, variantResult] = await Promise.all([
        supabase.from("catalog_products").select("*").order("line"),
        supabase.from("catalog_variants").select("*"),
      ]);

      if (!active) return;
      if (productResult.error || variantResult.error) {
        setError("Chưa tải được danh mục sản phẩm.");
        setLoadingProducts(false);
        return;
      }

      const variantsByProduct = {};
      for (const row of variantResult.data || []) {
        (variantsByProduct[row.product_id] ||= []).push(fromVariantRow(row));
      }
      setProducts((productResult.data || []).map((row) => {
        const product = fromCatalogRow(row);
        product.variants = variantsByProduct[product.id] || [];
        return product;
      }));
      setLoadingProducts(false);
    }

    loadProducts();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const orderableProducts = useMemo(() => flattenProducts(products).filter((product) => product.available !== false), [products]);
  const selectedLines = useMemo(() => lines.map((line) => {
    const product = orderableProducts.find((item) => item.key === line.productKey);
    return product ? { ...line, product, qty: Math.max(1, Number(line.qty) || 1) } : null;
  }).filter(Boolean), [lines, orderableProducts]);
  const estimatedTotal = selectedLines.reduce((total, line) => total + line.product.price * line.qty, 0);
  const canSave = customerName.trim() && contact.trim() && selectedLines.length === lines.length && lines.length > 0 && !saving;

  const setLine = (id, patch) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const removeLine = (id) => setLines((current) => current.length === 1 ? current : current.filter((line) => line.id !== id));

  const createOrder = async (event) => {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const serializedLines = selectedLines.map(({ product, qty }) => ({
      name: product.weight
        ? { en: `${product.name.en || product.name.vi} (${product.weight})`, vi: `${product.name.vi || product.name.en} (${product.weight})` }
        : product.name,
      qty,
      unit: type === "wholesale" || product.line === "everyday" ? "kg" : "pcs",
      price: product.price || null,
      productId: product.productId,
      weight: product.weight,
    }));
    const draft = {
      id: `order-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}`,
      ts: now,
      type,
      customerName: customerName.trim(),
      contact: contact.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      vat: type === "retail" ? 10 : null,
      promo: null,
      note: note.trim(),
      lines: serializedLines,
      totalKg: type === "wholesale" ? selectedLines.reduce((total, line) => total + line.qty, 0) : null,
      totalItems: type === "retail" ? selectedLines.reduce((total, line) => total + line.qty, 0) : null,
      estimatedTotal: estimatedTotal || null,
      tier: null,
      paymentMethod,
      status: "pending",
      trackingCode: "",
      parcelPhoto: "",
      unread: true,
    };

    let orderId = draft.id;
    let writeError;

    if (type === "retail") {
      const result = await supabase.rpc("submit_retail_order", {
        p_customer_name: draft.customerName,
        p_contact: draft.contact,
        p_address: draft.address,
        p_tax_number: draft.taxNumber,
        p_note: draft.note,
        p_lines: draft.lines,
        p_total_items: draft.totalItems,
        p_estimated_total: draft.estimatedTotal,
        p_promo: null,
        p_payment_method: draft.paymentMethod,
      });
      writeError = result.error;
      orderId = result.data?.[0]?.id || orderId;
    } else {
      const result = await supabase.from("orders").insert(toOrderRow(draft));
      writeError = result.error;
    }

    if (writeError) {
      const message = writeError.message || "";
      setError(message.includes("out_of_stock")
        ? "Sản phẩm vừa hết hàng hoặc không còn đủ số lượng. Hãy điều chỉnh đơn."
        : "Chưa tạo được đơn. Kiểm tra thông tin và thử lại.");
      setSaving(false);
      return;
    }

    const { data, error: readError } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (readError || !data) {
      setError("Đơn đã được tạo nhưng chưa tải lại được. Hãy làm mới danh sách.");
      setSaving(false);
      return;
    }

    onCreated(fromOrderRow(data));
  };

  return <div className={styles.backdrop} onMouseDown={(event) => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <aside className={styles.panel} aria-label="Tạo đơn hàng mới" aria-modal="true" role="dialog">
      <header className={styles.header}>
        <div><p>Order intake</p><h2>Tạo đơn mới</h2></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng"><X /></button>
      </header>

      <form onSubmit={createOrder}>
        <section className={styles.typeSwitch} aria-label="Loại đơn hàng">
          <button type="button" data-active={type === "retail"} onClick={() => setType("retail")}>
            <ShoppingBag /><span><b>Đơn lẻ</b><small>Trừ tồn kho theo danh mục</small></span>{type === "retail" && <Check />}
          </button>
          <button type="button" data-active={type === "wholesale"} onClick={() => setType("wholesale")}>
            <Store /><span><b>Đơn sỉ</b><small>Số lượng tính theo kg</small></span>{type === "wholesale" && <Check />}
          </button>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}><span>01</span><h3>Khách hàng</h3></div>
          <div className={styles.fieldGrid}>
            <label>Họ tên / doanh nghiệp<input autoFocus required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nguyễn Văn A" /></label>
            <label>Điện thoại / liên hệ<input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="090…" /></label>
            <label className={styles.wide}>Địa chỉ giao hàng<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Số nhà, đường, tỉnh thành" /></label>
            <label>Mã số thuế<input value={taxNumber} onChange={(event) => setTaxNumber(event.target.value)} placeholder="Không bắt buộc" /></label>
            <label>Thanh toán<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="qr">Chuyển khoản QR</option><option value="cash">Tiền mặt</option></select></label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}><span>02</span><h3>Sản phẩm</h3></div>
          <div className={styles.lineList}>
            {lines.map((line, index) => <div className={styles.line} key={line.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <label>Sản phẩm<select required disabled={loadingProducts} value={line.productKey} onChange={(event) => setLine(line.id, { productKey: event.target.value })}>
                <option value="">{loadingProducts ? "Đang tải danh mục…" : "Chọn trà / quy cách"}</option>
                {orderableProducts.map((product) => <option key={product.key} value={product.key}>
                  {product.name.vi || product.name.en}{product.weight ? ` · ${product.weight}` : ""}{product.price ? ` · ${formatMoney(product.price)}` : " · chưa có giá"}
                </option>)}
              </select></label>
              <label>Số lượng<input required min="1" step="1" type="number" value={line.qty} onChange={(event) => setLine(line.id, { qty: event.target.value })} /></label>
              <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="Xóa sản phẩm"><Minus /></button>
            </div>)}
          </div>
          <button className={styles.addLine} type="button" onClick={() => setLines((current) => [...current, blankLine()])}><Plus /> Thêm sản phẩm</button>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}><span>03</span><h3>Ghi chú</h3></div>
          <label className={styles.note}>Thông tin cần nhớ<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Yêu cầu giao hàng, đóng gói, xuất hóa đơn…" /></label>
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.footer}>
          <div><span>{type === "retail" ? `${selectedLines.reduce((total, line) => total + line.qty, 0)} món` : `${selectedLines.reduce((total, line) => total + line.qty, 0)} kg`}</span><b>{estimatedTotal ? formatMoney(estimatedTotal) : "Chưa báo giá"}</b></div>
          <button type="submit" disabled={!canSave}>{saving ? "Đang tạo đơn…" : "Tạo đơn"}<ArrowMark /></button>
        </footer>
      </form>
    </aside>
  </div>;
}

function ArrowMark() {
  return <span aria-hidden="true">→</span>;
}
