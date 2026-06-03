/* eslint-disable */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  plan?: 'STARTER' | 'PRO' | 'ENTERPRISE'
  monthly_calls_limit?: number
  monthly_calls_used?: number
  wallet_balance?: number
  created_at: string
}

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('saas-controls')
  const [users, setUsers] = useState<User[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isAssigningCredit, setIsAssigningCredit] = useState(false)

  // Agent Marketplace state
  const [templates, setTemplates] = useState<any[]>([])
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: '', description: '', type: 'VOICE', category: 'GENERAL',
    default_prompt: '', default_voice: 'sarah', default_language: 'HINDI',
    default_tone: 'friendly', is_visible: true, is_premium: false,
  })
const router = useRouter()

  const fetchUsers = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchTemplates = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/agent-templates', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) setTemplates(data.templates || [])
    } catch (err) { console.error('Error fetching templates:', err) }
  }, [])

  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('user')

      if (!userData) {
        router.push('/login')
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        if (parsedUser.role.toUpperCase() !== 'SUPER_ADMIN') {
          router.push('/dashboard/user')
          return
        }
        setUser(parsedUser)
        const t = localStorage.getItem('token') || ''
        fetchUsers(t)
        fetchTemplates(t)
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.push('/login')
      }
    }

    checkAuth()
    setIsLoading(false)
  }, [router, fetchUsers])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    }
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setMessageType('')
    const token = localStorage.getItem('token')

    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newAdmin),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin')
      }

      setMessage('Admin created successfully!')
      setMessageType('success')
      setNewAdmin({ name: '', email: '', password: '' })
      setShowCreateForm(false)
      fetchUsers(token!)
    } catch (err: any) {
      setMessage(err.message || 'An error occurred')
      setMessageType('error')
    }
  }

  const handleSuspendUser = async (userId: string, action: 'suspend' | 'activate') => {
    const token = localStorage.getItem('token')
    try {
      const response = await fetch('/api/admin/suspend-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      })
      
      if (response.ok) {
        fetchUsers(token!)
      }
    } catch (error) {
      console.error('Error suspending user:', error)
    }
  }

  // Direct plan assignment by Super Admin
  
  const handleAssignCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creditAmount || isNaN(Number(creditAmount))) return
    
    setIsAssigningCredit(true)
    setMessage('')
    setMessageType('')
    
    const token = localStorage.getItem('token')
    try {
      const response = await fetch('/api/admin/assign-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          creditsToAdd: Number(creditAmount)
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign credits')
      }
      setMessage(`Successfully assigned $${Number(creditAmount).toFixed(2)} to user!`)
      setMessageType('success')
      setShowCreditModal(false)
      setCreditAmount('')
      fetchUsers(token!)
    } catch (err: any) {
      setMessage(err.message || 'An error occurred')
      setMessageType('error')
    } finally {
      setIsAssigningCredit(false)
    }
  }

const handleAssignPlan = async (targetUserId: string, selectedPlan: string) => {
    const token = localStorage.getItem('token')
    setMessage('')
    setMessageType('')
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          targetUserId: targetUserId
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign package')
      }
      setMessage(`SaaS Plan upgraded to ${selectedPlan} successfully for ${data.user.name}!`)
      setMessageType('success')
      fetchUsers(token!)
    } catch (err: any) {
      setMessage(err.message || 'Error assigning package')
      setMessageType('error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
      </div>
    )
  }

  // Statistics calculations
  const totalAdmins = users.filter(u => u.role.toUpperCase() === 'ADMIN').length
  const totalSubUsers = users.filter(u => u.role.toUpperCase() === 'USER').length
  
  // MRR (Monthly Recurring Revenue) simulation
  // Starter = $0, Pro = $49, Enterprise = $199
  const mrr = users
    .filter(u => u.role.toUpperCase() === 'ADMIN' && u.is_active)
    .reduce((acc, curr) => {
      const planVal = curr.plan?.toUpperCase()
      if (planVal === 'PRO') return acc + 49
      if (planVal === 'ENTERPRISE') return acc + 199
      return acc
    }, 0)

  // ─── Template CRUD ────────────────────────────
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/agent-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTemplate),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage('Template created!'); setMessageType('success')
      setShowCreateTemplate(false)
      setNewTemplate({ name: '', description: '', type: 'VOICE', category: 'GENERAL', default_prompt: '', default_voice: 'sarah', default_language: 'HINDI', default_tone: 'friendly', is_visible: true, is_premium: false })
      fetchTemplates(token!)
    } catch (err: any) { setMessage(err.message); setMessageType('error') }
  }

  const handleToggleVisibility = async (templateId: string, currentVisible: boolean) => {
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/agent-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_visible: !currentVisible }),
      })
      fetchTemplates(token!)
    } catch (err) { console.error(err) }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/agent-templates/${templateId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setMessage(data.message); setMessageType('success')
      fetchTemplates(token!)
    } catch (err: any) { setMessage(err.message); setMessageType('error') }
  }

  const navSections = [
    {
      label: 'SYSTEM', items: [
        { id: 'saas-controls', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'SaaS Controls' },
        { id: 'agent-marketplace', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Agent Marketplace' },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#070708] text-[#e0e0e0] flex font-sans overflow-hidden">
      
      {/* ── Sidebar ───────────────────────────────── */}
      <aside className={`flex flex-col bg-[#0b0b0d] border-r border-white/5 h-screen transition-all duration-300 shrink-0 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden opacity-0'}`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" /></svg>
            </div>
            <span className="font-bold text-white tracking-wide">Vaxo</span>
            <span className="ml-1 text-[9px] font-bold uppercase bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Active</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map(section => (
            <div key={section.label}>
              <h3 className="text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-wider mx-3 mb-2 inline-block">{section.label}</h3>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t border-white/5">
            <button onClick={() => router.push('/dashboard/admin')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Admin
            </button>
          </div>
        </div>

        {/* User footer */}
        <div className="border-t border-white/5 p-4 space-y-3 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">System Master</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const token = localStorage.getItem('token');
              if (token) {
                setMessage('');
                setMessageType('');
                fetchUsers(token);
                setMessage('Dashboard synchronized.');
                setMessageType('success');
                setTimeout(() => setMessage(''), 3000);
              }
            }} className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-1.5 rounded transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sync
            </button>
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-1.5 rounded transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#070708]">
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-50 text-gray-400 hover:text-white bg-[#111113] border border-white/10 p-2 rounded-lg shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}

        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 w-full space-y-8">
        
        {/* Messages */}
        {message && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            messageType === 'success'
              ? 'bg-green-950/40 border-green-500/30 text-green-400'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400'
          }`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {messageType === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
            <p className="text-sm font-semibold">{message}</p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#111113] rounded-xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Monthly Recurring Revenue</span>
            <span className="text-3xl font-extrabold text-indigo-400 mt-4">${mrr} <span className="text-xs text-gray-500">/ MRR</span></span>
          </div>

          <div className="bg-[#111113] rounded-xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Registered Tenants (Admins)</span>
            <span className="text-3xl font-extrabold text-white mt-4">{totalAdmins} <span className="text-xs text-gray-500">businesses</span></span>
          </div>

          <div className="bg-[#111113] rounded-xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Sub-Users & Agents</span>
            <span className="text-3xl font-extrabold text-white mt-4">{totalSubUsers} <span className="text-xs text-gray-500">users</span></span>
          </div>

          <div className="bg-[#111113] rounded-xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">System Gateway API</span>
            <span className="text-3xl font-extrabold text-green-400 mt-4">Active</span>
          </div>
        </div>

        {/* Main Management Section */}
        {activeTab === 'saas-controls' && (
        <div className="bg-gradient-to-b from-[#111113] to-[#0a0a0b] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-white mb-1">Accounts & SaaS Controls</h3>
              <p className="text-gray-400 text-sm">Assign packages, suspend credentials, or spin up new Admins manually.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
            >
              {showCreateForm ? 'Cancel' : 'Create New Tenant Admin'}
            </button>
          </div>

          {/* Form to create admin */}
          {showCreateForm && (
            <form onSubmit={handleCreateAdmin} className="mb-8 p-6 bg-black/40 rounded-xl border border-indigo-500/25 space-y-4">
              <h4 className="text-white font-bold text-base mb-2">Create New Tenant Admin</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Company / Owner Name</label>
                  <input
                    type="text"
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Access Password</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs"
                >
                  Create Admin Account
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="bg-black/35 rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-gray-400 text-xs font-bold uppercase border-b border-white/5 bg-black/25">
                  <tr>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Active Package</th>
                    <th className="py-4 px-6">Balance</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 text-white">{u.name}</td>
                      <td className="py-4 px-6">{u.email}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          u.role.toUpperCase() === 'SUPER_ADMIN'
                            ? 'bg-indigo-950 border-indigo-500/40 text-indigo-400'
                            : u.role.toUpperCase() === 'ADMIN'
                            ? 'bg-indigo-950 border-indigo-500/20 text-indigo-400'
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {u.role.toUpperCase() === 'ADMIN' ? (
                          <select
                            value={u.plan || 'STARTER'}
                            onChange={(e) => handleAssignPlan(u.id, e.target.value)}
                            className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                          >
                            <option value="STARTER">Starter ($0)</option>
                            <option value="PRO">Pro ($49)</option>
                            <option value="ENTERPRISE">Enterprise ($199)</option>
                          </select>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-green-400 font-bold">
                          ${Number(u.wallet_balance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          u.is_active
                            ? 'bg-green-950/40 border-green-500/20 text-green-400'
                            : 'bg-indigo-950/40 border-indigo-500/20 text-indigo-400'
                        }`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-4 px-6 flex items-center gap-2">
                        {u.role.toUpperCase() !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleSuspendUser(u.id, u.is_active ? 'suspend' : 'activate')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-300 ${
                              u.is_active
                                ? 'bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400'
                                : 'bg-green-950 hover:bg-green-900 border border-green-500/20 hover:border-green-500/40 text-green-400'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                        {u.role.toUpperCase() === 'ADMIN' && (
                          <button
                            onClick={() => {
                              setSelectedUserId(u.id)
                              setCreditAmount('')
                              setShowCreditModal(true)
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-all duration-300"
                          >
                            + Credits
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* ════════════════════════════════════
            TAB: AGENT MARKETPLACE
        ════════════════════════════════════ */}
        {activeTab === 'agent-marketplace' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-extrabold text-white mb-1">Agent Marketplace</h3>
                <p className="text-gray-400 text-sm">Create and manage agent templates that Admins can use to build agents.</p>
              </div>
              <button
                onClick={() => setShowCreateTemplate(!showCreateTemplate)}
                className="bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-lg shadow-md transition-all"
              >
                {showCreateTemplate ? 'Cancel' : '+ Create Template'}
              </button>
            </div>

            {/* Create Template Form */}
            {showCreateTemplate && (
              <form onSubmit={handleCreateTemplate} className="bg-black/40 rounded-xl border border-indigo-500/25 p-6 space-y-4">
                <h4 className="text-white font-bold text-base">New Agent Template</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Template Name</label>
                    <input type="text" required value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Sales Outbound Bot" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Description</label>
                    <input type="text" value={newTemplate.description} onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="A bot for outbound sales calls" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Type</label>
                    <select value={newTemplate.type} onChange={e => setNewTemplate({...newTemplate, type: e.target.value})}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="VOICE">🎙️ Voice Agent</option>
                      <option value="CHAT">💬 Chat Agent</option>
                      <option value="BOTH">🔄 Voice + Chat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Category</label>
                    <select value={newTemplate.category} onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="SALES">Sales</option>
                      <option value="SUPPORT">Support</option>
                      <option value="SURVEY">Survey</option>
                      <option value="COLLECTION">Collection</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Language</label>
                    <select value={newTemplate.default_language} onChange={e => setNewTemplate({...newTemplate, default_language: e.target.value})}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="HINDI">Hindi</option>
                      <option value="ENGLISH">English</option>
                      <option value="HINGLISH">Hinglish</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Tone</label>
                    <select value={newTemplate.default_tone} onChange={e => setNewTemplate({...newTemplate, default_tone: e.target.value})}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Default System Prompt</label>
                  <textarea rows={4} required value={newTemplate.default_prompt} onChange={e => setNewTemplate({...newTemplate, default_prompt: e.target.value})}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 resize-none"
                    placeholder="You are a helpful sales agent..." />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={newTemplate.is_visible} onChange={e => setNewTemplate({...newTemplate, is_visible: e.target.checked})} className="rounded" />
                    Visible to Admins
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={newTemplate.is_premium} onChange={e => setNewTemplate({...newTemplate, is_premium: e.target.checked})} className="rounded" />
                    Premium Only (PRO/ENTERPRISE)
                  </label>
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm">Create Template</button>
              </form>
            )}

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t: any) => (
                <div key={t.id} className={`bg-[#111113] border rounded-xl p-5 space-y-3 transition-all hover:border-indigo-500/30 ${
                  t.is_visible ? 'border-white/5' : 'border-red-500/20 opacity-60'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg">
                        {t.type === 'VOICE' ? '🎙️' : t.type === 'CHAT' ? '💬' : '🔄'}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{t.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{t.type}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">{t.category}</span>
                          {t.is_premium && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">PRO+</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {t.description && <p className="text-gray-500 text-xs">{t.description}</p>}
                  <p className="text-gray-400 text-xs truncate">{t.default_prompt?.slice(0, 80)}...</p>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button onClick={() => handleToggleVisibility(t.id, t.is_visible)}
                      className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition-colors ${
                        t.is_visible
                          ? 'bg-green-950/40 border-green-500/20 text-green-400 hover:bg-green-950/60'
                          : 'bg-red-950/40 border-red-500/20 text-red-400 hover:bg-red-950/60'
                      }`}>
                      {t.is_visible ? '👁️ Visible' : '🚫 Hidden'}
                    </button>
                    <button onClick={() => handleDeleteTemplate(t.id)}
                      className="text-xs font-bold py-1.5 px-3 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-950/40 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-sm">No agent templates yet.</p>
                  <button onClick={() => setShowCreateTemplate(true)} className="mt-3 text-indigo-400 text-sm font-bold hover:text-indigo-300">+ Create your first template</button>
                </div>
              )}
            </div>
          </div>
        )}

        </div>
      </main>
    
      {/* Credit Assignment Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Assign Credits</h2>
            <p className="text-sm text-gray-400 mb-6">Enter the amount of USD to add to this user's wallet.</p>
            
            <form onSubmit={handleAssignCredits} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white focus:border-green-500 outline-none"
                    placeholder="50.00"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreditModal(false)}
                  className="flex-1 px-4 py-2 text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningCredit}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAssigningCredit ? 'Assigning...' : 'Add Credits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
</div>
  )
}

