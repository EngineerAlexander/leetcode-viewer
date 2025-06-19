import { Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ProblemExplorer from './components/ProblemExplorer';

interface Language {
  name: string;
  value: string;
  icon: string;
}

function App() {
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const response = await fetch('http://localhost:8000/languages');
      if (response.ok) {
        const data = await response.json();
        setLanguages(data);
        // Set default language to python if available, otherwise first available
        const pythonLang = data.find((lang: Language) => lang.value === 'python');
        if (pythonLang) {
          setSelectedLanguage('python');
        } else if (data.length > 0) {
          setSelectedLanguage(data[0].value);
        }
      } else {
        console.error('Failed to fetch languages');
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (language: string) => {
    console.log('Selected language:', language);
    setSelectedLanguage(language);
    setShowLanguagePopup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-800 dark:bg-stone-900 text-stone-200 dark:text-stone-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-800 dark:bg-stone-900 text-stone-200 dark:text-stone-100 flex flex-col">
      <nav className="bg-stone-900 dark:bg-black shadow-lg sticky top-0 z-50 relative">
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <button
            onClick={() => setShowLanguagePopup(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Change Language
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-center">
              <Link 
                to="/" 
                className="text-3xl font-bold text-white transition-colors"
              >
                LeetCode Viewer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Language Selection Popup */}
      {showLanguagePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-stone-700 dark:bg-stone-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-stone-100 dark:text-stone-50">Select Language</h2>
              <button
                onClick={() => setShowLanguagePopup(false)}
                className="text-stone-400 hover:text-stone-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((language) => (
                <button
                  key={language.value}
                  onClick={() => handleLanguageSelect(language.value)}
                  className="flex items-center p-3 bg-stone-600 dark:bg-stone-700 hover:bg-amber-500 hover:text-stone-900 rounded-md transition-colors duration-150"
                >
                  <span className="text-lg mr-2">{language.icon}</span>
                  <span className="font-medium">{language.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* flex-grow allows main to take up available space. flex is important for ProblemExplorer to fill height */}
      <main className="flex-grow w-full px-6 py-8 flex">
        <Routes>
          <Route path="/" element={<ProblemExplorer selectedLanguage={selectedLanguage} />} />
        </Routes>
      </main>

      <footer className="bg-stone-900 dark:bg-black text-center py-4 shadow-inner-top">
        <p className="text-sm text-stone-400 dark:text-stone-500">
          &copy; {new Date().getFullYear()} LeetCode Viewer. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App; 