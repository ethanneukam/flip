// lib/pivot.ts

/**
 * FLIP PIVOT MANIFEST - FEB 28 LAUNCH
 * * IDENTITY: Physical Asset Oracle.
 * * CORE TENETS:
 * 1. Flip is NOT transactional.
 * 2. Flip does NOT host listings.
 * 3. Flip does NOT escrow, ship, or mediate.
 * * PILLARS:
 * - VAULT: Private inventory (The User's Net Worth).
 * - ORACLE: Global price truth (The Data).
 * - PULSE: Social intelligence (The Feed).
 */

export const PIVOT_CONFIG = {
  appName: 'Flip',
  tagline: 'Physical Asset Oracle',
  
  // Guardrails: Hard disable legacy marketplace features
  features: {
    enableMarketplace: false, // KILL SWITCH
    enableCheckout: false,
    enableShipping: false,
    enableEscrow: false,
    enableVault: true,
    enableOracle: true,
    enablePulse: true,
  },

  // Semantic mappings for UI labels
  semantics: {
    feed: 'Pulse',
    inventory: 'Vault',
    charts: 'Oracle',
    search: 'Lookup',
    seller: 'Source',
    listing: 'Asset',
  }
} as const;

export const isMarketplaceActive = () => PIVOT_CONFIG.features.enableMarketplace;
