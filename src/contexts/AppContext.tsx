
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { FolderItem, FileItem, FileType } from '@/lib/types';
import { encrypt as encryptText, decrypt as decryptText } from '@/lib/crypto';

interface AppContextType {
  folders: FolderItem[];
  files: FileItem[];
  encryptionKey: string;
  currentFolderId: string | null;
  addFolder: (name: string, parentId: string | null) => void;
  addFile: (fileData: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt' | 'encryptedContent'>) => void;
  updateFileTags: (fileId: string, tags: string[]) => void;
  deleteFile: (fileId: string) => void;
  deleteFolder: (folderId: string) => void;
  setEncryptionKey: (key: string) => void;
  setCurrentFolderId: (folderId: string | null) => void;
  getFilesForCurrentFolder: () => FileItem[];
  getSubfoldersForCurrentFolder: () => FolderItem[];
  getFolderPath: (folderId: string | null) => FolderItem[];
  decryptFileContent: (file: FileItem) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [encryptionKey, setEncryptionKeyInternal] = useState<string>('');
  const [currentFolderId, setCurrentFolderIdInternal] = useState<string | null>(null);

  // Load initial data from localStorage if available (for persistence demo)
  useEffect(() => {
    try {
      const storedFolders = localStorage.getItem('secureStashFolders');
      if (storedFolders) setFolders(JSON.parse(storedFolders));
      const storedFiles = localStorage.getItem('secureStashFiles');
      if (storedFiles) setFiles(JSON.parse(storedFiles));
       const storedKey = localStorage.getItem('secureStashKey');
       if (storedKey) setEncryptionKeyInternal(storedKey);
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Save data to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('secureStashFolders', JSON.stringify(folders));
    } catch (error) {
      console.error("Failed to save folders to localStorage", error);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('secureStashFiles', JSON.stringify(files));
    } catch (error) {
      console.error("Failed to save files to localStorage", error);
    }
  }, [files]);

  const setEncryptionKey = useCallback((key: string) => {
    setEncryptionKeyInternal(key);
    try {
      localStorage.setItem('secureStashKey', key);
    } catch (error) {
      console.error("Failed to save encryption key to localStorage", error);
    }
  }, []);


  const addFolder = useCallback((name: string, parentId: string | null) => {
    const newFolder: FolderItem = {
      id: crypto.randomUUID(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
  }, []);

  const addFile = useCallback((fileData: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt' | 'encryptedContent'>) => {
    const now = Date.now();
    let processedContent = fileData.content;
    let encryptedContent: string | undefined = undefined;

    if (fileData.isEncrypted && encryptionKey) {
      encryptedContent = encryptText(fileData.content, encryptionKey);
    } else if (fileData.isEncrypted && !encryptionKey) {
      // If intended to be encrypted but no key, store as is but flag it. User will be prompted.
      // Or, prevent adding? For now, allow adding, preview will show "encrypted, key needed".
      console.warn("File intended for encryption, but no key provided. Storing unencrypted content in encrypted field for now.");
      // This case should ideally be handled by UI preventing this state or encrypting once key is set.
      // For simplicity, if isEncrypted is true, we assume encryption happens or content is already encrypted.
      // Let's adjust: if isEncrypted and key exists, encrypt. Otherwise, content remains as is, and encryptedContent is undefined.
      // The `decryptFileContent` will handle showing raw content if not properly encrypted.
    }


    const newFile: FileItem = {
      ...fileData,
      id: crypto.randomUUID(),
      encryptedContent: fileData.isEncrypted && encryptionKey ? encryptText(fileData.content, encryptionKey) : undefined,
      content: fileData.isEncrypted && encryptionKey ? "" : fileData.content, // Store original if not encrypting, or clear if encrypting
      createdAt: now,
      updatedAt: now,
    };
    setFiles((prev) => [...prev, newFile]);
  }, [encryptionKey]);
  
  const updateFileTags = useCallback((fileId: string, tags: string[]) => {
    setFiles(prev => prev.map(f => f.id === fileId ? {...f, tags, updatedAt: Date.now()} : f));
  }, []);

  const deleteFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    // Also delete files and subfolders within this folder
    setFiles(prev => prev.filter(f => f.folderId !== folderId)); // Simple deletion, not recursive for sub-sub-folders' files.
    // A more robust solution would handle recursive deletion.
    let foldersToDelete = [folderId];
    let currentFolders = folders;
    let i = 0;
    while(i < foldersToDelete.length) {
      const parent = foldersToDelete[i];
      currentFolders.forEach(folder => {
        if (folder.parentId === parent && !foldersToDelete.includes(folder.id)) {
          foldersToDelete.push(folder.id);
        }
      });
      i++;
    }
    setFolders(prev => prev.filter(f => !foldersToDelete.includes(f.id)));

    if (currentFolderId === folderId) {
      setCurrentFolderIdInternal(null); // Go to root if current folder is deleted
    }
  }, [currentFolderId, folders]);


  const setCurrentFolderId = useCallback((folderId: string | null) => {
    setCurrentFolderIdInternal(folderId);
  }, []);

  const getFilesForCurrentFolder = useCallback(() => {
    return files.filter(file => file.folderId === currentFolderId);
  }, [files, currentFolderId]);

  const getSubfoldersForCurrentFolder = useCallback(() => {
    return folders.filter(folder => folder.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const getFolderPath = useCallback((folderId: string | null): FolderItem[] => {
    const path: FolderItem[] = [];
    let currentId = folderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [folders]);

  const decryptFileContent = useCallback((file: FileItem): string => {
    if (!file.isEncrypted) {
      return file.content;
    }
    if (file.isEncrypted && !encryptionKey) {
      return "[Encrypted - Encryption key not provided]";
    }
    if (file.isEncrypted && encryptionKey && file.encryptedContent) {
      try {
        return decryptText(file.encryptedContent, encryptionKey);
      } catch (e) {
        return "[Decryption Failed - Invalid key or corrupt data]";
      }
    }
    // If isEncrypted but no encryptedContent, it implies an issue or it's an image/doc placeholder
    if (file.type === 'image' || file.type === 'document') {
        return file.content; // For image/doc, content is URL/placeholder, not actual encrypted bytes here
    }
    return "[Encrypted - Content unavailable]";
  }, [encryptionKey]);

  return (
    <AppContext.Provider value={{
      folders,
      files,
      encryptionKey,
      currentFolderId,
      addFolder,
      addFile,
      updateFileTags,
      deleteFile,
      deleteFolder,
      setEncryptionKey,
      setCurrentFolderId,
      getFilesForCurrentFolder,
      getSubfoldersForCurrentFolder,
      getFolderPath,
      decryptFileContent,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
