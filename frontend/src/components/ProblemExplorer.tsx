import { useState, useEffect, useCallback } from 'react';
import FileNode from './FileNode';
import { buildFileTree } from '../utils/buildFileTree';
import RatingInput from './RatingInput';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SolutionFile {
  filename: string;
  rating: number | null;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  rating?: number | null;
  children?: TreeNode[];
}

interface RatingData {
  filename: string;
  rating: number;
}

interface FileContentData {
  description: string;
  code: string;
  complexity?: string;
  filename?: string;
  source_link?: string;
  youtube_link?: string;
}

interface ProblemExplorerProps {
  selectedLanguage: string;
}

const API_BASE_URL = 'http://localhost:8000';

// Helper function to format titles
const formatDisplayPath = (filePath: string | null, language: string) => {
  if (!filePath) return { mainTitle: '', groupTitle: '' };

  // Determine file extension based on language
  const fileExtensions = {
    "python": ".py",
    "typescript": ".ts",
    "c++": ".cpp",
    "rust": ".rs"
  };
  
  const extension = fileExtensions[language.toLowerCase() as keyof typeof fileExtensions] || ".py";
  const parts = filePath.replace(new RegExp(`\\${extension}$`), '').split('/');
  const fileNameRaw = parts.pop() || '';
  const groupPathRaw = parts.join(' ');

  const mainTitle = fileNameRaw.replace(/-/g, ' ').toUpperCase();
  const groupTitle = groupPathRaw.replace(/-/g, ' ').toUpperCase();

  return { mainTitle, groupTitle };
};

function ProblemExplorer({ selectedLanguage }: ProblemExplorerProps) {
  const [solutions, setSolutions] = useState<SolutionFile[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedFileRelativePath, setSelectedFileRelativePath] = useState<string | null>(null);
  const [selectedFileDescription, setSelectedFileDescription] = useState<string>('');
  const [selectedFileCode, setSelectedFileCode] = useState<string>('');
  const [selectedFileComplexity, setSelectedFileComplexity] = useState<string>('');
  const [selectedFileRating, setSelectedFileRating] = useState<number | null>(null);
  const [selectedFileSourceLink, setSelectedFileSourceLink] = useState<string | null>(null);
  const [selectedFileYoutubeLink, setSelectedFileYoutubeLink] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState<boolean>(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [expandedFolderPath, setExpandedFolderPath] = useState<string | null>(null);
  const [showProblemGroup, setShowProblemGroup] = useState<boolean>(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSolutionsList() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/solutions/${selectedLanguage}`);
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Solution List HTTP error! status: ${response.status} - ${errorData}`);
        }
        const data: SolutionFile[] = await response.json();
        setSolutions(data);
        setFileTree(buildFileTree(data));
        // Clear selected file when language changes
        setSelectedFileRelativePath(null);
        setSelectedFileDescription('');
        setSelectedFileCode('');
        setSelectedFileComplexity('');
        setSelectedFileRating(null);
        setSelectedFileSourceLink(null);
        setSelectedFileYoutubeLink(null);
      } catch (e: any) {
        console.error("Failed to fetch solutions list:", e);
        setError(e.message);
      }
      setLoading(false);
    }
    fetchSolutionsList();
  }, [selectedLanguage]);

  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!filePath) return;
    setSelectedFileRelativePath(filePath);
    setSelectedFileDescription('');
    setSelectedFileCode('');
    setSelectedFileComplexity('');
    setSelectedFileRating(null);
    setSelectedFileSourceLink(null);
    setSelectedFileYoutubeLink(null);
    setContentLoading(true);
    setContentError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/solutions/${selectedLanguage}/${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        let errorDetail = `File Content HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.error || JSON.stringify(errorData);
        } catch { 
            errorDetail = await response.text();
        }
        throw new Error(errorDetail);
      }
      const data: FileContentData = await response.json();
      setSelectedFileDescription(data.description || '// No description provided.');
      setSelectedFileCode(data.code || '// No code found or file is empty.');
      setSelectedFileComplexity(data.complexity || '');
      setSelectedFileSourceLink(data.source_link || null);
      setSelectedFileYoutubeLink(data.youtube_link || null);
      const originalSolution = solutions.find(s => s.filename === filePath);
      setSelectedFileRating(originalSolution?.rating || null);
    } catch (e: any) {
      console.error("Failed to fetch file content:", e);
      setContentError(e.message);
      setSelectedFileDescription(`// Error loading description: ${e.message}`);
      setSelectedFileCode(`// Error loading code: ${e.message}`);
      setSelectedFileComplexity(`// Error loading complexity: ${e.message}`);
      setSelectedFileSourceLink(null);
      setSelectedFileYoutubeLink(null);
    }
    setContentLoading(false);
  }, [solutions, selectedLanguage]);

  const handleRatingSubmitted = (newRatingData: RatingData) => {
    setSelectedFileRating(newRatingData.rating);
    const updatedSolutions = solutions.map(s => 
      s.filename === newRatingData.filename ? { ...s, rating: newRatingData.rating } : s
    );
    setSolutions(updatedSolutions);
    setFileTree(buildFileTree(updatedSolutions)); 
  };

  const handleRandomProblemSelect = () => {
    if (solutions.length === 0) return;

    // Filter solutions based on selected rating filter and folders
    let filteredSolutions = solutions;
    
    // Filter by rating
    if (selectedRatingFilter !== null) {
      filteredSolutions = filteredSolutions.filter(sol => sol.rating === selectedRatingFilter);
    }
    
    // Filter by selected folders
    if (selectedFolders.size > 0) {
      filteredSolutions = filteredSolutions.filter(sol => {
        const filePath = sol.filename;
        return Array.from(selectedFolders).some(folderPath => 
          filePath.startsWith(folderPath + '/') || filePath === folderPath
        );
      });
    }

    if (filteredSolutions.length === 0) return;

    const weightedSolutions = filteredSolutions.map(sol => ({
      ...sol,
      weight: sol.rating ? Math.max(1, sol.rating) : 5
    }));

    const totalWeight = weightedSolutions.reduce((sum, sol) => sum + sol.weight, 0);
    if (totalWeight === 0) return;

    let randomVal = Math.random() * totalWeight;
    let chosenSolution: SolutionFile | null = null;

    for (const sol of weightedSolutions) {
      randomVal -= sol.weight;
      if (randomVal <= 0) {
        chosenSolution = sol;
        break;
      }
    }

    if (chosenSolution) {
      handleFileSelect(chosenSolution.filename);
    }
  };

  const handleRatingFilterClick = (rating: number | null) => {
    setSelectedRatingFilter(prevRating => prevRating === rating ? null : rating);
  };

  const handleFolderSelect = (folderPath: string, isSelected: boolean) => {
    setSelectedFolders(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(folderPath);
      } else {
        newSet.delete(folderPath);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allFolders = new Set<string>();
    const collectFolders = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'folder') {
          allFolders.add(node.path);
          if (node.children) {
            collectFolders(node.children);
          }
        }
      });
    };
    collectFolders(fileTree);
    setSelectedFolders(allFolders);
  };

  const handleClearAll = () => {
    setSelectedFolders(new Set());
  };

  const handleFolderToggle = (folderPath: string) => {
    setExpandedFolderPath(prevPath => (prevPath === folderPath ? null : folderPath));
  };

  // Derive display titles
  const { mainTitle, groupTitle } = formatDisplayPath(selectedFileRelativePath, selectedLanguage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-stone-300">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500"></div>
        <p className="ml-4 text-xl">Loading solution explorer...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-700 border border-red-500 text-red-100 px-4 py-3 rounded-lg shadow-xl" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> Failed to initialize solution explorer.</span>
        <p className="text-sm mt-2">Details: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-6">
      <div className="w-80 h-full flex-shrink-0 p-6 bg-stone-700 dark:bg-stone-800 shadow-xl rounded-lg flex flex-col overflow-hidden">
        <div className="mb-4">
          <button
            onClick={handleRandomProblemSelect}
            className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-amber-400 dark:hover:bg-amber-500"
          >
            Pick Random Problem
          </button>
        </div>
        <div className="mb-4">
          <h3 className="text-sm font-medium text-stone-300 dark:text-stone-400 mb-2">Filter by Rating:</h3>
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingFilterClick(rating)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  selectedRatingFilter === rating
                    ? 'bg-amber-500 text-stone-900'
                    : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
                }`}
              >
                {rating}★
              </button>
            ))}
            <button
              onClick={() => handleRatingFilterClick(null)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                selectedRatingFilter === null
                  ? 'bg-amber-500 text-stone-900'
                  : 'bg-stone-600 text-stone-300 hover:bg-stone-500'
              }`}
            >
              All
            </button>
          </div>
        </div>
        <div className="mb-4">
          <h3 className="text-sm font-medium text-stone-300 dark:text-stone-400 mb-2">Folder Selection:</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-xs font-medium bg-amber-500 text-stone-900 rounded hover:bg-amber-600 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-xs font-medium bg-stone-600 text-stone-300 rounded hover:bg-stone-500 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-4 text-stone-100 dark:text-stone-50 border-b border-stone-600 dark:border-stone-700 pb-3">Problems</h2>
        <div className="overflow-y-auto flex-grow pr-2 scrollbar-thin scrollbar-thumb-stone-500 scrollbar-track-stone-700 dark:scrollbar-thumb-stone-600 dark:scrollbar-track-stone-800">
          {fileTree.length > 0 ? (
            fileTree.map(node => (
              <FileNode 
                key={node.path}
                node={node} 
                onFileSelect={handleFileSelect} 
                expandedFolderPath={expandedFolderPath}
                onFolderToggle={handleFolderToggle}
                selectedFolders={selectedFolders}
                onFolderSelect={handleFolderSelect}
              />
            ))
          ) : (
            <p className="text-stone-400 dark:text-stone-500 italic">No solution files found.</p>
          )}
        </div>
      </div>

      <div className="flex-grow p-0 flex flex-col overflow-hidden">
        {selectedFileRelativePath ? (
          <div className="bg-stone-700 dark:bg-stone-800 shadow-xl rounded-lg flex-grow flex flex-col max-h-full overflow-hidden">
            <div className="p-5 border-b border-stone-600 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-stone-100 dark:text-stone-50 break-all">{mainTitle}</h3>
                <div className="flex items-center">
                  {selectedFileSourceLink && (
                    <a
                      href={selectedFileSourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-3 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-300 hover:bg-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                    >
                      Open Problem Link
                    </a>
                  )}
                  {selectedFileYoutubeLink && (
                    <a
                      href={selectedFileYoutubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-3 px-3 py-1 text-xs font-medium text-red-700 bg-red-300 hover:bg-red-400 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                    >
                      Search YouTube
                    </a>
                  )}
                  {groupTitle && (
                    <button 
                      onClick={() => setShowProblemGroup(!showProblemGroup)}
                      className="ml-4 px-3 py-1 text-xs font-medium text-stone-300 bg-stone-600 hover:bg-stone-500 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400 transition-colors"
                    >
                      {showProblemGroup ? 'Hide Group' : 'Show Group'}
                    </button>
                  )}
                </div>
              </div>
              {showProblemGroup && groupTitle && (
                <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">GROUP: {groupTitle}</p>
              )}
              {contentLoading && <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">Loading content...</p>}
              {contentError && <p className="text-sm text-red-400 dark:text-red-300 mt-1">Error: {contentError}</p>}
            </div>
            
            <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-stone-500 scrollbar-track-stone-700 dark:scrollbar-thumb-stone-600 dark:scrollbar-track-stone-800">
              {selectedFileDescription && !contentLoading && !contentError && (
                <div className="p-5 border-b border-stone-600 dark:border-stone-700 bg-stone-600 dark:bg-stone-700/70">
                  <h4 className="text-lg font-semibold mb-3 text-stone-100 dark:text-stone-50">Problem Description:</h4>
                  <pre className="whitespace-pre-wrap text-sm text-stone-200 dark:text-stone-300 font-sans leading-relaxed">
                    {selectedFileDescription}
                  </pre>
                </div>
              )}

              <div className="bg-stone-800 dark:bg-black/40 flex-grow code-block-container">
                <SyntaxHighlighter
                  language={selectedLanguage === 'c++' ? 'cpp' : selectedLanguage}
                  style={vscDarkPlus}
                  PreTag="div"
                  className="h-full w-full text-sm p-5 leading-relaxed selection:bg-amber-300 selection:text-black scrollbar-thin scrollbar-thumb-stone-600 scrollbar-track-stone-800"
                  showLineNumbers={true}
                  wrapLines={true}
                  lineProps={{style: {wordBreak: 'break-all', whiteSpace: 'pre-wrap'}}}
                >
                  {selectedFileCode}
                </SyntaxHighlighter>
              </div>
              
              {selectedFileComplexity && !contentLoading && !contentError && (
                <div className="p-5 border-t border-stone-600 dark:border-stone-700 bg-stone-600 dark:bg-stone-700/70">
                  <h4 className="text-lg font-semibold mb-3 text-stone-100 dark:text-stone-50">Complexity Analysis:</h4>
                  <pre className="whitespace-pre-wrap text-sm text-stone-200 dark:text-stone-300 font-sans leading-relaxed">
                    {selectedFileComplexity}
                  </pre>
                </div>
              )}
              
              {!contentLoading && !contentError && selectedFileRelativePath && (
                <div className={`p-5 bg-stone-600 dark:bg-stone-700/70 ${selectedFileComplexity ? 'border-t' : ''} border-stone-600 dark:border-stone-700`}>
                  <h4 className="text-lg font-semibold mb-2 text-stone-100 dark:text-stone-50">How difficult was this problem?</h4>
                  <RatingInput 
                    filename={selectedFileRelativePath}
                    currentRating={selectedFileRating}
                    onRatingSubmitted={handleRatingSubmitted}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center bg-stone-700 dark:bg-stone-800 shadow-xl rounded-lg p-8">
            <svg className="w-24 h-24 text-stone-500 dark:text-stone-600 mb-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9.75 17L3 10.25V4.5h18v5.75L14.25 17M3 10.25l6.75 6.75M14.25 17l6.75-6.75M12 21.75V17M4.5 20.25h15" />
              <path d="M7.5 4.5V3m9 1.5V3" />
            </svg>
            <h3 className="text-2xl font-semibold text-stone-200 dark:text-stone-300 mb-2">Select a Problem</h3>
            <p className="text-stone-400 dark:text-stone-500">Choose a {selectedLanguage} file from the list on the left to view its content and rating.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemExplorer; 