export interface ExchangeRateResponse {
  result: string
  base_code: string
  rates: Record<string, number>
}

export const exchangeRateApi = {
  async getRates(baseCurrency: string): Promise<ExchangeRateResponse> {
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`)
    if (!res.ok) throw new Error('Failed to fetch exchange rates')
    return res.json()
  },
}