// 3. ELITE JS UPGRADE: Auto-Update + Sexy Console + Error Solutions
(function() {
  'use strict';

  // 🔥 ELITE CONSOLE SYSTEM
  const consoleOutput = document.getElementById('consoleOutput');
  function log(type, msg, solution = null) {
    const time = new Date().toLocaleTimeString();
    const className = type.toLowerCase();
    const entry = document.createElement('div');
    entry.className = `log-${className}`;
    entry.innerHTML = `<span class="timestamp">[${time}]</span> ${escapeHtml(msg)}${solution ? `<div class="solution">💡 <strong>FIX:</strong> ${escapeHtml(solution)}</div>` : ''}`;
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    console[type.toLowerCase()](msg); // Native console too
  }

  document.getElementById('clearConsole').onclick = () => consoleOutput.innerHTML = '';

  // Auto-save input
  const input = document.getElementById('input');
  input.value = localStorage.getItem('pricingInput') || '';
  input.addEventListener('input', () => localStorage.setItem('pricingInput', input.value));

  // 🔥 FILE DROP
  const fileDrop = document.querySelector('.file-drop');
  ['dragover', 'dragenter'].forEach(e => fileDrop.addEventListener(e, e => e.preventDefault()));
  fileDrop.addEventListener('drop', async e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'));
    for (let file of files) {
      const data = await file.text();
      localStorage.setItem(file.name, data); // Cache
      log('success', `📁 Loaded ${file.name}`);
    }
    runCalculator();
  });

  // 🔥 DEBOUNCED LIVE UPDATE (per request: configurable)
  let autoUpdate = false;
  input.addEventListener('input', debounce(() => {
    if (autoUpdate) runCalculator();
    updateSummary('⏳ Live mode active...');
  }, 800));

  // Toggle auto-update
  document.getElementById('calculateBtn').onclick = () => { autoUpdate = !autoUpdate; runCalculator(); };

  // ... [Keep your existing loadData, parseVariant, etc. functions unchanged]

  // 🔥 UPGRADED runCalculator with Console Integration
  async function runCalculator() {
    try {
      log('info', '🚀 Starting calculation...');
      await loadData(); // Now checks localStorage first

      const lines = input.value.split('\n').filter(l => l.trim());
      document.getElementById('rowCount').textContent = lines.length;
      
      let results = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        try {
          const parsed = parseVariant(line);
          const grade = getGrade(parsed.code);
          const price = getFinalPrice(parsed.model, parsed.config, grade);
          results.push({...parsed, grade, price, lineNum: i+1});
          if (i % 10 === 0) log('info', `✅ Parsed ${i+1}/${lines.length}`);
        } catch (e) {
          log('error', `Line ${i+1}: ${e.message}`, getSolution(e.message, line));
          results.push({raw: line, error: e.message, lineNum: i+1});
        }
      }

      // Rest of your logic...
      displayResults(results);
      const odooPlan = generateOdooPricing(results.filter(r => !r.error));
      displayOdooPricing(odooPlan);
      
      document.getElementById('exportBtn').disabled = false;
      log('success', `🎉 Complete! ${results.length} rows, ${odooPlan ? 0 : 'No valid base'}`);
      
    } catch (err) {
      log('error', `FATAL: ${err.message}`, 'Check JSON files & refresh');
    }
  }

  // 🔥 SMART SOLUTIONS (AI-free, rule-based)
  function getSolution(error, line) {
    if (error.includes('Invalid Code')) {
      const code = extractCode(line.match(/\((\w+)/)?.[1] || '');
      return `Add "${code}": {"grade": "A"} to material_master.json`;
    }
    if (error.includes('Price not found')) {
      return `Add row to price_sheet.json: model="${line.split('-')[0]}", config="${line.split(',')[1]}", grade="A", price=0`;
    }
    if (error.includes('Invalid format')) return 'Format: PREFIX(Model)(FABRIC,CONFIG) or FABRIC+CONFIG';
    return 'Check parsing regex or JSON structure';
  }

  document.getElementById('exportBtn').onclick = () => {
    const csv = 'Model,Code,Config,Extra\n' + results.map(r => 
      [r.model, r.code, r.config, r.extra || 0].map(escapeCsv).join(',')
    ).join('\n');
    download('odoo_pricing.csv', csv);
    log('success', '📤 CSV exported!');
  };

  function escapeCsv(val) { return `"${String(val).replace(/"/g, '""')}"`; }
  function download(name, content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type: 'text/csv'}));
    a.download = name; a.click();
  }

  // Initial load
  if (input.value.trim()) runCalculator();
})();
