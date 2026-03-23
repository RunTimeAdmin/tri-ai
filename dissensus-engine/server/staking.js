// ============================================================
// DISSENSUS AI — Staking System (Simulated)
// ============================================================
// Simulated staking for demonstration. Production would use
// Solana programs + on-chain stake proofs.
// Env: STAKING_ENFORCE=1 — require wallet + daily limits for debates
// ============================================================

// walletAddress -> { amount, stakedAt, debatesUsedToday, lastDebateDay }
const stakingData = {};

// Tier thresholds (in $DISS tokens — simulated amounts)
const TIERS = {
  FREE: { min: 0, debatesPerDay: 1, features: ['basic_debates'] },
  BRONZE: { min: 100000, debatesPerDay: 5, features: ['basic_debates', 'debate_history'] },
  SILVER: { min: 500000, debatesPerDay: 20, features: ['basic_debates', 'debate_history', 'custom_topics'] },
  GOLD: { min: 1000000, debatesPerDay: -1, features: ['basic_debates', 'debate_history', 'custom_topics', 'premium_models', 'api_access'] },
  WHALE: { min: 10000000, debatesPerDay: -1, features: ['all'] }
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDailyReset(walletAddress) {
  const data = stakingData[walletAddress];
  if (!data) return;
  const day = todayKey();
  if (data.lastDebateDay !== day) {
    data.debatesUsedToday = 0;
    data.lastDebateDay = day;
  }
}

function getTier(stakedAmount) {
  if (stakedAmount >= TIERS.WHALE.min) return 'WHALE';
  if (stakedAmount >= TIERS.GOLD.min) return 'GOLD';
  if (stakedAmount >= TIERS.SILVER.min) return 'SILVER';
  if (stakedAmount >= TIERS.BRONZE.min) return 'BRONZE';
  return 'FREE';
}

function getStakingInfo(walletAddress) {
  if (!walletAddress) {
    return {
      staked: 0,
      tier: 'FREE',
      tierBenefits: TIERS.FREE,
      debatesUsedToday: 0,
      debatesRemaining: TIERS.FREE.debatesPerDay
    };
  }

  const data = stakingData[walletAddress];
  if (!data) {
    return {
      staked: 0,
      tier: 'FREE',
      tierBenefits: TIERS.FREE,
      debatesUsedToday: 0,
      debatesRemaining: TIERS.FREE.debatesPerDay
    };
  }

  ensureDailyReset(walletAddress);
  const tier = getTier(data.amount);
  const limit = TIERS[tier].debatesPerDay;
  const used = data.debatesUsedToday || 0;
  const remaining = limit === -1 ? 'unlimited' : Math.max(0, limit - used);

  return {
    staked: data.amount,
    tier,
    tierBenefits: TIERS[tier],
    stakedAt: data.stakedAt,
    debatesUsedToday: used,
    debatesRemaining: remaining
  };
}

function simulateStake(walletAddress, amount) {
  const n = Number(amount);
  if (!walletAddress || !Number.isFinite(n) || n < 0) {
    throw new Error('Invalid wallet or amount');
  }
  const day = todayKey();
  const prev = stakingData[walletAddress];
  stakingData[walletAddress] = {
    amount: Math.floor(n),
    stakedAt: prev?.stakedAt || new Date().toISOString(),
    debatesUsedToday: prev?.debatesUsedToday || 0,
    lastDebateDay: prev?.lastDebateDay || day
  };
  ensureDailyReset(walletAddress);
  return getStakingInfo(walletAddress);
}

function simulateUnstake(walletAddress) {
  if (!stakingData[walletAddress]) return getStakingInfo(walletAddress);
  stakingData[walletAddress] = {
    amount: 0,
    stakedAt: null,
    debatesUsedToday: stakingData[walletAddress].debatesUsedToday || 0,
    lastDebateDay: stakingData[walletAddress].lastDebateDay || todayKey()
  };
  ensureDailyReset(walletAddress);
  return getStakingInfo(walletAddress);
}

function canDebate(walletAddress) {
  const info = getStakingInfo(walletAddress);
  if (info.tierBenefits.debatesPerDay === -1) {
    return { allowed: true, remaining: 'unlimited' };
  }
  const rem = info.debatesRemaining;
  if (rem === 'unlimited') return { allowed: true, remaining: 'unlimited' };
  if (typeof rem === 'number' && rem > 0) {
    return { allowed: true, remaining: rem };
  }
  return {
    allowed: false,
    remaining: 0,
    reason: 'Daily debate limit reached. Stake more $DISS (simulated) to unlock more debates!'
  };
}

function recordDebateUsage(walletAddress) {
  if (!walletAddress) return;
  const day = todayKey();
  if (!stakingData[walletAddress]) {
    stakingData[walletAddress] = { amount: 0, stakedAt: null, debatesUsedToday: 0, lastDebateDay: day };
  }
  ensureDailyReset(walletAddress);
  stakingData[walletAddress].debatesUsedToday = (stakingData[walletAddress].debatesUsedToday || 0) + 1;
  stakingData[walletAddress].lastDebateDay = day;
}

function getAllTiers() {
  return Object.entries(TIERS).map(([name, config]) => ({
    name,
    minStake: config.min,
    debatesPerDay: config.debatesPerDay === -1 ? 'Unlimited' : config.debatesPerDay,
    features: config.features
  }));
}

function normalizeWallet(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  // Solana pubkeys are typically 32–44 chars base58
  if (s.length < 32 || s.length > 48) return '';
  return s;
}

/** Aggregate simulated staking for metrics dashboard */
function getStakingAggregateMetrics() {
  const tierDistribution = { FREE: 0, BRONZE: 0, SILVER: 0, GOLD: 0, WHALE: 0 };
  let totalStaked = 0;
  let activeStakers = 0;
  for (const data of Object.values(stakingData)) {
    const amt = Number(data.amount) || 0;
    totalStaked += amt;
    if (amt > 0) activeStakers++;
    const tier = getTier(amt);
    if (tierDistribution[tier] !== undefined) tierDistribution[tier]++;
  }
  return { totalStaked, activeStakers, tierDistribution };
}

module.exports = {
  TIERS,
  getTier,
  getStakingInfo,
  simulateStake,
  simulateUnstake,
  canDebate,
  recordDebateUsage,
  getAllTiers,
  normalizeWallet,
  getStakingAggregateMetrics
};
