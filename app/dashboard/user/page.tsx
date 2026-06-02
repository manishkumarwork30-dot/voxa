'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: string
  adminId?: string
}

interface Agent {
  id: string
  name: string
  language: string
  voice_model: string
  system_prompt: string
  status: string
  created_at: string
}

interface Campaign {
  id: string
  name: string
  type: string
  contacts: string[]
  status: string
  created_at: string
  agent_id: { id: string; name: string }
}

interface Call {
  id: string
  direction: string
  caller_number: string
  duration_sec: number
  status: string
  transcript?: string
  recording_url?: string
  cost_usd?: number
  created_at: string
  agent_id?: { name: string }
}

export default function UserDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'campaigns' | 'calls' | 'dialer'>('overview')

  // Lists
  const [agents, setAgents] = useState<Agent[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [calls, setCalls] = useState<Call[]>([])

  // Dialer Simulator States
  const [dialPhoneNumber, setDialPhoneNumber] = useState('')
  const [dialAgentId, setDialAgentId] = useState('')
  const [dialSimulate, setDialSimulate] = useState(true)
  const [callActive, setCallActive] = useState(false)
  const [callStatusText, setCallStatusText] = useState('Idle')
  const [callTimer, setCallTimer] = useState(0)
  const [activeCallDetails, setActiveCallDetails] = useState<any>(null)

  // Messages
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const router = useRouter()

  const fetchData = useCallback(async (token: string) => {
    try {
      // 1. Fetch Agents
      const agentsRes = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const agentsData = await agentsRes.json()
      if (agentsRes.ok) {
        setAgents(agentsData.agents || [])
      }

      // 2. Fetch Campaigns
      const campRes = await fetch('/api/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const campData = await campRes.json()
      if (campRes.ok) {
        setCampaigns(campData.campaigns || [])
      }

      // 3. Fetch Calls
      const callsRes = await fetch('/api/calls', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const callsData = await callsRes.json()
      if (callsRes.ok) {
        setCalls(callsData.calls || [])
      }
    } catch (err) {
      console.error('Error fetching sub-user data:', err)
    }
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
        setUser(parsedUser)
        fetchData(localStorage.getItem('token') || '')
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.push('/login')
      }
    }

    checkAuth()
    setIsLoading(false)
  }, [router, fetchData])

  // Call Timer Effect
  useEffect(() => {
    let interval: any
    if (callActive) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1)
      }, 1000)
    } else {
      setCallTimer(0)
    }
    return () => clearInterval(interval)
  }, [callActive])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    router.push('/login')
  }

  // Dial call
  const handleDialCall = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    
    if (!dialPhoneNumber || !dialAgentId) {
      setErrorMsg('Please specify both phone number and select an agent.')
      return
    }

    const token = localStorage.getItem('token')
    setCallActive(true)
    setCallStatusText('Ringing...')
    
    try {
      const response = await fetch('/api/calls/outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: dialPhoneNumber,
          agentId: dialAgentId,
          simulate: dialSimulate
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect call')
      }

      setActiveCallDetails(data.call)
      
      // Simulate ringing transition to in-progress
      setTimeout(() => {
        setCallStatusText('In Progress (Active Conversational Flow)')
      }, 2000)

    } catch (err: any) {
      setCallActive(false)
      setCallStatusText('Failed')
      setErrorMsg(err.message)
    }
  }

  const handleHangUp = () => {
    setCallActive(false)
    setCallStatusText('Call Ended')
    setSuccessMsg('Call concluded and recorded successfully!')
    setDialPhoneNumber('')
    setDialAgentId('')
    setActiveCallDetails(null)
    fetchData(localStorage.getItem('token') || '')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col font-sans">
      
      {/* Navbar */}
      <nav className="bg-black/50 backdrop-blur-md border-b border-red-950/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-tr from-red-700 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <span className="font-extrabold text-2xl bg-gradient-to-r from-white via-gray-100 to-red-500 bg-clip-text text-transparent tracking-tight">
                Vaxo Calling AI
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-gray-100 font-semibold text-sm">{user?.name}</span>
                <span className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase">
                  {user?.role}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    if (token) {
                      setSuccessMsg('');
                      setErrorMsg('');
                      fetchData(token);
                      setSuccessMsg('Dashboard synchronized.');
                      setTimeout(() => setSuccessMsg(''), 3000);
                    }
                  }}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 border border-red-500/20 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-600/10 hover:shadow-red-500/20 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Workspace Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-grow flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {[
            { id: 'overview', name: 'Dashboard Home', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { id: 'dialer', name: 'Calling Dialer Console', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
            { id: 'agents', name: 'View AI Voice Agents', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z' },
            { id: 'campaigns', name: 'Calling Campaigns', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 13a4 4 0 01-8 0v-2a3 3 0 013-3h2m3 5a4 4 0 008 0v-2a3 3 0 00-3-3h-2' },
            { id: 'calls', name: 'Call Log & Transcripts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className={`flex items-center gap-3.5 px-5 py-4 rounded-xl text-sm font-bold transition-all duration-300 text-left border ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-950/40 to-transparent border-red-500/40 text-red-400 shadow-md shadow-red-950/10'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
              </svg>
              {tab.name}
            </button>
          ))}
        </aside>

        {/* Console Workspace */}
        <main className="flex-grow bg-[#111113] border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          {/* Notifications */}
          {errorMsg && (
            <div className="mb-6 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-green-950/40 border border-green-500/30 text-green-400 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome Back, {user?.name}!</h2>
                <p className="text-gray-400">Manage, view, and test real-time customer calls for the business.</p>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/35 rounded-xl p-6 border border-white/5">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Agents Deployed</span>
                  <p className="text-3xl font-extrabold text-white mt-4">{agents.length}</p>
                </div>
                <div className="bg-black/35 rounded-xl p-6 border border-white/5">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Campaigns Active</span>
                  <p className="text-3xl font-extrabold text-white mt-4">{campaigns.length}</p>
                </div>
                <div className="bg-black/35 rounded-xl p-6 border border-white/5">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Logged Calls</span>
                  <p className="text-3xl font-extrabold text-red-400 mt-4">{calls.length}</p>
                </div>
              </div>

              {/* Calling Tips */}
              <div className="bg-gradient-to-r from-red-950/20 to-transparent border border-red-500/20 rounded-xl p-5">
                <h4 className="text-white font-bold text-sm mb-2">Dialer Console Access Enabled</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  As an Operator/Sub-user, you can navigate to the **Calling Dialer Console** tab to execute sandbox-simulated voice calls. 
                  This will test parent Admin AI agents immediately and record log transcripts directly for analysis.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CALLING DIALER CONSOLE */}
          {activeTab === 'dialer' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Calling Dialer Console</h2>
                <p className="text-gray-400">Trigger outbound calls from parent admin's agent line immediately.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Dial Form */}
                <div className="bg-[#17171a] border border-white/5 rounded-xl p-6 space-y-6">
                  <h3 className="text-white font-bold text-lg">Direct Dialer Pad</h3>
                  
                  <form onSubmit={handleDialCall} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Active Agent</label>
                      <select
                        value={dialAgentId}
                        onChange={(e) => setDialAgentId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-500 transition-colors"
                        required
                        disabled={callActive}
                      >
                        <option value="">Choose Voice Bot...</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.language})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +919876543210"
                        value={dialPhoneNumber}
                        onChange={(e) => setDialPhoneNumber(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-500 transition-colors font-mono"
                        required
                        disabled={callActive}
                      />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id="simulate-checkbox"
                        checked={dialSimulate}
                        onChange={(e) => setDialSimulate(e.target.checked)}
                        className="rounded border-white/10 bg-black text-red-500"
                        disabled={callActive}
                      />
                      <label htmlFor="simulate-checkbox" className="text-xs text-gray-400 font-semibold cursor-pointer">
                        Run in Sandbox Mode (Simulated call & automated transcription)
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={callActive}
                      className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3.5 rounded-lg text-sm transition-all duration-300 disabled:opacity-50"
                    >
                      Connect Outbound Call
                    </button>
                  </form>
                </div>

                {/* Simulated Live Call Panel */}
                <div className="bg-[#17171a] border border-white/5 rounded-xl p-6 flex flex-col justify-between min-h-[320px] relative overflow-hidden">
                  
                  {callActive ? (
                    <>
                      {/* Active Caller Header */}
                      <div className="text-center space-y-2 mt-4">
                        <span className="bg-red-950 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Live Audio Stream
                        </span>
                        <h4 className="text-white text-2xl font-black">{dialPhoneNumber}</h4>
                        <p className="text-gray-400 text-xs font-semibold">{callStatusText}</p>
                      </div>

                      {/* Animated Sound Wave Graphic */}
                      <div className="flex justify-center items-center gap-1.5 my-8 h-10">
                        <div className="w-1 bg-red-500 h-6 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 bg-red-400 h-10 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        <div className="w-1 bg-red-600 h-4 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                        <div className="w-1 bg-red-500 h-8 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1 bg-red-400 h-5 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>

                      {/* Timer & Hang Up */}
                      <div className="text-center space-y-4 mb-4">
                        <p className="text-white font-mono font-bold text-xl">
                          {Math.floor(callTimer / 60).toString().padStart(2, '0')}:
                          {(callTimer % 60).toString().padStart(2, '0')}
                        </p>
                        
                        <button
                          onClick={handleHangUp}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-full text-xs transition-colors shadow-lg shadow-red-600/30"
                        >
                          Conclude / Hang Up
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-grow text-center space-y-3">
                      <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm font-bold">Calling Line Idle</p>
                      <p className="text-gray-600 text-xs max-w-xs font-semibold">
                        Enter a telephone number and assign a voice agent on the left to initiate operations.
                      </p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VIEW AGENTS */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Available Voice Agents</h2>
                <p className="text-gray-400">Deployed AI Voice Bots configured by the workspace administrator.</p>
              </div>

              {agents.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10 bg-black/25 rounded-xl border border-white/5">
                  No active voice agents found in this workspace.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agents.map(agent => (
                    <div key={agent.id} className="bg-black/35 border border-white/5 rounded-xl p-5 relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-white font-bold text-lg">{agent.name}</h4>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 font-bold uppercase">
                          {agent.language}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-400 font-semibold mb-4">
                        <p><span className="text-gray-500">Voice:</span> {agent.voice_model}</p>
                        <p className="line-clamp-3"><span className="text-gray-500">Guidelines:</span> {agent.system_prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VIEW CAMPAIGNS */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Campaigns Log</h2>
                <p className="text-gray-400">Outbound call queues run by your parent admin.</p>
              </div>

              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10 bg-black/25 rounded-xl border border-white/5">
                  No campaigns configured in this workspace.
                </p>
              ) : (
                <div className="bg-black/25 border border-white/5 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-gray-400 text-xs font-bold uppercase border-b border-white/5 bg-black/25">
                        <tr>
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">Agent</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6">Contacts Size</th>
                          <th className="py-4 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
                        {campaigns.map(c => (
                          <tr key={c.id}>
                            <td className="py-4 px-6 text-white">{c.name}</td>
                            <td className="py-4 px-6">{c.agent_id?.name || 'Vocal Agent'}</td>
                            <td className="py-4 px-6 text-xs text-gray-400">{c.type}</td>
                            <td className="py-4 px-6">{c.contacts?.length || 0}</td>
                            <td className="py-4 px-6">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-950/40 border border-red-500/20 text-red-400">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VIEW CALL LOGS */}
          {activeTab === 'calls' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Calls History Logs</h2>
                <p className="text-gray-400">Logs and conversational transcripts for outbound voice bot calls.</p>
              </div>

              {calls.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10 bg-black/25 rounded-xl border border-white/5">
                  No calling history records found in this workspace.
                </p>
              ) : (
                <div className="space-y-4">
                  {calls.map(call => (
                    <div key={call.id} className="bg-[#17171a] border border-white/5 rounded-xl p-5 hover:border-red-500/20 transition-all duration-300 space-y-4">
                      
                      {/* Top bar info */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-extrabold text-base">{call.caller_number}</span>
                          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-bold">
                            {call.direction}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
                          <span>{call.duration_sec}s duration</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] uppercase bg-green-950/40 border border-green-500/20 text-green-400">
                            {call.status}
                          </span>
                        </div>
                      </div>

                      {/* Transcript */}
                      {call.transcript ? (
                        <div className="bg-black/35 rounded-lg p-3 text-xs text-gray-300 font-medium leading-relaxed italic border border-white/5">
                          <span className="text-red-400 font-bold block not-italic mb-1 uppercase tracking-wider text-[9px]">Agent Transcript:</span>
                          "{call.transcript}"
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs italic">Transcript pending or empty call.</p>
                      )}

                      <div className="text-[10px] text-gray-500 font-medium">
                        Log date: {new Date(call.created_at).toLocaleString()} | Voice bot: {call.agent_id?.name || 'Standard Voice'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
