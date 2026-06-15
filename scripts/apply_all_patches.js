// scripts/apply_all_patches.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../app/dashboard/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Patch 3: API keys active provider dropdown selection
const providerTarget = '<h3 className="text-white font-bold">{vapiConfig.telephony_provider} Configuration</h3>';
const providerReplacement = `<h3 className="text-white font-bold">Active Provider Configuration</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Active Telephony Provider</label>
                    <select value={vapiConfig.telephony_provider} onChange={e => {
                      setVapiConfig({ ...vapiConfig, telephony_provider: e.target.value });
                      setVapiTestResult(null);
                    }}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-indigo-500">
                      <option value="VAPI">Vapi AI</option>
                      <option value="RETELL">Retell AI</option>
                      <option value="BLAND_AI">Bland AI</option>
                      <option value="TELNYX">Telnyx</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5">Select the active provider you want to use for outbound and inbound calls.</p>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <h4 className="text-indigo-400 font-bold text-xs mb-3">{vapiConfig.telephony_provider} API credentials</h4>
                  </div>`;

if (content.includes(providerTarget)) {
  content = content.replace(providerTarget, providerReplacement);
  console.log("Patch 3: API settings dropdown applied.");
} else {
  console.log("Patch 3 failed to match.");
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("ALL PATCHES APPLIED TO ADMIN DASHBOARD!");
