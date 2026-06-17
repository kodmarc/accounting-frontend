import React, { useState } from 'react'
import { User, Lock, Eye, EyeOff, Save, CheckCircle, RefreshCw } from 'lucide-react'
import { apiService } from '../../services/api'
import type { User as ApiUser } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import type { TabId } from '../../types/tabs'

interface UserProfileTabProps {
  currentUser: ApiUser | null
  setCurrentUser: (user: ApiUser) => void
  setActiveTab: (tab: TabId) => void
}

export function UserProfileTab({
  currentUser,
  setCurrentUser,
  setActiveTab
}: UserProfileTabProps) {
  const { showAlert } = usePopup()
  const [firstName, setFirstName] = useState(currentUser?.first_name || '')
  const [lastName, setLastName] = useState(currentUser?.last_name || '')
  
  // Password fields
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Visibility toggles
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First name and last name are required.')
      return
    }

    if (password) {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const res = await apiService.updateMe(firstName, lastName, password || undefined)
      setCurrentUser(res.user)
      setSuccessMessage(res.message || 'Profile updated successfully.')
      showAlert({
        title: 'Success',
        message: res.message || 'Your account settings have been updated.',
        buttonText: 'OK',
        type: 'success'
      })
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving your changes.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your personal profile details and edit your secure account password.</p>
        </div>
        <button
          onClick={() => setActiveTab('Home')}
          className="mt-3 md:mt-0 text-xs font-bold text-slate-650 hover:bg-slate-100 px-4 py-2 border border-slate-200 rounded-[3px] transition duration-200 cursor-pointer"
        >
          Return Dashboard
        </button>
      </div>

      <form onSubmit={handleSaveChanges} className="space-y-6">
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-[#0F5B38] px-4 py-3.5 rounded-[3px] text-sm flex items-center space-x-2.5 animate-fadeIn">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3.5 rounded-[3px] text-sm font-semibold animate-fadeIn">
            {errorMessage}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="h-4.5 w-4.5 text-[#0F5B38]" />
            <h2 className="text-base font-bold text-slate-800">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition duration-200"
                placeholder="First name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition duration-200"
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={currentUser?.email || ''}
                readOnly
                className="w-full bg-slate-100/80 border border-slate-200 rounded-[3px] px-3.5 py-2 text-slate-550 text-[15px] focus:outline-none cursor-not-allowed select-none"
              />
              <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-[3px] select-none">
                Immutable
              </span>
            </div>
            <p className="text-[11px] text-slate-450 mt-1">To update your login email address, please contact support.</p>
          </div>
        </div>

        {/* Security Password Card */}
        <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Lock className="h-4.5 w-4.5 text-[#0F5B38]" />
            <h2 className="text-base font-bold text-slate-800">Security & Password</h2>
          </div>
          
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Fill in the fields below only if you wish to change your account login password. Leave them completely blank to keep your current password active.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition duration-200"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-650 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[3px] pl-3.5 pr-10 py-2 text-slate-800 text-[15px] focus:bg-white focus:border-[#0F5B38] focus:outline-none transition duration-200"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Actions */}
        <div className="flex items-center justify-end space-x-3.5">
          <button
            type="button"
            onClick={() => {
              setFirstName(currentUser?.first_name || '')
              setLastName(currentUser?.last_name || '')
              setPassword('')
              setConfirmPassword('')
              setSuccessMessage('')
              setErrorMessage('')
            }}
            className="text-xs font-bold text-slate-650 hover:bg-slate-100 px-5 py-3 border border-slate-200 rounded-[3px] transition duration-200 cursor-pointer"
            disabled={isSubmitting}
          >
            Reset Fields
          </button>
          
          <button
            type="submit"
            className="text-xs font-bold text-white bg-[#0F5B38] hover:bg-[#0A3E26] px-6 py-3 rounded-[3px] flex items-center space-x-2 transition duration-200 cursor-pointer shadow-sm disabled:bg-slate-350 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 shrink-0" />
                <span>Save Account Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
