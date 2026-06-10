import React, { useState, useEffect } from 'react'
import { X, Mail, FileText, Send, Loader2 } from 'lucide-react'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  defaultEmail: string
  documentType: 'Invoice' | 'Quote' | 'Bill' | 'Purchase Order'
  documentNumber: string
  contactName: string
  totalAmount: string
  orgName?: string
  onSend: (to: string, subject: string, message: string) => Promise<void>
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  defaultEmail,
  documentType,
  documentNumber,
  contactName,
  totalAmount,
  orgName = 'our organization',
  onSend
}) => {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  // Reset/Initialize values when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setTo(defaultEmail || '')
      setSubject(`${documentType} ${documentNumber} from ${orgName}`)
      
      const cleanContactName = contactName || 'Customer'
      const formattedMessage = `Hi ${cleanContactName},

Here is ${documentType} ${documentNumber} for your review. The total amount is ${totalAmount}.

Please let us know if you have any questions.

Regards,
${orgName}`
      
      setMessage(formattedMessage)
      setError('')
      setIsSending(false)
    }
  }, [isOpen, defaultEmail, documentType, documentNumber, contactName, totalAmount, orgName])

  if (!isOpen) return null

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(emailStr.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!to.trim()) {
      setError('Please provide a recipient email address.')
      return
    }

    if (!validateEmail(to)) {
      setError('Please provide a valid email address.')
      return
    }

    if (!subject.trim()) {
      setError('Subject line cannot be empty.')
      return
    }

    if (!message.trim()) {
      setError('Message body cannot be empty.')
      return
    }

    try {
      setIsSending(true)
      await onSend(to.trim(), subject.trim(), message.trim())
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to send email. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={!isSending ? onClose : undefined}
      ></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-lg mx-auto my-6 z-50 bg-white rounded-md shadow-2xl border border-slate-200 outline-none flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-800">
            <Mail className="h-5 w-5 text-[#0F5B38]" />
            <h3 className="text-base font-bold tracking-tight">Email {documentType}</h3>
          </div>
          {!isSending && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-55 rounded transition duration-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-600 rounded-[3px] border border-rose-100 font-medium animate-pulse">
              {error}
            </div>
          )}

          {/* Recipient Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">
              To
            </label>
            <input
              type="text"
              disabled={isSending}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-[3px] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F5B38] focus:ring-1 focus:ring-[#0F5B38]/20 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          {/* Subject Line Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">
              Subject
            </label>
            <input
              type="text"
              disabled={isSending}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 border border-slate-200 rounded-[3px] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F5B38] focus:ring-1 focus:ring-[#0F5B38]/20 disabled:bg-slate-50 disabled:text-slate-500 font-medium"
            />
          </div>

          {/* Message Text Area */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">
              Message Body
            </label>
            <textarea
              disabled={isSending}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Compose your email message..."
              rows={6}
              className="w-full px-3 py-2 border border-slate-200 rounded-[3px] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F5B38] focus:ring-1 focus:ring-[#0F5B38]/20 disabled:bg-slate-50 disabled:text-slate-500 font-normal leading-relaxed resize-none"
            />
          </div>

          {/* Attachment Badge */}
          <div className="p-3 bg-slate-50 rounded-[3px] border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="bg-rose-100 p-1.5 rounded">
                <FileText className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-700">
                  {documentType === 'Purchase Order' ? 'PurchaseOrder' : documentType}_{documentNumber}.pdf
                </p>
                <p className="text-[10px] text-slate-400">PDF Document Attachment</p>
              </div>
            </div>
            <span className="text-[9px] bg-slate-200 text-slate-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px]">
              Attached
            </span>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-slate-100 space-x-3 bg-slate-50 rounded-b-md">
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-[3px] transition duration-200 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSending}
            onClick={handleSubmit}
            className="flex items-center justify-center space-x-1.5 bg-[#0F5B38] hover:bg-[#093c24] text-white px-4 py-2 text-xs font-semibold rounded-[3px] transition duration-200 cursor-pointer shadow-sm disabled:opacity-85"
          >
            {isSending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
