import { parseYieldDescription } from '../../services/yieldCalculator.service';

describe('YieldCalculator Service', () => {
  describe('parseYieldDescription', () => {
    it('should parse "100% CDI"', () => {
      const result = parseYieldDescription('100% CDI');
      expect(result).toEqual({ type: 'CDI_PERCENTAGE', rate: 100 });
    });

    it('should parse "120% CDI"', () => {
      const result = parseYieldDescription('120% CDI');
      expect(result).toEqual({ type: 'CDI_PERCENTAGE', rate: 120 });
    });

    it('should parse "110.5% CDI"', () => {
      const result = parseYieldDescription('110.5% CDI');
      expect(result).toEqual({ type: 'CDI_PERCENTAGE', rate: 110.5 });
    });

    it('should parse "IPCA + 6%"', () => {
      const result = parseYieldDescription('IPCA + 6%');
      expect(result).toEqual({ type: 'IPCA_PLUS', rate: 6 });
    });

    it('should parse "IPCA + 6.5%"', () => {
      const result = parseYieldDescription('IPCA + 6.5%');
      expect(result).toEqual({ type: 'IPCA_PLUS', rate: 6.5 });
    });

    it('should parse "SELIC"', () => {
      const result = parseYieldDescription('SELIC');
      expect(result).toEqual({ type: 'SELIC', rate: null });
    });

    it('should parse "12%"', () => {
      const result = parseYieldDescription('12%');
      expect(result).toEqual({ type: 'PREFIXED', rate: 12 });
    });

    it('should parse "12.5% a.a."', () => {
      const result = parseYieldDescription('12.5% a.a.');
      expect(result).toEqual({ type: 'PREFIXED', rate: 12.5 });
    });

    it('should parse "POUPANÇA"', () => {
      const result = parseYieldDescription('POUPANÇA');
      expect(result).toEqual({ type: 'POUPANCA', rate: null });
    });

    it('should parse "POUPANCA"', () => {
      const result = parseYieldDescription('POUPANCA');
      expect(result).toEqual({ type: 'POUPANCA', rate: null });
    });

    it('should default to VARIABLE for unknown descriptions', () => {
      const result = parseYieldDescription('Something else');
      expect(result).toEqual({ type: 'VARIABLE', rate: null });
    });

    it('should be case-insensitive', () => {
      expect(parseYieldDescription('100% cdi')).toEqual({ type: 'CDI_PERCENTAGE', rate: 100 });
      expect(parseYieldDescription('ipca + 5%')).toEqual({ type: 'IPCA_PLUS', rate: 5 });
      expect(parseYieldDescription('selic')).toEqual({ type: 'SELIC', rate: null });
    });
  });
});
