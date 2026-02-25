import { formatCurrency } from './format';

export const currencyFormatter = (val: number | undefined) => formatCurrency(val ?? 0);