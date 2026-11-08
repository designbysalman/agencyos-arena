'use client';

import * as React from 'react';
import { type LineItem, type BuilderTotals } from './use-builder-state';
export type { BuilderTotals };

interface DocumentPreviewProps {
  documentInfo: {
    title: string;
    number: string | null;
    contact: { firstName?: string | null; lastName?: string | null } | null;
    currency: string;
    validUntil: string | null;
    notes: string | null;
    createdAt: Date | null;
  };
  items: LineItem[];
  totals: BuilderTotals;
  isLoading: boolean;
}

function formatCurrency(value: string, currency: string): string {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DocumentPreview({ documentInfo, items, totals, isLoading }: DocumentPreviewProps) {
  const contactName = documentInfo.contact
    ? [documentInfo.contact.firstName ?? '', documentInfo.contact.lastName ?? '']
        .join(' ')
        .trim() || 'Unnamed Contact'
    : '—';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Live Preview
        </h2>
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
        )}
      </div>

      {/* A4 document preview */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 bg-canvas p-4 sm:p-6 overflow-auto">
        {/* A4 page: 210mm x 297mm, approx 794px x 1123px at 96dpi */}
        <div
          className="bg-white rounded-lg shadow-lg border border-border relative overflow-hidden max-w-[794px] w-full min-h-[1123px]"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div className="mb-12 border-b border-border pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {documentInfo.title || 'Untitled Document'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {`Proposal #${documentInfo.number ?? '—'} &bull; ${documentInfo.currency}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatDate(documentInfo.validUntil)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Issued: {formatDate(documentInfo.createdAt?.toISOString() ?? null)}
                </p>
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="mb-10">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Client
            </h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground">{contactName}</p>
              <p className="text-xs text-muted-foreground">
                Via AgencyOS &bull; {documentInfo.currency}
              </p>
            </div>
          </div>

          {/* Items table */}
          <div className="mb-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 px-4 font-medium text-right">Qty</th>
                  <th className="pb-3 px-4 font-medium text-right">Unit Price</th>
                  <th className="pb-3 px-4 font-medium text-right">Tax %</th>
                  <th className="pb-3 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No line items
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const qty = Number(item.quantity || 0);
                    const price = Number(item.unitPrice || 0);
                    const rate = Number(item.taxRate || 0);
                    const amount = qty * price;
                    const tax = amount * (rate / 100);
                    const total = amount + tax;

                    return (
                      <tr key={item.id} className="border-b border-border">
                        <td className="py-3 text-sm">{item.description || '—'}</td>
                        <td className="py-3 px-4 text-sm text-right">{qty.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(price.toFixed(2), documentInfo.currency)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">{rate.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {formatCurrency(total.toFixed(2), documentInfo.currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-10">
            <div className="flex justify-end">
              <table className="text-right">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-4 text-sm text-muted-foreground">Subtotal</td>
                    <td className="py-2 px-4 text-sm font-medium">
                      {formatCurrency(totals.subtotal, documentInfo.currency)}
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-4 text-sm text-muted-foreground">Tax</td>
                    <td className="py-2 px-4 text-sm font-medium">
                      {formatCurrency(totals.tax, documentInfo.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 text-sm font-bold text-foreground">Total</td>
                    <td className="py-2 px-4 text-sm font-bold text-accent">
                      {formatCurrency(totals.total, documentInfo.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {documentInfo.notes && (
            <div className="mt-10 pt-6 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Notes &amp; Terms
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap text-foreground">{documentInfo.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Generated by AgencyOS &bull; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center">
        A4 preview — updates live as you edit. Print-friendly layout.
      </div>
    </div>
  );
}
