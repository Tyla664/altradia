// altradia — Config, Asset Catalogue, Global State
// Loaded first — all other files depend on these globals

// ═══════════════════════════════════════════════
// altradia — app.js
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
  // CRYPTO — OANDA primary (where available), CoinGecko fallback
  //          Deriv secondary for tick streaming on supported pairs
  // ════════════════════════════════════════════
  { id:'bitcoin',       symbol:'BTC',    name:'Bitcoin',           cat:'crypto', sources:['deriv','coingecko','oanda'], cgId:'bitcoin',       derivSym:'cryBTCUSD',  oandaSym:'BTC_USD' },
  { id:'ethereum',      symbol:'ETH',    name:'Ethereum',          cat:'crypto', sources:['deriv','coingecko','oanda'], cgId:'ethereum',      derivSym:'cryETHUSD',  oandaSym:'ETH_USD' },
  { id:'solana',        symbol:'SOL',    name:'Solana',            cat:'crypto', sources:['deriv','coingecko','oanda'], cgId:'solana',        derivSym:'crySOLUSD',  oandaSym:'SOL_USD' },
  { id:'ripple',        symbol:'XRP',    name:'XRP',               cat:'crypto', sources:['deriv','coingecko','oanda'], cgId:'ripple',        derivSym:'cryXRPUSD',  oandaSym:'XRP_USD' },
  { id:'binancecoin',   symbol:'BNB',    name:'BNB',               cat:'crypto', sources:['coingecko'],                cgId:'binancecoin'                          },
  { id:'dogecoin',      symbol:'DOGE',   name:'Dogecoin',          cat:'crypto', sources:['deriv','coingecko','oanda'], cgId:'dogecoin',      derivSym:'cryDOGEUSD', oandaSym:'DOGE_USD'},
  { id:'cardano',       symbol:'ADA',    name:'Cardano',           cat:'crypto', sources:['coingecko','deriv'],         cgId:'cardano',       derivSym:'cryADAUSD'  },
  { id:'avalanche-2',   symbol:'AVAX',   name:'Avalanche',         cat:'crypto', sources:['coingecko'],                cgId:'avalanche-2'                          },
  { id:'chainlink',     symbol:'LINK',   name:'Chainlink',         cat:'crypto', sources:['coingecko'],                cgId:'chainlink'                            },
  { id:'litecoin',      symbol:'LTC',    name:'Litecoin',          cat:'crypto', sources:['deriv','coingecko','oanda'], cgId:'litecoin',      derivSym:'cryLTCUSD',  oandaSym:'LTC_USD' },
  { id:'polkadot',      symbol:'DOT',    name:'Polkadot',          cat:'crypto', sources:['coingecko'],                cgId:'polkadot'                             },
  { id:'shiba-inu',     symbol:'SHIB',   name:'Shiba Inu',         cat:'crypto', sources:['coingecko'],                cgId:'shiba-inu'                            },
  { id:'uniswap',       symbol:'UNI',    name:'Uniswap',           cat:'crypto', sources:['coingecko'],                cgId:'uniswap'                              },
  { id:'cosmos',        symbol:'ATOM',   name:'Cosmos',            cat:'crypto', sources:['coingecko'],                cgId:'cosmos'                               },
  { id:'stellar',       symbol:'XLM',    name:'Stellar',           cat:'crypto', sources:['coingecko'],                cgId:'stellar'                              },
  { id:'monero',        symbol:'XMR',    name:'Monero',            cat:'crypto', sources:['coingecko'],                cgId:'monero'                               },
  { id:'tron',          symbol:'TRX',    name:'TRON',              cat:'crypto', sources:['coingecko'],                cgId:'tron'                                 },
  { id:'aave',          symbol:'AAVE',   name:'Aave',              cat:'crypto', sources:['coingecko'],                cgId:'aave'                                 },
  { id:'near',          symbol:'NEAR',   name:'NEAR Protocol',     cat:'crypto', sources:['coingecko'],                cgId:'near'                                 },
  { id:'aptos',         symbol:'APT',    name:'Aptos',             cat:'crypto', sources:['coingecko'],                cgId:'aptos'                                },
  { id:'arbitrum',      symbol:'ARB',    name:'Arbitrum',          cat:'crypto', sources:['coingecko'],                cgId:'arbitrum'                             },
  { id:'optimism',      symbol:'OP',     name:'Optimism',          cat:'crypto', sources:['coingecko'],                cgId:'optimism'                             },
  { id:'sui',           symbol:'SUI',    name:'Sui',               cat:'crypto', sources:['coingecko'],                cgId:'sui'                                  },
  { id:'toncoin',       symbol:'TON',    name:'Toncoin',           cat:'crypto', sources:['coingecko'],                cgId:'toncoin'                              },
  { id:'pepe',          symbol:'PEPE',   name:'Pepe',              cat:'crypto', sources:['coingecko'],                cgId:'pepe'                                 },
  { id:'bonk',          symbol:'BONK',   name:'Bonk',              cat:'crypto', sources:['coingecko'],                cgId:'bonk'                                 },
  { id:'maker',         symbol:'MKR',    name:'MakerDAO',          cat:'crypto', sources:['coingecko'],                cgId:'maker'                                },
  { id:'kaspa',         symbol:'KAS',    name:'Kaspa',             cat:'crypto', sources:['coingecko'],                cgId:'kaspa'                                },
  { id:'render-token',  symbol:'RENDER', name:'Render',            cat:'crypto', sources:['coingecko'],                cgId:'render-token'                         },
  { id:'fetch-ai',      symbol:'FET',    name:'Fetch.AI',          cat:'crypto', sources:['coingecko'],                cgId:'fetch-ai'                             },
  { id:'worldcoin-wld', symbol:'WLD',    name:'Worldcoin',         cat:'crypto', sources:['coingecko'],                cgId:'worldcoin-wld'                        },
  { id:'celestia',      symbol:'TIA',    name:'Celestia',          cat:'crypto', sources:['coingecko'],                cgId:'celestia'                             },
  { id:'starknet',      symbol:'STRK',   name:'Starknet',          cat:'crypto', sources:['coingecko'],                cgId:'starknet'                             },
  { id:'hedera',        symbol:'HBAR',   name:'Hedera',            cat:'crypto', sources:['coingecko'],                cgId:'hedera-hashgraph'                     },
  { id:'vechain',       symbol:'VET',    name:'VeChain',           cat:'crypto', sources:['coingecko'],                cgId:'vechain'                              },
  { id:'algorand',      symbol:'ALGO',   name:'Algorand',          cat:'crypto', sources:['coingecko'],                cgId:'algorand'                             },
  { id:'internet-computer', symbol:'ICP',name:'ICP',              cat:'crypto', sources:['coingecko'],                cgId:'internet-computer'                    },
  { id:'filecoin',      symbol:'FIL',    name:'Filecoin',          cat:'crypto', sources:['coingecko'],                cgId:'filecoin'                             },
  { id:'injective-protocol',symbol:'INJ',name:'Injective',        cat:'crypto', sources:['coingecko'],                cgId:'injective-protocol'                   },
  { id:'sei-network',   symbol:'SEI',    name:'Sei',               cat:'crypto', sources:['coingecko'],                cgId:'sei-network'                          },
  { id:'immutable-x',   symbol:'IMX',   name:'Immutable X',       cat:'crypto', sources:['coingecko'],                cgId:'immutable-x'                          },
  { id:'polygon',       symbol:'MATIC',  name:'Polygon',           cat:'crypto', sources:['coingecko'],                cgId:'matic-network'                        },

  // ════════════════════════════════════════════
  // FOREX — OANDA primary, Deriv secondary
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
let alertSourceId = null; // set when chart opened via alert card tap

// Feature state
let slStreakWarningEnabled = false;
let slStreakThreshold      = 3;
let consecutiveSlCount     = 0;
let watchlistGrouped       = true;

// Telegram notification preferences (all on by default)
let tgNotifPrefs = {
  proximity:    true,  // price approaching alert level
  confirmation: true,  // alert set / edited confirmation
  queued:       true,  // trade setup watching (queued, not yet active)
  other:        true,  // any other non-critical messages
};

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
let telegramUserName  = '';
let telegramUserPhoto = ''; // Telegram profile picture URL (from WebApp SDK)

// Asset library reference
const ASSET_LIBRARY = ALL_ASSETS;

// Alert editing
let editingAlertId   = null;
let userTypingInForm = false;
// altradia — Data Layer
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
          lastClose: prev?.lastClose || newPrice, // preserve candle close from chart data
          vol: '—', mcap: '—', live: true, src: 'deriv',
        };
        prices[asset.id] = newPrice;

        // ── Real-time alert check on every live tick ──────────────────────
        // Setup alerts: checked every tick (throttled 2s) to catch brief wicks.
        // Zone/above/below: also checked on tick so they're not delayed 8s.
        const _tickNow = Date.now();
        const _throttleKey = 'lastSetupCheck_' + asset.id;
        if (!window[_throttleKey] || (_tickNow - window[_throttleKey]) >= 2000) {
          window[_throttleKey] = _tickNow;
          const _nowDate = new Date(_tickNow);
          if (isMarketOpenForAsset(asset.id, _nowDate)) {
            alerts.forEach(al => {
              if (al.status !== 'active' || al.assetId !== asset.id) return;
              if (al.condition === 'setup') {
                checkSetupLevels(al, newPrice);
              } else if (al.condition === 'zone' || al.condition === 'above' || al.condition === 'below' || al.condition === 'tap') {
                // Run full checkAlerts logic for this specific alert inline
                checkSingleAlert(al, newPrice, _tickNow, _nowDate);
              }
            });
          }
        }
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
        change:    prev?.open ? (((price - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
        high:      prev?.high  ? Math.max(prev.high, price) : price,
        low:       prev?.low   ? Math.min(prev.low,  price) : price,
        open:      prev?.open  || price,
        // lastClose: carry forward from chart candles; OANDA mid = good approximation
        lastClose: prev?.lastClose || price,
        vol:       '—', mcap: '—', live: true, src: 'oanda',
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
      const cgPrev = priceData[asset.id];
      priceData[asset.id] = {
        price,
        change:    coin.price_change_percentage_24h?.toFixed(4) || '0.0000',
        high:      coin.high_24h,
        low:       coin.low_24h,
        open:      coin.current_price - (coin.price_change_24h || 0),
        // lastClose: CoinGecko gives 24h open; use it as the last confirmed session close
        lastClose: cgPrev?.lastClose || (coin.current_price - (coin.price_change_24h || 0)),
        vol:       coin.total_volume ? formatVol(coin.total_volume) : '—',
        mcap:      coin.market_cap   ? formatVol(coin.market_cap)   : '—',
        live: true, src: 'coingecko',
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
  // Collect all assets currently needed
  const watchedIds = new Set(Object.values(ASSETS).flat().map(a => a.id));
  const hotIds     = new Set(Object.values(HOT_LIST).flat());
  const allNeeded  = [...new Set([...watchedIds, ...hotIds])].map(id => ASSET_BY_ID.get(id)).filter(Boolean);

  // CoinGecko: ALL crypto — always reliable
  const cgAssets = allNeeded.filter(a => a.sources?.includes('coingecko'));

  // Deriv REST snapshots for forex/indices/commodities/synthetics
  // Fetch ticks_history count:1 directly — same as WS does but via one-shot connections
  // This guarantees prices on init even before the persistent WS ticks arrive
  const derivAssets = allNeeded.filter(a =>
    a.derivSym && !a.sources?.includes('coingecko')
  );

  const promises = [
    cgAssets.length ? fetchCryptoPrices(cgAssets) : Promise.resolve(),
  ];

  // Batch Deriv snapshot: one price per asset via ticks_history REST
  if (derivAssets.length) {
    promises.push(fetchDerivSnapshots(derivAssets));
  }

  await Promise.all(promises);

  checkAlerts();
  updateSessionDisplay();
}

// Fetch last tick price for each Deriv asset via one-shot WS calls (batched)
async function fetchDerivSnapshots(assets) {
  if (!assets.length) return;
  // Use a single one-shot WS and batch all requests
  return new Promise(resolve => {
    let pending = assets.length;
    const done = () => { if (--pending <= 0) resolve(); };
    const timeout = setTimeout(resolve, 8000); // 8s max wait

    try {
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
      ws.onopen = () => {
        assets.forEach(a => {
          ws.send(JSON.stringify({
            ticks_history: a.derivSym,
            end: 'latest', count: 1, style: 'ticks',
          }));
        });
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.msg_type === 'history' && msg.history?.prices?.length) {
            const sym   = msg.echo_req?.ticks_history;
            const asset = sym ? ASSET_BY_DERIV.get(sym) : null;
            if (asset) {
              const price = parseFloat(msg.history.prices[msg.history.prices.length - 1]);
              if (price) {
                const prev = priceData[asset.id];
                // Only set if we don't already have a live tick (don't overwrite fresher data)
                if (!prev?.price || prev.src === 'deriv_snap') {
                  priceData[asset.id] = {
                    price,
                    change: prev?.open ? (((price - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
                    high:   prev?.high ? Math.max(prev.high, price) : price,
                    low:    prev?.low  ? Math.min(prev.low,  price) : price,
                    open:   prev?.open || price,
                    lastClose: prev?.lastClose || price,
                    vol: '—', mcap: '—', live: true, src: 'deriv_snap',
                  };
                  prices[asset.id] = price;
                }
              }
            }
            done();
          } else if (msg.error) {
            done();
          }
        } catch(e) { done(); }
      };
      ws.onerror = () => { clearTimeout(timeout); resolve(); };
      ws.onclose = () => { clearTimeout(timeout); resolve(); };
      // Close after all responses or timeout
      const closeTimer = setTimeout(() => { try { ws.close(); } catch(e) {} }, 7000);
    } catch(e) { resolve(); }
  });
}


// ═══════════════════════════════════════════════
async function fetchSingleAsset(asset) {
  if (!asset) return;
  // Crypto: CoinGecko for instant price, then subscribe Deriv for live ticks
  if (asset.sources?.includes('coingecko')) {
    await fetchCryptoPrices([asset]);
    if (asset.derivSym) subscribeDerivAsset(asset);
    return;
  }
  // Forex/indices/commodities/synthetics: Deriv snapshot + live subscription
  if (asset.derivSym) {
    fetchDerivSnapshots([asset]); // fire-and-forget snapshot for immediate price
    subscribeDerivAsset(asset);   // subscribe for live ticks on top
    return;
  }
  // Stocks CFD with no Deriv symbol: OANDA only
  if (OANDA_KEY && asset.oandaSym) {
    await fetchOandaSnapshot([asset]);
  }
}

// Format a triggeredAt value (ISO string, timestamp, or locale string) → readable time
function formatTriggeredAt(val) {
  if (!val || val === 'null') return '—';
  // Already a locale time string (e.g. "11:02 AM")
  if (typeof val === 'string' && !val.includes('T') && !val.includes('-')) return val;
  // ISO string or timestamp
  try {
    const d = new Date(typeof val === 'number' ? val : val);
    if (!isNaN(d)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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

// altradia — Watchlist & Hotlist
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
  updateChartWatchlistBtn();

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
  // On mobile, never show .selected on watchlist cards — it causes the
  // "footprint" effect. The selected state only makes sense on desktop
  // where the watchlist and chart are visible side by side.
  if (isMobileLayout()) {
    document.querySelectorAll('.asset-card').forEach(card => {
      card.classList.remove('selected');
      card.style.removeProperty('--before-opacity');
    });
    return;
  }
  // Desktop: highlight the selected card normally
  document.querySelectorAll('.asset-card').forEach(card => {
    const assetId = card.dataset.assetId;
    const isSelected = selectedAsset && assetId === selectedAsset.id;
    card.classList.toggle('selected', isSelected);
    if (isSelected) card.style.setProperty('--before-opacity', '1');
    else card.style.removeProperty('--before-opacity');
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
  const catLabels = { crypto:'CRYPTO', forex:'FOREX', commodities:'COMMODITIES', indices:'INDICES', stocks:'STOCKS', synthetics:'SYNTHETICS' };

  if (watchlistGrouped) {
    // ── Grouped view (default): render into existing per-category containers ──
    Object.entries(ASSETS).forEach(([cat, assets]) => {
      const container = document.getElementById(cat + '-list');
      const labelEl   = container?.previousElementSibling; // the market-group-label div
      if (!container) return;
      container.innerHTML = '';
      // Show/hide the category label based on whether it has assets
      if (labelEl && labelEl.classList.contains('market-group-label')) {
        labelEl.style.display = assets.length ? '' : 'none';
      }
      assets.forEach(asset => {
        const hasAlert  = alerts.some(a => a.assetId === asset.id && a.status === 'active');
        const isSelected = !isMobileLayout() && selectedAsset && selectedAsset.id === asset.id;
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
          if (e.target.classList.contains('asset-remove') || e.target.closest('.asset-remove')) return;
          navigateToChartOnSelect = true;
          selectAsset(asset);
        };
        container.appendChild(card);
        totalCount++;
      });
    });
    // Show ungrouped flat container if exists — hide it
    const flat = document.getElementById('wl-flat-list');
    if (flat) flat.style.display = 'none';
    // Show the normal grouped sections
    document.querySelectorAll('#panel-my-watchlist .market-group').forEach(g => { g.style.display = ''; });
  } else {
    // ── Flat view: hide all category groups, show one flat list ──
    document.querySelectorAll('#panel-my-watchlist .market-group').forEach(g => { g.style.display = 'none'; });

    // Create or reuse flat container
    let flat = document.getElementById('wl-flat-list');
    if (!flat) {
      flat = document.createElement('div');
      flat.id = 'wl-flat-list';
      flat.style.padding = '0 16px';
      const panel = document.getElementById('panel-my-watchlist');
      const emptyEl = document.getElementById('wl-empty');
      if (panel && emptyEl) panel.insertBefore(flat, emptyEl);
    }
    flat.style.display = '';
    flat.innerHTML = '';

    // Collect all assets across categories
    const allAssets = Object.entries(ASSETS).flatMap(([cat, assets]) =>
      assets.map(asset => ({ asset, cat }))
    );

    allAssets.forEach(({ asset, cat }) => {
      const hasAlert   = alerts.some(a => a.assetId === asset.id && a.status === 'active');
      const isSelected = !isMobileLayout() && selectedAsset && selectedAsset.id === asset.id;
      const catLabel   = catLabels[cat] || cat.toUpperCase();
      const card = document.createElement('div');
      card.className = `asset-card${isSelected ? ' selected' : ''}${hasAlert ? ' has-alert' : ''}`;
      card.dataset.assetId = asset.id;
      card.style.marginBottom = '8px';
      // In flat view we manage the right side inline so badge and × never collide.
      // We suppress the CSS-absolute .asset-remove by overriding its position via a wrapper.
      card.innerHTML = `
        <div class="asset-left">
          <div class="asset-symbol">${asset.symbol}</div>
          <div class="asset-name">${asset.name}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0">
          ${hasAlert ? '<div class="alert-dot" title="Alert active" style="position:static;top:auto;right:auto"></div>' : ''}
          <span style="font-family:var(--mono);font-size:0.5rem;letter-spacing:0.08em;color:var(--muted);background:var(--surface2);padding:2px 6px;border-radius:4px;white-space:nowrap">${catLabel}</span>
          <button style="background:none;border:none;color:var(--red);cursor:pointer;padding:6px;display:flex;align-items:center;flex-shrink:0;-webkit-tap-highlight-color:transparent" onclick="removeAssetFromWatchlist('${asset.id}','${cat}',event)"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        </div>`;
      card.onclick = (e) => {
        if (e.target.classList.contains('asset-remove') || e.target.closest('.asset-remove')) return;
        navigateToChartOnSelect = true;
        selectAsset(asset);
      };
      flat.appendChild(card);
      totalCount++;
    });
  }

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
      const isSelected = !isMobileLayout() && selectedAsset && selectedAsset.id === asset.id;
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

// ═══════════════════════════════════════════════
// GLOBAL ASSET SEARCH
// ═══════════════════════════════════════════════
function onGlobalSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const clearBtn = document.getElementById('global-search-clear');
  const resultsEl = document.getElementById('global-search-results');
  if (clearBtn) clearBtn.style.display = q ? '' : 'none';

  if (!q || q.length < 1) {
    if (resultsEl) resultsEl.style.display = 'none';
    return;
  }

  // Search ALL_ASSETS by symbol or name
  const results = ALL_ASSETS.filter(a =>
    a.symbol.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q)
  ).slice(0, 20);

  if (!resultsEl) return;
  if (!results.length) {
    resultsEl.innerHTML = '<div class="search-no-results">No assets found</div>';
    resultsEl.style.display = 'block';
    return;
  }

  resultsEl.innerHTML = results.map(a => {
    const inWL = Object.values(ASSETS).flat().some(w => w.id === a.id);
    return `
      <div class="search-result-item" onclick="searchSelectAsset('${a.id}')">
        <div class="search-result-left">
          <span class="search-result-symbol">${a.symbol}</span>
          <span class="search-result-name">${a.name}</span>
        </div>
        <button class="search-add-btn ${inWL ? 'in-wl' : ''}"
          onclick="searchAddToWatchlist(event,'${a.id}','${a.cat}')"
          title="${inWL ? 'In watchlist' : 'Add to watchlist'}">
          ${inWL
            ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 6,11 12,3" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
          }
        </button>
      </div>`;
  }).join('');
  resultsEl.style.display = 'block';
}

function searchSelectAsset(assetId) {
  const asset = ALL_ASSETS.find(a => a.id === assetId);
  if (!asset) return;
  clearGlobalSearch();
  selectAsset(asset);
  mobileTab('chart');
}

function searchAddToWatchlist(e, assetId, cat) {
  e.stopPropagation();
  const asset = ALL_ASSETS.find(a => a.id === assetId);
  if (!asset) return;
  const inWL = Object.values(ASSETS).flat().some(w => w.id === assetId);
  if (inWL) {
    showToast('Already Added', `${asset.symbol} is already in your watchlist.`, 'info');
    return;
  }
  if (!ASSETS[cat]) ASSETS[cat] = [];
  ASSETS[cat].push(asset);
  addToWatchlist(asset, cat);
  showToast('Added', `${asset.symbol} added to your watchlist.`, 'success');
  renderWatchlist();
  renderHotList();
  // Refresh search results to update icon
  const input = document.getElementById('global-search-input');
  if (input && input.value) onGlobalSearch(input.value);
}

function showGlobalSearch() {
  const input = document.getElementById('global-search-input');
  if (input && input.value.trim()) onGlobalSearch(input.value);
}

function clearGlobalSearch() {
  const input   = document.getElementById('global-search-input');
  const results = document.getElementById('global-search-results');
  const clear   = document.getElementById('global-search-clear');
  if (input)   { input.value = ''; input.blur(); }
  if (results) results.style.display = 'none';
  if (clear)   clear.style.display = 'none';
}

function toggleHeaderSearch() {
  const bar = document.getElementById('global-search-bar');
  const btn = document.getElementById('header-search-btn');
  if (!bar) return;
  const isVisible = bar.style.display !== 'none';
  if (isVisible) {
    bar.style.display = 'none';
    btn?.classList.remove('active');
    clearGlobalSearch();
  } else {
    bar.style.display = 'block';
    btn?.classList.add('active');
    setTimeout(() => document.getElementById('global-search-input')?.focus(), 50);
  }
}

// Collapse search bar when tapping anywhere outside the header
document.addEventListener('touchstart', (e) => {
  const bar = document.getElementById('global-search-bar');
  if (!bar || bar.style.display === 'none') return;
  const header = document.querySelector('header');
  if (header && !header.contains(e.target)) {
    bar.style.display = 'none';
    document.getElementById('header-search-btn')?.classList.remove('active');
    clearGlobalSearch();
  }
}, { passive: true });

// Close search results when tapping outside
document.addEventListener('touchstart', (e) => {
  const bar = document.getElementById('global-search-bar');
  if (bar && !bar.contains(e.target)) {
    const results = document.getElementById('global-search-results');
    if (results) results.style.display = 'none';
  }
}, { passive: true });


// ── Chart page watchlist toggle button ───────────────────────────────────────
function updateChartWatchlistBtn() {
  const btn   = document.getElementById('wl-toggle-btn');
  const icon  = document.getElementById('wl-toggle-icon');
  const label = document.getElementById('wl-toggle-label');
  if (!btn || !selectedAsset) { if (btn) btn.style.display = 'none'; return; }

  const inWL = Object.values(ASSETS).flat().some(a => a.id === selectedAsset.id);
  btn.style.display = '';
  btn.classList.toggle('in-watchlist', inWL);

  if (inWL) {
    label.textContent = 'Remove from watchlist';
    icon.innerHTML = '<line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  } else {
    label.textContent = 'Add to watchlist';
    icon.innerHTML = '<line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  }
}

function toggleChartAssetWatchlist() {
  if (!selectedAsset) return;
  const asset = selectedAsset;
  const inWL  = Object.values(ASSETS).flat().some(a => a.id === asset.id);

  if (inWL) {
    // Remove from watchlist
    Object.keys(ASSETS).forEach(cat => {
      ASSETS[cat] = (ASSETS[cat] || []).filter(a => a.id !== asset.id);
    });
    removeFromWatchlist(asset.id);
    showToast('Removed', `${asset.symbol} removed from your watchlist.`, 'error');
  } else {
    // Add to watchlist
    const cat = asset.cat || 'forex';
    if (!ASSETS[cat]) ASSETS[cat] = [];
    ASSETS[cat].push(asset);
    addToWatchlist(asset, cat);
    showToast('Added', `${asset.symbol} added to your watchlist.`, 'success');
  }
  renderWatchlist();
  renderHotList();
  updateChartWatchlistBtn();
}

function selectAsset(asset) {
  // Cancel any active edit when switching assets
  if (editingAlertId && selectedAsset && selectedAsset.id !== asset.id) {
    cancelEditAlert();
  }

  selectedAsset = asset;
  // Remember last viewed asset for next app open
  try { localStorage.setItem('altradia_last_asset', asset.id); } catch(e) {}

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
const navStack = ['chart']; // start on chart

// Returns true when the mobile bottom nav is active (regardless of device width)
// This handles landscape phones, tablets, and any unusual viewport sizes correctly.
function isMobileLayout() {
  return true; // always mobile — app is Telegram mini app only
}

function mobileTab(tab, pushState = true) {
  if (!isMobileLayout()) return;

  // Close journal modal (LOG TRADE form), journal detail overlay, and
  // close-choice modal whenever navigating away from the journal tab.
  // They must not float over other pages.
  if (tab !== 'journal') {
    const jm = document.getElementById('journal-modal');
    if (jm) { jm.style.display = 'none'; closeJournalModal(); }
    const jd = document.getElementById('journal-detail-overlay');
    if (jd) jd.remove();
    const cc = document.getElementById('close-choice-modal');
    if (cc) cc.remove();
  }

  const current = navStack[navStack.length - 1];

  // Push to stack only if navigating to a different tab
  if (pushState && tab !== current) {
    navStack.push(tab);
    // Push a browser history state so Android back button fires popstate
    window.history.pushState({ twTab: tab }, '', '');
  }

  // ── Asset card selected state: only show when on chart tab ──────────────
  // Clear selected from ALL cards whenever navigating anywhere on mobile.
  // The highlight is purely informational ("this is the charted asset") and
  // should never persist as a visual footprint when browsing the watchlist.
  document.querySelectorAll('.asset-card').forEach(card => {
    card.classList.remove('selected');
    card.style.removeProperty('--before-opacity');
  });

  // Hide all panels
  document.getElementById('panel-watchlist').classList.remove('mobile-active');
  document.getElementById('panel-main').classList.remove('mobile-active');
  document.getElementById('panel-journal')?.classList.remove('mobile-active');
  document.getElementById('panel-alerts').classList.remove('mobile-active');

  // Deactivate all nav buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  // Hide summary bar on chart & journal (they have their own headers)
  // Show it on watchlist & alerts — toggle class so header resizes naturally
  const summaryBar = document.querySelector('.summary-bar');
  if (summaryBar) {
    summaryBar.classList.toggle('sb-hidden', tab === 'chart' || tab === 'journal');
  }

  // Hide FAB unless staying on watchlist tab
  const fab = document.getElementById('wl-fab');

  if (tab === 'watchlist') {
    document.getElementById('panel-watchlist').classList.add('mobile-active');
    // Nav highlight handled by switchWLTab caller
    alertSourceId = null; updateAlertEditBtn();
  } else if (tab === 'chart') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-main');
    panel.classList.add('mobile-active');
    panel.scrollTop = 0;
    document.getElementById('mnav-chart').classList.add('active');
    const _needsForce = !lwCurrentAsset || !selectedAsset || lwCurrentAsset.id !== selectedAsset.id;
    setTimeout(() => { if (selectedAsset) loadLWChart(selectedAsset, _needsForce); }, 150);
    updateAlertEditBtn();
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
// altradia — Chart Engine
// Lightweight Charts, OHLC fetchers, alert price lines


let lwChart        = null;
let lwSeries       = null;
let lwAlertLines   = [];
let lwCurrentTF    = '1D'; // default
let lwCurrentAsset = null;
let lwLastTF       = null; // tracks last TF that was actually loaded (for idempotency)

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
  try { localStorage.setItem('altradia_last_tf', tf); } catch(e) {}
  document.querySelectorAll('.chart-tf-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === tf);
  });
  if (lwCurrentAsset) loadLWChart(lwCurrentAsset, true); // force=true: TF explicitly changed
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

  const _isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const _chartTheme = _isDark ? {
    bg:       '#080c12',
    text:     '#8899aa',
    grid:     'rgba(26,45,69,0.4)',
    border:   'rgba(26,45,69,0.6)',
  } : {
    bg:       '#ffffff',
    text:     '#334155',
    grid:     'rgba(200,215,230,0.6)',
    border:   'rgba(180,200,220,0.7)',
  };

  lwChart = LightweightCharts.createChart(container, {
    width:  w,
    height: h,
    layout: {
      background: { type: 'solid', color: _chartTheme.bg },
      textColor:  _chartTheme.text,
      fontSize:   11,
    },
    grid: {
      vertLines: { color: _chartTheme.grid },
      horzLines: { color: _chartTheme.grid },
    },
    crosshair: { mode: 1 }, // 1 = Normal
    rightPriceScale: { borderColor: _chartTheme.border },
    timeScale: {
      borderColor:    _chartTheme.border,
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
async function loadLWChart(asset, force = false) {
  if (!asset) return;
  // Don't reload chart while user is actively filling the alert form
  if (userTypingInForm) return;
  // Skip reload if already showing this asset+TF — unless forced
  // This prevents keyboard open/close from resetting the chart
  if (!force && lwChart && lwCurrentAsset && lwCurrentAsset.id === asset.id && lwLastTF === lwCurrentTF) return;
  lwLastTF = lwCurrentTF;
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

    // Store the last completed candle close — used by above/below alert trigger
    // to require a candle CLOSE beyond the level, not just a wick touch
    const lastCandle = candles[candles.length - 1];
    if (lastCandle && asset?.id) {
      if (!priceData[asset.id]) priceData[asset.id] = {};
      priceData[asset.id].lastClose = lastCandle.close;
    }
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


// altradia — Alerts
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
    createdAt:       new Date().toLocaleDateString([], {day:'2-digit',month:'short',year:'numeric'}) + ' · ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:true}),
    createdMs:       Date.now(),
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

  if (telegramEnabled && tgNotifPrefs.confirmation) {
    sendTelegram(tgCreatedMessage(assetInfo.symbol, condition, targetPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance));
  }

  renderAlerts();
  renderWatchlist();
  userTypingInForm = false;
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

  // Sort so alerts needing attention always float to top
  // Rank 0 — fired / in-zone / active trade (entry hit or beyond): needs action NOW
  // Rank 1 — setup watching (entry not yet hit): noteworthy but calm
  // Rank 2 — active / paused regular alerts: waiting
  const sortedAlerts = [...alerts].sort((a, b) => {
    const rank = al => {
      // Regular alerts: triggered (above/below/tap fired, or one-shot zone fired)
      if (al.status === 'triggered') return 0;
      if (al.condition === 'setup') {
        const st = (() => { try { return JSON.parse(al.note||'{}').tradeStatus||'watching'; } catch(e){ return 'watching'; } })();
        // Final states: sl_hit, full_tp — needs LOG TRADE action
        if (['full_tp','sl_hit'].includes(st)) return 0;
        // Active trade: entry triggered, trade is live
        if (['entry_hit','running','tp1_hit','tp2_hit'].includes(st)) return 0;
        // Still watching for entry — below regular actives
        return 1;
      }
      // Repeating zone that has fired (IN ZONE or EXITED) — still needs attention
      const isRepeatingZone = al.condition === 'zone' && (al.repeatInterval || 0) > 0;
      if (isRepeatingZone && al.zoneTriggeredOnce) return 0;
      // Tap that has fired at least once (repeating tap)
      if (al.condition === 'tap' && al.tapTriggeredOnce) return 0;
      return 2;
    };
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    // Within same rank: newest created first
    // createdMs is set on all new alerts; fall back to 0 (pre-existing alerts sort stably)
    const ta = a.createdMs || 0;
    const tb = b.createdMs || 0;
    return tb - ta; // descending — largest (newest) timestamp first
  });

  sortedAlerts.forEach(alert => {
    // Setup alerts live in the TRADES tab, not ACTIVE
    if (alert.condition === 'setup') return;

    const div = document.createElement('div');
    const isTriggered = alert.status === 'triggered';
    const dir = alert.triggeredDirection || alert.condition;
    // Zone in-zone gets its own glow class so the whole card lights up
    let cardClass = 'active-alert';
    if (isTriggered) cardClass = `triggered-${dir}`;
    div.className = `alert-item ${cardClass}`;

    let badgeClass, badgeLabel;
    const isRepeatingZone = alert.condition === 'zone' && (alert.repeatInterval || 0) > 0;
    const zoneInProgress  = isRepeatingZone && alert.zoneTriggeredOnce;
    const currentLivePrice = priceData[alert.assetId]?.price || 0;
    const isCurrentlyInZone = alert.condition === 'zone' && currentLivePrice > 0
      && currentLivePrice >= alert.zoneLow && currentLivePrice <= alert.zoneHigh;
    // Promote class to zone-in-zone for whole-card glow effect
    if (isCurrentlyInZone) div.className = 'alert-item zone-in-zone';

    if (isTriggered) {
      if (alert.condition === 'zone') {
        // Show CROSSED if price has left the zone after triggering
        if (!isCurrentlyInZone) {
          badgeClass = 'badge-zone-crossed'; badgeLabel = `${ALERT_ICONS.zone}CROSSED`;
        } else {
          badgeClass = 'badge-zone-active'; badgeLabel = `${ALERT_ICONS.inzone}IN ZONE`;
        }
      }
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
      ? (() => {
          if (alert.condition === 'zone') {
            if (isCurrentlyInZone) {
              return `<span style="color:var(--accent);font-size:0.78rem;">Price inside zone · triggered at ${formatPrice(alert.triggeredPrice, alert.assetId)}</span><br>`;
            } else {
              const side = currentLivePrice < alert.zoneLow ? 'below' : 'above';
              return `<span style="color:#e88a00;font-size:0.78rem;">Price crossed ${side} zone at ${formatPrice(alert.triggeredPrice, alert.assetId)}</span><br>`;
            }
          }
          const col = dir === 'above' || alert.condition === 'tap' ? 'var(--green)' : 'var(--red)';
          return `<span style="color:${col}">Hit ${formatPrice(alert.triggeredPrice, alert.assetId)} at ${formatTriggeredAt(alert.triggeredAt)}</span><br>`;
        })()
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

    const livePrice = priceData[alert.assetId]?.price;
    const livePriceLine = livePrice
      ? `<span style="opacity:0.55;font-size:0.72rem">Current price: <b style="opacity:0.9">${formatPrice(livePrice, alert.assetId)}</b></span><br>`
      : '';
    div.innerHTML = `
      <div class="alert-header-row">
        <div class="alert-symbol">${alert.symbol}</div>
        <div class="alert-badge ${badgeClass}">${badgeLabel}</div>
      </div>
      <div class="alert-detail">
        ${detailLine}<br>
        ${livePriceLine}
        ${triggeredLine}
        ${alert.note ? `<em style="color:var(--muted)">"${alert.note}"</em><br>` : ''}
        Set at ${alert.createdAt}
      </div>
      <div class="alert-actions">${actions}</div>`;

    // Tap card body (not buttons) → open chart for this asset
    div.style.cursor = 'pointer';
    div.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // ignore button taps
      const asset = ASSET_BY_ID.get(alert.assetId) || ALL_ASSETS.find(a => a.id === alert.assetId);
      if (!asset) return;
      alertSourceId = alert.id;
      selectAsset(asset);
      if (isMobileLayout()) mobileTab('chart');
      updateAlertEditBtn();
    });

    container.appendChild(div);
  });

  const dot = document.getElementById('alert-dot');
  if (dot) dot.classList.toggle('show', alerts.some(a => a.status === 'active'));
  if (lwCurrentAsset) drawAlertLines(lwCurrentAsset.id);

  // Update live trade count badge on TRADES tab
  const liveTradeCount = alerts.filter(a => {
    if (a.condition !== 'setup') return false;
    try {
      const st = JSON.parse(a.note||'{}').tradeStatus || 'watching';
      return ['entry_hit','running','tp1_hit','tp2_hit'].includes(st);
    } catch(e) { return false; }
  }).length;
  const badge = document.getElementById('trades-live-count');
  if (badge) {
    badge.textContent  = liveTradeCount;
    badge.style.display = liveTradeCount > 0 ? 'inline' : 'none';
  }
}

// ─── TRADES TAB ───────────────────────────────────────────────────────────────
// Renders only setup (trade) alerts — lives in the TRADES tab
function renderTradesTab() {
  const container = document.getElementById('alerts-trades');
  if (!container) return;
  container.innerHTML = '';

  const setupAlerts = alerts.filter(a => a.condition === 'setup');

  if (setupAlerts.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:40px 20px;text-align:center">
      <div class="icon" style="margin-bottom:12px">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4">
          <rect x="6" y="10" width="28" height="22" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="12" y1="18" x2="28" y2="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="12" y1="23" x2="22" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </div>
      <p style="font-family:var(--mono);font-size:0.75rem;color:var(--muted)">No trade setups yet.<br>Create a <b style="color:var(--text)">Trade SETUP</b> alert<br>to track it here.</p>
    </div>`;
    return;
  }

  // Sort: active trades first, then watching
  const sorted = [...setupAlerts].sort((a, b) => {
    const rank = al => {
      try {
        const st = JSON.parse(al.note||'{}').tradeStatus || 'watching';
        if (['full_tp','sl_hit'].includes(st)) return 0;
        if (['entry_hit','running','tp1_hit','tp2_hit'].includes(st)) return 1;
        return 2;
      } catch(e) { return 2; }
    };
    return rank(a) - rank(b);
  });

  sorted.forEach(alert => {
    const div = document.createElement('div');
    renderSetupCard(alert, div);
    container.appendChild(div);
  });
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
  const listEl   = document.getElementById('alerts-list');
  const tradesEl = document.getElementById('alerts-trades');
  const histEl   = document.getElementById('alerts-history');

  // Hide all
  if (listEl)   listEl.style.display   = 'none';
  if (tradesEl) tradesEl.style.display = 'none';
  if (histEl)   histEl.style.display   = 'none';

  if (tab === 'active') {
    if (listEl) listEl.style.removeProperty('display');
  } else if (tab === 'trades') {
    if (tradesEl) { tradesEl.style.removeProperty('display'); renderTradesTab(); }
  } else {
    if (histEl) histEl.style.removeProperty('display');
    renderHistory();
  }

  document.getElementById('atab-active')?.classList.toggle('active',  tab === 'active');
  document.getElementById('atab-trades')?.classList.toggle('active',  tab === 'trades');
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


// ── Proximity helper: fire once per level, reset on status change ──────────
function checkSetupProximity(alert, j, currentPrice, prev) {
  if (!telegramEnabled || !telegramChatId) return;
  // Suppress ALL proximity warnings for 5 minutes after any level transition
  // This prevents spam when app opens and loads a freshly-transitioned alert
  const lastFired = alert.lastTriggeredAt || 0;
  if ((Date.now() - lastFired) < 300000) return; // 5 min suppression after transition
  // Also suppress if entry has already been triggered (state is beyond watching)
  if (prev !== 'watching' && prev !== 'entry_hit' && prev !== 'running') return;
  const PROX = 0.015; // 1.5% proximity threshold for setup levels
  const entry = alert.targetPrice;
  const sl    = j.sl;
  const tp1   = j.tp1;
  const tp2   = j.tp2 || null;
  const isLong = j.direction === 'long';
  let noteDirty = false;

  // Only warn about entry when watching and price hasn't already crossed entry
  if (prev === 'watching' && entry) {
    const dist = Math.abs(currentPrice - entry) / entry;
    const approaching = isLong ? currentPrice < entry : currentPrice > entry; // price moving toward entry
    // Don't fire if price has already crossed entry — entry was already triggered
    // (handles case where DB note is stale and still shows 'watching')
    const alreadyCrossed = isLong ? currentPrice >= entry : currentPrice <= entry;
    if (dist <= PROX && dist > 0.001 && approaching && !j.proxWarnedEntry && !alreadyCrossed) {
      j.proxWarnedEntry = true;
      noteDirty = true;
      const distPct = (dist * 100).toFixed(2);
      if (tgNotifPrefs.proximity) sendTelegram([
        `👀 <b>ENTRY APPROACHING — ${alert.symbol}</b>`,
        ``,
        `Price is within ${distPct}% of your entry level.`,
        ``,
        tgRow('Entry',         `<b>${entry}</b>`),
        tgRow('Current price', `<b>${formatPrice(currentPrice, alert.assetId)}</b>`),
        tgRow('Direction',     `<b>${isLong ? 'LONG' : 'SHORT'}</b>`),
        alert.timeframe ? tgRow('Timeframe', `<b>${alert.timeframe}</b>`) : null,
        ``,
        `<i>Get ready — your trade may activate soon.</i>`,
        `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
      ].filter(Boolean).join('\n'));
    }
  }

  // Warn about SL any time after entry has triggered
  const entryAlreadyHit = ['entry_hit','running','tp1_hit','tp2_hit'].includes(prev);
  if (entryAlreadyHit && sl) {
    const dist = Math.abs(currentPrice - sl) / sl;
    const approaching = isLong ? currentPrice > sl : currentPrice < sl; // price still outside SL
    if (dist <= PROX && dist > 0.001 && approaching && !j.proxWarnedSL) {
      j.proxWarnedSL = true;
      noteDirty = true;
      const distPct = (dist * 100).toFixed(2);
      if (tgNotifPrefs.proximity) sendTelegram([
        `⚠️ <b>STOP LOSS APPROACHING — ${alert.symbol}</b>`,
        ``,
        `Price is within ${distPct}% of your stop loss.`,
        ``,
        tgRow('Stop Loss',     `<b>${sl}</b>`),
        tgRow('Current price', `<b>${formatPrice(currentPrice, alert.assetId)}</b>`),
        tgRow('Direction',     `<b>${isLong ? 'LONG' : 'SHORT'}</b>`),
        ``,
        `<i>Consider protecting your position.</i>`,
        `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
      ].filter(Boolean).join('\n'));
    }
  }

  // Warn about TP1 when running
  if (['entry_hit','running'].includes(prev) && tp1) {
    const dist = Math.abs(currentPrice - tp1) / tp1;
    const approaching = isLong ? currentPrice < tp1 : currentPrice > tp1;
    if (dist <= PROX && dist > 0.001 && approaching && !j.proxWarnedTP1) {
      j.proxWarnedTP1 = true;
      noteDirty = true;
      const distPct = (dist * 100).toFixed(2);
      if (tgNotifPrefs.proximity) sendTelegram([
        `👀 <b>TP1 APPROACHING — ${alert.symbol}</b>`,
        ``,
        `Price is within ${distPct}% of your first take profit.`,
        ``,
        tgRow('TP1',           `<b>${tp1}</b>`),
        tgRow('Current price', `<b>${formatPrice(currentPrice, alert.assetId)}</b>`),
        ``,
        `<i>Consider securing partial profits at TP1.</i>`,
        `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
      ].filter(Boolean).join('\n'));
    }
  }

  // Warn about TP2 when tp1 already hit and tp2Notify is on
  if (prev === 'tp1_hit' && tp2 && j.tp2Notify !== false) {
    const dist = Math.abs(currentPrice - tp2) / tp2;
    const approaching = isLong ? currentPrice < tp2 : currentPrice > tp2;
    if (dist <= PROX && dist > 0.001 && approaching && !j.proxWarnedTP2) {
      j.proxWarnedTP2 = true;
      noteDirty = true;
      const distPct = (dist * 100).toFixed(2);
      if (tgNotifPrefs.proximity) sendTelegram([
        `👀 <b>TP2 APPROACHING — ${alert.symbol}</b>`,
        ``,
        `Price is within ${distPct}% of your second take profit.`,
        ``,
        tgRow('TP2',           `<b>${tp2}</b>`),
        tgRow('Current price', `<b>${formatPrice(currentPrice, alert.assetId)}</b>`),
        ``,
        `<i>Decide whether to secure profits at TP2 or let it run.</i>`,
        `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
      ].filter(Boolean).join('\n'));
    }
  }

  // Persist proximity flags if any were set
  if (noteDirty) {
    alert.note = JSON.stringify(j);
    updateAlert(alert.id, { note: alert.note });
  }
}

// ── Check setup alert levels against live price ────────────────────────────
function checkSetupLevels(alert, currentPrice) {
  if (!currentPrice) return;
  let j;
  try { j = JSON.parse(alert.note || '{}'); } catch(e) { return; }

  const prev   = j.tradeStatus || 'watching';
  const entry  = alert.targetPrice;
  const sl     = j.sl;
  const tp1    = j.tp1;
  const tp2    = j.tp2 || null;
  const tp3    = j.tp3 || null;
  const isLong = j.direction === 'long';

  // Already in a final or closed state — nothing to check
  if (['full_tp','sl_hit','cancelled','manual_exit'].includes(prev)) return;

  // Check proximity warnings before level transitions
  checkSetupProximity(alert, j, currentPrice, prev);

  let next = prev;

  // ── Determine next status based on price ─────────────────────────────────
  // IMPORTANT: Each state transition is evaluated separately and exclusively.
  // Entry must be confirmed on a prior tick before TP/SL are ever checked.
  // This prevents a "false trigger" where entry + TP fire in the same tick.

  if (prev === 'watching') {
    // Two-phase entry detection — works for ALL setup types:
    //
    // The key insight is priceAtCreation (pac) tells us which side price is on
    // when the alert is set. Entry fires when price CROSSES to the other side,
    // then RETURNS back to the entry level (the retest/tap).
    //
    // pac < entry → price starts BELOW entry:
    //   Phase 1: price rises to >= entry (breakout above, or sweep)
    //   Phase 2: entry fires when price comes back DOWN to <= entry (retest tap)
    //   Covers: LONG breakout-retest, SHORT ICT sweep
    //
    // pac > entry → price starts ABOVE entry:
    //   Phase 1: price falls to <= entry (breakout below, or dip)
    //   Phase 2: entry fires when price bounces back UP to >= entry (retest tap)
    //   Covers: SHORT breakout-retest, LONG ICT dip
    //
    // No pac (old alerts): fall back to direction-based logic
    //   LONG: phase1 = price <= entry, fires when price >= entry
    //   SHORT: phase1 = price >= entry, fires when price <= entry

    const pac = j.priceAtCreation ? parseFloat(j.priceAtCreation) : null;

    let setupSideReached, rawEntryHit;
    if (pac !== null && pac < entry) {
      // Price started BELOW entry → must visit ABOVE first, then retest back down
      setupSideReached = currentPrice >= entry;
      rawEntryHit      = currentPrice <= entry;
    } else if (pac !== null && pac > entry) {
      // Price started ABOVE entry → must visit BELOW first, then retest back up
      setupSideReached = currentPrice <= entry;
      rawEntryHit      = currentPrice >= entry;
    } else {
      // No priceAtCreation — fall back to direction-based logic (old alerts)
      setupSideReached = isLong ? currentPrice <= entry : currentPrice >= entry;
      rawEntryHit      = isLong ? currentPrice >= entry : currentPrice <= entry;
    }

    // Phase 1: mark that price has visited the setup side (opposite of pac)
    let noteDirty = false;
    if (!j.priceVisitedSetupSide && setupSideReached) {
      j.priceVisitedSetupSide = true;
      noteDirty = true;
    }

    const setupVisited = j.priceVisitedSetupSide || false;
    const entryHit = rawEntryHit && setupVisited;

    if (entryHit) {
      const now = Date.now();
      // Shared cooldown: check lastTriggeredAt (set by BOTH frontend and Edge Function)
      // This prevents duplicate fires when both sources try to fire at the same time
      const lastFired = alert.lastTriggeredAt || 0;
      if ((now - lastFired) < 90000) return; // 90s shared cooldown
      // Also check the in-memory flag for same-session re-fires
      if (j.entryFiredMs && (now - j.entryFiredMs) < 90000) return;

      j.tradeStatus = 'entry_hit';
      j.priceVisitedSetupSide = true;
      j.entryFiredMs = now;
      // Mark proxWarned flags so frontend doesn't spam SL/TP approaching
      // immediately after entry fires (Edge Function may have already transitioned)
      // Only mark if SL/TP are NOT currently being approached
      delete j.proxWarnedEntry;
      alert.note = JSON.stringify(j);
      // Update both note and last_triggered_at so Edge Function sees we already fired
      updateAlert(alert.id, { note: alert.note, last_triggered_at: new Date().toISOString() });
      alert.lastTriggeredAt = now; // update in-memory too
      renderAlerts();
      showToast(`ENTRY HIT — ${alert.symbol}`, 'Price reached your entry. Your trade may now be active.', 'info');
      if (telegramEnabled && telegramChatId && tgNotifPrefs.queued) {
        sendTelegram(tgSetupLevelMessage(alert.symbol, 'entry_hit', currentPrice, alert.assetId, j));
      }
      return;
    }

    // If we updated the priceVisitedSetupSide flag, persist it quietly
    if (noteDirty) {
      alert.note = JSON.stringify(j);
      updateAlert(alert.id, { note: alert.note });
    }
    return; // still watching
  }

  // Only reach here when prev is entry_hit, running, tp1_hit, or tp2_hit
  // At this point entry has already been confirmed on a previous tick.

  if (prev === 'entry_hit') {
    // Trade is active — now monitor SL and TPs
    if (sl) {
      const slHit = isLong ? currentPrice <= sl : currentPrice >= sl;
      if (slHit) { next = 'sl_hit'; }
    }
    if (next !== 'sl_hit') {
      const topTp  = tp3 || tp2 || tp1;
      const topHit = topTp && (isLong ? currentPrice >= topTp : currentPrice <= topTp);
      const tp2Hit = tp2 && (isLong ? currentPrice >= tp2 : currentPrice <= tp2);
      const tp1Hit = tp1 && (isLong ? currentPrice >= tp1 : currentPrice <= tp1);
      if      (topHit)  next = 'full_tp';
      else if (tp2Hit)  next = 'tp2_hit';
      else if (tp1Hit)  next = 'tp1_hit';
      else              next = 'running';
    }
  }

  if (prev === 'running') {
    // Running: monitor SL and TPs
    if (sl) {
      const slHit = isLong ? currentPrice <= sl : currentPrice >= sl;
      if (slHit) next = 'sl_hit';
    }
    if (next !== 'sl_hit') {
      const topTp  = tp3 || tp2 || tp1;
      const topHit = topTp && (isLong ? currentPrice >= topTp : currentPrice <= topTp);
      const tp2Hit = tp2 && (isLong ? currentPrice >= tp2 : currentPrice <= tp2);
      const tp1Hit = tp1 && (isLong ? currentPrice >= tp1 : currentPrice <= tp1);
      if      (topHit)  next = 'full_tp';
      else if (tp2Hit)  next = 'tp2_hit';
      else if (tp1Hit)  next = 'tp1_hit';
    }
  }

  if (prev === 'tp1_hit') {
    if (sl) {
      const slHit = isLong ? currentPrice <= sl : currentPrice >= sl;
      if (slHit) next = 'sl_hit';
    }
    if (next !== 'sl_hit') {
      const topTp  = tp3 || tp2;
      const topHit = topTp && (isLong ? currentPrice >= topTp : currentPrice <= topTp);
      const tp2Hit = tp2 && (isLong ? currentPrice >= tp2 : currentPrice <= tp2);
      if      (topHit) next = 'full_tp';
      else if (tp2Hit) next = 'tp2_hit';
    }
  }

  if (prev === 'tp2_hit') {
    if (sl) {
      const slHit = isLong ? currentPrice <= sl : currentPrice >= sl;
      if (slHit) next = 'sl_hit';
    }
    if (next !== 'sl_hit' && tp3) {
      const tp3Hit = isLong ? currentPrice >= tp3 : currentPrice <= tp3;
      if (tp3Hit) next = 'full_tp';
    }
  }

  // No state change — nothing to do
  if (next === prev) return;

  // Shared cooldown: use lastTriggeredAt DB column (shared with Edge Function)
  // Plus per-transition in-note flag as secondary guard
  const _now = Date.now();
  const _lastShared = alert.lastTriggeredAt || 0;
  const _lastKey = `lastFired_${next}`;
  if ((_now - _lastShared) < 60000) return; // 60s shared cooldown
  if (j[_lastKey] && (_now - j[_lastKey]) < 60000) return; // per-transition guard

  // ── Apply state change ────────────────────────────────────────────────────
  j.tradeStatus = next;
  j[_lastKey] = _now;
  // Reset proximity flags so the new phase gets fresh warnings
  // Only reset SL/TP flags on TP transitions (not on running — SL might still be close)
  if (['sl_hit','full_tp','tp1_hit','tp2_hit'].includes(next)) {
    delete j.proxWarnedSL;
    delete j.proxWarnedTP1;
    delete j.proxWarnedTP2;
  }
  delete j.proxWarnedEntry;
  alert.note = JSON.stringify(j);

  // Persist note + last_triggered_at (shared cooldown signal for Edge Function)
  updateAlert(alert.id, { note: alert.note, last_triggered_at: new Date().toISOString() });
  alert.lastTriggeredAt = _now; // update in-memory too

  // Render updated card
  renderAlerts();

  // Toast notification
  const isFinal = ['full_tp','sl_hit'].includes(next);
  const msgs = {
    entry_hit: [`ENTRY HIT — ${alert.symbol}`, 'Price reached your entry. Your trade may now be active.'],
    running:   [`TRADE RUNNING — ${alert.symbol}`, 'Trade is live. Monitoring SL and TP levels.'],
    tp1_hit:   [`TP1 HIT — ${alert.symbol}`, 'First take profit reached! Consider securing partial profits.'],
    tp2_hit:   [`TP2 HIT — ${alert.symbol}`, 'Second target hit! Protect remaining position.'],
    full_tp:   [`FULL TP HIT — ${alert.symbol}`, 'All targets reached! Tap LOG TRADE to record this win.'],
    sl_hit:    [`STOP LOSS HIT — ${alert.symbol}`, 'Price hit your stop loss. Tap LOG TRADE to record the trade.'],
  };
  const [title, body] = msgs[next] || [`${alert.symbol} update`, ''];
  showToast(title, body + (isFinal ? '' : ''), isFinal ? 'alert' : 'info');
  if (isFinal) playAlertSound(selectedAlertSound);

  // SL streak discipline check
  if (isFinal) checkSlStreak(next);

  // Telegram level notification
  if (telegramEnabled && telegramChatId) {
    sendTelegram(tgSetupLevelMessage(alert.symbol, next, currentPrice, alert.assetId, j));
  }
}

// ── Check a single non-setup alert against a given price ─────────────────────
// Used by the Deriv tick handler to check zone/above/below/tap alerts in real-time
function checkSingleAlert(alert, currentPrice, now, nowDate) {
  if (alert.status !== 'active') return;
  if (!isMarketOpenForAsset(alert.assetId, nowDate)) return;

  const isZone = alert.condition === 'zone';
  const isTap  = alert.condition === 'tap';
  let fired = false;

  if (isZone) {
    const inZone = currentPrice >= alert.zoneLow && currentPrice <= alert.zoneHigh;
    if (!inZone) {
      if (alert.zoneTriggeredOnce) {
        alert.zoneTriggeredOnce = false;
        updateAlert(alert.id, { last_triggered_at: null });
      }
      return;
    }
    const repeatMs  = (alert.repeatInterval || 0) * 60 * 1000;
    const lastFired = alert.lastTriggeredAt || 0;
    if (repeatMs === 0) {
      if (alert.zoneTriggeredOnce) return;
      alert.zoneTriggeredOnce = true;
      alert.status = 'triggered';
    } else {
      if (now - lastFired < repeatMs) return;
      alert.lastTriggeredAt = now;
      alert.zoneTriggeredOnce = true;
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
    // Above/below: use lastClose for candle-close confirmation
    const candleClose = priceData[alert.assetId]?.lastClose || currentPrice;
    fired =
      (alert.condition === 'above' && candleClose >= alert.targetPrice) ||
      (alert.condition === 'below' && candleClose <= alert.targetPrice);
    if (!fired) return;
    alert.status = 'triggered';
  }

  if (!fired) return;

  alert.triggeredDirection = alert.condition;
  alert.triggeredAt        = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  alert.triggeredPrice     = currentPrice;
  triggeredToday++;

  if (!isZone || (alert.repeatInterval || 0) === 0) {
    updateAlert(alert.id, {
      status: 'triggered', triggered_at: new Date().toISOString(),
      triggered_price: currentPrice, triggered_direction: alert.condition,
    });
  }

  const tfLabel = alert.timeframe ? ` [${alert.timeframe}]` : '';
  let msg;
  if (isZone) {
    msg = `Entered zone ${formatPrice(alert.zoneLow, alert.assetId)}–${formatPrice(alert.zoneHigh, alert.assetId)}${tfLabel}`;
  } else if (isTap) {
    msg = `Tapped ${formatPrice(alert.targetPrice, alert.assetId)} (±${alert.tapTolerance}%)${tfLabel}`;
  } else {
    msg = `${alert.condition === 'above' ? 'Candle closed above' : 'Candle closed below'} ${formatPrice(alert.targetPrice, alert.assetId)}${tfLabel}`;
  }

  showToast(`ALERT TRIGGERED — ${alert.symbol}`, msg, 'alert');
  playAlertSound(alert.sound || selectedAlertSound);
  const isRepeating = isZone && (alert.repeatInterval || 0) > 0;
  if (telegramEnabled && (!isRepeating || tgNotifPrefs.other)) {
    sendTelegram(tgAlertMessage('trigger', alert.symbol, alert.condition,
      alert.targetPrice, currentPrice, alert.assetId,
      alert.note, alert.timeframe, alert.zoneLow, alert.zoneHigh,
      alert.repeatInterval, alert.tapTolerance));
  }
  renderAlerts();
}

function checkAlerts() {
  const now = Date.now();
  const nowDate = new Date(now);
  alerts.forEach(alert => {
    if (alert.status !== 'active') return;
    if (!isMarketOpenForAsset(alert.assetId, nowDate)) return;
    const currentPrice = priceData[alert.assetId]?.price || prices[alert.assetId];
    if (!currentPrice) return;
    checkSingleAlert(alert, currentPrice, now, nowDate);
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
      if (telegramEnabled && telegramChatId && tgNotifPrefs.confirmation) {
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

  // ── Duplicate check: one active setup alert per asset ───────────────────
  if (!editingAlertId) {
    const dupSetup = alerts.find(a =>
      a.condition === 'setup' &&
      a.assetId === selectedAsset.id &&
      a.status === 'active'
    );
    if (dupSetup) {
      const j = getJournal(dupSetup);
      return showToast(
        'Duplicate Setup',
        `You already have an active ${j.direction === 'long' ? 'LONG' : 'SHORT'} setup on ${selectedAsset.symbol}. Edit or delete it first.`,
        'error'
      );
    }
  }

  // Pack all journal + trade data into the note field as JSON
  const currentPriceNow = priceData[selectedAsset.id]?.price || null;
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
    // Store live price at creation so checkSetupLevels can verify price
    // must actually TRAVEL to entry, not fire if already past it at creation
    priceAtCreation: currentPriceNow,
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
    createdAt:    new Date().toLocaleDateString([], {day:'2-digit',month:'short',year:'numeric'}) + ' · ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:true}),
    createdMs:    Date.now(),
  };

  alerts.push(newAlert);

  // Navigate immediately — don't wait for DB save so UX feels instant
  renderAlerts();
  showToast('Trade Setup Created', `${selectedAsset.symbol} setup alert active — watching for entry at ${formatPrice(entry, selectedAsset.id)}.`, 'success');
  if (isMobileLayout()) { switchAlertTab('active'); mobileTab('alerts'); }
  userTypingInForm = false;

  // Reset form fields
  ['setup-entry','setup-sl','setup-tp1','setup-tp2','setup-tp3','setup-entry-reason','setup-htf-context'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; delete el.dataset.userEdited; }
  });
  ['setup-type','setup-timeframe','setup-emotion-before'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  // DB save + Telegram in background
  try {
    const saved = await saveAlert(newAlert);
    const idx = alerts.findIndex(a => a.id === newAlert.id);
    if (idx !== -1 && saved?.id) alerts[idx].id = saved.id;
  } catch(e) {
    console.warn('createSetupAlert: DB save failed', e);
  }
  if (telegramEnabled && telegramChatId && tgNotifPrefs.confirmation) {
    sendTelegram(tgSetupCreatedMessage(selectedAsset.symbol, setupDirection, entry, sl, tp1, tp2, tp3, timeframe, journal));
  }
}

// ── Parse journal from alert.note ─────────────────────────────────────────
function getJournal(alert) {
  try { return JSON.parse(alert.note || '{}'); } catch(e) { return {}; }
}

// ── Trade status badge info ────────────────────────────────────────────────
function getSetupBadge(alert) {
  const j = getJournal(alert);
  const status = j.tradeStatus || 'watching';

  // Detect breakeven: SL hit but SL ≈ entry price (within 0.1%)
  if (status === 'sl_hit' && j.sl != null && alert.targetPrice != null) {
    const slNum    = parseFloat(j.sl);
    const entryNum = parseFloat(alert.targetPrice);
    if (!isNaN(slNum) && !isNaN(entryNum) && entryNum > 0 &&
        Math.abs(slNum - entryNum) / entryNum < 0.001) {
      return { cls: 'badge-breakeven', label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="4.5" x2="9" y2="4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.45"/></svg> BREAKEVEN' };
    }
  }

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

  // ── Live price-based card colour (overrides statusClass when trade is live) ──
  // Green glow = price in profit zone (between entry and furthest TP)
  // Red glow   = price in danger zone (between SL and entry)
  // Only active once entry has triggered — not while just watching
  let liveCardClass = statusClass;
  const tradeIsLive = ['entry_hit','running','tp1_hit','tp2_hit'].includes(j.tradeStatus || '');
  if (tradeIsLive && j.sl && j.tp1) {
    const liveP   = priceData[alert.assetId]?.price || 0;
    const entry   = alert.targetPrice;
    const sl      = j.sl;
    const topTp   = j.tp3 || j.tp2 || j.tp1;
    const isLong  = j.direction === 'long';
    if (liveP > 0) {
      const inProfit  = isLong ? (liveP > entry && liveP <= topTp)  : (liveP < entry && liveP >= topTp);
      const inDanger  = isLong ? (liveP < entry && liveP >= sl)     : (liveP > entry && liveP <= sl);
      if      (inProfit) liveCardClass = 'trade-price-profit';
      else if (inDanger) liveCardClass = 'trade-price-danger';
    }
  }

  div.className = `alert-item ${liveCardClass}`;

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

  const tradeStatus  = j.tradeStatus || 'watching';
  const isFinalState = ['full_tp','sl_hit'].includes(tradeStatus);
  const isLiveTrade  = ['entry_hit','running','tp1_hit','tp2_hit'].includes(tradeStatus);
  const isWatching   = tradeStatus === 'watching';

  const btnLog     = `<button class="alert-action-btn dismiss" onclick="logTradeFromAlert('${alert.id}')">LOG TRADE</button>`;
  const btnDismissHistory = `<button class="alert-action-btn toggle" onclick="dismissSetupToHistory('${alert.id}')">${SVG_DISMISS}DISMISS</button>`;
  const btnClose   = `<button class="alert-action-btn toggle"  onclick="dismissSetupAlert('${alert.id}')">CLOSE</button>`;
  const btnEdit    = `<button class="alert-action-btn toggle"  onclick="editSetupAlert('${alert.id}')" title="Edit setup">${SVG_EDIT}EDIT</button>`;
  const btnDelete  = `<button class="alert-action-btn delete"  onclick="deleteAlert('${alert.id}')">DELETE</button>`;

  // Quick SL management buttons for live trades
  const btnBreakeven = isLiveTrade ? `<button class="alert-action-btn be-btn" onclick="moveSlToBreakeven('${alert.id}')" title="Move SL to entry (breakeven)">
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-right:3px;vertical-align:middle"><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><polyline points="6,2 9,5 6,8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>BE</button>` : '';
  const btnTrail = isLiveTrade ? `<button class="alert-action-btn trail-btn" onclick="showTrailStopDialog('${alert.id}')" title="Set trailing stop">
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-right:3px;vertical-align:middle"><path d="M1 8 L4 5 L6 7 L9 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="9" cy="2" r="1" fill="currentColor"/></svg>TRAIL</button>` : '';

  // Button layout by state:
  const btnCloseRunning = `<button class="alert-action-btn toggle" onclick="showCloseTradeChoice('${alert.id}')">CLOSE</button>`;
  let actionBtns;
  if (isFinalState)       actionBtns = btnLog + btnDismissHistory + btnDelete;
  else if (isLiveTrade)   actionBtns = btnCloseRunning + btnBreakeven + btnTrail + btnEdit + btnDelete;
  else                    actionBtns = btnEdit + btnDelete;

  div.innerHTML = `
    <div class="alert-header-row">
      <div class="alert-symbol">${alert.symbol} <span style="color:${dirColor};font-size:0.65rem;font-weight:700">${dir}</span>${rr ? `<span style="color:var(--muted);font-size:0.62rem"> ${rr}</span>` : ''}</div>
      <div class="alert-badge ${badge.cls}">${badge.label}</div>
    </div>
    <div class="alert-detail" style="font-size:0.75rem;line-height:1.9">
      ${levels}
      ${(() => { const lp = priceData[alert.assetId]?.price; return lp ? `<br><span style="opacity:0.55;font-size:0.72rem">Current price: <b style="opacity:0.9">${formatPrice(lp, alert.assetId)}</b></span>` : ''; })()}
      ${alert.timeframe ? `<br><span style="opacity:0.5;font-size:0.68rem">· ${alert.timeframe}</span>` : ''}
      ${journalLines ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:0.72rem;line-height:1.7">${journalLines}</div>` : ''}
      <div style="margin-top:6px;opacity:0.45;font-size:0.68rem">Set ${alert.createdAt}</div>
    </div>
    <div class="alert-actions">${actionBtns}</div>`;

  // Tap card body (not buttons) → open chart for this asset
  div.style.cursor = 'pointer';
  div.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const asset = ASSET_BY_ID.get(alert.assetId) || ALL_ASSETS.find(a => a.id === alert.assetId);
    if (!asset) return;
    alertSourceId = alert.id;
    selectAsset(asset);
    if (isMobileLayout()) mobileTab('chart');
    updateAlertEditBtn();
  });
}

function dismissSetupAlert(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  showManualCloseForm(alert, getJournal(alert));
}

// Close choice for running trades — ask: Log Trade or just Dismiss to history
function showCloseTradeChoice(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  const j = getJournal(alert);

  const existing = document.getElementById('close-choice-modal');
  if (existing) existing.remove();

  const ov = document.createElement('div');
  ov.id = 'close-choice-modal';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;padding:0 0 env(safe-area-inset-bottom);backdrop-filter:blur(4px)';
  ov.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px 20px calc(20px + env(safe-area-inset-bottom))">
      <div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--muted);text-align:center;margin-bottom:16px">CLOSE TRADE — ${alert.symbol}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="document.getElementById('close-choice-modal').remove(); logTradeFromAlert('${id}')"
          style="width:100%;padding:14px;background:rgba(0,230,118,0.12);border:1px solid rgba(0,230,118,0.4);color:var(--green);font-family:var(--mono);font-size:0.75rem;font-weight:700;letter-spacing:0.08em;border-radius:10px;cursor:pointer">
          LOG TRADE
          <div style="font-size:0.6rem;opacity:0.7;font-weight:400;margin-top:2px">Save this trade to your journal</div>
        </button>
        <button onclick="document.getElementById('close-choice-modal').remove(); dismissSetupToHistory('${id}')"
          style="width:100%;padding:14px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:var(--accent);font-family:var(--mono);font-size:0.75rem;font-weight:700;letter-spacing:0.08em;border-radius:10px;cursor:pointer">
          DISMISS
          <div style="font-size:0.6rem;opacity:0.7;font-weight:400;margin-top:2px">Move to history without logging</div>
        </button>
        <button onclick="document.getElementById('close-choice-modal').remove()"
          style="width:100%;padding:11px;background:transparent;border:1px solid var(--border);color:var(--muted);font-family:var(--mono);font-size:0.68rem;letter-spacing:0.06em;border-radius:10px;cursor:pointer">
          CANCEL
        </button>
      </div>
    </div>`;

  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
}

// Dismiss a final-state setup alert to history (no journal form — already logged or user skips)
function dismissSetupToHistory(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  const j = getJournal(alert);
  // Move to alert history
  saveAlertToHistory(alert);
  alertHistory.unshift({
    id: Date.now() + Math.random(),
    symbol:         alert.symbol,
    assetId:        alert.assetId,
    condition:      alert.condition,
    targetPrice:    alert.targetPrice,
    triggeredAt:    Date.now(),
    triggeredPrice: priceData[alert.assetId]?.price || alert.targetPrice,
    note:           `Setup closed · ${j.tradeStatus || 'final'}`,
  });
  saveAlertHistory();
  deleteAlertFromDB(id);
  alerts = alerts.filter(a => a.id !== id);
  renderAlerts();
  if (lwCurrentAsset) drawAlertLines(lwCurrentAsset.id);
  showToast('Alert Dismissed', `${alert.symbol} setup moved to history.`, 'success');
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

  // Resize auto-grow textareas to fit their restored content
  ['setup-entry-reason','setup-htf-context'].forEach(id => {
    const el = document.getElementById(id);
    if (el) autoGrow(el);
  });

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

// ── Move SL to Breakeven ──────────────────────────────────────────────────────
async function moveSlToBreakeven(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  const j = getJournal(alert);
  const entry = alert.targetPrice;
  if (!entry) return showToast('No Entry', 'Entry price not set.', 'error');

  j.sl = entry;
  alert.note = JSON.stringify(j);
  await updateAlert(id, { note: alert.note });
  renderAlerts();
  if (currentAlertTab === 'trades') renderTradesTab();
  showToast('SL → Breakeven', `${alert.symbol} stop loss moved to entry (${formatPrice(entry, alert.assetId)}).`, 'success');
}

// ── Trail Stop dialog ─────────────────────────────────────────────────────────
function showTrailStopDialog(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  const j = getJournal(alert);
  const currentPrice = priceData[alert.assetId]?.price;
  if (!currentPrice) return showToast('No Price', 'Current price not available.', 'error');

  const existing = document.getElementById('trail-stop-modal');
  if (existing) existing.remove();

  const isLong = j.direction === 'long';
  const dec = (alert.assetId || '').includes('/') && !alert.assetId.startsWith('XAU') && !alert.assetId.startsWith('XAG') ? 5 : 2;

  const ov = document.createElement('div');
  ov.id = 'trail-stop-modal';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.65);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)';
  ov.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px 20px calc(24px + env(safe-area-inset-bottom))">
      <div style="font-family:var(--mono);font-size:0.62rem;letter-spacing:0.12em;color:var(--muted);text-align:center;margin-bottom:14px">TRAIL STOP — ${alert.symbol}</div>
      <div style="font-size:0.78rem;color:var(--muted);margin-bottom:14px">
        Current: <strong style="color:var(--text)">${formatPrice(currentPrice, alert.assetId)}</strong>
        &nbsp;·&nbsp; SL: <strong style="color:var(--red)">${formatPrice(j.sl, alert.assetId)}</strong>
      </div>
      <!-- Input mode toggle -->
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button id="trail-mode-pct" onclick="setTrailMode('pct')"
          style="flex:1;padding:8px;background:rgba(0,212,255,0.15);border:1px solid var(--accent);color:var(--accent);font-family:var(--mono);font-size:0.68rem;font-weight:700;border-radius:7px;cursor:pointer">% Percentage</button>
        <button id="trail-mode-price" onclick="setTrailMode('price')"
          style="flex:1;padding:8px;background:transparent;border:1px solid var(--border);color:var(--muted);font-family:var(--mono);font-size:0.68rem;font-weight:700;border-radius:7px;cursor:pointer">Price Level</button>
      </div>
      <!-- Pct input -->
      <div id="trail-pct-group">
        <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:6px">TRAIL DISTANCE (%)</label>
        <input id="trail-pct-input" type="number" step="0.1" min="0.1" max="20" value="1.0"
          style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:1rem;padding:12px 14px;border-radius:8px;box-sizing:border-box;margin-bottom:6px">
      </div>
      <!-- Price input (hidden by default) -->
      <div id="trail-price-group" style="display:none">
        <label style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;color:var(--muted);display:block;margin-bottom:6px">NEW STOP LOSS PRICE</label>
        <input id="trail-price-input" type="number" step="any" placeholder="${formatPrice(j.sl, alert.assetId)}"
          style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--mono);font-size:1rem;padding:12px 14px;border-radius:8px;box-sizing:border-box;margin-bottom:6px">
      </div>
      <div id="trail-preview" style="font-family:var(--mono);font-size:0.7rem;color:var(--accent);margin-bottom:16px;min-height:18px"></div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('trail-stop-modal').remove()"
          style="flex:1;padding:12px;background:transparent;border:1px solid var(--border);color:var(--muted);font-family:var(--mono);font-size:0.72rem;border-radius:8px;cursor:pointer">CANCEL</button>
        <button onclick="applyTrailStop('${id}')"
          style="flex:2;padding:12px;background:rgba(255,214,0,0.12);border:1px solid rgba(255,214,0,0.4);color:var(--gold);font-family:var(--mono);font-size:0.75rem;font-weight:700;letter-spacing:0.06em;border-radius:8px;cursor:pointer">SET TRAIL STOP</button>
      </div>
    </div>`;

  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);

  // Live preview helper
  function updateTrailPreview() {
    const preview = document.getElementById('trail-preview');
    if (!preview) return;
    const mode = ov._trailMode || 'pct';
    if (mode === 'pct') {
      const pct = parseFloat(document.getElementById('trail-pct-input')?.value) / 100;
      if (isNaN(pct) || pct <= 0) { preview.textContent = ''; return; }
      const newSL = isLong ? currentPrice * (1 - pct) : currentPrice * (1 + pct);
      preview.textContent = `→ New SL: ${formatPrice(newSL, alert.assetId)}`;
    } else {
      const price = parseFloat(document.getElementById('trail-price-input')?.value);
      if (isNaN(price) || price <= 0) { preview.textContent = ''; return; }
      preview.textContent = `→ New SL: ${formatPrice(price, alert.assetId)}`;
    }
  }

  ov._trailMode = 'pct';

  // Expose setTrailMode globally on the overlay
  window.setTrailMode = (mode) => {
    ov._trailMode = mode;
    const pctBtn   = document.getElementById('trail-mode-pct');
    const priceBtn = document.getElementById('trail-mode-price');
    const pctGrp   = document.getElementById('trail-pct-group');
    const priceGrp = document.getElementById('trail-price-group');
    if (mode === 'pct') {
      pctBtn.style.cssText   = 'flex:1;padding:8px;background:rgba(0,212,255,0.15);border:1px solid var(--accent);color:var(--accent);font-family:var(--mono);font-size:0.68rem;font-weight:700;border-radius:7px;cursor:pointer';
      priceBtn.style.cssText = 'flex:1;padding:8px;background:transparent;border:1px solid var(--border);color:var(--muted);font-family:var(--mono);font-size:0.68rem;font-weight:700;border-radius:7px;cursor:pointer';
      pctGrp.style.display   = '';
      priceGrp.style.display = 'none';
    } else {
      priceBtn.style.cssText = 'flex:1;padding:8px;background:rgba(0,212,255,0.15);border:1px solid var(--accent);color:var(--accent);font-family:var(--mono);font-size:0.68rem;font-weight:700;border-radius:7px;cursor:pointer';
      pctBtn.style.cssText   = 'flex:1;padding:8px;background:transparent;border:1px solid var(--border);color:var(--muted);font-family:var(--mono);font-size:0.68rem;font-weight:700;border-radius:7px;cursor:pointer';
      pctGrp.style.display   = 'none';
      priceGrp.style.display = '';
    }
    updateTrailPreview();
  };

  document.getElementById('trail-pct-input')?.addEventListener('input', updateTrailPreview);
  document.getElementById('trail-price-input')?.addEventListener('input', updateTrailPreview);
  updateTrailPreview();
}

async function applyTrailStop(id) {
  const alert = alerts.find(a => a.id === id);
  if (!alert) return;
  const j = getJournal(alert);
  const currentPrice = priceData[alert.assetId]?.price;
  const ov = document.getElementById('trail-stop-modal');
  const mode = ov?._trailMode || 'pct';

  let newSL;
  if (mode === 'price') {
    newSL = parseFloat(document.getElementById('trail-price-input')?.value);
    if (isNaN(newSL) || newSL <= 0) return showToast('Invalid', 'Enter a valid price.', 'error');
  } else {
    if (!currentPrice) return showToast('No Price', 'Current price not available.', 'error');
    const pct = parseFloat(document.getElementById('trail-pct-input')?.value) / 100;
    if (isNaN(pct) || pct <= 0) return showToast('Invalid', 'Enter a valid percentage.', 'error');
    const isLong = j.direction === 'long';
    newSL = isLong ? currentPrice * (1 - pct) : currentPrice * (1 + pct);
  }

  j.sl = parseFloat(newSL.toFixed(5));
  alert.note = JSON.stringify(j);
  await updateAlert(id, { note: alert.note });

  ov?.remove();
  renderAlerts();
  if (currentAlertTab === 'trades') renderTradesTab();
  showToast('Trail Stop Set', `${alert.symbol} SL → ${formatPrice(newSL, alert.assetId)}`, 'success');
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
  const dir   = direction === 'long' ? 'LONG' : 'SHORT';
  const rrRaw = tp1 && sl ? Math.abs(tp1 - entry) / Math.abs(entry - sl) : null;
  const rows = [
    tgRow('Direction', `<b>${dir}</b>`),
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
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
  ].join('\n');
}

function tgSetupUpdatedMessage(symbol, direction, entry, sl, tp1, tp2, tp3, timeframe, journal) {
  const dir   = direction === 'long' ? 'LONG' : 'SHORT';
  const rrRaw = tp1 && sl ? Math.abs(tp1 - entry) / Math.abs(entry - sl) : null;
  const rows = [
    tgRow('Direction', `<b>${dir}</b>`),
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
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
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
      action: `Review your trading platform. Log your emotion and lessons in altradia.`,
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
    journal.direction ? tgRow('Direction', `<b>${journal.direction === 'long' ? 'LONG' : 'SHORT'}</b>`) : null,
  ].filter(Boolean);
  return [
    t.header, ``, t.body, ``, ...rows, ``, `<i>${t.action}</i>`, ``,
    `<a href="https://t.me/tradewatchalert_bot/assistant">Open altradia →</a>`,
  ].join('\n');
}
// ═══════════════════════════════════════════════
// altradia — Trade Journal
// Dedicated journal page: log, review, study trades
// Images uploaded to Supabase Storage
// ═══════════════════════════════════════════════

let journalEntries     = [];
let jnlDirection       = 'long';
let jnlBeforeFile      = null;
let jnlAfterFile       = null;
let editingJournalId   = null; // set when editing an existing journal entry
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
// ── Compress image to thumbnail before upload ─────────────────────────────
function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadScreenshot(file, slot) {
  if (!file || !currentUserId) return null;
  try {
    // Compress to max 1200px before upload to save storage and bandwidth
    file = await compressImage(file, 1200, 0.82) || file;
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
  const el = document.getElementById(previewId);
  if (!el) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Show as thumbnail with a remove (×) button — NOT full size
    el.className = 'screenshot-preview-filled';
    el.innerHTML = `
      <img src="${e.target.result}" class="screenshot-preview-img" alt="screenshot">
      <button class="screenshot-preview-remove" onclick="removeScreenshot('${slot}',event)" title="Remove">&#x2715;</button>`;
  };
  reader.readAsDataURL(file);

  if (slot === 'before') jnlBeforeFile = file;
  else                    jnlAfterFile  = file;
}

function removeScreenshot(slot, e) {
  e.stopPropagation(); // don't re-open file picker
  const previewId = `jnl-${slot}-preview`;
  const inputId   = `jnl-${slot}-input`;
  const el = document.getElementById(previewId);
  const inp = document.getElementById(inputId);
  if (el) {
    el.className = 'screenshot-preview-empty';
    el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.4"/><circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M3 17l5-5 3 3 3-3 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5"/></svg><span>Tap to upload</span>`;
  }
  if (inp) inp.value = '';
  if (slot === 'before') jnlBeforeFile = null;
  else                    jnlAfterFile  = null;
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
    if (!el) return;
    el.className = 'screenshot-preview-empty';
    el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.4"/><circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M3 17l5-5 3 3 3-3 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5"/></svg><span>Tap to upload</span>`;
  });
  // Also clear the file inputs so re-selecting works
  ['jnl-before-input','jnl-after-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
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
    // Auto-fill exit price based on outcome — user can still override
    // Only auto-fill if not a manual exit and no exitPrice was explicitly passed
    if (prefill.outcome && !prefill.exitPrice && !prefill.isManualClose) {
      const exitEl = document.getElementById('jnl-exit');
      if (exitEl) {
        const autoExit = {
          sl_hit:   prefill.sl   || null,
          tp1_hit:  prefill.tp1  || null,
          tp2_hit:  prefill.tp2  || prefill.tp1  || null,
          full_tp:  prefill.tp3  || prefill.tp2  || prefill.tp1 || null,
        }[prefill.outcome];
        if (autoExit) {
          exitEl.value = autoExit;
          exitEl.title = 'Auto-filled from alert levels — edit if different';
        }
      }
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
    if (prefill.pnl != null) {
      const el = document.getElementById('jnl-pnl');
      if (el) el.value = prefill.pnl;
    }
    if (prefill.lessons) {
      const el = document.getElementById('jnl-lessons');
      if (el) el.value = prefill.lessons;
    }
    if (prefill.emotionAfter) {
      const sel = document.getElementById('jnl-emotion-after');
      if (sel) sel.value = prefill.emotionAfter;
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
  // Reset edit state so next open doesn't accidentally PATCH instead of INSERT
  editingJournalId = null;
  // Restore modal title in case it was changed to "EDIT TRADE"
  document.querySelectorAll('#journal-modal span').forEach(s => {
    if (s.textContent === 'EDIT TRADE') s.textContent = 'LOG TRADE';
  });
}

// ── Save a journal entry ────────────────────────────────────────────────────
async function saveJournalEntry() {
  const symbol = (document.getElementById('jnl-symbol').value || '').trim().toUpperCase();
  const entry  = parseFloat(document.getElementById('jnl-entry').value);
  if (!symbol) return showToast('Missing Asset', 'Enter an asset symbol.', 'error');

  // Capture all form values NOW before modal closes
  const capturedFiles = { before: jnlBeforeFile, after: jnlAfterFile };
  const linkedAlertId = document.getElementById('jnl-alert-id').value;

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
    screenshot_before: null,
    screenshot_after:  null,
    trade_date:        new Date().toISOString(),
  };

  // ── EDIT PATH: update an existing journal entry ──────────────────────────
  if (editingJournalId) {
    const editId = editingJournalId;
    editingJournalId = null;

    // Update locally right away
    const existingIdx = journalEntries.findIndex(e => String(e.id) === String(editId));
    const existing = existingIdx !== -1 ? journalEntries[existingIdx] : null;

    // Keep old screenshots if no new ones uploaded
    const hasNewScreenshots = capturedFiles.before || capturedFiles.after;
    const updatedRecord = {
      ...record,
      id: editId,
      screenshot_before: existing?.screenshot_before || null,
      screenshot_after:  existing?.screenshot_after  || null,
    };
    if (existingIdx !== -1) journalEntries[existingIdx] = updatedRecord;

    closeJournalModal();
    // Restore modal title
    document.querySelectorAll('#journal-modal span').forEach(s => { if (s.textContent === 'EDIT TRADE') s.textContent = 'LOG TRADE'; });
    renderJournal();
    if (isMobileLayout()) mobileTab('journal');
    showToast('Entry Updated', `${symbol} journal entry updated.`, 'success');

    // Upload new screenshots if provided, then patch DB
    const [beforeUrl, afterUrl] = await Promise.all([
      hasNewScreenshots ? uploadScreenshot(capturedFiles.before, 'before') : Promise.resolve(null),
      hasNewScreenshots ? uploadScreenshot(capturedFiles.after,  'after')  : Promise.resolve(null),
    ]);
    if (beforeUrl) updatedRecord.screenshot_before = beforeUrl;
    if (afterUrl)  updatedRecord.screenshot_after  = afterUrl;
    if (existingIdx !== -1) journalEntries[existingIdx] = updatedRecord;

    const patchData = { ...record };
    delete patchData.user_id; delete patchData.trade_date;
    if (beforeUrl) patchData.screenshot_before = beforeUrl;
    if (afterUrl)  patchData.screenshot_after  = afterUrl;

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/trade_journal?id=eq.${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify(patchData),
      });
      if (hasNewScreenshots) { renderJournal(); showToast('Done', 'Screenshots updated.', 'success'); }
    } catch(e) { console.warn('edit journal patch failed', e); }
    return;
  }

  // ── CREATE PATH ────────────────────────────────────────────────────────────
  // Step 1 — show entry card immediately, navigate to journal
  const tempId = 'temp_' + Date.now();
  const tempEntry = { ...record, id: tempId };
  journalEntries.unshift(tempEntry);
  closeJournalModal();
  renderJournal();
  if (isMobileLayout()) mobileTab('journal');

  // Step 2 — dismiss linked setup alert right away
  if (linkedAlertId) {
    alerts = alerts.filter(a => a.id !== linkedAlertId);
    deleteAlertFromDB(linkedAlertId);
    renderAlerts();
  }

  showToast('Trade Logged', `${symbol} saved to journal.`, 'success');

  // Step 3 — upload screenshots + save to DB in background
  const hasScreenshots = capturedFiles.before || capturedFiles.after;
  // Screenshots upload silently in background

  const [beforeUrl, afterUrl] = await Promise.all([
    uploadScreenshot(capturedFiles.before, 'before'),
    uploadScreenshot(capturedFiles.after,  'after'),
  ]);
  record.screenshot_before = beforeUrl || null;
  record.screenshot_after  = afterUrl  || null;

  const saved = await saveJournalToDB(record);
  if (saved) {
    const idx = journalEntries.findIndex(e => e.id === tempId);
    if (idx !== -1) journalEntries[idx] = saved;
    else journalEntries.unshift(saved);
    renderJournal();
    // Screenshots uploaded silently
  } else {
    // Remove temp entry and warn
    journalEntries = journalEntries.filter(e => e.id !== tempId);
    renderJournal();
    showToast('Save Failed', 'Could not save to DB. Check your connection.', 'error');
  }
}

// ── Open log form from a completed setup alert ─────────────────────────────
function logTradeFromAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;
  let j = {};
  try { j = JSON.parse(alert.note || '{}'); } catch(e) {}

  // Detect breakeven: SL was hit but SL price ≈ entry price
  // Use 0.1% tolerance to handle floating-point imprecision
  const slPrice    = parseFloat(j.sl);
  const entryPrice = parseFloat(alert.targetPrice);
  const isBreakeven = j.tradeStatus === 'sl_hit' &&
    !isNaN(slPrice) && !isNaN(entryPrice) && entryPrice > 0 &&
    Math.abs(slPrice - entryPrice) / entryPrice < 0.001; // within 0.1%

  const outcomeMap = {
    full_tp:  'full_tp',
    tp2_hit:  'tp2_hit',
    tp1_hit:  'tp1_hit',
    sl_hit:   isBreakeven ? 'breakeven' : 'sl_hit',
    running:  'manual_exit',
    watching: 'manual_exit',
  };

  // For final states (sl_hit, tp hits), auto-fill exit price from levels
  // For manual_exit states, leave exit price blank for user to fill
  const isFinalState = ['full_tp','sl_hit','tp1_hit','tp2_hit'].includes(j.tradeStatus || '');
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
    isManualClose: !isFinalState, // blank exit price if manually closing
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
    breakeven:   { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="4.5" x2="9" y2="4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.45"/></svg> BREAKEVEN', cls: 'joutcome-breakeven' },
    sl_hit:      { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="3.2" y1="3.2" x2="6.8" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6.8" y1="3.2" x2="3.2" y2="6.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> SL HIT',      cls: 'joutcome-sl-hit' },
    manual_exit: { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.4"/><line x1="5" y1="2.5" x2="5" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="5" y1="7" x2="5" y2="7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> CLOSED', cls: 'joutcome-manual-exit' },
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

    // Summary line: entry→exit shorthand
    // Derive effective exit: use stored exit_price, or fall back to outcome-based level
    const effectiveExit = entry.exit_price || (() => {
      const o = entry.outcome;
      if (o === 'sl_hit')   return entry.sl_price;
      if (o === 'tp1_hit')  return entry.tp1_price;
      if (o === 'tp2_hit')  return entry.tp2_price || entry.tp1_price;
      if (o === 'full_tp')  return entry.tp3_price || entry.tp2_price || entry.tp1_price;
      return null;
    })();
    const entrySummary = entry.entry_price ? `${f(entry.entry_price)} → ${effectiveExit ? f(effectiveExit) : '—'}` : '';
    const setupSummary = entry.setup_type || '';

    card.innerHTML = `
      <div class="journal-card-summary" onclick="openJournalDetail('${entry.id}')">
        <div class="journal-card-summary-left">
          <span class="journal-card-symbol">${entry.symbol}</span>
          <span class="journal-card-dir" style="color:${dirColor};font-size:0.62rem;font-weight:700;margin-left:4px">${dir}</span>
          ${entry.timeframe ? `<span style="font-family:var(--mono);font-size:0.57rem;color:var(--muted);margin-left:4px">${entry.timeframe}</span>` : ''}
          ${setupSummary ? `<span style="font-family:var(--mono);font-size:0.57rem;color:var(--muted);margin-left:4px">· ${setupSummary}</span>` : ''}
        </div>
        <div class="journal-card-summary-right">
          ${pnlStr}
          <span class="journal-card-outcome ${om.cls}">${om.label}</span>
        </div>
        <div class="journal-card-summary-bottom">
          <span style="font-family:var(--mono);font-size:0.62rem;color:var(--muted)">${date}</span>
          ${entrySummary ? `<span style="font-family:var(--mono);font-size:0.62rem;color:var(--muted)">${entrySummary}</span>` : ''}
          <span style="font-family:var(--mono);font-size:0.62rem;color:var(--accent);margin-left:auto">VIEW DETAILS ›</span>
        </div>
      </div>`;

    listEl.appendChild(card);
  });
}

// ─── JOURNAL CSV EXPORT ───────────────────────────────────────────────────────
function exportJournalCSV() {
  const filter = document.getElementById('journal-filter')?.value || 'all';
  const cutoff = filter === 'all' ? 0 : Date.now() - parseInt(filter) * 86400000;
  const entries = journalEntries.filter(e => {
    const ts = new Date(e.trade_date || e.created_at).getTime();
    return ts >= cutoff;
  });

  if (!entries.length) {
    showToast('Nothing to export', 'No journal entries match the current filter.', 'error');
    return;
  }

  const headers = ['Date','Symbol','Direction','Outcome','Entry','Exit','SL','TP1','TP2','TP3','P&L %','Timeframe','Setup Type','Entry Reason','HTF Context','Emotion Before','Emotion After','Lessons'];
  const rows = entries.map(e => [
    new Date(e.trade_date || e.created_at).toLocaleDateString(),
    e.symbol || '',
    e.direction || '',
    e.outcome || '',
    e.entry_price || '',
    e.exit_price || '',
    e.sl_price || '',
    e.tp1_price || '',
    e.tp2_price || '',
    e.tp3_price || '',
    e.pnl_pct != null ? e.pnl_pct : '',
    e.timeframe || '',
    e.setup_type || '',
    (e.entry_reason || '').replace(/"/g, '""'),
    (e.htf_context || '').replace(/"/g, '""'),
    e.emotion_before || '',
    e.emotion_after || '',
    (e.lessons || '').replace(/"/g, '""'),
  ].map(v => `"${v}"`).join(','));

  const csv  = [headers.join(','), ...rows].join('\n');

  // Telegram WebView blocks createObjectURL — use data URI instead
  const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  const a    = document.createElement('a');
  const filterLabel = { all:'all-time', '7':'7-days', '30':'30-days', '90':'3-months' }[filter] || filter;
  a.href     = dataUri;
  a.download = `altradia-journal-${filterLabel}-${new Date().toISOString().slice(0,10)}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 100);
  showToast('Exported', `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} exported to CSV.`, 'success');
}

function toggleJournalCard(id) {
  const body = document.getElementById(`jcard-${id}`);
  if (body) body.classList.toggle('open');
}

function openJournalDetail(entryId) {
  const entry = journalEntries.find(e => String(e.id) === String(entryId));
  if (!entry) return;

  const existing = document.getElementById('journal-detail-overlay');
  if (existing) existing.remove();

  const om  = {
    full_tp:     { label: 'FULL TP',     cls: 'joutcome-full-tp' },
    tp2_hit:     { label: 'TP2 HIT',     cls: 'joutcome-tp2-hit' },
    tp1_hit:     { label: 'TP1 HIT',     cls: 'joutcome-tp1-hit' },
    breakeven:   { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="4.5" x2="9" y2="4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.45"/></svg> BREAKEVEN', cls: 'joutcome-breakeven' },
    sl_hit:      { label: 'SL HIT',      cls: 'joutcome-sl-hit' },
    manual_exit: { label: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.4"/><line x1="5" y1="2.5" x2="5" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="5" y1="7" x2="5" y2="7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> CLOSED', cls: 'joutcome-manual-exit' },
  }[entry.outcome] || { label: '⊘ CLOSED', cls: 'joutcome-manual-exit' };

  const dir = entry.direction === 'long' ? '▲ LONG' : '▼ SHORT';
  const dirColor = entry.direction === 'long' ? 'var(--green)' : 'var(--red)';
  const date = new Date(entry.trade_date || entry.created_at).toLocaleDateString([], {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true});
  const f = (n) => n ? parseFloat(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:6}) : '—';
  const pnlStr = entry.pnl_pct != null
    ? `<span style="color:${entry.pnl_pct >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700;font-size:1rem">${entry.pnl_pct >= 0 ? '+' : ''}${entry.pnl_pct}%</span>`
    : '';

  const levelRows = [
    ['ENTRY',     entry.entry_price, 'var(--text)'],
    ['EXIT',      entry.exit_price || (() => {
      const o = entry.outcome;
      if (o === 'sl_hit')   return entry.sl_price;
      if (o === 'tp1_hit')  return entry.tp1_price;
      if (o === 'tp2_hit')  return entry.tp2_price || entry.tp1_price;
      if (o === 'full_tp')  return entry.tp3_price || entry.tp2_price || entry.tp1_price;
      return null;
    })(), 'var(--text)'],
    ['STOP LOSS', entry.sl_price,    'var(--red)'],
    ['TP1',       entry.tp1_price,   'var(--green)'],
    entry.tp2_price ? ['TP2', entry.tp2_price, 'var(--green)'] : null,
    entry.tp3_price ? ['TP3', entry.tp3_price, 'var(--green)'] : null,
  ].filter(Boolean).map(([lbl, val, col]) =>
    `<div class="jdetail-level-row"><span style="font-family:var(--mono);font-size:0.62rem;color:var(--muted)">${lbl}</span><span style="font-family:var(--mono);font-size:0.82rem;font-weight:700;color:${col}">${f(val)}</span></div>`
  ).join('');

  const noteRows = [
    entry.setup_type    ? ['Setup Type',    entry.setup_type]    : null,
    entry.entry_reason  ? ['Entry Reason',  entry.entry_reason]  : null,
    entry.htf_context   ? ['HTF Context',   entry.htf_context]   : null,
    entry.emotion_before ? ['Emotion Before', entry.emotion_before] : null,
    entry.emotion_after  ? ['Emotion After',  entry.emotion_after]  : null,
    entry.lessons        ? ['Lessons',         entry.lessons]        : null,
  ].filter(Boolean).map(([lbl, val]) =>
    `<div class="jdetail-note-row"><span class="jdetail-note-label">${lbl}</span><span class="jdetail-note-val">${val}</span></div>`
  ).join('');

  // Screenshot swiper
  const shots = [entry.screenshot_before, entry.screenshot_after].filter(Boolean);
  let shotsHtml = '';
  if (shots.length) {
    const slides = shots.map((url, i) =>
      `<div class="jdetail-slide" data-idx="${i}"><img src="${url}" class="jdetail-slide-img" alt="Screenshot ${i+1}"></div>`
    ).join('');
    const dots = shots.length > 1 ? `<div class="jdetail-dots">${shots.map((_,i) =>
      `<span class="jdetail-dot${i===0?' active':''}" data-dot="${i}"></span>`).join('')}</div>` : '';
    shotsHtml = `<div class="jdetail-swiper" id="jdetail-swiper-${entry.id}">${slides}</div>${dots}`;
  }

  const ov = document.createElement('div');
  ov.id = 'journal-detail-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch';
  ov.innerHTML = `
    <div style="position:sticky;top:0;background:var(--bg);z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid var(--border)">
      <span style="font-family:var(--mono);font-size:0.65rem;letter-spacing:0.1em;color:var(--muted)">TRADE DETAIL</span>
      <div style="display:flex;gap:10px;align-items:center">
        <button onclick="editJournalEntry('${entry.id}')" style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);color:var(--accent);font-family:var(--mono);font-size:0.6rem;padding:5px 12px;border-radius:5px;cursor:pointer;letter-spacing:0.06em">EDIT</button>
        <button onclick="document.getElementById('journal-detail-overlay').remove()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;padding:4px 8px">&#x2715;</button>
      </div>
    </div>
    <div style="padding:16px 16px 100px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <span style="font-size:1.3rem;font-weight:800;letter-spacing:0.04em">${entry.symbol}</span>
          <span style="color:${dirColor};font-size:0.75rem;font-weight:700;margin-left:8px">${dir}</span>
          ${entry.timeframe ? `<span style="font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-left:6px">${entry.timeframe}</span>` : ''}
        </div>
        <div style="text-align:right">
          ${pnlStr}
          <div><span class="journal-card-outcome ${om.cls}" style="font-size:0.65rem">${om.label}</span></div>
        </div>
      </div>
      <div style="font-family:var(--mono);font-size:0.6rem;color:var(--muted);margin-bottom:16px">${date}</div>
      <div class="jdetail-levels">${levelRows}</div>
      ${noteRows ? `<div class="jdetail-notes" style="margin-top:16px">${noteRows}</div>` : ''}
      ${shotsHtml ? `<div style="margin-top:20px">${shotsHtml}</div>` : ''}
      <div style="margin-top:20px;display:flex;gap:10px">
        <button onclick="deleteJournalEntry('${entry.id}');document.getElementById('journal-detail-overlay')?.remove()" style="flex:1;padding:11px;background:rgba(255,61,90,0.1);border:1px solid rgba(255,61,90,0.3);color:var(--red);font-family:var(--mono);font-size:0.65rem;border-radius:7px;cursor:pointer;letter-spacing:0.06em">DELETE ENTRY</button>
      </div>
    </div>`;

  document.body.appendChild(ov);

  // Wire up swiper if shots exist
  if (shots.length > 1) {
    const swiper = document.getElementById(`jdetail-swiper-${entry.id}`);
    if (swiper) initJournalSwiper(swiper, shots.length, entry.id);
  }

  // Wire up slide images for fullscreen tap
  ov.querySelectorAll('.jdetail-slide-img').forEach(img => {
    img.onclick = () => openImageFullscreen(img.src, shots);
  });
}

function initJournalSwiper(swiper, count, entryId) {
  let cur = 0;
  const slides = swiper.querySelectorAll('.jdetail-slide');
  const ov = document.getElementById('journal-detail-overlay');
  const dots = ov ? ov.querySelectorAll('.jdetail-dot') : [];

  const goTo = (idx) => {
    cur = Math.max(0, Math.min(count - 1, idx));
    swiper.scrollTo({ left: cur * swiper.offsetWidth, behavior: 'smooth' });
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  };

  let startX = 0;
  swiper.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  swiper.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1);
  });
}

function openImageFullscreen(url, allUrls = []) {
  const urls = allUrls.length ? allUrls : [url];
  let cur = urls.indexOf(url);
  if (cur < 0) cur = 0;

  const existing = document.getElementById('image-fullscreen-overlay');
  if (existing) existing.remove();

  const ov = document.createElement('div');
  ov.id = 'image-fullscreen-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;touch-action:pan-y';

  const render = () => {
    const slides = urls.map((u, i) =>
      `<div class="img-fs-slide" style="min-width:100%;display:flex;align-items:center;justify-content:center">
        <img src="${u}" style="max-width:100vw;max-height:calc(100vh - 60px);object-fit:contain">
       </div>`
    ).join('');
    const dots = urls.length > 1 ? `<div style="display:flex;justify-content:center;gap:6px;padding:8px 0">
      ${urls.map((_,i) => `<span style="width:6px;height:6px;border-radius:50%;background:${i===cur?'#fff':'rgba(255,255,255,0.3)'}"></span>`).join('')}
    </div>` : '';
    ov.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.8)">
        <span style="color:rgba(255,255,255,0.5);font-family:monospace;font-size:0.7rem">${urls.length > 1 ? `${cur+1} / ${urls.length}` : ''}</span>
        <button onclick="document.getElementById('image-fullscreen-overlay').remove()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:50%;width:32px;height:32px;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center">&#x2715;</button>
      </div>
      <div id="img-fs-track" style="display:flex;flex:1;overflow:hidden;scroll-snap-type:x mandatory;overflow-x:auto;-webkit-overflow-scrolling:touch">${slides}</div>
      ${dots}`;

    const track = ov.querySelector('#img-fs-track');
    if (track) {
      requestAnimationFrame(() => track.scrollTo({ left: cur * window.innerWidth, behavior: 'auto' }));
      let sx = 0;
      track.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 40) {
          cur = Math.max(0, Math.min(urls.length - 1, dx < 0 ? cur + 1 : cur - 1));
          render();
        }
      });
    }
  };
  render();
  document.body.appendChild(ov);
}

async function deleteJournalEntry(id) {
  journalEntries = journalEntries.filter(e => e.id !== id);
  await deleteJournalEntryFromDB(id);
  renderJournal();
  // Close detail overlay if open
  document.getElementById('journal-detail-overlay')?.remove();
}

function editJournalEntry(id) {
  const entry = journalEntries.find(e => String(e.id) === String(id));
  if (!entry) return;

  editingJournalId = id;

  // Close detail overlay first
  document.getElementById('journal-detail-overlay')?.remove();

  openJournalEntryForm({
    symbol:        entry.symbol,
    direction:     entry.direction,
    entry:         entry.entry_price,
    exitPrice:     entry.exit_price,
    sl:            entry.sl_price,
    tp1:           entry.tp1_price,
    tp2:           entry.tp2_price,
    tp3:           entry.tp3_price,
    outcome:       entry.outcome,
    timeframe:     entry.timeframe,
    setupType:     entry.setup_type,
    entryReason:   entry.entry_reason,
    htfContext:    entry.htf_context,
    emotionBefore: entry.emotion_before,
    emotionAfter:  entry.emotion_after,
    pnl:           entry.pnl_pct,
    lessons:       entry.lessons,
  });

  // Update modal title to EDIT TRADE
  // Use setTimeout so DOM has settled after openJournalEntryForm
  setTimeout(() => {
    document.querySelectorAll('#journal-modal span').forEach(s => {
      if (s.textContent === 'LOG TRADE') s.textContent = 'EDIT TRADE';
    });
  }, 0);

  // Show delete existing screenshots option if they exist
  if (entry.screenshot_before || entry.screenshot_after) {
    // No toast — form pre-fill is self-explanatory
  }

  // Navigate to journal/chart to show the form
  if (isMobileLayout()) mobileTab('journal');
}

// mobileTab is handled by app-watchlist.js — journal tab already supported there
// altradia — UI & App Init
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


// ── Slide-out menu panel ─────────────────────────────────────────────────────

function openMenuPanel() {
  const panel   = document.getElementById('menu-panel');
  const overlay = document.getElementById('menu-overlay');
  if (!panel || !overlay) return;

  // Populate profile card with Telegram user info
  const nameEl    = document.getElementById('menu-profile-name');
  const avatarEl  = document.getElementById('menu-avatar-initials');
  const planEl    = document.getElementById('menu-profile-plan');
  if (nameEl) {
    const displayName = telegramUserName || 'altradia User';
    nameEl.textContent = displayName;

    if (avatarEl) {
      const photoEl  = document.getElementById('menu-avatar-photo');
      const letterEl = document.getElementById('menu-avatar-letter');
      const photoUrl = (typeof telegramUserPhoto !== 'undefined' && telegramUserPhoto)
        || localStorage.getItem('tg_photo_url') || '';

      if (photoUrl && photoEl) {
        photoEl.src           = photoUrl;
        photoEl.style.display = 'block';
        if (letterEl) letterEl.style.display = 'none';
        photoEl.onerror = () => {
          photoEl.style.display = 'none';
          if (letterEl) { letterEl.textContent = (displayName[0]||'A').toUpperCase(); letterEl.style.display = ''; }
        };
      } else {
        if (photoEl) photoEl.style.display = 'none';
        if (letterEl) { letterEl.textContent = (displayName[0]||'A').toUpperCase(); letterEl.style.display = ''; }
        if (!letterEl) avatarEl.textContent = (displayName[0]||'A').toUpperCase();
      }
    }
  }
  // Plan badge — placeholder FREE until billing is live
  if (planEl) planEl.innerHTML = '<span class="menu-plan-badge">FREE</span>';

  panel.style.display   = 'flex';
  overlay.style.display = 'block';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
    });
  });
  updateMenuToggles();
}

function closeMenuPanel() {
  const panel   = document.getElementById('menu-panel');
  const overlay = document.getElementById('menu-overlay');
  if (!panel || !overlay) return;
  panel.style.transform = 'translateX(100%)';
  overlay.style.display = 'none';
  setTimeout(() => { panel.style.display = 'none'; }, 280);
}

function updateMenuToggles() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  // Theme SVG icons
  const iconMoon = document.getElementById('menu-icon-moon');
  const iconSun  = document.getElementById('menu-icon-sun');
  if (iconMoon) iconMoon.style.display = isDark ? '' : 'none';
  if (iconSun)  iconSun.style.display  = isDark ? 'none' : '';

  // Theme label + toggle pill
  const themeLabel  = document.getElementById('menu-theme-label');
  const themeSub    = document.getElementById('menu-theme-sub');
  const themeToggle = document.getElementById('menu-theme-toggle');
  if (themeLabel)  themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  if (themeSub)    themeSub.textContent   = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  if (themeToggle) themeToggle.classList.toggle('on', isDark);

  // Sound SVG icons
  const soundWaves = document.getElementById('menu-sound-waves');
  const soundMute  = document.getElementById('menu-sound-mute');
  if (soundWaves) soundWaves.style.display = soundEnabled ? '' : 'none';
  if (soundMute)  soundMute.style.display  = soundEnabled ? 'none' : '';

  // Sound label + toggle pill
  const soundToggle = document.getElementById('menu-sound-toggle');
  const soundSub    = document.getElementById('menu-sound-sub');
  if (soundToggle) soundToggle.classList.toggle('on', soundEnabled);
  if (soundSub)    soundSub.textContent = soundEnabled ? 'Alert sounds are on' : 'Alert sounds are off';

  // Telegram status
  const tgSub = document.getElementById('menu-tg-sub');
  if (tgSub) tgSub.textContent = (telegramEnabled && telegramChatId)
    ? 'Connected · notifications active'
    : 'Set up alert notifications';

  // SL streak warning toggle
  const slToggle   = document.getElementById('sl-streak-toggle');
  const slSub      = document.getElementById('sl-streak-sub');
  const slCountRow = document.getElementById('sl-streak-count-row');
  if (slToggle)   slToggle.classList.toggle('on', slStreakWarningEnabled);
  if (slSub)      slSub.textContent = slStreakWarningEnabled
    ? `Warn after ${slStreakThreshold} consecutive stop losses`
    : 'Off — tap to enable';
  if (slCountRow) slCountRow.style.display = slStreakWarningEnabled ? '' : 'none';

  // SL streak count display
  const slCountEl   = document.getElementById('sl-streak-count-display');
  const slIconNum   = document.getElementById('sl-streak-icon-num');
  if (slCountEl)  slCountEl.textContent = slStreakThreshold;
  if (slIconNum)  slIconNum.textContent = slStreakThreshold;

  // Watchlist grouping toggle
  const wlToggle = document.getElementById('wl-group-toggle');
  const wlSub    = document.getElementById('wl-group-sub');
  if (wlToggle) wlToggle.classList.toggle('on', watchlistGrouped);
  if (wlSub)    wlSub.textContent = watchlistGrouped
    ? 'Assets grouped by Forex, Crypto, etc.'
    : 'All assets listed flat with category badge';

  // Telegram notification preferences
  const prefKeys = ['proximity','confirmation','queued','other'];
  prefKeys.forEach(key => {
    const el = document.getElementById(`tg-notif-${key}`);
    if (el) el.classList.toggle('on', tgNotifPrefs[key]);
  });
}

// ─── SL STREAK WARNING ────────────────────────────────────────────────────────
function toggleSlStreakWarning() {
  slStreakWarningEnabled = !slStreakWarningEnabled;
  localStorage.setItem('sl_streak_enabled',   slStreakWarningEnabled ? '1' : '0');
  consecutiveSlCount = 0; // reset streak on toggle
  updateMenuToggles();
}

function adjustSlStreak(delta) {
  slStreakThreshold = Math.max(1, Math.min(20, slStreakThreshold + delta));
  localStorage.setItem('sl_streak_threshold', slStreakThreshold);
  consecutiveSlCount = 0;
  updateMenuToggles();
}

function checkSlStreak(outcome) {
  // Called whenever a trade setup alert transitions to a final state
  if (!slStreakWarningEnabled) return;
  if (outcome === 'sl_hit') {
    consecutiveSlCount++;
    if (consecutiveSlCount >= slStreakThreshold) {
      consecutiveSlCount = 0; // reset so it doesn't fire every subsequent SL
      if (telegramEnabled && telegramChatId) {
        sendTelegram(
          `⚠️ *Trading Discipline Alert*\n\n` +
          `You've hit *${slStreakThreshold} stop losses in a row*.\n\n` +
          `This is a good time to *step back* and review your trading journal. ` +
          `Look at your recent setups, check for emotional patterns, and make sure your strategy is still aligned with current market conditions.\n\n` +
          `📓 Open your journal in altradia and review your last ${slStreakThreshold} trades before placing your next one.\n\n` +
          `_Discipline is the edge._`
        );
      }
      showToast('Discipline Check', `${slStreakThreshold} SLs in a row. Review your journal before the next trade.`, 'alert');
    }
  } else {
    // Any win/breakeven resets the streak
    consecutiveSlCount = 0;
  }
}

// ─── WATCHLIST GROUPING TOGGLE ────────────────────────────────────────────────
function toggleWatchlistGrouping() {
  watchlistGrouped = !watchlistGrouped;
  localStorage.setItem('wl_grouped', watchlistGrouped ? '1' : '0');
  updateMenuToggles();
  renderWatchlist();
}

// ── Alert Edit button on chart page ──────────────────────────────────────────
// Shows "Edit Alert" button above chart only when navigating from an alert card
function updateAlertEditBtn() {
  const btn  = document.getElementById('alert-edit-chart-btn');
  const form = document.getElementById('alert-form-panel');
  if (!btn) return;
  if (alertSourceId) {
    // Came from an alert card — show Edit button, hide the form
    btn.style.display = 'flex';
    if (form) form.style.display = 'none';
  } else {
    // Normal chart view — hide Edit button, show form
    btn.style.display = 'none';
    if (form) form.style.removeProperty('display');
  }
}

function editAlertFromChart() {
  if (!alertSourceId) return;
  const alert = alerts.find(a => a.id === alertSourceId);
  if (!alert) { alertSourceId = null; updateAlertEditBtn(); return; }

  // Show the form first
  const form = document.getElementById('alert-form-panel');
  if (form) form.style.removeProperty('display');

  // Clear source so edit button hides
  const id = alertSourceId;
  alertSourceId = null;
  updateAlertEditBtn();

  if (alert.condition === 'setup') {
    editSetupAlert(id);
  } else {
    editAlert(id);
  }
}

// ─── TELEGRAM NOTIFICATION PREFERENCES ───────────────────────────────────────
function toggleTgNotifPref(key) {
  tgNotifPrefs[key] = !tgNotifPrefs[key];
  try { localStorage.setItem('tg_notif_prefs', JSON.stringify(tgNotifPrefs)); } catch(e) {}
  updateMenuToggles();
}

function loadTgNotifPrefs() {
  try {
    const saved = localStorage.getItem('tg_notif_prefs');
    if (saved) tgNotifPrefs = { ...tgNotifPrefs, ...JSON.parse(saved) };
  } catch(e) {}
}

function openMenuAbout()        { openMenuPage('about'); }
function openMenuSubscription() { openMenuPage('subscription'); }
function openMenuAffiliate()    { openMenuPage('affiliate'); renderAffiliateDashboard(); }
function openMenuHelp()         { openMenuPage('help'); }

// ── Support bot deep link with user context ───────────────────────────────────
function openSupportBot() {
  const userId = telegramChatId || localStorage.getItem('tg_chat_id') || 'unknown';
  const url    = `https://t.me/altradia_support_bot?start=${userId}`;
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

// ── Affiliate Dashboard ───────────────────────────────────────────────────────
function renderAffiliateDashboard() {
  // Pull user display name from Telegram WebApp or fallback
  const tgUser   = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const name     = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : telegramUserName || 'Your Account';

  // Affiliate stats — loaded from localStorage (replace with Supabase when backend ready)
  const totalReferrals = parseInt(localStorage.getItem('aff_total_referrals') || '0', 10);
  const proSubs        = parseInt(localStorage.getItem('aff_pro_subs')        || '0', 10);
  const lifetimeRaw    = parseFloat(localStorage.getItem('aff_lifetime')      || '0');

  // Commission tier logic: 1–500 = 20%, 501+ = 25%
  const commissionPct  = proSubs >= 501 ? 0.25 : 0.20;
  // Assume $3/month per pro subscriber as example unit price
  const subPrice       = 3;
  const monthlyEarnings = proSubs * subPrice * commissionPct;
  const tierLabel      = proSubs >= 501 ? '25% · Elite Tier' : '20% · Standard Tier';
  const tierDisplay    = commissionPct === 0.25 ? '25% Commission · Elite Tier' : '20% Commission · Standard Tier';

  // Progress toward 501 (next tier milestone)
  const progressToNextTier = proSubs >= 501 ? 100 : Math.min((proSubs / 501) * 100, 100);
  const subsNeeded         = proSubs >= 501 ? 0 : 501 - proSubs;

  // Motivational footer
  const footers = [
    'Keep growing, your goal is in sight!',
    'Every referral brings you closer to Elite Tier.',
    'You\'re building something great — keep sharing!',
    'Consistency compounds. Keep going!',
  ];
  const footer = proSubs >= 501
    ? '🏆 You\'ve reached Elite Tier! Maximum commissions unlocked.'
    : footers[Math.floor(totalReferrals / 10) % footers.length];

  // Update DOM
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('aff-username',        name);
  set('aff-tier',            tierDisplay);
  set('aff-total-referrals', totalReferrals.toLocaleString());
  set('aff-pro-subs',        proSubs.toLocaleString());
  set('aff-monthly',        `$${monthlyEarnings.toFixed(0)}`);
  set('aff-lifetime',       `$${lifetimeRaw.toFixed(0)}`);
  set('aff-tier-label',      tierLabel);
  set('aff-progress-note',   proSubs >= 501
    ? '✓ Elite Tier reached — earning 25% commission'
    : `Reach 501 Pro Subscribers for 25% commission · ${subsNeeded} to go`);
  set('aff-footer-line',     footer);

  const fill = document.getElementById('aff-progress-fill');
  if (fill) fill.style.width = progressToNextTier.toFixed(1) + '%';
}

function copyReferralLink() {
  const userId  = telegramChatId || localStorage.getItem('tg_chat_id') || 'user';
  // Telegram Mini App deep link — opens the app via the main bot
  // When a new user opens this link, their referrer ID is passed via startapp
  const refLink = `https://t.me/tradewatchalert_bot/altradia?startapp=ref_${userId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(refLink)
      .then(() => showToast('Link Copied!', 'Share it with traders to earn commissions.', 'success'))
      .catch(() => showToast('Your Referral Link', refLink, 'info'));
  } else {
    showToast('Your Referral Link', refLink, 'info');
  }
}

function renderPayoutHistory() {
  const container = document.getElementById('payout-history-list');
  if (!container) return;

  // Load from localStorage (replace with Supabase query in production)
  let payouts = [];
  try { payouts = JSON.parse(localStorage.getItem('aff_payouts') || '[]'); } catch(e) {}

  if (!payouts.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="opacity:0.25;margin-bottom:14px">
          <rect x="8" y="8" width="32" height="36" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="16" y1="18" x2="32" y2="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="16" y1="30" x2="24" y2="30" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <div style="font-family:var(--mono);font-size:0.75rem;color:var(--muted)">No payouts yet.</div>
        <div style="font-family:var(--mono);font-size:0.62rem;color:var(--muted);margin-top:6px;opacity:0.6">Payouts appear here once processed.</div>
      </div>`;
    return;
  }

  container.innerHTML = payouts.map(p => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-family:var(--mono);font-size:0.7rem;font-weight:700;color:var(--text)">${p.period || '—'}</div>
        <div style="font-family:var(--mono);font-size:0.58rem;color:var(--muted);margin-top:3px">${p.subs || 0} subscribers · ${p.pct || 20}% commission</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1rem;font-weight:800;color:var(--green)">$${parseFloat(p.amount || 0).toFixed(2)}</div>
        <div style="font-family:var(--mono);font-size:0.55rem;color:var(--muted);margin-top:2px;text-transform:uppercase">${p.status || 'Paid'}</div>
      </div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════════
// BROKER SYNC — MTAPI.IO integration
// Connects MT4/MT5 accounts via Supabase Edge Function
// ════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// BROKER SERVER NAME RESOLVER
// Converts MT4/MT5 display names like "ICMarkets-Live01" to real
// hostnames like "live01.icmarkets.com" that MTAPI can connect to.
// Users just paste what they see in MT4/MT5 — we handle the rest.
// ═══════════════════════════════════════════════════════════════

const BS_BROKER_PATTERNS = [
  // [regex, transform(match) → hostname]
  [/^ICMarkets[^-]*-(.+)$/i,        m => `${m[1].toLowerCase().replace(/\s+/g,'')}.icmarkets.com`],
  [/^Pepperstone[^-]*-(.+)$/i,      m => `${m[1].toLowerCase().replace(/\s+/g,'')}.pepperstone.com`],
  [/^Exness[^-]*-(.+)$/i,           m => `${m[1].toLowerCase().replace(/\s+/g,'')}.exness.com`],
  [/^XM[^-]*-(.+)$/i,               m => `${m[1].toLowerCase().replace(/\s+/g,'-')}.xm.com`],
  [/^FPMarkets[^-]*-(.+)$/i,        m => `${m[1].toLowerCase().replace(/\s+/g,'')}.fpmarkets.com`],
  [/^Vantage[^-]*-(.+)$/i,          m => `${m[1].toLowerCase().replace(/\s+/g,'')}.vantagemarkets.com`],
  [/^Tickmill[^-]*-(.+)$/i,         m => `${m[1].toLowerCase().replace(/\s+/g,'')}.tickmill.com`],
  [/^EightCap[^-]*-(.+)$/i,         m => `${m[1].toLowerCase().replace(/\s+/g,'')}.eightcap.com`],
  [/^Axi[^-]*-(.+)$/i,              m => `${m[1].toLowerCase().replace(/\s+/g,'')}.axi.com`],
  [/^FXTM[^-]*-(.+)$/i,             m => `${m[1].toLowerCase().replace(/\s+/g,'')}.fxtm.com`],
  [/^HF[^-]*-(.+)$/i,               m => `${m[1].toLowerCase().replace(/\s+/g,'')}.hfm.com`],
  [/^HotForex[^-]*-(.+)$/i,         m => `${m[1].toLowerCase().replace(/\s+/g,'')}.hotforex.com`],
  [/^FBS[^-]*-(.+)$/i,              m => `${m[1].toLowerCase().replace(/\s+/g,'')}.fbs.com`],
  [/^RoboForex[^-]*-(.+)$/i,        m => `${m[1].toLowerCase().replace(/\s+/g,'')}.roboforex.com`],
  [/^OctaFX[^-]*-(.+)$/i,           m => `${m[1].toLowerCase().replace(/\s+/g,'')}.octafx.com`],
  [/^OctaMarkets[^-]*-(.+)$/i,      m => `${m[1].toLowerCase().replace(/\s+/g,'')}.octamarkets.com`],
  [/^Deriv[^-]*-(.+)$/i,            m => `${m[1].toLowerCase().replace(/\s+/g,'')}.deriv.com`],
  [/^OANDA[^-]*-(.+)$/i,            m => `${m[1].toLowerCase().replace(/\s+/g,'')}.oanda.com`],
  [/^ThinkMarkets[^-]*-(.+)$/i,     m => `${m[1].toLowerCase().replace(/\s+/g,'')}.thinkmarkets.com`],
  [/^ActivTrades[^-]*-(.+)$/i,      m => `${m[1].toLowerCase().replace(/\s+/g,'')}.activtrades.com`],
  [/^FXCM[^-]*-(.+)$/i,             m => `${m[1].toLowerCase().replace(/\s+/g,'')}.fxcm.com`],
  [/^Admiral[^-]*-(.+)$/i,          m => `${m[1].toLowerCase().replace(/\s+/g,'')}.admiralmarkets.com`],
  [/^FTMO[^-]*-(.+)$/i,             m => `${m[1].toLowerCase().replace(/\s+/g,'')}.ftmo.com`],
  [/^MyFundedFX[^-]*-(.+)$/i,       m => `${m[1].toLowerCase().replace(/\s+/g,'')}.myfundedfx.tech`],
  [/^The5ers?[^-]*-(.+)$/i,         m => `${m[1].toLowerCase().replace(/\s+/g,'')}.the5ers.com`],
  [/^BlueberryMarkets[^-]*-(.+)$/i, m => `${m[1].toLowerCase().replace(/\s+/g,'')}.blueberrymarkets.com`],
  // Generic: BrokerName-Label → label.brokername.com
  [/^([A-Za-z0-9]+)[^-]*-(.+)$/,    m => `${m[2].toLowerCase().replace(/\s+/g,'')}.${m[1].toLowerCase()}.com`],
];

// Direct map for brokers with unusual display→hostname patterns
const BS_KNOWN_SERVERS = {
  'assexmarketsglobal-trade':  'trade.assexmarketsglobal.com',
  'assexmarkets-trade':        'trade.assexmarkets.com',
  'assexmarkets-live':         'live.assexmarkets.com',
  'metaquotes-demo':           'demo.mt5.metaquotes.net',
  'metaquotes-demo4':          'demo.mt4.metaquotes.net',
};

function resolveServerHostname(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return trimmed;

  // Already a real hostname (has dots, no spaces, not "Name-Label" format)
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return trimmed.split(':')[0]; // strip port if present
  }

  // Direct known map (case-insensitive, spaces stripped)
  const key = trimmed.toLowerCase().replace(/\s+/g, '');
  if (BS_KNOWN_SERVERS[key]) return BS_KNOWN_SERVERS[key];

  // Pattern matching
  for (const [pattern, transform] of BS_BROKER_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) return transform(m);
  }

  // Fallback — return as-is and let MTAPI try it
  return trimmed;
}

const BS_EDGE = 'https://etugovdinpbqiygsbemc.supabase.co/functions/v1/broker-sync';
let _bsPlatform     = 'MT4';
let _bsConnectionId = null;
let _bsPollInterval = null;

function openMenuBrokerSync() {
  openMenuPage('brokersync');
  // Restore saved platform, then try to load any existing connection
  const saved = localStorage.getItem('broker_platform') || 'MT4';
  _bsPlatform = saved;
  bsUpdatePlatformUI(saved);
  loadBrokerSyncPage();
}

function bsUpdatePlatformUI(platform) {
  _bsPlatform = platform;
  localStorage.setItem('broker_platform', platform);
  const mt4Btn = document.getElementById('bs-btn-mt4');
  const mt5Btn = document.getElementById('bs-btn-mt5');
  if (!mt4Btn || !mt5Btn) return;
  const isMT4 = platform === 'MT4';
  mt4Btn.classList.toggle('active', isMT4);
  mt5Btn.classList.toggle('active', !isMT4);
}

// Keep old name for compatibility
function selectBrokerPlatform(p) { bsUpdatePlatformUI(p); }
function initBrokerPlatform() {
  const saved = localStorage.getItem('broker_platform') || 'MT4';
  bsUpdatePlatformUI(saved);
}

function bsSelectPlatform(p) { bsUpdatePlatformUI(p); }

function bsTogglePassword() {
  const inp  = document.getElementById('bs-password');
  const show = document.getElementById('bs-eye-show');
  const hide = document.getElementById('bs-eye-hide');
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  if (show) show.style.display = isText ? '' : 'none';
  if (hide) hide.style.display = isText ? 'none' : '';
}

async function bsConnect() {
  const serverRaw = document.getElementById('bs-server')?.value.trim();
  const server    = resolveServerHostname(serverRaw);
  const login    = document.getElementById('bs-login')?.value.trim();
  const password = document.getElementById('bs-password')?.value;
  const broker   = document.getElementById('bs-broker-name')?.value.trim();
  const errEl    = document.getElementById('bs-error');
  const btn      = document.getElementById('bs-connect-btn');
  const label    = document.getElementById('bs-connect-label');
  const icon     = document.getElementById('bs-connect-icon');

  if (errEl) errEl.style.display = 'none';

  if (!server || !login || !password) {
    if (errEl) { errEl.textContent = 'Please fill in all required fields.'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) btn.disabled = true;
  if (label) label.textContent = 'Connecting…';
  if (icon) icon.innerHTML = '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="30" stroke-dashoffset="10" style="animation:spin 1s linear infinite;transform-origin:center"/>';

  try {
    const jwt  = await getSupabaseJWT();
    const resp = await fetch(`${BS_EDGE}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify({ platform: _bsPlatform, server, port: 443, login, password, brokerName: broker, userId: currentUserId }),
    });
    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      if (errEl) {
        const errMsg = data.error || 'Connection failed. Check your server address, login, and password.';
        errEl.innerHTML = errMsg.replace(/\n•/g, '<br>•').replace(/\n/g, '<br>');
        errEl.style.display = 'block';
      }
      if (btn) btn.disabled = false;
      if (label) label.textContent = 'Connect Account';
      if (icon) icon.innerHTML = '<path d="M8 1v6M8 9v6M1 8h6M9 8h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
      return;
    }

    _bsConnectionId = data.connection.id;
    bsShowConnected(data.connection, data.sync);
    showToast('Broker Connected', `${data.connection.broker || 'Account'} synced successfully.`, 'success');
    bsStartPolling();

  } catch(e) {
    if (errEl) { errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block'; }
    if (btn) btn.disabled = false;
    if (label) label.textContent = 'Connect Account';
    if (icon) icon.innerHTML = '<path d="M8 1v6M8 9v6M1 8h6M9 8h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
  }
}

function bsShowConnected(conn, sync) {
  const viewConnect   = document.getElementById('bs-view-connect');
  const viewConnected = document.getElementById('bs-view-connected');
  if (viewConnect)   viewConnect.style.display   = 'none';
  if (viewConnected) viewConnected.style.display = '';

  const dot    = document.getElementById('bs-conn-dot');
  const name   = document.getElementById('bs-account-name');
  const sub    = document.getElementById('bs-account-sub');
  const plat   = document.getElementById('bs-account-platform');
  const bal    = document.getElementById('bs-balance');
  const eq     = document.getElementById('bs-equity');
  const trades = document.getElementById('bs-open-trades');
  const sync_  = document.getElementById('bs-last-sync');

  if (dot)    dot.classList.add('live');
  if (name)   name.textContent    = conn.name || conn.broker || conn.login;
  if (sub)    sub.textContent     = `Login: ${conn.login}`;
  if (plat)   plat.textContent    = conn.platform || _bsPlatform;
  const cur = conn.currency || '';
  if (bal)    bal.textContent     = conn.balance  != null ? `${cur} ${Number(conn.balance).toFixed(2)}`  : '—';
  if (eq)     eq.textContent      = conn.equity   != null ? `${cur} ${Number(conn.equity).toFixed(2)}`   : '—';
  if (trades) trades.textContent  = sync?.orders  != null ? String(sync.orders) : '—';
  if (sync_)  sync_.textContent   = 'Last sync: just now';

  renderAlerts();
}

function bsRenderTradesList() {
  const el = document.getElementById('bs-trades-list');
  if (!el) return;
  const synced = alerts.filter(a => { try { return !!JSON.parse(a.note || '{}').brokerTicket; } catch { return false; } });
  if (!synced.length) {
    el.innerHTML = '<div style="font-family:var(--mono);font-size:0.68rem;color:var(--muted);padding:12px 0">No trades synced yet.</div>';
    return;
  }
  el.innerHTML = synced.map(a => {
    let j = {}; try { j = JSON.parse(a.note || '{}'); } catch {}
    const dir = j.direction || 'long';
    const profit = typeof j.profit === 'number' ? j.profit : null;
    const pnlCls = profit === null ? '' : profit >= 0 ? 'pos' : 'neg';
    const pnlTxt = profit === null ? '' : (profit >= 0 ? '+' : '') + profit.toFixed(2);
    return `<div class="bs-trade-row">
      <div class="bs-trade-dir ${dir}">${dir.toUpperCase()}</div>
      <div class="bs-trade-info"><div class="bs-trade-sym">${a.symbol}</div><div class="bs-trade-detail">#${j.brokerTicket} · ${j.tradeStatus === 'running' ? '● LIVE' : '○ PENDING'} · ${j.lotSize ?? '—'} lots</div></div>
      ${profit !== null ? `<div class="bs-trade-pnl ${pnlCls}">${pnlTxt}</div>` : ''}
    </div>`;
  }).join('');
}

async function bsManualPoll() {
  try {
    const jwt  = await getSupabaseJWT();
    const resp = await fetch(`${BS_EDGE}/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify({ userId: currentUserId }),
    });
    const data = await resp.json();
    if (data.ok) {
      const sync_ = document.getElementById('bs-last-sync');
      if (sync_) sync_.textContent = 'Last sync: just now';
      renderAlerts();
      bsRenderTradesList();
      showToast('Synced', 'Trades refreshed from broker.', 'success');
    }
  } catch(e) { showToast('Sync Error', 'Sync failed — check connection.', 'error'); }
}

function bsStartPolling() {
  if (_bsPollInterval) clearInterval(_bsPollInterval);
  _bsPollInterval = setInterval(() => {
    if (_bsConnectionId) bsManualPoll();
  }, 30000);
}

async function bsDisconnect() {
  if (!_bsConnectionId) return;
  try {
    const jwt = await getSupabaseJWT();
    await fetch(`${BS_EDGE}/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify({ connectionId: _bsConnectionId, userId: currentUserId }),
    });
  } catch {}
  _bsConnectionId = null;
  if (_bsPollInterval) { clearInterval(_bsPollInterval); _bsPollInterval = null; }
  const viewConnect   = document.getElementById('bs-view-connect');
  const viewConnected = document.getElementById('bs-view-connected');
  if (viewConnect)   viewConnect.style.display   = '';
  if (viewConnected) viewConnected.style.display = 'none';
  const dot = document.getElementById('bs-conn-dot');
  if (dot) dot.classList.remove('live');
  showToast('Disconnected', 'Broker account disconnected.', 'info');
}

async function loadBrokerSyncPage() {
  try {
    const jwt  = await getSupabaseJWT();
    const resp = await fetch(`${BS_EDGE}/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify({ userId: currentUserId }),
    });
    const data = await resp.json();
    const active = (data.connections || []).find(c => c.status === 'connected');
    if (active) {
      _bsConnectionId = active.id;
      _bsPlatform     = active.platform;
      bsUpdatePlatformUI(active.platform);
      bsShowConnected({
        id: active.id, platform: active.platform, broker: active.broker_name,
        login: active.mt_login, balance: active.balance, equity: active.equity,
        currency: active.currency, name: active.broker_name,
      }, { orders: active.open_trades });
      const sync_ = document.getElementById('bs-last-sync');
      if (sync_ && active.last_sync) {
        const ls = new Date(active.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        sync_.textContent = `Last sync: ${ls}`;
      }
      bsRenderTradesList();
      bsStartPolling();
    }
  } catch(e) { console.warn('loadBrokerSyncPage:', e); }
}

async function getSupabaseJWT() {
  // This app uses Telegram-based auth (not Supabase JWT).
  // We pass the anon key so the Edge Function can verify the userId against the DB.
  return (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '';
}

function openMenuPage(name) {
  const page = document.getElementById('menu-page-' + name);
  if (!page) return;
  page.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    page.classList.add('open');
  }));
}

function closeMenuPage(name) {
  const page = document.getElementById('menu-page-' + name);
  if (!page) return;
  page.classList.remove('open');
  setTimeout(() => { page.style.display = 'none'; }, 280);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  // sound-btn/waves/mute are gone from header — state synced via updateMenuToggles()
  const btn = null, waves = null, mute = null;
  // Visual state is now managed by updateMenuToggles() below
  if (soundEnabled) playAlertSound(selectedAlertSound);
  updateMenuToggles(); // sync menu panel toggle state
}

function toggleTheme() {
  const root    = document.documentElement;
  const isLight = root.getAttribute('data-theme') !== 'light';
  root.setAttribute('data-theme', isLight ? 'light' : 'dark');
  localStorage.setItem('tw_theme', isLight ? 'light' : 'dark');
  updateMenuToggles(); // sync menu panel
  // Reload chart so it picks up new theme colors
  if (lwCurrentAsset) loadLWChart(lwCurrentAsset, true); // reload with new theme
}

function initTheme() {
  const saved = localStorage.getItem('tw_theme');
  document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
  // Menu panel toggles updated once menu opens (updateMenuToggles called in openMenuPanel)
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
      telegramChatId    = String(tgUser.id);
      telegramUserName  = tgUser.first_name || tgUser.username || 'there';
      telegramUserPhoto = tgUser.photo_url  || '';
      localStorage.setItem('tg_chat_id',   telegramChatId);
      localStorage.setItem('tg_user_name', telegramUserName);
      localStorage.setItem('tg_photo_url', telegramUserPhoto);
      telegramEnabled = true;
      localStorage.setItem('tg_enabled', 'true');
    } else {
      // Restore from localStorage on reload (when not inside Telegram)
      telegramUserName  = localStorage.getItem('tg_user_name')  || '';
      telegramUserPhoto = localStorage.getItem('tg_photo_url')  || '';
    }
  } catch(e) {}
})();

// ── Telegram Mini App SDK setup ───────────────────
// Disable vertical swipe-down to close/minimize — prevents accidental dismissal
// while the user is scrolling through lists or the chart page.
(function setupTelegramWebApp() {
  try {
    const twa = window.Telegram?.WebApp;
    if (!twa) return;
    // Prevent the app from being minimised by downward swipe
    if (typeof twa.disableVerticalSwipes === 'function') {
      twa.disableVerticalSwipes();
    }
    // Wire up the native Telegram back button to our in-app navigation.
    // This shows the ← button in the Telegram header automatically.
    const backBtn = twa.BackButton;
    if (backBtn) {
      backBtn.onClick(() => {
        // Try our in-app back logic first
        const openPages = document.querySelectorAll('.menu-page.open');
        if (openPages.length) {
          // Close topmost sub-page
          const top = openPages[openPages.length - 1];
          top.classList.remove('open');
          setTimeout(() => { top.style.display = 'none'; }, 280);
          return;
        }
        const menuPanel = document.getElementById('menu-panel');
        const menuOpen  = menuPanel &&
          menuPanel.style.display === 'flex' &&
          menuPanel.style.transform !== 'translateX(100%)';
        if (menuOpen) { closeMenuPanel(); return; }
        if (navStack.length > 1) { goBack(); return; }
        // At root — hide the back button since there's nowhere to go back to
        backBtn.hide();
      });

      // Show/hide the back button based on navigation depth
      // We hook into mobileTab/openMenuPanel via a lightweight observer
      const _origMobileTab = window.mobileTab;
      // Update visibility after any tab change
      const _updateBackBtn = () => {
        const openPages = document.querySelectorAll('.menu-page.open');
        const menuPanel = document.getElementById('menu-panel');
        const menuOpen  = menuPanel &&
          menuPanel.style.display === 'flex' &&
          menuPanel.style.transform !== 'translateX(100%)';
        if (navStack.length > 1 || openPages.length || menuOpen) {
          backBtn.show();
        } else {
          backBtn.hide();
        }
      };
      // Poll every 300ms — lightweight enough and avoids patching every function
      setInterval(_updateBackBtn, 300);
    }
  } catch(e) { console.warn('TG WebApp setup:', e); }
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
    sendTelegram('🔔 <b>altradia Connected!</b>\n\nYour alerts are live. You\'ll get notified here the moment a price target is hit.\n\n<i>Stay sharp. </i>');
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
  const ok = await sendTelegram('✅ <b>Test Successful!</b>\n\naltradia is connected and ready to fire alerts.\n\n<i>You\'re all set. </i>');
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
  return [header, ``, subtitle, ``, ...rows, ``, `<a href="https://t.me/tradewatchalert_bot/assistant">Dismiss in altradia →</a>`].join('\n');
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
  updateSessionDisplay();
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
  updateSessionDisplay();
}, 8000);

// REST refresh every 60 seconds — keeps CoinGecko crypto prices current
// Deriv WebSocket handles all real-time ticks for forex/indices/synthetics
setInterval(() => {
  fetchAllPrices();
  // Reconnect / re-subscribe Deriv on every REST cycle to catch any dropped ticks
  if (!_conn1.ws || _conn1.ws.readyState > 1) connectDeriv();
  else resubscribeAllDeriv();
}, 60 * 1000);

// ═══════════════════════════════════════════════
// APP INIT REVEAL
// ═══════════════════════════════════════════════
function revealApp() {
  document.body.classList.remove('app-loading');
  const screen = document.getElementById('app-init-screen');
  if (screen) {
    screen.style.transition = 'opacity 0.35s ease';
    screen.style.opacity = '0';
    setTimeout(() => { screen.style.display = 'none'; }, 370);
  }
}

// ═══════════════════════════════════════════════
// AUTO-GROW TEXTAREAS
// ═══════════════════════════════════════════════
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function initAutoGrowTextareas() {
  document.querySelectorAll('.auto-grow-textarea').forEach(el => {
    el.addEventListener('input', () => autoGrow(el));
    autoGrow(el); // size correctly if pre-filled
  });
}

// ═══════════════════════════════════════════════
// SESSION DISPLAY — replaces "UPDATED --:--"
// Shows current open forex session(s), or a
// countdown to the next session when market is closed.
// ═══════════════════════════════════════════════
const FOREX_SESSIONS = [
  { name: 'Sydney',   open: 21, close: 6  },
  { name: 'Tokyo',    open: 0,  close: 9  },
  { name: 'London',   open: 7,  close: 16 },
  { name: 'New York', open: 12, close: 21 },
];

function getForexSessionStatus() {
  const now    = new Date();
  const utcH   = now.getUTCHours();
  const utcM   = now.getUTCMinutes();
  const utcS   = now.getUTCSeconds();
  const utcDay = now.getUTCDay(); // 0=Sun 6=Sat
  const utcMin = utcH * 60 + utcM;

  // Market closes Fri 21:00 UTC, reopens Sun 21:00 UTC
  const isFriAfterClose = utcDay === 5 && utcMin >= 21 * 60;
  const isSatAllDay     = utcDay === 6;
  const isSunBeforeOpen = utcDay === 0 && utcMin < 21 * 60;

  if (isFriAfterClose || isSatAllDay || isSunBeforeOpen) {
    // Seconds until Sunday 21:00 UTC
    const nextOpen = new Date(now);
    let daysUntilSun = (7 - utcDay) % 7;
    if (utcDay === 0) daysUntilSun = 0;
    nextOpen.setUTCDate(nextOpen.getUTCDate() + daysUntilSun);
    nextOpen.setUTCHours(21, 0, 0, 0);
    if (nextOpen <= now) nextOpen.setUTCDate(nextOpen.getUTCDate() + 7);
    const secsUntil = Math.max(0, Math.floor((nextOpen - now) / 1000));
    return { open: false, sessions: [], secsUntilNext: secsUntil, nextName: 'Sydney' };
  }

  // Check active sessions
  const active = [];
  FOREX_SESSIONS.forEach(s => {
    let isActive;
    if (s.open > s.close) {
      // crosses midnight (Sydney: 21→6)
      isActive = utcH >= s.open || utcH < s.close;
    } else {
      isActive = utcH >= s.open && utcH < s.close;
    }
    if (isActive) active.push(s.name);
  });

  if (active.length > 0) {
    return { open: true, sessions: active, secsUntilNext: 0, nextName: null };
  }

  // Between sessions — find nearest next open
  let minSecs  = Infinity;
  let nextName = '';
  FOREX_SESSIONS.forEach(s => {
    let secsUntil;
    if (utcH < s.open) {
      secsUntil = (s.open - utcH) * 3600 - utcM * 60 - utcS;
    } else {
      secsUntil = (24 - utcH + s.open) * 3600 - utcM * 60 - utcS;
    }
    if (secsUntil < minSecs) { minSecs = secsUntil; nextName = s.name; }
  });
  return { open: false, sessions: [], secsUntilNext: Math.max(0, minSecs), nextName };
}

function formatSessionCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`;
  return `${s}s`;
}

function updateSessionDisplay() {
  const dotEl       = document.getElementById('session-dot');
  const labelEl     = document.getElementById('session-label');
  const countdownEl = document.getElementById('session-countdown');
  if (!dotEl || !labelEl || !countdownEl) return;

  const status = getForexSessionStatus();
  if (status.open) {
    dotEl.classList.remove('closed');
    labelEl.textContent    = status.sessions.join(' / ');
    countdownEl.textContent = '';
  } else {
    dotEl.classList.add('closed');
    labelEl.textContent    = 'CLOSED';
    countdownEl.textContent = status.secsUntilNext > 0
      ? '· ' + formatSessionCountdown(status.secsUntilNext)
      : '';
  }
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  // Apply saved theme before anything renders
  initTheme();

  // Restore persisted feature settings
  slStreakWarningEnabled = localStorage.getItem('sl_streak_enabled')   === '1';
  slStreakThreshold      = parseInt(localStorage.getItem('sl_streak_threshold') || '3', 10);
  watchlistGrouped       = localStorage.getItem('wl_grouped') !== '0'; // default true
  loadTgNotifPrefs();

  // Push initial history state so Android back button is interceptable from the start
  window.history.replaceState({ twTab: 'chart' }, '', '');

  // Seed hot list data in memory only — do NOT render to DOM yet
  HOT_LIST = { ...HOT_LIST_SEED };

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
      // Show consent disclaimer first — user must agree before proceeding
      const consented = await showConsentDisclaimer();
      if (!consented) return; // user declined — halt
      revealApp();
      const onboardOk = await showOnboardingScreen();
      if (!onboardOk) return;
      localStorage.setItem('tw_onboarded', '1');
    }
  } else {
    revealApp();
    soundEnabled = prefs?.sound_enabled ?? true;
    showTgConnectPrompt();
    return;
  }
  updateTgBtn();

  const dbAlerts = await loadAlertsFromDB();
  if (dbAlerts !== null) alerts = dbAlerts;

  await initAlertHistory();

  // ── Load user's personal watchlist from DB ──────
  Object.keys(ASSETS).forEach(cat => { ASSETS[cat] = []; });

  const dbWatchlist = await loadWatchlist();
  if (dbWatchlist && dbWatchlist.length > 0) {
    dbWatchlist.forEach(row => {
      const cat = row.category;
      if (!cat) return;
      if (!ASSETS[cat]) ASSETS[cat] = [];
      if (ASSETS[cat].some(a => a.id === row.asset_id)) return;
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

  // Build hot list from DB click rankings
  const rankings = await loadHotListRankings();
  if (rankings && Object.keys(rankings).length > 0) {
    HOT_LIST = {};
    Object.entries(rankings).forEach(([cat, ids]) => {
      HOT_LIST[cat] = ids.filter(id => ALL_ASSETS.some(a => a.id === id));
    });
    Object.entries(HOT_LIST_SEED).forEach(([cat, ids]) => {
      if (!HOT_LIST[cat] || HOT_LIST[cat].length === 0) {
        HOT_LIST[cat] = ids;
      }
    });
  } else {
    HOT_LIST = { ...HOT_LIST_SEED };
  }

  populateDropdown();
  renderHotList();
  renderWatchlist();
  renderAlerts();

  // Restore last timeframe
  const _lastTF = localStorage.getItem('altradia_last_tf');
  if (_lastTF) {
    lwCurrentTF = _lastTF;
    document.querySelectorAll('.chart-tf-btn').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === _lastTF);
    });
  }
  // Restore last viewed asset, or default to EUR/USD for new users
  const _lastAssetId = localStorage.getItem('altradia_last_asset') || 'EUR/USD';
  const _defaultAsset = ALL_ASSETS.find(a => a.id === _lastAssetId)
                     || ALL_ASSETS.find(a => a.id === 'EUR/USD');
  if (_defaultAsset) selectAsset(_defaultAsset);

  // Connect Deriv WebSocket
  connectDeriv();
  setTimeout(resubscribeAllDeriv, 3000);

  // ── Alert form focus tracking ─────────────────────────────────────────────
  const alertFormInputs = [
    'alert-price', 'alert-zone-low', 'alert-zone-high',
    'alert-note', 'alert-note-zone', 'alert-tap-custom',
    'setup-entry', 'setup-sl', 'setup-tp1', 'setup-tp2', 'setup-tp3',
    'setup-entry-reason', 'setup-htf-context',
  ];
  alertFormInputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { userTypingInForm = true; });
    el.addEventListener('blur',  () => {
      setTimeout(() => { userTypingInForm = false; }, 300);
    });
  });
  ['alert-condition','alert-timeframe','alert-repeat','alert-tap-tolerance',
   'setup-type','setup-timeframe','setup-emotion-before'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { userTypingInForm = true; });
    el.addEventListener('blur',  () => { setTimeout(() => { userTypingInForm = false; }, 300); });
  });

  // Initial REST fetch
  await fetchAllPrices();
  setStatusPill(true);

  // Re-subscribe Deriv with confirmed symbols now that ASSETS is fully populated
  resubscribeAllDeriv();

  refreshSelectedAssetPanel();

  // ── Auto-growing textareas ────────────────────────────────────────────────
  initAutoGrowTextareas();

  // ── Start SESSION ticker ──────────────────────────────────────────────────
  updateSessionDisplay();
  setInterval(updateSessionDisplay, 10000);

  // Navigate straight to chart on load
  mobileTab('chart', false);
  revealApp();

}

function setStatusPill(isLive) {
  // Status pill removed from UI — function kept as no-op to avoid errors
}

window.addEventListener('resize', () => {
  // Mobile-only: re-fit chart canvas when keyboard opens/closes
  // (do NOT call mobileTab here — it resets scroll position mid-input)
  if (lwChart) {
    try {
      lwChart.resize(
        document.getElementById('lw-chart').clientWidth,
        document.getElementById('lw-chart').clientHeight
      );
    } catch(e) {}
  }
});

// Refresh prices when user returns to the tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    fetchAllPrices();
    // Reconnect both WS connections if they dropped
    if (!_conn1.ws || _conn1.ws.readyState > 1) connectDeriv();
    if (!_conn2.ws || _conn2.ws.readyState > 1) connectDerivSynthetics();
    // Don't re-init the chart tab if user is actively filling a form —
    // mobileTab('chart') calls loadTVChart which resets scroll position
    if (isMobileLayout() && !userTypingInForm) mobileTab(navStack[navStack.length-1], false);
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

// ═══════════════════════════════════════════════
// CONSENT DISCLAIMER
// Shown once to new users before onboarding.
// They must tick a checkbox to proceed.
// ═══════════════════════════════════════════════
function showConsentDisclaimer() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'consent-overlay';

    overlay.innerHTML = `
      <div class="consent-scroll">
        <div style="margin-bottom:24px">
          <svg viewBox="0 0 240 44" xmlns="http://www.w3.org/2000/svg" height="28" aria-label="altradia" style="display:block;margin-bottom:20px">
            <defs>
              <linearGradient id="consent-radia-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2d8a3e"/>
                <stop offset="100%" stop-color="#115c28"/>
              </linearGradient>
            </defs>
            <text y="36" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Arial,sans-serif" font-weight="800" font-size="40">
              <tspan fill="#025a91">alt</tspan><tspan fill="url(#consent-radia-grad)">radia</tspan>
            </text>
          </svg>
          <div style="font-size:1.3rem;font-weight:800;color:var(--text);margin-bottom:6px">Before You Continue</div>
          <div style="font-size:0.82rem;color:var(--muted);line-height:1.5">When creating an account or using Altradia's Telegram Mini App, you will be asked to confirm your agreement with our legal policies. This consent ensures transparency and compliance with data protection standards.</div>
        </div>

        <hr style="border:none;border-top:1px solid var(--border);margin:0 0 20px">

        <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:8px">Consent Statement</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">By continuing, you acknowledge and agree to the following:</div>
        <ul style="padding-left:18px;margin:0 0 16px;display:flex;flex-direction:column;gap:8px">
          <li style="font-size:0.82rem;color:var(--text);line-height:1.5">You have read and understood Altradia's <strong>Terms of Use</strong>, <strong>Privacy Policy</strong>, and <strong>Cookies Policy</strong>.</li>
          <li style="font-size:0.82rem;color:var(--text);line-height:1.5">You consent to Altradia processing your data as described in these policies, including the use of session identifiers, broker integration data, and alert preferences.</li>
          <li style="font-size:0.82rem;color:var(--text);line-height:1.5">You understand that Altradia does not provide financial advice and that alerts are informational only.</li>
          <li style="font-size:0.82rem;color:var(--text);line-height:1.5">You may withdraw consent at any time by discontinuing use of the app or requesting account deletion.</li>
        </ul>

        <hr style="border:none;border-top:1px solid var(--border);margin:0 0 20px">

        <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:8px">User Action</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">To proceed, you must check the box below:</div>
      </div>

      <div class="consent-footer">
        <div class="consent-check-row" id="consent-check-row">
          <div class="consent-checkbox" id="consent-checkbox"></div>
          <div class="consent-check-label">I agree to Altradia's Terms of Use, Privacy Policy, and Cookies Policy.</div>
        </div>
        <button class="consent-proceed-btn" id="consent-proceed-btn">CONTINUE TO ALTRADIA</button>
      </div>
    `;

    document.body.appendChild(overlay);

    let agreed = false;

    const checkRow = overlay.querySelector('#consent-check-row');
    const checkbox = overlay.querySelector('#consent-checkbox');
    const proceedBtn = overlay.querySelector('#consent-proceed-btn');

    checkRow.addEventListener('click', () => {
      agreed = !agreed;
      checkbox.classList.toggle('checked', agreed);
      proceedBtn.classList.toggle('enabled', agreed);
    });

    proceedBtn.addEventListener('click', () => {
      if (!agreed) return;
      localStorage.setItem('tw_consented', '1');
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        resolve(true);
      }, 320);
    });
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
          Connecting altradia to your Telegram.<br>This only takes a moment…
        </div>`;
      document.body.appendChild(overlay);

      // Auto-send test message after a brief linking pause
      setTimeout(() => attemptTestMessage(), 1800);
    }

    // ── Phase 2: Test message ─────────────────────
    async function attemptTestMessage() {
      const msg = '<b>ALTRADIA CONNECTED</b>\n\nYour account is linked. You\'ll receive instant alerts here the moment a price target is hit.\n\n<i>You\'re all set. </i>';
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
  if (telegramEnabled && telegramChatId && tgNotifPrefs.confirmation) {
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
      altradia delivers alerts directly to your Telegram.<br><br>
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

// ══════════════════════════════════════════════════════════════════════════════
// iOS-STYLE EDGE BACK SWIPE
// Handles THREE contexts in priority order:
//   1. Menu sub-page open (.menu-page.open) — swipe closes topmost sub-page
//   2. Menu panel open (#menu-panel visible) — swipe closes the menu panel
//   3. Main nav (navStack.length > 1) — swipe goes back in tab history
// Swipe must start within 28px of left edge and travel 30% of screen width.
// ══════════════════════════════════════════════════════════════════════════════
(function() {
  const EDGE_ZONE  = 28;
  const COMMIT_PCT = 0.30;

  let tracking   = false;
  let startX     = 0;
  let startY     = 0;
  let axisLocked = false;
  let isHoriz    = false;
  let mode       = null;   // 'subpage' | 'menupanel' | 'nav'
  let activePage = null;   // for 'subpage' mode

  function snapBack(el) {
    el.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
    el.style.transform  = '';
    el.style.opacity    = '';
    setTimeout(() => { el.style.transition = ''; }, 230);
  }

  function slideOut(el, cb) {
    el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    el.style.transform  = 'translateX(100%)';
    el.style.opacity    = '0';
    setTimeout(() => {
      el.style.display    = 'none';
      el.style.transform  = '';
      el.style.opacity    = '';
      el.style.transition = '';
      if (cb) cb();
    }, 260);
  }

  document.addEventListener('touchstart', e => {
    startX     = e.touches[0].clientX;
    startY     = e.touches[0].clientY;
    tracking   = false;
    axisLocked = false;
    isHoriz    = false;
    mode       = null;
    activePage = null;

    if (startX > EDGE_ZONE) return;

    // Priority 1: menu sub-page open
    const openPages = document.querySelectorAll('.menu-page.open');
    if (openPages.length) {
      activePage = openPages[openPages.length - 1];
      mode       = 'subpage';
      tracking   = true;
      return;
    }

    // Priority 2: menu panel visible (uses style.display + transform, not .open class)
    const menuPanel = document.getElementById('menu-panel');
    const menuVisible = menuPanel &&
      menuPanel.style.display === 'flex' &&
      menuPanel.style.transform !== 'translateX(100%)';
    if (menuVisible) {
      mode     = 'menupanel';
      tracking = true;
      return;
    }

    // Priority 3: main nav back
    if (isMobileLayout() && navStack.length > 1) {
      const modalOpen = document.getElementById('add-modal')?.style.display !== 'none';
      const tgOpen    = document.getElementById('tg-modal')?.style.display  !== 'none';
      if (!modalOpen && !tgOpen) {
        mode     = 'nav';
        tracking = true;
      }
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!axisLocked) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      isHoriz    = Math.abs(dx) > Math.abs(dy);
      axisLocked = true;
      if (!isHoriz) { tracking = false; return; }
    }
    if (!isHoriz || dx <= 0) { tracking = false; return; }

    // Drag the relevant element with the finger
    if (mode === 'subpage' && activePage) {
      const pct = Math.min(dx / window.innerWidth, 1);
      activePage.style.transition = 'none';
      activePage.style.transform  = `translateX(${dx}px)`;
      activePage.style.opacity    = String(1 - pct * 0.25);
    } else if (mode === 'menupanel') {
      const panel = document.getElementById('menu-panel');
      if (panel) {
        const pct = Math.min(dx / window.innerWidth, 1);
        panel.style.transition = 'none';
        panel.style.transform  = `translateX(${dx}px)`;
        panel.style.opacity    = String(1 - pct * 0.2);
      }
    }
    // nav mode: no visual drag needed — just commit on release
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!tracking || !isHoriz) { tracking = false; return; }
    tracking = false;

    const dx        = e.changedTouches[0].clientX - startX;
    const committed = dx >= window.innerWidth * COMMIT_PCT;

    if (mode === 'subpage' && activePage) {
      if (committed) {
        const page = activePage;
        activePage = null;
        slideOut(page, () => {
          page.classList.remove('open');
        });
      } else {
        snapBack(activePage);
        activePage = null;
      }

    } else if (mode === 'menupanel') {
      const panel = document.getElementById('menu-panel');
      if (panel) {
        if (committed) {
          // Use the app's own close function for correct cleanup
          closeMenuPanel();
        } else {
          // Snap back to open position
          panel.style.transition = 'transform 0.22s ease';
          panel.style.transform  = 'translateX(0)';
          setTimeout(() => { panel.style.transition = ''; }, 230);
        }
      }

    } else if (mode === 'nav') {
      if (committed) goBack();
    }
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    if (activePage) { snapBack(activePage); activePage = null; }
    if (mode === 'menupanel') {
      const panel = document.getElementById('menu-panel');
      if (panel) {
        panel.style.transition = 'transform 0.22s ease';
        panel.style.transform  = 'translateX(0)';
        setTimeout(() => { panel.style.transition = ''; }, 230);
      }
    }
    tracking = false; mode = null;
  }, { passive: true });
})();

init();
