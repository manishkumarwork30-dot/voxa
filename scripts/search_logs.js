import fs from 'fs';

const transcriptPath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\b6e07290-f681-4331-824e-98f58bc861cf\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(transcriptPath)) {
  const fileContent = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = fileContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'run_command') {
            console.log(`Step ${obj.step_index}: run_command: ${tc.arguments?.CommandLine || tc.args?.CommandLine}`);
          }
        }
      }
    } catch(e) {}
  }
} else {
  console.log("Log path not found:", transcriptPath);
}
