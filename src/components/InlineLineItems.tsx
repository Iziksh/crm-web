import { Plus, Trash2 } from "lucide-react";
import "./InlineLineItems.css";

export interface InlineLineItem {
  productOrService: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export const EMPTY_LINE_ITEM: InlineLineItem = { productOrService: "", description: "", quantity: "1", unitPrice: "0" };

export function InlineLineItems({
  items,
  onChange,
}: {
  items: InlineLineItem[];
  onChange: (items: InlineLineItem[]) => void;
}) {
  function update(index: number, patch: Partial<InlineLineItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, { ...EMPTY_LINE_ITEM }]);
  }

  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  return (
    <div className="inline-line-items">
      <div className="inline-line-items-header">
        <span>Line items</span>
        <button type="button" className="btn btn-secondary btn-small" onClick={add}>
          <Plus size={14} /> Add row
        </button>
      </div>

      {items.map((item, i) => (
        <div className="inline-line-item-row" key={i}>
          <input
            placeholder="Product / service"
            value={item.productOrService}
            onChange={(e) => update(i, { productOrService: e.target.value })}
          />
          <input
            placeholder="Description"
            value={item.description}
            onChange={(e) => update(i, { description: e.target.value })}
          />
          <input
            type="number"
            placeholder="Qty"
            value={item.quantity}
            onChange={(e) => update(i, { quantity: e.target.value })}
          />
          <input
            type="number"
            placeholder="Unit price"
            value={item.unitPrice}
            onChange={(e) => update(i, { unitPrice: e.target.value })}
          />
          <button type="button" className="icon-btn icon-btn-danger" onClick={() => remove(i)}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {items.length > 0 && <div className="inline-line-items-total">Subtotal: {total.toFixed(2)}</div>}
    </div>
  );
}
