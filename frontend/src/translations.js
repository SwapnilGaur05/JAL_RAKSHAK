export const translations = {
  en: {
    Overview: 'Overview',
    'Flood Risk': 'Flood Risk',
    'Citizen Reports': 'Citizen Reports',
    SOS: 'SOS',
    Alerts: 'Alerts',
    Rescue: 'Rescue',
    Shelters: 'Shelters',
    Rumours: 'Rumours',
    '2005 Replay': '2005 Replay',
    'Flood Control': 'Flood Control',
    'Mumbai · Command centre': 'Mumbai · Command centre',
    'Refresh data': 'Refresh data',
    'Wards': 'Wards',
    'High / critical': 'High / critical',
    'Rescue requests': 'Rescue requests',
    'Ward Flood Risk': 'Ward Flood Risk',
    'Submit Citizen Report': 'Submit Citizen Report',
    'SOS Dispatch Queue': 'SOS Dispatch Queue'
  },
  hi: {
    Overview: 'अवलोकन',
    'Flood Risk': 'बाढ़ का खतरा',
    'Citizen Reports': 'नागरिक रिपोर्ट',
    SOS: 'आपातकालीन सहायता',
    Alerts: 'चेतावनियाँ',
    Rescue: 'बचाव कार्य',
    Shelters: 'राहत शिविर',
    Rumours: 'अफवाहें',
    '2005 Replay': '2005 की बाढ़',
    'Flood Control': 'बाढ़ नियंत्रण',
    'Mumbai · Command centre': 'मुंबई · नियंत्रण केंद्र',
    'Refresh data': 'डेटा अपडेट करें',
    'Wards': 'वार्ड',
    'High / critical': 'उच्च / गंभीर',
    'Rescue requests': 'बचाव अनुरोध',
    'Ward Flood Risk': 'वार्ड में बाढ़ का खतरा',
    'Submit Citizen Report': 'नागरिक रिपोर्ट दर्ज करें',
    'SOS Dispatch Queue': 'आपातकालीन सहायता सूची'
  },
  mr: {
    Overview: 'आढावा',
    'Flood Risk': 'पूराचा धोका',
    'Citizen Reports': 'नागरिक अहवाल',
    SOS: 'आपत्कालीन मदत',
    Alerts: 'इशारे',
    Rescue: 'बचावकार्य',
    Shelters: 'निवारा केंद्रे',
    Rumours: 'अफवा',
    '2005 Replay': '२००५ चा पूर',
    'Flood Control': 'पूर नियंत्रण',
    'Mumbai · Command centre': 'मुंबई · नियंत्रण केंद्र',
    'Refresh data': 'माहिती अद्ययावत करा',
    'Wards': 'विभाग',
    'High / critical': 'उच्च / गंभीर',
    'Rescue requests': 'बचाव विनंत्या',
    'Ward Flood Risk': 'विभागातील पुराचा धोका',
    'Submit Citizen Report': 'नागरिक अहवाल नोंदवा',
    'SOS Dispatch Queue': 'आपत्कालीन मदत यादी'
  }
};

export function translate(language, key) {
  return translations[language]?.[key]
    ?? translations.en[key]
    ?? key;
}
