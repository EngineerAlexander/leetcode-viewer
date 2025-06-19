import React from 'react';

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
}

interface FileNodeProps {
  node: TreeNode;
  onFileSelect: (filePath: string) => void;
  level?: number;
  expandedFolderPath: string | null;
  onFolderToggle: (folderPath: string) => void;
  selectedFolders: Set<string>;
  onFolderSelect: (folderPath: string, isSelected: boolean) => void;
}

const FolderIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <span className="mr-2 text-amber-500 dark:text-amber-400">{isOpen ? '📂' : '📁'}</span>
);

const FileNode: React.FC<FileNodeProps> = ({ 
  node, 
  onFileSelect, 
  level = 0, 
  expandedFolderPath, 
  onFolderToggle,
  selectedFolders,
  onFolderSelect
}) => {
  const isOpen = node.type === 'folder' && node.path === expandedFolderPath;
  const isSelected = node.type === 'folder' && selectedFolders.has(node.path);

  const handleToggle = () => {
    if (node.type === 'folder') {
      onFolderToggle(node.path);
    }
  };

  const handleFileClick = () => {
    if (node.type === 'file') {
      onFileSelect(node.path);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent folder toggle when clicking checkbox
    if (node.type === 'folder') {
      onFolderSelect(node.path, e.target.checked);
    }
  };

  const handleCustomCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder toggle when clicking checkbox
    if (node.type === 'folder') {
      onFolderSelect(node.path, !isSelected);
    }
  };

  const paddingLeftStyle = { paddingLeft: `${level * 0.75}rem` }; 

  return (
    <div className="my-0.5"> {/* Add small vertical margin between nodes */}
      <div 
        style={paddingLeftStyle}
        className={`flex items-center py-1.5 px-3 cursor-pointer hover:bg-stone-600 dark:hover:bg-stone-700/70 rounded-md transition-colors duration-150 ease-in-out group`}
        onClick={node.type === 'folder' ? handleToggle : handleFileClick}
      >
        {node.type === 'folder' && (
          <div 
            className={`mr-2 w-4 h-4 rounded border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
              isSelected 
                ? 'bg-amber-500 border-amber-500' 
                : 'bg-stone-700 border-stone-600 hover:border-amber-400'
            }`}
            onClick={handleCustomCheckboxClick}
          >
            {isSelected && (
              <svg 
                className="w-2.5 h-2.5 text-stone-900" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
            )}
          </div>
        )}
        {node.type === 'folder' ? (
          <FolderIcon isOpen={isOpen} />
        ) : (
          <span className="mr-2 text-stone-400 dark:text-stone-500 group-hover:text-stone-300">•</span>
        )}
        <span className="text-sm text-stone-100 dark:text-stone-50 group-hover:text-white truncate" title={node.name}>
          {node.name}
        </span>
      </div>
      {/* Children are rendered if the node is a folder and its path matches the expandedFolderPath */}
      {node.type === 'folder' && isOpen && node.children && (
        <div className="ml-2 pl-3.5 border-l-2 border-stone-500 dark:border-stone-600">
          {node.children.map(childNode => (
            <FileNode 
              key={childNode.path}
              node={childNode} 
              onFileSelect={onFileSelect} 
              level={level + 1} 
              expandedFolderPath={expandedFolderPath}
              onFolderToggle={onFolderToggle}
              selectedFolders={selectedFolders}
              onFolderSelect={onFolderSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileNode; 