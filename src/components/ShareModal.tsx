import { useState, useEffect, useRef } from 'react'
import { X, Copy, Share2, Check, Link } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

interface ShareModalProps {
  docType: 'invoice' | 'quote' | 'bill' | 'purchase-order'
  docId: string
  docNumber: string
  contactName: string
  amount: number
  currency: string
  orgName: string
  dueLabel: string      // e.g. "due 15 Aug 2026" or "expires 20 Aug 2026"
  onClose: () => void
}

const DOC_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  quote: 'Quote',
  bill: 'Bill',
  'purchase-order': 'Purchase Order',
}

function fmtAmount(amount: number, currency: string) {
  return amount.toLocaleString('en-US', { style: 'currency', currency, minimumFractionDigits: 2 })
}

export function ShareModal({
  docType, docId, docNumber, contactName, amount, currency, orgName, dueLabel, onClose,
}: ShareModalProps) {
  const label       = DOC_LABEL[docType] ?? 'Document'
  const shareUrl    = `${API_BASE_URL}/public/${docType}/${docId}/pdf/`
  // shareBody goes into navigator.share's text field — no URL here so platforms render the url field as a real tappable link
  const shareBody   = `Hi ${contactName},\n\nPlease find your ${label} ${docNumber} from ${orgName} for ${fmtAmount(amount, currency)}${dueLabel ? ` (${dueLabel})` : ''}.`
  // Full text used for Copy Message — includes URL since there's no separate url field in clipboard
  const shareText   = `${shareBody}\n\nView / download it here:\n${shareUrl}`

  const [linkCopied, setLinkCopied] = useState(false)
  const [msgCopied,  setMsgCopied]  = useState(false)
  const [canShare,   setCanShare]   = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(shareText)
    setMsgCopied(true)
    setTimeout(() => setMsgCopied(false), 2000)
  }

  async function handleShare() {
    try {
      await navigator.share({ title: `${label} ${docNumber}`, text: shareBody, url: shareUrl })
    } catch {
      // user cancelled or API unsupported
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white rounded-[4px] shadow-2xl border border-slate-100 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Share2 className="h-4 w-4 text-[#0F5B38]" />
            <span className="text-sm font-semibold text-slate-800">Share {label}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Share link row */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Shareable Link
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[3px] px-3 py-2">
              <Link className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="flex-1 text-[11px] text-slate-500 font-mono truncate">{shareUrl}</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#0F5B38] hover:brightness-110 transition cursor-pointer flex-shrink-0"
              >
                {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {linkCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Anyone with this link can view and download the PDF.
            </p>
          </div>

          {/* Message preview */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Share Message
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-[3px] px-3 py-2.5">
              <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">{shareText}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={copyMessage}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-[3px] transition cursor-pointer"
            >
              {msgCopied ? <Check className="h-3.5 w-3.5 text-[#0F5B38]" /> : <Copy className="h-3.5 w-3.5" />}
              {msgCopied ? 'Copied!' : 'Copy Message'}
            </button>

            {canShare ? (
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0F5B38] hover:brightness-105 text-white text-[11px] font-semibold rounded-[3px] shadow-sm transition cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            ) : (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#25D366] hover:brightness-105 text-white text-[11px] font-semibold rounded-[3px] shadow-sm transition cursor-pointer"
              >
                WhatsApp
              </a>
            )}
          </div>

          {/* Desktop fallback links when Web Share API unavailable */}
          {!canShare && (
            <div className="flex items-center gap-3 pt-0.5">
              <span className="text-[10px] text-slate-400">Also share via:</span>
              <a
                href={`mailto:?subject=${encodeURIComponent(`${label} ${docNumber} from ${orgName}`)}&body=${encodeURIComponent(shareText)}`}
                className="text-[11px] font-medium text-[#0F5B38] hover:underline cursor-pointer"
              >
                Email
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-[#0F5B38] hover:underline cursor-pointer"
              >
                Facebook
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
