// Comprehensive Kenyan Finance Knowledge Base for RAG System
const kenyaFinanceKnowledgeBase = {
    // Money Market Funds (MMFs) in Kenya
    mmfs: {
        overview: `Money Market Funds in Kenya are collective investment schemes that pool money from many investors to invest in short-term, high-quality debt securities. They are regulated by the Capital Markets Authority (CMA) and offer daily liquidity with competitive returns typically higher than savings accounts.`,
        
        topFunds: {
            cic: {
                name: "CIC Money Market Fund",
                minimumInvestment: 1000,
                currentYield: "12-14%",
                features: "Daily liquidity, competitive returns, regulated by CMA",
                riskLevel: "Low to Medium"
            },
            zimele: {
                name: "Zimele Money Market Fund", 
                minimumInvestment: 1000,
                currentYield: "11-13%",
                features: "Stable returns, professional management, daily dealing",
                riskLevel: "Low to Medium"
            },
            icea: {
                name: "ICEA Lion Money Market Fund",
                minimumInvestment: 1000,
                currentYield: "12-15%",
                features: "High liquidity, competitive yields, experienced fund managers",
                riskLevel: "Low to Medium"
            },
            britam: {
                name: "Britam Money Market Fund",
                minimumInvestment: 1000,
                currentYield: "11-14%",
                features: "Capital preservation, income generation, daily liquidity",
                riskLevel: "Low"
            }
        },
        
        regulations: `Money Market Funds in Kenya are regulated by the Capital Markets Authority (CMA). They must maintain at least 20% of their assets in government securities, cannot invest more than 5% in a single issuer (except government), and must provide daily liquidity to investors.`,
        
        taxation: `Returns from MMFs in Kenya are subject to withholding tax of 15% for residents and 25% for non-residents. However, returns from government securities within the fund are tax-exempt.`,
        
        howToInvest: `To invest in Kenyan MMFs: 1) Choose a licensed fund manager, 2) Complete KYC requirements with ID and banking details, 3) Make minimum investment (usually KES 1,000), 4) Monitor performance through statements and online portals.`
    },

    // Nairobi Securities Exchange (NSE)
    stockMarket: {
        overview: `The Nairobi Securities Exchange (NSE) is Kenya's main stock exchange, trading equities, bonds, and derivatives. It operates under the Capital Markets Authority regulation and features blue-chip companies across various sectors.`,
        
        topStocks: {
            safaricom: {
                symbol: "SCOM",
                sector: "Telecommunications",
                marketCap: "~KES 1.2 trillion",
                description: "Leading telecommunications and fintech company, M-Pesa operator"
            },
            equity: {
                symbol: "EQTY", 
                sector: "Banking",
                marketCap: "~KES 400 billion",
                description: "Pan-African banking group with strong digital presence"
            },
            kcb: {
                symbol: "KCB",
                sector: "Banking", 
                marketCap: "~KES 300 billion",
                description: "Largest bank in East Africa by assets"
            },
            eabl: {
                symbol: "EABL",
                sector: "Consumer Goods",
                marketCap: "~KES 200 billion", 
                description: "Leading alcoholic beverages manufacturer"
            },
            bamburi: {
                symbol: "BMBC",
                sector: "Construction",
                marketCap: "~KES 50 billion",
                description: "Major cement and building materials company"
            }
        },

        sectors: {
            banking: "KCB, Equity, Co-op Bank, Standard Chartered, NCBA",
            telecommunications: "Safaricom",
            manufacturing: "EABL, BAT Kenya, Bamburi Cement",
            retail: "Naivas, TPS Eastern Africa",
            energy: "KenGen, Kenya Power, Total Kenya",
            insurance: "Jubilee Holdings, Liberty Kenya, CIC Insurance"
        },

        tradingHours: "9:00 AM to 3:00 PM, Monday to Friday",
        minBrokerage: "Typically 1.3% for retail investors, with minimum fees varying by broker"
    },

    // Banking in Kenya
    banking: {
        overview: `Kenya's banking sector is regulated by the Central Bank of Kenya (CBK). It consists of commercial banks, microfinance institutions, and digital lenders, with strong mobile banking penetration.`,
        
        centralBankRate: "12.75% (as of 2024) - affects lending and deposit rates across the sector",
        
        topBanks: {
            kcb: {
                name: "KCB Bank Kenya",
                assets: "~KES 1.2 trillion",
                branches: "250+ branches",
                services: "Corporate, retail, investment banking, mobile banking"
            },
            equity: {
                name: "Equity Bank Kenya", 
                assets: "~KES 900 billion",
                branches: "190+ branches",
                services: "Digital banking, SME lending, microfinance, Equitel"
            },
            cooperative: {
                name: "Co-operative Bank of Kenya",
                assets: "~KES 650 billion", 
                branches: "140+ branches",
                services: "Cooperative banking, MCo-op Cash, corporate banking"
            }
        },

        mobileMoneyServices: {
            mpesa: "Safaricom's M-Pesa - 30+ million users, mobile payments, savings, loans",
            airtelMoney: "Airtel Money - mobile wallet and payment services",
            tkash: "Telkom's T-Kash - mobile money and payment platform"
        },

        lendingRates: "Commercial banks typically charge 14-20% for personal loans, 12-16% for secured loans, based on CBK rate and risk assessment",
        
        depositRates: "Savings accounts: 3-6%, Fixed deposits: 8-12%, Money market accounts: 6-10%"
    },

    // Government Securities 
    governmentSecurities: {
        treasuryBills: {
            description: "Short-term government securities with 91-day, 182-day, and 364-day maturities",
            currentRates: "91-day: ~15%, 182-day: ~15.5%, 364-day: ~16%",
            minimumInvestment: "KES 100,000",
            taxation: "Tax-exempt for individuals"
        },
        
        treasuryBonds: {
            description: "Long-term government securities with 2-30 year maturities",
            currentRates: "10-year: ~16.5%, 20-year: ~17%", 
            minimumInvestment: "KES 50,000",
            taxation: "Tax-exempt for individuals",
            tradability: "Can be traded on secondary market through NSE"
        },

        infrastructureBonds: {
            description: "Special bonds for infrastructure projects with tax benefits",
            features: "Tax-exempt, 5-25 year maturities, competitive rates",
            examples: "IFB1, IFB2 series for various infrastructure projects"
        }
    },

    // Insurance in Kenya
    insurance: {
        overview: `Kenya's insurance sector is regulated by the Insurance Regulatory Authority (IRA). It includes life, general, health, and micro-insurance products with growing digital distribution.`,
        
        lifeInsurance: {
            leaders: "Jubilee Insurance, Old Mutual, Liberty Life, CIC Life",
            products: "Term life, whole life, endowment, unit-linked policies",
            premiumRange: "From KES 500/month for basic term life"
        },

        generalInsurance: {
            leaders: "Jubilee General, CIC General, APA Insurance, Britam General", 
            products: "Motor, property, travel, marine, professional indemnity",
            motorInsurance: "Third party: ~KES 5,000/year, Comprehensive: KES 15,000-50,000/year"
        },

        healthInsurance: {
            nhif: "National Hospital Insurance Fund - mandatory for employees",
            private: "AAR, Resolution Health, Jubilee Health, Madison Health",
            premiums: "Individual: KES 3,000-15,000/month, Family: KES 8,000-40,000/month"
        }
    },

    // Economic Indicators
    economicIndicators: {
        gdpGrowth: "5.5-6.0% projected for 2024-2025",
        inflationRate: "6.8% (within CBK target of 2.5-7.5%)",
        unemploymentRate: "~14.7% youth unemployment remains high",
        currentAccount: "Deficit of ~4.5% of GDP",
        publicDebt: "~68% of GDP, within sustainable levels but monitored closely"
    },

    // Investment Tips for Kenyan Market
    investmentTips: {
        beginner: "Start with money market funds or government securities for capital preservation and steady returns",
        intermediate: "Diversify into blue-chip stocks like Safaricom, Equity Bank, or balanced unit trusts",
        advanced: "Consider real estate investment trusts (REITs), infrastructure bonds, or direct equity investments",
        riskManagement: "Never invest more than you can afford to lose, diversify across asset classes and sectors"
    }
};

module.exports = kenyaFinanceKnowledgeBase;