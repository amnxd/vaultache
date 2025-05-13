
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { FolderItem, FileItem, FileType } from '@/lib/types';
import { encrypt as encryptText, decrypt as decryptText } from '@/lib/crypto';

interface AppContextType {
  folders: FolderItem[];
  files: FileItem[];
  currentFolderId: string | null;
  addFolder: (name: string, parentId: string | null) => void;
  addFile: (fileData: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt' | 'encryptedContent'> & { encryptionPassword?: string }) => void;
  updateFile: (fileId: string, updates: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId' | 'encryptedContent' | 'encryptionPassword'>> & { newContent?: string, newEncryptionPassword?: string, newIsEncrypted?: boolean }) => void;
  updateFileTags: (fileId: string, tags: string[]) => void;
  deleteFile: (fileId: string) => void;
  deleteFolder: (folderId: string) => void;
  setCurrentFolderId: (folderId: string | null) => void;
  getFilesForCurrentFolder: () => FileItem[];
  getSubfoldersForCurrentFolder: () => FolderItem[];
  getFolderPath: (folderId: string | null) => FolderItem[];
  decryptFileContent: (file: FileItem, passwordAttempt: string) => string;
  toggleFolderOpen: (folderId: string) => void; // Added for expand/collapse
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderIdInternal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedFolders = localStorage.getItem('secureStashFolders');
      if (storedFolders) {
        const parsedFolders: FolderItem[] = JSON.parse(storedFolders);
        // Ensure isOpen defaults to true for folders loaded from storage that might not have this property
        setFolders(parsedFolders.map(f => ({ ...f, isOpen: f.isOpen === undefined ? true : f.isOpen })));
      }
      const storedFiles = localStorage.getItem('secureStashFiles');
      if (storedFiles) setFiles(JSON.parse(storedFiles));
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

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

  const addFolder = useCallback((name: string, parentId: string | null) => {
    const newFolder: FolderItem = {
      id: crypto.randomUUID(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isOpen: true, // New folders are open by default
    };
    setFolders((prev) => [...prev, newFolder]);
  }, []);

  const addFile = useCallback((fileData: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt' | 'encryptedContent'> & { encryptionPassword?: string }) => {
    const now = Date.now();
    const { encryptionPassword, ...restOfFileData } = fileData;
    
    let encryptedContentVal: string | undefined = undefined;
    let contentVal = restOfFileData.content;

    if (restOfFileData.isEncrypted && encryptionPassword) {
      encryptedContentVal = encryptText(restOfFileData.content, encryptionPassword);
      contentVal = ""; 
    } else if (restOfFileData.isEncrypted && !encryptionPassword) {
      console.warn("File marked for encryption but no password provided. Storing as unencrypted.");
      restOfFileData.isEncrypted = false;
    }

    const newFile: FileItem = {
      ...restOfFileData,
      id: crypto.randomUUID(),
      content: contentVal,
      encryptedContent: encryptedContentVal,
      encryptionPassword: restOfFileData.isEncrypted ? encryptionPassword : undefined,
      createdAt: now,
      updatedAt: now,
    };
    setFiles((prev) => [...prev, newFile]);
  }, []);
  
  const updateFile = useCallback((fileId: string, updates: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId' | 'encryptedContent' | 'encryptionPassword'>> & { newContent?: string, newEncryptionPassword?: string, newIsEncrypted?: boolean }) => {
    setFiles(prevFiles =>
      prevFiles.map(file => {
        if (file.id !== fileId) return file;

        const { newContent, newEncryptionPassword, newIsEncrypted, ...otherUpdates } = updates;
        let updatedFile = { ...file, ...otherUpdates, updatedAt: Date.now() };

        const isActuallyEncrypted = newIsEncrypted !== undefined ? newIsEncrypted : file.isEncrypted;
        const contentToProcess = newContent !== undefined ? newContent : (isActuallyEncrypted ? "" : file.content); 

        if (isActuallyEncrypted) {
          const keyToUse = newEncryptionPassword !== undefined ? newEncryptionPassword : file.encryptionPassword;
          if (!keyToUse) {
            console.error("Cannot encrypt file without a password during update.");
             updatedFile.isEncrypted = false; 
             updatedFile.content = contentToProcess; 
             updatedFile.encryptedContent = undefined;
             updatedFile.encryptionPassword = undefined;
          } else {
            const sourceForEncryption = (newContent !== undefined) ? newContent :
                                       ( (file.type === 'image' || file.type === 'document' || file.type === 'video') ? file.content : contentToProcess );

            updatedFile.encryptedContent = encryptText(sourceForEncryption, keyToUse);
            updatedFile.content = (file.type === 'image' || file.type === 'document' || file.type === 'video') ? sourceForEncryption : "";
            updatedFile.isEncrypted = true;
            updatedFile.encryptionPassword = keyToUse; 
          }
        } else { 
          updatedFile.content = newContent !== undefined ? newContent : file.content;
          updatedFile.isEncrypted = false;
          updatedFile.encryptedContent = undefined;
          updatedFile.encryptionPassword = undefined;
        }
        return updatedFile;
      })
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
    
    while (currentParentIds.length > 0) {
      const children = folders.filter(f => f.parentId !== null && currentParentIds.includes(f.parentId));
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) break;
      allFolderIdsToDelete = [...allFolderIdsToDelete, ...childIds];
      currentParentIds = childIds;
    }

    setFolders(prevFolders => prevFolders.filter(f => !allFolderIdsToDelete.includes(f.id)));
    
    setFiles(prevFiles => prevFiles.filter(f => {
      if (f.folderId === null) {
        return true;
      }
      return !allFolderIdsToDelete.includes(f.folderId); 
    }));

    if (currentFolderId === folderId || (currentFolderId !== null && allFolderIdsToDelete.includes(currentFolderId))) {
      const originalFolder = folders.find(f => f.id === folderId); 
      setCurrentFolderIdInternal(originalFolder?.parentId || null);
    }
  }, [folders, currentFolderId]);


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

  const decryptFileContent = useCallback((file: FileItem, passwordAttempt: string): string => {
    if (!file.isEncrypted) {
      return file.content;
    }
    if (!passwordAttempt) {
      return "[Encrypted - Password not provided for decryption]";
    }
    if (file.encryptedContent) {
      try {
        return decryptText(file.encryptedContent, passwordAttempt);
      } catch (e) {
        return "[Decryption Failed - Invalid password or corrupt data]";
      }
    }
    if (file.type === 'image' || file.type === 'document' || file.type === 'video') {
        return file.content || "[Encrypted - Content data missing]";
    }
    return "[Encrypted - Content unavailable or error in decryption logic]";
  }, []);

  const toggleFolderOpen = useCallback((folderId: string) => {
    setFolders(prevFolders => 
      prevFolders.map(folder => 
        folder.id === folderId ? { ...folder, isOpen: !(folder.isOpen === undefined ? true : folder.isOpen) } : folder
      )
    );
  }, []);


  return (
    <AppContext.Provider value={{
      folders,
      files,
      currentFolderId,
      addFolder,
      addFile,
      updateFile,
      updateFileTags,
      deleteFile,
      deleteFolder,
      setCurrentFolderId,
      getFilesForCurrentFolder,
      getSubfoldersForCurrentFolder,
      getFolderPath,
      decryptFileContent,
      toggleFolderOpen, // Expose the new function
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
