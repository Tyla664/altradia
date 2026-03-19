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
  { id:'DJI',    symbol:'DOW',      name:'Dow Jones Industrial', cat:'indices', sources:['deriv','oanda'], derivSym:'US30',     oandaSym:'US30_USD'   },
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

  // ── Deriv Synthetic Indices (unique to Deriv, 24/7) ──
  { id:'R_10',    symbol:'Volatility 10', name:'Volatility 10 Index',   cat:'indices', sources:['deriv'], derivSym:'R_10' },
  { id:'R_25',    symbol:'Volatility 25', name:'Volatility 25 Index',   cat:'indices', sources:['deriv'], derivSym:'R_25' },
  { id:'R_50',    symbol:'Volatility 50', name:'Volatility 50 Index',   cat:'indices', sources:['deriv'], derivSym:'R_50' },
  { id:'R_75',    symbol:'Volatility 75', name:'Volatility 75 Index',   cat:'indices', sources:['deriv'], derivSym:'R_75' },
  { id:'R_100',   symbol:'Volatility 100',name:'Volatility 100 Index',  cat:'indices', sources:['deriv'], derivSym:'R_100' },
  { id:'BOOM500', symbol:'Boom 500',  name:'Boom 500 Index',            cat:'indices', sources:['deriv'], derivSym:'BOOM500' },
  { id:'BOOM1000',symbol:'Boom 1000', name:'Boom 1000 Index',           cat:'indices', sources:['deriv'], derivSym:'BOOM1000' },
  { id:'CRASH500',symbol:'Crash 500', name:'Crash 500 Index',           cat:'indices', sources:['deriv'], derivSym:'CRASH500' },
  { id:'CRASH1000',symbol:'Crash 1000',name:'Crash 1000 Index',         cat:'indices', sources:['deriv'], derivSym:'CRASH1000' },
  { id:'STPFALL', symbol:'Step Down', name:'Step Index',                 cat:'indices', sources:['deriv'], derivSym:'stpRNG' },
  { id:'JUMP10',  symbol:'Jump 10',   name:'Jump 10 Index',             cat:'indices', sources:['deriv'], derivSym:'JD10' },
  { id:'JUMP25',  symbol:'Jump 25',   name:'Jump 25 Index',             cat:'indices', sources:['deriv'], derivSym:'JD25' },
  { id:'JUMP50',  symbol:'Jump 50',   name:'Jump 50 Index',             cat:'indices', sources:['deriv'], derivSym:'JD50' },
  { id:'JUMP75',  symbol:'Jump 75',   name:'Jump 75 Index',             cat:'indices', sources:['deriv'], derivSym:'JD75' },
  { id:'JUMP100', symbol:'Jump 100',  name:'Jump 100 Index',            cat:'indices', sources:['deriv'], derivSym:'JD100' },
  { id:'DEX900UP',symbol:'DEX 900',   name:'Daily Exp. 900 Up',         cat:'indices', sources:['deriv'], derivSym:'DEX900UP' },
  { id:'DEX900DN',symbol:'DEX 900 DN',name:'Daily Exp. 900 Down',       cat:'indices', sources:['deriv'], derivSym:'DEX900DN' },

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
  forex: ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','USD/CHF'],
};
let HOT_LIST = { ...HOT_LIST_SEED };

// ═══════════════════════════════════════════════
// DERIV WEBSOCKET — real-time price ticks
// Connects once, subscribes to all active assets.
// Falls back gracefully if unavailable.
// ═══════════════════════════════════════════════
let derivWs     = null;
let derivReady  = false;
let derivPending = [];   // assets waiting for subscription after open
let derivRetryTimer = null;

function getDerivSymbols() {
  // All assets in the user's watchlist + hot list that have a Deriv symbol
  const watchedIds = new Set(Object.values(ASSETS).flat().map(a => a.id));
  const hotIds     = new Set(Object.values(HOT_LIST).flat());
  const allIds     = new Set([...watchedIds, ...hotIds]);
  return ALL_ASSETS.filter(a => a.derivSym && allIds.has(a.id)).map(a => a.derivSym);
}

function connectDeriv() {
  if (derivWs && (derivWs.readyState === WebSocket.CONNECTING || derivWs.readyState === WebSocket.OPEN)) return;

  derivWs    = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
  derivReady = false;

  derivWs.onopen = () => {
    derivReady = true;
    clearTimeout(derivRetryTimer);
    // Subscribe to all needed symbols
    const syms = getDerivSymbols();
    if (syms.length) {
      derivWs.send(JSON.stringify({ ticks_history: syms[0], end: 'latest', count: 1 })); // ping
      syms.forEach(sym => {
        derivWs.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
      });
    }
    setStatusPill(true);
  };

  derivWs.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.msg_type === 'tick' && msg.tick) {
        const sym   = msg.tick.symbol;
        const asset = ASSET_BY_DERIV.get(sym);
        if (!asset) return;
        const newPrice = parseFloat(msg.tick.quote);
        if (!newPrice) return;
        const prev = priceData[asset.id];
        priceData[asset.id] = {
          price:  newPrice,
          change: prev?.open ? (((newPrice - prev.open) / prev.open) * 100).toFixed(4) : '0.0000',
          high:   prev?.high  ? Math.max(prev.high, newPrice)  : newPrice,
          low:    prev?.low   ? Math.min(prev.low,  newPrice)  : newPrice,
          open:   prev?.open  || newPrice,
          vol:    prev?.vol   || '—',
          mcap:   '—',
          live:   true,
          src:    'deriv',
        };
        prices[asset.id] = newPrice;
      }
    } catch(e) {}
  };

  derivWs.onclose = (e) => {
    derivReady = false;
    if (e.code !== 1000) {
      derivRetryTimer = setTimeout(connectDeriv, 10000);
    }
  };

  derivWs.onerror = () => {
    derivWs.close();
  };
}

function subscribeDerivAsset(asset) {
  if (!asset.derivSym) return;
  if (derivReady && derivWs?.readyState === WebSocket.OPEN) {
    derivWs.send(JSON.stringify({ ticks: asset.derivSym, subscribe: 1 }));
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
  const oandaAssets  = allNeeded.filter(a => OANDA_KEY && a.oandaSym && !a.sources?.includes('deriv') && a.cat !== 'crypto');
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

function formatPrice(p, id) {
  if (!p) return '';
  if (p < 0.01) return '$' + p.toFixed(6);
  if (p < 1) return '$' + p.toFixed(4);
  if (id && (id.includes('/') && !id.startsWith('XAU') && !id.startsWith('XAG'))) return p.toFixed(4);
  return '$' + p.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

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

    // Above/below — only pre-fill if user hasn't already typed something
    const priceInput = document.getElementById('alert-price');
    if (priceInput && !priceInput.dataset.userEdited) {
      priceInput.value = rounded;
    }

    // Zone — pre-fill with ±0.3% band around current price (editable)
    const zoneLowEl  = document.getElementById('alert-zone-low');
    const zoneHighEl = document.getElementById('alert-zone-high');
    if (zoneLowEl && !zoneLowEl.dataset.userEdited) {
      zoneLowEl.value  = parseFloat((price * 0.997).toFixed(decimals));
    }
    if (zoneHighEl && !zoneHighEl.dataset.userEdited) {
      zoneHighEl.value = parseFloat((price * 1.003).toFixed(decimals));
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
// HOT LIST RENDERING
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
  selectedAsset = asset;

  // Track click for dynamic Hot List rankings (non-blocking)
  const cat = Object.entries(ASSETS).find(([, list]) => list.some(a => a.id === asset.id))?.[0]
           || Object.entries(HOT_LIST_SEED).find(([, ids]) => ids.includes(asset.id))?.[0];
  if (cat) trackAssetClick(asset.id, cat);

  // Reset price input so it pre-fills with new asset's price
  const priceInput = document.getElementById('alert-price');
  if (priceInput) { priceInput.value = ''; delete priceInput.dataset.userEdited; }

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
    loadTVChart(asset);
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
  const nav = document.getElementById('mobile-nav');
  return nav ? window.getComputedStyle(nav).display !== 'none' : window.innerWidth <= 768;
}

function mobileTab(tab, pushState = true) {
  if (!isMobileLayout()) return;

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
  document.getElementById('panel-alerts').classList.remove('mobile-active');

  // Deactivate all nav buttons
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

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
    setTimeout(() => { if (selectedAsset) loadTVChart(selectedAsset); }, 60);
  } else if (tab === 'alerts') {
    if (fab) fab.classList.remove('visible');
    const panel = document.getElementById('panel-alerts');
    panel.classList.add('mobile-active');
    panel.scrollTop = 0;
    document.getElementById('mnav-alerts').classList.add('active');
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

// Maps our asset IDs to TradingView symbols
function getTVSymbol(asset) {
  if (!asset) return 'BINANCE:BTCUSDT';
  const id  = asset.id;
  const cat = asset.cat ||
    (Object.entries(ASSETS).find(([, arr]) => arr.find(a => a.id === id)) || [])[0];

  // ── Crypto — Binance pairs ──────────────────────────────────────────────────
  const cryptoMap = {
    bitcoin:'BINANCE:BTCUSDT',         ethereum:'BINANCE:ETHUSDT',
    solana:'BINANCE:SOLUSDT',           ripple:'BINANCE:XRPUSDT',
    binancecoin:'BINANCE:BNBUSDT',      cardano:'BINANCE:ADAUSDT',
    dogecoin:'BINANCE:DOGEUSDT',        polkadot:'BINANCE:DOTUSDT',
    'avalanche-2':'BINANCE:AVAXUSDT',   chainlink:'BINANCE:LINKUSDT',
    litecoin:'BINANCE:LTCUSDT',         uniswap:'BINANCE:UNIUSDT',
    stellar:'BINANCE:XLMUSDT',          monero:'BINANCE:XMRUSDT',
    tron:'BINANCE:TRXUSDT',             'shiba-inu':'BINANCE:SHIBUSDT',
    cosmos:'BINANCE:ATOMUSDT',          filecoin:'BINANCE:FILUSDT',
    'internet-computer':'BINANCE:ICPUSDT', aptos:'BINANCE:APTUSDT',
    arbitrum:'BINANCE:ARBUSDT',         optimism:'BINANCE:OPUSDT',
    near:'BINANCE:NEARUSDT',            vechain:'BINANCE:VETUSDT',
    algorand:'BINANCE:ALGOUSDT',        hedera:'BINANCE:HBARUSDT',
    aave:'BINANCE:AAVEUSDT',            maker:'BINANCE:MKRUSDT',
    'fetch-ai':'BINANCE:FETUSDT',       'injective-protocol':'BINANCE:INJUSDT',
    sui:'BINANCE:SUIUSDT',              'sei-network':'BINANCE:SEIUSDT',
    'render-token':'BINANCE:RENDERUSDT',toncoin:'BINANCE:TONUSDT',
    pepe:'BINANCE:PEPEUSDT',            bonk:'BINANCE:BONKUSDT',
    kaspa:'BINANCE:KASUSDT',            'worldcoin-wld':'BINANCE:WLDUSDT',
    celestia:'BINANCE:TIAUSDT',         starknet:'BINANCE:STRKUSDT',
    'immutable-x':'BINANCE:IMXUSDT',    polygon:'BINANCE:MATICUSDT',
    'near-protocol':'BINANCE:NEARUSDT', 'fetch-ai':'BINANCE:FETUSDT',
  };
  if (cryptoMap[id]) return cryptoMap[id];

  // ── Forex — FX_ prefix (handles all currency pairs) ────────────────────────
  if (cat === 'forex' || (id.includes('/') && !['XAU','XAG','XPT','XPD'].some(m => id.startsWith(m)))) {
    const clean = id.replace('/', '');
    return `FX:${clean}`;
  }

  // ── Commodities ─────────────────────────────────────────────────────────────
  const commodityMap = {
    'XAU/USD':'TVC:GOLD',    'XAG/USD':'TVC:SILVER',
    'WTI/USD':'TVC:USOIL',   'BRENT/USD':'TVC:UKOIL',
    'XNG/USD':'TVC:NGAS',    'XPT/USD':'TVC:PLATINUM',
    'XPD/USD':'TVC:PALLADIUM','COPPER':'COMEX:HG1!',
    'WHEAT':'CBOT:ZW1!',     'CORN':'CBOT:ZC1!',
    'SOYBEAN':'CBOT:ZS1!',   'SUGAR':'ICEUS:SB1!',
    'COFFEE':'ICEUS:KC1!',   'COTTON':'ICEUS:CT1!',
  };
  if (commodityMap[id]) return commodityMap[id];

  // ── Indices ──────────────────────────────────────────────────────────────────
  const indexMap = {
    // US
    'SPX':'SP:SPX',          'IXIC':'NASDAQ:IXIC',       'DJI':'DJ:DJI',
    'NDX':'NASDAQ:NDX',      'RUT':'TVC:RUT',             'VIX':'TVC:VIX',
    'DXY':'TVC:DXY',         'TNX':'TVC:TNX',             'TYX':'TVC:TYX',
    // Europe
    'FTSE':'TVC:UKX',        'FTMC':'TVC:FTMC',           'DAX':'XETR:DAX',
    'CAC':'EURONEXT:PX1',    'IBEX':'TVC:IBEX',           'FTSEMIB':'TVC:FTSEMIB',
    'SMI':'TVC:SMI',         'AEX':'TVC:AEX',             'BEL20':'TVC:BEL20',
    'STOXX50':'TVC:SX5E',    'OMX':'OMXSTO:OMXS30',       'ATX':'TVC:ATX',
    'PSI20':'TVC:PSI20',     'WIG20':'TVC:WIG20',         'BUX':'TVC:BUX',
    'MOEX':'MOEX:IMOEX',     'ISE100':'BIST:XU100',       'TA35':'TVC:TA35',
    // Americas
    'GSPTSE':'TVC:TSX',      'BVSP':'TVC:IBOV',           'MXX':'TVC:IPC',
    'MERVAL':'TVC:MERVAL',   'IPSA':'TVC:IPSA',
    // Asia-Pacific
    'N225':'TVC:NI225',      'TOPIX':'TVC:TOPIX',         'HSI':'TVC:HSI',
    'SHCOMP':'SSE:000001',   'CSI300':'SSE:000300',        'SENSEX':'BSE:SENSEX',
    'NIFTY':'NSE:NIFTY',     'KOSPI':'KRX:KOSPI',         'TWII':'TWSE:TAIEX',
    'ASX200':'ASX:XJO',      'STI':'TVC:STI',             'KLCI':'TVC:KLCI',
    'JCI':'IDX:COMPOSITE',   'SET':'TVC:SET',             'PSEi':'TVC:PSEi',
    'NZ50':'NZX:NZ50',
    // Middle East & Africa
    'TADAWUL':'TVC:TASI',    'ADX':'TVC:FTFADGI',         'DFM':'TVC:DFMGI',
    'EGX30':'TVC:EGX30',     'JSE':'JSE:J200',            'NSE':'TVC:NGXASI',
    // Deriv Synthetics — use Deriv chart feed where available
    'R_10':'INDEX:VOLATILITY10', 'R_25':'INDEX:VOLATILITY25',
    'R_50':'INDEX:VOLATILITY50', 'R_75':'INDEX:VOLATILITY75',
    'R_100':'INDEX:VOLATILITY100',
  };
  if (indexMap[id]) return indexMap[id];

  // Deriv synthetic indices without a TV symbol — show a placeholder chart (SPX)
  const derivSynthetics = ['BOOM500','BOOM1000','CRASH500','CRASH1000',
    'STPFALL','JUMP10','JUMP25','JUMP50','JUMP75','JUMP100','DEX900UP','DEX900DN'];
  if (derivSynthetics.includes(id)) return 'SP:SPX'; // best available proxy

  // ── Stocks ────────────────────────────────────────────────────────────────────
  const nyse = ['JPM','BAC','GS','MS','WMT','XOM','CVX','KO','DIS','NKE','JNJ','PFE','V','MA','LLY'];
  if (nyse.includes(id)) return `NYSE:${id}`;
  // European stocks
  if (id === 'LVMH') return 'EURONEXT:MC';
  if (id === 'SAP')  return 'XETR:SAP';
  if (id === 'SHEL') return 'LSE:SHEL';
  if (id === 'NOVO-B') return 'CPH:NOVO_B';
  // Default NASDAQ
  return `NASDAQ:${id}`;
}

let tvWidget = null;
function loadTVChart(asset) {
  const container = document.getElementById('tradingview-widget');
  if (!container) return;
  container.innerHTML = '';

  const symbol = getTVSymbol(asset);
  const isMobile = isMobileLayout();

  if (!window.TradingView) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-family:var(--mono);font-size:0.75rem;letter-spacing:1px">LOADING CHART...</div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = () => {
      container.innerHTML = '';
      createTVWidget(symbol, isMobile);
    };
    script.onerror = () => {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-family:var(--mono);font-size:0.72rem;text-align:center;padding:20px">Chart unavailable.<br>Check your internet connection.</div>';
    };
    document.head.appendChild(script);
  } else {
    createTVWidget(symbol, isMobile);
  }
}

function createTVWidget(symbol, isMobile) {
  const container = document.getElementById('tradingview-widget');
  if (!container || !window.TradingView) return;
  container.innerHTML = '';

  const tvContainer = document.getElementById('tv-container');
  let w = tvContainer ? tvContainer.offsetWidth : 0;
  let h = tvContainer ? tvContainer.offsetHeight : 0;
  if (w < 10 || h < 10) {
    setTimeout(() => createTVWidget(symbol, isMobile), 100);
    return;
  }

  new window.TradingView.widget({
    container_id: 'tradingview-widget',
    symbol,
    interval: 'D',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    toolbar_bg: '#0d1520',
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    backgroundColor: '#080c12',
    gridColor: 'rgba(26,45,69,0.5)',
    allow_symbol_change: false,
    withdateranges: !isMobile,
    hide_side_toolbar: isMobile,
    studies: [],
    autosize: true,
  });

  // Draw alert lines after chart has had time to render
}

// Keep stubs so nothing else breaks
function generateChartData() {}
function drawChart() {}
function setTF() {}

// ═══════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════
// ── Toggle zone vs single price UI ───────────────
function onConditionChange() {
  const condition = document.getElementById('alert-condition').value;
  const isZone = condition === 'zone';
  const isTap  = condition === 'tap';
  document.getElementById('alert-single-row').style.display = isZone ? 'none' : '';
  document.getElementById('alert-zone-row').style.display   = isZone ? '' : 'none';
  document.getElementById('alert-tap-row').style.display    = isTap  ? '' : 'none';
  // Re-fill with current price for the newly selected condition type
  refreshSelectedAssetPanel();
}

async function createAlert() {
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

function renderAlerts() {
  const container = document.getElementById('alerts-list');
  const active = alerts.filter(a => a.status === 'active').length;
  document.getElementById('alert-count').textContent = alerts.length;
  document.getElementById('activeCount').textContent = active;
  document.getElementById('triggeredCount').textContent = triggeredToday;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 6C16.27 6 10 12.27 10 20v13L6 37h36l-4-4V20C38 12.27 31.73 6 24 6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none" opacity="0.4"/><path d="M19 38c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.4"/></svg></div><p>No alerts yet.<br>Select an asset and set a<br>price target to get started.</p></div>`;
    return;
  }

  container.innerHTML = '';
  [...alerts].reverse().forEach(alert => {
    const div = document.createElement('div');
    const isTriggered = alert.status === 'triggered';
    const dir = alert.triggeredDirection || alert.condition;

    if (isTriggered) {
      div.className = `alert-item triggered-${dir}`;
    } else {
      div.className = `alert-item active-alert`;
    }

    let badgeClass, badgeLabel;
    const isRepeatingZone  = alert.condition === 'zone' && (alert.repeatInterval || 0) > 0;
    const zoneInProgress   = isRepeatingZone && alert.zoneTriggeredOnce;
    // Check if price is currently inside the zone (live data)
    const currentLivePrice = priceData[alert.assetId]?.price || 0;
    const isCurrentlyInZone = alert.condition === 'zone' && currentLivePrice > 0
      && currentLivePrice >= alert.zoneLow && currentLivePrice <= alert.zoneHigh;

    if (isTriggered) {
      if (alert.condition === 'zone')      { badgeClass = 'badge-triggered-below'; badgeLabel = `${ALERT_ICONS.zone}TRIGGERED`; }
      else if (alert.condition === 'tap')  { badgeClass = 'badge-triggered-above'; badgeLabel = `${ALERT_ICONS.triggered}TAPPED`; }
      else                                 { badgeClass = `badge-triggered-${dir}`; badgeLabel = dir === 'above' ? `${ALERT_ICONS.above}TRIGGERED` : `${ALERT_ICONS.below}TRIGGERED`; }
    } else if (zoneInProgress && isCurrentlyInZone) {
      // Has fired before AND price is still inside
      badgeClass = 'badge-zone-active'; badgeLabel = `${ALERT_ICONS.inzone}IN ZONE`;
    } else if (zoneInProgress && !isCurrentlyInZone) {
      // Has fired before BUT price has since left — waiting for re-entry
      badgeClass = 'badge-zone-exited'; badgeLabel = `${ALERT_ICONS.zone}EXITED`;
    } else if (alert.status === 'paused') {
      badgeClass = 'badge-inactive'; badgeLabel = `${ALERT_ICONS.paused}PAUSED`;
    } else {
      badgeClass = 'badge-active'; badgeLabel = `${ALERT_ICONS.active}ACTIVE`;
    }

    const triggeredLine = isTriggered
      ? `<span style="color:${dir === 'above' || alert.condition === 'tap' ? 'var(--green)' : 'var(--red)'}">
           Hit ${formatPrice(alert.triggeredPrice, alert.assetId)} at ${alert.triggeredAt}
         </span><br>`
      : (zoneInProgress && isCurrentlyInZone)
        ? `<span style="color:var(--accent);font-size:0.78rem;">Price inside zone · alerting every ${alert.repeatInterval}m</span><br>`
      : (zoneInProgress && !isCurrentlyInZone)
        ? `<span style="color:var(--red);font-size:0.78rem;">Price exited zone · watching for re-entry</span><br>`
      : '';

    // Detail line — all condition types
    let detailLine;
    if (alert.condition === 'zone') {
      detailLine = `<strong>${ALERT_ICONS.zone}ZONE</strong> ${formatPrice(alert.zoneLow, alert.assetId)} – ${formatPrice(alert.zoneHigh, alert.assetId)}${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}${alert.repeatInterval ? ` <span style="opacity:0.6;font-size:0.75em">· every ${alert.repeatInterval}m</span>` : ''}`;
    } else if (alert.condition === 'tap') {
      detailLine = `<strong>${ALERT_ICONS.tap}TAP LEVEL</strong> ${formatPrice(alert.targetPrice, alert.assetId)} <span style="opacity:0.6;font-size:0.75em">· ±${alert.tapTolerance}% tolerance</span>${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}`;

    } else {
      detailLine = `<strong>${alert.condition === 'above' ? ALERT_ICONS.above + 'ABOVE' : ALERT_ICONS.below + 'BELOW'}</strong> ${formatPrice(alert.targetPrice, alert.assetId)}${alert.timeframe ? ` <span style="opacity:0.6;font-size:0.75em">· ${alert.timeframe}</span>` : ''}`;
    }

    const isRepeat      = (alert.condition === 'zone' || alert.condition === 'tap') && (alert.repeatInterval || 0) > 0;
    const hasEverFired  = !!alert.zoneTriggeredOnce || !!alert.tapTriggeredOnce || alert.status === 'triggered';
    const btnDelete     = `<button class="alert-action-btn delete" onclick="deleteAlert('${alert.id}')">${SVG_DELETE}DELETE</button>`;
    const btnDismiss    = `<button class="alert-action-btn dismiss" onclick="dismissAlert('${alert.id}')">${SVG_DISMISS}DISMISS</button>`;
    const btnPause      = alert.status === 'paused'
      ? `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${SVG_RESUME}RESUME</button>`
      : `<button class="alert-action-btn toggle" onclick="toggleAlert('${alert.id}')">${SVG_PAUSE}PAUSE</button>`;

    // PAUSE: shown on any active alert that has never fired yet
    // DISMISS: shown once alert has triggered at least once (repeating or not)
    const actions = isTriggered || (isRepeat && hasEverFired)
      ? btnDismiss + btnDelete
      : btnPause   + btnDelete;

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

  // Update mobile alert badge dot — only for active (waiting) alerts
  const dot = document.getElementById('alert-dot');
  if (dot) dot.classList.toggle('show', alerts.some(a => a.status === 'active'));
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
  document.getElementById('alerts-list').style.display    = tab === 'active'  ? '' : 'none';
  document.getElementById('alerts-history').style.display = tab === 'history' ? '' : 'none';
  document.getElementById('atab-active').classList.toggle('active',  tab === 'active');
  document.getElementById('atab-history').classList.toggle('active', tab === 'history');
  if (tab === 'history') renderHistory();
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

  // Deriv synthetic indices trade 24/7 — always open
  const derivSynthetics = ['R_10','R_25','R_50','R_75','R_100',
    'BOOM500','BOOM1000','CRASH500','CRASH1000','STPFALL',
    'JUMP10','JUMP25','JUMP50','JUMP75','JUMP100','DEX900UP','DEX900DN'];
  if (derivSynthetics.includes(assetId)) return true;

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
    alert.triggeredAt    = new Date().toLocaleTimeString();
    alert.triggeredPrice = currentPrice;
    triggeredToday++;

    if (!isZone || (alert.repeatInterval || 0) === 0) {
      updateAlert(alert.id, {
        status:          'triggered',
        triggered_at:    alert.triggeredAt,
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
let audioCtx = null;
let soundEnabled = true;
let selectedAlertSound = 'chime';

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
let notifEnabled = false;
let swRegistration = null;

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
const TELEGRAM_WORKER_URL = 'https://telegram-worker.meet-tyla.workers.dev';
let telegramEnabled = false;
let telegramChatId  = localStorage.getItem('tg_chat_id') || '';
let telegramUserName = '';

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
    sendTelegram('🔔 <b>TradeWatch Connected!</b>\n\nYour alerts are live. You\'ll get notified here the moment a price target is hit.\n\n<i>Stay sharp. 📊</i>');
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
  const ok = await sendTelegram('✅ <b>Test Successful!</b>\n\nTradeWatch is connected and ready to fire alerts.\n\n<i>You\'re all set. 🎯</i>');
  if (ok) {
    setTgStatus('✓ Message sent! Check your Telegram.', 'ok');
  } else {
    setTgStatus('✗ Failed. Please try again.', 'err');
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

function tgTime() {
  // Use exact UTC offset from the device clock — avoids DST/locale string mismatches
  const now        = new Date();
  const offsetMins = -now.getTimezoneOffset(); // e.g. +60 for UTC+1
  const adjusted   = new Date(now.getTime() + (offsetMins - now.getTimezoneOffset() * -1) * 60000);
  // Simpler: just format with the device's own locale — guaranteed to match what user sees
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function tgAlertMessage(type, symbol, condition, targetPrice, currentPrice, assetId, note, timeframe, zoneLow, zoneHigh, repeatInterval, tapTolerance) {
  const isZone  = condition === 'zone';
  const isAbove = condition === 'above';
  const isTap   = condition === 'tap';
  const time    = tgTime();

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
  return [header, ``, subtitle, ``, ...rows, ``, `<i>Watching the markets for you 👀</i>`].join('\n');
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
const ASSET_LIBRARY = ALL_ASSETS;


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
    const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', etf:'ETFs' };
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
  const catOrder = ['crypto','stocks','forex','commodities','indices','etf'];
  const catLabels = { crypto:'Crypto', stocks:'Stocks', forex:'Forex', commodities:'Commodities', indices:'Indices', etf:'ETFs' };

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
  renderHotList();
  renderWatchlist();
  refreshSelectedAssetPanel();
  checkAlerts();
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}, 8000);

// REST refresh every 60 seconds — CoinGecko + OANDA snapshot (Deriv WS covers the rest)
// Deriv WebSocket handles intraday ticks; REST fills OHLC + catches up after reconnects
setInterval(() => {
  fetchAllPrices();
  // Re-subscribe to any assets added since last connect
  if (derivReady) {
    getDerivSymbols().forEach(sym => {
      if (derivWs?.readyState === WebSocket.OPEN) {
        derivWs.send(JSON.stringify({ ticks: sym, subscribe: 1 }));
      }
    });
  } else {
    connectDeriv(); // attempt reconnect if ws dropped
  }
}, 60 * 1000);

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
async function init() {
  // Push initial history state so Android back button is interceptable from the start
  window.history.replaceState({ twTab: 'watchlist' }, '', '');

  await getOrCreateUser(currentTelegramId);

  const prefs = await loadPreferencesFromDB();
  const isTelegramApp = !!window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

  if (isTelegramApp) {
    soundEnabled = prefs?.sound_enabled ?? true;
    // Always update timezone offset — ensures EF always has the current accurate offset
    savePreferencesDB({
      telegram_chat_id: telegramChatId,
      telegram_enabled: true,
      sound_enabled:    soundEnabled,
      timezone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
      utc_offset_mins:  -new Date().getTimezoneOffset(),
    });
    // Silent connection — no nag toast
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

  // Connect Deriv WebSocket for real-time ticks (forex, commodities, synthetics)
  connectDeriv();

  // Initial REST fetch — CoinGecko + OANDA snapshot (Deriv WS already running)
  await fetchAllPrices();
  setStatusPill(true);

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
    connectDeriv(); // reconnect WS if it dropped while tab was hidden
    if (isMobileLayout()) mobileTab(navStack[navStack.length-1], false);
  }
});

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

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (!isMobileLayout()) return;
    if (document.getElementById('add-modal').style.display !== 'none') return;
    if (document.getElementById('tg-modal').style.display !== 'none') return;

    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Must be mostly horizontal and at least 60px
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx > 0) {
      // Swipe RIGHT → go back
      goBack();
    } else {
      // Swipe LEFT → go forward contextually
      const current = navStack[navStack.length - 1];
      if (current === 'watchlist' && selectedAsset) {
        mobileTab('chart');
      } else if (current === 'chart') {
        mobileTab('alerts');
      }
    }
  }, { passive: true });
})();

init();
