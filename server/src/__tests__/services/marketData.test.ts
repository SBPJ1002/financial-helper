import { jest } from '@jest/globals';

describe('MarketData Service', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFetch = jest.fn<(...args: any[]) => Promise<any>>();
  const originalFetch = global.fetch;
  const originalEnv = process.env.ALPHA_VANTAGE_API_KEY;

  beforeAll(() => {
    global.fetch = mockFetch as any;
    process.env.ALPHA_VANTAGE_API_KEY = 'test-key';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.ALPHA_VANTAGE_API_KEY = originalEnv;
    } else {
      delete process.env.ALPHA_VANTAGE_API_KEY;
    }
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should parse GLOBAL_QUOTE response', async () => {
    const mockResponse = {
      'Global Quote': {
        '01. symbol': 'PETR4.SAO',
        '05. price': '38.50',
        '06. volume': '12345678',
        '07. latest trading day': '2026-02-14',
        '09. change': '0.75',
        '10. change percent': '1.99%',
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=PETR4.SAO&apikey=test');
    const data = await res.json();

    const quote = data['Global Quote'];
    expect(parseFloat(quote['05. price'])).toBe(38.5);
    expect(parseInt(quote['06. volume'])).toBe(12345678);
    expect(quote['10. change percent']).toBe('1.99%');
  });

  it('should parse SYMBOL_SEARCH response', async () => {
    const mockResponse = {
      bestMatches: [
        {
          '1. symbol': 'PETR4.SAO',
          '2. name': 'Petrobras PN',
          '3. type': 'Equity',
          '4. region': 'Brazil/Sao Paolo',
          '8. currency': 'BRL',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch('https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=PETR4&apikey=test');
    const data = await res.json();
    expect(data.bestMatches).toHaveLength(1);
    expect(data.bestMatches[0]['1. symbol']).toBe('PETR4.SAO');
  });

  it('should handle rate limit response', async () => {
    const mockResponse = {
      Note: 'Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=PETR4.SAO&apikey=test');
    const data = await res.json();

    expect(data.Note).toBeTruthy();
    expect(data['Global Quote']).toBeUndefined();
  });

  it('should handle API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const res = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=PETR4.SAO&apikey=test');
    expect(res.ok).toBe(false);
  });

  it('should parse TIME_SERIES_DAILY response', async () => {
    const mockResponse = {
      'Time Series (Daily)': {
        '2026-02-14': {
          '1. open': '37.80',
          '2. high': '38.90',
          '3. low': '37.50',
          '4. close': '38.50',
          '5. volume': '12345678',
        },
        '2026-02-13': {
          '1. open': '37.20',
          '2. high': '38.10',
          '3. low': '37.00',
          '4. close': '37.75',
          '5. volume': '9876543',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const res = await fetch('https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=PETR4.SAO&apikey=test');
    const data = await res.json();

    const timeSeries = data['Time Series (Daily)'];
    const dates = Object.keys(timeSeries);
    expect(dates).toHaveLength(2);
    expect(parseFloat(timeSeries['2026-02-14']['4. close'])).toBe(38.5);
  });
});
