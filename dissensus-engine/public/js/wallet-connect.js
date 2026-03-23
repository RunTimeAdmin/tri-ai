// ============================================================
// DISSENSUS — Solana wallet (Phantom / Solflare) + $DISS balance
// ============================================================
// Balance is verified server-side via /api/solana/token-balance
// ============================================================

(function () {
  const STORAGE_KEY = 'dissensus_wallet';
  const PHANTOM = 'https://phantom.app/';
  let connectedPubkey = null;
  let provider = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getProvider() {
    if (window.solana && window.solana.isPhantom) return window.solana;
    if (window.solflare && (window.solflare.isSolflare || typeof window.solflare.connect === 'function')) {
      return window.solflare;
    }
    return null;
  }

  function shortAddr(s) {
    if (!s || s.length < 12) return s || '';
    return s.slice(0, 4) + '…' + s.slice(-4);
  }

  function updateHeaderUI() {
    const btnC = $('btnConnectWallet');
    const btnD = $('btnDisconnectWallet');
    const addrEl = $('walletShortAddr');
    const balEl = $('walletBalance');
    const wrap = $('headerWallet');

    if (!btnC || !btnD) return;

    if (connectedPubkey) {
      btnC.classList.add('hidden');
      btnD.classList.remove('hidden');
      if (addrEl) {
        addrEl.textContent = shortAddr(connectedPubkey);
        addrEl.classList.remove('hidden');
        addrEl.title = connectedPubkey;
      }
      if (wrap) wrap.classList.add('wallet-connected');
    } else {
      btnC.classList.remove('hidden');
      btnD.classList.add('hidden');
      if (addrEl) {
        addrEl.textContent = '';
        addrEl.classList.add('hidden');
      }
      if (balEl) {
        balEl.textContent = '';
        balEl.classList.add('hidden');
      }
      if (wrap) wrap.classList.remove('wallet-connected');
    }
  }

  async function fetchBalance(pubkey) {
    const balEl = $('walletBalance');
    if (!balEl || !pubkey) return;
    balEl.classList.remove('hidden');
    balEl.textContent = '… $DISS';
    try {
      const res = await fetch('/api/solana/token-balance?wallet=' + encodeURIComponent(pubkey));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.status);
      const n = typeof data.uiAmount === 'number' ? data.uiAmount : 0;
      const formatted = n >= 1 ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : n.toLocaleString(undefined, { maximumFractionDigits: 8 });
      balEl.textContent = formatted + ' $DISS';
      balEl.title = data.note || 'On-chain balance (mint ' + (data.mint || '') + ')';
    } catch (e) {
      balEl.textContent = '—';
      balEl.title = e.message || 'Balance failed';
    }
  }

  function syncStakingInput() {
    const inp = $('stakingWalletInput');
    if (inp && connectedPubkey) {
      inp.value = connectedPubkey;
      try {
        localStorage.setItem(STORAGE_KEY, connectedPubkey);
      } catch (e) { /* ignore */ }
      if (typeof window.refreshStakingStatus === 'function') {
        window.refreshStakingStatus();
      }
    }
  }

  window.dissensusConnectWallet = async function () {
    provider = getProvider();
    if (!provider) {
      window.open(PHANTOM, '_blank', 'noopener,noreferrer');
      alert('Install Phantom or Solflare, then refresh this page.');
      return;
    }
    try {
      const resp = await provider.connect();
      const pk = resp.publicKey;
      connectedPubkey = pk ? pk.toString() : null;
      if (!connectedPubkey) throw new Error('No public key returned');

      updateHeaderUI();
      await fetchBalance(connectedPubkey);
      syncStakingInput();

      provider.on('disconnect', onDisconnect);
    } catch (e) {
      alert('Wallet connect failed: ' + (e.message || e));
    }
  };

  function onDisconnect() {
    connectedPubkey = null;
    provider = null;
    updateHeaderUI();
  }

  window.dissensusDisconnectWallet = async function () {
    try {
      const p = getProvider();
      if (p && p.isConnected) await p.disconnect();
    } catch (e) { /* ignore */ }
    onDisconnect();
  };

  window.dissensusRefreshWalletBalance = async function () {
    if (connectedPubkey) await fetchBalance(connectedPubkey);
  };

  window.dissensusGetConnectedWallet = function () {
    return connectedPubkey;
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateHeaderUI();
    const p = getProvider();
    if (p && p.isConnected && p.publicKey) {
      connectedPubkey = p.publicKey.toString();
      updateHeaderUI();
      fetchBalance(connectedPubkey);
      syncStakingInput();
      try {
        p.on('disconnect', onDisconnect);
      } catch (e) { /* ignore */ }
      return;
    }
    if (p && typeof p.connect === 'function') {
      p.connect({ onlyIfTrusted: true })
        .then(function (resp) {
          const pk = resp && resp.publicKey;
          connectedPubkey = pk ? pk.toString() : null;
          updateHeaderUI();
          if (connectedPubkey) {
            fetchBalance(connectedPubkey);
            syncStakingInput();
            try {
              p.on('disconnect', onDisconnect);
            } catch (e2) { /* ignore */ }
          }
        })
        .catch(function () { /* user never approved auto-connect */ });
    }
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.length >= 32) {
      var inp = $('stakingWalletInput');
      if (inp && !inp.value) inp.value = saved;
    }
  });
})();
