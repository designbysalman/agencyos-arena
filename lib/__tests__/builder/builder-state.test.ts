/**
 * Unit tests for the Proposal/Quotation builder state management.
 *
 * Tests cover:
 * - Pure utility functions (money math)
 * - Hook behavior via renderHook
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useBuilderState,
  calculateTotals,
  toCents,
  parseDecimal,
  formatMoney,
  type LineItem,
} from '@/components/builder/use-builder-state';

describe('Money math utilities', () => {
  it('toCents should convert decimal strings to integer cents', () => {
    expect(toCents('10.00')).toBe(1000);
    expect(toCents('0.99')).toBe(99);
    expect(toCents('100.00')).toBe(10000);
    expect(toCents('0.30')).toBe(30);
  });

  it('parseDecimal should handle invalid strings', () => {
    expect(parseDecimal('abc')).toBe(0);
    expect(parseDecimal('')).toBe(0);
    expect(parseDecimal('10.50')).toBe(10.5);
  });

  it('formatMoney should format cents as 2-decimal string', () => {
    expect(formatMoney(1000)).toBe('10.00');
    expect(formatMoney(99)).toBe('0.99');
    expect(formatMoney(0)).toBe('0.00');
  });

  it('calculateTotals standalone function', () => {
    const items: LineItem[] = [
      { id: 'a', description: 'A', quantity: '2', unitPrice: '15.00', taxRate: '8', sortOrder: 0 },
    ];
    // 2 * 15.00 = 30.00, tax = 30.00 * 8% = 2.40, total = 32.40
    const totals = calculateTotals(items);
    expect(totals.subtotal).toBe('30.00');
    expect(totals.tax).toBe('2.40');
    expect(totals.total).toBe('32.40');
    expect(totals.subtotalCents).toBe(3000);
    expect(totals.taxCents).toBe(240);
    expect(totals.totalCents).toBe(3240);
  });

  it('should handle floating-point edge cases without precision loss', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        { id: 'a', description: 'A', quantity: '3', unitPrice: '0.10', taxRate: '0', sortOrder: 0 },
      ])
    );
    // 3 * 0.10 = 0.30 (not 0.30000000000000004)
    expect(result.result.current.totals.subtotal).toBe('0.30');
    expect(result.result.current.totals.total).toBe('0.30');
  });
});

describe('Builder state - initialization (via renderHook)', () => {
  it('should initialize with default document info', () => {
    const result = renderHook(() => useBuilderState());
    expect(result.result.current.documentInfo.title).toBe('');
    expect(result.result.current.documentInfo.currency).toBe('USD');
    expect(result.result.current.documentInfo.status).toBe('draft');
    expect(result.result.current.documentInfo.contactId).toBeNull();
    expect(result.result.current.documentInfo.opportunityId).toBeNull();
  });

  it('should initialize with one empty line item', () => {
    const result = renderHook(() => useBuilderState());
    expect(result.result.current.lineItems).toHaveLength(1);
    expect(result.result.current.lineItems[0].description).toBe('');
    expect(result.result.current.lineItems[0].quantity).toBe('1');
    expect(result.result.current.lineItems[0].unitPrice).toBe('0');
    expect(result.result.current.lineItems[0].taxRate).toBe('0');
  });

  it('should accept custom initial values', () => {
    const result = renderHook(() =>
      useBuilderState({ title: 'Custom Proposal', currency: 'EUR' }, [
        {
          id: 'item-1',
          description: 'Custom item',
          quantity: '2',
          unitPrice: '50.00',
          taxRate: '10',
          sortOrder: 0,
        },
      ])
    );
    expect(result.result.current.documentInfo.title).toBe('Custom Proposal');
    expect(result.result.current.documentInfo.currency).toBe('EUR');
    expect(result.result.current.lineItems).toHaveLength(1);
    expect(result.result.current.lineItems[0].description).toBe('Custom item');
  });
});

describe('Builder state - document info updates', () => {
  it('should update document info fields', () => {
    const result = renderHook(() => useBuilderState());
    act(() => {
      result.result.current.setDocumentInfo({ title: 'New Title', currency: 'GBP' });
    });
    expect(result.result.current.documentInfo.title).toBe('New Title');
    expect(result.result.current.documentInfo.currency).toBe('GBP');
    expect(result.result.current.isDirty).toBe(true);
  });

  it('should clear error on document info update', () => {
    const result = renderHook(() => useBuilderState());
    act(() => {
      result.result.current.setError('Some error');
    });
    expect(result.result.current.error).toBe('Some error');
    act(() => {
      result.result.current.setDocumentInfo({ title: 'New Title' });
    });
    expect(result.result.current.error).toBe(null);
  });

  it('should mark as dirty on any change', () => {
    const result = renderHook(() => useBuilderState());
    expect(result.result.current.isDirty).toBe(false);
    act(() => {
      result.result.current.setDocumentInfo({ title: 'Test' });
    });
    expect(result.result.current.isDirty).toBe(true);
    act(() => {
      result.result.current.addLineItem();
    });
    expect(result.result.current.isDirty).toBe(true);
  });
});

describe('Builder state - line items', () => {
  it('should add a line item', () => {
    const result = renderHook(() => useBuilderState());
    const initialLength = result.result.current.lineItems.length;
    act(() => {
      result.result.current.addLineItem();
    });
    expect(result.result.current.lineItems).toHaveLength(initialLength + 1);
    const last = result.result.current.lineItems[result.result.current.lineItems.length - 1];
    expect(last.description).toBe('');
    expect(last.quantity).toBe('1');
    expect(last.sortOrder).toBe(initialLength);
  });

  it('should remove a line item', () => {
    const result = renderHook(() => useBuilderState());
    const id = result.result.current.lineItems[0].id;
    act(() => {
      result.result.current.removeLineItem(id);
    });
    expect(result.result.current.lineItems).toHaveLength(0);
    expect(result.result.current.lineItems.find((i) => i.id === id)).toBeUndefined();
  });

  it('should update a line item field', () => {
    const result = renderHook(() => useBuilderState());
    const id = result.result.current.lineItems[0].id;
    act(() => {
      result.result.current.updateLineItem(id, 'description', 'Consulting Services');
      result.result.current.updateLineItem(id, 'quantity', '3');
      result.result.current.updateLineItem(id, 'unitPrice', '150.00');
      result.result.current.updateLineItem(id, 'taxRate', '5');
    });
    const item = result.result.current.lineItems.find((i) => i.id === id);
    expect(item?.description).toBe('Consulting Services');
    expect(item?.quantity).toBe('3');
    expect(item?.unitPrice).toBe('150.00');
    expect(item?.taxRate).toBe('5');
  });

  it('should reorder line items', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        {
          id: 'a',
          description: 'First',
          quantity: '1',
          unitPrice: '10',
          taxRate: '0',
          sortOrder: 0,
        },
        {
          id: 'b',
          description: 'Second',
          quantity: '1',
          unitPrice: '20',
          taxRate: '0',
          sortOrder: 1,
        },
        {
          id: 'c',
          description: 'Third',
          quantity: '1',
          unitPrice: '30',
          taxRate: '0',
          sortOrder: 2,
        },
      ])
    );
    act(() => {
      result.result.current.reorderLineItems(0, 2);
    });
    expect(result.result.current.lineItems[0].id).toBe('b');
    expect(result.result.current.lineItems[1].id).toBe('c');
    expect(result.result.current.lineItems[2].id).toBe('a');
    // Sort orders should be recomputed
    expect(result.result.current.lineItems[0].sortOrder).toBe(0);
    expect(result.result.current.lineItems[1].sortOrder).toBe(1);
    expect(result.result.current.lineItems[2].sortOrder).toBe(2);
  });

  it('should set line items wholesale', () => {
    const result = renderHook(() => useBuilderState());
    const newItems: LineItem[] = [
      { id: 'x', description: 'X', quantity: '1', unitPrice: '100', taxRate: '0', sortOrder: 0 },
    ];
    act(() => {
      result.result.current.setLineItems(newItems);
    });
    expect(result.result.current.lineItems).toHaveLength(1);
    expect(result.result.current.lineItems[0].id).toBe('x');
  });
});

describe('Builder state - totals calculation (integer-cent)', () => {
  it('should calculate subtotal from line items', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        {
          id: 'a',
          description: 'A',
          quantity: '2',
          unitPrice: '10.00',
          taxRate: '0',
          sortOrder: 0,
        },
        {
          id: 'b',
          description: 'B',
          quantity: '1',
          unitPrice: '25.50',
          taxRate: '0',
          sortOrder: 1,
        },
      ])
    );
    // 2 * 10.00 = 20.00, 1 * 25.50 = 25.50, subtotal = 45.50
    expect(result.result.current.totals.subtotal).toBe('45.50');
    expect(result.result.current.totals.subtotalCents).toBe(4550);
  });

  it('should calculate tax from line items', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        {
          id: 'a',
          description: 'A',
          quantity: '1',
          unitPrice: '100.00',
          taxRate: '10',
          sortOrder: 0,
        },
      ])
    );
    // 1 * 100.00 = 100.00, tax = 100.00 * 10% = 10.00
    expect(result.result.current.totals.tax).toBe('10.00');
    expect(result.result.current.totals.taxCents).toBe(1000);
  });

  it('should calculate total as subtotal + tax', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        {
          id: 'a',
          description: 'A',
          quantity: '2',
          unitPrice: '50.00',
          taxRate: '10',
          sortOrder: 0,
        },
      ])
    );
    // 2 * 50.00 = 100.00, tax = 100.00 * 10% = 10.00, total = 110.00
    expect(result.result.current.totals.total).toBe('110.00');
    expect(result.result.current.totals.totalCents).toBe(11000);
  });

  it('should handle zero values', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        { id: 'a', description: 'Free', quantity: '1', unitPrice: '0', taxRate: '0', sortOrder: 0 },
      ])
    );
    expect(result.result.current.totals.subtotal).toBe('0.00');
    expect(result.result.current.totals.tax).toBe('0.00');
    expect(result.result.current.totals.total).toBe('0.00');
  });

  it('should recalculate totals when line items change', () => {
    const result = renderHook(() =>
      useBuilderState({}, [
        {
          id: 'a',
          description: 'A',
          quantity: '1',
          unitPrice: '10.00',
          taxRate: '0',
          sortOrder: 0,
        },
      ])
    );
    expect(result.result.current.totals.subtotal).toBe('10.00');
    act(() => {
      result.result.current.addLineItem();
    });
    act(() => {
      result.result.current.updateLineItem(
        result.result.current.lineItems[1].id,
        'description',
        'B'
      );
      result.result.current.updateLineItem(result.result.current.lineItems[1].id, 'quantity', '1');
      result.result.current.updateLineItem(
        result.result.current.lineItems[1].id,
        'unitPrice',
        '20.00'
      );
    });
    // 10.00 + 20.00 = 30.00
    expect(result.result.current.totals.subtotal).toBe('30.00');
  });
});

describe('Builder state - save/done lifecycle', () => {
  it('should mark as saved and clear dirty', () => {
    const result = renderHook(() => useBuilderState());
    act(() => {
      result.result.current.setDocumentInfo({ title: 'Dirty' });
    });
    expect(result.result.current.isDirty).toBe(true);
    act(() => {
      result.result.current.markSaved();
    });
    expect(result.result.current.isDirty).toBe(false);
  });

  it('should reset to initial state', () => {
    const result = renderHook(() =>
      useBuilderState({ title: 'Test' }, [
        { id: 'x', description: 'X', quantity: '1', unitPrice: '10', taxRate: '0', sortOrder: 0 },
      ])
    );
    act(() => {
      result.result.current.setDocumentInfo({ title: 'Changed' });
      result.result.current.addLineItem();
    });
    expect(result.result.current.isDirty).toBe(true);
    act(() => {
      result.result.current.reset();
    });
    expect(result.result.current.isDirty).toBe(false);
    expect(result.result.current.documentInfo.title).toBe('');
    expect(result.result.current.lineItems).toHaveLength(1);
  });

  it('should set and clear error', () => {
    const result = renderHook(() => useBuilderState());
    act(() => {
      result.result.current.setError('Something went wrong');
    });
    expect(result.result.current.error).toBe('Something went wrong');
    act(() => {
      result.result.current.setError(null);
    });
    expect(result.result.current.error).toBe(null);
  });

  it('should set saving state', () => {
    const result = renderHook(() => useBuilderState());
    act(() => {
      result.result.current.setIsSaving(true);
    });
    expect(result.result.current.isSaving).toBe(true);
    act(() => {
      result.result.current.setIsSaving(false);
    });
    expect(result.result.current.isSaving).toBe(false);
  });
});
