import { registerSchema } from '../../validators/auth.validator';

describe('Register Schema Validation', () => {
  const validInput = {
    fullName: 'João Silva',
    email: 'joao@example.com',
    password: 'Test@123!',
  };

  it('should accept valid input', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject name with less than 5 characters', () => {
    const result = registerSchema.safeParse({ ...validInput, fullName: 'Jo' });
    expect(result.success).toBe(false);
  });

  it('should reject name with only one word', () => {
    const result = registerSchema.safeParse({ ...validInput, fullName: 'Joaooo' });
    expect(result.success).toBe(false);
  });

  it('should reject name with numbers', () => {
    const result = registerSchema.safeParse({ ...validInput, fullName: 'João 123' });
    expect(result.success).toBe(false);
  });

  it('should accept name with accented characters', () => {
    const result = registerSchema.safeParse({ ...validInput, fullName: 'José Açaí' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject password without uppercase', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'test@123!' });
    expect(result.success).toBe(false);
  });

  it('should reject password without number', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Test@abc!' });
    expect(result.success).toBe(false);
  });

  it('should reject password without special character', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'Test1234' });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'T@1abc' });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      cpf: '52998224725',
      birthDate: '1990-01-15',
      gender: 'MALE',
      zipCode: '01001000',
      street: 'Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid gender enum values', () => {
    for (const g of ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']) {
      const result = registerSchema.safeParse({ ...validInput, gender: g });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid gender', () => {
    const result = registerSchema.safeParse({ ...validInput, gender: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
