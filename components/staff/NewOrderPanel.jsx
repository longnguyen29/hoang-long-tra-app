"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Store, X } from "lucide-react";
import { fromCatalogRow, fromOrderRow, fromVariantRow, toOrderRow } from "@/lib/mappers";
import styles from "./NewOrderPanel.module.css";
import FormattedNumberInput from "@/components/FormattedNumberInput";

const blankLine = () => ({ id: crypto.randomUUID(), productKey: "", qty: 1, unitPrice: "" });

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
        price: variant.price ?? null,
        available: product.available,
      }));
    }
    return [{
      key: product.id,
      productId: product.id,
      weight: null,
      line: product.line,
      name: product.name,
      price: product.price ?? null,
      available: product.available,
    }];
  });
}

export default function NewOrderPanel({ supabase, onClose, onCreated }) {
  const [step, setStep] = useState("edit");
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

  const orderableProducts = useMemo(
    () => flattenProducts(products).filter((product) => product.available !== false),
    [products]
  );
  const selectedLines = useMemo(() => lines.map((line) => {
    const product = orderableProducts.find((item) => item.key === line.productKey);
    if (!product) return null;
    const enteredPrice = line.unitPrice === "" ? null : Number(line.unitPrice);
    const price = type === "wholesale" ? enteredPrice : product.price;
    return {
      ...line,
      product,
      qty: Math.max(1, Number(line.qty) || 1),
      price: Number.isFinite(price) ? price : null,
      unit: type === "wholesale" || product.line === "everyday" ? "kg" : "pcs",
    };
  }).filter(Boolean), [lines, orderableProducts, type]);

  const allLinesPriced = selectedLines.length > 0 && selectedLines.every((line) => line.price !== null);
  const estimatedTotal = allLinesPriced
    ? selectedLines.reduce((total, line) => total + line.price * line.qty, 0)
    : null;
  const canReview = Boolean(
    customerName.trim()
    && contact.trim()
    && selectedLines.length === lines.length
    && lines.length > 0
    && !saving
  );
  const unitSummary = useMemo(() => {
    const totals = selectedLines.reduce((result, line) => {
      result[line.unit] = (result[line.unit] || 0) + line.qty;
      return result;
    }, {});
    return [totals.kg ? `${totals.kg} kg` : "", totals.pcs ? `${totals.pcs} gói` : ""]
      .filter(Boolean)
      .join(" · ") || "Chưa chọn sản phẩm";
  }, [selectedLines]);

  const setLine = (id, patch) => setLines((current) => current.map((line) => (
    line.id === id ? { ...line, ...patch } : line
  )));
  const removeLine = (id) => setLines((current) => (
    current.length === 1 ? current : current.filter((line) => line.id !== id)
  ));
  const selectProduct = (lineId, productKey) => {
    const product = orderableProducts.find((item) => item.key === productKey);
    setLine(lineId, {
      productKey,
      unitPrice: type === "wholesale" && product?.price !== null ? product.price : "",
    });
  };
  const changeType = (nextType) => {
    setType(nextType);
    setStep("edit");
    if (nextType === "wholesale") {
      setLines((current) => current.map((line) => {
        const product = orderableProducts.find((item) => item.key === line.productKey);
        return { ...line, unitPrice: product?.price ?? "" };
      }));
    }
  };

  const createOrder = async () => {
    if (!canReview || step !== "review") return;
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const serializedLines = selectedLines.map(({ product, qty, price, unit }) => ({
      name: product.weight
        ? {
          en: `${product.name.en || product.name.vi} (${product.weight})`,
          vi: `${product.name.vi || product.name.en} (${product.weight})`,
        }
        : product.name,
      qty,
      unit,
      price,
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
      estimatedTotal,
      tier: null,
      paymentMethod,
      status: "pending",
      stage: "new_order",
      health: "on_track",
      waitingOn: null,
      healthNote: "",
      healthChangedAt: now,
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
        ? "Sản phẩm vừa hết hàng hoặc không còn đủ số lượng. Hãy quay lại điều chỉnh đơn."
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

  const submit = (event) => {
    event.preventDefault();
    if (!canReview) return;
    if (step === "edit") {
      setError("");
      setStep("review");
      return;
    }
    createOrder();
  };

  return <div className={styles.backdrop} onMouseDown={(event) => {
    if (event.target === event.currentTarget && !saving) onClose();
  }}>
    <aside className={styles.panel} aria-label="Tạo đơn hàng mới" aria-modal="true" role="dialog">
      <header className={styles.header}>
        <div><p>{step === "edit" ? "Order intake" : "Final check"}</p><h2>{step === "edit" ? "Tạo đơn mới" : "Kiểm tra trước khi tạo"}</h2></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng"><X /></button>
      </header>
      <form onSubmit={submit}>
        {step === "edit" ? <>
          <section className={styles.typeSwitch} aria-label="Loại đơn hàng">
            <button type="button" data-active={type === "retail"} onClick={() => changeType("retail")}>
              <ShoppingBag /><span><b>Đơn lẻ</b><small>Trừ tồn kho khi xác nhận tạo</small></span>{type === "retail" && <Check />}
            </button>
            <button type="button" data-active={type === "wholesale"} onClick={() => changeType("wholesale")}>
              <Store /><span><b>Đơn sỉ</b><small>Nhập giá riêng cho khách nếu cần</small></span>{type === "wholesale" && <Check />}
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
              {lines.map((line, index) => <div className={styles.line} data-wholesale={type === "wholesale"} key={line.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <label>Sản phẩm<select required disabled={loadingProducts} value={line.productKey} onChange={(event) => selectProduct(line.id, event.target.value)}>
                  <option value="">{loadingProducts ? "Đang tải danh mục…" : "Chọn trà / quy cách"}</option>
                  {orderableProducts.map((product) => <option key={product.key} value={product.key}>{product.name.vi || product.name.en}{product.weight ? ` · ${product.weight}` : ""}{product.price !== null ? ` · ${formatMoney(product.price)}` : " · chưa có giá"}</option>)}
                </select></label>
                <label>Số lượng<FormattedNumberInput required min="1" step="1" value={line.qty} onChange={(event) => setLine(line.id, { qty: event.target.value })} /></label>
                {type === "wholesale" && <label>Giá bán / kg<FormattedNumberInput min="0" step="1000" value={line.unitPrice} onChange={(event) => setLine(line.id, { unitPrice: event.target.value })} placeholder="Chưa báo giá" /></label>}
                <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length === 1} aria-label="Xóa sản phẩm"><Minus /></button>
              </div>)}
            </div>
            <button className={styles.addLine} type="button" onClick={() => setLines((current) => [...current, blankLine()])}><Plus /> Thêm sản phẩm</button>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionTitle}><span>03</span><h3>Ghi chú</h3></div>
            <label className={styles.note}>Thông tin cần nhớ<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Yêu cầu giao hàng, đóng gói, xuất hóa đơn…" /></label>
          </section>
        </> : <section className={styles.review}>
          <p className={styles.reviewIntro}>Sau khi xác nhận, đơn sẽ vào bước <b>Đơn mới</b>{type === "retail" ? " và tồn kho sẽ được trừ ngay" : ""}.</p>
          <dl>
            <div><dt>Loại đơn</dt><dd>{type === "retail" ? "Đơn lẻ" : "Đơn sỉ"}</dd></div>
            <div><dt>Khách hàng</dt><dd>{customerName.trim()}</dd></div>
            <div><dt>Liên hệ</dt><dd>{contact.trim()}</dd></div>
            <div><dt>Giao đến</dt><dd>{address.trim() || "Chưa ghi địa chỉ"}</dd></div>
            <div><dt>Thanh toán</dt><dd>{paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản QR"}</dd></div>
          </dl>
          <div className={styles.reviewLines}>
            {selectedLines.map((line) => <article key={line.id}>
              <span><b>{line.product.name.vi || line.product.name.en}{line.product.weight ? ` · ${line.product.weight}` : ""}</b><small>{line.qty} {line.unit} × {line.price === null ? "chưa báo giá" : formatMoney(line.price)}</small></span>
              <b>{line.price === null ? "—" : formatMoney(line.price * line.qty)}</b>
            </article>)}
          </div>
          {note.trim() && <div className={styles.reviewNote}><span>Ghi chú</span><p>{note.trim()}</p></div>}
          <button className={styles.backToEdit} type="button" disabled={saving} onClick={() => setStep("edit")}><ArrowLeft /> Quay lại chỉnh đơn</button>
        </section>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <footer className={styles.footer}>
          <div><span>{unitSummary}</span><b>{estimatedTotal === null ? "Chưa đủ giá" : formatMoney(estimatedTotal)}</b></div>
          <button type="submit" disabled={!canReview}>{saving ? "Đang tạo đơn…" : step === "edit" ? "Kiểm tra đơn" : "Xác nhận tạo đơn"}<ArrowMark /></button>
        </footer>
      </form>
    </aside>
  </div>;
}

function ArrowMark() {
  return <span aria-hidden="true">→</span>;
}
