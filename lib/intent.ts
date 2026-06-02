/**
 * lib/intent.ts
 * Keyword-based intent detection for Hindi + English call transcripts.
 * Detects if a customer expressed interest (positive lead intent).
 */

// ─────────────────────────────────────────────
// Positive intent keywords (Hindi + Hinglish + English)
// ─────────────────────────────────────────────
const POSITIVE_KEYWORDS = [
  // Hindi
  'हां', 'हाँ', 'जी हां', 'जी हाँ', 'बिल्कुल', 'ज़रूर', 'हां जी', 'ठीक है',
  'interested', 'interest', 'कर सकते हैं', 'बता दो', 'बताइए', 'जानना चाहता',
  'जानना चाहती', 'जानकारी चाहिए', 'सुनना चाहता', 'सुनना चाहती', 'अच्छा लगा',
  'पसंद है', 'कर लेंगे', 'देखते हैं', 'हाँ बताओ', 'आगे बताओ',
  // Hinglish
  'haan', 'ha', 'bilkul', 'zaroor', 'theek hai', 'accha', 'acha', 'batao',
  'interested hoon', 'interested hu', 'suno', 'bolo', 'yes bhai', 'yes yaar',
  // English
  'yes', 'yeah', 'yep', 'sure', 'absolutely', 'definitely', 'of course',
  'interested', 'tell me more', 'go ahead', 'sounds good', 'great', 'ok',
  'okay', 'please proceed', 'i want', 'i need', 'sign me up', 'count me in',
];

// Negative keywords to subtract confidence
const NEGATIVE_KEYWORDS = [
  'नहीं', 'नही', 'no', 'nahi', 'na', 'mat', 'मत', 'not interested',
  'busy', 'baad mein', 'बाद में', 'call mat karo', 'remove',
  'do not call', 'mujhe mat', 'koi zaroorat nahi', 'zaroorat nahi',
];

export interface IntentResult {
  isLead: boolean;
  score: number;          // 0 to 1 confidence
  matchedKeywords: string[];
  customerName?: string;
  email?: string;
}

/**
 * Detect positive purchase/interest intent from a call transcript.
 */
export function detectIntent(transcript: string): IntentResult {
  if (!transcript || transcript.trim().length === 0) {
    return { isLead: false, score: 0, matchedKeywords: [] };
  }

  const lower = transcript.toLowerCase();

  // Count positive matches
  const posMatches = POSITIVE_KEYWORDS.filter(kw =>
    lower.includes(kw.toLowerCase())
  );

  // Count negative matches
  const negMatches = NEGATIVE_KEYWORDS.filter(kw =>
    lower.includes(kw.toLowerCase())
  );

  // Score: positive hits weight more if no negatives
  let rawScore = posMatches.length * 0.15;
  rawScore -= negMatches.length * 0.25;
  rawScore = Math.max(0, Math.min(1, rawScore));

  // Boost: if transcript has strong single positive words
  const strongPositive = ['yes', 'हां', 'हाँ', 'bilkul', 'bilikul', 'absolutely', 'definitely'];
  const hasStrong = strongPositive.some(kw => lower.includes(kw));
  if (hasStrong && negMatches.length === 0) {
    rawScore = Math.max(rawScore, 0.75);
  }

  const isLead = rawScore >= 0.5;

  // Try to extract email
  const emailMatch = transcript.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Try to extract name from "mera naam X hai" / "my name is X"
  let customerName: string | undefined;
  const nameHindi = transcript.match(/(?:mera naam|मेरा नाम|my name is)\s+([A-Za-z\u0900-\u097F]+)/i);
  if (nameHindi) {
    customerName = nameHindi[1];
  }

  return {
    isLead,
    score: Math.round(rawScore * 1000) / 1000,
    matchedKeywords: posMatches,
    customerName,
    email,
  };
}
