const tauriInvoke = window.__TAURI__ && window.__TAURI__.tauri
  ? window.__TAURI__.tauri.invoke
  : async () => {};

const defaultState = {
  cash: 10000,
  monthsElapsed: 1,
  speed: 1,
  assets: [
    { id: 'sp500', name: 'ETF S&P 500 Global', category: 'stocks', cost: 1000, owned: 0, annualYield: 0.085 },
    { id: 'bonds', name: 'Letras del Tesoro / Bonos', category: 'stocks', cost: 500, owned: 0, annualYield: 0.038 },
    { id: 'div_stocks', name: 'Cartera Dividendos Aristócratas', category: 'stocks', cost: 2500, owned: 0, annualYield: 0.062 },
    { id: 'garage', name: 'Plaza de Garaje en Alquiler', category: 'realty', cost: 12000, owned: 0, annualYield: 0.072 },
    { id: 'flat', name: 'Apartamento Urbano', category: 'realty', cost: 85000, owned: 0, annualYield: 0.095 },
    { id: 'commercial', name: 'Local Comercial Logístico', category: 'realty', cost: 220000, owned: 0, annualYield: 0.115 }
  ]
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem('patrimonio_overlay_state_v1');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem('patrimonio_overlay_state_v1', JSON.stringify(state));
  } catch (e) {}
}

function formatEUR(num) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: num < 1000 ? 2 : 0
  }).format(num);
}

function getPortfolioMetrics() {
  let stocksVal = 0;
  let realtyVal = 0;
  let annualPassive = 0;

  state.assets.forEach(a => {
    const totalVal = a.cost * a.owned;
    if (a.category === 'stocks') stocksVal += totalVal;
    else realtyVal += totalVal;
    annualPassive += totalVal * a.annualYield;
  });

  const invested = stocksVal + realtyVal;
  const netWorth = state.cash + invested;
  const monthlyPassive = annualPassive / 12;
  const avgYield = invested > 0 ? (annualPassive / invested) * 100 : 0;

  return { stocksVal, realtyVal, invested, netWorth, monthlyPassive, avgYield };
}

function updateUI() {
  const m = getPortfolioMetrics();

  document.getElementById('net-worth-val').textContent = new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(m.netWorth);

  document.getElementById('cash-val').textContent = formatEUR(state.cash);
  document.getElementById('invested-val').textContent = formatEUR(m.invested);
  document.getElementById('passive-val').textContent = '+' + formatEUR(m.monthlyPassive);
  document.getElementById('yield-apr').textContent = `ROI Cartera: ${m.avgYield.toFixed(1)}%`;

  const year = Math.floor((state.monthsElapsed - 1) / 12) + 1;
  const month = ((state.monthsElapsed - 1) % 12) + 1;
  document.getElementById('date-display').textContent = `Año ${year} · Mes ${month}`;

  document.getElementById('compact-nw').textContent = formatEUR(m.netWorth);
  document.getElementById('compact-flow').textContent = `+${formatEUR(m.monthlyPassive)}/mes`;

  const total = Math.max(1, m.netWorth);
  document.getElementById('bar-cash').style.width = `${(state.cash / total) * 100}%`;
  document.getElementById('bar-stocks').style.width = `${(m.stocksVal / total) * 100}%`;
  document.getElementById('bar-realty').style.width = `${(m.realtyVal / total) * 100}%`;

  renderAssetsList();
}

function renderAssetsList() {
  const container = document.getElementById('tab-market');
  container.innerHTML = '';

  state.assets.forEach((asset, idx) => {
    const monthlyUnit = (asset.cost * asset.annualYield) / 12;
    const totalVal = asset.cost * asset.owned;
    const canAfford = state.cash >= asset.cost;

    const card = document.createElement('div');
    card.className = 'asset-card';
    card.innerHTML = `
      <div class="asset-info">
        <h4>
          ${asset.category === 'stocks' ? '📈' : '🏢'} ${asset.name}
          <span class="badge">x${asset.owned}</span>
        </h4>
        <div class="asset-sub">
          Valor: <b>${formatEUR(totalVal)}</b> · Renta: <span class="text-green">+${formatEUR(monthlyUnit)}/mes</span> (${(asset.annualYield * 100).toFixed(1)}%)
        </div>
      </div>
      <div style="display:flex; gap:5px; align-items:center;">
        ${asset.owned > 0 ? `<button class="icon-btn" data-sell="${idx}" title="Vender 1 unidad">Vender</button>` : ''}
        <button class="buy-btn" data-buy="${idx}" ${!canAfford ? 'disabled' : ''}>
          Comprar<br/>${formatEUR(asset.cost)}
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-buy'), 10);
      const a = state.assets[i];
      if (state.cash >= a.cost) {
        state.cash -= a.cost;
        a.owned += 1;
        a.cost = Math.round(a.cost * 1.02);
        saveState();
        updateUI();
      }
    });
  });

  container.querySelectorAll('[data-sell]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-sell'), 10);
      const a = state.assets[i];
      if (a.owned > 0) {
        a.owned -= 1;
        state.cash += a.cost;
        saveState();
        updateUI();
      }
    });
  });
}

let tickAccumulator = 0;
setInterval(() => {
  if (state.speed <= 0) return;
  const m = getPortfolioMetrics();
  const monthFraction = (0.1 / 10) * state.speed;
  state.cash += m.monthlyPassive * monthFraction;
  tickAccumulator += monthFraction;

  if (tickAccumulator >= 1) {
    state.monthsElapsed += Math.floor(tickAccumulator);
    tickAccumulator = tickAccumulator % 1;
    saveState();
  }
  updateUI();
}, 100);

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-tab');
    document.getElementById('tab-market').style.display = target === 'market' ? 'flex' : 'none';
    document.getElementById('tab-custom').style.display = target === 'custom' ? 'flex' : 'none';
  });
});

document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.speed = parseFloat(btn.getAttribute('data-speed'));
    saveState();
  });
});

document.getElementById('btn-add-cash').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('manual-amount').value);
  if (!isNaN(val) && val > 0) {
    state.cash += val;
    document.getElementById('manual-amount').value = '';
    saveState();
    updateUI();
  }
});

document.getElementById('btn-sub-cash').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('manual-amount').value);
  if (!isNaN(val) && val > 0) {
    state.cash = Math.max(0, state.cash - val);
    document.getElementById('manual-amount').value = '';
    saveState();
    updateUI();
  }
});

document.getElementById('btn-create-asset').addEventListener('click', () => {
  const name = document.getElementById('custom-name').value.trim();
  const category = document.getElementById('custom-type').value;
  const cost = parseFloat(document.getElementById('custom-value').value);
  const yieldPct = parseFloat(document.getElementById('custom-yield').value);

  if (name && !isNaN(cost) && cost > 0 && !isNaN(yieldPct)) {
    state.assets.unshift({
      id: 'custom_' + Date.now(),
      name,
      category,
      cost,
      owned: 1,
      annualYield: yieldPct / 100
    });
    document.getElementById('custom-name').value = '';
    document.getElementById('custom-value').value = '';
    document.getElementById('custom-yield').value = '';
    saveState();
    updateUI();
  }
});

document.getElementById('btn-work').addEventListener('click', () => {
  state.cash += 250;
  saveState();
  updateUI();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  state = JSON.parse(JSON.stringify(defaultState));
  saveState();
  updateUI();
});

document.getElementById('btn-compact').addEventListener('click', () => {
  document.body.classList.add('is-compact');
  tauriInvoke('resize_overlay', { width: 340, height: 64 });
});

document.getElementById('btn-expand').addEventListener('click', () => {
  document.body.classList.remove('is-compact');
  tauriInvoke('resize_overlay', { width: 410, height: 630 });
});

document.getElementById('btn-ghost').addEventListener('click', () => {
  const btn = document.getElementById('btn-ghost');
  btn.textContent = '👻 Activo...';
  document.querySelector('.overlay-shell').style.opacity = '0.45';
  tauriInvoke('set_click_through', { ignore: true });

  setTimeout(() => {
    tauriInvoke('set_click_through', { ignore: false });
    document.querySelector('.overlay-shell').style.opacity = '1';
    btn.textContent = '👻 6s';
  }, 6000);
});

document.getElementById('btn-close').addEventListener('click', () => {
  tauriInvoke('close_overlay');
});

updateUI();
