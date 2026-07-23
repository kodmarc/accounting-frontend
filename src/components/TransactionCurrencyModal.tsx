import { useState, useEffect } from 'react'
import { exchangeRateApi } from '../services/api/exchange-rate'
import { Loader2 } from 'lucide-react'

interface TransactionCurrencyModalProps {
  baseCurrency: string
  newCurrency: string
  onClose: () => void
  onConfirm: (rate: number) => void
}

export function TransactionCurrencyModal({ baseCurrency, newCurrency, onClose, onConfirm }: TransactionCurrencyModalProps) {
  const [liveRate, setLiveRate] = useState<number | null>(null)
  const [customRate, setCustomRate] = useState('')
  const [loadingRate, setLoadingRate] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoadingRate(true)
    setError('')
    exchangeRateApi.getRates('USD')
      .then(data => {
        const rateToBase = data.rates[baseCurrency]
        const rateToNew = data.rates[newCurrency]
        if (rateToBase && rateToNew) {
          const calculatedRate = rateToNew / rateToBase
          const roundedRate = Number(calculatedRate.toFixed(6))
          setLiveRate(roundedRate)
          setCustomRate(String(roundedRate))
        } else {
          setError('Rate not found for this currency.')
        }
      })
      .catch(() => setError('Could not fetch live exchange rate.'))
      .finally(() => setLoadingRate(false))
  }, [baseCurrency, newCurrency])

  const handleConfirm = () => {
    const rate = Number(customRate)
    if (!rate || rate <= 0) {
      setError('Enter a valid exchange rate.')
      return
    }
    onConfirm(rate)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-[3px] shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Convert Transaction Currency</h3>
        <p className="text-xs text-slate-500">
          Converting from <b>{baseCurrency}</b> to <b>{newCurrency}</b>. All amounts on this transaction form will be recalculated using the exchange rate below.
        </p>

        {loadingRate ? (
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Fetching live exchange rate...</span>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Exchange Rate (1 {baseCurrency} = ? {newCurrency})
              {liveRate && <span className="ml-1 text-emerald-600 normal-case font-normal">(live: {liveRate})</span>}
            </label>
            <input
              type="number"
              step="any"
              value={customRate}
              onChange={e => setCustomRate(e.target.value)}
              className="w-full border border-slate-200 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#0F5B38]"
            />
          </div>
        )}

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex justify-end space-x-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs bg-slate-100 rounded-[3px] hover:bg-slate-200/50 cursor-pointer">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={loadingRate}
            className="px-4 py-2 text-xs bg-[#0F5B38] text-white rounded-[3px] disabled:opacity-50 hover:brightness-105 cursor-pointer"
          >
            Confirm & Convert
          </button>
        </div>
      </div>
    </div>
  )
}
