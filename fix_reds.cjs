/* eslint-disable */
const fs = require('fs');
['app/dashboard/admin/page.tsx', 'app/dashboard/super-admin/page.tsx'].forEach(file => {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  
  // Revert 'FAILED' call status circle
  text = text.replace(/call\.status === 'FAILED' \? 'bg-blue-500'/g, "call.status === 'FAILED' ? 'bg-red-500'");
  text = text.replace(/status === 'FAILED' \? 'bg-blue-500'/g, "status === 'FAILED' ? 'bg-red-500'");
  
  // Revert call direction for OUTBOUND
  text = text.replace(/call\.direction === 'INBOUND' \? 'bg-blue-500' : 'bg-blue-500'/g, "call.direction === 'INBOUND' ? 'bg-blue-500' : 'bg-red-500'");

  // Revert Delete buttons
  text = text.replace(/className=\"text-blue-400 hover:text-blue-300 text-xs font-bold\">Delete<\/button>/g, 'className=\"text-red-400 hover:text-red-300 text-xs font-bold\">Delete</button>');
  
  // Revert Error messages
  text = text.replace(/bg-blue-950\/40 border border-blue-500\/30 text-blue-400 rounded-xl p-3 flex items-center gap-2 text-sm/g, 'bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl p-3 flex items-center gap-2 text-sm');
  
  // Revert 'Delete' action in Super Admin
  text = text.replace(/className=\"bg-blue-950\/30 text-blue-400 hover:text-blue-300 hover:bg-blue-900\/50/g, 'className=\"bg-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-900/50');
  
  // Super admin "Suspend" button
  text = text.replace(/text-blue-400 hover:text-blue-300 hover:bg-blue-900\/50\">Suspend/g, 'text-red-400 hover:text-red-300 hover:bg-red-900/50\">Suspend');

  fs.writeFileSync(file, text, 'utf8');
});
console.log('Restored error and delete button colors to red.');

