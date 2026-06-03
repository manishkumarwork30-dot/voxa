/**
 * lib/flow-compiler.ts
 * Converts a visual call-flow JSON into a structured system prompt
 * that VAPI or a chat LLM can follow step-by-step.
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface FlowNode {
  id: string;
  type: 'greeting' | 'question' | 'branch' | 'action' | 'closing' | 'transfer' | 'collect_info';
  message: string;
  /** For branch nodes: options leading to different next nodes */
  options?: { label: string; nextNodeId: string }[];
  /** For linear nodes: the next node */
  nextNodeId?: string;
  /** Optional metadata (e.g. field name for collect_info) */
  metadata?: Record<string, string>;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface CallFlow {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ─────────────────────────────────────────────
// Compiler
// ─────────────────────────────────────────────

/**
 * Compile a CallFlow JSON into a human-readable conversation script
 * that can be injected as a system prompt.
 */
export function compileFlowToPrompt(flow: CallFlow, basePrompt: string): string {
  if (!flow || !flow.nodes || flow.nodes.length === 0) {
    return basePrompt;
  }

  const lines: string[] = [];
  lines.push(basePrompt);
  lines.push('');
  lines.push('=== CONVERSATION FLOW ===');
  lines.push('Follow this exact conversation flow step-by-step. Do NOT skip steps.');
  lines.push('');

  // Build a lookup for quick access
  const nodeMap = new Map<string, FlowNode>();
  for (const node of flow.nodes) {
    nodeMap.set(node.id, node);
  }

  // Find the entry node (first greeting, or first node overall)
  let entryNode = flow.nodes.find(n => n.type === 'greeting') || flow.nodes[0];
  if (!entryNode) return basePrompt;

  // Walk the flow and number the steps
  const visited = new Set<string>();
  let stepNum = 1;

  function walkNode(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    switch (node.type) {
      case 'greeting':
        lines.push(`Step ${stepNum}: GREETING`);
        lines.push(`  Say: "${node.message}"`);
        lines.push(`  Then proceed to Step ${stepNum + 1}.`);
        break;

      case 'question':
        lines.push(`Step ${stepNum}: ASK QUESTION`);
        lines.push(`  Ask the customer: "${node.message}"`);
        lines.push(`  Wait for their response, then proceed to the next step.`);
        break;

      case 'branch':
        lines.push(`Step ${stepNum}: DECISION BRANCH`);
        lines.push(`  Based on the customer's response to: "${node.message}"`);
        if (node.options && node.options.length > 0) {
          for (const opt of node.options) {
            const targetNode = nodeMap.get(opt.nextNodeId);
            const targetLabel = targetNode ? `(${targetNode.type}: "${targetNode.message.slice(0, 40)}...")` : '';
            lines.push(`    - If customer says "${opt.label}": Go to the step containing ${targetLabel}`);
          }
        }
        break;

      case 'collect_info':
        lines.push(`Step ${stepNum}: COLLECT INFORMATION`);
        lines.push(`  Ask: "${node.message}"`);
        const fieldName = node.metadata?.fieldName || 'information';
        lines.push(`  Capture the customer's ${fieldName} from their response.`);
        break;

      case 'action':
        lines.push(`Step ${stepNum}: ACTION`);
        lines.push(`  ${node.message}`);
        break;

      case 'transfer':
        lines.push(`Step ${stepNum}: TRANSFER`);
        lines.push(`  Say: "${node.message}"`);
        lines.push(`  End the call and mark for human follow-up.`);
        break;

      case 'closing':
        lines.push(`Step ${stepNum}: CLOSING`);
        lines.push(`  Say: "${node.message}"`);
        lines.push(`  End the conversation politely.`);
        break;
    }

    lines.push('');
    stepNum++;

    // Walk linear next
    if (node.nextNodeId) {
      walkNode(node.nextNodeId);
    }

    // Walk branch options
    if (node.options) {
      for (const opt of node.options) {
        walkNode(opt.nextNodeId);
      }
    }
  }

  walkNode(entryNode.id);

  lines.push('=== END OF FLOW ===');
  lines.push('');
  lines.push('IMPORTANT RULES:');
  lines.push('- Always follow the flow in order. Do not jump to unrelated topics.');
  lines.push('- If the customer goes off-script, gently steer them back to the current step.');
  lines.push('- Be natural and conversational while following the structure.');
  lines.push('- If the customer explicitly asks to end the call, go to the closing step.');

  return lines.join('\n');
}

/**
 * Validates a CallFlow structure.
 * Returns an array of validation errors (empty = valid).
 */
export function validateFlow(flow: CallFlow): string[] {
  const errors: string[] = [];

  if (!flow || !flow.nodes) {
    errors.push('Flow must have a nodes array');
    return errors;
  }

  if (flow.nodes.length === 0) {
    return errors; // empty flow is fine (no flow configured)
  }

  const ids = new Set<string>();
  for (const node of flow.nodes) {
    if (!node.id) errors.push('Every node must have an id');
    if (!node.type) errors.push(`Node ${node.id}: missing type`);
    if (!node.message) errors.push(`Node ${node.id}: missing message`);
    if (ids.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    ids.add(node.id);
  }

  // Check that branch nodes have at least 2 options
  for (const node of flow.nodes) {
    if (node.type === 'branch') {
      if (!node.options || node.options.length < 2) {
        errors.push(`Branch node ${node.id}: must have at least 2 options (e.g., Yes/No)`);
      }
    }
  }

  // Check that referenced nextNodeIds exist
  for (const node of flow.nodes) {
    if (node.nextNodeId && !ids.has(node.nextNodeId)) {
      errors.push(`Node ${node.id}: nextNodeId "${node.nextNodeId}" does not exist`);
    }
    if (node.options) {
      for (const opt of node.options) {
        if (!ids.has(opt.nextNodeId)) {
          errors.push(`Node ${node.id}, option "${opt.label}": nextNodeId "${opt.nextNodeId}" does not exist`);
        }
      }
    }
  }

  // Must have at least one greeting or starting node
  const hasEntry = flow.nodes.some(n => n.type === 'greeting');
  if (!hasEntry && flow.nodes.length > 0) {
    errors.push('Flow should have at least one greeting node as the starting point');
  }

  return errors;
}

/**
 * Creates a default sample flow for a given agent type/category.
 */
export function createDefaultFlow(category: string, language: string): CallFlow {
  const isHindi = language === 'HINDI' || language === 'HINGLISH';

  const flows: Record<string, CallFlow> = {
    SALES: {
      nodes: [
        {
          id: 'greeting',
          type: 'greeting',
          message: isHindi
            ? 'Namaste! Main [Company] se bol raha hoon. Kya aapke paas 2 minute hain?'
            : 'Hello! I am calling from [Company]. Do you have 2 minutes?',
          nextNodeId: 'interest_check',
        },
        {
          id: 'interest_check',
          type: 'branch',
          message: isHindi
            ? 'Humari nayi service/product ke baare mein jaanna chahenge?'
            : 'Would you like to know about our new service/product?',
          options: [
            { label: 'Yes / Haan', nextNodeId: 'pitch' },
            { label: 'No / Nahi', nextNodeId: 'polite_close' },
          ],
        },
        {
          id: 'pitch',
          type: 'action',
          message: isHindi
            ? 'Product/Service ke features aur benefits batao. Price mention karo.'
            : 'Explain key product/service features and benefits. Mention pricing.',
          nextNodeId: 'collect_details',
        },
        {
          id: 'collect_details',
          type: 'collect_info',
          message: isHindi
            ? 'Aapka naam aur email address bata dijiye taaki hum aapko details bhej sakein.'
            : 'Could you share your name and email so we can send you the details?',
          metadata: { fieldName: 'name and email' },
          nextNodeId: 'thank_close',
        },
        {
          id: 'thank_close',
          type: 'closing',
          message: isHindi
            ? 'Bahut shukriya! Hum aapko jaldi details bhejenge. Aapka din shubh ho!'
            : 'Thank you so much! We will send you the details shortly. Have a great day!',
        },
        {
          id: 'polite_close',
          type: 'closing',
          message: isHindi
            ? 'Koi baat nahi! Agar future mein interest ho toh zaroor sampark karein. Dhanyavaad!'
            : 'No problem at all! Feel free to reach out if you are interested later. Thank you!',
        },
      ],
      edges: [
        { from: 'greeting', to: 'interest_check' },
        { from: 'interest_check', to: 'pitch', label: 'Yes' },
        { from: 'interest_check', to: 'polite_close', label: 'No' },
        { from: 'pitch', to: 'collect_details' },
        { from: 'collect_details', to: 'thank_close' },
      ],
    },
    SUPPORT: {
      nodes: [
        {
          id: 'greeting',
          type: 'greeting',
          message: isHindi
            ? 'Namaste! [Company] support mein aapka swagat hai. Main aapki kaise madad kar sakta hoon?'
            : 'Hello! Welcome to [Company] support. How can I help you today?',
          nextNodeId: 'issue_check',
        },
        {
          id: 'issue_check',
          type: 'question',
          message: isHindi
            ? 'Kya aap apni samasya bata sakte hain?'
            : 'Could you describe the issue you are facing?',
          nextNodeId: 'resolve_branch',
        },
        {
          id: 'resolve_branch',
          type: 'branch',
          message: isHindi
            ? 'Kya yeh samasya resolve ho gayi?'
            : 'Has this resolved your issue?',
          options: [
            { label: 'Yes / Resolved', nextNodeId: 'happy_close' },
            { label: 'No / Need more help', nextNodeId: 'escalate' },
          ],
        },
        {
          id: 'happy_close',
          type: 'closing',
          message: isHindi
            ? 'Bahut badhiya! Agar aur koi samasya ho toh hume zaroor bataiye. Dhanyavaad!'
            : 'Great! If you need any more help, feel free to contact us. Thank you!',
        },
        {
          id: 'escalate',
          type: 'transfer',
          message: isHindi
            ? 'Main aapko hamare senior team member se connect karta hoon. Kripya hold karein.'
            : 'Let me connect you with a senior team member. Please hold.',
        },
      ],
      edges: [
        { from: 'greeting', to: 'issue_check' },
        { from: 'issue_check', to: 'resolve_branch' },
        { from: 'resolve_branch', to: 'happy_close', label: 'Yes' },
        { from: 'resolve_branch', to: 'escalate', label: 'No' },
      ],
    },
  };

  return flows[category] || flows.SALES!;
}
