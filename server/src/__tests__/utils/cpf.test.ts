import { validateCPF, cleanCPF } from '../../utils/cpf';

describe('CPF Utilities', () => {
  describe('cleanCPF', () => {
    it('should remove formatting characters', () => {
      expect(cleanCPF('123.456.789-09')).toBe('12345678909');
    });

    it('should handle already clean CPF', () => {
      expect(cleanCPF('12345678909')).toBe('12345678909');
    });

    it('should remove all non-digit characters', () => {
      expect(cleanCPF('123 456 789/09')).toBe('12345678909');
    });
  });

  describe('validateCPF', () => {
    it('should validate a known valid CPF', () => {
      expect(validateCPF('529.982.247-25')).toBe(true);
    });

    it('should validate unformatted valid CPF', () => {
      expect(validateCPF('52998224725')).toBe(true);
    });

    it('should reject CPF with wrong check digits', () => {
      expect(validateCPF('529.982.247-26')).toBe(false);
    });

    it('should reject all-same-digit CPFs', () => {
      expect(validateCPF('111.111.111-11')).toBe(false);
      expect(validateCPF('000.000.000-00')).toBe(false);
      expect(validateCPF('999.999.999-99')).toBe(false);
    });

    it('should reject CPF with wrong length', () => {
      expect(validateCPF('123456789')).toBe(false);
      expect(validateCPF('1234567890123')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateCPF('')).toBe(false);
    });

    it('should validate another known valid CPF', () => {
      expect(validateCPF('453.178.287-91')).toBe(true);
    });
  });
});
