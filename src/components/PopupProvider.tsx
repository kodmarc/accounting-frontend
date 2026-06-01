import React, { createContext, useContext, useState, ReactNode } from 'react'
import { HelpCircle, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react'

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => Promise<any>;
}

export interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export interface PopupContextType {
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined)

export function usePopup() {
  const context = useContext(PopupContext)
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider')
  }
  return context
}

interface PopupProviderProps {
  children: ReactNode;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface AlertState extends AlertOptions {
  resolve: () => void;
}

export function PopupProvider({ children }: PopupProviderProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [alertState, setAlertState] = useState<AlertState | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDestructive: options.isDestructive || false,
        onConfirm: options.onConfirm,
        resolve,
      })
    })
  }

  const showAlert = (options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      setAlertState({
        title: options.title,
        message: options.message,
        buttonText: options.buttonText || 'OK',
        type: options.type || 'info',
        resolve,
      })
    })
  }

  const handleConfirmClose = async (value: boolean) => {
    if (!confirmState) return
    if (value) {
      if (confirmState.onConfirm) {
        setIsConfirming(true)
        try {
          await confirmState.onConfirm()
          confirmState.resolve(true)
          setConfirmState(null)
        } catch (err: any) {
          console.error("Action failed:", err)
          confirmState.resolve(false)
          setConfirmState(null)
        } finally {
          setIsConfirming(false)
        }
      } else {
        confirmState.resolve(true)
        setConfirmState(null)
      }
    } else {
      if (isConfirming) return
      confirmState.resolve(false)
      setConfirmState(null)
    }
  }

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve()
      setAlertState(null)
    }
  }

  const getConfirmTextLabel = (text: string) => {
    if (text === 'Delete' || text === 'Delete All' || text === 'Delete Selected') return 'Deleting...'
    if (text === 'Remove') return 'Removing...'
    if (text === 'Import') return 'Importing...'
    if (text === 'Mark Paid') return 'Marking Paid...'
    if (text === 'Confirm') return 'Confirming...'
    return `${text}ing...`
  }

  return (
    <PopupContext.Provider value={{ showConfirm, showAlert }}>
      {children}

      {/* Confirmation Dialog Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center font-sans">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => handleConfirmClose(false)}
          ></div>
          <div className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full max-w-md p-6 space-y-6 mx-4 animate-scaleIn rounded-[3px] border border-slate-100">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full shrink-0 ${confirmState.isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-[#0F5B38]'}`}>
                {confirmState.isDestructive ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <HelpCircle className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1.5 w-full">
                <h3 className="text-base font-bold text-slate-850 pr-4">{confirmState.title}</h3>
                <p className="text-slate-500 text-[15px] font-semibold leading-relaxed leading-snug">
                  {confirmState.message}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 pt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => handleConfirmClose(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold disabled:opacity-50"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => handleConfirmClose(true)}
                className={`px-5 py-2.5 rounded-[3px] shadow-md text-white transition text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 ${
                  confirmState.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-950/10'
                    : 'bg-[#0F5B38] hover:brightness-105 shadow-emerald-950/10'
                }`}
              >
                {isConfirming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></span>
                    <span>{getConfirmTextLabel(confirmState.confirmText || 'Confirm')}</span>
                  </>
                ) : (
                  <span>{confirmState.confirmText}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog Modal */}
      {alertState && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center font-sans">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={handleAlertClose}
          ></div>
          <div className="relative transform overflow-hidden bg-white text-left shadow-2xl transition-all w-full max-w-md p-6 space-y-6 mx-4 animate-scaleIn rounded-[3px] border border-slate-100">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-full shrink-0 ${
                alertState.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                alertState.type === 'error' ? 'bg-rose-50 text-rose-600' :
                alertState.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {alertState.type === 'success' && <CheckCircle2 className="h-6 w-6" />}
                {alertState.type === 'error' && <XCircle className="h-6 w-6" />}
                {alertState.type === 'warning' && <AlertTriangle className="h-6 w-6" />}
                {alertState.type === 'info' && <Info className="h-6 w-6" />}
              </div>
              <div className="space-y-1.5 w-full">
                <h3 className="text-base font-bold text-slate-850 pr-4">{alertState.title}</h3>
                <p className="text-slate-500 text-[15px] font-semibold leading-relaxed leading-snug">
                  {alertState.message}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 pt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={handleAlertClose}
                className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-md shadow-emerald-950/10 transition cursor-pointer text-xs font-semibold"
              >
                {alertState.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  )
}
