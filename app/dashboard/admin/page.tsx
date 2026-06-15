/* eslint-disable */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface User {
  id: string; name: string; email: string; role: string
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE'; subscription_status: string
  monthly_calls_limit: number; monthly_calls_used: number
  billing_cycle_end?: string; vapi_phone_number?: string
  vapi_api_key?: string; wallet_balance?: number; notification_settings?: any
}
interface Agent {
  id: string; name: string; language: string; voice_model: string
  system_prompt: string; status: string; created_at: string
  vapi_agent_id?: string; tone?: string
}
interface Campaign {
  id: string; name: string; type: string; contacts: any[]
  status: string; created_at: string; agent_id: string
  total_calls: number; success_count: number; automation_settings?: any
}
interface Call {
  id: string; direction: string; caller_number: string
  duration_sec: number; status: string; transcript?: string
  recording_url?: string; cost_usd?: number; created_at: string
  vapi_call_id: string; agent_id?: string
}
interface Lead {
  id: string; customer_name: string; phone: string; email?: string
  intent_score: number; status: string; created_at: string
  campaign_id?: string; response_text?: string
  campaigns?: { name: string }
}
interface SubUser { id: string; name: string; email: string; role: string; is_active: boolean }

// ─────────────────────────────────────────────
// Local Fallback / Built-in Templates
// ─────────────────────────────────────────────
const LOCAL_TEMPLATES = [
  {
    id: 'mobile-tower-hindi',
    name: 'Mobile Tower Installation (Hindi)',
    description: 'मोबाइल टावर स्थापना संबंधी अपडेट और सहमति जांच',
    type: 'VOICE',
    category: 'GENERAL',
    default_prompt: `तुम एक ग्राहक संबंध कार्यकारी (Customer Relationship Executive) 'Ms. Meena Kumari' हो। तुम्हारा काम ग्राहक से मोबाइल टावर स्थापना संबंधी विवरणों पर चर्चा करना है।
हमेशा विनम्र, सम्मानजनक और मददगार रहो। हिंदी में बात करो।

मुख्य बातचीत के मुद्दे:
1. मोबाइल टावर स्थापना के अवसर में उनकी रुचि के लिए धन्यवाद देना।
2. उन्हें बताना कि उनका विवरण ऑनलाइन स्थान सर्वेक्षण के लिए सर्वेक्षण टीम को भेज दिया गया है, जिसके आधार पर टावर स्थापना की पुष्टि की जाएगी।
3. यदि स्थान स्वीकृत हो जाता है, तो निम्नलिखित लाभ समझाना:
   - अग्रिम भुगतान (Advance): ₹70,00,000/- (स्थापना से पहले)
   - मासिक किराया: ₹60,000/- (₹30,000/- सीधे खाते में + ₹30,000/- EMI में)
   - रोजगार: परिवार के एक सदस्य को ₹20,000/- मासिक वेतन पर टावर रखरखाव अनुबंध के तहत नौकरी।
4. उन्हें सूचित करना कि स्थान की स्वीकृति मिलने के बाद, कल सुबह तक WhatsApp पर PDF स्वीकृति रिपोर्ट मिल जाएगी।
5. महत्वपूर्ण नोट: स्वीकृति मिलने पर, उन्हें ₹2,550 का एकमुश्त पंजीकरण शुल्क (One-time Registration Fee) देना होगा जिससे बुकिंग की पुष्टि होगी।
6. उनसे स्पष्ट रूप से पूछना कि क्या वे इन शर्तों से सहमत हैं और आगे बात करना चाहते हैं?
   - यदि वे "YES" या सहमति देते हैं, तो उनका नाम और पिन कोड (PIN Code) कन्फर्म करो, और बोलो कि हमारे वरिष्ठ अधिकारी उनसे जल्द संपर्क करेंगे। फिर बातचीत समाप्त करो।
   - यदि वे "NO" या असहमति व्यक्त करते हैं, तो उन्हें धन्यवाद देकर कॉल समाप्त करो।

बहुत महत्वपूर्ण निर्देश:
- हमेशा विनम्रता से बात करो।
- ग्राहक के प्रश्नों का उत्तर संक्षिप्त और स्पष्ट रूप से दो।
- यदि वे सहमत हों (YES), तो बातचीत को सकारात्मक रूप से समाप्त करो।`,
    default_voice: 'natural_hindi_voice',
    default_language: 'HINDI',
    default_tone: 'friendly',
  }
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatDuration = (sec: number) => `${Math.floor(sec / 60)}m ${sec % 60}s`
const formatDate = (d: string) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('composer')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Data
  const [agents, setAgents] = useState<Agent[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [calls, setCalls] = useState<Call[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [subUsers, setSubUsers] = useState<SubUser[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>(LOCAL_TEMPLATES)
  const [chatConversations, setChatConversations] = useState<any[]>([])
  const [agentTypeFilter, setAgentTypeFilter] = useState('ALL')

  // Create forms
  const [newAgent, setNewAgent] = useState({ name: '', language: 'HINDI', voice_model: 'sarah', system_prompt: '', tone: 'friendly', type: 'VOICE', template_id: '' })
  const [newCampaign, setNewCampaign] = useState({ name: '', agent_id: '', type: 'OUTBOUND', contactsRaw: '', delay: '30' })
  const [newSubUser, setNewSubUser] = useState({ name: '', email: '', password: '' })
  const [providerConfig, setProviderConfig] = useState({ 
    telephony_provider: 'VAPI',
    vapi_api_key: '', vapi_phone_number: '',
    retell_api_key: '', retell_phone_number: '',
    bland_api_key: '', bland_phone_number: '',
    telnyx_api_key: '', telnyx_phone_number: ''
  })
  const [notifSettings, setNotifSettings] = useState({ email: false, sms: false, email_address: '', phone_number: '' })

  // UI states
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [expandedLiveCall, setExpandedLiveCall] = useState<string | null>(null)
  const [callSearch, setCallSearch] = useState('')
  const [leadFilter, setLeadFilter] = useState('ALL')
  const [testingVapi, setTestingVapi] = useState(false)
  const [vapiTestResult, setVapiTestResult] = useState<{ valid: boolean; message: string } | null>(null)

  // Composer (quick dialer)
  const [dialPhone, setDialPhone] = useState('')
  const [dialAgent, setDialAgent] = useState('')
  const [dialSimulate, setDialSimulate] = useState(true)
  const [isDialing, setIsDialing] = useState(false)
  const [dialResult, setDialResult] = useState<any>(null)

  // Billing
  const [showRazorpayModal, setShowRazorpayModal] = useState(false)
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<'PRO' | 'ENTERPRISE' | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Bland AI Number Purchasing
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyAreaCode, setBuyAreaCode] = useState('415')
  const [buyCountryCode, setBuyCountryCode] = useState('US')
  const [buyingNumber, setBuyingNumber] = useState(false)

  const handleBuyNumber = async () => {
    setBuyingNumber(true)
    try {
      const res = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          action: 'buy',
          area_code: buyAreaCode,
          country_code: buyCountryCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to purchase phone number')
      showMsg(`Successfully purchased phone number: ${data.result?.phone_number || 'success'}`, 'success')
      setShowBuyModal(false)
      // Auto-reload active numbers
      const listRes = await fetch('/api/phone-numbers', { headers: { Authorization: `Bearer ${token()}` } })
      const listData = await listRes.json()
      if (listRes.ok) {
        setPhoneNumbers(listData.phone_numbers || [])
      }
    } catch (err: any) {
      showMsg(err.message, 'error')
    } finally {
      setBuyingNumber(false)
    }
  }

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  // Agent editing & Flow builder states
  const [editingAgent, setEditingAgent] = useState<any | null>(null)
  const [editModalTab, setEditModalTab] = useState<'general' | 'flow' | 'chat'>('general')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [embedAgentId, setEmbedAgentId] = useState('')
  const [editAgentForm, setEditAgentForm] = useState({
    name: '',
    language: 'HINDI',
    voice_model: 'sarah',
    system_prompt: '',
    tone: 'friendly',
    type: 'VOICE',
    call_flow: { nodes: [] as any[], edges: [] as any[] },
    chat_config: { welcome_message: 'Hello!', theme_color: '#6366f1', position: 'bottom-right' }
  })

  // CSV bulk campaign state
  const [campaignMode, setCampaignMode] = useState<'STANDARD' | 'CSV'>('STANDARD')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvScript, setCsvScript] = useState('You are a friendly sales agent calling customers about our AI service.\n\nFirst, introduce yourself and the purpose of the call.')
  const [csvLanguage, setCsvLanguage] = useState<'hi' | 'en'>('hi')
  const [csvVoiceId, setCsvVoiceId] = useState('sarah')
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)

  // Live Stats modal state
  const [activeStatsCampaign, setActiveStatsCampaign] = useState<any | null>(null)
  const [liveCalls, setLiveCalls] = useState<any[]>([])
  const [autoRefreshStats, setAutoRefreshStats] = useState(false)
  const statsTimerRef = useRef<any>(null)

  const fetchLiveCampaignStats = useCallback(async (campId: string, tok: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campId}/stats`, {
        headers: { Authorization: `Bearer ${tok}` }
      })
      const data = await res.json()
      if (res.ok) {
        setActiveStatsCampaign(data.campaign)
        setLiveCalls(data.calls || [])
      }
    } catch (err) {
      console.error('Error fetching live stats:', err)
    }
  }, [])

  useEffect(() => {
    const tok = localStorage.getItem('token') || ''
    if (activeStatsCampaign && autoRefreshStats) {
      fetchLiveCampaignStats(activeStatsCampaign.id, tok)
      statsTimerRef.current = setInterval(() => {
        fetchLiveCampaignStats(activeStatsCampaign.id, tok)
      }, 5000)
    } else {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current)
      }
    }
    return () => {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current)
      }
    }
  }, [activeStatsCampaign, autoRefreshStats, fetchLiveCampaignStats])

  // ─── Fetch all data ───────────────────────────────
  const fetchData = useCallback(async (token: string) => {
    try {
      const [userRes, agentsRes, campRes, callsRes, leadsRes, subUsersRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/agents', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/campaigns', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/calls?limit=100', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/leads?limit=50', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const [usersData, agentsData, campData, callsData, leadsData, subData] = await Promise.all([
        userRes.json(), agentsRes.json(), campRes.json(), callsRes.json(), leadsRes.json(), subUsersRes.json()
      ])

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const matched = usersData.users?.find((u: any) => u.id === storedUser.id)
      if (matched) {
        setUser(matched)
        setProviderConfig({ 
          telephony_provider: matched.telephony_provider || 'VAPI',
          vapi_api_key: matched.vapi_api_key ? '••••••••••••••••' : '', vapi_phone_number: matched.vapi_phone_number || '',
          retell_api_key: matched.retell_api_key ? '••••••••••••••••' : '', retell_phone_number: matched.retell_phone_number || '',
          bland_api_key: matched.bland_api_key ? '••••••••••••••••' : '', bland_phone_number: matched.bland_phone_number || '',
          telnyx_api_key: matched.telnyx_api_key ? '••••••••••••••••' : '', telnyx_phone_number: matched.telnyx_phone_number || ''
        })
        setNotifSettings(matched.notification_settings || { email: false, sms: false, email_address: '', phone_number: '' })
      }

      if (agentsRes.ok) setAgents(agentsData.agents?.filter((a: Agent) => a.status !== 'DELETED') || [])
      if (campRes.ok) setCampaigns(campData.campaigns || [])
      if (callsRes.ok) setCalls(callsData.calls || [])
      if (leadsRes.ok) setLeads(leadsData.leads || [])
      if (subUsersRes.ok) setSubUsers(subData.users?.filter((u: any) => u.id !== storedUser.id) || [])

      // Fetch templates and chat conversations
      try {
        const [templatesRes, chatRes] = await Promise.all([
          fetch('/api/agent-templates', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/chat/conversations', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const [templatesData, chatData] = await Promise.all([templatesRes.json(), chatRes.json()])
        if (templatesRes.ok) setTemplates([...LOCAL_TEMPLATES, ...(templatesData.templates || [])])
        if (chatRes.ok) setChatConversations(chatData.conversations || [])
      } catch (e) { console.error('Secondary fetch error:', e) }
    } catch (err) { console.error('fetchData error:', err) }
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { router.push('/login'); return }
    try {
      const parsed = JSON.parse(userData)
      if (parsed.role.toUpperCase() !== 'ADMIN' && parsed.role.toUpperCase() !== 'SUPER_ADMIN') {
        router.push('/dashboard/user'); return
      }
      setUser(parsed)
      const token = localStorage.getItem('token') || ''
      fetchData(token)
    } catch { router.push('/login') }
    setIsLoading(false)
  }, [router, fetchData])

  const showMsg = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }
    else { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 6000) }
  }

  const token = () => localStorage.getItem('token') || ''

  // ─── Create Agent ──────────────────────────────────
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/agents', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newAgent)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg(`Agent "${newAgent.name}" created! ${data.agent?.vapi_linked ? '✅ Synced to VAPI' : newAgent.type === 'CHAT' ? '💬 Chat Agent Ready' : '⚠️ No VAPI key set'}`, 'success')
      setNewAgent({ name: '', language: 'HINDI', voice_model: 'sarah', system_prompt: '', tone: 'friendly', type: 'VOICE', template_id: '' })
      setShowCreateAgent(false)
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  // ─── Create Campaign ──────────────────────────────
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    const contacts = newCampaign.contactsRaw.split(/[\n,]/).map(c => c.trim()).filter(Boolean)
    if (contacts.length === 0) { showMsg('Please add at least one contact', 'error'); return }
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          name: newCampaign.name, agent_id: newCampaign.agent_id, type: newCampaign.type, contacts,
          automation_settings: { retry_count: 2, delay_between_calls: parseInt(newCampaign.delay), retry_delay: 300 }
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg(`Campaign "${newCampaign.name}" created with ${contacts.length} contacts!`, 'success')
      setNewCampaign({ name: '', agent_id: '', type: 'OUTBOUND', contactsRaw: '', delay: '30' })
      setShowCreateCampaign(false)
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  const handleCreateCSVCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) { showMsg('Please select a CSV file', 'error'); return }
    if (!newCampaign.name) { showMsg('Please enter a campaign name', 'error'); return }
    setIsUploadingCSV(true)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('campaignName', newCampaign.name)
      formData.append('script', csvScript)
      formData.append('language', csvLanguage)
      formData.append('voiceId', csvVoiceId)

      const res = await fetch('/api/campaigns/bulk-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`
        },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg(`Bulk Campaign "${newCampaign.name}" created successfully with ${data.contactsCount} contacts!`, 'success')
      setNewCampaign({ name: '', agent_id: '', type: 'OUTBOUND', contactsRaw: '', delay: '30' })
      setCsvFile(null)
      setShowCreateCampaign(false)
      fetchData(token())
    } catch (err: any) {
      showMsg(err.message, 'error')
    } finally {
      setIsUploadingCSV(false)
    }
  }

  // ─── Campaign Controls ────────────────────────────
  const handleCampaignStart = async (campId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campId}/start`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg(data.message, 'success')
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  const handleCampaignPause = async (campId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campId}/pause`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg(data.message, 'success')
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  // ─── Quick Dial ───────────────────────────────────
  const handleQuickDial = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDialing(true); setDialResult(null)
    try {
      const res = await fetch('/api/calls/outbound', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ phoneNumber: dialPhone, agentId: dialAgent, simulate: dialSimulate })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDialResult(data)
      showMsg(`Call ${dialSimulate ? 'simulated' : 'initiated'} to ${dialPhone}!`, 'success')
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
    finally { setIsDialing(false) }
  }

  // ─── Delete Agent ─────────────────────────────────
  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Delete agent "${agentName}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg('Agent deleted', 'success')
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  // ─── Edit / Configure Agent ────────────────────────
  const handleEditAgentClick = (agent: any) => {
    setEditingAgent(agent)
    setEditAgentForm({
      name: agent.name,
      language: agent.language,
      voice_model: agent.voice_model || 'sarah',
      system_prompt: agent.system_prompt || '',
      tone: agent.tone || 'friendly',
      type: agent.type || 'VOICE',
      call_flow: agent.call_flow || { nodes: [], edges: [] },
      chat_config: agent.chat_config || { welcome_message: 'Hello!', theme_color: '#6366f1', position: 'bottom-right' }
    })
    setEditModalTab('general')
    setSelectedNodeId(agent.call_flow?.nodes?.[0]?.id || null)
  }

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAgent) return
    try {
      const errors = validateFlowLocal(editAgentForm.call_flow)
      if (editAgentForm.type !== 'CHAT' && editAgentForm.call_flow?.nodes?.length > 0 && errors.length > 0) {
        if (!confirm(`Flow Validation Warning: ${errors.join(', ')}. Do you still want to save?`)) {
          return
        }
      }
      const res = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(editAgentForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg(`Agent "${editAgentForm.name}" updated successfully!`, 'success')
      setEditingAgent(null)
      fetchData(token())
    } catch (err: any) {
      showMsg(err.message, 'error')
    }
  }

  // ─── Flow Builder Helpers ─────────────────────────
  const addFlowNode = () => {
    const newId = `node_${Date.now().toString().slice(-4)}`
    const newNode = {
      id: newId,
      type: 'question' as const,
      message: 'Enter prompt/question text here...',
      nextNodeId: ''
    }
    setEditAgentForm(prev => ({
      ...prev,
      call_flow: {
        ...prev.call_flow,
        nodes: [...prev.call_flow.nodes, newNode]
      }
    }))
    setSelectedNodeId(newId)
  }

  const updateFlowNode = (index: number, updatedFields: any) => {
    setEditAgentForm(prev => {
      const nodes = [...prev.call_flow.nodes]
      nodes[index] = { ...nodes[index], ...updatedFields }
      return {
        ...prev,
        call_flow: { ...prev.call_flow, nodes }
      }
    })
  }

  const deleteFlowNode = (index: number) => {
    setEditAgentForm(prev => {
      const nodes = prev.call_flow.nodes.filter((_, i) => i !== index)
      return {
        ...prev,
        call_flow: { ...prev.call_flow, nodes }
      }
    })
  }

  const validateFlowLocal = (flow: any) => {
    if (!flow || !flow.nodes) return ['Flow must have nodes']
    if (flow.nodes.length === 0) return []
    const ids = new Set(flow.nodes.map((n: any) => n.id))
    const errors: string[] = []
    
    for (const node of flow.nodes) {
      if (!node.id) errors.push('Every step must have an ID')
      if (!node.message) errors.push(`Step "${node.id || 'unnamed'}" is missing instructions/message`)
    }
    
    for (const node of flow.nodes) {
      if (node.type !== 'branch' && node.type !== 'transfer' && node.type !== 'closing') {
        if (node.nextNodeId && !ids.has(node.nextNodeId)) {
          errors.push(`Step "${node.id}" references non-existent step "${node.nextNodeId}"`)
        }
      }
      if (node.type === 'branch') {
        if (!node.options || node.options.length < 2) {
          errors.push(`Branch step "${node.id}" must have at least 2 options`)
        } else {
          for (const opt of node.options) {
            if (!opt.nextNodeId || !ids.has(opt.nextNodeId)) {
              errors.push(`Branch step "${node.id}", option "${opt.label}" goes to non-existent step`)
            }
          }
        }
      }
    }
    
    const hasGreeting = flow.nodes.some((n: any) => n.type === 'greeting')
    if (!hasGreeting) errors.push('Flow should have at least one greeting node as starting point')
    
    return errors
  }

  // ─── Lead Status ──────────────────────────────────
  const handleLeadStatus = async (leadId: string, status: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Failed to update lead')
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  // ─── Provider Config Save ─────────────────────────────
  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body: any = { 
        telephony_provider: providerConfig.telephony_provider,
        vapi_phone_number: providerConfig.vapi_phone_number,
        retell_phone_number: providerConfig.retell_phone_number,
        bland_phone_number: providerConfig.bland_phone_number,
        telnyx_phone_number: providerConfig.telnyx_phone_number,
        notification_settings: notifSettings 
      }
      
      if (providerConfig.vapi_api_key && !providerConfig.vapi_api_key.includes('•')) {
        body.vapi_api_key = providerConfig.vapi_api_key
      }
      if (providerConfig.retell_api_key && !providerConfig.retell_api_key.includes('•')) {
        body.retell_api_key = providerConfig.retell_api_key
      }
      if (providerConfig.bland_api_key && !providerConfig.bland_api_key.includes('•')) {
        body.bland_api_key = providerConfig.bland_api_key
      }
      if (providerConfig.telnyx_api_key && !providerConfig.telnyx_api_key.includes('•')) {
        body.telnyx_api_key = providerConfig.telnyx_api_key
      }

      const res = await fetch('/api/admin/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg('Settings saved successfully!', 'success')
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  // ─── Test Provider Key ────────────────────────────────
  const handleTestProvider = async (provider: string, apiKey: string) => {
    if (!apiKey || apiKey.includes('•')) {
      showMsg(`Enter a new ${provider} API key to test`, 'error'); return
    }
    setTestingVapi(true); setVapiTestResult(null)
    try {
      const res = await fetch('/api/admin/profile/test-vapi', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ provider, api_key: apiKey })
      })
      const data = await res.json()
      setVapiTestResult(data)
    } catch { setVapiTestResult({ valid: false, message: 'Connection failed' }) }
    finally { setTestingVapi(false) }
  }

  // ─── Sub-user ─────────────────────────────────────
  const handleCreateSubUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newSubUser)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showMsg('Team member added!', 'success')
      setNewSubUser({ name: '', email: '', password: '' })
      fetchData(token())
    } catch (err: any) { showMsg(err.message, 'error') }
  }

  // ─── Billing ──────────────────────────────────────
  const loadRazorpayScript = () => new Promise(resolve => {
    if ((window as any).Razorpay) { resolve(true); return }
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true); s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })

  const triggerRazorpayCheckout = async (plan: 'PRO' | 'ENTERPRISE') => {
    const res = await fetch('/api/billing/razorpay/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ plan })
    })
    const orderData = await res.json()
    if (orderData.isSimulated) { setSelectedUpgradePlan(plan); setShowRazorpayModal(true); return }
    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) { showMsg('Razorpay SDK failed to load', 'error'); return }
    const rzp = new (window as any).Razorpay({
      key: orderData.keyId, amount: orderData.amount, currency: orderData.currency,
      name: 'Vaxo Calling AI', description: `Upgrade to ${plan}`, order_id: orderData.orderId,
      handler: async (paymentResponse: any) => {
        const vRes = await fetch('/api/billing/razorpay/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ ...paymentResponse, plan })
        })
        const vData = await vRes.json()
        if (!vRes.ok) { showMsg(vData.error, 'error'); return }
        showMsg(`Upgraded to ${plan}!`, 'success'); fetchData(token())
      },
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#6366f1' }
    })
    rzp.open()
  }

  const handleSimulatedPayment = async () => {
    setIsProcessingPayment(true)
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch('/api/billing/razorpay/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ plan: selectedUpgradePlan, isSimulated: true })
    })
    const data = await res.json()
    if (!res.ok) { showMsg(data.error, 'error'); setShowRazorpayModal(false); setIsProcessingPayment(false); return }
    setPaymentSuccess(true); setIsProcessingPayment(false)
    setTimeout(() => { setShowRazorpayModal(false); setPaymentSuccess(false); fetchData(token()) }, 2000)
  }

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

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
    </div>
  )

  // ─── Stats ────────────────────────────────────────
  const callsLimit = user?.monthly_calls_limit || 100
  const callsUsed = user?.monthly_calls_used || 0
  const usagePct = Math.min(100, Math.round((callsUsed / callsLimit) * 100))
  const todayCalls = calls.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString())
  const todayLeads = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())
  const filteredCalls = callSearch ? calls.filter(c =>
    c.caller_number.includes(callSearch) || c.transcript?.toLowerCase().includes(callSearch.toLowerCase()) || c.status.toLowerCase().includes(callSearch.toLowerCase())
  ) : calls
  const filteredLeads = leadFilter === 'ALL' ? leads : leads.filter(l => l.status === leadFilter)

  const navSections = [
    {
      label: 'VAPI LABS', items: [
        { id: 'composer', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', label: 'Composer' }
      ]
    },
    {
      label: 'BUILD', items: [
        { id: 'assistants', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Assistants' },
        { id: 'phone-numbers', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', label: 'Phone Numbers' },
      ]
    },
    {
      label: 'OBSERVE', items: [
        { id: 'logs', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', label: 'Call Logs' },
        { id: 'boards', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm-6 8a4 4 0 01-8 0v-2a3 3 0 013-3h2m3 5a4 4 0 008 0v-2a3 3 0 00-3-3h-2', label: 'Campaigns' },
        { id: 'structured', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Leads' },
        { id: 'metrics', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', label: 'Analytics' },
      ]
    },
    {
      label: 'MANAGE', items: [
        { id: 'api-keys', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'API Keys & Settings' },
        { id: 'team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Team Members' },
        { id: 'integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', label: 'Webhook Info' },
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
                  <button key={item.id} onClick={() => { setActiveTab(item.id); setErrorMsg(''); setSuccessMsg('') }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                    {item.label}
                    {item.id === 'structured' && leads.filter(l => l.status === 'NEW').length > 0 && (
                      <span className="ml-auto bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{leads.filter(l => l.status === 'NEW').length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {user?.role?.toUpperCase() === 'SUPER_ADMIN' && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <button onClick={() => router.push('/dashboard/super-admin')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-blue-400 hover:bg-blue-500/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 002 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Manage Tenants
              </button>
            </div>
          )}
        </div>

        {/* Credits block */}
        <div className="px-3 pb-2 border-t border-white/5 pt-4 bg-black/20">
          <div className="bg-[#111113] border border-white/10 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded">CALLS</span>
              <span className="text-sm font-bold text-indigo-400">{callsUsed}/{callsLimit}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${usagePct > 80 ? 'bg-blue-500' : 'bg-indigo-500'}`} style={{ width: `${usagePct}%` }}></div>
            </div>
            <div className="flex gap-2">
              {(['PRO', 'ENTERPRISE'] as const).filter(p => p !== user?.plan).map(plan => (
                <button key={plan} onClick={() => triggerRazorpayCheckout(plan)}
                  className="flex-1 text-xs font-bold py-1.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/20 transition-colors">
                  ↑ {plan}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User footer */}
        <div className="border-t border-white/5 p-4 space-y-3 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.plan} Plan</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { fetchData(token()); showMsg('Synced!', 'success') }}
              className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-1.5 rounded transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sync
            </button>
            <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-1.5 rounded transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────── */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#070708]">
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className="fixed top-4 left-4 z-50 text-gray-400 hover:text-white bg-[#111113] border border-white/10 p-2 rounded-lg shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}

        <div className="max-w-6xl mx-auto px-6 py-8 w-full">

          {/* Notifications */}
          {errorMsg && (
            <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl p-3 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-green-950/40 border border-green-500/30 text-green-400 rounded-xl p-3 flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {successMsg}
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: COMPOSER (Quick Dial + Stats)
          ════════════════════════════════════ */}
          {activeTab === 'composer' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white">Composer</h2>

              {/* Today Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Today's Calls", value: todayCalls.length, color: 'text-indigo-400' },
                  { label: "Today's Leads", value: todayLeads.length, color: 'text-green-400' },
                  { label: 'Active Agents', value: agents.filter(a => a.status === 'ACTIVE').length, color: 'text-purple-400' },
                  { label: 'Total Calls', value: calls.length, color: 'text-blue-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#111113] border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-extrabold mt-2 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Dial */}
              <div className="bg-[#111113] border border-white/5 rounded-xl p-6">
                <h3 className="text-white font-bold text-lg mb-4">Quick Dial</h3>
                <form onSubmit={handleQuickDial} className="flex flex-col md:flex-row gap-4">
                  <input type="tel" placeholder="+91 98765 43210" value={dialPhone} onChange={e => setDialPhone(e.target.value)} required
                    className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 font-mono" />
                  <select value={dialAgent} onChange={e => setDialAgent(e.target.value)} required
                    className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                    <option value="">Select Agent...</option>
                    {agents.filter(a => a.status === 'ACTIVE').map(a => <option key={a.id} value={a.id}>{a.name} ({a.language})</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={dialSimulate} onChange={e => setDialSimulate(e.target.checked)} className="rounded" />
                    Sandbox
                  </label>
                  <button type="submit" disabled={isDialing}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2">
                    {isDialing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Dialing...</> : '📞 Dial'}
                  </button>
                </form>
                {dialResult && (
                  <div className="mt-4 p-3 bg-green-950/30 border border-green-500/20 rounded-lg text-sm text-green-400">
                    ✅ Call {dialResult.call?.vapi_call_id?.startsWith('sandbox_') ? 'simulated' : 'initiated'} — ID: {dialResult.call?.vapi_call_id}
                  </div>
                )}
              </div>

              {/* Recent Calls */}
              <div className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <h3 className="text-white font-bold">Recent Calls</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {calls.slice(0, 5).map(call => (
                    <div key={call.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${call.status === 'COMPLETED' ? 'bg-green-500' : call.status === 'FAILED' ? 'bg-red-500' : call.status === 'NO_ANSWER' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                        <span className="font-mono text-sm text-white">{call.caller_number}</span>
                        <span className="text-xs text-gray-500">{call.direction}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatDuration(call.duration_sec)}</span>
                        <span>{formatDate(call.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {calls.length === 0 && <p className="text-gray-500 text-sm text-center py-6">No calls yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: ASSISTANTS
          ════════════════════════════════════ */}
          {activeTab === 'assistants' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Assistants</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{agents.length} agent{agents.length !== 1 ? 's' : ''} configured</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-[#111113] border border-white/5 rounded-lg overflow-hidden">
                    {['ALL', 'VOICE', 'CHAT', 'BOTH'].map(t => (
                      <button key={t} type="button" onClick={() => setAgentTypeFilter(t)}
                        className={`px-3 py-1.5 text-xs font-bold transition-colors ${agentTypeFilter === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        {t === 'ALL' ? 'All' : t === 'VOICE' ? '🎙️ Voice' : t === 'CHAT' ? '💬 Chat' : '🔄 Both'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowCreateAgent(true)} className="bg-white text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">+ Create Assistant</button>
                </div>
              </div>

              {/* Create Agent Modal */}
              {showCreateAgent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                  <div className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                     <div className="flex justify-between items-center">
                       <h3 className="text-white font-bold text-lg">Create New Assistant</h3>
                       <button onClick={() => setShowCreateAgent(false)} className="text-gray-500 hover:text-white">✕</button>
                     </div>
                     <form onSubmit={handleCreateAgent} className="space-y-4">
                       {/* Template Picker */}
                       {templates.length > 0 && (
                         <div>
                           <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Start from Template (Optional)</label>
                           <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto bg-black/30 border border-white/5 rounded-lg p-2">
                             {templates.map((t: any) => (
                               <button key={t.id} type="button" onClick={() => {
                                 setNewAgent({
                                   ...newAgent,
                                   name: t.name,
                                   system_prompt: t.default_prompt,
                                   language: t.default_language,
                                   voice_model: t.default_voice || 'sarah',
                                   tone: t.default_tone || 'friendly',
                                   type: t.type,
                                   template_id: t.id,
                                 })
                               }}
                                 className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                                   newAgent.template_id === t.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/10 text-gray-400 hover:border-white/20'
                                 }`}>
                                 <span className="mr-1">{t.type === 'VOICE' ? '🎙️' : t.type === 'CHAT' ? '💬' : '🔄'}</span>
                                 {t.name}
                               </button>
                             ))}
                           </div>
                         </div>
                       )}

                       <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Agent Name</label>
                         <input type="text" required value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                           className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Sales Bot" /></div>
                       
                       <div className="grid grid-cols-3 gap-4">
                         <div>
                           <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Type</label>
                           <select value={newAgent.type} onChange={e => setNewAgent({ ...newAgent, type: e.target.value })}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                             <option value="VOICE">🎙️ Voice</option>
                             <option value="CHAT">💬 Chat</option>
                             <option value="BOTH">🔄 Both</option>
                           </select>
                         </div>
                         <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Language</label>
                           <select value={newAgent.language} onChange={e => setNewAgent({ ...newAgent, language: e.target.value })}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                             <option value="HINDI">Hindi</option><option value="ENGLISH">English</option><option value="HINGLISH">Hinglish</option>
                           </select></div>
                         <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Voice ID</label>
                           <input type="text" value={newAgent.voice_model} onChange={e => setNewAgent({ ...newAgent, voice_model: e.target.value })}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="sarah"
                             disabled={newAgent.type === 'CHAT'} /></div>
                       </div>

                       <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Tone</label>
                         <select value={newAgent.tone} onChange={e => setNewAgent({ ...newAgent, tone: e.target.value })}
                           className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                           <option value="friendly">Friendly</option><option value="formal">Formal</option><option value="casual">Casual</option>
                         </select></div>
                       <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">System Prompt / Instructions</label>
                         <textarea rows={4} required value={newAgent.system_prompt} onChange={e => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
                           className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 resize-none"
                           placeholder="Instructions defining character, persona, guidelines..." /></div>
                       <div className="flex gap-3 pt-2">
                         <button type="button" onClick={() => setShowCreateAgent(false)} className="flex-1 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                         <button type="submit" className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Create Agent</button>
                       </div>
                     </form>
                  </div>
                </div>
              )}

              {/* Agents Table */}
              <div className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden">
                {agents.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500 text-sm">No agents created yet.</p>
                    <button onClick={() => setShowCreateAgent(true)} className="mt-4 text-indigo-400 text-sm font-bold hover:text-indigo-300">+ Create your first agent</button>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 bg-black/20 border-b border-white/5 text-[10px] font-bold tracking-wider uppercase">
                      <tr><th className="py-3 px-4">Agent</th><th className="py-3 px-4">Language</th><th className="py-3 px-4">VAPI Status</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {agents.filter(a => agentTypeFilter === 'ALL' || (a as any).type === agentTypeFilter).map(agent => (
                        <tr key={agent.id} className="hover:bg-white/5 transition-colors group">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {(agent as any).type === 'VOICE' ? '🎙️' : (agent as any).type === 'CHAT' ? '💬' : (agent as any).type === 'BOTH' ? '🔄' : agent.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-white font-bold">{agent.name}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{agent.system_prompt.slice(0, 60)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4"><span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded">{agent.language}</span></td>
                          <td className="py-3 px-4">
                            {agent.vapi_agent_id && !agent.vapi_agent_id.startsWith('placeholder_')
                              ? <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Linked</span>
                              : <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>No API Key</span>
                            }
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${agent.status === 'ACTIVE' ? 'bg-green-950/40 border-green-500/20 text-green-400' : 'bg-blue-950/40 border-blue-500/20 text-blue-400'}`}>{agent.status}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditAgentClick(agent)} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold mr-2">Edit / Config</button>
                              <button onClick={() => handleDeleteAgent(agent.id, agent.name)} className="text-red-400 hover:text-red-300 text-xs font-bold">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: AGENT MARKETPLACE
          ════════════════════════════════════ */}
          {activeTab === 'marketplace' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl font-bold text-white">Agent Marketplace</h2>
                <p className="text-sm text-gray-400 mt-0.5">Explore pre-configured agent templates designed for specific workflows</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map((temp: any) => (
                  <div key={temp.id} className="bg-[#111113] border border-white/5 hover:border-indigo-500/30 rounded-xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">
                          {temp.category || 'General'}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {temp.type === 'VOICE' ? '🎙️ Voice' : temp.type === 'CHAT' ? '💬 Chat' : '🔄 Both'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg group-hover:text-indigo-400 transition-colors">{temp.name}</h4>
                        <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">{temp.description || 'No description provided.'}</p>
                      </div>
                    </div>
                    <div className="pt-5 flex items-center justify-between border-t border-white/5 mt-4">
                      <span className="text-xs text-gray-500">{temp.default_language} · {temp.default_tone}</span>
                      <button onClick={() => {
                        setNewAgent({
                          name: temp.name,
                          language: temp.default_language || 'HINDI',
                          voice_model: temp.default_voice || 'sarah',
                          system_prompt: temp.default_prompt || '',
                          tone: temp.default_tone || 'friendly',
                          type: temp.type || 'VOICE',
                          template_id: temp.id
                        })
                        setShowCreateAgent(true)
                      }} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-[#111113] border border-white/5 rounded-xl">
                    <p className="text-gray-500 text-sm">No templates available in the marketplace yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: CHAT WIDGET
          ════════════════════════════════════ */}
          {activeTab === 'chat-widget' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl font-bold text-white">Chat Widget Management</h2>
                <p className="text-sm text-gray-400 mt-0.5">Embed chat assistants on your website and manage live visitor conversations</p>
              </div>

              {/* Embed Code Generator */}
              <div className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-4">
                <h3 className="text-white font-bold">Embed Code Generator</h3>
                <p className="text-xs text-gray-400">Select a Chat Assistant to get its website embed code.</p>
                <div className="flex flex-col md:flex-row gap-4">
                  <select value={embedAgentId} onChange={e => setEmbedAgentId(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 min-w-[200px]">
                    <option value="">Select Chat Agent...</option>
                    {agents.filter(a => (a as any).type === 'CHAT' || (a as any).type === 'BOTH').map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <div className="flex-1 flex gap-2">
                    <code className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-2 text-indigo-400 font-mono text-xs select-all overflow-x-auto whitespace-nowrap leading-7">
                      {embedAgentId
                        ? `<iframe src="${window.location.origin}/chat/${embedAgentId}" style="width: 400px; height: 600px; border: none; position: fixed; bottom: 20px; right: 20px; z-index: 99999;" title="Chat Assistant"></iframe>`
                        : 'Select an agent above...'}
                    </code>
                    <button onClick={() => {
                      if (!embedAgentId) { showMsg('Please select a chat agent', 'error'); return }
                      const code = `<iframe src="${window.location.origin}/chat/${embedAgentId}" style="width: 400px; height: 600px; border: none; position: fixed; bottom: 20px; right: 20px; z-index: 99999;" title="Chat Assistant"></iframe>`
                      navigator.clipboard.writeText(code)
                      showMsg('Embed code copied!', 'success')
                    }} className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0">
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Conversations List */}
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg">Conversations</h3>
                <div className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                  {chatConversations.map((conv: any) => (
                    <div key={conv.id} className="p-4 hover:bg-white/5 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{conv.visitor_name || 'Visitor'}</span>
                            {conv.visitor_email && <span className="text-xs text-gray-500">({conv.visitor_email})</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>Agent: <strong className="text-indigo-400">{conv.agents?.name || 'Unknown'}</strong></span>
                            <span>·</span>
                            <span>Status: 
                              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${conv.status === 'ACTIVE' ? 'bg-green-950/40 border border-green-500/20 text-green-400' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                                {conv.status}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {conv.intent_result?.isLead && (
                            <span className="bg-green-950/40 border border-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">🎯 Lead ({Math.round(conv.intent_result.score * 100)}%)</span>
                          )}
                          <span>{formatDate(conv.created_at)}</span>
                          <button onClick={() => setExpandedCall(expandedCall === conv.id ? null : conv.id)} className="text-indigo-400 font-bold hover:underline">
                            {expandedCall === conv.id ? 'Hide Chat' : 'View Chat'}
                          </button>
                        </div>
                      </div>

                      {expandedCall === conv.id && (
                        <div className="mt-4 border-t border-white/5 pt-4 space-y-4">
                          {/* Messages bubbles */}
                          <div className="space-y-3 max-h-60 overflow-y-auto bg-black/40 rounded-xl p-4 border border-white/5">
                            {Array.isArray(conv.messages) && conv.messages.map((msg: any, i: number) => (
                              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                                  msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                            {(!Array.isArray(conv.messages) || conv.messages.length === 0) && (
                              <p className="text-gray-500 text-center py-4 text-xs">No messages in this chat.</p>
                            )}
                          </div>
                          {/* Intent details */}
                          {conv.intent_result && (
                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2 text-xs">
                              <span className="text-green-400 font-bold uppercase tracking-wider text-[10px]">Intent Analysis</span>
                              <p className="text-gray-300"><strong className="text-white">Summary:</strong> {conv.intent_result.summary}</p>
                              {conv.intent_result.collected_info && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {Object.entries(conv.intent_result.collected_info).map(([k, v]: any) => (
                                    <span key={k} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400">
                                      <strong>{k}:</strong> {String(v)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatConversations.length === 0 && (
                    <div className="text-center py-12 text-gray-500 text-sm">
                      No conversations recorded yet. Embed your widget to receive chats!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: PHONE NUMBERS
          ════════════════════════════════════ */}
          {activeTab === 'phone-numbers' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Phone Numbers</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {providerConfig.telephony_provider || 'VAPI'} phone numbers from your account
                  </p>
                </div>
                <div className="flex gap-2">
                  {providerConfig.telephony_provider === 'BLAND_AI' && (
                    <button onClick={() => setShowBuyModal(true)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/10">
                      <span>🛒</span> Buy Number
                    </button>
                  )}
                  <button onClick={async () => {
                    try {
                      const res = await fetch('/api/phone-numbers', { headers: { Authorization: `Bearer ${token()}` } })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error)
                      setPhoneNumbers(data.phone_numbers || [])
                      showMsg(`Loaded ${data.phone_numbers?.length || 0} phone numbers`, 'success')
                    } catch (err: any) { showMsg(err.message, 'error') }
                  }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                    Load Numbers
                  </button>
                </div>
              </div>

              {phoneNumbers.length === 0 ? (
                <div className="bg-[#111113] border border-white/5 rounded-xl p-10 text-center space-y-3">
                  <p className="text-gray-400 text-sm">Click "Load Numbers" to fetch your VAPI phone numbers.</p>
                  <p className="text-gray-500 text-xs">Requires a valid VAPI API key in API Keys settings.</p>
                </div>
              ) : (
                <div className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 bg-black/20 border-b border-white/5 text-[10px] font-bold tracking-wider uppercase">
                      <tr><th className="py-3 px-4">Number</th><th className="py-3 px-4">Provider</th><th className="py-3 px-4">Linked Agent</th><th className="py-3 px-4">Link to Agent</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {phoneNumbers.map((num: any) => (
                        <tr key={num.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-white font-mono">{num.number || num.phoneNumber || num.id}</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{num.provider || 'VAPI'}</td>
                          <td className="py-3 px-4">
                            {num.assistantId
                              ? <span className="text-green-400 text-xs font-bold">Linked</span>
                              : <span className="text-gray-500 text-xs">Unlinked</span>}
                          </td>
                          <td className="py-3 px-4">
                            <select className="bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                              onChange={async e => {
                                if (!e.target.value) return
                                try {
                                  const res = await fetch('/api/phone-numbers', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                                    body: JSON.stringify({ phone_number_id: num.id, agent_id: e.target.value })
                                  })
                                  const data = await res.json()
                                  if (!res.ok) throw new Error(data.error)
                                  showMsg('Phone number linked to agent!', 'success')
                                } catch (err: any) { showMsg(err.message, 'error') }
                              }}>
                              <option value="">Assign to agent...</option>
                              {agents.filter(a => a.status === 'ACTIVE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: CALL LOGS
          ════════════════════════════════════ */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Call Logs</h2>
                <span className="text-sm text-gray-400">{calls.length} total calls</span>
              </div>
              <input type="text" placeholder="Search by phone, transcript, status..." value={callSearch} onChange={e => setCallSearch(e.target.value)}
                className="w-full bg-[#111113] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" />
              <div className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden">
                {filteredCalls.length === 0 ? <p className="text-gray-500 text-sm text-center py-12">No calls found</p> : (
                  <div className="divide-y divide-white/5">
                    {filteredCalls.map(call => (
                      <div key={call.id} className="hover:bg-white/5 transition-colors">
                        <button onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)} className="w-full text-left px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={`w-2 h-2 rounded-full ${call.direction === 'INBOUND' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                            <span className="text-white font-mono text-sm">{call.caller_number}</span>
                            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">{call.direction}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${call.status === 'COMPLETED' ? 'bg-green-950/40 border-green-500/20 text-green-400' : call.status === 'FAILED' ? 'bg-blue-950/40 border-blue-500/20 text-blue-400' : 'bg-yellow-950/40 border-yellow-500/20 text-yellow-400'}`}>{call.status}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatDuration(call.duration_sec)}</span>
                            {call.cost_usd != null && <span>${call.cost_usd.toFixed(4)}</span>}
                            <span>{formatDate(call.created_at)}</span>
                          </div>
                        </button>
                        {expandedCall === call.id && (
                          <div className="px-4 pb-4 space-y-3">
                            {call.transcript && (
                              <div className="bg-black/40 rounded-lg p-3 text-xs text-gray-300 leading-relaxed border border-white/5">
                                <span className="block text-indigo-400 font-bold uppercase text-[10px] mb-2">Transcript</span>
                                {call.transcript}
                              </div>
                            )}
                            {call.recording_url && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-bold">Recording:</span>
                                <audio controls src={call.recording_url} className="h-8" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: CAMPAIGNS (boards)
          ════════════════════════════════════ */}
          {activeTab === 'boards' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Campaigns</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{campaigns.length} total campaigns</p>
                </div>
                <button onClick={() => setShowCreateCampaign(true)} className="bg-white text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">+ New Campaign</button>
              </div>

              {/* Create Campaign Modal */}
              {showCreateCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-bold text-lg">New Campaign</h3>
                      <button onClick={() => {
                        setShowCreateCampaign(false)
                        setCampaignMode('STANDARD')
                      }} className="text-gray-500 hover:text-white">✕</button>
                    </div>

                    <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                      <button type="button" onClick={() => setCampaignMode('STANDARD')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${campaignMode === 'STANDARD' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Standard (Normal VAPI)</button>
                      <button type="button" onClick={() => setCampaignMode('CSV')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${campaignMode === 'CSV' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Bland AI Bulk CSV</button>
                    </div>

                    {campaignMode === 'STANDARD' ? (
                      <form onSubmit={handleCreateCampaign} className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Campaign Name</label>
                          <input type="text" required value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="January Sales Drive" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Agent</label>
                            <select required value={newCampaign.agent_id} onChange={e => setNewCampaign({ ...newCampaign, agent_id: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                              <option value="">Select agent...</option>
                              {agents.filter(a => a.status === 'ACTIVE').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select></div>
                          <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Delay Between Calls (sec)</label>
                            <input type="number" min="5" max="300" value={newCampaign.delay} onChange={e => setNewCampaign({ ...newCampaign, delay: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Contact List (one per line or comma-separated)</label>
                          <textarea rows={5} value={newCampaign.contactsRaw} onChange={e => setNewCampaign({ ...newCampaign, contactsRaw: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 font-mono resize-none"
                            placeholder="+919876543210&#10;+918765432109&#10;+917654321098" /></div>
                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setShowCreateCampaign(false)} className="flex-1 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                          <button type="submit" className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Create Campaign</button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleCreateCSVCampaign} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Campaign Name</label>
                          <input type="text" required value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Bland Bulk Drive" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Language</label>
                            <select value={csvLanguage} onChange={e => setCsvLanguage(e.target.value as 'hi' | 'en')}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                              <option value="hi">Hindi (हिंदी)</option>
                              <option value="en">English</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Voice Model</label>
                            <select value={csvVoiceId === 'sarah' || csvVoiceId === 'natural' || csvVoiceId === 'natural_hindi_voice' ? csvVoiceId : 'custom'} 
                              onChange={e => {
                                const val = e.target.value;
                                if (val !== 'custom') {
                                  setCsvVoiceId(val);
                                } else {
                                  setCsvVoiceId('');
                                }
                              }}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                              <option value="sarah">Sarah (English)</option>
                              <option value="natural">Natural (English)</option>
                              <option value="natural_hindi_voice">Natural Hindi Voice</option>
                              <option value="custom">Custom Voice ID...</option>
                            </select>
                          </div>
                        </div>

                        {!(csvVoiceId === 'sarah' || csvVoiceId === 'natural' || csvVoiceId === 'natural_hindi_voice') && (
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Custom Voice ID</label>
                            <input type="text" required value={csvVoiceId} onChange={e => setCsvVoiceId(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 font-mono" placeholder="voice_id_from_bland" />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-sans">Bland Agent Script Prompt</label>
                          <textarea rows={5} required value={csvScript} onChange={e => setCsvScript(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-xs outline-none focus:border-indigo-500 font-sans resize-none"
                            placeholder="Write branching script logic:&#10;- If YES: collect email...&#10;- If NO: end call..." />
                          <p className="text-[10px] text-gray-500 mt-1">Provide detailed guidelines. For Hindi agents, instruct them to speak Hindi.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Upload Contacts (CSV)</label>
                          <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-lg cursor-pointer bg-black/20 hover:bg-black/40 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <span className="text-2xl mb-2">📁</span>
                                <p className="text-xs text-gray-400 font-semibold">{csvFile ? csvFile.name : 'Select or drop CSV file'}</p>
                                <p className="text-[10px] text-gray-500 mt-1">Format: phone, name, email</p>
                              </div>
                              <input type="file" accept=".csv" required className="hidden" onChange={e => {
                                const f = e.target.files?.[0];
                                if (f && f.name.endsWith('.csv')) {
                                  setCsvFile(f);
                                } else {
                                  alert('Please select a CSV file');
                                }
                              }} />
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => {
                            setShowCreateCampaign(false)
                            setCampaignMode('STANDARD')
                          }} className="flex-1 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                          <button type="submit" disabled={isUploadingCSV} className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {isUploadingCSV ? (
                              <>
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></span>
                                Uploading...
                              </>
                            ) : 'Create & Upload'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}


              {/* Campaigns List */}
              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <div className="bg-[#111113] border border-white/5 rounded-xl p-12 text-center">
                    <p className="text-gray-500 text-sm">No campaigns yet. Create one to start bulk dialing.</p>
                  </div>
                ) : campaigns.map(camp => {
                  const total = camp.contacts?.length || 0
                  const done = camp.total_calls || 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={camp.id} className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-bold">{camp.name}</h4>
                          <p className="text-xs text-gray-500">{total} contacts · {camp.type} · Created {formatDate(camp.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setActiveStatsCampaign(camp)
                              setAutoRefreshStats(true)
                              fetchLiveCampaignStats(camp.id, token())
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors"
                          >
                            📊 Live Stats
                          </button>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${camp.status === 'RUNNING' ? 'bg-green-950/40 border-green-500/20 text-green-400 animate-pulse' : camp.status === 'COMPLETED' ? 'bg-blue-950/40 border-blue-500/20 text-blue-400' : camp.status === 'PAUSED' ? 'bg-yellow-950/40 border-yellow-500/20 text-yellow-400' : 'bg-gray-950/40 border-gray-500/20 text-gray-400'}`}>{camp.status}</span>
                          {camp.status === 'RUNNING'
                            ? <button onClick={() => handleCampaignPause(camp.id)} className="px-3 py-1.5 text-xs font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-colors">⏸ Pause</button>
                            : camp.status !== 'COMPLETED' && <button onClick={() => handleCampaignStart(camp.id)} className="px-3 py-1.5 text-xs font-bold bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors">▶ Start</button>
                          }
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{done} / {total} calls made</span>
                          <span>{camp.success_count || 0} leads captured · {pct}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                          <div className="h-1.5 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: LEADS (structured)
          ════════════════════════════════════ */}
          {activeTab === 'structured' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Leads</h2>
                  <p className="text-sm text-gray-400 mt-0.5">{leads.filter(l => l.status === 'NEW').length} new leads</p>
                </div>
                <div className="flex gap-3">
                  <a href={`/api/leads?export=csv`} target="_blank" className="px-4 py-2 text-sm font-bold border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors">↓ Export CSV</a>
                </div>
              </div>

              {/* Filter */}
              <div className="flex gap-2">
                {['ALL', 'NEW', 'CONTACTED', 'CONVERTED', 'REJECTED'].map(f => (
                  <button key={f} onClick={() => setLeadFilter(f)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${leadFilter === f ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    {f} {f === 'ALL' ? `(${leads.length})` : `(${leads.filter(l => l.status === f).length})`}
                  </button>
                ))}
              </div>

              <div className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden">
                {filteredLeads.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-12">No leads yet. Leads are auto-captured when a customer says YES on a call.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-400 bg-black/20 border-b border-white/5 text-[10px] font-bold tracking-wider uppercase">
                      <tr><th className="py-3 px-4">Customer</th><th className="py-3 px-4">Phone</th><th className="py-3 px-4">Campaign</th><th className="py-3 px-4">Intent</th><th className="py-3 px-4">Time</th><th className="py-3 px-4">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-white font-bold">{lead.customer_name}</td>
                          <td className="py-3 px-4 text-gray-300 font-mono text-xs">{lead.phone}</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{(lead as any).campaigns?.name || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-white/5 rounded-full h-1.5">
                                <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${lead.intent_score * 100}%` }}></div>
                              </div>
                              <span className="text-xs text-green-400 font-bold">{Math.round(lead.intent_score * 100)}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">{formatDate(lead.created_at)}</td>
                          <td className="py-3 px-4">
                            <select value={lead.status} onChange={e => handleLeadStatus(lead.id, e.target.value)}
                              className="bg-black border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500">
                              <option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="CONVERTED">Converted</option><option value="REJECTED">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: ANALYTICS (metrics)
          ════════════════════════════════════ */}
          {activeTab === 'metrics' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white">Analytics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Calls', value: calls.length, sub: `${calls.filter(c => c.direction === 'INBOUND').length} in / ${calls.filter(c => c.direction === 'OUTBOUND').length} out`, color: 'from-indigo-500 to-indigo-600' },
                  { label: 'Success Rate', value: `${calls.length > 0 ? Math.round((calls.filter(c => c.status === 'COMPLETED').length / calls.length) * 100) : 0}%`, sub: `${calls.filter(c => c.status === 'COMPLETED').length} completed`, color: 'from-green-500 to-green-600' },
                  { label: 'Total Leads', value: leads.length, sub: `${leads.filter(l => l.status === 'CONVERTED').length} converted`, color: 'from-purple-500 to-purple-600' },
                  { label: 'Total Cost', value: `$${calls.reduce((s, c) => s + (c.cost_usd || 0), 0).toFixed(2)}`, sub: 'VAPI charges', color: 'from-orange-500 to-orange-600' },
                ].map(stat => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-5 text-white`}>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-extrabold mt-2">{stat.value}</p>
                    <p className="text-xs opacity-70 mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Call Status Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#111113] border border-white/5 rounded-xl p-5">
                  <h4 className="text-white font-bold mb-4">Call Status Breakdown</h4>
                  {['COMPLETED', 'FAILED', 'NO_ANSWER', 'INITIATED'].map(status => {
                    const count = calls.filter(c => c.status === status).length
                    const pct = calls.length > 0 ? Math.round((count / calls.length) * 100) : 0
                    return (
                      <div key={status} className="mb-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{status}</span><span>{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2">
                          <div className={`h-2 rounded-full ${status === 'COMPLETED' ? 'bg-green-500' : status === 'FAILED' ? 'bg-red-500' : status === 'NO_ANSWER' ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="bg-[#111113] border border-white/5 rounded-xl p-5">
                  <h4 className="text-white font-bold mb-4">Plan Usage</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Monthly Calls</span><span>{callsUsed} / {callsLimit}</span></div>
                      <div className="w-full bg-white/5 rounded-full h-3">
                        <div className={`h-3 rounded-full ${usagePct > 80 ? 'bg-blue-500' : 'bg-indigo-500'}`} style={{ width: `${usagePct}%` }}></div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">Plan: <span className="text-white font-bold">{user?.plan}</span></div>
                    <div className="text-sm text-gray-400">Wallet: <span className="text-green-400 font-bold">${Number(user?.wallet_balance || 0).toFixed(2)}</span></div>
                    {user?.plan !== 'ENTERPRISE' && (
                      <button onClick={() => triggerRazorpayCheckout(user?.plan === 'STARTER' ? 'PRO' : 'ENTERPRISE')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                        ↑ Upgrade to {user?.plan === 'STARTER' ? 'PRO' : 'ENTERPRISE'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: API KEYS & SETTINGS
          ════════════════════════════════════ */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white">API Keys & Settings</h2>
              <form onSubmit={handleSaveProviderConfig} className="space-y-8">
                {/* Header & Active Provider Section */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-black border border-indigo-500/30 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
                  <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                    <svg className="w-32 h-32 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Telephony Engine</h3>
                    <p className="text-sm text-indigo-200/70 mb-6">Select your primary voice provider for outbound and inbound calls.</p>
                    
                    <div className="flex flex-wrap gap-3 mt-4">
                      {[
                        { id: 'VAPI', label: 'VAPI', icon: '🚀', desc: 'Recommended' },
                        { id: 'RETELL', label: 'Retell AI', icon: '⚡', desc: 'Low Latency' },
                        { id: 'BLAND_AI', label: 'Bland AI', icon: '🎯', desc: 'High Volume' },
                        { id: 'TELNYX', label: 'Telnyx', icon: '🌐', desc: 'Enterprise SIP' }
                      ].map(provider => {
                        const isActive = providerConfig.telephony_provider === provider.id;
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setProviderConfig({ ...providerConfig, telephony_provider: provider.id })}
                            className={`relative flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-300 overflow-hidden ${
                              isActive 
                                ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]' 
                                : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                            )}
                            <span className="relative z-10 text-xl">{provider.icon}</span>
                            <div className="relative z-10 flex flex-col items-start text-left">
                              <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>{provider.label}</span>
                              <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'text-indigo-300' : 'text-gray-500'}`}>{provider.desc}</span>
                            </div>
                            {isActive && (
                              <div className="relative z-10 ml-2 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Grid for settings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Selected Provider Config */}
                  {providerConfig.telephony_provider === 'VAPI' && (
                    <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-7 shadow-xl hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform"><span className="text-xl">🚀</span></div>
                        <div>
                          <h3 className="text-white font-bold text-lg">VAPI Settings</h3>
                          <p className="text-xs text-gray-500">Configure your ElevenLabs-powered engine</p>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-indigo-400 transition-colors">VAPI API Key</label>
                          <div className="flex gap-2">
                            <input type="password" value={providerConfig.vapi_api_key} onChange={e => setProviderConfig({ ...providerConfig, vapi_api_key: e.target.value })}
                              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono shadow-inner"
                              placeholder="vapi_••••••••••" />
                            <button type="button" onClick={() => handleTestProvider('VAPI', providerConfig.vapi_api_key)} disabled={testingVapi}
                              className="px-5 py-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-500/10">
                              {testingVapi ? '...' : 'Test'}
                            </button>
                          </div>
                          {vapiTestResult && (
                            <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${vapiTestResult.valid ? 'text-green-400' : 'text-rose-400'}`}>
                              {vapiTestResult.valid ? '✓' : '✗'} {vapiTestResult.message}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500 mt-2">Get your key from <a href="https://dashboard.vapi.ai" target="_blank" className="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">dashboard.vapi.ai</a></p>
                        </div>
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-indigo-400 transition-colors">Phone Number ID</label>
                          <input type="text" value={providerConfig.vapi_phone_number} onChange={e => setProviderConfig({ ...providerConfig, vapi_phone_number: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono shadow-inner"
                            placeholder="phnum_••••••" />
                        </div>
                      </div>
                    </div>
                  )}

                  {providerConfig.telephony_provider === 'RETELL' && (
                    <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-7 shadow-xl hover:border-emerald-500/30 transition-all group">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform"><span className="text-xl">⚡</span></div>
                        <div>
                          <h3 className="text-white font-bold text-lg">Retell AI Settings</h3>
                          <p className="text-xs text-gray-500">Ultra-low latency English calling</p>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-emerald-400 transition-colors">Retell API Key</label>
                          <div className="flex gap-2">
                            <input type="password" value={providerConfig.retell_api_key} onChange={e => setProviderConfig({ ...providerConfig, retell_api_key: e.target.value })}
                              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono shadow-inner"
                              placeholder="key_••••••••••" />
                            <button type="button" onClick={() => handleTestProvider('RETELL', providerConfig.retell_api_key)} disabled={testingVapi}
                              className="px-5 py-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold rounded-xl hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-500/10">
                              {testingVapi ? '...' : 'Test'}
                            </button>
                          </div>
                          {vapiTestResult && (
                            <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${vapiTestResult.valid ? 'text-green-400' : 'text-rose-400'}`}>
                              {vapiTestResult.valid ? '✓' : '✗'} {vapiTestResult.message}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500 mt-2">Get your key from <a href="https://dashboard.retellai.com" target="_blank" className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors">dashboard.retellai.com</a></p>
                        </div>
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-emerald-400 transition-colors">Retell Phone Number</label>
                          <input type="text" value={providerConfig.retell_phone_number} onChange={e => setProviderConfig({ ...providerConfig, retell_phone_number: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono shadow-inner"
                            placeholder="+1234567890" />
                        </div>
                      </div>
                    </div>
                  )}

                  {providerConfig.telephony_provider === 'BLAND_AI' && (
                    <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-7 shadow-xl hover:border-amber-500/30 transition-all group">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform"><span className="text-xl">🎯</span></div>
                        <div>
                          <h3 className="text-white font-bold text-lg">Bland AI Settings</h3>
                          <p className="text-xs text-gray-500">Bulk outbound and high volume</p>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-amber-400 transition-colors">Bland API Key</label>
                          <div className="flex gap-2">
                            <input type="password" value={providerConfig.bland_api_key} onChange={e => setProviderConfig({ ...providerConfig, bland_api_key: e.target.value })}
                              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono shadow-inner"
                              placeholder="org_••••••••••" />
                            <button type="button" onClick={() => handleTestProvider('BLAND_AI', providerConfig.bland_api_key)} disabled={testingVapi}
                              className="px-5 py-3 bg-amber-600/10 border border-amber-500/20 text-amber-400 text-sm font-bold rounded-xl hover:bg-amber-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-amber-500/10">
                              {testingVapi ? '...' : 'Test'}
                            </button>
                          </div>
                          {vapiTestResult && (
                            <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${vapiTestResult.valid ? 'text-green-400' : 'text-rose-400'}`}>
                              {vapiTestResult.valid ? '✓' : '✗'} {vapiTestResult.message}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500 mt-2">Get your key from <a href="https://app.bland.ai" target="_blank" className="text-amber-400 hover:text-amber-300 hover:underline transition-colors">app.bland.ai</a></p>
                        </div>
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-amber-400 transition-colors">Bland From Number</label>
                          <input type="text" value={providerConfig.bland_phone_number} onChange={e => setProviderConfig({ ...providerConfig, bland_phone_number: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono shadow-inner"
                            placeholder="+1234567890" />
                        </div>
                      </div>
                    </div>
                  )}

                  {providerConfig.telephony_provider === 'TELNYX' && (
                    <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-7 shadow-xl hover:border-cyan-500/30 transition-all group">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:scale-110 transition-transform"><span className="text-xl">🌐</span></div>
                        <div>
                          <h3 className="text-white font-bold text-lg">Telnyx Settings</h3>
                          <p className="text-xs text-gray-500">Enterprise SIP routing & global reach</p>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-cyan-400 transition-colors">Telnyx API Key</label>
                          <div className="flex gap-2">
                            <input type="password" value={providerConfig.telnyx_api_key} onChange={e => setProviderConfig({ ...providerConfig, telnyx_api_key: e.target.value })}
                              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono shadow-inner"
                              placeholder="KEY01••••••••••" />
                            <button type="button" onClick={() => handleTestProvider('TELNYX', providerConfig.telnyx_api_key)} disabled={testingVapi}
                              className="px-5 py-3 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold rounded-xl hover:bg-cyan-600 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-cyan-500/10">
                              {testingVapi ? '...' : 'Test'}
                            </button>
                          </div>
                          {vapiTestResult && (
                            <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${vapiTestResult.valid ? 'text-green-400' : 'text-rose-400'}`}>
                              {vapiTestResult.valid ? '✓' : '✗'} {vapiTestResult.message}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500 mt-2">Get your key from <a href="https://portal.telnyx.com" target="_blank" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">portal.telnyx.com</a></p>
                        </div>
                        <div className="group/input">
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover/input:text-cyan-400 transition-colors">Telnyx Connection ID</label>
                          <input type="text" value={providerConfig.telnyx_phone_number} onChange={e => setProviderConfig({ ...providerConfig, telnyx_phone_number: e.target.value })}
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono shadow-inner"
                            placeholder="Connection ID" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notification Settings */}
                  <div className="bg-[#111113]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-7 shadow-xl hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform"><span className="text-xl">🔔</span></div>
                      <div>
                        <h3 className="text-white font-bold text-lg">Lead Notifications</h3>
                        <p className="text-xs text-gray-500">Real-time alerts for conversions</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                        <label className="flex items-center justify-between cursor-pointer group/toggle">
                          <span className="text-sm font-bold text-gray-300 group-hover/toggle:text-white transition-colors">Email Alerts</span>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifSettings.email ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                            <input type="checkbox" checked={notifSettings.email} onChange={e => setNotifSettings({ ...notifSettings, email: e.target.checked })} className="sr-only" />
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifSettings.email ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </label>
                        {notifSettings.email && (
                          <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <input type="email" value={notifSettings.email_address} onChange={e => setNotifSettings({ ...notifSettings, email_address: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                              placeholder="alerts@yourcompany.com" />
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                        <label className="flex items-center justify-between cursor-pointer group/toggle">
                          <span className="text-sm font-bold text-gray-300 group-hover/toggle:text-white transition-colors">SMS Alerts</span>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifSettings.sms ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                            <input type="checkbox" checked={notifSettings.sms} onChange={e => setNotifSettings({ ...notifSettings, sms: e.target.checked })} className="sr-only" />
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifSettings.sms ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                        </label>
                        {notifSettings.sms && (
                          <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <input type="tel" value={notifSettings.phone_number} onChange={e => setNotifSettings({ ...notifSettings, phone_number: e.target.value })}
                              className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono shadow-inner"
                              placeholder="+1234567890" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" className="relative group px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all overflow-hidden shadow-xl shadow-indigo-500/20 active:scale-95">
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Save Configuration
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: TEAM MEMBERS
          ════════════════════════════════════ */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white">Team Members</h2>
              <div className="bg-[#111113] border border-white/5 rounded-xl p-6 space-y-6">
                <form onSubmit={handleCreateSubUser} className="space-y-4">
                  <h4 className="text-white font-bold">Invite New Member</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" required placeholder="Full Name" value={newSubUser.name} onChange={e => setNewSubUser({ ...newSubUser, name: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" />
                    <input type="email" required placeholder="Email" value={newSubUser.email} onChange={e => setNewSubUser({ ...newSubUser, email: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" />
                    <input type="password" required minLength={6} placeholder="Password" value={newSubUser.password} onChange={e => setNewSubUser({ ...newSubUser, password: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-white text-black font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-gray-200 transition-colors">Invite Member</button>
                  </div>
                </form>
                <div>
                  <h4 className="text-white font-bold mb-3 border-t border-white/5 pt-4">Active Members ({subUsers.length})</h4>
                  {subUsers.length === 0 ? <p className="text-gray-500 text-sm">No team members yet.</p> : (
                    <table className="w-full text-sm">
                      <thead className="text-[10px] text-gray-400 font-bold uppercase border-b border-white/5">
                        <tr><th className="py-2 text-left">Name</th><th className="py-2 text-left">Email</th><th className="py-2 text-left">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {subUsers.map(su => (
                          <tr key={su.id} className="hover:bg-white/5">
                            <td className="py-3 text-white">{su.name}</td>
                            <td className="py-3 text-gray-400">{su.email}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${su.is_active ? 'bg-green-950/40 border-green-500/20 text-green-400' : 'bg-blue-950/40 border-blue-500/20 text-blue-400'}`}>{su.is_active ? 'Active' : 'Suspended'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TAB: WEBHOOK INFO (integrations)
          ════════════════════════════════════ */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white">Webhook Integration</h2>
              <div className="bg-[#111113] border border-white/5 rounded-xl p-6 space-y-6">
                <div>
                  <h3 className="text-white font-bold mb-3">Your VAPI Webhook URL</h3>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-indigo-400 font-mono text-sm">
                      {process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/webhooks/vapi
                    </code>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/vapi`); showMsg('Copied!', 'success') }}
                      className="px-3 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-bold">Copy</button>
                  </div>
                </div>
                <div className="space-y-4 text-sm text-gray-400 border-t border-white/5 pt-4">
                  <h4 className="text-white font-bold">Setup Instructions</h4>
                  <ol className="space-y-3 list-decimal list-inside">
                    <li>Go to <a href="https://dashboard.vapi.ai" target="_blank" className="text-indigo-400 hover:underline">VAPI Dashboard</a> → Settings → Webhooks</li>
                    <li>Paste the webhook URL above in the "Server URL" field</li>
                    <li>Enable events: <code className="text-indigo-400 text-xs">call-started</code>, <code className="text-indigo-400 text-xs">call-ended</code>, <code className="text-indigo-400 text-xs">transcript</code></li>
                    <li>Save and test — VAPI will now automatically send call data to your dashboard</li>
                  </ol>
                </div>
                <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-4 text-sm">
                  <p className="text-indigo-400 font-bold mb-1">What happens on each event:</p>
                  <ul className="text-gray-400 space-y-1 text-xs">
                    <li>• <code className="text-indigo-400">call-started</code> → Call record created in database</li>
                    <li>• <code className="text-indigo-400">transcript</code> → Transcript updated in real-time</li>
                    <li>• <code className="text-indigo-400">call-ended</code> → Status, duration, cost updated + lead auto-detected + notification sent</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Buy Bland AI Number Modal ─────────── */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-gradient-to-br from-[#18181b] to-black border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🎯</span> Buy Bland AI Number
              </h3>
              <button onClick={() => setShowBuyModal(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-xs text-gray-400">
              Bland AI will assign a number from your requested area code and country. A subscription fee (approx. $15/mo) will apply directly to your Bland AI balance.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Country Code</label>
                <select value={buyCountryCode} onChange={e => setBuyCountryCode(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                  <option value="US">United States (US)</option>
                  <option value="CA">Canada (CA)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Area Code</label>
                <input type="text" value={buyAreaCode} onChange={e => setBuyAreaCode(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500 font-mono"
                  placeholder="e.g. 415" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowBuyModal(false)}
                className="flex-1 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleBuyNumber} disabled={buyingNumber}
                className="flex-1 py-2.5 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {buyingNumber ? 'Purchasing...' : 'Buy Number'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Razorpay Modal ────────────────────── */}
      {showRazorpayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#0f0f11] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#172554] px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-blue-500 rounded flex items-center justify-center font-bold text-white text-xs">R</div>
                <span className="text-white text-xs font-bold uppercase">Razorpay Secure</span>
              </div>
              <button onClick={() => setShowRazorpayModal(false)} disabled={isProcessingPayment} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6">
              {isProcessingPayment && <div className="flex flex-col items-center py-10 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div><p className="text-gray-400 text-sm">Processing payment...</p></div>}
              {paymentSuccess && <div className="flex flex-col items-center py-10 gap-4"><div className="h-12 w-12 bg-green-950/40 border border-green-500 text-green-400 rounded-full flex items-center justify-center text-2xl">✔</div><p className="text-white font-bold">Payment Successful!</p></div>}
              {!isProcessingPayment && !paymentSuccess && (
                <div className="space-y-4">
                  <div><span className="text-xs text-gray-500 uppercase">Upgrading to</span><p className="text-white text-xl font-bold">{selectedUpgradePlan} PLAN</p></div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between">
                    <span className="text-gray-400 text-sm">Amount</span>
                    <span className="text-white font-black text-xl">{selectedUpgradePlan === 'PRO' ? '$49.00' : '$199.00'}</span>
                  </div>
                  <button onClick={handleSimulatedPayment} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm transition-colors">
                    Simulate Payment via Razorpay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Configure/Edit Agent Modal ───────── */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-5xl p-6 flex flex-col h-[90vh] max-h-[850px] shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 shrink-0">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span>⚙️ Configure Agent:</span>
                  <span className="text-indigo-400 font-extrabold">{editAgentForm.name}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Edit prompt instructions, conversation flow, and chat widgets</p>
              </div>
              <button type="button" onClick={() => setEditingAgent(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>

            {/* Tabs list inside modal */}
            <div className="flex gap-4 border-b border-white/5 py-2 shrink-0">
              <button type="button" onClick={() => setEditModalTab('general')}
                className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                  editModalTab === 'general' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                }`}>
                General Settings
              </button>
              {(editAgentForm.type === 'VOICE' || editAgentForm.type === 'BOTH') && (
                <button type="button" onClick={() => setEditModalTab('flow')}
                  className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                    editModalTab === 'flow' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                  }`}>
                  🎙️ Call Flow Builder
                </button>
              )}
              {(editAgentForm.type === 'CHAT' || editAgentForm.type === 'BOTH') && (
                <button type="button" onClick={() => setEditModalTab('chat')}
                  className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                    editModalTab === 'chat' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                  }`}>
                  💬 Chat Widget Config
                </button>
              )}
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 min-h-0">
              
              {/* TAB: GENERAL */}
              {editModalTab === 'general' && (
                <form onSubmit={handleUpdateAgent} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Agent Name</label>
                    <input type="text" required value={editAgentForm.name} onChange={e => setEditAgentForm({ ...editAgentForm, name: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Language</label>
                      <select value={editAgentForm.language} onChange={e => setEditAgentForm({ ...editAgentForm, language: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                        <option value="HINDI">Hindi</option>
                        <option value="ENGLISH">English</option>
                        <option value="HINGLISH">Hinglish</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Tone</label>
                      <select value={editAgentForm.tone} onChange={e => setEditAgentForm({ ...editAgentForm, tone: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Agent Type</label>
                      <select value={editAgentForm.type} onChange={e => setEditAgentForm({ ...editAgentForm, type: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                        <option value="VOICE">🎙️ Voice Agent</option>
                        <option value="CHAT">💬 Chat Agent</option>
                        <option value="BOTH">🔄 Both (Voice + Chat)</option>
                      </select>
                    </div>
                    {(editAgentForm.type === 'VOICE' || editAgentForm.type === 'BOTH') && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">ElevenLabs Voice ID</label>
                        <input type="text" value={editAgentForm.voice_model} onChange={e => setEditAgentForm({ ...editAgentForm, voice_model: e.target.value })}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="sarah" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">System Prompt / Instructions</label>
                    <textarea rows={6} required value={editAgentForm.system_prompt} onChange={e => setEditAgentForm({ ...editAgentForm, system_prompt: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500 font-mono resize-none"
                      placeholder="Instructions defining character, persona, guidelines..." />
                  </div>
                  
                  <div className="flex gap-3 pt-4 border-t border-white/5">
                    <button type="button" onClick={() => setEditingAgent(null)} className="px-6 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Save Details</button>
                  </div>
                </form>
              )}

              {/* TAB: CALL FLOW BUILDER */}
              {editModalTab === 'flow' && (
                <div className="flex flex-col h-full min-h-[450px]">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center mb-4 shrink-0 bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex gap-2">
                      <button type="button" onClick={addFlowNode} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                        <span>➕</span> Add Step/Node
                      </button>
                      <button type="button" onClick={() => {
                        const isHindi = editAgentForm.language === 'HINDI' || editAgentForm.language === 'HINGLISH';
                        const sample = isHindi ? [
                          { id: 'greeting', type: 'greeting', message: 'Namaste! Main Vaxo AI se bol raha hoon. Kya aapke paas 2 minute hain?', nextNodeId: 'interest' },
                          { id: 'interest', type: 'branch', message: 'Humare naye discount offer ke baare mein jaanna chahenge?', options: [{ label: 'Yes', nextNodeId: 'pitch' }, { label: 'No', nextNodeId: 'close_no' }] },
                          { id: 'pitch', type: 'action', message: 'Pitch details: Hum de rahe hain 50% discount sabhi products par is month.', nextNodeId: 'collect_email' },
                          { id: 'collect_email', type: 'collect_info', message: 'Apna naam aur email batayein details ke liye.', metadata: { fieldName: 'email' }, nextNodeId: 'close_yes' },
                          { id: 'close_yes', type: 'closing', message: 'Shukriya! Hum aapko email bhejenge. Alvida!' },
                          { id: 'close_no', type: 'closing', message: 'Koi baat nahi. Sampark karne ke liye dhanyavaad. Bye!' }
                        ] : [
                          { id: 'greeting', type: 'greeting', message: 'Hello! I am calling from Vaxo AI. Do you have 2 minutes?', nextNodeId: 'interest' },
                          { id: 'interest', type: 'branch', message: 'Would you be interested in our premium plan?', options: [{ label: 'Yes', nextNodeId: 'pitch' }, { label: 'No', nextNodeId: 'close_no' }] },
                          { id: 'pitch', type: 'action', message: 'Explain: Get unlimited outbound calling agents at just $49/mo.', nextNodeId: 'collect_email' },
                          { id: 'collect_email', type: 'collect_info', message: 'Great! Could you please tell me your email address?', metadata: { fieldName: 'email' }, nextNodeId: 'close_yes' },
                          { id: 'close_yes', type: 'closing', message: 'Thanks! We will send details to your email. Bye!' },
                          { id: 'close_no', type: 'closing', message: 'No problem. Thanks for your time. Goodbye!' }
                        ];
                        setEditAgentForm({
                          ...editAgentForm,
                          call_flow: { nodes: sample, edges: [] }
                        });
                        setSelectedNodeId(sample[0].id);
                        showMsg('Loaded sample Sales flow!', 'success');
                      }} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs px-3 py-2 rounded-lg transition-colors">
                        Load Sales Template
                      </button>
                    </div>
                    <button type="button" onClick={() => {
                      const errors = validateFlowLocal(editAgentForm.call_flow);
                      if (errors.length > 0) {
                        showMsg(`Validation Error: ${errors[0]}`, 'error');
                      } else {
                        showMsg('Flow is valid! ready to compile.', 'success');
                      }
                    }} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold px-3 py-2 rounded-lg border border-indigo-500/20 transition-all">
                      🔍 Validate Flow
                    </button>
                  </div>

                  {/* Editor Workspace */}
                  <div className="flex-1 flex gap-4 min-h-0">
                    {/* Nodes List Column */}
                    <div className="w-1/3 bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col h-full overflow-y-auto">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Flow Steps</span>
                      <div className="space-y-2 flex-1">
                        {editAgentForm.call_flow.nodes.map((n: any, index: number) => (
                          <div key={n.id} onClick={() => setSelectedNodeId(n.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedNodeId === n.id ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/5 hover:border-white/10 bg-[#0d0d0f]'
                            }`}>
                            <div className="flex justify-between items-start">
                              <span className="font-mono text-xs text-indigo-400 font-bold">#{n.id}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-white/5 text-gray-400 border border-white/10">
                                {n.type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 mt-2 truncate">{n.message}</p>
                          </div>
                        ))}
                        {editAgentForm.call_flow.nodes.length === 0 && (
                          <div className="text-center py-10 text-gray-500 text-xs">
                            No nodes in the flow. Click "+ Add Step" to begin.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Node Detail/Configuration Column */}
                    <div className="flex-1 bg-black/20 border border-white/5 rounded-xl p-4 overflow-y-auto">
                      {selectedNodeId && editAgentForm.call_flow.nodes.find((n: any) => n.id === selectedNodeId) ? (
                        (() => {
                          const nodeIndex = editAgentForm.call_flow.nodes.findIndex((n: any) => n.id === selectedNodeId);
                          const node = editAgentForm.call_flow.nodes[nodeIndex];
                          return (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <h4 className="text-white font-bold text-sm">Configure Step</h4>
                                <button type="button" onClick={() => {
                                  deleteFlowNode(nodeIndex);
                                  setSelectedNodeId(editAgentForm.call_flow.nodes[0]?.id || null);
                                }} className="text-red-400 hover:text-red-300 text-xs font-bold">
                                  🗑️ Delete Step
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Step Identifier ID</label>
                                  <input type="text" value={node.id} onChange={e => {
                                    const newId = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                    updateFlowNode(nodeIndex, { id: newId });
                                    setSelectedNodeId(newId);
                                  }}
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 font-mono" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Step Type</label>
                                  <select value={node.type} onChange={e => updateFlowNode(nodeIndex, { type: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500">
                                    <option value="greeting">👋 Greeting (Starting node)</option>
                                    <option value="question">❓ Ask Question</option>
                                    <option value="branch">🔀 Decision Branch (Yes/No)</option>
                                    <option value="collect_info">📥 Collect Info</option>
                                    <option value="action">⚙️ System Action / Instruction</option>
                                    <option value="transfer">📞 Call Transfer</option>
                                    <option value="closing">🛑 Closing / End Call</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Prompt Message / Instruction text</label>
                                <textarea rows={3} value={node.message} onChange={e => updateFlowNode(nodeIndex, { message: e.target.value })}
                                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 resize-none"
                                  placeholder="What the AI should say or do at this step..." />
                              </div>

                              {/* If collect_info node */}
                              {node.type === 'collect_info' && (
                                <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Field Name to Collect (e.g., email, budget)</label>
                                  <input type="text" value={node.metadata?.fieldName || ''} onChange={e => updateFlowNode(nodeIndex, { metadata: { ...node.metadata, fieldName: e.target.value } })}
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500" placeholder="email" />
                                </div>
                              )}

                              {/* If NOT branch, transfer or closing: nextNodeId picker */}
                              {node.type !== 'branch' && node.type !== 'transfer' && node.type !== 'closing' && (
                                <div>
                                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Proceed to Next Step</label>
                                  <select value={node.nextNodeId || ''} onChange={e => updateFlowNode(nodeIndex, { nextNodeId: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500">
                                    <option value="">End call/No next step</option>
                                    {editAgentForm.call_flow.nodes.filter((n: any) => n.id !== node.id).map((n: any) => (
                                      <option key={n.id} value={n.id}>#{n.id} ({n.type})</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* If branch node: options config */}
                              {node.type === 'branch' && (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-gray-400 uppercase">Decision Branches</label>
                                    <button type="button" onClick={() => {
                                      const opts = node.options ? [...node.options] : [];
                                      opts.push({ label: 'Option Label', nextNodeId: '' });
                                      updateFlowNode(nodeIndex, { options: opts });
                                    }} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase">+ Add Branch</button>
                                  </div>
                                  <div className="space-y-2">
                                    {node.options && node.options.map((opt: any, optIdx: number) => (
                                      <div key={optIdx} className="flex gap-2 items-center bg-black/30 p-2 rounded-lg border border-white/5">
                                        <input type="text" value={opt.label} placeholder="e.g. Yes / Haan" onChange={e => {
                                          const opts = [...node.options];
                                          opts[optIdx] = { ...opts[optIdx], label: e.target.value };
                                          updateFlowNode(nodeIndex, { options: opts });
                                        }} className="flex-1 bg-black border border-white/10 rounded px-2 py-1 text-white text-xs outline-none" />
                                        
                                        <select value={opt.nextNodeId || ''} onChange={e => {
                                          const opts = [...node.options];
                                          opts[optIdx] = { ...opts[optIdx], nextNodeId: e.target.value };
                                          updateFlowNode(nodeIndex, { options: opts });
                                        }} className="flex-1 bg-black border border-white/10 rounded px-2 py-1 text-white text-xs outline-none">
                                          <option value="">Select Target Step...</option>
                                          {editAgentForm.call_flow.nodes.filter((n: any) => n.id !== node.id).map((n: any) => (
                                            <option key={n.id} value={n.id}>#{n.id} ({n.type})</option>
                                          ))}
                                        </select>

                                        <button type="button" onClick={() => {
                                          const opts = node.options.filter((_: any, i: number) => i !== optIdx);
                                          updateFlowNode(nodeIndex, { options: opts });
                                        }} className="text-red-400 text-xs font-bold font-sans">✕</button>
                                      </div>
                                    ))}
                                    {(!node.options || node.options.length === 0) && (
                                      <p className="text-gray-500 text-[11px] text-center py-2">Add at least two options (e.g., Yes & No branches)</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div className="h-full flex flex-col justify-center items-center text-gray-500 text-xs">
                          Select a step from the left column to configure its properties.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0 mt-4">
                    <button type="button" onClick={() => setEditingAgent(null)} className="px-6 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button type="button" onClick={handleUpdateAgent} className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Save Flow Configuration</button>
                  </div>
                </div>
              )}

              {/* TAB: CHAT WIDGET CONFIG */}
              {editModalTab === 'chat' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full min-h-[450px]">
                  {/* Config inputs */}
                  <form onSubmit={handleUpdateAgent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Welcome Message</label>
                      <input type="text" value={editAgentForm.chat_config?.welcome_message || ''}
                        onChange={e => setEditAgentForm({
                          ...editAgentForm,
                          chat_config: { ...editAgentForm.chat_config, welcome_message: e.target.value }
                        })}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Hello! How can I help you today?" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Widget Theme Color</label>
                        <div className="flex gap-2">
                          <input type="color" value={editAgentForm.chat_config?.theme_color || '#6366f1'}
                            onChange={e => setEditAgentForm({
                              ...editAgentForm,
                              chat_config: { ...editAgentForm.chat_config, theme_color: e.target.value }
                            })}
                            className="bg-transparent border border-white/10 rounded h-10 w-10 p-0 cursor-pointer shrink-0" />
                          <input type="text" value={editAgentForm.chat_config?.theme_color || '#6366f1'}
                            onChange={e => setEditAgentForm({
                              ...editAgentForm,
                              chat_config: { ...editAgentForm.chat_config, theme_color: e.target.value }
                            })}
                            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Widget Position</label>
                        <select value={editAgentForm.chat_config?.position || 'bottom-right'}
                          onChange={e => setEditAgentForm({
                            ...editAgentForm,
                            chat_config: { ...editAgentForm.chat_config, position: e.target.value }
                          })}
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                        </select>
                      </div>
                    </div>

                    {/* Embed code info */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2">
                      <h4 className="text-white font-bold text-xs">Iframe Embed Code Snippet</h4>
                      <p className="text-[11px] text-gray-400">Copy this code and paste it inside the HTML body of your website.</p>
                      <textarea readOnly rows={4}
                        value={`<iframe src="${window.location.origin}/chat/${editingAgent?.id}" style="width: 400px; height: 600px; border: none; position: fixed; bottom: 20px; ${editAgentForm.chat_config?.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'} z-index: 99999;" title="Chat Assistant"></iframe>`}
                        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-indigo-400 font-mono text-[10px] outline-none select-all resize-none" />
                      <button type="button" onClick={() => {
                        const code = `<iframe src="${window.location.origin}/chat/${editingAgent?.id}" style="width: 400px; height: 600px; border: none; position: fixed; bottom: 20px; ${editAgentForm.chat_config?.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'} z-index: 99999;" title="Chat Assistant"></iframe>`;
                        navigator.clipboard.writeText(code);
                        showMsg('Copied embed code!', 'success');
                      }} className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-3 py-1.5 rounded hover:bg-indigo-500/20 transition-all w-full">
                        Copy Snippet
                      </button>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      <button type="button" onClick={() => setEditingAgent(null)} className="px-6 py-2.5 text-sm font-bold border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">Cancel</button>
                      <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">Save Chat Config</button>
                    </div>
                  </form>

                  {/* Chat Widget Live Preview */}
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-5 flex flex-col justify-end items-center relative overflow-hidden min-h-[400px]">
                    <span className="absolute top-4 left-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded">Live Preview</span>
                    
                    {/* Chat box container */}
                    <div className="w-full max-w-[340px] bg-[#0c0c0e] border border-white/10 rounded-2xl flex flex-col h-[350px] shadow-2xl relative">
                      {/* Header */}
                      <div className="p-3 flex items-center justify-between border-b border-white/5 rounded-t-2xl text-white font-bold text-xs"
                        style={{ backgroundColor: editAgentForm.chat_config?.theme_color || '#6366f1' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                          <span>{editAgentForm.name} (AI)</span>
                        </div>
                        <span className="text-xs opacity-75">✕</span>
                      </div>
                      {/* Messages area */}
                      <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
                        <div className="flex justify-start">
                          <div className="bg-white/10 text-gray-200 text-[11px] rounded-2xl rounded-tl-none px-3 py-1.5 max-w-[80%] leading-relaxed">
                            {editAgentForm.chat_config?.welcome_message || 'Hello! How can I help you today?'}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="text-white text-[11px] rounded-2xl rounded-tr-none px-3 py-1.5 max-w-[80%] leading-relaxed"
                            style={{ backgroundColor: editAgentForm.chat_config?.theme_color || '#6366f1' }}>
                            Hey! Tell me more about your service.
                          </div>
                        </div>
                      </div>
                      {/* Input area */}
                      <div className="p-2 border-t border-white/5 flex gap-2">
                        <input readOnly type="text" placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[11px] outline-none text-gray-400" />
                        <button type="button" className="h-6 w-6 rounded-lg flex items-center justify-center text-xs text-white"
                          style={{ backgroundColor: editAgentForm.chat_config?.theme_color || '#6366f1' }}>
                          ✈
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Live Campaign Stats Modal ───────── */}
      {activeStatsCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-5xl p-6 flex flex-col h-[90vh] max-h-[850px] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 shrink-0">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span>📊 Live Campaign Tracker:</span>
                  <span className="text-indigo-400 font-extrabold">{activeStatsCampaign.name}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Real-time status, call outcomes, transcripts, and leads</p>
              </div>
              <button type="button" onClick={() => {
                setActiveStatsCampaign(null)
                setAutoRefreshStats(false)
              }} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>

            {/* Content Container - Scrollable */}
            <div className="flex-1 overflow-y-auto py-6 min-h-0 space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: 'Total Contacts', value: activeStatsCampaign.total_contacts || 0, color: 'border-white/5 bg-white/5' },
                  { label: 'Initiated/Ringing', value: activeStatsCampaign.initiated || 0, color: 'border-blue-500/20 bg-blue-500/5 text-blue-400' },
                  { label: 'Completed', value: activeStatsCampaign.calls_completed || 0, color: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400' },
                  { label: 'Successful/Leads', value: activeStatsCampaign.calls_successful || 0, color: 'border-green-500/20 bg-green-500/5 text-green-400' },
                  { label: 'Failed Calls', value: activeStatsCampaign.calls_failed || 0, color: 'border-red-500/20 bg-red-500/5 text-red-400' },
                  { label: 'No Answer', value: activeStatsCampaign.no_answer || 0, color: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400' },
                ].map(stat => (
                  <div key={stat.label} className={`border rounded-xl p-4 text-center ${stat.color}`}>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-black mt-1.5">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Live Monitoring Control Bar */}
              <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl p-4 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${autoRefreshStats ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefreshStats ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  </span>
                  <span className="text-xs font-bold text-gray-300">
                    {autoRefreshStats ? 'Auto-refreshing every 5s' : 'Auto-refresh paused'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setAutoRefreshStats(!autoRefreshStats)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      autoRefreshStats ? 'bg-green-600/20 border-green-500/20 text-green-400 hover:bg-green-600/30' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}>
                    {autoRefreshStats ? '⏸ Pause Auto-Refresh' : '▶ Enable Auto-Refresh'}
                  </button>
                  <button type="button" onClick={() => fetchLiveCampaignStats(activeStatsCampaign.id, token())}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
                    🔄 Refresh Now
                  </button>
                </div>
              </div>

              {/* Call Log List */}
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm">Campaign Call Registry</h4>
                
                <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                  {liveCalls.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-12">No calls have been registered for this campaign yet.</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {liveCalls.map(call => {
                        const isExpanded = expandedLiveCall === call.id;
                        const hasCollected = !!call.collected_data;
                        const interested = call.collected_data?.interested;
                        
                        return (
                          <div key={call.id} className="hover:bg-white/5 transition-colors">
                            {/* Row Header */}
                            <div className="p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 cursor-pointer"
                              onClick={() => setExpandedLiveCall(isExpanded ? null : call.id)}>
                              
                              <div className="flex items-center gap-3 min-w-[150px]">
                                <span className="text-xs text-white font-bold font-mono">{call.phone_number || 'Unknown'}</span>
                              </div>

                              <div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                  call.status === 'completed' ? 'bg-green-950/40 border-green-500/20 text-green-400' :
                                  call.status === 'failed' ? 'bg-red-950/40 border-red-500/20 text-red-400' :
                                  call.status === 'no_answer' ? 'bg-yellow-950/40 border-yellow-500/20 text-yellow-400' :
                                  'bg-blue-950/40 border-blue-500/20 text-blue-400 animate-pulse'
                                }`}>
                                  {call.status}
                                </span>
                              </div>

                              <div className="text-xs text-gray-400 min-w-[70px]">
                                {call.duration_sec ? `${Math.floor(call.duration_sec / 60)}m ${call.duration_sec % 60}s` : '—'}
                              </div>

                              <div className="min-w-[120px]">
                                {hasCollected ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    interested ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {interested ? '✨ Interested' : 'Not Interested'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">—</span>
                                )}
                              </div>

                              <div className="text-xs text-gray-400 font-mono min-w-[60px]">
                                {call.cost_usd ? `$${call.cost_usd.toFixed(2)}` : '—'}
                              </div>

                              <div className="text-[11px] text-gray-500">
                                {formatDate(call.created_at)}
                              </div>

                              <div className="text-indigo-400 text-xs font-bold hover:underline">
                                {isExpanded ? 'Hide Details' : 'Show Details'}
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="p-4 bg-black/40 border-t border-white/5 space-y-4 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Call Details */}
                                  <div className="space-y-2">
                                    <h5 className="text-white font-bold text-xs uppercase tracking-wider opacity-60">Call Details</h5>
                                    <p className="text-gray-400">Call ID: <span className="font-mono text-white select-all">{call.vapi_call_id}</span></p>
                                    {call.recording_url && (
                                      <div className="pt-2">
                                        <p className="text-gray-400 mb-1">Call Recording:</p>
                                        <audio src={call.recording_url} controls className="w-full max-w-md h-8 opacity-80" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Collected Lead Info */}
                                  {hasCollected && (
                                    <div className="space-y-2 bg-white/5 border border-white/5 p-3 rounded-lg">
                                      <h5 className="text-white font-bold text-xs uppercase tracking-wider opacity-60">Captured Lead Details</h5>
                                      <p className="text-gray-400">Name: <span className="text-white font-bold">{call.collected_data.name || '—'}</span></p>
                                      <p className="text-gray-400">Email: <span className="text-white font-bold">{call.collected_data.email || '—'}</span></p>
                                      <p className="text-gray-400">Intent Score: <span className="text-green-400 font-bold">{Math.round((call.collected_data.intent_score || 0) * 100)}%</span></p>
                                    </div>
                                  )}
                                </div>

                                {/* Transcript */}
                                <div className="space-y-1">
                                  <h5 className="text-white font-bold text-xs uppercase tracking-wider opacity-60">Call Transcript</h5>
                                  {call.transcript ? (
                                    <div className="bg-[#0c0c0e] border border-white/5 rounded-lg p-3 text-gray-300 font-sans leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {call.transcript}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 italic">No transcript recorded for this call.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

