// ============================================================
// DISSENSUS — Server-side $DISS SPL balance (read-only)
// ============================================================
// Uses SOLANA_RPC_URL + DISS_TOKEN_MINT from env.
// ============================================================

const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getMint, getAccount, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { normalizeWallet } = require('./staking');

const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
const DEFAULT_MINT = 'G1Nb4BSnyQd7vxzicxmnj1DgxitH2BTP7QJ3FJXF';

function getRpcUrl() {
  return (process.env.SOLANA_RPC_URL || DEFAULT_RPC).trim();
}

function getDissMintString() {
  return (process.env.DISS_TOKEN_MINT || DEFAULT_MINT).trim();
}

/**
 * Fetch $DISS (or configured mint) token balance for a wallet owner.
 * @returns {Promise<{ uiAmount: number, raw: string, decimals: number, mint: string, ata: string }>}
 */
async function fetchDissBalance(walletAddress) {
  const w = normalizeWallet(walletAddress);
  if (!w) {
    const err = new Error('Invalid wallet address');
    err.code = 'INVALID_WALLET';
    throw err;
  }

  const mintStr = getDissMintString();
  let mintPk;
  let ownerPk;
  try {
    mintPk = new PublicKey(mintStr);
    ownerPk = new PublicKey(w);
  } catch (e) {
    const err = new Error('Invalid mint or wallet public key');
    err.code = 'INVALID_KEY';
    throw err;
  }

  const connection = new Connection(getRpcUrl(), 'confirmed');
  const mintInfo = await getMint(connection, mintPk);
  const decimals = mintInfo.decimals;

  const ata = await getAssociatedTokenAddress(mintPk, ownerPk, false, TOKEN_PROGRAM_ID);

  try {
    const acc = await getAccount(connection, ata);
    const uiAmount = Number(acc.amount) / 10 ** decimals;
    return {
      uiAmount,
      raw: acc.amount.toString(),
      decimals,
      mint: mintStr,
      ata: ata.toBase58()
    };
  } catch (e) {
    const msg = (e && e.message) || String(e);
    if (/could not find|Invalid account data|Account does not exist/i.test(msg)) {
      return {
        uiAmount: 0,
        raw: '0',
        decimals,
        mint: mintStr,
        ata: ata.toBase58(),
        note: 'No token account (ATA) yet — fund or receive $DISS first.'
      };
    }
    throw e;
  }
}

module.exports = {
  fetchDissBalance,
  getRpcUrl,
  getDissMintString
};
