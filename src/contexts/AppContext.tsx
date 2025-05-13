
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
  updateFile: (fileId: string, updates: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId'>>) => void;
  updateFileTags: (fileId: string, tags: string[]) => void;
  deleteFile: (fileId: string) => void;
  deleteFolder: (folderId: string) => void;
  setEncryptionKey: (key: string) => void;
  setCurrentFolderId: (folderId: string | null) => void;
  getFilesForCurrentFolder: () => FileItem[];
  getSubfoldersForCurrentFolder: () => FolderItem[];
  getFolderPath: (folderId: string | null) => FolderItem[];
  decryptFileContent: (file: FileItem) => string;
  encryptFileContent: (content: string) => string | undefined;
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
    
    const newFile: FileItem = {
      ...fileData,
      id: crypto.randomUUID(),
      encryptedContent: fileData.isEncrypted && encryptionKey ? encryptText(fileData.content, encryptionKey) : undefined,
      content: fileData.isEncrypted && encryptionKey ? "" : fileData.content, 
      createdAt: now,
      updatedAt: now,
    };
    setFiles((prev) => [...prev, newFile]);
  }, [encryptionKey]);
  
  const updateFile = useCallback((fileId: string, updates: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId'>>) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId
          ? { ...file, ...updates, updatedAt: Date.now() }
          : file
      )
    );
  }, []);

  const updateFileTags = useCallback((fileId: string, tags: string[]) => {
    setFiles(prev => prev.map(f => f.id === fileId ? {...f, tags, updatedAt: Date.now()} : f));
  }, []);

  const deleteFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    let allFolderIdsToDelete: string[] = [folderId];
    let currentParentIds = [folderId];
    
    // Collect all descendant folder IDs
    // Note: `folders` here is the state from the closure, which is updated via dependencies.
    while (currentParentIds.length > 0) {
      const children = folders.filter(f => f.parentId !== null && currentParentIds.includes(f.parentId));
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) break;
      allFolderIdsToDelete = [...allFolderIdsToDelete, ...childIds];
      currentParentIds = childIds;
    }

    setFolders(prevFolders => prevFolders.filter(f => !allFolderIdsToDelete.includes(f.id)));
    
    setFiles(prevFiles => prevFiles.filter(f => {
      if (f.folderId === null) { // Always keep root files
        return true;
      }
      // For non-root files, keep them only if their folder is NOT being deleted.
      return !allFolderIdsToDelete.includes(f.folderId); 
    }));

    // If the currently viewed folder (or one of its children) was deleted, navigate to its parent or home.
    if (currentFolderId === folderId || (currentFolderId !== null && allFolderIdsToDelete.includes(currentFolderId))) {
      // `folders` in `find` refers to the state before this `deleteFolder` function was called (due to useCallback dependency)
      const originalFolder = folders.find(f => f.id === folderId); 
      setCurrentFolderIdInternal(originalFolder?.parentId || null);
    }
  }, [folders, currentFolderId, setFolders, setFiles, setCurrentFolderIdInternal]);


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
    if (file.type === 'image' || file.type === 'document') {
        // For placeholder images/documents, content is not the actual encrypted data but a URL/string
        // If it was intended to be encrypted, encryptedContent should hold it.
        // This branch handles viewing the placeholder content if not truly encrypted.
        return file.content; 
    }
    return "[Encrypted - Content unavailable]";
  }, [encryptionKey]);

  const encryptFileContent = useCallback((content: string): string | undefined => {
    if (!encryptionKey) return undefined; // Cannot encrypt without a key
    try {
      return encryptText(content, encryptionKey);
    } catch (e) {
      console.error("Encryption failed during explicit call:", e);
      return undefined; // Or handle error as appropriate
    }
  }, [encryptionKey]);

  return (
    <AppContext.Provider value={{
      folders,
      files,
      encryptionKey,
      currentFolderId,
      addFolder,
      addFile,
      updateFile,
      updateFileTags,
      deleteFile,
      deleteFolder,
      setEncryptionKey,
      setCurrentFolderId,
      getFilesForCurrentFolder,
      getSubfoldersForCurrentFolder,
      getFolderPath,
      decryptFileContent,
      encryptFileContent,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
