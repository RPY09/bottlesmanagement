import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const translations = {
  te: {
    Dashboard: 'డ్యాష్‌బోర్డ్',
    Orders: 'ఆర్డర్లు',
    Customers: 'కస్టమర్లు',
    Orders: 'ఆర్డర్లు',
    Payments: 'చెల్లింపులు',
    Expenses: 'ఖర్చులు',
    Reports: 'నివేదికలు',
    Settings: 'సెట్టింగ్స్',
    'Sign Out': 'సైన్ అవుట్',
    'Search anything...': 'ఏదైనా వెతకండి...',
    'Navigation Menu': 'నావిగేషన్ మెను',
    Notifications: 'నోటిఫికేషన్లు',
    'Good morning': 'శుభోదయం',
    'Good afternoon': 'శుభ మధ్యాహ్నం',
    'Good evening': 'శుభ సాయంత్రం',
    'Business Overview': 'వ్యాపార అవలోకనం',
    'Customer Management': 'కస్టమర్ నిర్వహణ',
    'Order Management': 'ఆర్డర్ నిర్వహణ',
    'Payment Transactions': 'చెల్లింపు లావాదేవీలు',
    'Expense Management': 'ఖర్చుల నిర్వహణ',
    'Business Reports': 'వ్యాపార నివేదికలు',
    'Payment Reminders': 'చెల్లింపు రిమైండర్లు',
    'Settings & Profile': 'సెట్టింగ్స్ & ప్రొఫైల్',
    'Manage product catalogue, pricing, and business credentials': 'ఉత్పత్తులు, ధరలు మరియు వ్యాపార వివరాలను నిర్వహించండి',
    'Products & Prices': 'ఉత్పత్తులు & ధరలు',
    'Personal Information': 'వ్యక్తిగత సమాచారం',
    'Business Information': 'వ్యాపార సమాచారం',
    Language: 'భాష',
    English: 'ఇంగ్లీష్',
    Telugu: 'తెలుగు',
    'Language preference': 'భాష ఎంపిక',
    'Choose the language for the application.': 'అప్లికేషన్ కోసం భాషను ఎంచుకోండి.',
    'Language updated': 'భాష నవీకరించబడింది',
    'Failed to update language': 'భాషను నవీకరించడం విఫలమైంది',
    'Dashboard failed to load': 'డ్యాష్‌బోర్డ్ లోడ్ కాలేదు',
    'Payment alerts': 'చెల్లింపు హెచ్చరికలు',
    Sales: 'అమ్మకాలు',
    Collected: 'సేకరించినది',
    Pending: 'బకాయి',
    'Operating costs': 'ఆపరేటింగ్ ఖర్చులు',
    'Net Cashflow': 'నికర నగదు ప్రవాహం',
    'Sales Trend': 'అమ్మకాల ధోరణి',
    'Daily revenue (last 30 days)': 'రోజువారీ ఆదాయం (గత 30 రోజులు)',
    'No sales data': 'అమ్మకాల సమాచారం లేదు',
    'Product Share': 'ఉత్పత్తి వాటా',
    'By case volume': 'కేసుల పరిమాణం ఆధారంగా',
    'No product data': 'ఉత్పత్తి సమాచారం లేదు',
    'Payment Collections': 'చెల్లింపు సేకరణలు',
    'Collected vs Outstanding': 'సేకరించినవి vs బకాయిలు',
    Rate: 'రేటు',
    'Orders Billed': 'బిల్లు చేసిన ఆర్డర్లు',
    'Top Customers': 'ముఖ్య కస్టమర్లు',
    'Pending Payment Dues': 'బకాయి చెల్లింపులు',
    'Total outstanding': 'మొత్తం బకాయి',
    'Recent Activity': 'ఇటీవలి కార్యకలాపాలు',
    'No recent orders': 'ఇటీవలి ఆర్డర్లు లేవు',
    'No recent payments': 'ఇటీవలి చెల్లింపులు లేవు',
    'No recent expenses': 'ఇటీవలి ఖర్చులు లేవు',
    'Close': 'మూసివేయి',
    'Send on WhatsApp': 'వాట్సాప్‌లో పంపు',
    'Payment Recorded!': 'చెల్లింపు నమోదు చేయబడింది!',
    'Customer': 'కస్టమర్',
    'Order ID': 'ఆర్డర్ ఐడి',
    'Payment Method': 'చెల్లింపు విధానం',
    'Reference ID': 'రిఫరెన్స్ ఐడి',
    'Remaining Balance': 'మిగిలిన బకాయి',
    'Fully Settled (₹0)': 'పూర్తిగా చెల్లించబడింది (₹0)',
    'Done': 'పూర్తయింది',
    'Record Payment': 'చెల్లింపు నమోదు చేయండి',
    'Total Billed': 'మొత్తం బిల్లు',
    'Already Paid': 'ఇప్పటికే చెల్లించినది',
    'Pending Due': 'చెల్లించాల్సిన బకాయి',
    'Payment Amount *': 'చెల్లింపు మొత్తం *',
    'Paying:': 'చెల్లిస్తున్నది:',
    'Remaining:': 'మిగిలినది:',
    'Cash': 'నగదు',
    'Bank': 'బ్యాంక్',
    'Cheque': 'చెక్కు',
    'Order Total': 'ఆర్డర్ మొత్తం',
    'Collect payment now': 'ఇప్పుడే చెల్లింపు సేకరించండి',
    'Create New Order': 'కొత్త ఆర్డర్ సృష్టించండి',
    'Edit Order': 'ఆర్డర్ సవరించండి',
    'Select customer and add products': 'కస్టమర్‌ను ఎంచుకుని ఉత్పత్తులను జోడించండి',
    'Update items, quantities & rates': 'వస్తువులు, పరిమాణాలు మరియు రేట్లను నవీకరించండి',
    'Select Customer': 'కస్టమర్‌ను ఎంచుకోండి',
    'Search directory or create new': 'శోధించండి లేదా కొత్తది సృష్టించండి',
    'Search by name, phone or address...': 'పేరు, ఫోన్ లేదా చిరునామాతో శోధించండి...',
    'No customers found': 'కస్టమర్లు కనుగొనబడలేదు',
    'Add New Customer': 'కొత్త కస్టమర్‌ను జోడించండి',
    'Loading customers...': 'కస్టమర్లను లోడ్ చేస్తోంది...',
    'Add Product': 'ఉత్పత్తిని జోడించండి',
    'Select from catalogue to add to order': 'ఆర్డర్‌కు జోడించడానికి కేటలాగ్‌ నుంచి ఎంచుకోండి',
    'Search by product name or size...': 'ఉత్పత్తి పేరు లేదా పరిమాణంతో శోధించండి...',
    'No products found': 'ఉత్పత్తులు కనుగొనబడలేదు',
    'In Order': 'ఆర్డర్‌లో ఉంది',
    'Cases': 'కేసులు',
    'Bottles': 'బాటిళ్లు',
    'Products': 'ఉత్పత్తులు',
    'Rate per case': 'కేసుకు రేటు',
    'Rate per bottle': 'బాటిల్‌కు రేటు',
    'Create Order': 'ఆర్డర్ సృష్టించండి',
    'Update Order': 'ఆర్డర్ నవీకరించండి',
    'Filter': 'ఫిల్టర్',
    'Filter Orders': 'ఆర్డర్లను ఫిల్టర్ చేయండి',
    'Reset All': 'అన్నీ రీసెట్ చేయండి',
    'Payment Status': 'చెల్లింపు స్థితి',
    'All Statuses': 'అన్ని స్థితులు',
    'Date Period': 'తేదీ వ్యవధి',
    'All Time': 'మొత్తం కాలం',
    'Month & Year': 'నెల & సంవత్సరం',
    'Date Range': 'తేదీ పరిధి',
    'Search orders...': 'ఆర్డర్లను శోధించండి...',
    'No orders found': 'ఆర్డర్లు కనుగొనబడలేదు',
    'Amount Paid': 'చెల్లించిన మొత్తం',
    'Balance Due': 'చెల్లించాల్సిన బకాయి',
    'Status': 'స్థితి',
    'Paid': 'చెల్లించబడింది',
    'Partially Paid': 'పాక్షికంగా చెల్లించబడింది',
    'Overdue': 'గడువు దాటింది',
    'Cancelled': 'రద్దు చేయబడింది',
    'Add': 'జోడించు',
    'Filter orders by payment status, month, year, or date range': 'చెల్లింపు స్థితి, నెల, సంవత్సరం లేదా తేదీ పరిధి ఆధారంగా ఆర్డర్లను ఫిల్టర్ చేయండి',
    'Previous Due': 'మునుపటి బకాయి',
    'Past Orders': 'గత ఆర్డర్లు',
    'Add delivery instructions, preferences or order notes...': 'డెలివరీ సూచనలు, ప్రాధాన్యతలు లేదా ఆర్డర్ గమనికలను జోడించండి...',
    'Search by customer or order #...': 'కస్టమర్ లేదా ఆర్డర్ నంబర్‌తో శోధించండి...',
    'Order #': 'ఆర్డర్ నంబర్',
    'Date': 'తేదీ',
    'Quantity': 'పరిమాణం',
    'Actions': 'చర్యలు',
    'No orders match your search or filter': 'మీ శోధన లేదా ఫిల్టర్‌కు సరిపోలే ఆర్డర్లు లేవు',
    'Pay Now': 'ఇప్పుడే చెల్లించండి',
    'Reminder': 'రిమైండర్',
    'Delete Order': 'ఆర్డర్ తొలగించండి',
    'Loading more orders...': 'మరిన్ని ఆర్డర్లను లోడ్ చేస్తోంది...',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [language, setLanguageState] = useState(() => user?.language || 'en');

  useEffect(() => {
    const nextLanguage = user?.language || 'en';
    setLanguageState(nextLanguage);
    document.documentElement.lang = nextLanguage === 'te' ? 'te' : 'en';
    document.documentElement.classList.toggle('language-telugu', nextLanguage === 'te');
  }, [user?.language]);

  const setLanguage = async (nextLanguage) => {
    if (nextLanguage === language) return;
    const previousLanguage = language;
    setLanguageState(nextLanguage);
    try {
      const { data } = await api.put('/auth/profile', { language: nextLanguage });
      updateUser({ ...user, ...data, language: nextLanguage });
    } catch (error) {
      setLanguageState(previousLanguage);
      throw error;
    }
  };

  const value = {
    language,
    setLanguage,
    t: (key) => translations[language]?.[key] || key,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
