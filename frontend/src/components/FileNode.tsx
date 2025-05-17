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
}

const FolderIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <span className="mr-2 text-amber-500 dark:text-amber-400">{isOpen ? '📂' : '📁'}</span>
);

const FileNode: React.FC<FileNodeProps> = ({ node, onFileSelect, level = 0, expandedFolderPath, onFolderToggle }) => {
  const isOpen = node.type === 'folder' && node.path === expandedFolderPath;

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

  const paddingLeftStyle = { paddingLeft: `${level * 0.75}rem` }; 

  return (
    <div className="my-0.5"> {/* Add small vertical margin between nodes */}
      <div 
        style={paddingLeftStyle}
        className={`flex items-center py-1.5 px-3 cursor-pointer hover:bg-stone-600 dark:hover:bg-stone-700/70 rounded-md transition-colors duration-150 ease-in-out group`}
        onClick={node.type === 'folder' ? handleToggle : handleFileClick}
      >
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileNode; 