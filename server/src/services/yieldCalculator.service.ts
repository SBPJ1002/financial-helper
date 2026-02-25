import type { YieldType } from '@prisma/client';
import { getCurrentRates } from './bcb.service.js';

interface YieldParsed {
  type: YieldType;
  rate: number | null;
}

export function parseYieldDescription(description: string): YieldParsed {
  const normalized = description.trim().toUpperCase();

  // "100% CDI", "110% CDI"
  const cdiMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*%?\s*CDI$/);
  if (cdiMatch) {
    return { type: 'CDI_PERCENTAGE', rate: parseFloat(cdiMatch[1]) };
  }

  // "IPCA + 6%", "IPCA + 6.5%"
  const ipcaMatch = normalized.match(/^IPCA\s*\+\s*(\d+(?:\.\d+)?)\s*%?$/);
  if (ipcaMatch) {
    return { type: 'IPCA_PLUS', rate: parseFloat(ipcaMatch[1]) };
  }

  // "SELIC"
  if (normalized === 'SELIC') {
    return { type: 'SELIC', rate: null };
  }

  // "12%", "12.5% a.a."
  const prefixedMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*%/);
  if (prefixedMatch) {
    return { type: 'PREFIXED', rate: parseFloat(prefixedMatch[1]) };
  }

  // "POUPANÇA", "POUPANCA", "SAVINGS"
  if (/POUPAN[CÇ]A|SAVINGS/.test(normalized)) {
    return { type: 'POUPANCA', rate: null };
  }

  // "VARIABLE", "VARIÁVEL"
  return { type: 'VARIABLE', rate: null };
}

export async function calculateCurrentValue(
  amountInvested: number,
  applicationDate: Date,
  yieldType: YieldType,
  yieldRate: number | null,
): Promise<number | null> {
  if (yieldType === 'VARIABLE') return null;

  const rates = await getCurrentRates();
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 0) return amountInvested;

  const yearFraction = daysDiff / 365;

  let annualRate: number;

  switch (yieldType) {
    case 'CDI_PERCENTAGE': {
      const cdiRate = rates.CDI?.value ?? 13.15;
      annualRate = (cdiRate * (yieldRate ?? 100)) / 100;
      break;
    }
    case 'SELIC': {
      annualRate = rates.SELIC?.value ?? 13.25;
      break;
    }
    case 'IPCA_PLUS': {
      const ipcaRate = rates.IPCA?.value ?? 4.56;
      annualRate = ipcaRate + (yieldRate ?? 0);
      break;
    }
    case 'PREFIXED': {
      annualRate = yieldRate ?? 0;
      break;
    }
    case 'POUPANCA': {
      const selicRate = rates.SELIC?.value ?? 13.25;
      // Poupança: if SELIC > 8.5%, yield = 0.5%/month + TR ≈ 6.17%/year
      // If SELIC <= 8.5%, yield = 70% of SELIC + TR
      annualRate = selicRate > 8.5 ? 6.17 : selicRate * 0.7;
      break;
    }
    default:
      return null;
  }

  // Compound interest: PV * (1 + r)^t
  const rateDecimal = annualRate / 100;
  const currentValue = amountInvested * Math.pow(1 + rateDecimal, yearFraction);

  return Math.round(currentValue * 100) / 100;
}
