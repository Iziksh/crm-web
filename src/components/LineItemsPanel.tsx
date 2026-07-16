import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Field } from "./FormField";
import type { ProductResponse } from "../api/products";
import "./LineItemsPanel.css";

export interface LineItemLike {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  lineTotal: number;
}

export function LineItemsPanel({
  lineItems,
  products,
  onAdd,
  onRemove,
  adding,
}: {
  lineItems: LineItemLike[];
  products: ProductResponse[] | undefined;
  onAdd: (item: { productName: string; quantity: number; unitPrice: number; discountPct: number }) => void;
  onRemove: (lineId: number) => void;
  adding: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");

  function reset() {
    setProductId("");
    setProductName("");
    setQuantity("1");
    setUnitPrice("0");
    setDiscountPct("0");
  }

  function handleProductSelect(id: string) {
    setProductId(id);
    const p = products?.find((p) => p.id === Number(id));
    if (p) {
      setProductName(p.name);
      setUnitPrice(p.unitPrice.toString());
    }
  }

  function handleAdd() {
    if (!productName.trim()) return;
    onAdd({
      productName: productName.trim(),
      quantity: Number(quantity) || 0,
      unitPrice: Number(unitPrice) || 0,
      discountPct: Number(discountPct) || 0,
    });
    reset();
    setShowAdd(false);
  }

  return (
    <div className="line-items-panel">
      <div className="line-items-header">
        <h4>Line items</h4>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add item
        </button>
      </div>

      {lineItems.length === 0 && <p className="line-items-empty">No line items yet.</p>}

      {lineItems.length > 0 && (
        <div className="line-items-table">
          <div className="line-items-row line-items-head">
            <span>Product</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span>Discount</span>
            <span>Total</span>
            <span></span>
          </div>
          {lineItems.map((item) => (
            <div className="line-items-row" key={item.id}>
              <span>{item.productName}</span>
              <span>{item.quantity}</span>
              <span>{item.unitPrice}</span>
              <span>{item.discountPct}%</span>
              <span>{item.lineTotal}</span>
              <span>
                <button type="button" className="icon-btn icon-btn-danger" onClick={() => onRemove(item.id)}>
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal
          title="Add line item"
          onClose={() => setShowAdd(false)}
          width={420}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={adding || !productName.trim()}>
                {adding ? "Adding…" : "Add"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <label className="field field-span-2">
              <span>Product (optional)</span>
              <select value={productId} onChange={(e) => handleProductSelect(e.target.value)}>
                <option value="">Type manually…</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
            </label>
            <Field label="Product name" value={productName} onChange={setProductName} span2 required />
            <Field label="Quantity" type="number" value={quantity} onChange={setQuantity} />
            <Field label="Unit price" type="number" value={unitPrice} onChange={setUnitPrice} />
            <Field label="Discount %" type="number" value={discountPct} onChange={setDiscountPct} />
          </div>
        </Modal>
      )}
    </div>
  );
}
