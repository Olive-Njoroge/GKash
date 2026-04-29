const kenyaFinanceCybersecurity = {
 
    pinAndPasswordSafety: {
        overview: "Protecting your PIN and passwords is the first line of defence in Kenyan mobile money and banking security.",
        rules: [
            "NEVER share your M-Pesa PIN, bank PIN, or OTP with anyone — including people claiming to be Safaricom or bank staff. Legitimate institutions never ask for your PIN.",
            "Change your M-Pesa PIN immediately if you suspect it has been compromised. Dial *234# > My Account > Change PIN.",
            "Use a unique PIN that is not your birth year, ID number, or phone number — these are the first combinations fraudsters try.",
            "Do not write your PIN on your phone case, wallet, or anywhere near your device.",
            "Enable your SIM PIN (separate from M-Pesa PIN) via phone Settings > Security so a stolen SIM cannot be used immediately.",
            "Use strong, unique passwords for banking apps and mobile money apps. A password manager like Bitwarden (free) can help.",
            "Enable biometric login (fingerprint/face) on your banking app as an additional layer of protection.",
        ],
        otpGuidance: "OTPs (One-Time Passwords) sent via SMS expire in minutes and are single-use. If someone calls asking you to read out an OTP you just received, hang up — this is always a scam.",
    },
 
    mpesaFraudAndScams: {
        overview: "M-Pesa fraud is the most prevalent financial scam in Kenya. Understanding the common tactics protects your money.",
 
        commonScams: {
            fakeMpesaMessages: {
                name: "Fake M-Pesa confirmation SMS",
                description: "Fraudster sends a counterfeit SMS that looks like an M-Pesa confirmation, claiming they sent money to you 'by mistake' and asking you to send it back. Always verify in your M-Pesa statement (*234# > My Account > Mini Statement) — if the money is not reflected there, you received nothing.",
                redFlags: ["Urgency and pressure to send back immediately", "Sender's number is not a Safaricom shortcode (e.g. not from MPESA)", "Message formatting slightly different from genuine Safaricom messages"],
                action: "Check your actual M-Pesa balance before any reversal. Report to Safaricom via 100 or safaricom.co.ke/contact-us."
            },
            simSwapFraud: {
                name: "SIM swap fraud",
                description: "Fraudster uses stolen personal details (ID number, phone number) to convince a Safaricom agent to transfer your number to a new SIM, then accesses your M-Pesa and bank accounts. Warning signs: your phone suddenly loses network for an extended period.",
                redFlags: ["Sudden loss of all network signal for more than 30 minutes", "Unable to make calls or receive SMS", "Receiving unexpected OTPs you did not request"],
                action: "Call Safaricom 100 immediately. Visit a Safaricom shop with your original ID to reclaim your number. Report to your bank to freeze any linked accounts.",
                prevention: "Limit personal information shared on social media. Use an M-Pesa PIN that is not derivable from your ID or birth date."
            },
            loanScams: {
                name: "Fake loan offers (advance fee fraud)",
                description: "Fraudsters pose as loan officers from 'KCB', 'Equity', or invented names offering large loans with no CRB check, but require a 'processing fee' or 'insurance payment' upfront. Legitimate lenders never charge upfront fees before disbursing a loan.",
                redFlags: ["Request for upfront payment before loan is disbursed", "No physical address or regulated status", "Pressure to pay within hours", "Contact via WhatsApp or personal phone number only"],
                action: "Verify lender registration at CBK (cbk.go.ke) or CMA (cma.or.ke). Never pay an upfront fee for a loan."
            },
            investmentScams: {
                name: "Fake investment schemes (Ponzi/pyramid)",
                description: "Schemes promising unusually high returns (e.g., 'double your money in 7 days', '30% monthly') that are unsustainable. They use early investors' money to pay initial returns, then collapse. Recent Kenyan examples have caused billions in losses.",
                redFlags: ["Guaranteed high returns with no risk", "Returns far above NSE, MMF, or T-bill rates", "Pressure to recruit others", "No CMA or CBK licence", "Anonymous promoters on WhatsApp groups"],
                action: "Verify investment licences at CMA Kenya (cma.or.ke/regulated-entities). If you suspect a scheme, report to CMA on 0722 207767 or report@cma.or.ke."
            },
            phoneCall_impersonation: {
                name: "Bank/Safaricom impersonation calls",
                description: "Caller claims to be from your bank or Safaricom, says your account is compromised, and asks for your PIN, OTP, or to transfer funds to a 'safe account'. Banks and Safaricom will never call and ask for your PIN or OTP.",
                redFlags: ["Caller asks for your PIN, OTP, or password", "Urgency — 'your account will be closed in 1 hour'", "Asks you to transfer to a different 'safe' account", "Caller ID can be spoofed to look genuine"],
                action: "Hang up immediately. Call your bank's official number (printed on your card or their website) directly. Do not call back a number the suspicious caller gave you."
            },
            phishingLinks: {
                name: "Phishing links via SMS/WhatsApp",
                description: "Messages with links claiming to be from Equity, KCB, or Safaricom directing you to fake login pages that harvest your credentials. Genuine Kenyan banks and Safaricom do not send login links via SMS or WhatsApp.",
                redFlags: ["Misspelled domain (e.g. 'equitybanke.com', 'safaricom-ke.net')", "Link shortened to hide the real URL", "Message creates urgency about account suspension", "WhatsApp messages from unknown numbers"],
                action: "Do not click. Forward the message to your bank's fraud line. Safaricom phishing can be reported to 100."
            },
            buyGoodsScam: {
                name: "M-Pesa Buy Goods/Paybill confusion",
                description: "Seller sets up a till or paybill number and asks you to pay. Confirm the business name displayed on your M-Pesa screen matches exactly who you intend to pay before confirming. Always check the confirmation prompt before entering your PIN.",
                redFlags: ["Business name on confirmation screen does not match the seller's claimed name", "Seller pressure to confirm quickly before you read the screen"],
                action: "Always read the full M-Pesa confirmation screen. Cancel and clarify if names do not match."
            }
        },
 
        reportingChannels: {
            safaricom: "Call 100 (Safaricom customer care) or *456# > Report Fraud",
            equityBank: "0763 000 000 or fraud@equitybank.co.ke",
            kcb: "0711 087 000 or cybersecurity@kcbgroup.com",
            police: "Report to Cybercrime Unit, DCI: 0800 722 203 (toll-free) or cybercrime@dci.go.ke",
            cma: "Capital Markets Authority: 0722 207767 or report@cma.or.ke (investment fraud)",
            cbk: "Central Bank of Kenya: csd@centralbank.go.ke (unlicensed financial services)",
        }
    },
 
    digitalBankingSafety: {
        overview: "Best practices for using Kenyan banking apps, internet banking, and USSD services securely.",
        mobileAppSafety: [
            "Only download banking apps from the official Google Play Store or Apple App Store. Search the bank name directly; do not follow links in SMS or WhatsApp.",
            "Keep your banking app updated — updates contain critical security patches.",
            "Do not use banking apps on rooted or jailbroken devices.",
            "Log out of your banking app after every session, especially on shared devices.",
            "Disable screen sharing and close all other apps when accessing your banking app.",
            "Turn off Bluetooth and public Wi-Fi before opening a banking app. Use mobile data (4G/5G) instead.",
        ],
        ussdSafety: [
            "When using USSD (*234# for M-Pesa), shield your screen from people around you.",
            "Never use USSD for banking in crowded matatus or markets where shoulder surfing is common.",
            "After completing a USSD session, ensure the session is fully closed before pocketing your phone.",
        ],
        publicWifiRisks: "Public Wi-Fi at hotels, coffee shops, and campuses in Nairobi can be intercepted. Avoid financial transactions on public Wi-Fi. If necessary, use a VPN (e.g., Proton VPN free tier).",
        deviceSecurity: [
            "Set a strong screen lock (PIN, password, or biometric) on your phone.",
            "Enable remote wipe on your device (Google Find My Device for Android, Find My iPhone for iOS) in case of theft.",
            "If your phone is stolen, immediately call Safaricom (100) to suspend your line and call your bank's 24-hour line to freeze your account.",
            "Regularly back up your phone so recovery is quick after loss.",
        ]
    },
 
    creditAndCRBSafety: {
        overview: "Protecting your credit profile and CRB (Credit Reference Bureau) record in Kenya.",
        creditProtection: [
            "Check your CRB status regularly via TransUnion Kenya (transunion.co.ke) or Metropol CRB (metropol.co.ke). First report per year is free.",
            "Never share your KRA PIN or National ID with unverified lenders — these are used to take out fraudulent loans in your name.",
            "If a fraudulent loan is taken in your name, report immediately to the lender and the relevant CRB to file a dispute.",
            "Fraudsters sometimes use stolen IDs to register fake SIM cards and take out mobile loans (Fuliza, KCB M-Pesa, Tala, etc.). Guard your ID.",
        ],
        mobileLoanSafety: [
            "Only use licensed mobile lenders. Check the CBK approved list at cbk.go.ke > Digital Credit Providers.",
            "Read the full terms before accepting a mobile loan — understand the interest rate (APR), not just the weekly or monthly rate.",
            "Repay on time to protect your CRB score. A negative CRB listing can block you from bank loans, mortgages, and even some jobs.",
        ]
    },
 
    onlineShoppingSafety: {
        overview: "Safe practices for online shopping and digital payments in Kenya.",
        bestPractices: [
            "Use established Kenyan e-commerce platforms (Jumia, Masoko) or verify seller credibility on social media before paying.",
            "Prefer M-Pesa Buy Goods or Paybill over direct bank transfers to strangers — M-Pesa offers some consumer protection.",
            "Be extremely cautious of sellers in Facebook Marketplace and WhatsApp groups demanding upfront payment with no verifiable business registration.",
            "Never pay a deposit for a rental (apartment, car, land) before physically viewing the property and verifying ownership documents with a lawyer.",
            "For large purchases, use an escrow arrangement or pay on delivery where possible.",
        ],
        fakeWebsites: "Fraudulent websites mimicking Kenyan brands use domains like '.net', '.org', or add words like '-ke', '-online', '-deals' to legitimate brand names. Always verify you are on the official website (check for https:// and the exact correct domain name)."
    },
 
    socialEngineeringDefence: {
        overview: "Social engineering exploits human trust rather than technical vulnerabilities. Recognising it protects you.",
        tactics: {
            urgency: "Creating panic — 'Your account will be closed in 2 hours unless you verify now.' Legitimate institutions give you time.",
            authority: "Impersonating CBK officials, DCI officers, or senior bank managers to demand immediate action.",
            sympathy: "Fake emergencies — 'I'm stuck at the hospital, can you send M-Pesa and I'll repay tomorrow?' Verify via a phone call to the person's known number.",
            lottery: "'You have won a Safaricom prize/Toyota/cash.' If you did not enter a competition, you cannot have won it. Safaricom prizes are announced publicly.",
            romance: "Long-distance online relationships that eventually request money transfers — very common on Facebook and Instagram targeting Kenyan users."
        },
        goldenRules: [
            "STOP — any pressure to act immediately is a red flag. Scams rely on panic.",
            "VERIFY — call the person or institution on a number you already know, not one they give you.",
            "PROTECT — never share PIN, OTP, password, or ID details regardless of who is asking.",
            "REPORT — report all suspected fraud; it protects other Kenyans too."
        ]
    },
 
    regulatoryAndLegalContext: {
        overview: "Key Kenyan laws and regulators that protect you in financial cybercrime.",
        laws: [
            "Computer Misuse and Cybercrimes Act 2018 — criminalises unauthorised access, data interception, and cyber fraud in Kenya.",
            "National Payment System Act — governs M-Pesa and mobile money, enforced by CBK.",
            "Consumer Protection Act 2012 — protects consumers including in financial services.",
            "Data Protection Act 2019 — your financial data must be handled lawfully by institutions.",
        ],
        regulators: {
            CBK: "Central Bank of Kenya — regulates banks, mobile money, and digital lenders. cbk.go.ke",
            CMA: "Capital Markets Authority — regulates investment products, stockbrokers, and fund managers. cma.or.ke",
            IRA: "Insurance Regulatory Authority — regulates all insurance products. ira.go.ke",
            CA: "Communications Authority — regulates Safaricom and other telecoms. ca.go.ke",
            DCI: "Directorate of Criminal Investigations, Cybercrime Unit — investigates financial cybercrime. dci.go.ke"
        }
    }
};
 
module.exports = kenyaFinanceCybersecurity;