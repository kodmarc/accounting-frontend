import { request } from './base'

export const metadataApi = {
  async getMetadata(): Promise<{ countries: { code: string; name: string }[]; currencies: { code: string; name: string; symbol: string }[] }> {
    return request('/metadata/countries-currencies/')
  },
}
