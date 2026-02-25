import { jest } from '@jest/globals';

describe('BCB Service', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFetch = jest.fn<(...args: any[]) => Promise<any>>();
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should parse BCB API response format (DD/MM/YYYY)', async () => {
    // The BCB API returns dates in DD/MM/YYYY format
    const mockResponse = [
      { data: '15/02/2026', valor: '13.25' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json', {
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].data).toBe('15/02/2026');
    expect(parseFloat(data[0].valor)).toBe(13.25);
  });

  it('should handle BCB API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(500);
  });

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
    const data = await res.json();
    expect(data).toHaveLength(0);
  });

  it('should parse multiple data points', async () => {
    const mockResponse = [
      { data: '13/02/2026', valor: '13.20' },
      { data: '14/02/2026', valor: '13.22' },
      { data: '15/02/2026', valor: '13.25' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/3?formato=json');
    const data = await res.json();
    expect(data).toHaveLength(3);
    expect(parseFloat(data[2].valor)).toBe(13.25);
  });
});
