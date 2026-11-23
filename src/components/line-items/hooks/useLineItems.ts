import * as React from 'react';
import type { LineItemBase } from '../types';

export function useLineItems<T extends LineItemBase>(initialItems: T[] = []) {
  const [items, setItems] = React.useState<T[]>(initialItems);

  const addItem = React.useCallback((item: T) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = React.useCallback((id: string, updates: Partial<T>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates } as T;
        }
        return item;
      })
    );
  }, []);

  const moveItem = React.useCallback((dragIndex: number, hoverIndex: number) => {
    setItems((prev) => {
      const result = [...prev];
      const [removed] = result.splice(dragIndex, 1);
      result.splice(hoverIndex, 0, removed);
      return result;
    });
  }, []);

  const duplicateItem = React.useCallback((id: string, generateNewId: () => string) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const itemToDuplicate = prev[index];
      const newItem = { ...itemToDuplicate, id: generateNewId() };
      const result = [...prev];
      result.splice(index + 1, 0, newItem);
      return result;
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    setItems,
    addItem,
    updateItem,
    moveItem,
    duplicateItem,
    removeItem,
  };
}
