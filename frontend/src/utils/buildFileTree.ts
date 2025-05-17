interface SolutionFile {
  filename: string;
  rating: number | null;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  rating?: number | null; // For files
  children?: TreeNode[]; // For folders
}

export const buildFileTree = (solutions: SolutionFile[]): TreeNode[] => {
  const rootNode: TreeNode = { name: 'root', type: 'folder', path: '', children: [] };

  solutions.forEach(solution => {
    const parts = solution.filename.split('/');
    let currentNode: TreeNode = rootNode;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let childNode = currentNode.children?.find(child => child.name === part && child.type === (isFile ? 'file' : 'folder'));

      if (!childNode) {
        if (isFile) {
          childNode = { 
            name: part, 
            type: 'file', 
            path: solution.filename, 
            rating: solution.rating 
          };
        } else {
          childNode = { 
            name: part, 
            type: 'folder', 
            path: parts.slice(0, index + 1).join('/'), 
            children: [] 
          };
        }
        if (!currentNode.children) {
          currentNode.children = [];
        }
        currentNode.children.push(childNode);
        // Sort children: folders first, then files, then alphabetically
        currentNode.children.sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          if (a.name && b.name) { // Add null checks for name if it can be undefined
            return a.name.localeCompare(b.name);
          }
          return 0;
        });
      }
      currentNode = childNode as TreeNode; 
    });
  });
  return rootNode.children || [];
}; 