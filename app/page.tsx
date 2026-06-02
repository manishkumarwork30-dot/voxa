'use client'

import Link from 'next/link'
import { useState } from 'react'

const BRAND_NAME = "Vaxo Calling AI"

export default function HomePage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    if (activeFaq === index) setActiveFaq(null)
    else setActiveFaq(index)
  }

  const faqs = [
    "How quickly can I really create a Voice AI agent?",
    "Do I need any technical or coding knowledge?",
    "What kind of Voice AI agents can I build?",
    "Can I customize how the AI agent sounds and responds?",
    "What happens after I create my agent?",
    "Is there a free trial or demo available?",
    "Can I integrate my AI agent with existing systems?",
    "How does the AI handle multiple conversations at once?",
    "Can the AI agent make outbound calls?",
    "Can I train the AI on my company data?",
    "What happens if the AI doesn’t understand something?",
    "Can I use my own phone number for calls?",
    "Can I monitor my AI agents in real time?",
    "How much does it cost to use the platform?",
    "How do I measure the success of my AI agent?",
    "Can I pause or edit an agent after it’s live?",
    "What is the latency on Vaxo Calling AI calls?",
    "Can I make bulk calls or outgoing calls?",
    "I have my own telephony, can I use it with Vaxo Calling AI?"
  ]

  return (
    <div className="min-h-screen bg-[#070708] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#070708]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.7)] transition-all duration-300">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/></svg>
            </div>
            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-all duration-300">{BRAND_NAME}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#resources" className="hover:text-white transition-colors">Resources</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log In</Link>
            <Link href="/signup" className="text-sm font-bold bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] transform hover:-translate-y-0.5">Try for free</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-24 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-300 mb-8 backdrop-blur-md hover:bg-white/10 transition-colors cursor-default">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            Meet {BRAND_NAME} Voice AI
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Create your Free <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-sm">Voice AI Assistant</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Build, test, and ship reliable voice AI assistants
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 group">
              Create Agent
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </Link>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-3 text-sm font-medium text-gray-400">
            <span className="text-gray-500 mr-2 uppercase tracking-widest text-xs font-bold">Choose from use cases:</span>
            {["Lead Generation", "Appointments", "Support", "Negotiation", "Collections"].map((useCase, idx) => (
              <span key={idx} className="px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-colors cursor-pointer hover:text-white">
                {useCase}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-10">Trusted by leading companies</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-2xl font-extrabold tracking-wider font-sans hover:text-blue-500 transition-colors cursor-pointer">Capgemini</span>
            <span className="text-2xl font-bold tracking-tight hover:text-gray-300 transition-colors cursor-pointer">MG Motors</span>
            <span className="text-3xl font-black italic tracking-tighter hover:text-green-500 transition-colors cursor-pointer">Cipla</span>
            <span className="text-xl font-bold tracking-wider hover:text-blue-400 transition-colors cursor-pointer">Farmers Insurance</span>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">Why {BRAND_NAME} for Voice AI?</h2>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto font-light">Powerful features to build, deploy, and scale your Voice AI assistants.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Multi-Language", desc: "Serve users in हिंदी, தமிழ், Español, 日本語, and more", icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" },
              { title: "Scale Outbound", desc: "Automate lead gen, reminders & collections", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
              { title: "24/7 Inbound", desc: "Handle bookings and inquiries around the clock", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { title: "Connect Stack", desc: "Integrate with CRM, Sheets, Slack, n8n", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
              { title: "Quick Training", desc: "Train AI with your own call recordings", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
              { title: "Phone Numbers", desc: "Buy Indian (+91) or US (+1) numbers instantly", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" }
            ].map((feature, i) => (
              <div key={i} className="bg-[#111113]/80 backdrop-blur-sm border border-white/5 p-8 rounded-3xl hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-all duration-300 group shadow-lg hover:shadow-indigo-500/10">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-lg">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 px-6 bg-gradient-to-b from-[#070708] via-[#0f0f13] to-[#070708] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">How it Works</h2>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto font-light">Create and deploy your Voice AI assistant in five simple steps</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 relative">
            <div className="hidden md:block absolute top-[40px] left-[10%] w-[80%] h-0.5 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-0"></div>
            
            {[
              { step: "1", title: "Write", desc: "Describe what type of Voice AI assistant you want" },
              { step: "2", title: "Test", desc: "Try out your assistant and see how it performs" },
              { step: "3", title: "Add Functionalities", desc: "Enhance through chat and drag-and-drop" },
              { step: "4", title: "Deploy", desc: "Make your assistant available to your users" },
              { step: "5", title: "Observe & Monitor", desc: "Track performance and make improvements" }
            ].map((item, i) => (
              <div key={i} className="flex-1 relative z-10 group cursor-default">
                <div className="bg-[#070708] border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-8 mx-auto shadow-[0_0_30px_rgba(99,102,241,0.15)] group-hover:border-indigo-500/50 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all duration-300">
                  <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-pink-400">{item.step}</span>
                </div>
                <div className="text-center px-2">
                  <h3 className="text-xl font-bold mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-base text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creation Features */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight tracking-tight">Create Voice AI Assistants with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Natural Language</span></h2>
            <p className="text-xl text-gray-400 mb-12 font-light leading-relaxed">Simply describe what you want your Voice AI assistant to do, and we'll build it for you.</p>
            
            <div className="space-y-8">
              {[
                { title: "Conversational Creation", desc: "Build your assistant through natural conversation - just chat with our platform about what you need." },
                { title: "Drag-and-Drop Interface", desc: "Fine-tune your assistant's capabilities with our intuitive drag-and-drop editor." },
                { title: "Pre-built Templates", desc: "Start with industry-specific templates and customize to your needs." }
              ].map((f, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-1 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{f.title}</h4>
                    <p className="text-lg text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-pink-600/20 rounded-[2rem] blur-3xl"></div>
            <div className="relative bg-[#111113]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/5">
                 <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                 <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                 <div className="w-3.5 h-3.5 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              </div>
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl inline-block max-w-[85%] rounded-tl-sm shadow-lg">
                  <p className="text-base text-gray-300">Create a lead generation assistant for my real estate agency.</p>
                </div>
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-5 rounded-2xl inline-block max-w-[85%] rounded-tr-sm shadow-[0_10px_25px_rgba(79,70,229,0.3)]">
                    <p className="text-base text-white">I've created the "Real Estate Lead Gen Agent". I've configured it with a professional voice and connected it to your CRM to log new leads.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Details */}
      <section className="py-24 px-6 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Key Features</h2>
            <h3 className="text-3xl md:text-5xl font-bold">Build high quality Voice AI assistants in minutes</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Think it. Refine it.", 
                desc: "Simply describe your voice AI assistant in plain text, then watch us do the rest. Building voice AI assistants is easier than ever before." 
              },
              { 
                title: "Prompt to configure and edit.", 
                desc: "Just write in text what changes you want made to your voice AI assistant. Ask in text to configure 100s of voices, latest LLMs, capabilities like call transfers, adding knowledge bases, making voice AI assistant doing web search." 
              },
              { 
                title: "Workflow support", 
                desc: "Build reliable voice AI assistants through rigorous simulated testing, real-time observability to track issues, and effortless no-code LLM fine-tuning, evaluation, deployment, and monitoring." 
              }
            ].map((f, i) => (
              <div key={i} className="bg-[#070708] border border-white/10 p-10 rounded-[2rem] hover:border-indigo-500/30 transition-all duration-300 group hover:bg-[#111113]">
                <h4 className="text-2xl font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors">{f.title}</h4>
                <p className="text-gray-400 leading-relaxed text-lg">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-32 px-6 relative">
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -translate-y-1/2"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Ecosystem</h2>
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">Plug into the tools your team already uses</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 text-left">
            {[
              { title: "Calendars & CRM", desc: "Sync schedules and customer records with Cal.com, Google Calendar, HubSpot, and Salesforce.", items: ["Cal.com", "Google Calendar", "HubSpot", "Salesforce"] },
              { title: "Automation", desc: "Trigger Zapier, Make, and n8n workflows from call events and agent actions.", items: ["Zapier", "Make", "n8n"] },
              { title: "Telephony", desc: "Bring your existing phone numbers from Twilio, RingCentral, Vonage, or Exotel.", items: ["Twilio", "RingCentral", "Vonage", "Exotel"] },
              { title: "Messaging", desc: "Push transcripts, hand-offs, and call summaries to Slack and WhatsApp.", items: ["Slack", "WhatsApp"] }
            ].map((cat, i) => (
              <div key={i} className="bg-[#111113]/80 backdrop-blur-sm border border-white/10 rounded-[2rem] p-8 hover:border-indigo-500/30 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                <h4 className="font-bold text-2xl mb-4 text-white group-hover:text-indigo-400 transition-colors">{cat.title}</h4>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed min-h-[60px]">{cat.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item, j) => (
                    <span key={j} className="text-xs font-semibold bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-gray-300 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16">
            <Link href="#integrations" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold text-lg transition-colors group">
              Browse all integrations
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 bg-[#0a0a0c] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Testimonials</h2>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">What Our Users Say</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#111113] border border-white/5 p-10 rounded-[2rem] relative group hover:border-white/10 transition-colors">
              <span className="text-8xl text-indigo-500/10 absolute top-4 right-8 font-serif leading-none group-hover:text-indigo-500/20 transition-colors">"</span>
              <p className="text-gray-300 mb-10 relative z-10 text-lg leading-relaxed font-light">“I love this product, it's Bolt for Voice AI.”</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl font-bold">C</div>
                <div>
                  <p className="font-bold text-white text-lg">VP Engineering</p>
                  <p className="text-sm text-indigo-400">Capgemini</p>
                </div>
              </div>
            </div>
            <div className="bg-[#111113] border border-white/5 p-10 rounded-[2rem] relative group hover:border-white/10 transition-colors">
              <span className="text-8xl text-indigo-500/10 absolute top-4 right-8 font-serif leading-none group-hover:text-indigo-500/20 transition-colors">"</span>
              <p className="text-gray-300 mb-10 relative z-10 text-lg leading-relaxed font-light">“This is the kind of tool that makes Voice AI usable for everyone, not just engineers.”</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold">AK</div>
                <div>
                  <p className="font-bold text-white text-lg">Akhilender Kaukuntla</p>
                  <p className="text-sm text-indigo-400">KAYA AI</p>
                </div>
              </div>
            </div>
            <div className="bg-[#111113] border border-white/5 p-10 rounded-[2rem] relative group hover:border-white/10 transition-colors">
              <span className="text-8xl text-indigo-500/10 absolute top-4 right-8 font-serif leading-none group-hover:text-indigo-500/20 transition-colors">"</span>
              <p className="text-gray-300 mb-10 relative z-10 text-lg leading-relaxed font-light">“This was different — this was compassion engineered into code. One of the most emotionally intelligent AI platforms I've ever touched.”</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-xl font-bold">JS</div>
                <div>
                  <p className="font-bold text-white text-lg">Jarron Sorrell</p>
                  <p className="text-sm text-indigo-400">Sorrell Holdings LLC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Try it</h2>
          <h3 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight">Build your first <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">voice AI agent</span></h3>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">Spin up a production-grade voice agent from a single prompt. Free to try, no credit card required.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/signup" className="w-full sm:w-auto px-10 py-5 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Try for free
            </Link>
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
               <span className="text-gray-500 font-medium">or</span>
               <Link href="#demo" className="w-full sm:w-auto px-10 py-5 bg-[#111113] text-white border border-white/10 font-bold text-lg rounded-full hover:bg-white/5 transition-all">
                 Talk to us
               </Link>
            </div>
          </div>
          <p className="mt-8 text-sm text-gray-500">Walk through Vaxo Calling AI with our team. Get tailored guidance for your use case and pricing.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-6 bg-[#0a0a0c]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-400 font-light">Common questions about the Vaxo Calling AI platform</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-white/5 rounded-2xl overflow-hidden bg-[#111113]/50 hover:bg-[#111113] transition-colors">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between p-8 text-left focus:outline-none group"
                >
                  <span className="font-semibold text-lg text-gray-200 pr-8 group-hover:text-indigo-300 transition-colors">{faq}</span>
                  <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 transition-all duration-300 ${activeFaq === i ? 'rotate-180 bg-indigo-500/20 text-indigo-400' : 'text-gray-400 group-hover:bg-white/10'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </button>
                <div 
                  className={`px-8 text-gray-400 text-base leading-relaxed overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-40 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  This is a placeholder answer. {BRAND_NAME} makes it incredibly easy to configure and deploy Voice AI directly from your dashboard without any complex setup.
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#070708] border-t border-white/5 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 mb-20">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/></svg>
                </div>
                <span className="text-2xl font-bold tracking-tight">Vaxo</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6 text-lg">Solutions</h4>
              <ul className="space-y-4 text-base text-gray-400">
                <li className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">By industry</li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Real Estate</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Healthcare</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Insurance</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Restaurants</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Finance</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Education</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">E-commerce</a></li>
                <li className="text-xs font-semibold text-gray-600 uppercase tracking-wider mt-6 mb-2">By use case</li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Lead Generation</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Collections</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6 text-lg">Product</h4>
              <ul className="space-y-4 text-base text-gray-400">
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Pricing</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Integrations</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Telephony</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Multilingual</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Instant Voice</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">White Label</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6 text-lg">Resources</h4>
              <ul className="space-y-4 text-base text-gray-400">
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Blog</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Documentation</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Product Updates</a></li>
                <li className="text-xs font-semibold text-gray-600 uppercase tracking-wider mt-6 mb-2">Sales & Support</li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Book a Demo</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Contact Sales</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Enterprise Sales</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Report an Issue</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6 text-lg">Legal</h4>
              <ul className="space-y-4 text-base text-gray-400">
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Terms of Use</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col items-center justify-center gap-4 text-sm text-gray-600">
            <p>© 2026 Vaxo Calling AI</p>
          </div>
        </div>
      </footer>

    </div>
  )
}