// TradeWatch — Config, Asset Catalogue, Global State
// Loaded first — all other files depend on these globals

// ═══════════════════════════════════════════════
// TradeWatch — app.js
// Price Architecture (broker-only, no free APIs):
//   Crypto spot     → CoinGecko (free, no key needed)
//   Forex / Metals  → Deriv WebSocket (real-time ticks, registered App ID)
//   Commodities     → Deriv WebSocket
//   Stock Indices   → Deriv WebSocket (US500, US30, USTEC, UK100, DE40, FR40, JP225, HK33, AUS200)
//   Synth Indices   → Deriv WebSocket (24/7: Volatility, Boom, Crash, Jump)
//   Stocks CFD      → OANDA REST (plug key in when ready)
//   Fallback chain  → Deriv WS → OANDA REST → stale cache
//
// Indices NOT on Deriv/OANDA are listed in the library but
// marked unavailable until a supporting broker is added.
// ═══════════════════════════════════════════════

// ── Broker credentials ────────────────────────
const DERIV_APP_ID     = '3FgUMWdvlyFOxPW';
// SUPABASE_URL and SUPABASE_ANON_KEY are defined in db.js — do not redeclare here
const OANDA_KEY     = 'bc279adfd3ef94ce554a110a9e555d05-7e712cb0ac8809392b3f4bfca9768b8b';
const OANDA_ACCOUNT = '101-001-38834231-001';
const OANDA_BASE    = 'https://api-fxpractice.oanda.com/v3';

// ═══════════════════════════════════════════════
// ASSET DEFINITIONS — Cross-referenced from:
//   OANDA v20 practice instruments
//   Deriv active_symbols (forex, commodities, crypto CFD, indices)
//   CoinGecko (crypto spot)
//
// source priority: first in sources[] array is tried first.
// 'deriv'  = Deriv WebSocket tick subscription
// 'oanda'  = OANDA v20 /pricing/snapshot REST
// 'coingecko' = CoinGecko /coins/markets
// 'unavailable' = no broker support yet — listed but no live price
// ═══════════════════════════════════════════════

const ASSETS = {
  crypto:      [],
  forex:       [],
  commodities: [],
  indices:     [],
  stocks:      [],
  synthetics:  [],
};

// ── Master asset catalogue ────────────────────
// Every tradeable instrument across all 4 brokers, deduplicated.
// derivSym  = Deriv symbol  (e.g. 'frxEURUSD')
// oandaSym  = OANDA symbol  (e.g. 'EUR_USD')
// cgId      = CoinGecko id  (e.g. 'bitcoin')
const ALL_ASSETS = [

  // ════════════════════════════════════════════
  // CRYPTO — CoinGecko primary (spot prices)
  //          Deriv secondary  (CFD tick)
  // ════════════════════════════════════════════
  { id:'bitcoin',       symbol:'BTC',    name:'Bitcoin',           cat:'crypto', sources:['coingecko','deriv'], cgId:'bitcoin',       derivSym:'cryBTCUSD'  },
  { id:'ethereum',      symbol:'ETH',    name:'Ethereum',          cat:'crypto', sources:['coingecko','deriv'], cgId:'ethereum',      derivSym:'cryETHUSD'  },
  { id:'solana',        symbol:'SOL',    name:'Solana',            cat:'crypto', sources:['coingecko','deriv'], cgId:'solana',        derivSym:'crySOLUSD'  },
  { id:'ripple',        symbol:'XRP',    name:'XRP',               cat:'crypto', sources:['coingecko','deriv'], cgId:'ripple',        derivSym:'cryXRPUSD'  },
  { id:'binancecoin',   symbol:'BNB',    name:'BNB',               cat:'crypto', sources:['coingecko'],        cgId:'binancecoin'                          },
  { id:'dogecoin',      symbol:'DOGE',   name:'Dogecoin',          cat:'crypto', sources:['coingecko','deriv'], cgId:'dogecoin',      derivSym:'cryDOGEUSD' },
  { id:'cardano',       symbol:'ADA',    name:'Cardano',           cat:'crypto', sources:['coingecko','deriv'], cgId:'cardano',       derivSym:'cryADAUSD'  },
  { id:'avalanche-2',   symbol:'AVAX',   name:'Avalanche',         cat:'crypto', sources:['coingecko'],        cgId:'avalanche-2'                          },
  { id:'chainlink',     symbol:'LINK',   name:'Chainlink',         cat:'crypto', sources:['coingecko'],        cgId:'chainlink'                            },
  { id:'litecoin',      symbol:'LTC',    name:'Litecoin',          cat:'crypto', sources:['coingecko','deriv'], cgId:'litecoin',      derivSym:'cryLTCUSD'  },
  { id:'polkadot',      symbol:'DOT',    name:'Polkadot',          cat:'crypto', sources:['coingecko'],        cgId:'polkadot'                             },
  { id:'shiba-inu',     symbol:'SHIB',   name:'Shiba Inu',         cat:'crypto', sources:['coingecko'],        cgId:'shiba-inu'                            },
  { id:'uniswap',       symbol:'UNI',    name:'Uniswap',           cat:'crypto', sources:['coingecko'],        cgId:'uniswap'                              },
  { id:'cosmos',        symbol:'ATOM',   name:'Cosmos',            cat:'crypto', sources:['coingecko'],        cgId:'cosmos'                               },
  { id:'stellar',       symbol:'XLM',    name:'Stellar',           cat:'crypto', sources:['coingecko'],        cgId:'stellar'                              },
  { id:'monero',        symbol:'XMR',    name:'Monero',            cat:'crypto', sources:['coingecko'],        cgId:'monero'                               },
  { id:'tron',          symbol:'TRX',    name:'TRON',              cat:'crypto', sources:['coingecko'],        cgId:'tron'                                 },
  { id:'aave',          symbol:'AAVE',   name:'Aave',              cat:'crypto', sources:['coingecko'],        cgId:'aave'                                 },
  { id:'near',          symbol:'NEAR',   name:'NEAR Protocol',     cat:'crypto', sources:['coingecko'],        cgId:'near'                                 },
  { id:'aptos',         symbol:'APT',    name:'Aptos',             cat:'crypto', sources:['coingecko'],        cgId:'aptos'                                },
  { id:'arbitrum',      symbol:'ARB',    name:'Arbitrum',          cat:'crypto', sources:['coingecko'],        cgId:'arbitrum'                             },
  { id:'optimism',      symbol:'OP',     name:'Optimism',          cat:'crypto', sources:['coingecko'],        cgId:'optimism'                             },
  { id:'sui',           symbol:'SUI',    name:'Sui',               cat:'crypto', sources:['coingecko'],        cgId:'sui'                                  },
  { id:'toncoin',       symbol:'TON',    name:'Toncoin',           cat:'crypto', sources:['coingecko'],        cgId:'toncoin'                              },
  { id:'pepe',          symbol:'PEPE',   name:'Pepe',              cat:'crypto', sources:['coingecko'],        cgId:'pepe'                                 },
  { id:'bonk',          symbol:'BONK',   name:'Bonk',              cat:'crypto', sources:['coingecko'],        cgId:'bonk'                                 },
  { id:'maker',         symbol:'MKR',    name:'MakerDAO',          cat:'crypto', sources:['coingecko'],        cgId:'maker'                                },
  { id:'kaspa',         symbol:'KAS',    name:'Kaspa',             cat:'crypto', sources:['coingecko'],        cgId:'kaspa'                                },
  { id:'render-token',  symbol:'RENDER', name:'Render',            cat:'crypto', sources:['coingecko'],        cgId:'render-token'                         },
  { id:'fetch-ai',      symbol:'FET',    name:'Fetch.AI',          cat:'crypto', sources:['coingecko'],        cgId:'fetch-ai'                             },
  { id:'worldcoin-wld', symbol:'WLD',    name:'Worldcoin',         cat:'crypto', sources:['coingecko'],        cgId:'worldcoin-wld'                        },
  { id:'celestia',      symbol:'TIA',    name:'Celestia',          cat:'crypto', sources:['coingecko'],        cgId:'celestia'                             },
  { id:'starknet',      symbol:'STRK',   name:'Starknet',          cat:'crypto', sources:['coingecko'],        cgId:'starknet'                             },
  { id:'hedera',        symbol:'HBAR',   name:'Hedera',            cat:'crypto', sources:['coingecko'],        cgId:'hedera-hashgraph'                     },
  { id:'vechain',       symbol:'VET',    name:'VeChain',           cat:'crypto', sources:['coingecko'],        cgId:'vechain'                              },
  { id:'algorand',      symbol:'ALGO',   name:'Algorand',          cat:'crypto', sources:['coingecko'],        cgId:'algorand'                             },
  { id:'internet-computer', symbol:'ICP',name:'ICP',              cat:'crypto', sources:['coingecko'],        cgId:'internet-computer'                    },
  { id:'filecoin',      symbol:'FIL',    name:'Filecoin',          cat:'crypto', sources:['coingecko'],        cgId:'filecoin'                             },
  { id:'injective-protocol',symbol:'INJ',name:'Injective',        cat:'crypto', sources:['coingecko'],        cgId:'injective-protocol'                   },
  { id:'sei-network',   symbol:'SEI',    name:'Sei',               cat:'crypto', sources:['coingecko'],        cgId:'sei-network'                          },
  { id:'immutable-x',   symbol:'IMX',   name:'Immutable X',       cat:'crypto', sources:['coingecko'],        cgId:'immutable-x'                          },
  { id:'polygon',       symbol:'MATIC',  name:'Polygon',           cat:'crypto', sources:['coingecko'],        cgId:'matic-network'                        },

  // ════════════════════════════════════════════
  // FOREX — Deriv primary + OANDA secondary
  // Available on: OANDA ✓  Deriv ✓  FXCM ✓  IG ✓
  // ════════════════════════════════════════════

  // ── Major Pairs ──────────────────────────────
  { id:'EUR/USD', symbol:'EUR/USD', name:'Euro / US Dollar',             cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURUSD', oandaSym:'EUR_USD' },
  { id:'GBP/USD', symbol:'GBP/USD', name:'British Pound / US Dollar',   cat:'forex', sources:['deriv','oanda'], derivSym:'frxGBPUSD', oandaSym:'GBP_USD' },
  { id:'USD/JPY', symbol:'USD/JPY', name:'US Dollar / Japanese Yen',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDJPY', oandaSym:'USD_JPY' },
  { id:'AUD/USD', symbol:'AUD/USD', name:'Australian Dollar / USD',     cat:'forex', sources:['deriv','oanda'], derivSym:'frxAUDUSD', oandaSym:'AUD_USD' },
  { id:'USD/CAD', symbol:'USD/CAD', name:'US Dollar / Canadian Dollar', cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDCAD', oandaSym:'USD_CAD' },
  { id:'USD/CHF', symbol:'USD/CHF', name:'US Dollar / Swiss Franc',     cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDCHF', oandaSym:'USD_CHF' },
  { id:'NZD/USD', symbol:'NZD/USD', name:'New Zealand Dollar / USD',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxNZDUSD', oandaSym:'NZD_USD' },

  // ── Euro Crosses ──────────────────────────────
  { id:'EUR/GBP', symbol:'EUR/GBP', name:'Euro / British Pound',         cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURGBP', oandaSym:'EUR_GBP' },
  { id:'EUR/JPY', symbol:'EUR/JPY', name:'Euro / Japanese Yen',          cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURJPY', oandaSym:'EUR_JPY' },
  { id:'EUR/CHF', symbol:'EUR/CHF', name:'Euro / Swiss Franc',           cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURCHF', oandaSym:'EUR_CHF' },
  { id:'EUR/CAD', symbol:'EUR/CAD', name:'Euro / Canadian Dollar',       cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURCAD', oandaSym:'EUR_CAD' },
  { id:'EUR/AUD', symbol:'EUR/AUD', name:'Euro / Australian Dollar',     cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURAUD', oandaSym:'EUR_AUD' },
  { id:'EUR/NZD', symbol:'EUR/NZD', name:'Euro / New Zealand Dollar',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxEURNZD', oandaSym:'EUR_NZD' },
  { id:'EUR/SEK', symbol:'EUR/SEK', name:'Euro / Swedish Krona',         cat:'forex', sources:['oanda'],                              oandaSym:'EUR_SEK' },
  { id:'EUR/NOK', symbol:'EUR/NOK', name:'Euro / Norwegian Krone',       cat:'forex', sources:['oanda'],                              oandaSym:'EUR_NOK' },
  { id:'EUR/DKK', symbol:'EUR/DKK', name:'Euro / Danish Krone',          cat:'forex', sources:['oanda'],                              oandaSym:'EUR_DKK' },
  { id:'EUR/PLN', symbol:'EUR/PLN', name:'Euro / Polish Zloty',          cat:'forex', sources:['oanda'],                              oandaSym:'EUR_PLN' },
  { id:'EUR/HUF', symbol:'EUR/HUF', name:'Euro / Hungarian Forint',      cat:'forex', sources:['oanda'],                              oandaSym:'EUR_HUF' },
  { id:'EUR/CZK', symbol:'EUR/CZK', name:'Euro / Czech Koruna',          cat:'forex', sources:['oanda'],                              oandaSym:'EUR_CZK' },
  { id:'EUR/SGD', symbol:'EUR/SGD', name:'Euro / Singapore Dollar',      cat:'forex', sources:['oanda'],                              oandaSym:'EUR_SGD' },
  { id:'EUR/HKD', symbol:'EUR/HKD', name:'Euro / Hong Kong Dollar',      cat:'forex', sources:['oanda'],                              oandaSym:'EUR_HKD' },
  { id:'EUR/TRY', symbol:'EUR/TRY', name:'Euro / Turkish Lira',          cat:'forex', sources:['oanda'],                              oandaSym:'EUR_TRY' },
  { id:'EUR/ZAR', symbol:'EUR/ZAR', name:'Euro / South African Rand',    cat:'forex', sources:['oanda'],                              oandaSym:'EUR_ZAR' },

  // ── GBP Crosses ──────────────────────────────
  { id:'GBP/JPY', symbol:'GBP/JPY', name:'British Pound / Japanese Yen',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxGBPJPY', oandaSym:'GBP_JPY' },
  { id:'GBP/CHF', symbol:'GBP/CHF', name:'British Pound / Swiss Franc',     cat:'forex', sources:['deriv','oanda'], derivSym:'frxGBPCHF', oandaSym:'GBP_CHF' },
  { id:'GBP/CAD', symbol:'GBP/CAD', name:'British Pound / Canadian Dollar', cat:'forex', sources:['deriv','oanda'], derivSym:'frxGBPCAD', oandaSym:'GBP_CAD' },
  { id:'GBP/AUD', symbol:'GBP/AUD', name:'British Pound / Australian Dollar',cat:'forex', sources:['deriv','oanda'], derivSym:'frxGBPAUD', oandaSym:'GBP_AUD' },
  { id:'GBP/NZD', symbol:'GBP/NZD', name:'British Pound / New Zealand Dollar',cat:'forex', sources:['deriv','oanda'], derivSym:'frxGBPNZD', oandaSym:'GBP_NZD' },
  { id:'GBP/SGD', symbol:'GBP/SGD', name:'British Pound / Singapore Dollar', cat:'forex', sources:['oanda'],                               oandaSym:'GBP_SGD' },

  // ── AUD Crosses ──────────────────────────────
  { id:'AUD/JPY', symbol:'AUD/JPY', name:'Australian Dollar / Japanese Yen',   cat:'forex', sources:['deriv','oanda'], derivSym:'frxAUDJPY', oandaSym:'AUD_JPY' },
  { id:'AUD/CAD', symbol:'AUD/CAD', name:'Australian Dollar / Canadian Dollar', cat:'forex', sources:['deriv','oanda'], derivSym:'frxAUDCAD', oandaSym:'AUD_CAD' },
  { id:'AUD/CHF', symbol:'AUD/CHF', name:'Australian Dollar / Swiss Franc',     cat:'forex', sources:['deriv','oanda'], derivSym:'frxAUDCHF', oandaSym:'AUD_CHF' },
  { id:'AUD/NZD', symbol:'AUD/NZD', name:'Australian Dollar / New Zealand Dollar', cat:'forex', sources:['deriv','oanda'], derivSym:'frxAUDNZD', oandaSym:'AUD_NZD' },
  { id:'AUD/SGD', symbol:'AUD/SGD', name:'Australian Dollar / Singapore Dollar',cat:'forex', sources:['oanda'],                              oandaSym:'AUD_SGD' },

  // ── NZD Crosses ──────────────────────────────
  { id:'NZD/JPY', symbol:'NZD/JPY', name:'New Zealand Dollar / Japanese Yen',       cat:'forex', sources:['deriv','oanda'], derivSym:'frxNZDJPY', oandaSym:'NZD_JPY' },
  { id:'NZD/CAD', symbol:'NZD/CAD', name:'New Zealand Dollar / Canadian Dollar',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxNZDCAD', oandaSym:'NZD_CAD' },
  { id:'NZD/CHF', symbol:'NZD/CHF', name:'New Zealand Dollar / Swiss Franc',        cat:'forex', sources:['deriv','oanda'], derivSym:'frxNZDCHF', oandaSym:'NZD_CHF' },
  { id:'NZD/SGD', symbol:'NZD/SGD', name:'New Zealand Dollar / Singapore Dollar',   cat:'forex', sources:['oanda'],                              oandaSym:'NZD_SGD' },

  // ── CAD Crosses ──────────────────────────────
  { id:'CAD/JPY', symbol:'CAD/JPY', name:'Canadian Dollar / Japanese Yen',  cat:'forex', sources:['deriv','oanda'], derivSym:'frxCADJPY', oandaSym:'CAD_JPY' },
  { id:'CAD/CHF', symbol:'CAD/CHF', name:'Canadian Dollar / Swiss Franc',   cat:'forex', sources:['oanda'],                              oandaSym:'CAD_CHF' },
  { id:'CAD/SGD', symbol:'CAD/SGD', name:'Canadian Dollar / Singapore Dollar', cat:'forex', sources:['oanda'],                           oandaSym:'CAD_SGD' },

  // ── CHF Crosses ──────────────────────────────
  { id:'CHF/JPY', symbol:'CHF/JPY', name:'Swiss Franc / Japanese Yen',      cat:'forex', sources:['oanda'],         oandaSym:'CHF_JPY' },
  { id:'CHF/SGD', symbol:'CHF/SGD', name:'Swiss Franc / Singapore Dollar',  cat:'forex', sources:['oanda'],         oandaSym:'CHF_SGD' },
  { id:'CHF/HKD', symbol:'CHF/HKD', name:'Swiss Franc / Hong Kong Dollar',  cat:'forex', sources:['oanda'],         oandaSym:'CHF_HKD' },

  // ── JPY Crosses ──────────────────────────────
  { id:'SGD/JPY', symbol:'SGD/JPY', name:'Singapore Dollar / Japanese Yen', cat:'forex', sources:['oanda'],         oandaSym:'SGD_JPY' },
  { id:'HKD/JPY', symbol:'HKD/JPY', name:'Hong Kong Dollar / Japanese Yen', cat:'forex', sources:['oanda'],        oandaSym:'HKD_JPY' },

  // ── USD Emerging & Exotics ────────────────────
  { id:'USD/SGD', symbol:'USD/SGD', name:'US Dollar / Singapore Dollar',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDSGD', oandaSym:'USD_SGD' },
  { id:'USD/HKD', symbol:'USD/HKD', name:'US Dollar / Hong Kong Dollar',   cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDHKD', oandaSym:'USD_HKD' },
  { id:'USD/MXN', symbol:'USD/MXN', name:'US Dollar / Mexican Peso',       cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDMXN', oandaSym:'USD_MXN' },
  { id:'USD/ZAR', symbol:'USD/ZAR', name:'US Dollar / South African Rand', cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDZAR', oandaSym:'USD_ZAR' },
  { id:'USD/TRY', symbol:'USD/TRY', name:'US Dollar / Turkish Lira',       cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDTRY', oandaSym:'USD_TRY' },
  { id:'USD/SEK', symbol:'USD/SEK', name:'US Dollar / Swedish Krona',      cat:'forex', sources:['oanda'],                              oandaSym:'USD_SEK' },
  { id:'USD/NOK', symbol:'USD/NOK', name:'US Dollar / Norwegian Krone',    cat:'forex', sources:['oanda'],                              oandaSym:'USD_NOK' },
  { id:'USD/DKK', symbol:'USD/DKK', name:'US Dollar / Danish Krone',       cat:'forex', sources:['oanda'],                              oandaSym:'USD_DKK' },
  { id:'USD/INR', symbol:'USD/INR', name:'US Dollar / Indian Rupee',       cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDINR', oandaSym:'USD_INR' },
  { id:'USD/CNH', symbol:'USD/CNH', name:'US Dollar / Offshore Chinese Yuan', cat:'forex', sources:['deriv','oanda'], derivSym:'frxUSDCNH', oandaSym:'USD_CNH' },
  { id:'USD/BRL', symbol:'USD/BRL', name:'US Dollar / Brazilian Real',     cat:'forex', sources:['oanda'],                              oandaSym:'USD_BRL' },
  { id:'USD/KRW', symbol:'USD/KRW', name:'US Dollar / South Korean Won',   cat:'forex', sources:['oanda'],                              oandaSym:'USD_KRW' },
  { id:'USD/IDR', symbol:'USD/IDR', name:'US Dollar / Indonesian Rupiah',  cat:'forex', sources:['oanda'],                              oandaSym:'USD_IDR' },
  { id:'USD/MYR', symbol:'USD/MYR', name:'US Dollar / Malaysian Ringgit',  cat:'forex', sources:['oanda'],                              oandaSym:'USD_MYR' },
  { id:'USD/PHP', symbol:'USD/PHP', name:'US Dollar / Philippine Peso',    cat:'forex', sources:['oanda'],                              oandaSym:'USD_PHP' },
  { id:'USD/THB', symbol:'USD/THB', name:'US Dollar / Thai Baht',          cat:'forex', sources:['oanda'],                              oandaSym:'USD_THB' },
  { id:'USD/PLN', symbol:'USD/PLN', name:'US Dollar / Polish Zloty',       cat:'forex', sources:['oanda'],                              oandaSym:'USD_PLN' },
  { id:'USD/HUF', symbol:'USD/HUF', name:'US Dollar / Hungarian Forint',   cat:'forex', sources:['oanda'],                              oandaSym:'USD_HUF' },
  { id:'USD/CZK', symbol:'USD/CZK', name:'US Dollar / Czech Koruna',       cat:'forex', sources:['oanda'],                              oandaSym:'USD_CZK' },
  { id:'USD/ILS', symbol:'USD/ILS', name:'US Dollar / Israeli Shekel',     cat:'forex', sources:['oanda'],                              oandaSym:'USD_ILS' },
  { id:'USD/AED', symbol:'USD/AED', name:'US Dollar / UAE Dirham',         cat:'forex', sources:['oanda'],                              oandaSym:'USD_AED' },
  { id:'USD/SAR', symbol:'USD/SAR', name:'US Dollar / Saudi Riyal',        cat:'forex', sources:['oanda'],                              oandaSym:'USD_SAR' },
  { id:'USD/NGN', symbol:'USD/NGN', name:'US Dollar / Nigerian Naira',     cat:'forex', sources:['deriv'],          derivSym:'frxUSDNGN'                   },
  { id:'USD/GHS', symbol:'USD/GHS', name:'US Dollar / Ghanaian Cedi',      cat:'forex', sources:['deriv'],          derivSym:'frxUSDGHS'                   },
  { id:'USD/KES', symbol:'USD/KES', name:'US Dollar / Kenyan Shilling',    cat:'forex', sources:['deriv'],          derivSym:'frxUSDKES'                   },
  { id:'USD/EGP', symbol:'USD/EGP', name:'US Dollar / Egyptian Pound',     cat:'forex', sources:['deriv'],          derivSym:'frxUSDEGP'                   },
  { id:'USD/PKR', symbol:'USD/PKR', name:'US Dollar / Pakistani Rupee',    cat:'forex', sources:['deriv'],          derivSym:'frxUSDPKR'                   },
  { id:'USD/BDT', symbol:'USD/BDT', name:'US Dollar / Bangladeshi Taka',   cat:'forex', sources:['deriv'],          derivSym:'frxUSDBDT'                   },
  { id:'USD/UAH', symbol:'USD/UAH', name:'US Dollar / Ukrainian Hryvnia',  cat:'forex', sources:['deriv'],          derivSym:'frxUSDUAH'                   },
  { id:'USD/VND', symbol:'USD/VND', name:'US Dollar / Vietnamese Dong',    cat:'forex', sources:['deriv'],          derivSym:'frxUSDVND'                   },
  { id:'USD/ARS', symbol:'USD/ARS', name:'US Dollar / Argentine Peso',     cat:'forex', sources:['oanda'],                              oandaSym:'USD_ARS' },
  { id:'USD/CLP', symbol:'USD/CLP', name:'US Dollar / Chilean Peso',       cat:'forex', sources:['oanda'],                              oandaSym:'USD_CLP' },
  { id:'USD/COP', symbol:'USD/COP', name:'US Dollar / Colombian Peso',     cat:'forex', sources:['oanda'],                              oandaSym:'USD_COP' },
  { id:'USD/RUB', symbol:'USD/RUB', name:'US Dollar / Russian Ruble',      cat:'forex', sources:['deriv'],          derivSym:'frxUSDRUB'                   },

  // ── XAG/XAU treated as Forex on brokers ──────
  { id:'XAU/USD', symbol:'XAU/USD', name:'Gold Spot',    cat:'forex', sources:['deriv','oanda'], derivSym:'frxXAUUSD', oandaSym:'XAU_USD' },
  { id:'XAG/USD', symbol:'XAG/USD', name:'Silver Spot',  cat:'forex', sources:['deriv','oanda'], derivSym:'frxXAGUSD', oandaSym:'XAG_USD' },
  { id:'XPD/USD', symbol:'XPD/USD', name:'Palladium Spot', cat:'forex', sources:['oanda'],       oandaSym:'XPD_USD' },
  { id:'XPT/USD', symbol:'XPT/USD', name:'Platinum Spot',  cat:'forex', sources:['oanda'],       oandaSym:'XPT_USD' },

  // ════════════════════════════════════════════
  // COMMODITIES — Deriv primary, OANDA secondary
  // ════════════════════════════════════════════
  { id:'WTI/USD',   symbol:'WTI/USD',  name:'WTI Crude Oil',        cat:'commodities', sources:['deriv','oanda'], derivSym:'WTIUSD',   oandaSym:'WTICO_USD'  },
  { id:'BRENT/USD', symbol:'BCO/USD',  name:'Brent Crude Oil',      cat:'commodities', sources:['deriv','oanda'], derivSym:'BCOUSD',   oandaSym:'BCO_USD'    },
  { id:'XNG/USD',   symbol:'XNG/USD',  name:'Natural Gas',          cat:'commodities', sources:['deriv'],         derivSym:'NATGASUSD'                       },
  { id:'COPPER',    symbol:'XCU/USD',  name:'Copper',               cat:'commodities', sources:['deriv','oanda'], derivSym:'XCUUSD',   oandaSym:'XCU_USD'    },
  { id:'WHEAT',     symbol:'WHEAT',    name:'Wheat',                cat:'commodities', sources:['deriv'],         derivSym:'WHEATUSD'                        },
  { id:'CORN',      symbol:'CORN',     name:'Corn',                 cat:'commodities', sources:['deriv'],         derivSym:'CORNUSD'                         },
  { id:'SOYBEAN',   symbol:'SOYBEAN',  name:'Soybeans',             cat:'commodities', sources:['deriv'],         derivSym:'SOYBEANUSD'                      },
  { id:'SUGAR',     symbol:'SUGAR',    name:'Sugar',                cat:'commodities', sources:['deriv'],         derivSym:'SUGARUSD'                        },
  { id:'COFFEE',    symbol:'COFFEE',   name:'Coffee',               cat:'commodities', sources:['deriv'],         derivSym:'COFFEEUSD'                       },
  { id:'COTTON',    symbol:'COTTON',   name:'Cotton',               cat:'commodities', sources:['deriv'],         derivSym:'COTTONUSD'                       },

  // ════════════════════════════════════════════
  // INDICES — Deriv WebSocket primary for major indices
  //           OANDA REST for additional CFDs
  //           'unavailable' = no broker support yet (shown in library, no live price)
  // ════════════════════════════════════════════

  // ── US Indices (Deriv covers the main 3 + DXY) ───────────────────────────
  { id:'SPX',    symbol:'S&P 500',  name:'S&P 500',              cat:'indices', sources:['deriv','oanda'], derivSym:'US500',    oandaSym:'SPX500_USD' },
  { id:'DJI',    symbol:'US30',     name:'US 30 (Wall Street)',  cat:'indices', sources:['deriv','oanda'], derivSym:'US30',     oandaSym:'US30_USD'   },
  { id:'NDX',    symbol:'NDX 100',  name:'NASDAQ 100',           cat:'indices', sources:['deriv','oanda'], derivSym:'USTEC',    oandaSym:'NAS100_USD' },
  { id:'DXY',    symbol:'DXY',      name:'US Dollar Index',      cat:'indices', sources:['deriv'],         derivSym:'DXY'                            },
  { id:'IXIC',   symbol:'NASDAQ',   name:'NASDAQ Composite',     cat:'indices', sources:['unavailable']                                              },
  { id:'RUT',    symbol:'Russell',  name:'Russell 2000',         cat:'indices', sources:['unavailable']                                              },
  { id:'VIX',    symbol:'VIX',      name:'CBOE Volatility',      cat:'indices', sources:['unavailable']                                              },
  { id:'TNX',    symbol:'US10Y',    name:'US 10-Year Treasury',  cat:'indices', sources:['unavailable']                                              },
  { id:'TYX',    symbol:'US30Y',    name:'US 30-Year Treasury',  cat:'indices', sources:['unavailable']                                              },

  // ── European Indices ──────────────────────────
  { id:'FTSE',    symbol:'FTSE 100', name:'FTSE 100 (UK)',        cat:'indices', sources:['deriv','oanda'], derivSym:'UK100',    oandaSym:'UK100_GBP' },
  { id:'DAX',     symbol:'DAX 40',   name:'DAX 40 (Germany)',     cat:'indices', sources:['deriv','oanda'], derivSym:'DE40',     oandaSym:'DE30_EUR'  },
  { id:'CAC',     symbol:'CAC 40',   name:'CAC 40 (France)',      cat:'indices', sources:['deriv','oanda'], derivSym:'FR40',     oandaSym:'FR40_EUR'  },
  { id:'IBEX',    symbol:'IBEX 35',  name:'IBEX 35 (Spain)',      cat:'indices', sources:['oanda'],                              oandaSym:'ES35_EUR'  },
  { id:'FTSEMIB', symbol:'FTSE MIB', name:'FTSE MIB (Italy)',    cat:'indices', sources:['oanda'],                              oandaSym:'IT40_EUR'  },
  { id:'AEX',     symbol:'AEX',      name:'AEX (Netherlands)',    cat:'indices', sources:['oanda'],                              oandaSym:'NL25_EUR'  },
  { id:'STOXX50', symbol:'STOXX 50', name:'EURO STOXX 50',       cat:'indices', sources:['oanda'],                              oandaSym:'EU50_EUR'  },
  { id:'FTMC',    symbol:'FTSE 250', name:'FTSE 250 (UK)',        cat:'indices', sources:['unavailable']                                             },
  { id:'SMI',     symbol:'SMI',      name:'SMI (Switzerland)',    cat:'indices', sources:['unavailable']                                             },
  { id:'BEL20',   symbol:'BEL 20',   name:'BEL 20 (Belgium)',    cat:'indices', sources:['unavailable']                                             },
  { id:'OMX',     symbol:'OMXS30',   name:'OMX Stockholm 30',    cat:'indices', sources:['unavailable']                                             },
  { id:'ATX',     symbol:'ATX',      name:'ATX (Austria)',        cat:'indices', sources:['unavailable']                                             },
  { id:'WIG20',   symbol:'WIG20',    name:'WIG 20 (Poland)',      cat:'indices', sources:['unavailable']                                             },
  { id:'MOEX',    symbol:'MOEX',     name:'MOEX (Russia)',        cat:'indices', sources:['unavailable']                                             },
  { id:'ISE100',  symbol:'BIST 100', name:'BIST 100 (Turkey)',    cat:'indices', sources:['unavailable']                                             },
  { id:'PSI20',   symbol:'PSI 20',   name:'PSI 20 (Portugal)',    cat:'indices', sources:['unavailable']                                             },
  { id:'BUX',     symbol:'BUX',      name:'BUX (Hungary)',        cat:'indices', sources:['unavailable']                                             },
  { id:'TA35',    symbol:'TA-35',    name:'Tel Aviv 35 (Israel)', cat:'indices', sources:['unavailable']                                             },

  // ── Americas ──────────────────────────────────
  { id:'GSPTSE',  symbol:'TSX',      name:'S&P/TSX Composite',   cat:'indices', sources:['unavailable']                                             },
  { id:'BVSP',    symbol:'BOVESPA',  name:'IBOVESPA (Brazil)',   cat:'indices', sources:['unavailable']                                             },
  { id:'MXX',     symbol:'IPC',      name:'IPC Mexico',           cat:'indices', sources:['unavailable']                                             },
  { id:'MERVAL',  symbol:'MERVAL',   name:'MERVAL (Argentina)',   cat:'indices', sources:['unavailable']                                             },
  { id:'IPSA',    symbol:'IPSA',     name:'IPSA (Chile)',          cat:'indices', sources:['unavailable']                                             },

  // ── Asia-Pacific ──────────────────────────────
  { id:'N225',    symbol:'Nikkei',    name:'Nikkei 225 (Japan)',     cat:'indices', sources:['deriv','oanda'], derivSym:'JP225',   oandaSym:'JP225_USD' },
  { id:'HSI',     symbol:'Hang Seng', name:'Hang Seng (HK)',         cat:'indices', sources:['deriv','oanda'], derivSym:'HK33',    oandaSym:'HK33_HKD'  },
  { id:'ASX200',  symbol:'ASX 200',   name:'ASX 200 (Australia)',    cat:'indices', sources:['deriv','oanda'], derivSym:'AUS200',  oandaSym:'AU200_AUD' },
  { id:'TOPIX',   symbol:'TOPIX',     name:'TOPIX (Japan)',           cat:'indices', sources:['unavailable']                                             },
  { id:'SHCOMP',  symbol:'SSE',       name:'Shanghai Composite',     cat:'indices', sources:['unavailable']                                             },
  { id:'CSI300',  symbol:'CSI 300',   name:'CSI 300 (China)',        cat:'indices', sources:['unavailable']                                             },
  { id:'SENSEX',  symbol:'SENSEX',    name:'SENSEX (India)',         cat:'indices', sources:['unavailable']                                             },
  { id:'NIFTY',   symbol:'NIFTY 50',  name:'Nifty 50 (India)',       cat:'indices', sources:['unavailable']                                             },
  { id:'KOSPI',   symbol:'KOSPI',     name:'KOSPI (South Korea)',     cat:'indices', sources:['unavailable']                                             },
  { id:'STI',     symbol:'STI',       name:'Straits Times (SG)',     cat:'indices', sources:['unavailable']                                             },
  { id:'TWII',    symbol:'TAIEX',     name:'Taiwan Weighted',        cat:'indices', sources:['unavailable']                                             },
  { id:'JCI',     symbol:'IDX',       name:'IDX Composite (ID)',     cat:'indices', sources:['unavailable']                                             },
  { id:'NZ50',    symbol:'NZX 50',    name:'NZX 50 (New Zealand)',   cat:'indices', sources:['unavailable']                                             },
  { id:'KLCI',    symbol:'KLCI',      name:'KLCI (Malaysia)',        cat:'indices', sources:['unavailable']                                             },
  { id:'SET',     symbol:'SET',       name:'SET (Thailand)',         cat:'indices', sources:['unavailable']                                             },
  { id:'PSEi',    symbol:'PSEi',      name:'PSEi (Philippines)',     cat:'indices', sources:['unavailable']                                             },

  // ── Middle East & Africa ──────────────────────
  { id:'TADAWUL', symbol:'TASI',      name:'Tadawul (Saudi Arabia)', cat:'indices', sources:['unavailable']                                             },
  { id:'ADX',     symbol:'ADX',       name:'ADX (Abu Dhabi)',        cat:'indices', sources:['unavailable']                                             },
  { id:'DFM',     symbol:'DFM',       name:'DFM (Dubai)',            cat:'indices', sources:['unavailable']                                             },
  { id:'EGX30',   symbol:'EGX 30',    name:'EGX 30 (Egypt)',         cat:'indices', sources:['unavailable']                                             },
  { id:'JSE',     symbol:'JSE TOP40', name:'JSE Top 40 (S. Africa)', cat:'indices', sources:['unavailable']                                             },
  { id:'NSE',     symbol:'NGX 30',    name:'NGX 30 (Nigeria)',       cat:'indices', sources:['unavailable']                                             },

  // ══════════════════════════════════════════════════════════════════════════
  // DERIV SYNTHETIC INDICES — Complete catalogue, available 24/7
  // All use Deriv WebSocket for live ticks and OHLC candles
  // ══════════════════════════════════════════════════════════════════════════

  // ── Volatility Indices (2-second ticks) ───────────────────────────────────
  { id:'R_10',      symbol:'Vol 10',        name:'Volatility 10 Index',          cat:'synthetics', sources:['deriv'], derivSym:'R_10'       },
  { id:'R_25',      symbol:'Vol 25',        name:'Volatility 25 Index',          cat:'synthetics', sources:['deriv'], derivSym:'R_25'       },
  { id:'R_50',      symbol:'Vol 50',        name:'Volatility 50 Index',          cat:'synthetics', sources:['deriv'], derivSym:'R_50'       },
  { id:'R_75',      symbol:'Vol 75',        name:'Volatility 75 Index',          cat:'synthetics', sources:['deriv'], derivSym:'R_75'       },
  { id:'R_100',     symbol:'Vol 100',       name:'Volatility 100 Index',         cat:'synthetics', sources:['deriv'], derivSym:'R_100'      },

  // ── Volatility Indices (1-second ticks — faster price updates) ────────────
  { id:'1HZ10V',    symbol:'Vol 10 (1s)',   name:'Volatility 10 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ10V'     },
  { id:'1HZ15V',    symbol:'Vol 15 (1s)',   name:'Volatility 15 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ15V'     },
  { id:'1HZ25V',    symbol:'Vol 25 (1s)',   name:'Volatility 25 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ25V'     },
  { id:'1HZ30V',    symbol:'Vol 30 (1s)',   name:'Volatility 30 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ30V'     },
  { id:'1HZ50V',    symbol:'Vol 50 (1s)',   name:'Volatility 50 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ50V'     },
  { id:'1HZ75V',    symbol:'Vol 75 (1s)',   name:'Volatility 75 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ75V'     },
  { id:'1HZ90V',    symbol:'Vol 90 (1s)',   name:'Volatility 90 (1s) Index',     cat:'synthetics', sources:['deriv'], derivSym:'1HZ90V'     },
  { id:'1HZ100V',   symbol:'Vol 100 (1s)',  name:'Volatility 100 (1s) Index',    cat:'synthetics', sources:['deriv'], derivSym:'1HZ100V'    },
  { id:'1HZ150V',   symbol:'Vol 150 (1s)',  name:'Volatility 150 (1s) Index',    cat:'synthetics', sources:['deriv'], derivSym:'1HZ150V'    },
  { id:'1HZ200V',   symbol:'Vol 200 (1s)',  name:'Volatility 200 (1s) Index',    cat:'synthetics', sources:['deriv'], derivSym:'1HZ200V'    },
  { id:'1HZ250V',   symbol:'Vol 250 (1s)',  name:'Volatility 250 (1s) Index',    cat:'synthetics', sources:['deriv'], derivSym:'1HZ250V'    },
  { id:'1HZ300V',   symbol:'Vol 300 (1s)',  name:'Volatility 300 (1s) Index',    cat:'synthetics', sources:['deriv'], derivSym:'1HZ300V'    },

  // ── Boom Indices (sudden upward spikes) ───────────────────────────────────
  { id:'BOOM150N',  symbol:'Boom 150',      name:'Boom 150 Index',               cat:'synthetics', sources:['deriv'], derivSym:'BOOM150N'   },
  { id:'BOOM300N',  symbol:'Boom 300',      name:'Boom 300 Index',               cat:'synthetics', sources:['deriv'], derivSym:'BOOM300N'   },
  { id:'BOOM500',   symbol:'Boom 500',      name:'Boom 500 Index',               cat:'synthetics', sources:['deriv'], derivSym:'BOOM500'    },
  { id:'BOOM600',   symbol:'Boom 600',      name:'Boom 600 Index',               cat:'synthetics', sources:['deriv'], derivSym:'BOOM600'    },
  { id:'BOOM900',   symbol:'Boom 900',      name:'Boom 900 Index',               cat:'synthetics', sources:['deriv'], derivSym:'BOOM900'    },
  { id:'BOOM1000',  symbol:'Boom 1000',     name:'Boom 1000 Index',              cat:'synthetics', sources:['deriv'], derivSym:'BOOM1000'   },

  // ── Crash Indices (sudden downward drops) ─────────────────────────────────
  { id:'CRASH150N', symbol:'Crash 150',     name:'Crash 150 Index',              cat:'synthetics', sources:['deriv'], derivSym:'CRASH150N'  },
  { id:'CRASH300N', symbol:'Crash 300',     name:'Crash 300 Index',              cat:'synthetics', sources:['deriv'], derivSym:'CRASH300N'  },
  { id:'CRASH500',  symbol:'Crash 500',     name:'Crash 500 Index',              cat:'synthetics', sources:['deriv'], derivSym:'CRASH500'   },
  { id:'CRASH600',  symbol:'Crash 600',     name:'Crash 600 Index',              cat:'synthetics', sources:['deriv'], derivSym:'CRASH600'   },
  { id:'CRASH900',  symbol:'Crash 900',     name:'Crash 900 Index',              cat:'synthetics', sources:['deriv'], derivSym:'CRASH900'   },
  { id:'CRASH1000', symbol:'Crash 1000',    name:'Crash 1000 Index',             cat:'synthetics', sources:['deriv'], derivSym:'CRASH1000'  },

  // ── Hybrid Indices (Boom/Crash with fixed 20% volatility layer) ───────────
  { id:'VOBULL400', symbol:'Vol Boom 400',  name:'Vol over Boom 400 Index',      cat:'synthetics', sources:['deriv'], derivSym:'VOBULL400'  },
  { id:'VOBULL550', symbol:'Vol Boom 550',  name:'Vol over Boom 550 Index',      cat:'synthetics', sources:['deriv'], derivSym:'VOBULL550'  },
  { id:'VOBULL750', symbol:'Vol Boom 750',  name:'Vol over Boom 750 Index',      cat:'synthetics', sources:['deriv'], derivSym:'VOBULL750'  },
  { id:'VOBEAR400', symbol:'Vol Crash 400', name:'Vol over Crash 400 Index',     cat:'synthetics', sources:['deriv'], derivSym:'VOBEAR400'  },
  { id:'VOBEAR550', symbol:'Vol Crash 550', name:'Vol over Crash 550 Index',     cat:'synthetics', sources:['deriv'], derivSym:'VOBEAR550'  },
  { id:'VOBEAR750', symbol:'Vol Crash 750', name:'Vol over Crash 750 Index',     cat:'synthetics', sources:['deriv'], derivSym:'VOBEAR750'  },

  // ── Jump Indices (sudden jumps ~3x/hour) ──────────────────────────────────
  { id:'JD10',      symbol:'Jump 10',       name:'Jump 10 Index',                cat:'synthetics', sources:['deriv'], derivSym:'JD10'       },
  { id:'JD25',      symbol:'Jump 25',       name:'Jump 25 Index',                cat:'synthetics', sources:['deriv'], derivSym:'JD25'       },
  { id:'JD50',      symbol:'Jump 50',       name:'Jump 50 Index',                cat:'synthetics', sources:['deriv'], derivSym:'JD50'       },
  { id:'JD75',      symbol:'Jump 75',       name:'Jump 75 Index',                cat:'synthetics', sources:['deriv'], derivSym:'JD75'       },
  { id:'JD100',     symbol:'Jump 100',      name:'Jump 100 Index',               cat:'synthetics', sources:['deriv'], derivSym:'JD100'      },

  // ── Step Indices (fixed step sizes, equal up/down probability) ────────────
  { id:'stpRNG',    symbol:'Step Index',    name:'Step Index',                   cat:'synthetics', sources:['deriv'], derivSym:'stpRNG'     },
  { id:'stpRNG2',   symbol:'Step 200',      name:'Step Index 200',               cat:'synthetics', sources:['deriv'], derivSym:'stpRNG2'    },
  { id:'stpRNG3',   symbol:'Step 300',      name:'Step Index 300',               cat:'synthetics', sources:['deriv'], derivSym:'stpRNG3'    },
  { id:'stpRNG4',   symbol:'Step 400',      name:'Step Index 400',               cat:'synthetics', sources:['deriv'], derivSym:'stpRNG4'    },
  { id:'stpRNG5',   symbol:'Step 500',      name:'Step Index 500',               cat:'synthetics', sources:['deriv'], derivSym:'stpRNG5'    },

  // ── Multi-Step Indices (variable step sizes) ──────────────────────────────
  { id:'MSI2',      symbol:'Multi-Step 2',  name:'Multi Step 2 Index',           cat:'synthetics', sources:['deriv'], derivSym:'MSI2'       },
  { id:'MSI3',      symbol:'Multi-Step 3',  name:'Multi Step 3 Index',           cat:'synthetics', sources:['deriv'], derivSym:'MSI3'       },
  { id:'MSI4',      symbol:'Multi-Step 4',  name:'Multi Step 4 Index',           cat:'synthetics', sources:['deriv'], derivSym:'MSI4'       },

  // ── Range Break Indices (breaks range every N attempts) ───────────────────
  { id:'RDBULL100', symbol:'Range Brk 100 Up',   name:'Range Break 100 Up',     cat:'synthetics', sources:['deriv'], derivSym:'RDBULL100'  },
  { id:'RDBEAR100', symbol:'Range Brk 100 Down',  name:'Range Break 100 Down',  cat:'synthetics', sources:['deriv'], derivSym:'RDBEAR100'  },
  { id:'RDBULL200', symbol:'Range Brk 200 Up',   name:'Range Break 200 Up',     cat:'synthetics', sources:['deriv'], derivSym:'RDBULL200'  },
  { id:'RDBEAR200', symbol:'Range Brk 200 Down',  name:'Range Break 200 Down',  cat:'synthetics', sources:['deriv'], derivSym:'RDBEAR200'  },

  // ── DEX Indices (simulate news events — spike or drop) ────────────────────
  { id:'DEX600UP',  symbol:'DEX 600 Up',    name:'DEX 600 Up Index',             cat:'synthetics', sources:['deriv'], derivSym:'DEX600UP'   },
  { id:'DEX600DN',  symbol:'DEX 600 Down',  name:'DEX 600 Down Index',           cat:'synthetics', sources:['deriv'], derivSym:'DEX600DN'   },
  { id:'DEX900UP',  symbol:'DEX 900 Up',    name:'DEX 900 Up Index',             cat:'synthetics', sources:['deriv'], derivSym:'DEX900UP'   },
  { id:'DEX900DN',  symbol:'DEX 900 Down',  name:'DEX 900 Down Index',           cat:'synthetics', sources:['deriv'], derivSym:'DEX900DN'   },
  { id:'DEX1500UP', symbol:'DEX 1500 Up',   name:'DEX 1500 Up Index',            cat:'synthetics', sources:['deriv'], derivSym:'DEX1500UP'  },
  { id:'DEX1500DN', symbol:'DEX 1500 Down', name:'DEX 1500 Down Index',          cat:'synthetics', sources:['deriv'], derivSym:'DEX1500DN'  },

  // ── Drift Switch Indices (trend + sideways switching) ─────────────────────
  { id:'DSIDXS010', symbol:'Drift Sw 10',   name:'Drift Switch 10 Index',        cat:'synthetics', sources:['deriv'], derivSym:'DSIDXS010'  },
  { id:'DSIDXS020', symbol:'Drift Sw 20',   name:'Drift Switch 20 Index',        cat:'synthetics', sources:['deriv'], derivSym:'DSIDXS020'  },
  { id:'DSIDXS030', symbol:'Drift Sw 30',   name:'Drift Switch 30 Index',        cat:'synthetics', sources:['deriv'], derivSym:'DSIDXS030'  },

  // ── Skew Step Indices (asymmetric step probabilities) ─────────────────────
  { id:'SKSX80010', symbol:'Skew Step 80/10', name:'Skew Step 80/10 Index',    cat:'synthetics', sources:['deriv'], derivSym:'SKSX80010'  },
  { id:'SKSX90010', symbol:'Skew Step 90/10', name:'Skew Step 90/10 Index',    cat:'synthetics', sources:['deriv'], derivSym:'SKSX90010'  },

  // ════════════════════════════════════════════
  // STOCKS CFD — OANDA primary (US/EU/Asia listed)
  // ════════════════════════════════════════════
  // US Tech
  { id:'AAPL',  symbol:'AAPL',  name:'Apple Inc.',       cat:'stocks', sources:['oanda'], oandaSym:'AAPL_USD' },
  { id:'MSFT',  symbol:'MSFT',  name:'Microsoft Corp.',  cat:'stocks', sources:['oanda'], oandaSym:'MSFT_USD' },
  { id:'NVDA',  symbol:'NVDA',  name:'NVIDIA Corp.',     cat:'stocks', sources:['oanda'], oandaSym:'NVDA_USD' },
  { id:'GOOGL', symbol:'GOOGL', name:'Alphabet Inc.',    cat:'stocks', sources:['oanda'], oandaSym:'GOOGL_USD' },
  { id:'AMZN',  symbol:'AMZN',  name:'Amazon.com',       cat:'stocks', sources:['oanda'], oandaSym:'AMZN_USD' },
  { id:'META',  symbol:'META',  name:'Meta Platforms',   cat:'stocks', sources:['oanda'], oandaSym:'META_USD' },
  { id:'TSLA',  symbol:'TSLA',  name:'Tesla Inc.',       cat:'stocks', sources:['oanda'], oandaSym:'TSLA_USD' },
  { id:'NFLX',  symbol:'NFLX',  name:'Netflix Inc.',     cat:'stocks', sources:['oanda'], oandaSym:'NFLX_USD' },
  { id:'AMD',   symbol:'AMD',   name:'AMD',              cat:'stocks', sources:['oanda'], oandaSym:'AMD_USD'  },
  { id:'INTC',  symbol:'INTC',  name:'Intel Corp.',      cat:'stocks', sources:['oanda'], oandaSym:'INTC_USD' },
  { id:'CRM',   symbol:'CRM',   name:'Salesforce',       cat:'stocks', sources:['oanda'], oandaSym:'CRM_USD'  },
  { id:'ORCL',  symbol:'ORCL',  name:'Oracle Corp.',     cat:'stocks', sources:['oanda'], oandaSym:'ORCL_USD' },
  { id:'PYPL',  symbol:'PYPL',  name:'PayPal Holdings',  cat:'stocks', sources:['oanda'], oandaSym:'PYPL_USD' },
  { id:'ADBE',  symbol:'ADBE',  name:'Adobe Inc.',       cat:'stocks', sources:['oanda'], oandaSym:'ADBE_USD' },
  { id:'QCOM',  symbol:'QCOM',  name:'Qualcomm',         cat:'stocks', sources:['oanda'], oandaSym:'QCOM_USD' },
  // US Finance
  { id:'JPM',   symbol:'JPM',   name:'JPMorgan Chase',   cat:'stocks', sources:['oanda'], oandaSym:'JPM_USD'  },
  { id:'BAC',   symbol:'BAC',   name:'Bank of America',  cat:'stocks', sources:['oanda'], oandaSym:'BAC_USD'  },
  { id:'GS',    symbol:'GS',    name:'Goldman Sachs',    cat:'stocks', sources:['oanda'], oandaSym:'GS_USD'   },
  { id:'MS',    symbol:'MS',    name:'Morgan Stanley',   cat:'stocks', sources:['oanda'], oandaSym:'MS_USD'   },
  { id:'V',     symbol:'V',     name:'Visa Inc.',        cat:'stocks', sources:['oanda'], oandaSym:'V_USD'    },
  { id:'MA',    symbol:'MA',    name:'Mastercard',       cat:'stocks', sources:['oanda'], oandaSym:'MA_USD'   },
  // US Healthcare
  { id:'JNJ',   symbol:'JNJ',   name:'Johnson & Johnson',cat:'stocks', sources:['oanda'], oandaSym:'JNJ_USD'  },
  { id:'PFE',   symbol:'PFE',   name:'Pfizer Inc.',      cat:'stocks', sources:['oanda'], oandaSym:'PFE_USD'  },
  { id:'MRNA',  symbol:'MRNA',  name:'Moderna Inc.',     cat:'stocks', sources:['oanda'], oandaSym:'MRNA_USD' },
  { id:'LLY',   symbol:'LLY',   name:'Eli Lilly',        cat:'stocks', sources:['oanda'], oandaSym:'LLY_USD'  },
  // US Consumer/Energy
  { id:'WMT',   symbol:'WMT',   name:'Walmart Inc.',     cat:'stocks', sources:['oanda'], oandaSym:'WMT_USD'  },
  { id:'XOM',   symbol:'XOM',   name:'ExxonMobil',       cat:'stocks', sources:['oanda'], oandaSym:'XOM_USD'  },
  { id:'CVX',   symbol:'CVX',   name:'Chevron Corp.',    cat:'stocks', sources:['oanda'], oandaSym:'CVX_USD'  },
  { id:'KO',    symbol:'KO',    name:'Coca-Cola',        cat:'stocks', sources:['oanda'], oandaSym:'KO_USD'   },
  { id:'DIS',   symbol:'DIS',   name:'Walt Disney Co.',  cat:'stocks', sources:['oanda'], oandaSym:'DIS_USD'  },
  { id:'NKE',   symbol:'NKE',   name:'Nike Inc.',        cat:'stocks', sources:['oanda'], oandaSym:'NKE_USD'  },
  // European Stocks
  { id:'SHEL',  symbol:'SHEL',  name:'Shell PLC',        cat:'stocks', sources:['oanda'], oandaSym:'SHEL_USD' },
  { id:'SAP',   symbol:'SAP',   name:'SAP SE',           cat:'stocks', sources:['oanda'], oandaSym:'SAP_USD'  },
  { id:'NOVO-B',symbol:'NVO',   name:'Novo Nordisk',     cat:'stocks', sources:['oanda'], oandaSym:'NVO_USD'  },
  { id:'LVMH',  symbol:'MC.PA', name:'LVMH',             cat:'stocks', sources:['oanda'], oandaSym:'LVMH_EUR' },
  // Asian/Other
  { id:'BABA',  symbol:'BABA',  name:'Alibaba Group',    cat:'stocks', sources:['oanda'], oandaSym:'BABA_USD' },
  { id:'BIDU',  symbol:'BIDU',  name:'Baidu Inc.',       cat:'stocks', sources:['oanda'], oandaSym:'BIDU_USD' },
  { id:'TSM',   symbol:'TSM',   name:'Taiwan Semiconductor',cat:'stocks', sources:['oanda'], oandaSym:'TSM_USD' },
  { id:'SONY',  symbol:'SONY',  name:'Sony Group',       cat:'stocks', sources:['oanda'], oandaSym:'SONY_USD' },
  { id:'SPOT',  symbol:'SPOT',  name:'Spotify Technology',cat:'stocks', sources:['oanda'], oandaSym:'SPOT_USD' },
  { id:'UBER',  symbol:'UBER',  name:'Uber Technologies',cat:'stocks', sources:['oanda'], oandaSym:'UBER_USD' },
  { id:'COIN',  symbol:'COIN',  name:'Coinbase Global',  cat:'stocks', sources:['oanda'], oandaSym:'COIN_USD' },
  { id:'HOOD',  symbol:'HOOD',  name:'Robinhood Markets',cat:'stocks', sources:['oanda'], oandaSym:'HOOD_USD' },
];

// ── Build fast lookup maps ────────────────────
const ASSET_BY_ID     = new Map(ALL_ASSETS.map(a => [a.id, a]));
const ASSET_BY_DERIV  = new Map(ALL_ASSETS.filter(a => a.derivSym).map(a => [a.derivSym, a]));
const ASSET_BY_OANDA  = new Map(ALL_ASSETS.filter(a => a.oandaSym).map(a => [a.oandaSym, a]));
const ASSET_BY_CG     = new Map(ALL_ASSETS.filter(a => a.cgId).map(a => [a.cgId, a]));

// ═══════════════════════════════════════════════
let prices    = {};
let priceData = {};
let alerts    = [];
let alertHistory   = [];
let alertHistoryFilter = '7d';
let historyCustomFrom  = null;
let historyCustomTo    = null;
let historyExpandedAsset = null;
let selectedAsset  = null;
let alertIdCounter = 1;
let currentTF      = '1H';
let chartData      = [];
let chartCtx       = null;
let triggeredToday = 0;
let currentLibTab  = 'ALL';
let libSearchQuery = '';
let currentWLTab   = 'hot';
let navigateToChartOnSelect = false;

// ═══════════════════════════════════════════════
// HOT LIST
// ═══════════════════════════════════════════════
const HOT_LIST_SEED = {
  forex:      ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','USD/CHF'],
  crypto:     ['bitcoin','ethereum','solana','BNB','ripple'],
  synthetics: ['R_75','R_100','BOOM500','CRASH500','1HZ75V','1HZ100V'],
};
let HOT_LIST = { ...HOT_LIST_SEED };

// ── Globals declared here so all files can access them ────────────────────
// (These were previously scattered in app-ui.js / app-alerts.js)

// Sound
let audioCtx           = null;
let soundEnabled       = true;
let selectedAlertSound = 'chime';

// Notifications
let notifEnabled    = false;
let swRegistration  = null;

// Telegram
const TELEGRAM_WORKER_URL = 'https://telegram-worker.meet-tyla.workers.dev';
let telegramEnabled  = false;
let telegramChatId   = localStorage.getItem('tg_chat_id') || '';
let telegramUserName = '';

// Asset library reference
const ASSET_LIBRARY = ALL_ASSETS;

// Alert editing
let editingAlertId   = null;
let userTypingInForm = false;
// TradeWatch — Data Layer
// Deriv WebSocket connections, price fetchers, formatters


// ═══════════════════════════════════════════════
// DERIV WEBSOCKET — real-time price ticks
// Connects once, subscribes to all active assets.
// Falls back gracefully if unavailable.
// ═══════════════════════════════════════════════
// Two Deriv WS connections to stay within ~50 subscription limit per connection
// ws1 = forex, commodities, watchlist assets, hot list
// ws2 = synthetics (they need their own connection for volume)
let derivWs     = null;   // primary — forex, commodities, indices, watchlist
let derivWs2    = null;   // secondary — synthetic indices only
let derivReady  = false;
let derivReady2 = false;
let derivRetryTimer  = null;
let derivRetryTimer2 = null;

function getDerivSymbols() {
  // Assets in watchlist + hot list get subscribed
  const watchedIds = new Set(Object.values(ASSETS).flat().map(a => a.id));
  const hotIds     = new Set(Object.values(HOT_LIST).flat());
  const allIds     = new Set([...watchedIds, ...hotIds]);

  const fromWatchlist = ALL_ASSETS
    .filter(a => a.derivSym && allIds.has(a.id))
    .map(a => a.derivSym);

  // Synthetics are always subscribed — they run 24/7 and users expect
  // live prices when browsing the library even before adding to watchlist
  const synthSymbols = ALL_ASSETS
    .filter(a => a.cat === 'synthetics' && a.derivSym)
    .map(a => a.derivSym);

  return [...new Set([...fromWatchlist, ...synthSymbols])];
}

function resubscribeAllDeriv() {
  // Conn 1: non-synthetic assets in watchlist + hot list
  if (_conn1.ready && _conn1.ws && _conn1.ws.readyState === WebSocket.OPEN) {
    const nonSynthSyms = ALL_ASSETS
      .filter(a => a.derivSym && a.cat !== 'synthetics')
      .map(a => a.derivSym);
    nonSynthSyms.forEach(sym => _conn1.ws.send(JSON.stringify({ ticks: sym, subscribe: 1 })));
    derivReady = true;
  }
  // Conn 2: always covers all synthetics — already subscribed on connect
  if (_conn2.ws && _conn2.ws.readyState === WebSocket.OPEN) {
    derivReady2 = true;
  };
}

// ── Managed Deriv WS connection factory ─────────────────────────────────
function makeDerivWS(symbols, retryRef) {
  if (!symbols.length) return null;
  const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=" + DERIV_APP_ID);
  ws.onopen = () => {
    // Subscribe in batches of 25
    for (let i = 0; i < symbols.length; i += 25) {
      const batch = symbols.slice(i, i + 25);
      batch.forEach(sym => ws.send(JSON.stringify({ ticks: sym, subscribe: 1 })));
    }
    // Also request last-price snapshot for each symbol so price shows immediately
    // without waiting for the first natural tick
    symbols.forEach((sym, i) => {
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ ticks_history: sym, end: 'latest', count: 1, style: 'ticks' }));
      }, Math.floor(i / 20) * 200); // stagger in batches of 20
    });
    if (retryRef) retryRef.ready = true;
    setStatusPill(true);
  };
  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);

      // Last-price snapshot (ticks_history count:1) — sets initial price immediately
      if (msg.msg_type === 'history' && msg.history?.prices?.length) {
        const sym   = msg.echo_req?.ticks_history;
        const asset = sym ? ASSET_BY_DERIV.get(sym) : null;
        if (asset) {
          const price = parseFloat(msg.history.prices[msg.history.prices.length - 1]);
          if (price && !priceData[asset.id]?.price) {
            priceData[asset.id] = {
              price, change: '0.0000', high: price, low: price,
              open: price, vol: '—', mcap: '—', live: true, src: 'deriv',
            };
            prices[asset.id] = price;
          }
        }
        return;
      }

      // Live tick updates
      if (msg.msg_type === 'tick' && msg.tick) {
        const sym   = msg.tick.symbol;
        const asset = ASSET_BY_DERIV.get(sym);
        if (!asset) return;
        const newPrice = parseFloat(msg.tick.quote);
        if (!newPrice) return;
        const prev = priceData[asset.id];
        priceData[asset.id] = {
          price:  newPrice,
          change: prev && prev.open ? (((newPrice - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
          high:   prev && prev.high ? Math.max(prev.high, newPrice) : newPrice,
          low:    prev && prev.low  ? Math.min(prev.low,  newPrice) : newPrice,
          open:   (prev && prev.open) || newPrice,
          vol: '—', mcap: '—', live: true, src: 'deriv',
        };
        prices[asset.id] = newPrice;
      }
    } catch(e) {}
  };
  ws.onclose = (e) => {
    if (retryRef) retryRef.ready = false;
    if (e.code !== 1000 && retryRef) {
      retryRef.timer = setTimeout(() => {
        retryRef.ws = makeDerivWS(symbols, retryRef);
      }, 10000);
    }
  };
  ws.onerror = () => { try { ws.close(); } catch(err) {} };
  return ws;
}

const _conn1 = { ws: null, ready: false, timer: null };
const _conn2 = { ws: null, ready: false, timer: null };

function connectDeriv() {
  // Connection 1: forex, commodities, indices, stock CFDs on Deriv
  const nonSynthSyms = ALL_ASSETS
    .filter(a => a.derivSym && a.cat !== 'synthetics')
    .map(a => a.derivSym);

  if (!_conn1.ws || _conn1.ws.readyState > 1) {
    clearTimeout(_conn1.timer);
    _conn1.ws = makeDerivWS(nonSynthSyms, _conn1);
    derivWs   = _conn1.ws;
  }

  // Connection 2: synthetic indices (separate — high subscription volume)
  const synthSyms = ALL_ASSETS
    .filter(a => a.cat === 'synthetics' && a.derivSym)
    .map(a => a.derivSym);

  if (!_conn2.ws || _conn2.ws.readyState > 1) {
    clearTimeout(_conn2.timer);
    _conn2.ws = makeDerivWS(synthSyms, _conn2);
    derivWs2  = _conn2.ws;
  }
}

function connectDerivSynthetics() {
  const synthSyms = ALL_ASSETS
    .filter(a => a.cat === 'synthetics' && a.derivSym)
    .map(a => a.derivSym);
  if (!_conn2.ws || _conn2.ws.readyState > 1) {
    clearTimeout(_conn2.timer);
    _conn2.ws = makeDerivWS(synthSyms, _conn2);
    derivWs2  = _conn2.ws;
  }
}

function subscribeDerivAsset(asset) {
  if (!asset.derivSym) return;
  const conn  = asset.cat === 'synthetics' ? _conn2 : _conn1;
  if (conn.ready && conn.ws && conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify({ ticks: asset.derivSym, subscribe: 1 }));
  }
}

// ═══════════════════════════════════════════════
// OANDA REST — snapshot prices (when key provided)
// Batch call — one request for all OANDA symbols.
// ═══════════════════════════════════════════════
async function fetchOandaSnapshot(assets) {
  if (!OANDA_KEY || !assets.length) return;
  const instruments = assets.map(a => a.oandaSym).filter(Boolean).join(',');
  if (!instruments) return;
  try {
    const res = await fetch(`${OANDA_BASE}/accounts/${OANDA_ACCOUNT}/pricing?instruments=${instruments}`, {
      headers: { 'Authorization': `Bearer ${OANDA_KEY}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    (data.prices || []).forEach(p => {
      const asset = ASSET_BY_OANDA.get(p.instrument);
      if (!asset) return;
      const bid   = parseFloat(p.bids?.[0]?.price  || 0);
      const ask   = parseFloat(p.asks?.[0]?.price  || 0);
      const price = (bid + ask) / 2;
      if (!price) return;
      const prev = priceData[asset.id];
      priceData[asset.id] = {
        price,
        change: prev?.open ? (((price - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
        high:   prev?.high  ? Math.max(prev.high, price) : price,
        low:    prev?.low   ? Math.min(prev.low,  price) : price,
        open:   prev?.open  || price,
        vol:    '—', mcap: '—', live: true, src: 'oanda',
      };
      prices[asset.id] = price;
    });
  } catch(e) { console.warn('OANDA snapshot failed:', e); }
}

// ═══════════════════════════════════════════════
// COINGECKO — crypto spot prices (batch)
// ═══════════════════════════════════════════════
function formatVol(n) {
  if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)  + 'M';
  return n?.toLocaleString() || '—';
}

async function fetchCryptoPrices(assets) {
  const cgIds = assets.map(a => a.cgId).filter(Boolean).join(',');
  if (!cgIds) return false;
  try {
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cgIds}` +
      `&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Bad CoinGecko response');
    data.forEach(coin => {
      const asset = ASSET_BY_CG.get(coin.id);
      if (!asset) return;
      const price = coin.current_price;
      priceData[asset.id] = {
        price,
        change: coin.price_change_percentage_24h?.toFixed(4) || '0.0000',
        high:   coin.high_24h,
        low:    coin.low_24h,
        open:   coin.current_price - (coin.price_change_24h || 0),
        vol:    coin.total_volume ? formatVol(coin.total_volume) : '—',
        mcap:   coin.market_cap   ? formatVol(coin.market_cap)   : '—',
        live:   true, src: 'coingecko',
      };
      prices[asset.id] = price;
    });
    return true;
  } catch(e) { console.warn('CoinGecko failed:', e); return false; }
}


// ═══════════════════════════════════════════════
// MAIN FETCH — orchestrates all broker sources
// Deriv WebSocket handles real-time ticks.
// This REST fetch fills initial prices + OHLC.
// ═══════════════════════════════════════════════
async function fetchAllPrices() {
  // Collect all assets currently needed (watchlist + hot list assets)
  const watchedIds = new Set(Object.values(ASSETS).flat().map(a => a.id));
  const hotIds     = new Set(Object.values(HOT_LIST).flat());
  const allNeeded  = [...new Set([...watchedIds, ...hotIds])].map(id => ASSET_BY_ID.get(id)).filter(Boolean);

  // Partition by source — skip 'unavailable' assets entirely
  const cryptoAssets = allNeeded.filter(a => a.sources?.includes('coingecko'));
  // OANDA: fetch for ALL assets with oandaSym (including deriv+oanda) for initial price
  // Deriv WS will take over with ticks once connected; OANDA gives us the first snapshot
  const oandaAssets  = allNeeded.filter(a => OANDA_KEY && a.oandaSym && a.cat !== 'crypto');
  // Note: Deriv assets are handled by the persistent WebSocket (connectDeriv)
  // This REST call only handles CoinGecko + OANDA initial snapshots

  await Promise.all([
    cryptoAssets.length ? fetchCryptoPrices(cryptoAssets) : Promise.resolve(),
    oandaAssets.length  ? fetchOandaSnapshot(oandaAssets) : Promise.resolve(),
  ]);

  checkAlerts();
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}


// ═══════════════════════════════════════════════
async function fetchSingleAsset(asset) {
  if (!asset) return;
  if (asset.sources?.includes('coingecko')) {
    await fetchCryptoPrices([asset]); return;
  }
  if (OANDA_KEY && asset.oandaSym && !asset.sources?.includes('deriv')) {
    await fetchOandaSnapshot([asset]); return;
  }
  // Deriv assets: covered by WebSocket subscription — subscribe if not already
  if (asset.derivSym) {
    subscribeDerivAsset(asset);
  }
  // unavailable: no live price source — price stays blank
}

// Format a triggeredAt value (ISO string, timestamp, or locale string) → readable time
function formatTriggeredAt(val) {
  if (!val || val === 'null') return '—';
  // Already a locale time string (e.g. "11:02 AM")
  if (typeof val === 'string' && !val.includes('T') && !val.includes('-')) return val;
  // ISO string or timestamp
  try {
    const d = new Date(typeof val === 'number' ? val : val);
    if (!isNaN(d)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(e) {}
  return String(val);
}

function formatPrice(p, id) {
  if (!p) return '';
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  if (id && (id.includes('/') && !id.startsWith('XAU') && !id.startsWith('XAG'))) return p.toFixed(4);
  return '$' + p.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// TradeWatch — Watchlist & Hotlist
// renderWatchlist, renderHotList, selectAsset, navigation

// ═══════════════════════════════════════════════
// REFRESH SELECTED ASSET PANEL (single source of truth)
// Called by selectAsset, 8s tick, and live data callbacks.
// Never redraws chart — callers handle that separately.
// ═══════════════════════════════════════════════
function refreshSelectedAssetPanel() {
  if (!selectedAsset) return;
  const asset = selectedAsset;

  document.getElementById('sel-symbol').textContent = asset.symbol;
  document.getElementById('sel-name').textContent   = asset.name;

  const d     = priceData[asset.id];
  const price = d?.price || null;

  // ── Pre-fill alert form with current price ────────
  const condition = document.getElementById('alert-condition')?.value || 'above';
  const isZone    = condition === 'zone';

  if (price) {
    // Round to appropriate precision
    const decimals = price >= 1000 ? 2 : price >= 1 ? 4 : 6;
    const rounded  = parseFloat(price.toFixed(decimals));

    // Never overwrite price inputs while user is typing in them
    if (!userTypingInForm) {
      const priceInput = document.getElementById('alert-price');
      if (priceInput && !priceInput.dataset.userEdited) {
        priceInput.value = rounded;
      }

      const zoneLowEl  = document.getElementById('alert-zone-low');
      const zoneHighEl = document.getElementById('alert-zone-high');
      if (zoneLowEl && !zoneLowEl.dataset.userEdited) {
        zoneLowEl.value  = parseFloat((price * 0.997).toFixed(decimals));
      }
      if (zoneHighEl && !zoneHighEl.dataset.userEdited) {
        zoneHighEl.value = parseFloat((price * 1.003).toFixed(decimals));
      }
    }

    // Show current price as helper note
    const noteEl = document.getElementById('current-price-note');
    if (noteEl) noteEl.textContent = `Current price: ${formatPrice(price, asset.id)} — edit to set your target`;
  } else {
    const noteEl = document.getElementById('current-price-note');
    if (noteEl) noteEl.textContent = 'Price loading… enter your target manually';
  }
}

// ═══════════════════════════════════════════════
// ALERT TARGET LINE OVERLAY ON CHART
// ═══════════════════════════════════════════════
// UPDATE WATCHLIST SELECTION HIGHLIGHT ONLY
// Lightweight — just flips CSS classes, no full re-render.
// ═══════════════════════════════════════════════
function updateWatchlistSelection() {
  document.querySelectorAll('.asset-card').forEach(card => {
    const assetId = card.dataset.assetId;
    const isSelected = selectedAsset && assetId === selectedAsset.id;
    card.classList.toggle('selected', isSelected);
    if (isSelected) {
      card.classList.add('selected');
      card.style.setProperty('--before-opacity', '1');
    }
  });
}

// ═══════════════════════════════════════════════
// ASSET ICONS
// ═══════════════════════════════════════════════

// Maps asset id → { type, ... }
// type 'crypto'  → CoinGecko asset image
// type 'stock'   → logo.dev favicon
// type 'forex'   → two stacked flag images (base + quote currency)
// type 'commodity'→ static SVG inline (no good free CDN)
function renderWatchlist() {
  let totalCount = 0;
  Object.entries(ASSETS).forEach(([cat, assets]) => {
    const container = document.getElementById(cat + '-list');
    if (!container) return;
    container.innerHTML = '';
    assets.forEach(asset => {
      const hasAlert = alerts.some(a => a.assetId === asset.id && a.status === 'active');
      const isSelected = selectedAsset && selectedAsset.id === asset.id;

      const card = document.createElement('div');
      card.className = `asset-card${isSelected ? ' selected' : ''}${hasAlert ? ' has-alert' : ''}`;
      card.dataset.assetId = asset.id;
      card.innerHTML = `
        <button class="asset-remove" title="Remove from watchlist" onclick="removeAssetFromWatchlist('${asset.id}','${cat}',event)"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <div class="asset-left">
          <div class="asset-symbol">${asset.symbol}</div>
          <div class="asset-name">${asset.name}</div>
        </div>
        ${hasAlert ? '<div class="asset-right"><div class="alert-dot" title="Alert active"></div></div>' : ''}`;
      card.onclick = (e) => {
        // Don't trigger selectAsset if the remove button was clicked
        if (e.target.classList.contains('asset-remove') || e.target.closest('.asset-remove')) return;
        navigateToChartOnSelect = true; // user explicitly tapped — allow tab switch
        selectAsset(asset);
      };
      container.appendChild(card);
      totalCount++;
    });
  });
  // Update watchlist count in tab label
  const wlCountEl = document.getElementById('wl-count');
  if (wlCountEl) wlCountEl.textContent = totalCount;

  // Show/hide empty state
  const empty = document.getElementById('wl-empty');
  if (empty) empty.style.display = totalCount === 0 ? '' : 'none';
}

// ═══════════════════════════════════════════════
// HOTLIST RENDERING
// ═══════════════════════════════════════════════
function renderHotList() {
  Object.entries(HOT_LIST).forEach(([cat, assetIds]) => {
    const container = document.getElementById('hot-' + cat + '-list');
    if (!container) return;
    container.innerHTML = '';
    assetIds.forEach(assetId => {
      const asset = Object.values(ASSETS).flat().find(a => a.id === assetId) || ALL_ASSETS.find(a => a.id === assetId);
      if (!asset) return;
      const hasAlert = alerts.some(a => a.assetId === asset.id && a.status === 'active');
      const isSelected = selectedAsset && selectedAsset.id === asset.id;
      const inWatchlist = ASSETS[cat]?.some(a => a.id === assetId);

      const card = document.createElement('div');
      card.className = `asset-card${isSelected ? ' selected' : ''}${hasAlert ? ' has-alert' : ''}`;
      card.dataset.assetId = asset.id;
      card.innerHTML = `
        <button class="asset-add-btn${inWatchlist ? ' in-watchlist' : ''}" title="${inWatchlist ? 'In watchlist' : 'Add to watchlist'}" onclick="hotListAdd('${asset.id}','${cat}',event)">
          ${inWatchlist
            ? '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
          }
        </button>
        <div class="asset-left">
          <div class="asset-symbol">${asset.symbol}</div>
          <div class="asset-name">${asset.name}</div>
        </div>
        ${hasAlert ? '<div class="asset-right"><div class="alert-dot" title="Alert active"></div></div>' : ''}`;
      card.onclick = (e) => {
        if (e.target.closest('.asset-add-btn')) return;
        navigateToChartOnSelect = true;
        selectAsset(asset);
      };
      container.appendChild(card);
    });
  });
}

function hotListAdd(assetId, cat, e) {
  e.stopPropagation();
  const asset = Object.values(ASSETS).flat().find(a => a.id === assetId) || ALL_ASSETS.find(a => a.id === assetId);
  if (!asset) return;
  const already = ASSETS[cat]?.some(a => a.id === assetId);
  if (already) {
    showToast('Already Added', `${asset.symbol} is already in your watchlist.`, 'info');
    return;
  }
  if (!ASSETS[cat]) ASSETS[cat] = [];
  ASSETS[cat].push(asset);
  addToWatchlist(asset, cat);
  showToast('Added', `${asset.symbol} added to your watchlist.`, 'success');
  renderHotList();
  renderWatchlist();
}

// ═══════════════════════════════════════════════
// WATCHLIST TAB SWITCHER
// ═══════════════════════════════════════════════
function switchWLTab(tab) {
  currentWLTab = tab;
  localStorage.setItem('tw_last_wl_tab', tab);
  document.getElementById('panel-hot').style.display          = tab === 'hot'       ? '' : 'none';
  document.getElementById('panel-my-watchlist').style.display = tab === 'watchlist' ? '' : 'none';

  // Show FAB only on watchlist tab on mobile
  const fab = document.getElementById('wl-fab');
  if (fab) fab.classList.toggle('visible', tab === 'watchlist' && isMobileLayout());

  // Sync nav button highlights
  if (isMobileLayout()) {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const btnId = tab === 'watchlist' ? 'mnav-my-watchlist' : 'mnav-watchlist';
    document.getElementById(btnId)?.classList.add('active');
  }
}
function selectAsset(asset) {
  // Cancel any active edit when switching assets
  if (editingAlertId && selectedAsset && selectedAsset.id !== asset.id) {
    cancelEditAlert();
  }

  selectedAsset = asset;

  // Track click for dynamic Hotlist rankings (non-blocking)
  const cat = Object.entries(ASSETS).find(([, list]) => list.some(a => a.id === asset.id))?.[0]
           || Object.entries(HOT_LIST_SEED).find(([, ids]) => ids.includes(asset.id))?.[0];
  if (cat) trackAssetClick(asset.id, cat);

  // Reset price input so it pre-fills with new asset's price
  const priceInput = document.getElementById('alert-price');
  if (priceInput) { priceInput.value = ''; delete priceInput.dataset.userEdited; }

  // Clear setup form user-edited flags and refill with new asset's price
  if (!editingAlertId) {
    ['setup-entry','setup-sl','setup-tp1','setup-tp2','setup-tp3'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; delete el.dataset.userEdited; }
    });
  }
  updateSetupPricePlaceholders(setupDirection || 'long');

  // Update panel content via shared function
  refreshSelectedAssetPanel();

  // Update the alert form's asset display to show the selected asset name.
  const display = document.getElementById('alert-asset-display');
  if (display) {
    display.textContent = `${asset.symbol} — ${asset.name}`;
    display.classList.remove('placeholder');
  }

  // Update selection highlight — lightweight on mobile (no full re-render),
  // full re-render on desktop to also refresh prices on all cards
  if (isMobileLayout()) {
    updateWatchlistSelection();
    if (navigateToChartOnSelect) {
      navigateToChartOnSelect = false;
      mobileTab('chart');
    }
  } else {
    renderHotList();
    renderWatchlist();
    setTimeout(() => loadTVChart(asset), 50);
  }
}

// ═══════════════════════════════════════════════
// MOBILE TAB NAVIGATION
// ═══════════════════════════════════════════════
// ── NAVIGATION HISTORY STACK ──────────────────────
// Tracks panel history so back button/swipe works correctly
const navStack = ['watchlist']; // start on watchlist

// Returns true when the mobile bottom nav is active (regardless of device width)
// This handles landscape phones, tablets, and any unusual viewport sizes correctly.
function isMobileLayout() {
  return true; // always mobile — app is Telegram mini app only
}

function mobileTab(tab, pushState = true) {
  if (!isMobileLayout()) return;

  // Close journal modal whenever navigating away from journal tab
  if (tab !== 'journal') {
    const jm = document.getElementById('journal-modal');
    if (jm) jm.style.display = 'none';
  }

  const current = navStack[navStack.length - 1];

  // Push to stack only if navigating to a different tab
  if (pushState && tab !== current) {
    navStack.push(tab);
    // Push a browser history state so Android back button fires popstate
    window.history.pushState({ twTab: tab }, '', '');
  }

  // Hide all panels
  document.getElementById('panel-watchlist').classList.remove('mobile-active');
  document.getElementById('panel-main').classList.remove('mobile-active');
  document.getElementById('panel-journal')?.classList.remove('mobile-active');
  document.getElementById('panel-alerts').classList.remove('mobile-active');

  // Deactivate all nav buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  // Hide summary bar on chart & journal (they have their own headers)
  // Show it on watchlist & alerts
  const summaryBar = document.querySelector('.summary-bar');
  if (summaryBar) {
    summaryBar.style.display = (tab === 'chart' || tab === 'journal') ? 'none' : '';
  }

  // Hide FAB unless staying on watchlist tab
  const fab = document.getElementById('wl-fab');

  if (tab === 'watchlist') {
    document.getElementById('panel-watchlist').classList.add('mobile-active');
    // Nav highlight handled by switchWLTab caller
  } else if (tab === 'chart') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-main');
    panel.classList.add('mobile-active');
    panel.scrollTop = 0;
    document.getElementById('mnav-chart').classList.add('active');
    setTimeout(() => { if (selectedAsset) loadTVChart(selectedAsset); }, 150);
  } else if (tab === 'journal') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-journal');
    if (panel) {
      panel.classList.add('mobile-active');
      panel.scrollTop = 0;
    }
    document.getElementById('mnav-journal')?.classList.add('active');
    if (typeof renderJournal === 'function') renderJournal();
  } else if (tab === 'alerts') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-alerts');
    panel.classList.add('mobile-active');
    panel.scrollTop = 0;
    document.getElementById('mnav-alerts').classList.add('active');
    renderAlerts();
  }
}

// ── BACK NAVIGATION (Android back button + swipe back) ──
function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    mobileTab(prev, false); // false = don't push another state
    // Also update WL subtab if going back to watchlist
    if (prev === 'watchlist') {
      const lastWLTab = localStorage.getItem('tw_last_wl_tab') || 'hot';
      switchWLTab(lastWLTab);
    }
    return true;
  }
  return false;
}

// Android physical/gesture back button
window.addEventListener('popstate', (e) => {
  if (!isMobileLayout()) return;
  if (navStack.length > 1) {
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    mobileTab(prev, false);
    if (prev === 'watchlist') {
      const lastWLTab = localStorage.getItem('tw_last_wl_tab') || 'hot';
      switchWLTab(lastWLTab);
    }
    // Push a replacement so back button doesn't exit the app
    window.history.pushState({ twTab: prev }, '', '');
  } else {
    // At root — push state back so app stays open
    window.history.pushState({ twTab: 'watchlist' }, '', '');
  }
});

// ═══════════════════════════════════════════════
// TRADINGVIEW CHART
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// LIGHTWEIGHT CHARTS — custom candlestick chart
// Data sourced from Deriv REST (OHLC) + CoinGecko
// No external symbol restrictions — every asset works
// ═══════════════════════════════════════════════
// TradeWatch — Chart Engine
// Lightweight Charts, OHLC fetchers, alert price lines


let lwChart        = null;
let lwSeries       = null;
let lwAlertLines   = [];
let lwCurrentTF    = '1D'; // default
let lwCurrentAsset = null;

// ── Timeframe config ──────────────────────────────────────────────────────
// Deriv valid granularities (seconds): 60 120 180 300 600 900 1800 3600 7200 14400 28800 86400
// Binance supports: 1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M
// Counts are generous — Deriv max is 5000, Binance max is 1000
const TF_CONFIG = {
  '1m':  { granularity:    60, count: 500,  binance: '1m'  }, // ~8 hours
  '5m':  { granularity:   300, count: 500,  binance: '5m'  }, // ~1.7 days
  '15m': { granularity:   900, count: 500,  binance: '15m' }, // ~5 days
  '30m': { granularity:  1800, count: 500,  binance: '30m' }, // ~10 days
  '1H':  { granularity:  3600, count: 500,  binance: '1h'  }, // ~21 days
  '4H':  { granularity: 14400, count: 500,  binance: '4h'  }, // ~83 days
  '1D':  { granularity: 86400, count: 365,  binance: '1d'  }, // 1 year
  '1W':  { granularity: 86400, count: 365,  binance: '1d'  }, // use daily, group to weekly display
  '1M':  { granularity: 86400, count: 730,  binance: '1d'  }, // use daily, group to monthly display
};

const BINANCE_SYMBOL = {
  'bitcoin':'BTCUSDT',       'ethereum':'ETHUSDT',      'solana':'SOLUSDT',
  'ripple':'XRPUSDT',        'binancecoin':'BNBUSDT',   'dogecoin':'DOGEUSDT',
  'cardano':'ADAUSDT',       'avalanche-2':'AVAXUSDT',  'chainlink':'LINKUSDT',
  'litecoin':'LTCUSDT',      'polkadot':'DOTUSDT',      'shiba-inu':'SHIBUSDT',
  'uniswap':'UNIUSDT',       'cosmos':'ATOMUSDT',       'stellar':'XLMUSDT',
  'monero':'XMRUSDT',        'tron':'TRXUSDT',          'aave':'AAVEUSDT',
  'near':'NEARUSDT',         'aptos':'APTUSDT',         'arbitrum':'ARBUSDT',
  'optimism':'OPUSDT',       'sui':'SUIUSDT',           'toncoin':'TONUSDT',
  'pepe':'PEPEUSDT',         'bonk':'BONKUSDT',         'maker':'MKRUSDT',
  'kaspa':'KASUSDT',         'render-token':'RENDERUSDT','fetch-ai':'FETUSDT',
  'worldcoin-wld':'WLDUSDT','celestia':'TIAUSDT',       'starknet':'STRKUSDT',
  'hedera':'HBARUSDT',       'vechain':'VETUSDT',       'algorand':'ALGOUSDT',
  'internet-computer':'ICPUSDT','filecoin':'FILUSDT',
  'injective-protocol':'INJUSDT','sei-network':'SEIUSDT',
  'immutable-x':'IMXUSDT',  'polygon':'MATICUSDT',
};
// Binance intervals now stored in TF_CONFIG.binance

// ── Timeframe button handler ───────────────────────────────────────────────
function setChartTF(tf) {
  lwCurrentTF = tf;
  document.querySelectorAll('.chart-tf-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === tf);
  });
  if (lwCurrentAsset) loadLWChart(lwCurrentAsset);
}

// ── Create chart instance ──────────────────────────────────────────────────
function ensureLWChart() {
  const container = document.getElementById('lw-chart');
  if (!container) return false;
  if (lwChart) return true; // already created

  // Measure from the parent tv-container (has explicit CSS height)
  const tvCont = document.getElementById('tv-container');
  const w = (tvCont && tvCont.offsetWidth  > 10 ? tvCont.offsetWidth  : 400);
  const h = (tvCont && tvCont.offsetHeight > 10 ? tvCont.offsetHeight : 460);

  lwChart = LightweightCharts.createChart(container, {
    width:  w,
    height: h,
    layout: {
      background: { type: 'solid', color: '#080c12' },
      textColor:  '#8899aa',
      fontSize:   11,
    },
    grid: {
      vertLines: { color: 'rgba(26,45,69,0.4)' },
      horzLines: { color: 'rgba(26,45,69,0.4)' },
    },
    crosshair: { mode: 1 }, // 1 = Normal
    rightPriceScale: { borderColor: 'rgba(26,45,69,0.6)' },
    timeScale: {
      borderColor:    'rgba(26,45,69,0.6)',
      timeVisible:    true,
      secondsVisible: false,
      rightOffset:    8,
    },
    handleScroll: true,
    handleScale:  true,
  });

  lwSeries = lwChart.addCandlestickSeries({
    upColor:         '#26a69a',
    downColor:       '#ef5350',
    borderUpColor:   '#26a69a',
    borderDownColor: '#ef5350',
    wickUpColor:     '#26a69a',
    wickDownColor:   '#ef5350',
  });

  // Resize observer — keeps chart sized to its container
  try {
    const ro = new ResizeObserver(() => {
      if (!lwChart || !tvCont) return;
      const nw = tvCont.offsetWidth;
      const nh = tvCont.offsetHeight;
      if (nw > 10 && nh > 10) lwChart.applyOptions({ width: nw, height: nh });
    });
    ro.observe(tvCont || container);
  } catch(e) {}

  return true;
}

// ── Loading overlay ────────────────────────────────────────────────────────
function setChartLoading(on) {
  const el = document.getElementById('chart-loading');
  if (el) el.classList.toggle('visible', on);
}

// ── Main chart loader ──────────────────────────────────────────────────────
async function loadLWChart(asset) {
  if (!asset) return;
  // Don't reload chart while user is actively filling the alert form
  // It causes the page to scroll back up mid-input
  if (userTypingInForm) return;
  lwCurrentAsset = asset;

  // Destroy stale chart so it remeasures correctly
  if (lwChart) {
    try { lwChart.remove(); } catch(e) {}
    lwChart = null; lwSeries = null; lwAlertLines = [];
  }
  if (!ensureLWChart()) return;
  setChartLoading(true);

  const candles = await fetchOHLC(asset, lwCurrentTF);

  setChartLoading(false);
  if (!candles || candles.length === 0) {
    showChartMsg('No chart data available for ' + asset.symbol);
    return;
  }

  hideChartMsg();
  try {
    lwSeries.setData(candles);
    // Show last ~80 candles on screen by default, but allow scrolling back
    const ts = lwChart.timeScale();
    ts.fitContent();
    // After fitContent, zoom in to show last 80 bars so chart isn't squished
    if (candles.length > 80) {
      const last80 = candles.slice(-80);
      ts.setVisibleRange({
        from: last80[0].time,
        to:   candles[candles.length - 1].time,
      });
    }
    // Allow scrolling past the right edge and back into history
    lwChart.applyOptions({
      timeScale: {
        rightOffset:   5,
        barSpacing:    8,
        fixLeftEdge:   false,
        fixRightEdge:  false,
        lockVisibleTimeRangeOnResize: false,
      },
    });
  } catch(e) {
    console.warn('LW setData error:', e);
  }

  drawAlertLines(asset.id);
}

// ── OHLC routing ──────────────────────────────────────────────────────────
async function fetchOHLC(asset, tf) {
  const cfg = TF_CONFIG[tf] || TF_CONFIG['1D'];

  // ── Crypto path ──────────────────────────────────────────────────────────
  if (asset.cat === 'crypto' || BINANCE_SYMBOL[asset.id]) {
    // Race Binance (direct + proxy) against Deriv CFD in parallel
    // First valid response wins — eliminates sequential timeout waits
    const racers = [];

    if (BINANCE_SYMBOL[asset.id]) {
      // Direct Binance
      racers.push(fetchBinanceOHLC(asset.id, cfg, tf, false));
      // Proxied Binance (slight delay so direct gets priority)
      racers.push(
        new Promise(r => setTimeout(r, 300))
          .then(() => fetchBinanceOHLC(asset.id, cfg, tf, true))
      );
    }

    // Deriv CFD for BTC/ETH/SOL/XRP/DOGE/ADA/LTC
    if (asset.derivSym) {
      racers.push(fetchDerivOHLC(asset.derivSym, cfg));
    }

    if (racers.length) {
      // Use Promise.any — resolves with first non-null result
      const d = await raceForData(racers);
      if (d && d.length) return d;
    }

    // Last resort: CoinGecko OHLC (30min/4H/1D granularity only)
    if (asset.cgId) {
      const d = await fetchCoinGeckoOHLC(asset, cfg, tf);
      if (d && d.length) return d;
    }

    return null;
  }

  // ── Forex / commodities / synthetics / indices → Deriv WebSocket ─────────
  if (asset.derivSym) {
    const d = await fetchDerivOHLC(asset.derivSym, cfg);
    if (d && d.length) return d;
  }

  // ── Stocks CFD → OANDA ───────────────────────────────────────────────────
  if (OANDA_KEY && asset.oandaSym) {
    const d = await fetchOandaOHLC(asset.oandaSym, cfg);
    if (d && d.length) return d;
  }

  return null;
}

// ── CoinGecko OHLC — crypto fallback ────────────────────────────────────
async function fetchCoinGeckoOHLC(asset, cfg, tf) {
  if (!asset.cgId) return null;
  // CoinGecko OHLC free tier auto-selects granularity by days param:
  //   days=1  → 30-min candles (best for 1m/5m/15m/30m/1H)
  //   days=7  → 4H candles     (best for 4H)
  //   days=90 → daily candles  (best for 1D)
  //   days=365→ daily candles  (best for 1W/1M)
  const daysMap = { '1m':1,'5m':1,'15m':1,'30m':1,'1H':1,'4H':7,'1D':90,'1W':365,'1M':365 };
  const days = daysMap[tf] || 90;
  try {
    const res  = await fetch(
      `https://api.coingecko.com/api/v3/coins/${asset.cgId}/ohlc?vs_currency=usd&days=${days}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const raw = dedupe(data.map(([t, o, h, l, c]) => ({
      time: Math.floor(t / 1000), open: o, high: h, low: l, close: c,
    })));
    if (tf === '1W') return aggregateCandles(raw, 'week');
    if (tf === '1M') return aggregateCandles(raw, 'month');
    return raw;
  } catch(e) { console.warn('CoinGecko OHLC:', e); return null; }
}

// ── Binance klines — crypto ────────────────────────────────────────────────
async function fetchBinanceOHLC(assetId, cfg, tf, useProxy = false) {
  const sym      = BINANCE_SYMBOL[assetId];
  if (!sym) return null;
  const interval = cfg.binance || '1d';
  const limit    = Math.min(cfg.count, 1000);
  const directUrl = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`;
  const url = useProxy
    ? `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`
    : directUrl;
  try {
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const raw = dedupe(data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1], high: +k[2], low: +k[3], close: +k[4],
    })));
    // For 1W and 1M, aggregate daily candles into weekly/monthly bars
    if (tf === '1W') return aggregateCandles(raw, 'week');
    if (tf === '1M') return aggregateCandles(raw, 'month');
    return raw;
  } catch(e) { console.warn('Binance OHLC:', e); return null; }
}

// Aggregate daily candles into weekly or monthly bars
function aggregateCandles(candles, period) {
  if (!candles.length) return [];
  const groups = {};
  candles.forEach(c => {
    const d = new Date(c.time * 1000);
    let key;
    if (period === 'week') {
      // Start of the ISO week (Monday)
      const day = d.getUTCDay() || 7;
      const mon = new Date(d);
      mon.setUTCDate(d.getUTCDate() - day + 1);
      mon.setUTCHours(0, 0, 0, 0);
      key = Math.floor(mon.getTime() / 1000);
    } else {
      // Start of the month
      key = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
    }
    if (!groups[key]) groups[key] = { time: key, open: c.open, high: c.high, low: c.low, close: c.close };
    else {
      groups[key].high  = Math.max(groups[key].high,  c.high);
      groups[key].low   = Math.min(groups[key].low,   c.low);
      groups[key].close = c.close;
    }
  });
  return Object.values(groups).sort((a, b) => a.time - b.time);
}

// ── Deriv WebSocket candles ──────────────────────────────────────────────
// Uses the live derivWs if open — avoids opening a new WS per chart request.
// Falls back to a dedicated one-shot WS if live connection isn't ready.
const _derivOHLCCallbacks = new Map(); // reqId → resolve fn

function fetchDerivOHLC(derivSym, cfg) {
  return new Promise(resolve => {
    const reqId  = `ohlc_${derivSym}_${Date.now()}`;
    let   done   = false;
    const finish = (result) => { if (!done) { done = true; resolve(result); } };

    // Register callback so onmessage can route the response back
    _derivOHLCCallbacks.set(reqId, finish);
    const t = setTimeout(() => {
      _derivOHLCCallbacks.delete(reqId);
      finish(null);
    }, 10000);

    const req = {
      ticks_history:     derivSym,
      style:             'candles',
      granularity:       cfg.granularity,
      count:             cfg.count,
      end:               'latest',
      adjust_start_time: 1,
      req_id:            reqId, // echo'd back in response
    };

    const sendReq = (ws) => ws.send(JSON.stringify(req));

    // Try live WS first
    if (derivWs && derivWs.readyState === WebSocket.OPEN) {
      sendReq(derivWs);
    } else {
      // Fallback: dedicated one-shot WS
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
      ws.onopen    = () => sendReq(ws);
      ws.onmessage = (evt) => handleDerivOHLCMsg(JSON.parse(evt.data), ws);
      ws.onerror   = () => { clearTimeout(t); _derivOHLCCallbacks.delete(reqId); finish(null); };
    }
  });
}

function handleDerivOHLCMsg(msg, wsToClose) {
  // Route candle responses to the correct pending callback via req_id
  const reqId  = msg.req_id || msg.echo_req?.req_id;
  const cb     = reqId ? _derivOHLCCallbacks.get(reqId) : null;

  if (msg.msg_type === 'candles' || msg.candles) {
    if (cb) {
      _derivOHLCCallbacks.delete(reqId);
      const raw = msg.candles || [];
      if (wsToClose) try { wsToClose.close(); } catch(e) {}
      cb(raw.length ? dedupe(raw.map(c => ({
        time: c.epoch,
        open: +c.open, high: +c.high, low: +c.low, close: +c.close,
      }))) : null);
    }
  } else if (msg.error && cb) {
    _derivOHLCCallbacks.delete(reqId);
    if (wsToClose) try { wsToClose.close(); } catch(e) {}
    console.warn('Deriv candles error:', msg.error.message);
    cb(null);
  }
}

// ── OANDA mid-price candles — stocks CFD ──────────────────────────────────
async function fetchOandaOHLC(oandaSym, cfg) {
  const tfGranMap = {
    '1m':'M1','5m':'M5','15m':'M15','30m':'M30',
    '1H':'H1','4H':'H4','1D':'D','1W':'W','1M':'M'
  };
  const gran = tfGranMap[lwCurrentTF] || 'D';
  try {
    const res = await fetch(
      `${OANDA_BASE}/instruments/${oandaSym}/candles?granularity=${gran}&count=${cfg.count}&price=M`,
      { headers: { Authorization: `Bearer ${OANDA_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.candles?.length) return null;
    return dedupe(
      data.candles
        .filter(c => c.complete !== false)
        .map(c => ({
          time:  Math.floor(new Date(c.time).getTime() / 1000),
          open:  +c.mid.o, high: +c.mid.h, low: +c.mid.l, close: +c.mid.c,
        }))
    );
  } catch(e) { console.warn('OANDA OHLC:', e); return null; }
}

// ── Helpers ────────────────────────────────────────────────────────────────
// Race multiple OHLC fetches — returns first non-null, non-empty result
async function raceForData(promises) {
  return new Promise(resolve => {
    let settled = 0;
    const total = promises.length;
    if (!total) return resolve(null);
    promises.forEach(p => {
      Promise.resolve(p).then(result => {
        settled++;
        if (result && result.length) {
          resolve(result); // first valid result wins
        } else if (settled === total) {
          resolve(null); // all exhausted with no data
        }
      }).catch(() => {
        settled++;
        if (settled === total) resolve(null);
      });
    });
  });
}

function dedupe(candles) {
  const seen = new Set();
  return candles
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; })
    .sort((a, b) => a.time - b.time);
}

function showChartMsg(msg) {
  const el = document.getElementById('chart-msg');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 6000);
}
function hideChartMsg() {
  const el = document.getElementById('chart-msg');
  if (el) el.classList.remove('visible');
}

// ── Alert price lines ──────────────────────────────────────────────────────
function clearAlertLines() {
  lwAlertLines.forEach(l => { try { if (lwSeries) lwSeries.removePriceLine(l); } catch(e){} });
  lwAlertLines = [];
}

function drawAlertLines(assetId) {
  if (!lwSeries) return;
  clearAlertLines();
  alerts
    .filter(a => a.assetId === assetId && a.status === 'active')
    .forEach(alert => {
      const green = '#00e676', red = '#ff3d5a', cyan = '#00d4ff', gold = '#f0b429';

      // For setup alerts: note contains JSON — show clean trade setup lines instead
      if (alert.condition === 'setup') {
        const j = getJournal(alert);
        const dir = j.direction === 'long' ? 'Long' : 'Short';
        try { lwAlertLines.push(lwSeries.createPriceLine({ price: alert.targetPrice, color: cyan,  lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `▶ ${dir} Entry` })); } catch(e) {}
        if (j.sl)  { try { lwAlertLines.push(lwSeries.createPriceLine({ price: j.sl,  color: red,   lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SL' })); } catch(e) {} }
        if (j.tp1) { try { lwAlertLines.push(lwSeries.createPriceLine({ price: j.tp1, color: green, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP1' })); } catch(e) {} }
        if (j.tp2) { try { lwAlertLines.push(lwSeries.createPriceLine({ price: j.tp2, color: green, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP2' })); } catch(e) {} }
        if (j.tp3) { try { lwAlertLines.push(lwSeries.createPriceLine({ price: j.tp3, color: green, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP3' })); } catch(e) {} }
        return;
      }

      // For zone alerts: use note only if it's not JSON
      const safeNote = (note) => {
        if (!note) return '';
        try { JSON.parse(note); return ''; } catch(e) { return ' · ' + note; }
      };

      if (alert.condition === 'zone') {
        [[alert.zoneLow, 'Zone Low'], [alert.zoneHigh, 'Zone High']].forEach(([price, lbl]) => {
          try {
            lwAlertLines.push(lwSeries.createPriceLine({
              price, color: cyan, lineWidth: 1, lineStyle: 2,
              axisLabelVisible: true,
              title: lbl + safeNote(alert.note),
            }));
          } catch(e) {}
        });
      } else {
        const color = alert.condition === 'above' ? green : alert.condition === 'tap' ? gold : red;
        const pfx   = alert.condition === 'above' ? '▲ ' : alert.condition === 'tap' ? '◎ ' : '▼ ';
        try {
          lwAlertLines.push(lwSeries.createPriceLine({
            price: alert.targetPrice, color, lineWidth: 1, lineStyle: 2,
            axisLabelVisible: true,
            title: pfx + formatPrice(alert.targetPrice, assetId) + safeNote(alert.note),
          }));
        } catch(e) {}
      }
    });
}

// ── Compat stubs for old call sites ───────────────────────────────────────
function loadTVChart(asset)   { loadLWChart(asset); }
function getTVSymbol()        { return ''; }
function generateChartData()  {}
function drawChart()          {}
function setTF()              {}


// TradeWatch — Alerts
// createAlert, renderAlerts, checkAlerts, history, sound


// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════
// ── Toggle zone vs single price UI ───────────────
// onConditionChange: see setup alert section below

async function createAlert() {
  userTypingInForm = false;
  // Route setup to its own handler FIRST — even when editing
  // (setup edits go through createSetupAlert which handles editingAlertId)
  if (document.getElementById('alert-condition').value === 'setup') return createSetupAlert();
  if (editingAlertId) return saveEditedAlert();

  if (!selectedAsset) return showToast('No Asset', 'Tap any asset from the Hot List or Watchlist first.', 'error');

  const assetId    = selectedAsset.id;
  const condition  = document.getElementById('alert-condition').value;
  const timeframe  = document.getElementById('alert-timeframe').value;
  const isZone  = condition === 'zone';
  const isTap   = condition === 'tap';

  let targetPrice = 0, zoneLow = 0, zoneHigh = 0, note = '', repeatInterval = 0, tapTolerance = 0.2;

  if (isZone) {
    zoneLow  = parseFloat(document.getElementById('alert-zone-low').value);
    zoneHigh = parseFloat(document.getElementById('alert-zone-high').value);
    note     = document.getElementById('alert-note-zone').value.trim();
    repeatInterval = parseInt(document.getElementById('alert-repeat').value) || 0;
    if (isNaN(zoneLow) || isNaN(zoneHigh) || zoneLow <= 0 || zoneHigh <= 0)
      return showToast('Invalid Zone', 'Enter valid zone low and high prices.', 'error');
    if (zoneLow >= zoneHigh)
      return showToast('Invalid Zone', 'Zone low must be less than zone high.', 'error');
    targetPrice = zoneLow;
  } else if (isTap) {
    targetPrice = parseFloat(document.getElementById('alert-price').value);
    note        = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
    const tolSel = document.getElementById('alert-tap-tolerance').value;
    tapTolerance = tolSel === 'custom'
      ? parseFloat(document.getElementById('alert-tap-custom').value) || 0.2
      : parseFloat(tolSel);
  } else {
    targetPrice = parseFloat(document.getElementById('alert-price').value);
    note        = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
  }

  // ── Duplicate check ───────────────────────────────
  const duplicate = alerts.find(a => {
    if (a.assetId !== assetId || a.status === 'triggered') return false;
    if (isZone && a.condition === 'zone')
      return a.zoneLow === zoneLow && a.zoneHigh === zoneHigh;
    if (!isZone && a.condition === condition)
      return a.targetPrice === targetPrice;
    return false;
  });
  if (duplicate) {
    const label = isZone
      ? `a zone alert (${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)})`
      : `a ${condition} alert at ${formatPrice(targetPrice, assetId)}`;
    return showToast('Duplicate Alert', `You already have ${label} for ${selectedAsset.symbol}.`, 'error');
  }

  const assetInfo    = selectedAsset;
  const currentPrice = priceData[assetId]?.price || 0;

  const newAlert = {
    id: 'temp_' + alertIdCounter++,
    assetId,
    symbol:          assetInfo.symbol,
    name:            assetInfo.name,
    condition,
    targetPrice,
    zoneLow:         isZone     ? zoneLow      : null,
    zoneHigh:        isZone     ? zoneHigh     : null,
    tapTolerance:    isTap      ? tapTolerance : null,

    timeframe:       timeframe || null,
    repeatInterval,
    note,
    sound:           selectedAlertSound,
    status:          'active',
    createdAt:       new Date().toLocaleTimeString(),
    currentPriceWhenCreated: currentPrice,
  };

  alerts.push(newAlert);

  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createAlert: DB save failed', e);
  }

  // Reset form
  document.getElementById('alert-price').value            = '';
  document.getElementById('alert-zone-low').value         = '';
  document.getElementById('alert-zone-high').value        = '';
  document.getElementById('alert-note').value             = '';
  document.getElementById('alert-note-zone').value        = '';

  document.getElementById('alert-timeframe').value        = '';
  document.getElementById('alert-repeat').value           = '0';
  document.getElementById('alert-tap-tolerance').value    = '0.2';


  delete document.getElementById('alert-price').dataset.userEdited;
  delete document.getElementById('alert-zone-low').dataset.userEdited;
  delete document.getElementById('alert-zone-high').dataset.userEdited;

  const tfLabel = timeframe ? ` · ${timeframe}` : '';
  if (isZone) {
    showToast('Zone Alert Created', `${assetInfo.symbol} zone ${formatPrice(zoneLow, assetId)}–${formatPrice(zoneHigh, assetId)}${tfLabel} is now active.`, 'success');
  } else if (isTap) {
    showToast('Tap Alert Created', `${assetInfo.symbol} tap at ${formatPrice(targetPrice, assetId)} (±${tapTolerance}%)${tfLabel} is now active.`, 'success');
  } else {
    showToast('Alert Created', `${assetInfo.symbol} ${condition} ${formatPrice(targetPrice, assetId)}${tfLabel} is now active.`, 'success');
  }

  if (telegramEnabled) {
    sendTelegram(tgCreatedMessage(assetInfo.symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance));
  }

  renderAlerts();
  renderWatchlist();
  if (isMobileLayout()) {
    switchAlertTab('active');
    mobileTab('alerts');
  }
}

function deleteAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;

  const isZone  = alert.condition === 'zone';
  const label   = isZone
    ? `${alert.symbol} zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}`
    : `${alert.symbol} ${alert.condition} ${formatPrice(alert.targetPrice, alert.assetId)}`;
  const tf      = alert.timeframe ? ` · ${alert.timeframe}` : '';

  showConfirm(
    'Delete Alert',
    `Remove <b>${label}${tf}</b>?<br><small style="opacity:0.65;font-size:0.75rem">This cannot be undone.</small>`,
    () => {
      deleteAlertFromDB(id);
      alerts = alerts.filter(a => a.id !== id);
      renderAlerts();
      renderWatchlist();
      showToast('Alert Deleted', `${alert.symbol} alert removed.`, 'success');
    }
  );
}

// ── Generic confirmation modal ────────────────────
function showConfirm(title, bodyHtml, onConfirm) {
  // Remove any existing confirm modal
  const existing = document.getElementById('confirm-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99998;
    background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;
    padding:24px;backdrop-filter:blur(4px);
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:14px;
      padding:24px 22px;
      max-width:320px;width:100%;
      box-shadow:0 8px 40px rgba(0,0,0,0.5);
    ">
      <div style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--muted);margin-bottom:8px;">${title.toUpperCase()}</div>
      <div style="font-size:0.9rem;line-height:1.5;margin-bottom:22px;">${bodyHtml}</div>
      <div style="display:flex;gap:10px;">
        <button id="confirm-cancel" style="
          flex:1;padding:12px;border-radius:8px;
          background:transparent;border:1px solid var(--border);
          color:var(--muted);font-family:var(--mono);font-size:0.7rem;
          letter-spacing:0.08em;cursor:pointer;
        ">CANCEL</button>
        <button id="confirm-ok" style="
          flex:1;padding:12px;border-radius:8px;
          background:rgba(255,61,90,0.15);border:1px solid rgba(255,61,90,0.4);
          color:var(--red);font-family:var(--mono);font-size:0.7rem;
          letter-spacing:0.08em;cursor:pointer;font-weight:700;
        ">DELETE</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-ok').onclick     = () => { overlay.remove(); onConfirm(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function toggleAlert(id) {
  const a = alerts.find(a => a.id === id);
  if (!a) return;
  if (a.status === 'active') a.status = 'paused';
  else if (a.status === 'paused') a.status = 'active';
  updateAlert(id, { status: a.status });
  renderAlerts();
}

function dismissAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  // Save to history in DB
  saveAlertToHistory(alert);
  // Add to local history array
  alertHistory.unshift({
    id: Date.now() + Math.random(),
    symbol: alert.symbol,
    assetId: alert.assetId,
    condition: alert.condition,
    targetPrice: alert.targetPrice,
    triggeredAt: Date.now(),
    triggeredPrice: alert.triggeredPrice,
    note: alert.note || '',
  });
  saveAlertHistory();
  // Remove from active alerts
  deleteAlertFromDB(id);
  alerts = alerts.filter(a => a.id !== id);
  renderAlerts();
  renderWatchlist();
  if (lwCurrentAsset) drawAlertLines(lwCurrentAsset.id);
}

// ── Alert condition SVG icons ─────────────────────────
// Used in badge labels and detail lines throughout the alert card UI.
const ALERT_ICONS = {
  above:     `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,7 5,3 9,7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  below:     `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,3 5,7 9,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  zone:      `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><rect x="1" y="3" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="0.8" stroke-dasharray="1.5 1.5"/></svg>`,
  tap:       `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>`,
  paused:    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><rect x="1.5" y="1" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.7"/><rect x="6" y="1" width="2.5" height="8" rx="1" fill="currentColor" opacity="0.7"/></svg>`,
  triggered: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inzone:    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><rect x="1" y="3" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.2"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/></svg>`,
  near:      `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.5"/><circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.8"/></svg>`,
  active:    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:3px"><circle cx="5" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1" fill="currentColor"/></svg>`,
};

// ── Button SVG icons for alert actions ───────────────────────────────────────
const SVG_DELETE  = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const SVG_DISMISS = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SVG_RESUME  = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><polygon points="1,1 9,5 1,9" fill="currentColor"/></svg>';
const SVG_PAUSE   = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><rect x="1.5" y="1" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="6" y="1" width="2.5" height="8" rx="1" fill="currentColor"/></svg>';
const SVG_EDIT    = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="display:inline-block;vertical-align:middle;margin-right:4px"><path d="M1 7.5L2.5 9 8 3.5 6.5 2 1 7.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="5.5" y1="2.5" x2="7.5" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

function renderAlerts() {
  const container = document.getElementById('alerts-list');
  if (!container) return;

  const active = alerts.filter(a => a.status === 'active').length;
  document.getElementById('alert-count').textContent  = alerts.length;
  document.getElementById('activeCount').textContent  = active;
  document.getElementById('triggeredCount').textContent = triggeredToday;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 6C16.27 6 10 12.27 10 20v13L6 37h36l-4-4V20C38 12.27 31.73 6 24 6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none" opacity="0.4"/><path d="M19 38c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.4"/></svg></div><p>No alerts yet.<br>Select an asset and set a<br>price target to get started.</p></div>`;
    return;
  }

  container.innerHTML = '';
  [...alerts].reverse().forEach(alert => {
    const div = document.createElement('div');

    if (alert.condition === 'setup') {
      renderSetupCard(alert, div);
      container.appendChild(div);
      return;
    }

    const isTriggered = alert.status === 'triggered';
    const dir = alert.triggeredDirection || alert.condition;
    div.className = isTriggered ? `alert-item triggered-${dir}` : `alert-item active-alert`;

    let badgeClass, badgeLabel;
    const isRepeatingZone = alert.condition === 'zone' && (alert.repeatInterval || 0) > 0;
    const zoneInProgress  = isRepeatingZone && alert.zoneTriggeredOnce;
    const currentLivePrice = priceData[alert.assetId]?.price || 0;
    const isCurrentlyInZone = alert.condition === 'zone' && currentLivePrice > 0
      && currentLivePrice >= alert.zoneLow && currentLivePrice <= alert.zoneHigh;

    if (isTriggered) {
      if (alert.condition === 'zone')      { badgeClass = 'badge-triggered-below'; badgeLabel = `${ALERT_ICONS.zone}TRIGGERED`; }
      else if (alert.condition === 'tap')  { badgeClass = 'badge-triggered-above'; badgeLabel = `${ALERT_ICONS.triggered}TAPPED`; }
      else { badgeClass = `badge-triggered-${dir}`; badgeLabel = dir === 'above' ? `${ALERT_ICONS.above}TRIGGERED` : `${ALERT_ICONS.below}TRIGGERED`; }
    } else if (zoneInProgress && isCurrentlyInZone) {
      badgeClass = 'badge-zone-active'; badgeLabel = `${ALERT_ICONS.inzone}IN ZONE`;
    } else if (zoneInProgress && !isCurrentlyInZone) {
      badgeClass = 'badge-zone-exited'; badgeLabel = `${ALERT_ICONS.zone}EXITED`;
    } else if (alert.status === 'paused') {
      badgeClass = 'badge-inactive'; badgeLabel = `${ALERT_ICONS.paused}PAUSED`;
    } else {
      badgeClass = 'badge-active'; badgeLabel = `${ALERT_ICONS.active}ACTIVE`;
    }

    const triggeredLine = isTriggered
      ? `<span style="color:${dir === 'above' || alert.condition === 'tap' ? 'var(--green)' : 'var(--red)'}">Hit ${formatPrice(alert.triggeredPrice, alert.assetId)} at ${formatTriggeredAt(alert.triggeredAt)}</span><br>`
      : (zoneInProgress && isCurrentlyInZone)
        ? `<span style="color:var(--accent);font-size:0.78rem;">Price inside zone · alerting every ${alert.repeatInterval}m</span><br>`
      : (zoneInProgress && !isCurrentlyInZone)
        ? `<span style="color:var(--red);font-size:0.78rem;">Price exited zone · watching for re-entry</span><br>`
      : '';

    let detailLine;
    if (alert.condition === 'zone') {
      detailLine = `<strong>${ALERT_ICONS.zone}ZONE</strong> ${formatPrice(alert.zoneLow, alert.assetId)} – ${formatPrice(alert.zoneHigh, alert.assetId)}${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}${alert.repeatInterval ? ` <span style="opacity:0.6;font-size:0.75em">· every ${alert.repeatInterval}m</span>` : ''}`;
    } else if (alert.condition === 'tap') {
      detailLine = `<strong>${ALERT_ICONS.tap}TAP LEVEL</strong> ${formatPrice(alert.targetPrice, alert.assetId)} <span style="opacity:0.6;font-size:0.75em">· ±${alert.tapTolerance}% tolerance</span>${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}`;
    } else {
      detailLine = `<strong>${alert.condition === 'above' ? ALERT_ICONS.above + 'ABOVE' : ALERT_ICONS.below + 'BELOW'}</strong> ${formatPrice(alert.targetPrice, alert.assetId)}${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}`;
    }

    const isRepeat     = (alert.condition === 'zone' || alert.condition === 'tap') && (alert.repeatInterval || 0) > 0;
    const hasEverFired = !!alert.zoneTriggeredOnce || !!alert.tapTriggeredOnce || alert.status === 'triggered';
    const btnDelete  = `<button class="alert-action-btn delete"  onclick="deleteAlert('${alert.id}')">${SVG_DELETE}DELETE</button>`;
    const btnDismiss = `<button class="alert-action-btn dismiss" onclick="dismissAlert('${alert.id}')">${SVG_DISMISS}DISMISS</button>`;
    const btnEdit    = `<button class="alert-action-btn toggle"  onclick="editAlert('${alert.id}')" title="Edit alert">${SVG_EDIT}EDIT</button>`;
    const btnPause   = alert.status === 'paused'
      ? `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${SVG_RESUME}RESUME</button>`
      : `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${SVG_PAUSE}PAUSE</button>`;

    const actions = isTriggered || (isRepeat && hasEverFired)
      ? btnDismiss + btnDelete
      : btnEdit + btnPause + btnDelete;

    div.innerHTML = `
      <div class="alert-header-row">
        <div class="alert-symbol">${alert.symbol}</div>
        <div class="alert-badge ${badgeClass}">${badgeLabel}</div>
      </div>
      <div class="alert-detail">
        ${detailLine}<br>
        ${triggeredLine}
        ${alert.note ? `<em style="color:var(--muted)">"${alert.note}"</em><br>` : ''}
        Set at ${alert.createdAt}
      </div>
      <div class="alert-actions">${actions}</div>`;
    container.appendChild(div);
  });

  const dot = document.getElementById('alert-dot');
  if (dot) dot.classList.toggle('show', alerts.some(a => a.status === 'active'));
  if (lwCurrentAsset) drawAlertLines(lwCurrentAsset.id);
}


// ═══════════════════════════════════════════════
// ALERT HISTORY — persistence + rendering
// ═══════════════════════════════════════════════
async function saveAlertHistory() {
  // Always keep localStorage as fast local cache
  try { localStorage.setItem('tw_alert_history', JSON.stringify(alertHistory)); } catch(e) {}
}
async function initAlertHistory() {
  // Try DB first, fall back to localStorage
  const dbHistory = await loadAlertHistoryFromDB();
  if (dbHistory !== null) {
    alertHistory = dbHistory;
  } else {
    try {
      const raw = localStorage.getItem('tw_alert_history');
      if (raw) alertHistory = JSON.parse(raw);
    } catch(e) {}
  }
}

function clearAlertHistory() {
  const btn = document.querySelector('.hist-clear-btn');
  if (!btn) return;
  if (btn.classList.contains('confirming')) {
    alertHistory = [];
    saveAlertHistory();
    clearAlertHistoryFromDB(); // also clear from DB
    renderHistory();
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="1,3 11,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="4.5,3 4.5,1.5 7.5,1.5 7.5,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Clear History`;
    btn.classList.remove('confirming');
  } else {
    btn.textContent = 'Tap again to confirm';
    btn.classList.add('confirming');
    setTimeout(() => {
      if (btn.classList.contains('confirming')) {
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="1,3 11,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2.5 3l.7 7h5.6l.7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="4.5,3 4.5,1.5 7.5,1.5 7.5,3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Clear History`;
        btn.classList.remove('confirming');
      }
    }, 3000);
  }
}

let currentAlertTab = 'active';
function switchAlertTab(tab) {
  currentAlertTab = tab;
  const listEl = document.getElementById('alerts-list');
  const histEl = document.getElementById('alerts-history');
  if (tab === 'active') {
    if (listEl) listEl.style.removeProperty('display');
    if (histEl) histEl.style.display = 'none';
  } else {
    if (listEl) listEl.style.display = 'none';
    if (histEl) histEl.style.removeProperty('display');
    renderHistory();
  }
  document.getElementById('atab-active')?.classList.toggle('active',  tab === 'active');
  document.getElementById('atab-history')?.classList.toggle('active', tab === 'history');
}


function setHistoryFilter(f) {
  alertHistoryFilter = f;
  ['7d','30d','3m','custom'].forEach(k => {
    document.getElementById('hf-' + k).classList.toggle('active', k === f);
  });
  document.getElementById('hf-custom-row').classList.toggle('show', f === 'custom');
  if (f !== 'custom') renderHistory();
}

function applyCustomHistoryFilter() {
  const from = document.getElementById('hf-from').value;
  const to   = document.getElementById('hf-to').value;
  if (!from || !to) return;
  historyCustomFrom = new Date(from);
  historyCustomTo   = new Date(to); historyCustomTo.setHours(23,59,59,999);
  renderHistory();
}

function getHistoryWindowMs() {
  const now = Date.now();
  if (alertHistoryFilter === '7d')     return [now - 7  * 864e5, now];
  if (alertHistoryFilter === '30d')    return [now - 30 * 864e5, now];
  if (alertHistoryFilter === '3m')     return [now - 91 * 864e5, now];
  if (alertHistoryFilter === 'custom' && historyCustomFrom && historyCustomTo)
    return [historyCustomFrom.getTime(), historyCustomTo.getTime()];
  return [now - 7 * 864e5, now];
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const [fromMs, toMs] = getHistoryWindowMs();
  const filtered = alertHistory.filter(h => h.triggeredAt >= fromMs && h.triggeredAt <= toMs);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="hist-empty">No triggered alerts<br>in this time period.</div>`;
    return;
  }

  // Build summary counts
  const aboveCount = filtered.filter(h => h.condition === 'above').length;
  const belowCount = filtered.filter(h => h.condition === 'below').length;

  // Group by assetId
  const groups = {};
  filtered.forEach(h => {
    if (!groups[h.assetId]) groups[h.assetId] = { symbol: h.symbol, entries: [] };
    groups[h.assetId].entries.push(h);
  });
  // Sort each group newest first
  Object.values(groups).forEach(g => g.entries.sort((a,b) => b.triggeredAt - a.triggeredAt));
  // Sort groups by most recent trigger
  const sortedGroups = Object.entries(groups).sort((a,b) =>
    b[1].entries[0].triggeredAt - a[1].entries[0].triggeredAt
  );

  let html = `<div class="hist-summary">
    <div>${filtered.length} trigger${filtered.length !== 1 ? 's' : ''}</div>
    <div>${ALERT_ICONS.above}Above: <span>${aboveCount}</span></div>
    <div>${ALERT_ICONS.below}Below: <span>${belowCount}</span></div>
  </div>`;

  sortedGroups.forEach(([assetId, group]) => {
    const isOpen = historyExpandedAsset === assetId;
    const lastTrigger = new Date(group.entries[0].triggeredAt).toLocaleDateString();
    html += `
      <div class="hist-asset-group">
        <div class="hist-asset-header" onclick="toggleHistoryGroup('${assetId}')">
          <div class="hist-asset-name">${group.symbol}</div>
          <div class="hist-asset-meta">
            <span class="hist-count">${group.entries.length} alert${group.entries.length !== 1 ? 's' : ''}</span>
            <span style="font-family:var(--mono);font-size:0.6rem;color:var(--muted)">${lastTrigger}</span>
            <svg class="hist-chevron${isOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <polyline points="2,4 6,8 10,4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <div class="hist-entries${isOpen ? ' open' : ''}">
          ${group.entries.map(h => {
            const ts = new Date(h.triggeredAt);
            const dateStr = ts.toLocaleDateString(undefined, { month:'short', day:'numeric' });
            const timeStr = ts.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
            return `
            <div class="hist-entry">
              <div class="hist-entry-left">
                <span class="hist-entry-dir hist-dir-${h.condition}">${h.condition === 'above' ? ALERT_ICONS.above + 'ABOVE' : h.condition === 'below' ? ALERT_ICONS.below + 'BELOW' : h.condition === 'zone' ? ALERT_ICONS.zone + 'ZONE' : ALERT_ICONS.tap + 'TAP'}</span>
                <span class="hist-entry-price">Target: ${formatPrice(h.targetPrice, h.assetId)}</span>
                ${h.note ? `<span class="hist-entry-note">"${h.note}"</span>` : ''}
              </div>
              <div class="hist-entry-right">
                <div class="hist-triggered-price">${formatPrice(h.triggeredPrice, h.assetId)}</div>
                <div>${dateStr}</div>
                <div>${timeStr}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function toggleHistoryGroup(assetId) {
  historyExpandedAsset = historyExpandedAsset === assetId ? null : assetId;
  renderHistory();
}
// ── Market hours helpers (client-side mirror of Edge Function logic) ──────────
function isForexOpen(now) {
  const day = now.getUTCDay(), hour = now.getUTCHours();
  if (day === 6) return false;
  if (day === 0 && hour < 21) return false;
  return true;
}
function isStockOpen(now) {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  return mins >= 870 && mins < 1260;
}
function isMarketOpenForAsset(assetId, now) {
  const asset = ASSET_BY_ID.get(assetId);
  if (!asset) return true; // unknown asset — don't block

  // Synthetics category (all Deriv synthetic indices) trade 24/7
  if (asset.cat === 'synthetics') return true;

  // Crypto — always open
  if (asset.cat === 'crypto') return true;

  // Unavailable assets — no live price, don't trigger alerts on them
  if (asset.sources?.[0] === 'unavailable') return false;

  // Indices via Deriv (US500, UK100 etc) — Deriv runs extended hours / near 24/7
  if (asset.cat === 'indices' && asset.derivSym) return true;

  // Indices via OANDA only — follow exchange hours (treat as stock hours)
  if (asset.cat === 'indices' && asset.oandaSym) return isStockOpen(now);

  // Commodities and Forex — follow forex hours (Sun 21:00 UTC → Fri 22:00 UTC)
  if (asset.cat === 'commodities' || asset.cat === 'forex') return isForexOpen(now);

  // Stocks — US market hours (Mon–Fri 09:30–16:00 ET = 13:30–20:00 UTC)
  return isStockOpen(now);
}

function checkAlerts() {
  const now = Date.now();
  const nowDate = new Date(now);
  alerts.forEach(alert => {
    if (alert.status !== 'active') return;

    // Don't fire on stale weekend/after-hours prices
    if (!isMarketOpenForAsset(alert.assetId, nowDate)) return;

    const currentPrice = priceData[alert.assetId]?.price || prices[alert.assetId];
    if (!currentPrice) return;

    const isZone      = alert.condition === 'zone';
    const isTap       = alert.condition === 'tap';
    let fired = false;

    if (isZone) {
      const inZone = currentPrice >= alert.zoneLow && currentPrice <= alert.zoneHigh;
      if (!inZone) {
        // Price left the zone — reset so it can fire again on re-entry
        if (alert.zoneTriggeredOnce) {
          alert.zoneTriggeredOnce = false;
          updateAlert(alert.id, { last_triggered_at: null });
        }
        return;
      }
      const repeatMs = (alert.repeatInterval || 0) * 60 * 1000;
      const lastFired = alert.lastTriggeredAt || 0;
      if (repeatMs === 0) {
        if (alert.zoneTriggeredOnce) return;
        alert.zoneTriggeredOnce = true;
        alert.status = 'triggered';
      } else {
        if (now - lastFired < repeatMs) return;
        alert.lastTriggeredAt = now;
        alert.zoneTriggeredOnce = true;
        // Persist so badge survives reload
        updateAlert(alert.id, { last_triggered_at: new Date().toISOString() });
      }
      fired = true;
    } else if (isTap) {
      const tol = (alert.tapTolerance || 0.2) / 100;
      const withinRange = Math.abs(currentPrice - alert.targetPrice) / alert.targetPrice <= tol;
      if (!withinRange) { alert.tapTriggeredOnce = false; return; }
      if (alert.tapTriggeredOnce) return;
      alert.tapTriggeredOnce = true;
      alert.status = 'triggered';
      fired = true;
    } else {
      fired =
        (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.condition === 'below' && currentPrice <= alert.targetPrice);
      if (!fired) return;
      alert.status = 'triggered';
    }

    alert.triggeredDirection = alert.condition;
    alert.triggeredAt    = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    alert.triggeredPrice = currentPrice;
    triggeredToday++;

    if (!isZone || (alert.repeatInterval || 0) === 0) {
      updateAlert(alert.id, {
        status:          'triggered',
        triggered_at:    new Date().toISOString(),
        triggered_price: currentPrice,
        triggered_direction: alert.condition,
      });
    }

    const tfLabel = alert.timeframe ? ` [${alert.timeframe}]` : '';
    let msg;
    if (isZone) {
      msg = `Entered zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}${tfLabel} | Current price: ${formatPrice(currentPrice, alert.assetId)}`;
    } else if (isTap) {
      msg = `Tapped ${formatPrice(alert.targetPrice, alert.assetId)} (±${alert.tapTolerance}%)${tfLabel} | Current: ${formatPrice(currentPrice, alert.assetId)}`;
    } else {
      msg = `${alert.condition === 'above' ? 'Rose above' : 'Fell below'} ${formatPrice(alert.targetPrice, alert.assetId)}${tfLabel} | Current: ${formatPrice(currentPrice, alert.assetId)}`;
    }

    showToast(`ALERT TRIGGERED — ${alert.symbol}`, msg, 'alert');
    playAlertSound(alert.sound || selectedAlertSound);
    const isRepeating = isZone && (alert.repeatInterval || 0) > 0;
    if (telegramEnabled && !isRepeating) {
      sendTelegram(tgAlertMessage('trigger', alert.symbol, alert.condition,
        alert.targetPrice, currentPrice, alert.assetId,
        alert.note, alert.timeframe, alert.zoneLow, alert.zoneHigh,
        alert.repeatInterval, alert.tapTolerance));
    }
    renderAlerts();
  });
}

// ═══════════════════════════════════════════════
// SOUND ENGINE (Web Audio API — no external files)

// ═══════════════════════════════════════════════
// TRADE SETUP ALERT — Entry/SL/TP1/TP2/TP3
// A single "setup" alert tracks the full trade lifecycle
// ═══════════════════════════════════════════════

let setupDirection  = 'long';
let setupTp2Notify  = true;

function setSetupDirection(dir) {
  setupDirection = dir;
  document.getElementById('setup-long-btn').classList.toggle('active', dir === 'long');
  document.getElementById('setup-short-btn').classList.toggle('active', dir === 'short');
  updateSetupPricePlaceholders(dir);
}

function updateSetupPricePlaceholders(dir) {
  // Never overwrite fields while editing an existing setup alert
  if (editingAlertId) return;
  const rawPrice = selectedAsset ? (priceData[selectedAsset.id]?.price || null) : null;
  const p = rawPrice ? parseFloat(rawPrice) : null;
  const assetId = selectedAsset?.id || '';

  // Helper: format to appropriate decimal places for the asset
  const fmt = (val) => val ? formatPrice(val, assetId) : '';

  // Calculate sensible default levels based on direction and live price
  let entryVal, slVal, tp1Val, tp2Val, tp3Val;
  if (p) {
    // Use pip-based % offsets — forex ~0.3%, crypto ~1%, synthetics ~0.5%
    const isCrypto = selectedAsset?.cat === 'crypto';
    const isForex  = selectedAsset?.cat === 'forex';
    const slPct    = isCrypto ? 0.015 : isForex ? 0.003 : 0.007;
    const tp1Pct   = isCrypto ? 0.025 : isForex ? 0.005 : 0.012;

    if (dir === 'long') {
      entryVal = p;
      slVal    = p * (1 - slPct);
      tp1Val   = p * (1 + tp1Pct);
      tp2Val   = p * (1 + tp1Pct * 2);
      tp3Val   = p * (1 + tp1Pct * 3);
    } else {
      entryVal = p;
      slVal    = p * (1 + slPct);
      tp1Val   = p * (1 - tp1Pct);
      tp2Val   = p * (1 - tp1Pct * 2);
      tp3Val   = p * (1 - tp1Pct * 3);
    }
  }

  const fields = [
    { id: 'setup-entry', hint: dir === 'long' ? 'Entry price (long)' : 'Entry price (short)', val: entryVal },
    { id: 'setup-sl',    hint: dir === 'long' ? 'Stop loss — below entry' : 'Stop loss — above entry', val: slVal },
    { id: 'setup-tp1',   hint: dir === 'long' ? 'TP1 — above entry' : 'TP1 — below entry', val: tp1Val },
    { id: 'setup-tp2',   hint: dir === 'long' ? 'TP2 — optional' : 'TP2 — optional', val: tp2Val },
    { id: 'setup-tp3',   hint: dir === 'long' ? 'TP3 — optional' : 'TP3 — optional', val: tp3Val },
  ];

  fields.forEach(({ id, hint, val }) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Placeholder always shows formatted hint
    el.placeholder = val ? fmt(val) : hint;
    // Pre-fill ONLY if user hasn't edited AND not in edit mode
    // Use RAW numeric string — input[type=number] rejects "$1,234.56"
    if (!el.dataset.userEdited && !editingAlertId && val) {
      // Round to appropriate decimal places for the asset
      const decimals = (assetId.includes('/') && !assetId.startsWith('XAU') && !assetId.startsWith('XAG')) ? 5 : 2;
      el.value = parseFloat(val).toFixed(decimals);
    }
  });
}

function setTp2Notify(val) {
  setupTp2Notify = val;
  document.getElementById('setup-tp2notify-yes').classList.toggle('active', val);
  document.getElementById('setup-tp2notify-no').classList.toggle('active', !val);
}

function onConditionChange() {
  const condition = document.getElementById('alert-condition').value;
  const isZone    = condition === 'zone';
  const isTap     = condition === 'tap';
  const isSetup   = condition === 'setup';
  document.getElementById('alert-single-row').style.display = (isZone || isSetup) ? 'none' : '';
  document.getElementById('alert-zone-row').style.display   = isZone  ? '' : 'none';
  document.getElementById('alert-tap-row').style.display    = isTap   ? '' : 'none';
  document.getElementById('alert-setup-row').style.display  = isSetup ? '' : 'none';
  // Hide timeframe + sound rows when setup (has its own timeframe)
  const row3 = document.querySelector('.alert-form .form-row:has(#alert-timeframe)');
  if (row3) row3.style.display = isSetup ? 'none' : '';
}

async function createSetupAlert() {
  if (!selectedAsset) return showToast('No Asset', 'Select an asset first.', 'error');

  const entry     = parseFloat(document.getElementById('setup-entry').value);
  const sl        = parseFloat(document.getElementById('setup-sl').value);
  const tp1       = parseFloat(document.getElementById('setup-tp1').value);
  const tp2       = parseFloat(document.getElementById('setup-tp2').value) || null;
  const tp3       = parseFloat(document.getElementById('setup-tp3').value) || null;
  const timeframe = document.getElementById('setup-timeframe').value;
  const setupType = document.getElementById('setup-type').value;
  const entryReason    = document.getElementById('setup-entry-reason').value.trim();
  const htfContext     = document.getElementById('setup-htf-context').value.trim();
  const emotionBefore  = document.getElementById('setup-emotion-before').value;

  // ── If editing an existing setup alert, update it instead of creating new ──
  if (editingAlertId) {
    const existing = alerts.find(a => a.id === editingAlertId);
    if (existing) {
      const oldJ = getJournal(existing);
      const updatedJournal = {
        ...oldJ,
        direction:     setupDirection,
        sl:            isNaN(sl)   ? oldJ.sl   : sl,
        tp1:           isNaN(tp1)  ? oldJ.tp1  : tp1,
        tp2:           tp2 !== null ? tp2 : oldJ.tp2 || null,
        tp3:           tp3 !== null ? tp3 : oldJ.tp3 || null,
        tp2Notify:     setupTp2Notify,
        setupType:     setupType   || oldJ.setupType   || null,
        entryReason:   entryReason || oldJ.entryReason || null,
        htfContext:    htfContext  || oldJ.htfContext  || null,
        emotionBefore: emotionBefore || oldJ.emotionBefore || null,
        tradeStatus:   oldJ.tradeStatus || 'watching',
      };
      Object.assign(existing, {
        targetPrice:  isNaN(entry) ? existing.targetPrice : entry,
        zoneLow:      isNaN(entry) || isNaN(sl) ? existing.zoneLow  : Math.min(entry, sl),
        zoneHigh:     isNaN(entry) || isNaN(sl) ? existing.zoneHigh : Math.max(entry, sl),
        timeframe:    timeframe || null,
        note:         JSON.stringify(updatedJournal),
        status:       'active',
      });
      await updateAlert(editingAlertId, {
        target_price: existing.targetPrice,
        zone_low:     existing.zoneLow,
        zone_high:    existing.zoneHigh,
        timeframe:    existing.timeframe,
        note:         existing.note,
        status:       'active',
      });
      editingAlertId = null;
      const btn = document.getElementById('set-alert-btn');
      if (btn) { btn.textContent = 'SET ALERT'; btn.style.background = ''; btn.style.borderColor = ''; }
      // Clear ALL form fields so they don't linger for next alert
      ['setup-entry','setup-sl','setup-tp1','setup-tp2','setup-tp3',
       'setup-entry-reason','setup-htf-context'].forEach(fid => {
        const fel = document.getElementById(fid);
        if (fel) { fel.value = ''; delete fel.dataset.userEdited; }
      });
      ['setup-type','setup-timeframe','setup-emotion-before'].forEach(fid => {
        const fel = document.getElementById(fid);
        if (fel) fel.selectedIndex = 0;
      });
      renderAlerts();
      showToast('Setup Updated', `${existing.symbol} setup alert updated.`, 'success');
      // Send Telegram update notification with new values
      if (telegramEnabled && telegramChatId) {
        const uj = JSON.parse(existing.note);
        sendTelegram(tgSetupUpdatedMessage(
          existing.symbol, uj.direction, existing.targetPrice,
          uj.sl, uj.tp1, uj.tp2, uj.tp3, existing.timeframe, uj
        ));
      }
      if (isMobileLayout()) { switchAlertTab('active'); mobileTab('alerts'); }
      return;
    }
  }


  if (isNaN(entry) || entry <= 0) return showToast('Missing Entry', 'Enter a valid entry price.', 'error');
  if (isNaN(sl)    || sl    <= 0) return showToast('Missing SL', 'Enter a valid stop loss.', 'error');
  if (isNaN(tp1)   || tp1   <= 0) return showToast('Missing TP1', 'Enter at least TP1.', 'error');

  // Validate direction logic
  if (setupDirection === 'long') {
    if (sl >= entry) return showToast('Invalid SL', 'For a long, SL must be below entry.', 'error');
    if (tp1 <= entry) return showToast('Invalid TP1', 'For a long, TP1 must be above entry.', 'error');
  } else {
    if (sl <= entry) return showToast('Invalid SL', 'For a short, SL must be above entry.', 'error');
    if (tp1 >= entry) return showToast('Invalid TP1', 'For a short, TP1 must be below entry.', 'error');
  }

  // Pack all journal + trade data into the note field as JSON
  const journal = {
    direction:       setupDirection,
    sl,
    tp1,
    tp2:             tp2 || null,
    tp3:             tp3 || null,
    tp2Notify:       setupTp2Notify,
    setupType:       setupType || null,
    entryReason:     entryReason    || null,
    htfContext:      htfContext     || null,
    emotionBefore:   emotionBefore  || null,

    tradeStatus:     'watching',
  };

  const newAlert = {
    id:           'temp_' + alertIdCounter++,
    assetId:      selectedAsset.id,
    symbol:       selectedAsset.symbol,
    name:         selectedAsset.name,
    condition:    'setup',
    targetPrice:  entry,   // entry price
    zoneLow:      Math.min(entry, sl),
    zoneHigh:     Math.max(entry, sl),
    tapTolerance: null,
    timeframe:    timeframe || null,
    repeatInterval: 0,
    note:         JSON.stringify(journal),
    sound:        selectedAlertSound,
    status:       'active',
    createdAt:    new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
  };

  alerts.push(newAlert);

  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createSetupAlert: DB save failed', e);
  }

  // Send Telegram setup confirmation
  if (telegramEnabled && telegramChatId) {
    sendTelegram(tgSetupCreatedMessage(selectedAsset.symbol, setupDirection, entry, sl, tp1, tp2, tp3, timeframe, journal));
  }

  // Reset form
  ['setup-entry','setup-sl','setup-tp1','setup-tp2','setup-tp3','setup-entry-reason','setup-htf-context'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; delete el.dataset.userEdited; }
  });
  ['setup-type','setup-timeframe','setup-emotion-before'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  renderAlerts();
  showToast('Trade Setup Created', `${selectedAsset.symbol} setup alert active — watching for entry at ${formatPrice(entry, selectedAsset.id)}.`, 'success');
  if (isMobileLayout()) { switchAlertTab('active'); mobileTab('alerts'); }
}

// ── Parse journal from alert.note ─────────────────────────────────────────
function getJournal(alert) {
  try { return JSON.parse(alert.note || '{}'); } catch(e) { return {}; }
}

// ── Trade status badge info ────────────────────────────────────────────────
function getSetupBadge(alert) {
  const j = getJournal(alert);
  const status = j.tradeStatus || 'watching';
  switch (status) {
    case 'watching':  return { cls: 'badge-watching', label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><ellipse cx="5" cy="5" rx="4" ry="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/></svg> WATCHING' };
    case 'entry_hit': return { cls: 'badge-running',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="2,1.5 9,5 2,8.5" fill="currentColor"/></svg> ENTRY HIT' };
    case 'running':   return { cls: 'badge-running',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="2,1.5 9,5 2,8.5" fill="currentColor"/></svg> RUNNING' };
    case 'tp1_hit':   return { cls: 'badge-tp1-hit',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP1 HIT' };
    case 'tp2_hit':   return { cls: 'badge-tp2-hit',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP2 HIT' };
    case 'full_tp':   return { cls: 'badge-full-tp',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,1 6.2,3.8 9.3,3.8 6.8,5.8 7.7,8.8 5,7 2.3,8.8 3.2,5.8 0.7,3.8 3.8,3.8" fill="currentColor"/></svg> FULL TP' };
    case 'sl_hit':    return { cls: 'badge-sl-hit',   label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3.2" y1="3.2" x2="6.8" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6.8" y1="3.2" x2="3.2" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> SL HIT' };
    default:          return { cls: 'badge-watching',  label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><ellipse cx="5" cy="5" rx="4" ry="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="5" cy="5" r="1.2" fill="currentColor"/></svg> WATCHING' };
  }
}

// ── Render setup alert card ────────────────────────────────────────────────
function renderSetupCard(alert, div) {
  const j   = getJournal(alert);
  const dir = j.direction === 'long' ? 'LONG' : 'SHORT';
  const dirColor = j.direction === 'long' ? 'var(--green)' : 'var(--red)';
  const badge = getSetupBadge(alert);

  const rrRaw = j.tp1 && j.sl && alert.targetPrice
    ? Math.abs(j.tp1 - alert.targetPrice) / Math.abs(alert.targetPrice - j.sl)
    : null;
  const rr = rrRaw ? ` · RR ${rrRaw.toFixed(1)}:1` : '';

  const statusClass = {
    watching:  'trade-watching', entry_hit: 'trade-running', running: 'trade-running',
    tp1_hit: 'trade-running', tp2_hit: 'trade-running',
    full_tp: 'trade-full-tp', sl_hit: 'trade-sl-hit',
  }[j.tradeStatus || 'watching'] || 'trade-watching';

  div.className = `alert-item ${statusClass}`;

  const levels = [
    `<span style="color:var(--muted);font-size:0.72rem">Entry</span> <b>${formatPrice(alert.targetPrice, alert.assetId)}</b>`,
    `<span style="color:var(--red);font-size:0.72rem">SL</span> <b>${formatPrice(j.sl, alert.assetId)}</b>`,
    `<span style="color:var(--green);font-size:0.72rem">TP1</span> <b>${formatPrice(j.tp1, alert.assetId)}</b>`,
    j.tp2 ? `<span style="color:var(--green);font-size:0.72rem">TP2</span> <b>${formatPrice(j.tp2, alert.assetId)}</b>` : null,
    j.tp3 ? `<span style="color:var(--green);font-size:0.72rem">TP3</span> <b>${formatPrice(j.tp3, alert.assetId)}</b>` : null,
  ].filter(Boolean).join('  ');

  const journalLines = [
    j.setupType    ? `<span style="opacity:0.6">Setup:</span> ${j.setupType}` : null,
    j.entryReason  ? `<span style="opacity:0.6">Reason:</span> ${j.entryReason}` : null,
    j.htfContext   ? `<span style="opacity:0.6">HTF:</span> ${j.htfContext}` : null,
    j.emotionBefore ? `<span style="opacity:0.6">Emotion:</span> ${j.emotionBefore}` : null,

  ].filter(Boolean).join('<br>');

  const isFinalState = ['full_tp','sl_hit'].includes(j.tradeStatus || '');
  const btnLog    = `<button class="alert-action-btn dismiss" onclick="logTradeFromAlert('${alert.id}')">LOG TRADE</button>`;
  const btnClose  = `<button class="alert-action-btn toggle"  onclick="dismissSetupAlert('${alert.id}')">CLOSE</button>`;
  const btnEdit   = `<button class="alert-action-btn toggle"  onclick="editSetupAlert('${alert.id}')" title="Edit setup">${SVG_EDIT}EDIT</button>`;
  const btnDelete = `<button class="alert-action-btn delete"  onclick="deleteAlert('${alert.id}')">DELETE</button>`;
  const btnDismiss = isFinalState ? btnLog : btnClose;

  div.innerHTML = `
    <div class="alert-header-row">
      <div class="alert-symbol">${alert.symbol} <span style="color:${dirColor};font-size:0.65rem;font-weight:700">${dir}</span>${rr ? `<span style="color:var(--muted);font-size:0.62rem"> ${rr}</span>` : ''}</div>
      <div class="alert-badge ${badge.cls}">${badge.label}</div>
    </div>
    <div class="alert-detail" style="font-size:0.75rem;line-height:1.9">
      ${levels}
      ${alert.timeframe ? `<br><span style="opacity:0.5;font-size:0.68rem">· ${alert.timeframe}</span>` : ''}
      ${journalLines ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:0.72rem;line-height:1.7">${journalLines}</div>` : ''}
    </div>
    <div class="alert-actions">${btnDismiss}${btnEdit}${btnDelete}</div>`;
}

function dismissSetupAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  showManualCloseForm(alert, getJournal(alert));
}

function editSetupAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  const j = getJournal(alert);

  // ── Step 1: Mark editing state BEFORE selectAsset so updateSetupPricePlaceholders
  //   sees editingAlertId and won't overwrite fields
  editingAlertId = id;

  // ── Step 2: Navigate and select asset FIRST — this triggers updateSetupPricePlaceholders
  //   but since editingAlertId is now set it will skip pre-filling
  if (isMobileLayout()) mobileTab('chart');
  const asset = ASSET_BY_ID.get(alert.assetId);
  if (asset) selectAsset(asset);

  // ── Step 3: Switch condition to setup
  const condEl = document.getElementById('alert-condition');
  if (condEl) { condEl.value = 'setup'; onConditionChange(); }

  // ── Step 4: Set direction
  const dir = j.direction || 'long';
  setSetupDirection(dir);

  // ── Step 5: Populate ALL fields with exact stored values
  //   Use raw numeric strings — input[type=number] rejects "$1,234.56"
  const dec = (alert.assetId || '').includes('/') &&
              !alert.assetId.startsWith('XAU') &&
              !alert.assetId.startsWith('XAG') ? 5 : 2;
  const setNum = (elId, val) => {
    const el = document.getElementById(elId);
    if (!el || val === null || val === undefined || isNaN(parseFloat(val))) return;
    el.value = parseFloat(val).toFixed(dec);
    el.dataset.userEdited = '1';
  };
  setNum('setup-entry', alert.targetPrice);
  setNum('setup-sl',    j.sl);
  setNum('setup-tp1',   j.tp1);
  setNum('setup-tp2',   j.tp2);
  setNum('setup-tp3',   j.tp3);

  const setTxt = (elId, val) => {
    const el = document.getElementById(elId);
    if (el) el.value = val || '';
  };
  setTxt('setup-entry-reason', j.entryReason);
  setTxt('setup-htf-context',  j.htfContext);
  setTxt('setup-type',         j.setupType);

  const tfEl = document.getElementById('setup-timeframe');
  if (tfEl) tfEl.value = alert.timeframe || '';

  const emEl = document.getElementById('setup-emotion-before');
  if (emEl) emEl.value = j.emotionBefore || '';

  // ── Step 6: TP2 notify toggle
  const notify = j.tp2Notify !== false;
  document.getElementById('setup-tp2notify-yes')?.classList.toggle('active',  notify);
  document.getElementById('setup-tp2notify-no')?.classList.toggle('active',  !notify);
  setupTp2Notify = notify;

  // ── Step 7: Update button to UPDATE SETUP
  const btn = document.getElementById('set-alert-btn');
  if (btn) {
    btn.textContent = 'UPDATE SETUP';
    btn.style.background  = 'rgba(0,212,255,0.15)';
    btn.style.borderColor = 'rgba(0,212,255,0.5)';
  }

  showToast('Edit Setup', `Editing ${alert.symbol} setup — adjust values and tap UPDATE SETUP.`, 'alert');
}

function showManualCloseForm(alert, journal) {
  const currentPrice = priceData[alert.assetId]?.price || '';
  const emotions = ['Calm','Confident','Satisfied','Frustrated','Disappointed','Relieved','Neutral','Anxious'];
  showConfirm(
    'Close Trade',
    `<div style="font-size:0.72rem;color:var(--muted);margin-bottom:14px;font-family:var(--mono)">Record how and why you closed this trade early</div>
     <div style="display:flex;flex-direction:column;gap:10px">
       <div>
         <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:4px">EXIT PRICE</label>
         <input id="manual-close-price" type="number" step="any" value="${currentPrice}"
           style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:0.8rem;padding:8px 10px;border-radius:7px;box-sizing:border-box">
       </div>
       <div>
         <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:4px">REASON FOR CLOSING</label>
         <select id="manual-close-reason"
           style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:0.75rem;padding:8px 10px;border-radius:7px;box-sizing:border-box">
           <option value="Secured TP1">Secured TP1 — letting rest run</option>
           <option value="Partial profit">Took partial profit</option>
           <option value="Moved SL to BE">Moved SL to breakeven</option>
           <option value="Reversal signal">Saw reversal signal</option>
           <option value="News event">News event — exiting early</option>
           <option value="End of session">End of trading session</option>
           <option value="Changed bias">Changed market bias</option>
           <option value="Risk management">Risk management</option>
           <option value="Fear / anxiety">Fear / anxiety</option>
           <option value="Target reached">Target reached</option>
           <option value="Manual decision">Manual decision</option>
           <option value="Other">Other</option>
         </select>
       </div>
       <div>
         <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:6px">EMOTION AFTER</label>
         <div style="display:flex;flex-wrap:wrap;gap:6px">
           ${emotions.map(e => `<button onclick="setManualCloseEmotion('${e}',this)"
             data-emotion="${e}"
             style="background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--muted);padding:5px 10px;border-radius:6px;cursor:pointer;font-size:0.72rem;font-family:var(--mono);transition:all 0.15s">${e}</button>`).join('')}
         </div>
       </div>
       <button onclick="confirmManualClose('${alert.id}')"
         style="width:100%;background:var(--accent);color:#000;font-family:var(--mono);font-weight:700;font-size:0.78rem;letter-spacing:0.08em;padding:12px;border:none;border-radius:8px;cursor:pointer;margin-top:4px">
         CLOSE TRADE
       </button>
     </div>`,
    null
  );
}

let _manualCloseEmotion = '';
function setManualCloseEmotion(emotion, btn) {
  _manualCloseEmotion = emotion;
  btn.closest('div').querySelectorAll('[data-emotion]').forEach(b => {
    b.style.background = 'rgba(255,255,255,0.05)';
    b.style.color = 'var(--muted)';
    b.style.borderColor = 'var(--border)';
  });
  btn.style.background = 'rgba(0,212,255,0.12)';
  btn.style.color = 'var(--accent)';
  btn.style.borderColor = 'var(--accent)';
}

async function confirmManualClose(alertId) {
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.style.display = 'none';

  const exitPrice    = parseFloat(document.getElementById('manual-close-price')?.value) || null;
  const reason       = document.getElementById('manual-close-reason')?.value || 'Manual decision';
  const emotionAfter = _manualCloseEmotion || null;
  _manualCloseEmotion = '';

  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;
  const j = getJournal(alert);
  j.emotionAfter = emotionAfter;
  j.closeReason  = reason;
  j.exitPrice    = exitPrice;
  j.tradeStatus  = j.tradeStatus === 'watching' ? 'cancelled' : 'manual_exit';

  saveAlertToHistory({ ...alert, note: JSON.stringify(j) });
  alertHistory.unshift({
    id: Date.now() + Math.random(),
    symbol: alert.symbol, assetId: alert.assetId,
    condition: 'setup', targetPrice: alert.targetPrice,
    triggeredAt: Date.now(), triggeredPrice: exitPrice,
    note: JSON.stringify(j),
  });
  saveAlertHistory();
  deleteAlertFromDB(alertId);
  alerts = alerts.filter(a => a.id !== alertId);
  renderAlerts();
  renderWatchlist();

  // Open journal form pre-filled — user lands there to add screenshots + lessons
  openJournalEntryForm({
    symbol:        alert.symbol,
    direction:     j.direction,
    entry:         alert.targetPrice,
    sl:            j.sl,
    tp1:           j.tp1,
    tp2:           j.tp2,
    tp3:           j.tp3,
    outcome:       'manual_exit',
    timeframe:     alert.timeframe,
    setupType:     j.setupType,
    entryReason:   j.entryReason,
    htfContext:    j.htfContext,
    emotionBefore: j.emotionBefore,
    emotionAfter,
    exitPrice,
    closeReason:   reason,
  });
}

// ── Telegram messages for setup alerts ────────────────────────────────────
function tgSetupCreatedMessage(symbol, direction, entry, sl, tp1, tp2, tp3, timeframe, journal) {
  const dir     = direction === 'long' ? '▲ LONG' : '▼ SHORT';
  const emoji   = direction === 'long' ? '🟢' : '🔴';
  const rrRaw   = tp1 && sl ? Math.abs(tp1 - entry) / Math.abs(entry - sl) : null;
  const rows = [
    tgRow('Direction', `<b>${emoji} ${dir}</b>`),
    tgRow('Entry',     `<b>${entry}</b>`),
    tgRow('Stop Loss', `<b>${sl}</b>`),
    tgRow('TP1',       `<b>${tp1}</b>`),
    tp2 ? tgRow('TP2', `<b>${tp2}</b>`) : null,
    tp3 ? tgRow('TP3', `<b>${tp3}</b>`) : null,
    rrRaw ? tgRow('Risk:Reward', `<b>${rrRaw.toFixed(1)}:1</b>`) : null,
    timeframe ? tgRow('Timeframe', `<b>${timeframe}</b>`) : null,
    journal.setupType    ? tgRow('Setup',     `<i>${journal.setupType}</i>`) : null,
    journal.entryReason  ? tgRow('Reason',    `<i>${journal.entryReason}</i>`) : null,
    journal.htfContext   ? tgRow('HTF',       `<i>${journal.htfContext}</i>`) : null,
  ].filter(Boolean);
  return [
    `📋 <b>TRADE SETUP ACTIVE — ${symbol}</b>`,
    ``,
    `Your trade is queued. Alerts will fire at each level.`,
    ``,
    ...rows,
    ``,
    `<i>🖥 Open your trading platform and place your orders.</i>`,
    ``,
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open TradeWatch →</a>`,
  ].join('\n');
}

function tgSetupUpdatedMessage(symbol, direction, entry, sl, tp1, tp2, tp3, timeframe, journal) {
  const dir   = direction === 'long' ? '▲ LONG' : '▼ SHORT';
  const emoji = direction === 'long' ? '🟢' : '🔴';
  const rrRaw = tp1 && sl ? Math.abs(tp1 - entry) / Math.abs(entry - sl) : null;
  const rows = [
    tgRow('Direction', `<b>${emoji} ${dir}</b>`),
    tgRow('Entry',     `<b>${entry}</b>`),
    tgRow('Stop Loss', `<b>${sl}</b>`),
    tgRow('TP1',       `<b>${tp1}</b>`),
    tp2 ? tgRow('TP2', `<b>${tp2}</b>`) : null,
    tp3 ? tgRow('TP3', `<b>${tp3}</b>`) : null,
    rrRaw ? tgRow('Risk:Reward', `<b>${rrRaw.toFixed(1)}:1</b>`) : null,
    timeframe ? tgRow('Timeframe', `<b>${timeframe}</b>`) : null,
    journal.setupType   ? tgRow('Setup',  `<i>${journal.setupType}</i>`) : null,
    journal.entryReason ? tgRow('Reason', `<i>${journal.entryReason}</i>`) : null,
    journal.htfContext  ? tgRow('HTF',    `<i>${journal.htfContext}</i>`) : null,
  ].filter(Boolean);
  return [
    `✏️ <b>SETUP UPDATED — ${symbol}</b>`,
    ``,
    `Your trade setup has been updated.`,
    ``,
    ...rows,
    ``,
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open TradeWatch →</a>`,
  ].join('\n');
}

function tgSetupLevelMessage(symbol, level, price, assetId, journal) {
  const templates = {
    entry_hit: {
      header: `🚀 <b>ENTRY TRIGGERED — ${symbol}</b>`,
      body:   `Price has hit your entry level. <b>Your trade may now be active.</b>`,
      action: `Open your trading platform and confirm your position is filled. Manage your SL and monitor TP levels.`,
    },
    sl_hit: {
      header: `🛑 <b>STOP LOSS HIT — ${symbol}</b>`,
      body:   `Price reached your stop loss level. Trade is likely closed.`,
      action: `Review your trading platform. Log your emotion and lessons in TradeWatch.`,
    },
    tp1_approaching: {
      header: `👀 <b>TP1 APPROACHING — ${symbol}</b>`,
      body:   `Price is getting close to your first take profit.`,
      action: `Consider securing partial profits at TP1. Move SL to breakeven if your plan allows.`,
    },
    tp1_hit: {
      header: `✅ <b>TP1 HIT — ${symbol}</b>`,
      body:   `Price reached your first take profit target.`,
      action: `Consider banking partial profits. Manage your SL to protect remaining position.`,
    },
    tp2_approaching: {
      header: `👀 <b>TP2 APPROACHING — ${symbol}</b>`,
      body:   `Price is approaching your second take profit.`,
      action: `Decide whether to secure profits at TP2 or let it run to TP3.`,
    },
    tp2_hit: {
      header: `✅ <b>TP2 HIT — ${symbol}</b>`,
      body:   `Price reached your second take profit.`,
      action: `Excellent! Consider protecting remaining position or letting it run to TP3.`,
    },
    full_tp: {
      header: `🏆 <b>FULL TP HIT — ${symbol}</b>`,
      body:   `Price reached your final take profit. Trade fully complete.`,
      action: `Amazing execution! Close your position and log this trade in your journal.`,
    },
  };
  const t = templates[level] || templates['entry_hit'];
  const rows = [
    tgRow('Price', `<b>${price}</b>`),
    journal.direction ? tgRow('Direction', `<b>${journal.direction === 'long' ? '▲ LONG' : '▼ SHORT'}</b>`) : null,
  ].filter(Boolean);
  return [
    t.header, ``, t.body, ``, ...rows, ``, `<i>${t.action}</i>`, ``,
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open TradeWatch →</a>`,
  ].join('\n');
}
// ═══════════════════════════════════════════════
// TradeWatch — Trade Journal
// Dedicated journal page: log, review, study trades
// Images uploaded to Supabase Storage
// ═══════════════════════════════════════════════

let journalEntries     = [];
let jnlDirection       = 'long';
let jnlBeforeFile      = null;
let jnlAfterFile       = null;
let jnlBeforeUrl       = null;
let jnlAfterUrl        = null;

// ── DB helpers ─────────────────────────────────────────────────────────────
async function loadJournalFromDB() {
  if (!currentUserId) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/trade_journal?user_id=eq.${currentUserId}&order=trade_date.desc`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch(e) { return []; }
}

async function saveJournalToDB(entry) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trade_journal`, {
      method:  'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(entry),
    });
    const rows = await res.json();
    return rows?.[0] || null;
  } catch(e) { console.warn('saveJournal failed:', e); return null; }
}

async function deleteJournalEntryFromDB(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/trade_journal?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    });
  } catch(e) {}
}

// ── Supabase Storage: upload screenshot ────────────────────────────────────
async function uploadScreenshot(file, slot) {
  if (!file || !currentUserId) return null;
  try {
    const ext      = file.name.split('.').pop() || 'jpg';
    const path     = `${currentUserId}/${Date.now()}_${slot}.${ext}`;
    const res      = await fetch(
      `${SUPABASE_URL}/storage/v1/object/trade-screenshots/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type':  file.type || 'image/jpeg',
        },
        body: file,
      }
    );
    if (!res.ok) throw new Error('Upload failed');
    return `${SUPABASE_URL}/storage/v1/object/public/trade-screenshots/${path}`;
  } catch(e) {
    console.warn('Screenshot upload failed:', e);
    return null;
  }
}

// ── Preview uploaded image inline before save ──────────────────────────────
function handleScreenshotUpload(slot, input) {
  const file = input.files?.[0];
  if (!file) return;
  const previewId = `jnl-${slot}-preview`;
  const areaId    = `jnl-${slot}-area`;
  const el        = document.getElementById(previewId);
  if (!el) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    el.innerHTML = `<img src="${e.target.result}" class="screenshot-preview-img" alt="screenshot">`;
  };
  reader.readAsDataURL(file);

  if (slot === 'before') jnlBeforeFile = file;
  else                    jnlAfterFile  = file;
}

// ── Journal direction toggle ───────────────────────────────────────────────
function setJnlDir(dir) {
  jnlDirection = dir;
  document.getElementById('jnl-long-btn').classList.toggle('active', dir === 'long');
  document.getElementById('jnl-short-btn').classList.toggle('active', dir === 'short');
}

// ── Open journal modal (standalone or from alert) ─────────────────────────
function openJournalEntryForm(prefill = null) {
  // Reset form
  jnlBeforeFile = null; jnlAfterFile = null;
  jnlBeforeUrl  = null; jnlAfterUrl  = null;
  setJnlDir('long');
  ['jnl-symbol','jnl-entry','jnl-exit','jnl-sl','jnl-tp1','jnl-tp2','jnl-tp3','jnl-pnl','jnl-entry-reason','jnl-htf','jnl-lessons'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['jnl-outcome','jnl-timeframe','jnl-setup-type','jnl-emotion-before','jnl-emotion-after'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  ['jnl-before-preview','jnl-after-preview'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.4"/><circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M3 17l5-5 3 3 3-3 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5"/></svg><span>Tap to upload</span>`;
    if (el) el.className = 'screenshot-preview-empty';
  });
  document.getElementById('jnl-alert-id').value = '';

  // Pre-fill from setup alert if provided
  if (prefill) {
    if (prefill.symbol) document.getElementById('jnl-symbol').value = prefill.symbol;
    if (prefill.direction) setJnlDir(prefill.direction);
    if (prefill.entry)  document.getElementById('jnl-entry').value  = prefill.entry;
    if (prefill.sl)     document.getElementById('jnl-sl').value     = prefill.sl;
    if (prefill.tp1)    document.getElementById('jnl-tp1').value    = prefill.tp1;
    if (prefill.tp2)    document.getElementById('jnl-tp2').value    = prefill.tp2 || '';
    if (prefill.tp3)    document.getElementById('jnl-tp3').value    = prefill.tp3 || '';
    if (prefill.alertId) document.getElementById('jnl-alert-id').value = prefill.alertId;
    if (prefill.setupType) {
      const sel = document.getElementById('jnl-setup-type');
      if (sel) sel.value = prefill.setupType;
    }
    if (prefill.entryReason) document.getElementById('jnl-entry-reason').value = prefill.entryReason;
    if (prefill.htfContext)  document.getElementById('jnl-htf').value           = prefill.htfContext;
    if (prefill.emotionBefore) {
      const sel = document.getElementById('jnl-emotion-before');
      if (sel) sel.value = prefill.emotionBefore;
    }
    if (prefill.outcome) {
      const sel = document.getElementById('jnl-outcome');
      if (sel) sel.value = prefill.outcome;
    }
    if (prefill.timeframe) {
      const sel = document.getElementById('jnl-timeframe');
      if (sel) sel.value = prefill.timeframe;
    }
    if (prefill.emotionAfter) {
      const sel = document.getElementById('jnl-emotion-after');
      if (sel) sel.value = prefill.emotionAfter;
    }
    if (prefill.exitPrice) {
      const el = document.getElementById('jnl-exit');
      if (el) el.value = prefill.exitPrice;
    }
    if (prefill.closeReason) {
      // Put close reason in lessons box as a starting note
      const el = document.getElementById('jnl-lessons');
      if (el && !el.value) el.value = `Closed early: ${prefill.closeReason}`;
    }
  }

  document.getElementById('journal-modal').style.display = 'block';
}

function closeJournalModal() {
  document.getElementById('journal-modal').style.display = 'none';
}

// ── Save a journal entry ────────────────────────────────────────────────────
async function saveJournalEntry() {
  const symbol = (document.getElementById('jnl-symbol').value || '').trim().toUpperCase();
  const entry  = parseFloat(document.getElementById('jnl-entry').value);
  if (!symbol) return showToast('Missing Asset', 'Enter an asset symbol.', 'error');

  showToast('Saving…', 'Uploading screenshots and saving entry.', 'info');

  // Upload screenshots to Supabase Storage
  const [beforeUrl, afterUrl] = await Promise.all([
    uploadScreenshot(jnlBeforeFile, 'before'),
    uploadScreenshot(jnlAfterFile,  'after'),
  ]);

  const record = {
    user_id:          currentUserId,
    asset_id:         symbol.toLowerCase().replace('/', '_'),
    symbol,
    direction:        jnlDirection,
    entry_price:      isNaN(entry) ? null : entry,
    exit_price:       parseFloat(document.getElementById('jnl-exit').value) || null,
    sl_price:         parseFloat(document.getElementById('jnl-sl').value)   || null,
    tp1_price:        parseFloat(document.getElementById('jnl-tp1').value)  || null,
    tp2_price:        parseFloat(document.getElementById('jnl-tp2').value)  || null,
    tp3_price:        parseFloat(document.getElementById('jnl-tp3').value)  || null,
    outcome:          document.getElementById('jnl-outcome').value,
    pnl_pct:          parseFloat(document.getElementById('jnl-pnl').value) || null,
    timeframe:        document.getElementById('jnl-timeframe').value || null,
    setup_type:       document.getElementById('jnl-setup-type').value || null,
    entry_reason:     document.getElementById('jnl-entry-reason').value.trim() || null,
    htf_context:      document.getElementById('jnl-htf').value.trim() || null,
    emotion_before:   document.getElementById('jnl-emotion-before').value || null,
    emotion_after:    document.getElementById('jnl-emotion-after').value || null,
    lessons:          document.getElementById('jnl-lessons').value.trim() || null,
    screenshot_before: beforeUrl,
    screenshot_after:  afterUrl,
    trade_date:        new Date().toISOString(),
  };

  const saved = await saveJournalToDB(record);
  if (saved) {
    journalEntries.unshift(saved);
    closeJournalModal();
    renderJournal();
    showToast('Trade Logged', `${symbol} saved to your journal.`, 'success');

    // If linked to a setup alert, dismiss it from active list
    const linkedAlertId = document.getElementById('jnl-alert-id').value;
    if (linkedAlertId) {
      alerts = alerts.filter(a => a.id !== linkedAlertId);
      await deleteAlertFromDB(linkedAlertId);
      renderAlerts();
    }

    // Navigate to journal tab
    if (isMobileLayout()) mobileTab('journal');
  } else {
    showToast('Save Failed', 'Could not save entry. Check your connection.', 'error');
  }
}

// ── Open log form from a completed setup alert ─────────────────────────────
function logTradeFromAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;
  let j = {};
  try { j = JSON.parse(alert.note || '{}'); } catch(e) {}

  // Map trade status to outcome
  const outcomeMap = {
    full_tp:  'full_tp',
    tp2_hit:  'tp2_hit',
    tp1_hit:  'tp1_hit',
    sl_hit:   'sl_hit',
    running:  'manual_exit',
    watching: 'manual_exit',
  };

  openJournalEntryForm({
    alertId:       alertId,
    symbol:        alert.symbol,
    direction:     j.direction,
    entry:         alert.targetPrice,
    sl:            j.sl,
    tp1:           j.tp1,
    tp2:           j.tp2,
    tp3:           j.tp3,
    outcome:       outcomeMap[j.tradeStatus] || 'manual_exit',
    timeframe:     alert.timeframe,
    setupType:     j.setupType,
    entryReason:   j.entryReason,
    htfContext:    j.htfContext,
    emotionBefore: j.emotionBefore,
  });
}

// ── Render journal page ────────────────────────────────────────────────────
async function renderJournal() {
  const listEl  = document.getElementById('journal-list');
  const statsEl = document.getElementById('journal-stats');
  if (!listEl) return;

  listEl.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.72rem;padding:40px 0;font-family:var(--mono)">Loading journal…</div>';

  // Load from DB if empty
  if (!journalEntries.length) {
    journalEntries = await loadJournalFromDB();
  }

  // Apply time filter
  const filter = document.getElementById('journal-filter')?.value || 'all';
  const cutoff = filter === 'all' ? 0 : Date.now() - parseInt(filter) * 86400000;
  const filtered = journalEntries.filter(e => {
    const ts = new Date(e.trade_date || e.created_at).getTime();
    return ts >= cutoff;
  });

  // ── Stats strip ──────────────────────────────────────────────────────────
  const total    = filtered.length;
  const wins     = filtered.filter(e => ['full_tp','tp2_hit','tp1_hit'].includes(e.outcome)).length;
  const losses   = filtered.filter(e => e.outcome === 'sl_hit').length;
  const winRate  = total ? Math.round((wins / total) * 100) : 0;
  const avgPnl   = filtered.filter(e => e.pnl_pct).length
    ? (filtered.reduce((s,e) => s + (e.pnl_pct || 0), 0) / filtered.filter(e => e.pnl_pct).length).toFixed(1)
    : '—';

  if (statsEl) statsEl.innerHTML = `
    <div class="journal-stat"><span class="journal-stat-value">${total}</span><span class="journal-stat-label">TRADES</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:var(--green)">${wins}</span><span class="journal-stat-label">WINS</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:var(--red)">${losses}</span><span class="journal-stat-label">LOSSES</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:${winRate >= 50 ? 'var(--green)' : 'var(--red)'}">${winRate}%</span><span class="journal-stat-label">WIN RATE</span></div>
    <div class="journal-stat"><span class="journal-stat-value" style="color:${parseFloat(avgPnl) >= 0 ? 'var(--green)' : 'var(--red)'}">${avgPnl !== '—' ? avgPnl + '%' : '—'}</span><span class="journal-stat-label">AVG P&L</span></div>`;

  // ── Entry cards ─────────────────────────────────────────────────────────
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:40px 0">
            <p style="font-family:var(--mono);font-size:0.75rem;color:var(--muted);text-align:center">No trades logged yet.<br>Complete a trade setup and tap<br><b style="color:var(--text)">LOG TRADE</b> to record it here.</p>
    </div>`;
    return;
  }

  const outcomeMeta = {
    full_tp:     { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,1 6.2,3.8 9.3,3.8 6.8,5.8 7.7,8.8 5,7 2.3,8.8 3.2,5.8 0.7,3.8 3.8,3.8" fill="currentColor"/></svg> FULL TP',     cls: 'joutcome-full-tp' },
    tp2_hit:     { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP2 HIT',     cls: 'joutcome-tp2-hit' },
    tp1_hit:     { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1,5 3.5,7.5 9,2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> TP1 HIT',     cls: 'joutcome-tp1-hit' },
    breakeven:   { label: 'BREAKEVEN',   cls: 'joutcome-breakeven' },
    sl_hit:      { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3.2" y1="3.2" x2="6.8" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6.8" y1="3.2" x2="3.2" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> SL HIT',      cls: 'joutcome-sl-hit' },
    manual_exit: { label: 'MANUAL EXIT', cls: 'joutcome-manual-exit' },
  };

  listEl.innerHTML = '';
  filtered.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'journal-card';

    const om  = outcomeMeta[entry.outcome] || outcomeMeta['manual_exit'];
    const dir = entry.direction === 'long' ? '▲ LONG' : '▼ SHORT';
    const dirColor = entry.direction === 'long' ? 'var(--green)' : 'var(--red)';
    const date = new Date(entry.trade_date || entry.created_at).toLocaleDateString([], {day:'numeric',month:'short',year:'2-digit'});
    const f = (n) => n ? parseFloat(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:6}) : '—';

    // Levels row
    const levels = [
      `<div class="journal-level-item"><span class="journal-level-label">ENTRY</span><span class="journal-level-value">${f(entry.entry_price)}</span></div>`,
      `<div class="journal-level-item"><span class="journal-level-label">EXIT</span><span class="journal-level-value">${f(entry.exit_price)}</span></div>`,
      `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--red)">SL</span><span class="journal-level-value" style="color:var(--red)">${f(entry.sl_price)}</span></div>`,
      `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--green)">TP1</span><span class="journal-level-value" style="color:var(--green)">${f(entry.tp1_price)}</span></div>`,
      entry.tp2_price ? `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--green)">TP2</span><span class="journal-level-value" style="color:var(--green)">${f(entry.tp2_price)}</span></div>` : '',
      entry.tp3_price ? `<div class="journal-level-item"><span class="journal-level-label" style="color:var(--green)">TP3</span><span class="journal-level-value" style="color:var(--green)">${f(entry.tp3_price)}</span></div>` : '',
    ].join('');

    // Notes
    const notes = [
      entry.setup_type    ? `<b>Setup:</b> ${entry.setup_type}` : null,
      entry.entry_reason  ? `<b>Reason:</b> ${entry.entry_reason}` : null,
      entry.htf_context   ? `<b>HTF:</b> ${entry.htf_context}` : null,
      entry.emotion_before && entry.emotion_after
        ? `<b>Emotions:</b> ${entry.emotion_before} → ${entry.emotion_after}` : null,
      entry.lessons       ? `<b>Lessons:</b> ${entry.lessons}` : null,
    ].filter(Boolean).join('<br>');

    // Screenshots
    const shots = (entry.screenshot_before || entry.screenshot_after) ? `
      <div class="journal-screenshots">
        ${entry.screenshot_before ? `<img src="${entry.screenshot_before}" class="journal-screenshot-thumb" onclick="openImageFullscreen('${entry.screenshot_before}')" alt="Before">` : ''}
        ${entry.screenshot_after  ? `<img src="${entry.screenshot_after}"  class="journal-screenshot-thumb" onclick="openImageFullscreen('${entry.screenshot_after}')"  alt="After">` : ''}
      </div>` : '';

    const pnlStr = entry.pnl_pct != null
      ? `<span style="color:${entry.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${entry.pnl_pct >= 0 ? '+' : ''}${entry.pnl_pct}%</span>`
      : '';

    card.innerHTML = `
      <div class="journal-card-header" onclick="toggleJournalCard('${entry.id}')">
        <div>
          <span class="journal-card-symbol">${entry.symbol}</span>
          <span class="journal-card-dir" style="color:${dirColor}">${dir}</span>
          ${entry.timeframe ? `<span style="font-family:var(--mono);font-size:0.58rem;color:var(--muted);margin-left:4px">${entry.timeframe}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${pnlStr}
          <span class="journal-card-outcome ${om.cls}">${om.label}</span>
          <span style="color:var(--muted);font-size:0.75rem">›</span>
        </div>
      </div>
      <div class="journal-card-body" id="jcard-${entry.id}">
        <div class="journal-levels">${levels}</div>
        ${notes ? `<div class="journal-notes">${notes}</div>` : ''}
        ${shots}
        <div class="journal-card-meta">
          <span>${date}</span>
          <button onclick="deleteJournalEntry('${entry.id}')" style="background:none;border:none;color:var(--muted);font-family:var(--mono);font-size:0.6rem;cursor:pointer;letter-spacing:0.06em">DELETE</button>
        </div>
      </div>`;

    listEl.appendChild(card);
  });
}

function toggleJournalCard(id) {
  const body = document.getElementById(`jcard-${id}`);
  if (body) body.classList.toggle('open');
}

function openImageFullscreen(url) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  ov.innerHTML = `<img src="${url}" style="max-width:95vw;max-height:90vh;object-fit:contain;border-radius:8px">`;
  ov.onclick = () => ov.remove();
  document.body.appendChild(ov);
}

async function deleteJournalEntry(id) {
  journalEntries = journalEntries.filter(e => e.id !== id);
  await deleteJournalEntryFromDB(id);
  renderJournal();
}

// mobileTab is handled by app-watchlist.js — journal tab already supported there
// TradeWatch — UI & App Init
// Telegram, library modal, toast, onboarding, init()

// ═══════════════════════════════════════════════
// (declared in app-config.js)

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playAlertSound(type = 'chime') {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const sounds = {
      chime: () => {
        // Ascending chime — three notes
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
          gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
          osc.start(ctx.currentTime + i * 0.18);
          osc.stop(ctx.currentTime + i * 0.18 + 0.55);
        });
      },
      beep: () => {
        // Two-tone alert beep
        [880, 1100].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.12);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.15);
        });
      },
      bell: () => {
        // Rich bell with harmonics
        const freqs = [440, 880, 1320];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3 / (i + 1), ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.6);
        });
      },
      ding: () => {
        // Short bright ding
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1318.5, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.65);
      }
    };
    (sounds[type] || sounds.chime)();
  } catch(e) { console.warn('Audio error:', e); }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('sound-btn');
  const waves = document.getElementById('sound-waves');
  const mute  = document.getElementById('sound-mute');
  if (soundEnabled) {
    btn.classList.add('active');
    btn.classList.remove('muted-sound');
    btn.title = 'Sound ON — click to mute';
    if (waves) waves.style.display = '';
    if (mute)  mute.style.display  = 'none';
  } else {
    btn.classList.remove('active');
    btn.classList.add('muted-sound');
    btn.title = 'Sound OFF — click to enable';
    if (waves) waves.style.display = 'none';
    if (mute)  mute.style.display  = '';
  }
  if (soundEnabled) playAlertSound(selectedAlertSound);
}

function toggleTheme() {
  const root    = document.documentElement;
  const isLight = root.getAttribute('data-theme') !== 'light';
  root.setAttribute('data-theme', isLight ? 'light' : 'dark');
  localStorage.setItem('tw_theme', isLight ? 'light' : 'dark');
  const moon = document.getElementById('theme-moon');
  const sun  = document.getElementById('theme-sun');
  if (moon) moon.style.display = isLight ? 'none'  : '';
  if (sun)  sun.style.display  = isLight ? ''      : 'none';
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    btn.classList.toggle('theme-light', isLight);
  }
}

function initTheme() {
  const saved = localStorage.getItem('tw_theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const moon = document.getElementById('theme-moon');
    const sun  = document.getElementById('theme-sun');
    const btn2 = document.getElementById('theme-btn');
    if (btn2) btn2.classList.add('theme-light');
    if (moon) moon.style.display = 'none';
    if (sun)  sun.style.display  = '';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function selectSound(type, btn) {
  selectedAlertSound = type;
  document.querySelectorAll('.sound-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function previewSound() {
  playAlertSound(selectedAlertSound);
}

// ═══════════════════════════════════════════════
// BROWSER NOTIFICATIONS
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
// SERVICE WORKER + PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════
// (declared in app-config.js)

// Register the service worker as soon as the page loads.
// Requires the app to be served over HTTPS or localhost — not file://.
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js');
  } catch (e) {
    // SW registration fails silently on file:// — fallback to Notification API
    swRegistration = null;
  }
}
registerServiceWorker();



// Browser notifications removed — Telegram is the sole alert channel
function sendBrowserNotification() {}



// ═══════════════════════════════════════════════
// TELEGRAM ALERTS
// ═══════════════════════════════════════════════
// (declared in app-config.js)

// ── Auto-detect user from Telegram WebApp SDK ─────
(function detectTelegramUser() {
  try {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      telegramChatId   = String(tgUser.id);
      telegramUserName = tgUser.first_name || tgUser.username || 'there';
      localStorage.setItem('tg_chat_id', telegramChatId);
      telegramEnabled = true;
      localStorage.setItem('tg_enabled', 'true');
    }
  } catch(e) {}
})();

function openTelegramModal() {
  const modal = document.getElementById('tg-modal');
  modal.style.display = 'flex';
  modal.classList.add('tg-open');
  updateTgModalState();
}

function closeTelegramModal() {
  const modal = document.getElementById('tg-modal');
  modal.style.display = 'none';
  modal.classList.remove('tg-open');
}

function closeTgModalIfBg(e) {
  if (e.target.id === 'tg-modal') closeTelegramModal();
}

function updateTgModalState() {
  const sub = document.getElementById('tg-toggle-sub');
  const btn = document.getElementById('tg-toggle-btn');
  const detectedBox   = document.getElementById('tg-detected-box');
  const notDetectedBox = document.getElementById('tg-not-detected-box');

  if (telegramChatId) {
    // Show detected state
    if (detectedBox)    detectedBox.style.display = 'block';
    if (notDetectedBox) notDetectedBox.style.display = 'none';
    const nameEl = document.getElementById('tg-detected-name');
    if (nameEl) nameEl.textContent = telegramUserName
      ? `Logged in as ${telegramUserName} — alerts will be delivered to your Telegram.`
      : `Your account has been detected. Alerts will be delivered to your Telegram.`;
    if (telegramEnabled) {
      sub.textContent = 'Alerts will be sent to your Telegram';
      btn.textContent = 'ON';
      btn.classList.add('on');
    } else {
      sub.textContent = 'Ready — toggle to enable';
      btn.textContent = 'OFF';
      btn.classList.remove('on');
    }
  } else {
    // Not inside Telegram
    if (detectedBox)    detectedBox.style.display = 'none';
    if (notDetectedBox) notDetectedBox.style.display = 'block';
    sub.textContent = 'Open via @tradewatchalert_bot to enable';
    btn.textContent = 'OFF';
    btn.classList.remove('on');
  }
}

function toggleTelegram() {
  if (!telegramChatId) {
    setTgStatus('Open the app via @tradewatchalert_bot to enable alerts.', 'err');
    return;
  }
  telegramEnabled = !telegramEnabled;
  localStorage.setItem('tg_enabled', telegramEnabled);
  savePreferencesDB({ telegram_chat_id: telegramChatId, telegram_enabled: telegramEnabled });
  updateTgModalState();
  updateTgBtn();
  if (telegramEnabled) {
    sendTelegram('🔔 <b>TradeWatch Connected!</b>\n\nYour alerts are live. You\'ll get notified here the moment a price target is hit.\n\n<i>Stay sharp. </i>');
  }
}

function updateTgBtn() {
  const btn = document.getElementById('tg-btn');
  if (!btn) return;
  if (telegramEnabled) {
    btn.classList.add('active');
    btn.style.borderColor = '#2AABEE';
    btn.style.color = '#2AABEE';
    btn.title = 'Telegram alerts ON';
  } else {
    btn.classList.remove('active');
    btn.style.borderColor = '';
    btn.style.color = '';
    btn.title = 'Set up Telegram alerts';
  }
}

async function testTelegram() {
  if (!telegramChatId) {
    setTgStatus('Open the app via @tradewatchalert_bot first.', 'err');
    return;
  }
  setTgStatus('Sending…', '');
  const ok = await sendTelegram('✅ <b>Test Successful!</b>\n\nTradeWatch is connected and ready to fire alerts.\n\n<i>You\'re all set. </i>');
  if (ok) {
    setTgStatus('Message sent! Check your Telegram.', 'ok');
  } else {
    setTgStatus('Failed. Please try again.', 'err');
  }
}

function setTgStatus(msg, type) {
  const el = document.getElementById('tg-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'tg-status ' + type;
}

// Core send function — posts to Cloudflare Worker proxy
async function sendTelegram(message) {
  if (!telegramChatId) return false;
  try {
    const res = await fetch(TELEGRAM_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, chat_id: telegramChatId })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Format a rich alert message for Telegram
// Build a monospace-aligned detail block for Telegram
// Labels are left-padded to a fixed width so values line up cleanly
function tgRow(label, value) {
  return `<code>${label.padEnd(16)}</code>${value}`;
}

function tgAlertMessage(type, symbol, condition, targetPrice, currentPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';
  let header, subtitle, rows = [];

  if (isZone) {
    header   = `📍 <b>ZONE ALERT — ${symbol}</b>`;
    subtitle = `Price has entered your zone`;
    rows.push(tgRow('Zone',          `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `🎯 <b>TAP ALERT — ${symbol}</b>`;
    subtitle = `Price touched your level`;
    rows.push(tgRow('Level',         `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    rows.push(tgRow('Tolerance',     `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const emoji   = isAbove ? '🚀' : '📉';
    const dirWord = isAbove ? 'broke above' : 'dropped below';
    header   = `${emoji} <b>ALERT TRIGGERED — ${symbol}</b>`;
    subtitle = `Price ${dirWord} your target`;
    rows.push(tgRow('Target',        `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Current price', `<b>${formatPrice(currentPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));
  return [header, ``, subtitle, ``, ...rows, ``, `<a href="https://t.me/tradewatchalert_bot/assistant">Dismiss in TradeWatch →</a>`].join('\n');
}

function tgCreatedMessage(symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';

  let header, subtitle, rows = [];

  if (isZone) {
    header   = `📍 <b>Zone Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> enters the zone`;
    rows.push(tgRow('Zone',      `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `🎯 <b>Tap Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> touches your level`;
    rows.push(tgRow('Level',     `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Tolerance', `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const emoji   = isAbove ? '🟢' : '🔴';
    const dirWord = isAbove ? 'rises above' : 'falls below';
    header   = `${emoji} <b>Alert Set — ${symbol}</b>`;
    subtitle = `You'll be notified when <b>${symbol}</b> ${dirWord}`;
    rows.push(tgRow('Target',    `<b>${formatPrice(targetPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));
  return [header, ``, subtitle, ``, ...rows, ``, `<i>👀 Watching the markets for you.</i>`].join('\n');
}

// ── Telegram message for edited alerts ────────────────────────────────────
function tgEditedMessage(symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';

  let header, subtitle, rows = [];

  if (isZone) {
    header   = `✏️ <b>Alert Updated — ${symbol}</b>`;
    subtitle = `Your zone alert has been updated`;
    rows.push(tgRow('Zone',      `<b>${formatPrice(zoneLow, assetId)} – ${formatPrice(zoneHigh, assetId)}</b>`));
    if (timeframe)                            rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
    if (repeatInterval && repeatInterval > 0) rows.push(tgRow('Repeat',   `<b>Every ${repeatInterval} min</b>`));
  } else if (isTap) {
    header   = `✏️ <b>Alert Updated — ${symbol}</b>`;
    subtitle = `Your tap alert has been updated`;
    rows.push(tgRow('Level',     `<b>${formatPrice(targetPrice, assetId)}</b>`));
    rows.push(tgRow('Tolerance', `<b>±${tapTolerance}%</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  } else {
    const emoji   = isAbove ? '🟢' : '🔴';
    const dirWord = isAbove ? 'rises above' : 'falls below';
    header   = `✏️ <b>Alert Updated — ${symbol}</b>`;
    subtitle = `Now watching for <b>${symbol}</b> to ${dirWord}`;
    rows.push(tgRow('New target', `<b>${formatPrice(targetPrice, assetId)}</b>`));
    if (timeframe) rows.push(tgRow('Timeframe', `<b>${timeframe}</b>`));
  }

  if (note) rows.push(tgRow('Note', `<i>${note}</i>`));
  return [header, '', subtitle, '', ...rows, '', '<i>Alert is active and watching.</i>'].join('\n');
}

// ═══════════════════════════════════════════════
// REMOVE ASSET FROM WATCHLIST
// ═══════════════════════════════════════════════
function removeAssetFromWatchlist(assetId, cat, event) {
  event.stopPropagation();
  const catAssets = ASSETS[cat];
  if (!catAssets) return;
  const asset = catAssets.find(a => a.id === assetId);
  if (!asset) return;

  // Deselect if currently selected
  if (selectedAsset && selectedAsset.id === assetId) {
    selectedAsset = null;
    document.getElementById('sel-symbol').textContent = 'Select Asset';
    document.getElementById('sel-name').textContent = 'Tap any asset to view its chart';
  }

  ASSETS[cat] = catAssets.filter(a => a.id !== assetId);
  removeFromWatchlist(assetId); // sync to DB
  renderWatchlist();
  renderHotList();  // refresh + button state on hot list
  populateDropdown();
  showToast(`${asset.symbol} Removed`, `${asset.name} removed from your watchlist.`, 'error');
}

// ═══════════════════════════════════════════════
// COMPREHENSIVE ASSET LIBRARY (500+ assets)
// Includes ALL default watchlist assets so removed
// assets always reappear here for re-adding.
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// ASSET LIBRARY — derived from ALL_ASSETS master catalogue
// Used by the "Add Asset" modal browser.
// This replaces the old static ASSET_LIBRARY.
// ═══════════════════════════════════════════════
// (declared in app-config.js)


function openAddModal() {
  document.getElementById('add-modal').style.display = 'flex';
  document.getElementById('modal-search').value = '';
  libSearchQuery = '';
  currentLibTab = 'ALL';
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.modal-tab').classList.add('active');
  document.getElementById('lib-total-count').textContent = ASSET_LIBRARY.length;
  renderLibrary();
  setTimeout(() => document.getElementById('modal-search').focus(), 100);
}

function closeAddModal() { document.getElementById('add-modal').style.display = 'none'; }
function closeModalIfBg(e) { if (e.target.id === 'add-modal') closeAddModal(); }

function setLibTab(tab, btn) {
  currentLibTab = tab;
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderLibrary();
}

function filterLibrary() {
  libSearchQuery = document.getElementById('modal-search').value.toLowerCase().trim();
  renderLibrary();
}

function renderLibrary() {
  const body = document.getElementById('lib-body');
  const allWatchIds = new Set(Object.values(ASSETS).flat().map(a => a.id));

  // Build full pool = ASSET_LIBRARY + any watchlist assets not already in ASSET_LIBRARY
  // This ensures removed default assets always reappear here
  const libIds = new Set(ASSET_LIBRARY.map(a => a.id));
  const extraAssets = Object.entries(ASSETS).flatMap(([cat, assets]) =>
    assets.filter(a => !libIds.has(a.id)).map(a => ({ ...a, cat }))
  );
  const fullLibrary = [...ASSET_LIBRARY, ...extraAssets];

  // Filter by tab
  let pool = currentLibTab === 'ALL'
    ? fullLibrary
    : currentLibTab === 'watchlist'
      ? Object.entries(ASSETS).flatMap(([cat, assets]) => assets.map(a => ({ ...a, cat })))
      : fullLibrary.filter(a => a.cat === currentLibTab);

  // Filter by search (search always scans full library, not just current tab)
  if (libSearchQuery) {
    pool = fullLibrary.filter(a =>
      a.symbol.toLowerCase().includes(libSearchQuery) ||
      a.name.toLowerCase().includes(libSearchQuery) ||
      a.cat.toLowerCase().includes(libSearchQuery)
    );
  }

  document.getElementById('lib-result-count').textContent = `${pool.length} results`;

  if (currentLibTab === 'watchlist') {
    body.innerHTML = '';
    const allWatchAssets = Object.entries(ASSETS).flatMap(([cat, assets]) =>
      assets.map(a => ({ ...a, cat }))
    );
    if (allWatchAssets.length === 0) {
      body.innerHTML = '<div class="lib-empty">Your watchlist is empty.<br>Switch to another tab to add assets.</div>';
      return;
    }
    const groups = {};
    allWatchAssets.forEach(a => { if (!groups[a.cat]) groups[a.cat] = []; groups[a.cat].push(a); });
    const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', synthetics:'Synthetics', etf:'ETFs' };
    Object.entries(groups).forEach(([cat, assets]) => {
      const sec = document.createElement('div');
      sec.innerHTML = `<div class="lib-section-title">${catLabels[cat] || cat} · ${assets.length} assets</div>`;
      const grid = document.createElement('div');
      grid.className = 'lib-grid';
      assets.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'lib-card in-watch';
        card.style.opacity = '1'; card.style.cursor = 'pointer';
        card.style.borderColor = 'rgba(255,61,90,0.4)';
        card.innerHTML = `<div><div class="lib-sym">${asset.symbol}</div><div class="lib-name">${asset.name}</div></div><div class="lib-action" style="color:var(--red)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
        card.onclick = (e) => { e.stopPropagation(); removeAssetFromWatchlist(asset.id, cat, { stopPropagation:()=>{} }); renderLibrary(); };
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      body.appendChild(sec);
    });
    return;
  }

  if (pool.length === 0) {
    body.innerHTML = '<div class="lib-empty">No assets found.<br>Try a different keyword.</div>';
    return;
  }

  const groups = {};
  pool.forEach(a => { if (!groups[a.cat]) groups[a.cat] = []; groups[a.cat].push(a); });
  const catOrder = ['crypto','forex','indices','synthetics','commodities','stocks','etf'];
  const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', synthetics:'Synthetics', etf:'ETFs' };

  body.innerHTML = '';
  catOrder.forEach(cat => {
    if (!groups[cat]) return;
    const sec = document.createElement('div');
    sec.innerHTML = `<div class="lib-section-title">${catLabels[cat]} · ${groups[cat].length} assets</div>`;
    const grid = document.createElement('div');
    grid.className = 'lib-grid';
    groups[cat].forEach(asset => {
      const inWatch    = allWatchIds.has(asset.id);
      const isUnavail  = asset.sources?.[0] === 'unavailable';
      const card = document.createElement('div');
      card.className = `lib-card${inWatch ? ' in-watch' : ''}${isUnavail ? ' unavailable' : ''}`;
      card.innerHTML = `
        <div>
          <div class="lib-sym" style="${isUnavail ? 'opacity:0.45' : ''}">${asset.symbol}</div>
          <div class="lib-name" style="${isUnavail ? 'opacity:0.45' : ''}">${asset.name}</div>
          ${isUnavail ? '<div style="font-size:0.6rem;letter-spacing:0.06em;color:var(--muted);margin-top:2px;opacity:0.7">NO BROKER</div>' : ''}
        </div>
        <div class="lib-action">${
          inWatch
            ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : isUnavail
            ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity:0.3"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/><line x1="6" y1="3" x2="6" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="6" cy="9" r="0.7" fill="currentColor"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
        }</div>`;
      if (!inWatch && !isUnavail) card.onclick = (e) => { e.stopPropagation(); addAssetToWatchlist(asset); };
      else if (isUnavail) card.title = 'No broker connected for this asset yet';
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    body.appendChild(sec);
  });
}

function getCatForAsset(id) {
  for (const [cat, assets] of Object.entries(ASSETS)) {
    if (assets.find(a => a.id === id)) return cat;
  }
  return 'stocks';
}

function addAssetToWatchlist(asset) {
  if (!ASSETS[asset.cat]) ASSETS[asset.cat] = [];
  if (ASSETS[asset.cat].find(a => a.id === asset.id)) return;

  ASSETS[asset.cat].push(ASSET_BY_ID.get(asset.id) || asset);
  subscribeDerivAsset(asset);
  // Start with no price — will be populated by next fetch cycle
  priceData[asset.id] = priceData[asset.id] || null;
  prices[asset.id]    = prices[asset.id]    || null;

  renderWatchlist();
  populateDropdown();
  showToast(`＋ ${asset.symbol} Added`, `${asset.name} is now on your watchlist.`, 'success');

  // Defer renderLibrary so the current click event fully completes before DOM is rebuilt.
  // Without this, rebuilding lib-body mid-click causes the event to retarget to the
  // modal overlay, which triggers closeModalIfBg and closes the modal immediately.
  setTimeout(() => renderLibrary(), 0);

  // Fetch latest price data
  // Price fetch happens on background interval — no per-click fetch needed
}




// populateDropdown — kept as no-op; asset is now shown as plain text via selectAsset()
function populateDropdown() {}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function showToast(title, body, type = 'success') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.style.borderColor = 'var(--red)';
  if (type === 'alert') toast.style.borderColor = 'var(--gold)';
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-body">${body}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ═══════════════════════════════════════════════
// REFRESH & TICK
// ═══════════════════════════════════════════════
async function refreshAll() {
  document.getElementById('status-pill').textContent = '◌ CONNECTING';
  document.getElementById('status-pill').style.borderColor = 'var(--muted)';
  document.getElementById('status-pill').style.color = 'var(--muted)';
  renderHotList();
  renderWatchlist();
  await fetchAllPrices();
  setStatusPill(true);
  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  checkAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

// 8-second UI tick — Deriv WebSocket keeps prices live between REST refreshes
setInterval(() => {
  // Skip heavy DOM rebuilds while user is focused on alert form inputs
  // This prevents the page from jumping/scrolling while they type
  if (!userTypingInForm) {
    renderHotList();
    renderWatchlist();
  }
  refreshSelectedAssetPanel();
  checkAlerts();
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}, 8000);

// REST refresh every 60 seconds — CoinGecko + OANDA snapshot (Deriv WS covers the rest)
// Deriv WebSocket handles intraday ticks; REST fills OHLC + catches up after reconnects
setInterval(() => {
  fetchAllPrices();
  // Reconnect / re-subscribe Deriv on every REST cycle to catch any dropped ticks
  // Reconnect both WS connections if needed
  if (!_conn1.ws || _conn1.ws.readyState > 1) connectDeriv();
  else resubscribeAllDeriv();
}, 60 * 1000);

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  // Apply saved theme before anything renders
  initTheme();

  // Push initial history state so Android back button is interceptable from the start
  window.history.replaceState({ twTab: 'watchlist' }, '', '');

  // Render hot list immediately with seed data so users see something right away
  // (will be updated with DB rankings after login)
  HOT_LIST = { ...HOT_LIST_SEED };
  renderHotList();

  await getOrCreateUser(currentTelegramId);

  const prefs = await loadPreferencesFromDB();
  const isTelegramApp = !!window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (isTelegramApp) {
    soundEnabled = prefs?.sound_enabled ?? true;
    savePreferencesDB({
      telegram_chat_id: telegramChatId,
      telegram_enabled: true,
      sound_enabled:    soundEnabled,
      timezone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
      utc_offset_mins:  -new Date().getTimezoneOffset(),
    });

    // ── New user onboarding: show linking screen, auto send test ──
    const hasOnboarded = localStorage.getItem('tw_onboarded');
    if (!hasOnboarded) {
      // Show the onboarding splash — it will resolve when test passes
      const onboardOk = await showOnboardingScreen();
      if (!onboardOk) return; // user is stuck on error screen — halt
      localStorage.setItem('tw_onboarded', '1');
    }
  } else {
    // Not inside Telegram — show blocking connect prompt
    soundEnabled = prefs?.sound_enabled ?? true;
    showTgConnectPrompt();
    return; // halt init until user opens via bot
  }
  updateTgBtn();

  const dbAlerts = await loadAlertsFromDB();
  if (dbAlerts !== null) alerts = dbAlerts;

  await initAlertHistory();

  // ── Load user's personal watchlist from DB ──────
  // Clear all default assets — only show what the user has saved
  Object.keys(ASSETS).forEach(cat => { ASSETS[cat] = []; });

  const dbWatchlist = await loadWatchlist();
  if (dbWatchlist && dbWatchlist.length > 0) {
    dbWatchlist.forEach(row => {
      const cat = row.category;
      if (!cat) return;
      if (!ASSETS[cat]) ASSETS[cat] = [];
      if (ASSETS[cat].some(a => a.id === row.asset_id)) return; // no dupes
      // Prefer ALL_ASSETS master for full metadata, fall back to DB row data
      const meta = ALL_ASSETS.find(a => a.id === row.asset_id);
      ASSETS[cat].push(meta || {
        id:       row.asset_id,
        symbol:   row.symbol,
        name:     row.name,
        derivSym: row.td_symbol || null,
        sources:  row.sources  || ['deriv'],
        cat,
      });
    });
  }

  // Build hot list from DB click rankings — all categories
  // Falls back to HOT_LIST_SEED (forex defaults) if no DB data yet.
  // Hot list is independent of the user's personal watchlist.
  const rankings = await loadHotListRankings();
  if (rankings && Object.keys(rankings).length > 0) {
    // Replace HOT_LIST entirely with DB-ranked results per category
    HOT_LIST = {};
    Object.entries(rankings).forEach(([cat, ids]) => {
      // Only include assets that exist in ALL_ASSETS catalogue
      HOT_LIST[cat] = ids.filter(id => ALL_ASSETS.some(a => a.id === id));
    });
    // Fill in seed defaults for any category missing from DB rankings
    Object.entries(HOT_LIST_SEED).forEach(([cat, ids]) => {
      if (!HOT_LIST[cat] || HOT_LIST[cat].length === 0) {
        HOT_LIST[cat] = ids;
      }
    });
  } else {
    // No DB data yet — use seed defaults
    HOT_LIST = { ...HOT_LIST_SEED };
  }

  populateDropdown();
  renderHotList();
  renderWatchlist();
  renderAlerts();
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  // Connect Deriv WebSocket — connects and subscribes to all watchlist + hot list assets
  connectDeriv();
  setTimeout(resubscribeAllDeriv, 3000);

  // ── Alert form focus tracking ─────────────────────────────────────────────
  // Set userTypingInForm=true while any alert input is focused.
  // This pauses chart reloads and DOM rebuilds so the page doesn't jump.
  const alertFormInputs = [
    'alert-price', 'alert-zone-low', 'alert-zone-high',
    'alert-note', 'alert-note-zone', 'alert-tap-custom',
  ];
  alertFormInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { userTypingInForm = true; });
    el.addEventListener('blur',  () => {
      // Small delay so flag isn't cleared before click events process
      setTimeout(() => { userTypingInForm = false; }, 300);
    });
  });
  // Also track the dropdowns — they don't type but interaction matters
  ['alert-condition','alert-timeframe','alert-repeat','alert-tap-tolerance'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { userTypingInForm = true; });
    el.addEventListener('blur',  () => { setTimeout(() => { userTypingInForm = false; }, 300); });
  });

  // Initial REST fetch — CoinGecko + OANDA snapshot (Deriv WS already running)
  await fetchAllPrices();
  setStatusPill(true);

  // Re-subscribe Deriv with confirmed symbols now that ASSETS is fully populated
  resubscribeAllDeriv();

  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  renderAlerts();

}

function setStatusPill(isLive) {
  const pill = document.getElementById('status-pill');
  if (isLive) {
    pill.textContent = '● LIVE';
    pill.style.borderColor = 'var(--green)';
    pill.style.color = 'var(--green)';
  } else {
    pill.textContent = '◈ OFFLINE';
    pill.style.borderColor = 'var(--red)';
    pill.style.color = 'var(--red)';
    pill.title = 'Live price APIs unreachable. Check your connection.';
  }
}

window.addEventListener('resize', () => {
  if (selectedAsset && !isMobileLayout()) loadTVChart(selectedAsset);
  // Re-activate correct panel after orientation change
  const activePanel = navStack[navStack.length - 1];
  if (isMobileLayout()) {
    mobileTab(activePanel, false);
  } else {
    // Desktop — ensure all panels visible
    ['panel-watchlist','panel-main','panel-alerts'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('mobile-active');
    });
  }
});

// Refresh prices when user returns to the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    fetchAllPrices();
    // Reconnect both WS connections if they dropped
    if (!_conn1.ws || _conn1.ws.readyState > 1) connectDeriv();
    if (!_conn2.ws || _conn2.ws.readyState > 1) connectDerivSynthetics();
    if (isMobileLayout()) mobileTab(navStack[navStack.length-1], false);
  }
});

// ═══════════════════════════════════════════════
// ONBOARDING SCREEN — shown once for new users
// Automatically links Telegram and sends a test
// message. Dismisses only when confirmed sent.
// ═══════════════════════════════════════════════

function cancelEditAlert() {
  if (!editingAlertId) return;
  userTypingInForm = false;
  editingAlertId = null;
  const setBtn = document.getElementById('set-alert-btn');
  if (setBtn) {
    setBtn.textContent = 'SET ALERT';
    setBtn.style.background = '';
    setBtn.style.borderColor = '';
  }
  // Clear form
  ['alert-price','alert-zone-low','alert-zone-high','alert-note','alert-note-zone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; delete el.dataset.userEdited; }
  });
}

function showOnboardingScreen() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:var(--bg);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:32px;text-align:center;
    `;

    // ── Phase 1: Linking splash ──────────────────
    // Inject spin keyframe once
    if (!document.getElementById('tw-spin-style')) {
      const s = document.createElement('style');
      s.id = 'tw-spin-style';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }

    function showLinking() {
      overlay.innerHTML = `
        <div style="margin-bottom:28px">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" stroke="var(--accent)" stroke-width="2" stroke-dasharray="157" stroke-dashoffset="0" opacity="0.2"/>
            <circle cx="26" cy="26" r="25" stroke="var(--accent)" stroke-width="2" stroke-dasharray="40 117"
              style="animation:spin 1.2s linear infinite;transform-origin:center"/>
          </svg>
        </div>
        <div style="font-size:1rem;font-weight:700;letter-spacing:0.1em;color:var(--text);margin-bottom:10px;">LINKING YOUR ACCOUNT</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.6;max-width:260px;">
          Connecting TradeWatch to your Telegram.<br>This only takes a moment…
        </div>`;
      document.body.appendChild(overlay);

      // Auto-send test message after a brief linking pause
      setTimeout(() => attemptTestMessage(), 1800);
    }

    // ── Phase 2: Test message ─────────────────────
    async function attemptTestMessage() {
      const msg = '<b>TRADEWATCH CONNECTED</b>\n\nYour account is linked. You\'ll receive instant alerts here the moment a price target is hit.\n\n<i>You\'re all set. </i>';
      const ok  = await sendTelegram(msg);

      if (ok) {
        showSuccess();
      } else {
        showError();
      }
    }

    // ── Phase 3a: Success — auto-dismiss ──────────
    function showSuccess() {
      overlay.innerHTML = `
        <div style="margin-bottom:24px">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="var(--green)" stroke-width="2" fill="none" opacity="0.2"/>
            <circle cx="28" cy="28" r="27" stroke="var(--green)" stroke-width="2" fill="none"/>
            <polyline points="16,28 24,36 40,20" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <div style="font-size:1rem;font-weight:700;letter-spacing:0.1em;color:var(--green);margin-bottom:10px;">TELEGRAM CONNECTED</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.6;max-width:260px;margin-bottom:20px;">
          Check your Telegram — a confirmation message has been sent.<br>Taking you to the app…
        </div>`;

      // Dismiss after 2 seconds and continue into app
      setTimeout(() => {
        overlay.remove();
        resolve(true);
      }, 2000);
    }

    // ── Phase 3b: Error — show retry ─────────────
    function showError() {
      overlay.innerHTML = `
        <div style="margin-bottom:24px">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="var(--red)" stroke-width="2" fill="none" opacity="0.2"/>
            <circle cx="28" cy="28" r="27" stroke="var(--red)" stroke-width="2" fill="none"/>
            <line x1="18" y1="18" x2="38" y2="38" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="38" y1="18" x2="18" y2="38" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="font-size:1rem;font-weight:700;letter-spacing:0.1em;color:var(--red);margin-bottom:10px;">CONNECTION FAILED</div>
        <div style="font-size:0.82rem;color:var(--muted);line-height:1.6;max-width:270px;margin-bottom:28px;">
          We couldn't send a test message to your Telegram.<br>
          Make sure you've started a conversation with<br>
          <b style="color:var(--text)">@tradewatchalert_bot</b> and try again.
        </div>
        <button onclick="window.__onboardRetry()" style="
          background:var(--accent);color:#000;
          font-weight:700;font-size:0.85rem;
          letter-spacing:0.08em;padding:14px 32px;
          border:none;border-radius:10px;cursor:pointer;
          margin-bottom:12px;width:100%;max-width:260px;
        ">RETRY</button>
        <a href="https://t.me/tradewatchalert_bot" target="_blank" style="
          font-size:0.75rem;color:var(--muted);text-decoration:none;
        ">Open @tradewatchalert_bot →</a>`;

      window.__onboardRetry = () => {
        showLinking();
      };
    }

    showLinking();
  });
}

// ═══════════════════════════════════════════════
// EDIT ALERT — opens prefilled alert form for
// an existing alert. Saves changes to DB.
// ═══════════════════════════════════════════════
// (declared in app-config.js)

function editAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;

  // Select the alert's asset so the form targets the right asset
  const asset = ASSET_BY_ID.get(alert.assetId);
  if (asset) {
    // Navigate to chart page (where form lives) and select asset
    navigateToChartOnSelect = true;
    selectAsset(asset);
  }

  // Mark edit mode
  editingAlertId = id;

  // Populate form fields with existing alert values
  const condEl = document.getElementById('alert-condition');
  if (condEl) { condEl.value = alert.condition; onConditionChange(); }

  const tfEl = document.getElementById('alert-timeframe');
  if (tfEl) tfEl.value = alert.timeframe || '';

  if (alert.condition === 'zone') {
    const lowEl  = document.getElementById('alert-zone-low');
    const highEl = document.getElementById('alert-zone-high');
    const noteEl = document.getElementById('alert-note-zone');
    const repEl  = document.getElementById('alert-repeat');
    if (lowEl)  { lowEl.value  = alert.zoneLow;  lowEl.dataset.userEdited  = '1'; }
    if (highEl) { highEl.value = alert.zoneHigh; highEl.dataset.userEdited = '1'; }
    if (noteEl) noteEl.value = alert.note || '';
    if (repEl)  repEl.value  = alert.repeatInterval || 0;
  } else {
    const priceEl = document.getElementById('alert-price');
    const noteEl  = document.getElementById('alert-note');
    if (priceEl) { priceEl.value = alert.targetPrice; priceEl.dataset.userEdited = '1'; }
    if (noteEl)  noteEl.value = alert.note || '';
    if (alert.condition === 'tap') {
      const tolEl = document.getElementById('alert-tap-tolerance');
      if (tolEl) tolEl.value = alert.tapTolerance || 0.2;
    }
  }

  // Change the SET ALERT button label to UPDATE ALERT
  const setBtn = document.getElementById('set-alert-btn');
  if (setBtn) {
    setBtn.textContent = 'UPDATE ALERT';
    setBtn.style.background = 'rgba(0,212,255,0.15)';
    setBtn.style.borderColor = 'rgba(0,212,255,0.5)';
  }

  // Show a toast so user knows they're in edit mode
  showToast('Edit Mode', `Editing ${alert.symbol} alert — adjust values and tap UPDATE ALERT.`, 'alert');

  // Switch to chart panel on mobile
  if (isMobileLayout()) mobileTab('chart');
}

async function saveEditedAlert() {
  if (!editingAlertId) return createAlert();

  const alert = alerts.find(a => a.id === editingAlertId);
  if (!alert) { editingAlertId = null; return createAlert(); }

  const condition = document.getElementById('alert-condition').value;

  // Safety: if somehow a setup alert reaches here, route correctly
  if (condition === 'setup' || alert.condition === 'setup') return createSetupAlert();
  const timeframe = document.getElementById('alert-timeframe').value;
  const isZone    = condition === 'zone';
  const isTap     = condition === 'tap';

  let targetPrice = 0, zoneLow = 0, zoneHigh = 0, note = '', repeatInterval = 0, tapTolerance = 0.2;

  if (isZone) {
    zoneLow        = parseFloat(document.getElementById('alert-zone-low').value);
    zoneHigh       = parseFloat(document.getElementById('alert-zone-high').value);
    note           = document.getElementById('alert-note-zone').value.trim();
    repeatInterval = parseInt(document.getElementById('alert-repeat').value) || 0;
    if (isNaN(zoneLow) || isNaN(zoneHigh) || zoneLow <= 0 || zoneHigh <= 0)
      return showToast('Invalid Zone', 'Enter valid zone low and high prices.', 'error');
    if (zoneLow >= zoneHigh)
      return showToast('Invalid Zone', 'Zone low must be less than zone high.', 'error');
    targetPrice = zoneLow;
  } else if (isTap) {
    targetPrice  = parseFloat(document.getElementById('alert-price').value);
    note         = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
    const tolSel = document.getElementById('alert-tap-tolerance').value;
    tapTolerance = tolSel === 'custom'
      ? parseFloat(document.getElementById('alert-tap-custom').value) || 0.2
      : parseFloat(tolSel);
  } else {
    targetPrice = parseFloat(document.getElementById('alert-price').value);
    note        = document.getElementById('alert-note').value.trim();
    if (isNaN(targetPrice) || targetPrice <= 0)
      return showToast('Invalid Price', 'Enter a valid target price.', 'error');
  }

  // For setup alerts: preserve the JSON note, only update entry/timeframe
  const isSetup = alert.condition === 'setup';
  if (isSetup) {
    const j = getJournal(alert);
    j.tradeStatus = j.tradeStatus || 'watching';
    Object.assign(alert, {
      condition: 'setup',
      timeframe: timeframe || alert.timeframe || null,
      targetPrice,
      note: JSON.stringify(j), // preserve all journal fields
      status: 'active',
    });
  }

  // Apply changes locally (non-setup alerts)
  if (!isSetup) Object.assign(alert, {
    condition, timeframe: timeframe || null,
    targetPrice, note,
    zoneLow:       isZone ? zoneLow      : null,
    zoneHigh:      isZone ? zoneHigh     : null,
    tapTolerance:  isTap  ? tapTolerance : null,
    repeatInterval,
    status: 'active',
    zoneTriggeredOnce: false,
  });

  // Save to DB
  await updateAlert(editingAlertId, {
    condition,
    target_price:    targetPrice,
    zone_low:        isZone ? zoneLow      : null,
    zone_high:       isZone ? zoneHigh     : null,
    tap_tolerance:   isTap  ? tapTolerance : null,
    timeframe:       timeframe || null,
    repeat_interval: repeatInterval,
    note,
    status:          'active',
    last_triggered_at: null,
    proximity_warn_count: 0,
  });

  // Exit edit mode
  editingAlertId = null;

  // Reset button
  const setBtn = document.getElementById('set-alert-btn');
  if (setBtn) {
    setBtn.textContent = 'SET ALERT';
    setBtn.style.background = '';
    setBtn.style.borderColor = '';
  }

  // Reset form
  document.getElementById('alert-price').value         = '';
  document.getElementById('alert-zone-low').value      = '';
  document.getElementById('alert-zone-high').value     = '';
  document.getElementById('alert-note').value          = '';
  document.getElementById('alert-note-zone').value     = '';
  document.getElementById('alert-timeframe').value     = '';
  document.getElementById('alert-repeat').value        = '0';
  delete document.getElementById('alert-price').dataset.userEdited;
  delete document.getElementById('alert-zone-low').dataset.userEdited;
  delete document.getElementById('alert-zone-high').dataset.userEdited;

  renderAlerts();
  renderWatchlist();
  showToast('Alert Updated', `${alert.symbol} alert has been updated.`, 'success');

  // Telegram notification — inform user their alert was updated
  if (telegramEnabled && telegramChatId) {
    sendTelegram(tgEditedMessage(
      alert.symbol, condition, targetPrice, alert.assetId,
      note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance
    ));
  }

  // Switch to alerts panel to show the updated alert
  if (isMobileLayout()) {
    switchAlertTab('active');
    mobileTab('alerts');
  }
}

// ── TELEGRAM CONNECT PROMPT (blocks app if not in Telegram) ──
function showTgConnectPrompt() {
  // Hide the main app content
  document.querySelector('.app').style.display = 'none';

  // Build and show a full-screen connect gate
  const gate = document.createElement('div');
  gate.id = 'tg-gate';
  gate.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:var(--bg);
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    padding:32px;text-align:center;
  `;
  gate.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style="margin-bottom:24px;opacity:0.9">
      <circle cx="28" cy="28" r="27" stroke="#2AABEE" stroke-width="2"/>
      <path d="M38 18L18 25l7 3 2 7 3-4 6 4 2-17z" stroke="#2AABEE" stroke-width="2" stroke-linejoin="round" fill="none"/>
      <line x1="25" y1="28" x2="30" y2="26" stroke="#2AABEE" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <div style="font-size:1.2rem;font-weight:700;letter-spacing:0.08em;margin-bottom:10px;color:var(--text)">CONNECT TELEGRAM</div>
    <div style="font-size:0.85rem;color:var(--muted);line-height:1.6;max-width:280px;margin-bottom:28px">
      TradeWatch delivers alerts directly to your Telegram.<br><br>
      To continue, open the app through the bot so your account can be linked automatically.
    </div>
    <a href="https://t.me/tradewatchalert_bot/assistant" target="_blank"
       style="display:inline-flex;align-items:center;gap:8px;background:#2AABEE;color:#fff;font-weight:700;font-size:0.9rem;letter-spacing:0.06em;padding:14px 28px;border-radius:10px;text-decoration:none;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 6.5l4 1.5 1.5 4 2-3 3.5 2.5L14 2z" stroke="white" stroke-width="1.3" stroke-linejoin="round" fill="none"/></svg>
      OPEN @tradewatchalert_bot
    </a>
    <div style="margin-top:16px;font-size:0.72rem;color:var(--muted);opacity:0.6">
      Tap the bot → tap START → open the app link
    </div>
  `;
  document.body.appendChild(gate);
}

// ── TELEGRAM CONNECTION TOAST ─────────────────────
function showTgToast(msg) {
  const el = document.getElementById('tg-toast');
  if (!el) return;
  el.innerHTML = msg;
  el.style.display = 'block';
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.transition = 'opacity 0.6s';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; el.style.transition = ''; }, 600);
  }, 4000);
}

// ── SWIPE GESTURES (mobile) ──────────────────────
(function() {
  let touchStartX = 0, touchStartY = 0;

  let touchStartedInChart = false;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    // Track if touch started inside the chart canvas
    const chartEl = document.getElementById('lw-chart');
    touchStartedInChart = chartEl ? chartEl.contains(e.target) : false;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!isMobileLayout()) return;
    if (document.getElementById('add-modal').style.display !== 'none') return;
    if (document.getElementById('tg-modal').style.display !== 'none') return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // If touch started inside the chart, only allow edge-swipe back
    // (left 30px of screen) — this lets chart pan/zoom work freely
    const current = navStack[navStack.length - 1];
    if (touchStartedInChart && current === 'chart') {
      // Only trigger back if swipe started from left edge of screen
      if (touchStartX > 30) return;
    }

    // Stricter threshold: 80px horizontal, must be much more horizontal than vertical
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2.5) return;

    if (dx > 0) {
      goBack();
    } else {
      if (current === 'watchlist' && selectedAsset) {
        mobileTab('chart');
      } else if (current === 'chart') {
        mobileTab('alerts');
      }
    }
  }, { passive: true });
})();

init();
