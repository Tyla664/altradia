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
const DERIV_APP_ID  = '3FgUMWdvlyFOxPW'; // Registered Deriv App ID
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
  synthetics: ['R_75','R_100','BOOM500','BOOM1000','CRASH500','CRASH1000',
               '1HZ75V','1HZ100V','JD10','JD25','JD50','JD75','JD100'],
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
