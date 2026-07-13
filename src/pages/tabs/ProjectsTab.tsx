import React, { useState, useEffect, useRef } from 'react'
import { Plus, Briefcase, Trash2, Search, BarChart3, Edit3, CheckCircle, ArrowLeft, FileText } from 'lucide-react'
import { apiService } from '../../services/api'
import type { Organization, Project, Invoice, Contact } from '../../services/api'
import { usePopup } from '../../components/PopupProvider'
import { useReadOnly } from '../../context/ReadOnlyContext'

interface ProjectsTabProps {
  activeOrg: Organization
  onViewInvoice?: (id: string) => void
  onViewBill?: (id: string) => void
}

export function ProjectsTab({
  activeOrg,
  onViewInvoice,
  onViewBill
}: ProjectsTabProps) {
  const isReadOnly = useReadOnly()
  const { showConfirm, showAlert } = usePopup()
  
  // Data States
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  
  // UI & Loading States
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  // Load master lists of Projects, Invoices, and Bills
  const loadData = async () => {
    setLoading(true)
    try {
      let loadedProjects: Project[] = []
      let loadedInvoices: Invoice[] = []
      let loadedBills: any[] = []
      let loadedContacts: Contact[] = []

      // 1. Fetch Projects
      loadedProjects = await apiService.getProjects(activeOrg.id)

      // 2. Fetch Invoices (Revenue)
      loadedInvoices = await apiService.getInvoices(activeOrg.id)

      // 3. Fetch Contacts
      loadedContacts = await apiService.getContacts(activeOrg.id)

      setProjects(loadedProjects)
      setInvoices(loadedInvoices)
      setBills(loadedBills)
      setContacts(loadedContacts)
    } catch (err: any) {
      showAlert({ title: 'Error Loading Data', message: err.message || 'Failed to sync project ledger.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    setViewingProject(null)
  }, [activeOrg.id])

  // Restore focus after modal closes
  useEffect(() => {
    if (!isModalOpen) {
      if (lastActiveElementRef.current) {
        const el = lastActiveElementRef.current
        setTimeout(() => {
          if (el && document.body.contains(el)) {
            el.focus()
          }
        }, 50)
        lastActiveElementRef.current = null
      }
    }
  }, [isModalOpen])

  // Save / Add project handler
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showAlert({ title: 'Validation Warning', message: 'Project Name is required.', type: 'warning' })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingProject) {
        // Edit flow
        const updatedProj = await apiService.updateProject(editingProject.id, {
          name: name.trim(),
          code: code.trim() || undefined
        })
        setProjects(projects.map(p => p.id === editingProject.id ? updatedProj : p))
        if (viewingProject && viewingProject.id === editingProject.id) {
          setViewingProject(updatedProj)
        }
        showAlert({ title: 'Project Updated', message: `Successfully saved changes for project "${name}".`, type: 'success' })
      } else {
        // Create flow
        const created = await apiService.createProject(activeOrg.id, {
          name: name.trim(),
          code: code.trim() || undefined
        })
        setProjects([...projects, created])
        showAlert({ title: 'Project Created', message: `Successfully created new project "${name}".`, type: 'success' })
      }
      setIsModalOpen(false)
      resetForm()
    } catch (err: any) {
      showAlert({ title: 'Error Saving Project', message: err.message || 'Failed to save project. Ensure name is unique.', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete project handler
  const handleDeleteProject = async (projectId: string, projName: string) => {
    const confirmed = await showConfirm({
      title: 'Remove Project',
      message: `Are you sure you want to permanently delete project "${projName}"? Any invoices and bills assigned to this project will be unassigned.`,
      confirmText: 'Delete Project',
      isDestructive: true
    })
    if (!confirmed) return

    setLoading(true)
    try {
      await apiService.deleteProject(projectId)
      setProjects(projects.filter(p => p.id !== projectId))
      if (viewingProject && viewingProject.id === projectId) {
        setViewingProject(null)
      }
      showAlert({ title: 'Project Deleted', message: `Successfully deleted project "${projName}".`, type: 'success' })
    } catch (err: any) {
      showAlert({ title: 'Deletion Failed', message: err.message || 'Failed to delete project.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setCode('')
    setEditingProject(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  const handleEditClick = (proj: Project) => {
    setEditingProject(proj)
    setName(proj.name)
    setCode(proj.code || '')
    lastActiveElementRef.current = document.activeElement as HTMLElement
    setIsModalOpen(true)
  }

  // Calculate project costings
  const getProjectStats = (projId: string) => {
    const projInvoices = invoices.filter(inv => inv.project === projId && inv.status !== 'Draft')
    const projBills = bills.filter(b => b.project === projId && b.status !== 'Draft')
    
    const revenue = projInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const spending = projBills.reduce((sum, b) => sum + Number(b.total), 0)
    const margin = revenue - spending

    return { revenue, spending, margin }
  }

  // YTD / Overall Metrics
  const calculatedMetrics = projects.map(proj => getProjectStats(proj.id))
  const totalRevenue = calculatedMetrics.reduce((sum, item) => sum + item.revenue, 0)
  const totalSpending = calculatedMetrics.reduce((sum, item) => sum + item.spending, 0)
  const netMargin = totalRevenue - totalSpending

  // Filter & Search Projects
  const filteredProjects = projects.filter(proj => 
    proj.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (proj.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name))

  let mainContent;

  const currencySymbol = activeOrg.currency === 'PKR' ? '₨' : '$'

  if (viewingProject) {
    const projInvoices = invoices.filter(inv => inv.project === viewingProject.id && inv.status !== 'Draft')
    const projBills = bills.filter(b => b.project === viewingProject.id && b.status !== 'Draft')

    const revenue = projInvoices.reduce((sum, inv) => sum + Number(inv.total), 0)
    const spending = projBills.reduce((sum, b) => sum + Number(b.total), 0)
    const margin = revenue - spending

    const transactions = [
      ...projInvoices.map(i => {
        const contactObj = contacts.find(c => c.id === i.contact)
        return {
          id: i.id!,
          date: i.date,
          number: i.invoice_number,
          reference: i.reference,
          type: 'Invoice',
          amount: Number(i.total),
          status: i.status,
          contactName: contactObj ? contactObj.name : 'Unknown Contact'
        }
      }),
      ...projBills.map(b => {
        const contactObj = contacts.find(c => c.id === b.contact)
        return {
          id: b.id!,
          date: b.date,
          number: b.bill_number,
          reference: b.reference,
          type: 'Bill',
          amount: -Number(b.total),
          status: b.status,
          contactName: contactObj ? contactObj.name : 'Unknown Contact'
        }
      })
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    mainContent = (
      <div className="space-y-6 font-sans text-left animate-fadeIn">
        {/* Breadcrumbs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewingProject(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-[3px] border border-slate-200 cursor-pointer select-none transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Projects Ledger</span>
            </button>
            <span className="text-slate-355">/</span>
            <span className="text-[#0F5B38] text-xs font-bold">{viewingProject.name}</span>
          </div>

          <div className="flex space-x-2">
            {!isReadOnly && (
              <>
                <button
                  onClick={() => handleEditClick(viewingProject)}
                  className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => handleDeleteProject(viewingProject.id, viewingProject.name)}
                  className="flex items-center space-x-1.5 bg-rose-50 border border-rose-200/30 hover:bg-rose-100/50 text-rose-600 font-bold text-xs px-4.5 py-2 rounded-[3px] shadow-sm transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Project</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Card Info Box */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Info Details Grid */}
          <div className="lg:col-span-2 bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-800">{viewingProject.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Project Tracking Profile</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 text-xs text-slate-700">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Project Name</span>
                <span className="font-semibold text-slate-800">{viewingProject.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-455 uppercase font-bold tracking-wider block">Project Code / SKU</span>
                <span className="font-bold text-[#0F5B38] bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5 text-[10px]">
                  {viewingProject.code || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Outflow Inflow summary box */}
          <div className="bg-white rounded-[3px] border border-emerald-100/35 p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Project Margin Analysis</h4>
            </div>

            <div className="space-y-3.5 flex-grow py-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#0F5B38] rounded-full"></div>
                  <span className="text-slate-500 font-semibold">Project Sales (Revenue)</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {currencySymbol}{revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div>
                  <span className="text-slate-500 font-semibold">Project Purchases (Spending)</span>
                </div>
                <span className="font-extrabold text-slate-800">
                  {currencySymbol}{spending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                <span className="text-slate-800 font-black">Net Margin Balance</span>
                <span className={`font-black ${margin >= 0 ? 'text-[#0F5B38]' : 'text-rose-600'}`}>
                  {margin < 0 ? '-' : ''}{currencySymbol}{Math.abs(margin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History Ledger */}
        <div className="bg-white rounded-[3px] border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800">Assigned Transactions Activity</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sales invoices and spending bills allocated to this project.</p>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 select-none text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Document ID</th>
                    <th className="p-3">Contact Name</th>
                    <th className="p-3">Reference / PO</th>
                    <th className="p-3">Document Type</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
                  {transactions.map(tx => {
                    const isInvoice = tx.type === 'Invoice'
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          if (isInvoice && onViewInvoice) onViewInvoice(tx.id)
                          else if (!isInvoice && onViewBill) onViewBill(tx.id)
                        }}
                        className="hover:bg-emerald-50/25 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="p-3 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-bold text-[#0F5B38]">{tx.number}</td>
                        <td className="p-3 font-semibold text-slate-800">{tx.contactName}</td>
                        <td className="p-3 text-slate-400 italic">{tx.reference || '—'}</td>
                        <td className="p-3">
                          <span className="flex items-center space-x-1.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span>{isInvoice ? 'Sales Invoice' : 'Vendor Bill'}</span>
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${tx.amount >= 0 ? 'text-slate-800' : 'text-rose-650'}`}>
                          {tx.amount < 0 ? '-' : ''}{currencySymbol}{Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' :
                            tx.status === 'Awaiting Payment' ? 'bg-amber-50 text-amber-600 border border-amber-100/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              if (isInvoice && onViewInvoice) onViewInvoice(tx.id)
                              else if (!isInvoice && onViewBill) onViewBill(tx.id)
                            }}
                            className="p-1 hover:bg-emerald-50 text-[#0F5B38] rounded-[3px] transition cursor-pointer text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold leading-relaxed">
              No transactions have been assigned to this project yet.
            </div>
          )}
        </div>
      </div>
    )
  } else {
    mainContent = (
      <div className="bg-white rounded-[3px] border border-emerald-100/50 shadow-sm p-8 space-y-6 font-sans text-left">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <Briefcase className="h-5 w-5 text-[#0F5B38]" />
          <span>Projects & Costing Ledger</span>
        </h2>
        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-[#0F5B38] hover:brightness-105 text-white font-medium text-xs px-4.5 py-2.5 rounded-[3px] transition cursor-pointer shadow-md shadow-emerald-950/10"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Dynamic Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Projects */}
        <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-[3px] flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-emerald-50 text-[#0F5B38] rounded-[3px] border border-emerald-100/30">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Active Projects</span>
            <span className="text-lg font-bold text-slate-850 block">{projects.length}</span>
          </div>
        </div>

        {/* Project Sales Revenue */}
        <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-[3px] flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-emerald-50 text-[#0F5B38] rounded-[3px] border border-emerald-100/30">
            <span className="text-sm font-black text-[#0F5B38]">IN</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Project Sales Revenue</span>
            <span className="text-lg font-bold text-slate-850 block">
              {currencySymbol}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Project Purchases Spending */}
        <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-[3px] flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-rose-550/10 text-rose-600 rounded-[3px] border border-rose-100/30">
            <span className="text-sm font-black text-rose-600">OUT</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Project Spending</span>
            <span className="text-lg font-bold text-slate-850 block">
              {currencySymbol}{totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-[3px] flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-emerald-50 text-[#0F5B38] rounded-[3px] border border-emerald-100/30">
            <BarChart3 className="h-5 w-5 text-[#0F5B38]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Net Costing Margin</span>
            <span className={`text-lg font-bold block ${netMargin >= 0 ? 'text-[#0F5B38]' : 'text-rose-600'}`}>
              {netMargin < 0 ? '-' : ''}{currencySymbol}{Math.abs(netMargin).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] pl-8.5 pr-4 py-2 text-xs font-semibold text-slate-855 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex space-x-1.5 items-center">
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
            <div className="w-2 h-2 bg-[#0F5B38] rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-2.5">Project Code</th>
                <th className="px-6 py-2.5">Project Name</th>
                <th className="px-6 py-2.5 text-right">Sales / Revenue</th>
                <th className="px-6 py-2.5 text-right">Spending / Purchases</th>
                <th className="px-6 py-2.5 text-right">Net Margin</th>
                <th className="px-6 py-2.5 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705 font-medium">
              {filteredProjects.map((proj) => {
                const stats = getProjectStats(proj.id)
                return (
                  <tr
                    key={proj.id}
                    className="hover:bg-emerald-50/20 transition-colors duration-150 ease-in-out cursor-pointer"
                    onClick={() => setViewingProject(proj)}
                  >
                    <td className="px-6 py-3 font-bold text-[#0F5B38]">
                      {proj.code || <span className="text-slate-300 font-normal italic">None</span>}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-800">{proj.name}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-750">
                      {currencySymbol}{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-750">
                      {currencySymbol}{stats.spending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-3 text-right font-black ${stats.margin >= 0 ? 'text-[#0F5B38]' : 'text-rose-600'}`}>
                      {stats.margin < 0 ? '-' : ''}{currencySymbol}{Math.abs(stats.margin).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right flex items-center justify-end space-x-1" onClick={e => e.stopPropagation()}>
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => handleEditClick(proj)}
                            className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-[#0F5B38] rounded-[3px] transition cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj.id, proj.name)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[3px] transition cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-[3px] border border-slate-205 p-8 space-y-4">
          <div className="mx-auto h-12 w-12 bg-emerald-50 text-[#0F5B38] rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-800">No Projects Found</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              Create specific projects or job scopes to accurately track client sales revenues and vendor bill expenditures.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

  return (
    <>
      {mainContent}

      {/* Create / Edit Project Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans flex items-center justify-center py-8">
          <div 
            className="fixed inset-0 bg-[#071f13]/35 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative transform rounded-[28px] bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-100 p-8 space-y-6 mx-4 animate-scaleIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-850">
                  {editingProject ? 'Edit Project Specifications' : 'Declare New Project'}
                </h3>
                <p className="text-[11px] text-slate-450 font-medium">
                  Register tracking labels to assign client invoices and spending bills.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 hover:bg-slate-100 text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-5 text-xs font-semibold text-slate-605">
              <div className="space-y-4">
                {/* Project Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Commercial Office Renovation"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-350"
                  />
                </div>

                {/* Project Code */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wide text-[9px] font-bold">Project Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. COMM-FITOUT-2026"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-[3px] px-4 py-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-[#0F5B38] transition placeholder:text-slate-355"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t border-slate-100 space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200/50 text-slate-650 rounded-[3px] transition cursor-pointer text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#0F5B38] hover:brightness-105 text-white rounded-[3px] shadow-lg shadow-emerald-950/15 cursor-pointer disabled:opacity-50 transition text-xs font-medium flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{editingProject ? 'Save Changes' : 'Create Project'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
