/* ══════════════════════════════════════════
   CALCX — Horizon TechX Calculator
   Sandeep Kumar Bhardwaj
   ══════════════════════════════════════════ */

'use strict';

// ── DOM refs
const resultEl    = document.getElementById('result');
const exprEl      = document.getElementById('expression');
const memIndicator= document.getElementById('mem-indicator');
const modeLabel   = document.getElementById('mode-label');
const histPanel   = document.getElementById('historyPanel');
const histList    = document.getElementById('historyList');
const histToggle  = document.getElementById('histToggle');
const clearHistBtn= document.getElementById('clearHist');
const sciRow      = document.getElementById('sciRow');
const modeTabs    = document.querySelectorAll('.mode-tab');
const keypad      = document.querySelector('.keypad');

// ── State
let current   = '0';
let prev      = '';
let operator  = null;
let freshResult = false;  // next digit replaces display
let memory    = 0;
let history   = [];
let waitingForOperand = false;
let lastExpr  = '';

// ── Render
function render() {
  resultEl.textContent = formatNumber(current);
  resultEl.classList.toggle('small', current.length > 10);
  exprEl.textContent = lastExpr;
  memIndicator.classList.toggle('hidden', memory === 0);
}

function formatNumber(val) {
  if (val === 'Error' || val === 'Infinity' || val === '-Infinity') return val;
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  // Keep as string if it's still being typed (ends with . or -0)
  if (String(val).endsWith('.') || String(val) === '-0') return val;
  // Scientific notation for very large/small numbers
  if (Math.abs(n) > 1e12 || (Math.abs(n) < 1e-7 && n !== 0)) {
    return n.toExponential(6);
  }
  // Trim float rounding noise
  const trimmed = parseFloat(n.toPrecision(12));
  return String(trimmed);
}

// ── Input digit / decimal
function inputDigit(d) {
  if (freshResult) {
    current = d === '.' ? '0.' : d;
    freshResult = false;
    waitingForOperand = false;
  } else if (waitingForOperand) {
    current = d === '.' ? '0.' : d;
    waitingForOperand = false;
  } else {
    if (d === '.' && current.includes('.')) return;
    if (current === '0' && d !== '.') {
      current = d;
    } else {
      if (current.replace('-','').length >= 15) return; // cap
      current = current + d;
    }
  }
  render();
}

// ── Operator
function setOperator(op) {
  // If pending operator and new input arrived, chain calculation
  if (operator && !waitingForOperand && !freshResult) {
    calculate();
  }

  prev = current;
  operator = op;
  waitingForOperand = true;
  freshResult = false;
  lastExpr = `${formatNumber(prev)} ${opSymbol(op)}`;
  render();
}

function opSymbol(op) {
  return { '+':'+', '-':'−', '*':'×', '/':'÷' }[op] || op;
}

// ── Calculate
function calculate() {
  if (!operator || (!waitingForOperand && !freshResult && prev === '')) return;

  const a = parseFloat(prev);
  const b = parseFloat(current);
  let result;

  if (operator === '/' && b === 0) {
    showError();
    return;
  }

  switch (operator) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/': result = a / b; break;
    default:  return;
  }

  const expr = `${formatNumber(prev)} ${opSymbol(operator)} ${formatNumber(current)} =`;
  addHistory(expr, result);
  lastExpr = expr;

  current = String(parseFloat(result.toPrecision(12)));
  operator = null;
  prev = '';
  freshResult = true;
  waitingForOperand = false;
  highlightActiveOp(null);
  render();
}

// ── History
function addHistory(expr, result) {
  history.unshift({ expr, result });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  histList.innerHTML = '';
  history.forEach((h, i) => {
    const li = document.createElement('li');
    li.innerHTML = `${h.expr} <span>${formatNumber(String(h.result))}</span>`;
    li.addEventListener('click', () => {
      current = String(h.result);
      freshResult = true;
      lastExpr = '';
      render();
    });
    histList.appendChild(li);
  });
}

// ── Utilities
function clearAll() {
  current = '0';
  prev = '';
  operator = null;
  freshResult = false;
  waitingForOperand = false;
  lastExpr = '';
  highlightActiveOp(null);
  render();
}

function toggleSign() {
  if (current === '0') return;
  current = String(parseFloat(current) * -1);
  render();
}

function percent() {
  current = String(parseFloat(current) / 100);
  render();
}

// ── Scientific functions
function applySci(action) {
  const n = parseFloat(current);
  let result;
  const deg = n * (Math.PI / 180);
  switch(action) {
    case 'sin':   result = Math.sin(deg); break;
    case 'cos':   result = Math.cos(deg); break;
    case 'tan':   result = Math.tan(deg); break;
    case 'log':   result = n <= 0 ? NaN : Math.log10(n); break;
    case 'ln':    result = n <= 0 ? NaN : Math.log(n); break;
    case 'sqrt':  result = n < 0  ? NaN : Math.sqrt(n); break;
    case 'square':result = Math.pow(n, 2); break;
    case 'cube':  result = Math.pow(n, 3); break;
    case 'pi':    current = String(Math.PI); freshResult = true; render(); return;
    case 'e':     current = String(Math.E);  freshResult = true; render(); return;
    default: return;
  }
  if (isNaN(result) || !isFinite(result)) { showError(); return; }
  const label = `${action}(${formatNumber(current)}) =`;
  addHistory(label, result);
  lastExpr = label;
  current = String(parseFloat(result.toPrecision(12)));
  freshResult = true;
  render();
}

// ── Memory
function memAction(action) {
  const n = parseFloat(current);
  switch(action) {
    case 'MC': memory = 0; break;
    case 'MR': current = String(memory); freshResult = true; render(); return;
    case 'M+': memory += n; break;
    case 'M-': memory -= n; break;
    case 'MS': memory = n; break;
  }
  render();
}

// ── Error
function showError() {
  current = 'Error';
  operator = null;
  prev = '';
  freshResult = true;
  render();
  resultEl.classList.add('shake');
  setTimeout(() => resultEl.classList.remove('shake'), 400);
}

// ── Operator highlight
function highlightActiveOp(op) {
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active'));
  if (op) {
    document.querySelectorAll('.btn-op').forEach(b => {
      if (b.dataset.action === op) b.classList.add('active');
    });
  }
}

// ── Ripple effect
function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const r = document.createElement('span');
  r.classList.add('ripple');
  const size = Math.max(rect.width, rect.height);
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 450);
}

// ── Button handler
function handleAction(action, btn, e) {
  if (e) addRipple(btn || e.currentTarget, e);

  // Digits & decimal
  if (/^[0-9]$/.test(action) || action === '.') {
    inputDigit(action);
    return;
  }

  switch(action) {
    case 'AC':      clearAll(); break;
    case 'sign':    toggleSign(); break;
    case 'percent': percent(); break;
    case '+': case '-': case '*': case '/':
      setOperator(action);
      highlightActiveOp(action);
      break;
    case '=':
      calculate();
      break;
    // Memory
    case 'MC': case 'MR': case 'M+': case 'M-': case 'MS':
      memAction(action);
      break;
    // Scientific
    default:
      applySci(action);
  }
}

// ── Event delegation on all buttons
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', e => {
    handleAction(btn.dataset.action, btn, e);
  });
});

// ── Mode tabs
modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.dataset.mode;
    sciRow.classList.toggle('hidden', mode !== 'scientific');
    modeLabel.textContent = mode.toUpperCase();
  });
});

// ── History toggle
histToggle.addEventListener('click', () => {
  histPanel.classList.toggle('hidden');
  renderHistory();
});
clearHistBtn.addEventListener('click', () => {
  history = [];
  histList.innerHTML = '';
});

// ── Keyboard support
const keyMap = {
  '0':'0','1':'1','2':'2','3':'3','4':'4',
  '5':'5','6':'6','7':'7','8':'8','9':'9',
  '.':'.', ',':'.',
  '+':'+', '-':'-', '*':'*', '/':'/',
  'Enter':'=', '=':'=',
  'Backspace': '__backspace',
  'Escape': 'AC', 'Delete': 'AC',
  '%':'percent',
};

document.addEventListener('keydown', e => {
  const mapped = keyMap[e.key];
  if (!mapped) return;
  e.preventDefault();

  if (mapped === '__backspace') {
    // Backspace: delete last char
    if (freshResult || current === 'Error') { clearAll(); return; }
    current = current.length > 1 ? current.slice(0,-1) : '0';
    if (current === '-') current = '0';
    render();
    return;
  }

  // Flash the visual button
  const btn = document.querySelector(`.btn[data-action="${mapped}"]`);
  if (btn) {
    btn.style.filter = 'brightness(1.4)';
    setTimeout(() => btn.style.filter = '', 120);
  }
  handleAction(mapped, btn, null);
});

// ── Init
render();