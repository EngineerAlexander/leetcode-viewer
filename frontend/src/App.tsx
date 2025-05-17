import { Routes, Route, Link } from 'react-router-dom';
import ProblemExplorer from './components/ProblemExplorer';

function App() {
  return (
    <div className="min-h-screen bg-stone-800 dark:bg-stone-900 text-stone-200 dark:text-stone-100 flex flex-col">
      <nav className="bg-stone-900 dark:bg-black shadow-lg sticky top-0 z-50">
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

      {/* flex-grow allows main to take up available space. flex is important for ProblemExplorer to fill height */}
      <main className="flex-grow w-full px-6 py-8 flex">
        <Routes>
          <Route path="/" element={<ProblemExplorer />} />
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