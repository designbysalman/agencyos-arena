'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type LineItem, type BuilderTotals } from './use-builder-state';
export type { LineItem };

interface LineItemEditorProps {
  items: LineItem[];
  totals: BuilderTotals;
  currency: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof LineItem, value: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  isLoading: boolean;
  errors?: Record<string, string>;
}

function formatCurrency(value: string, currency: string): string {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function LineItemEditor({
  items,
  totals,
  currency,
  onAdd,
  onRemove,
  onUpdate,
  onReorder,
  isLoading,
  errors = {},
}: LineItemEditorProps) {
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    onReorder(dragIndex, targetIndex);
    setDragIndex(null);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Line Items
          </h2>
          <p className="text-xs text-muted-foreground">
            Totals are calculated server-side. All amounts in {currency}.
          </p>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          disabled={isLoading}
          size="sm"
          className="text-accent hover:text-accent/90 flex items-center gap-1"
        >
          <span className="text-lg">+</span> Add Item
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-background">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Description</th>
              <th className="py-3 px-4 font-medium text-right">Quantity</th>
              <th className="py-3 px-4 font-medium text-right">Unit Price</th>
              <th className="py-3 px-4 font-medium text-right">Tax %</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium w-12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => {
              const itemAmount = Number(item.quantity) * Number(item.unitPrice || 0);
              const itemTax = itemAmount * (Number(item.taxRate || 0) / 100);
              const itemTotal = itemAmount + itemTax;
              const isInvalid = !!errors[item.id];
              const isDragging = dragIndex === index;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    isDragging ? 'opacity-50' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs text-muted-foreground select-none cursor-grab active:cursor-grabbing"
                        style={{ userSelect: 'none' }}
                      >
                        ⋮⋮
                      </span>
                      <Input
                        value={item.description}
                        onChange={(e) => onUpdate(item.id, 'description', e.target.value)}
                        disabled={isLoading}
                        placeholder="Description"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-invalid={isInvalid}
                        aria-describedby={isInvalid ? `error-${item.id}` : undefined}
                      />
                      {isInvalid && errors[item.id] && (
                        <p id={`error-${item.id}`} className="text-xs text-destructive mt-1">
                          {errors[item.id]}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => onUpdate(item.id, 'quantity', e.target.value)}
                      disabled={isLoading}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => onUpdate(item.id, 'unitPrice', e.target.value)}
                      disabled={isLoading}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.taxRate}
                      onChange={(e) => onUpdate(item.id, 'taxRate', e.target.value)}
                      disabled={isLoading}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-right shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-muted-foreground">
                    {formatCurrency(itemTotal.toFixed(2), currency)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      disabled={isLoading || items.length === 1}
                      variant="destructive"
                      size="sm"
                      className="text-xs px-2 py-1.5"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No line items. Add an item to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border pt-4 flex justify-end space-x-2">
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="text-sm text-muted-foreground">Tax</p>
          <p className="text-sm font-bold border-t border-border pt-1">Total</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium">{formatCurrency(totals.subtotal, currency)}</p>
          <p className="text-sm font-medium">{formatCurrency(totals.tax, currency)}</p>
          <p className="text-sm font-bold text-accent">{formatCurrency(totals.total, currency)}</p>
        </div>
      </div>
    </section>
  );
}
