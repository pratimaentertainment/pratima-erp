export interface LineItemBase {
  id: string;
  productId: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}
