import React from 'react'
import {
  Calculator,
  LogOut,
  Building,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Globe,
  DollarSign,
  Briefcase,
} from 'lucide-react'
import { SearchableSelect, type SelectOption } from '../components/SearchableSelect'
import type { User, Membership, Organization } from '../services/api'

interface OrganizationGateProps {
  currentUser: User | null
  organizations: Membership[]
  orgSearchQuery: string
  setOrgSearchQuery: (val: string) => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (val: boolean) => void
  orgName: string
  setOrgName: (val: string) => void
  orgCountry: string
  setOrgCountry: (val: string) => void
  orgCurrency: string
  setOrgCurrency: (val: string) => void
  orgTaxId: string
  setOrgTaxId: (val: string) => void
  errorMsg: string | null
  setErrorMsg: (val: string | null) => void
  handleLogout: () => void
  handleCreateOrg: (e: React.FormEvent) => void
  handleDeleteOrg: (orgId: string) => void
  setActiveOrg: (org: Organization) => void
  editingOrg: Organization | null
  setEditingOrg: (org: Organization | null) => void
  countriesList: SelectOption[]
  currenciesList: SelectOption[]
}

export function OrganizationGate({
  currentUser,
  organizations,
  orgSearchQuery,
  setOrgSearchQuery,
  isCreateModalOpen,
  setIsCreateModalOpen,
  orgName,
  setOrgName,
  orgCountry,
  setOrgCountry,
  orgCurrency,
  setOrgCurrency,
  orgTaxId,
  setOrgTaxId,
  errorMsg,
  setErrorMsg,
  handleLogout,
  handleCreateOrg,
  handleDeleteOrg,
  setActiveOrg,
  editingOrg,
  setEditingOrg,
  countriesList,
  currenciesList
}: OrganizationGateProps) {
  const filteredOrganizations = organizations.filter(memb =>
    memb.organization.name.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
    memb.organization.country.toLowerCase().includes(orgSearchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f7f9f8] flex flex-col justify-between p-8 font-sans antialiased text-[#071f13]">
      {/* Header bar */}
      <header className="w-full flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#0F5B38]/10 rounded-[3px]">
            <Calculator className="h-6 w-6 text-[#0F5B38]" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-slate-800">KDM Accounting</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs font-semibold text-slate-500">{currentUser?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 px-3.5 py-2 rounded-[3px] transition duration-300 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="w-full py-12 space-y-6 flex-1 flex flex-col justify-start">
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-[3px] text-rose-600 text-xs font-bold flex items-start space-x-2 animate-shake">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Heading Row (Add Org button on top right) */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Select your Organization</h1>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Choose an active organization to continue, or add a new workspace.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null)
              setEditingOrg(null)
              setOrgName('')
              setOrgCountry(countriesList[0]?.value || 'Singapore')
              setOrgCurrency(currenciesList[0]?.value || 'SGD')
              setOrgTaxId('')
              setIsCreateModalOpen(true)
            }}
            className="bg-[#0F5B38] hover:bg-[#0d5031] text-white font-medium text-xs px-4 py-2.5 rounded-[3px] shadow-sm flex items-center justify-center space-x-1.5 transition cursor-pointer select-none shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Organization</span>
          </button>
        </div>

        {/* Search bar below top layout */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizations by name or region..."
            value={orgSearchQuery}
            onChange={e => setOrgSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-[3px] pl-10 pr-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition shadow-sm"
          />
        </div>

        {/* Organizations List Display */}
        <div className="space-y-3">
          {filteredOrganizations.length > 0 ? (
            filteredOrganizations.map(memb => (
              <div
                key={memb.id}
                onClick={() => setActiveOrg(memb.organization)}
                className="w-full bg-white hover:bg-slate-50/50 border border-slate-200 rounded-[3px] p-5 shadow-sm hover:shadow transition flex items-center justify-between cursor-pointer select-none group border-l-4 border-l-transparent hover:border-l-[#0F5B38]"
              >
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="h-10 w-10 bg-slate-50 text-[#0F5B38] rounded-[3px] flex items-center justify-center border border-slate-100 shrink-0 group-hover:bg-emerald-50 transition">
                    <Building className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800 text-sm truncate">{memb.organization.name}</span>
                      <span className="text-[10px] bg-slate-105 text-slate-500 px-2 py-0.5 rounded-[3px] font-medium shrink-0 uppercase tracking-wider">
                        {memb.organization.currency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {memb.organization.country} • Role: <span className="font-semibold text-[#0F5B38]">{memb.role}</span>
                    </p>
                  </div>
                </div>

                {/* Actions / Right side */}
                <div className="flex items-center space-x-1 pl-4 shrink-0" onClick={e => e.stopPropagation()}>
                  {memb.role === 'Admin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null)
                          setEditingOrg(memb.organization)
                          setOrgName(memb.organization.name)
                          setOrgCountry(memb.organization.country)
                          setOrgCurrency(memb.organization.currency)
                          setOrgTaxId(memb.organization.tax_id)
                          setIsCreateModalOpen(true)
                        }}
                        className="p-2 text-slate-400 hover:text-[#0F5B38] hover:bg-slate-100 rounded-[3px] transition cursor-pointer flex items-center justify-center space-x-1"
                        title="Edit organization"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-[3px] text-slate-650 hover:text-[#0F5B38] transition">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteOrg(memb.organization.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[3px] transition cursor-pointer flex items-center justify-center space-x-1"
                        title="Delete organization"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-[3px] text-slate-655 hover:text-rose-600 transition">Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-[3px] border border-slate-200 shadow-sm p-6 space-y-2">
              <p className="text-sm font-semibold text-slate-500">
                {orgSearchQuery ? "No matching organizations found" : "No organizations registered yet"}
              </p>
              <p className="text-xs text-slate-400">
                {orgSearchQuery ? "Try searching for a different name or region." : "Get started by adding your first workspace organization above."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/50 mt-12 w-full mx-auto">
        © 2026 KDM Accounting Software. All rights reserved.
      </footer>

      {/* Add/Edit Organization popup */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-[#071f13]/55 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">

          <div className="w-full max-w-2xl bg-white rounded-[3px] shadow-2xl p-10 relative border border-emerald-100">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setEditingOrg(null)
                setOrgName('')
              }}
              className="absolute right-6 top-6 p-2 hover:bg-emerald-50 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-semibold text-slate-800">
                {editingOrg ? 'Edit Organization' : 'Create New Organization'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingOrg ? 'Update configuration ledger details for this entity.' : 'Configure ledger structures and currency variables for a new entity.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 mb-4 bg-rose-50 border border-rose-100 rounded-[3px] text-rose-600 text-xs font-bold flex items-start space-x-2">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Company Name</label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kodmarc Software Ltd"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition"
                  />
                </div>
              </div>

              {/* Dynamic Database Seeded Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SearchableSelect
                  options={countriesList}
                  value={orgCountry}
                  onChange={setOrgCountry}
                  placeholder="Select Country"
                  label="Country / Region"
                  icon={<Globe className="h-4.5 w-4.5" />}
                />

                <SearchableSelect
                  options={currenciesList}
                  value={orgCurrency}
                  onChange={setOrgCurrency}
                  placeholder="Select Currency"
                  label="Base Currency"
                  icon={<DollarSign className="h-4.5 w-4.5" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tax ID / Business Reg No</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. NTN 49102-PK"
                    value={orgTaxId}
                    onChange={e => setOrgTaxId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-[#0F5B38] transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setEditingOrg(null)
                    setOrgName('')
                  }}
                  className="flex-1 bg-slate-105 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-[3px] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0F5B38] hover:bg-[#0F5B38]/95 text-white font-bold py-3 rounded-[3px] shadow-lg shadow-[#0F5B38]/20 transition cursor-pointer"
                >
                  {editingOrg ? 'Save Changes' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
