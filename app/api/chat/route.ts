/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { compileFlowToPrompt } from "@/lib/flow-compiler";
import { detectIntent } from "@/lib/intent";

// ─────────────────────────────────────────────
// POST /api/chat — send a message to a chat agent
// Public endpoint (no auth required for visitor chat)
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agent_id,
      conversation_id,
      message,
      visitor_name,
      visitor_email,
      visitor_phone,
    } = body;

    if (!agent_id || !message) {
      return NextResponse.json(
        { error: "agent_id and message are required" },
        { status: 400 }
      );
    }

    // Fetch the agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check agent is CHAT or BOTH type and ACTIVE
    if (agent.type === "VOICE") {
      return NextResponse.json(
        { error: "This is a voice-only agent. Use the phone call feature instead." },
        { status: 400 }
      );
    }

    if (agent.status !== "ACTIVE") {
      return NextResponse.json({ error: "Agent is not active" }, { status: 400 });
    }

    // Compile the system prompt with flow
    let systemPrompt = agent.system_prompt;
    if (agent.call_flow?.nodes?.length > 0) {
      systemPrompt = compileFlowToPrompt(agent.call_flow, agent.system_prompt);
    }

    // Get or create conversation
    let conversationData;
    if (conversation_id) {
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversation_id)
        .single();

      if (existing) {
        conversationData = existing;
      }
    }

    if (!conversationData) {
      // Create new conversation
      const { data: newConv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          admin_id: agent.admin_id,
          agent_id: agent.id,
          visitor_name: visitor_name || "Visitor",
          visitor_email: visitor_email || null,
          visitor_phone: visitor_phone || null,
          status: "ACTIVE",
          messages: [],
        })
        .select("*")
        .single();

      if (convErr) {
        console.error("Failed to create conversation:", convErr);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }
      conversationData = newConv;
    }

    // Get existing messages
    const existingMessages: Array<{ role: string; content: string; timestamp: string }> =
      conversationData.messages || [];

    // Add user message
    existingMessages.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Build conversation context for AI
    const contextMessages = [
      { role: "system", content: systemPrompt },
      ...existingMessages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    // Generate AI response using a simple fetch to a compatible API
    // Using the admin's VAPI key or a default LLM endpoint
    let aiResponse = "";

    try {
      // Try OpenAI gpt-4o-mini first if configured (highly cost-effective and fast)
      if (process.env.OPENAI_API_KEY) {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 500,
            messages: [
              { role: "system", content: systemPrompt },
              ...existingMessages.map((m: { role: string; content: string }) => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.content,
              })),
            ],
          }),
        });

        if (openaiRes.ok) {
          const openaiData = await openaiRes.json();
          aiResponse = openaiData.choices?.[0]?.message?.content || "";
        } else {
          console.warn("OpenAI API response error:", await openaiRes.text());
        }
      }

      // Fallback to Anthropic if OpenAI wasn't used/available
      if (!aiResponse) {
        const { data: admin } = await supabaseAdmin
          .from("users")
          .select("vapi_api_key")
          .eq("id", agent.admin_id)
          .single();

        if (admin?.vapi_api_key) {
          const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY || "",
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 500,
              system: systemPrompt,
              messages: existingMessages.map((m: { role: string; content: string }) => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.content,
              })),
            }),
          });

          if (anthropicRes.ok) {
            const anthropicData = await anthropicRes.json();
            aiResponse = anthropicData.content?.[0]?.text || "";
          }
        }
      }

      // Fallback: generate a contextual response based on agent config
      if (!aiResponse) {
        aiResponse = generateFallbackResponse(agent, message, existingMessages);
      }
    } catch (err) {
      console.error("AI response generation failed:", err);
      aiResponse = generateFallbackResponse(agent, message, existingMessages);
    }

    // Add AI response to messages
    existingMessages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString(),
    });

    // Run intent detection on the full conversation
    const fullTranscript = existingMessages
      .filter((m: { role: string }) => m.role === "user")
      .map((m: { content: string }) => m.content)
      .join(" ");
    const intentResult = detectIntent(fullTranscript);

    // Update conversation in DB
    await supabase
      .from("chat_conversations")
      .update({
        messages: existingMessages,
        visitor_name: visitor_name || conversationData.visitor_name,
        visitor_email: visitor_email || conversationData.visitor_email,
        visitor_phone: visitor_phone || conversationData.visitor_phone,
        intent_result: intentResult,
      })
      .eq("id", conversationData.id);

    // If intent detected as lead, create lead record
    if (intentResult.isLead && intentResult.score >= 0.6) {
      const { error: leadErr } = await supabaseAdmin.from("leads").insert({
        admin_id: agent.admin_id,
        call_id: null,
        customer_name: visitor_name || intentResult.customerName || "Chat Visitor",
        phone: visitor_phone || "",
        email: visitor_email || intentResult.email || null,
        response_text: fullTranscript.slice(0, 1000),
        intent_score: intentResult.score,
        status: "NEW",
      });
      if (leadErr) console.error("Lead creation from chat failed:", leadErr);
    }

    return NextResponse.json({
      conversation_id: conversationData.id,
      message: aiResponse,
      intent: intentResult,
      messages: existingMessages,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// Fallback response generator when no LLM API is available
// Uses the agent's flow and system prompt to generate contextual replies
// ─────────────────────────────────────────────
function generateFallbackResponse(
  agent: Record<string, any>,
  userMessage: string,
  history: Array<{ role: string; content: string }>
): string {
  const lowerMsg = userMessage.toLowerCase();
  const isHindi = agent.language === "HINDI" || agent.language === "HINGLISH";
  const messageCount = history.filter((m: { role: string }) => m.role === "user").length;

  // Use flow nodes if available
  if (agent.call_flow?.nodes?.length > 0) {
    const nodes = agent.call_flow.nodes;
    const nodeIndex = Math.min(messageCount - 1, nodes.length - 1);
    const currentNode = nodes[nodeIndex];

    if (currentNode) {
      // Handle branch nodes
      if (currentNode.type === "branch" && currentNode.options) {
        const positiveWords = ["yes", "haan", "ha", "bilkul", "sure", "okay", "ok", "हां", "हाँ", "जी"];
        const isPositive = positiveWords.some(w => lowerMsg.includes(w));

        if (isPositive && currentNode.options[0]) {
          const nextNode = nodes.find((n: { id: string }) => n.id === currentNode.options[0].nextNodeId);
          return nextNode?.message || currentNode.options[0].label;
        } else if (currentNode.options[1]) {
          const nextNode = nodes.find((n: { id: string }) => n.id === currentNode.options[1].nextNodeId);
          return nextNode?.message || currentNode.options[1].label;
        }
      }

      return currentNode.message;
    }
  }

  // Generic contextual responses
  if (messageCount <= 1) {
    return agent.chat_config?.welcome_message || (isHindi
      ? "Namaste! Main aapki kaise madad kar sakta hoon?"
      : "Hello! How can I help you today?");
  }

  if (lowerMsg.includes("price") || lowerMsg.includes("cost") || lowerMsg.includes("keemat") || lowerMsg.includes("kitna")) {
    return isHindi
      ? "Hamari pricing aapke requirements par depend karti hai. Kya aap apna contact detail share kar sakte hain taaki hum aapko detailed quotation bhej sakein?"
      : "Our pricing depends on your specific requirements. Could you share your contact details so we can send you a detailed quotation?";
  }

  if (lowerMsg.includes("thank") || lowerMsg.includes("shukriya") || lowerMsg.includes("dhanyavaad")) {
    return isHindi
      ? "Aapka shukriya! Agar aur koi sawaal ho toh zaroor poochein. Hum hamesha madad ke liye tayyar hain!"
      : "Thank you! If you have any more questions, feel free to ask. We're always happy to help!";
  }

  return isHindi
    ? "Ji bilkul, main samajh raha hoon. Kya aap thoda aur detail bata sakte hain?"
    : "I understand. Could you please provide a bit more detail so I can help you better?";
}
