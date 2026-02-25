import type { TFunction } from 'i18next';

const DEFAULT_CATEGORY_KEYS: Record<string, string> = {
  // Expense categories (Portuguese)
  'Moradia': 'categories.housing',
  'Alimentação': 'categories.food',
  'Transporte': 'categories.transport',
  'Saúde': 'categories.health',
  'Educação': 'categories.education',
  'Entretenimento': 'categories.entertainment',
  'Vestuário': 'categories.clothing',
  'Serviços': 'categories.services',
  'Pessoal': 'categories.personal',
  'Assinaturas': 'categories.subscriptions',
  'Imposto': 'categories.tax',
  'Viagem': 'categories.travel',
  'Restaurante': 'categories.restaurant',
  'Seguro': 'categories.insurance',
  'Psicólogo(a)': 'categories.psychologist',
  // Both (Portuguese)
  'Outros': 'categories.other',
  // Income categories (Portuguese)
  'Salário': 'categories.salary',
  'Freelance': 'categories.freelance',
  'Contrato': 'categories.contract',
  'Rendimentos': 'categories.returns',
  'Aluguel': 'categories.rent',
  'Outros (Receita)': 'categories.otherIncome',

  // Expense categories (English - fallback for DB entries in English)
  'Housing': 'categories.housing',
  'Food': 'categories.food',
  'Transport': 'categories.transport',
  'Health': 'categories.health',
  'Education': 'categories.education',
  'Entertainment': 'categories.entertainment',
  'Clothing': 'categories.clothing',
  'Services': 'categories.services',
  'Personal': 'categories.personal',
  'Subscriptions': 'categories.subscriptions',
  'Tax': 'categories.tax',
  'Travel': 'categories.travel',
  'Restaurant': 'categories.restaurant',
  'Insurance': 'categories.insurance',
  'Psychologist': 'categories.psychologist',
  // Both (English)
  'Other': 'categories.other',
  // Income categories (English)
  'Salary': 'categories.salary',
  'Returns': 'categories.returns',
  'Rent': 'categories.rent',
  'Other (Income)': 'categories.otherIncome',
  'Contract': 'categories.contract',
};

export function translateCategoryName(name: string, t: TFunction): string {
  const key = DEFAULT_CATEGORY_KEYS[name];
  return key ? t(key) : name;
}
