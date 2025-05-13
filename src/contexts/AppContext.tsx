
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
  // encryptFileContent is now mostly internal to addFile/updateFile or called directly with a key
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderIdInternal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedFolders = localStorage.getItem('secureStashFolders');
      if (storedFolders) setFolders(JSON.parse(storedFolders));
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
      contentVal = ""; // Clear raw content if encrypted
    } else if (restOfFileData.isEncrypted && !encryptionPassword) {
      // Handle case where isEncrypted is true but no password provided - perhaps treat as not encrypted or throw error
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
        const contentToProcess = newContent !== undefined ? newContent : (isActuallyEncrypted ? "" : file.content); // If becoming encrypted, newContent is source. If staying unencrypted, newContent or old content.

        if (isActuallyEncrypted) {
          const keyToUse = newEncryptionPassword !== undefined ? newEncryptionPassword : file.encryptionPassword;
          if (!keyToUse) {
            console.error("Cannot encrypt file without a password during update.");
            // Potentially revert isEncrypted or keep as is but without content
             updatedFile.isEncrypted = false; // Revert to unencrypted if no key
             updatedFile.content = contentToProcess;
             updatedFile.encryptedContent = undefined;
             updatedFile.encryptionPassword = undefined;
          } else {
            updatedFile.encryptedContent = encryptText(contentToProcess, keyToUse);
            updatedFile.content = ""; // Clear raw content
            updatedFile.isEncrypted = true;
            updatedFile.encryptionPassword = keyToUse; // Store the key used
          }
        } else { // File is to be unencrypted
          updatedFile.content = contentToProcess; // Should be plaintext already or from newContent
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
        // In a real app, you'd compare passwordAttempt with a stored hash or use it to derive a key.
        // For this demo, we're using the provided passwordAttempt directly if it matches file.encryptionPassword
        // or if file.encryptionPassword wasn't stored but passwordAttempt is given.
        // A better approach is to always require the passwordAttempt for decryption.
        // The stored file.encryptionPassword is a simplification for this demo.
        const keyToUse = file.encryptionPassword || passwordAttempt; // Fallback for older items. Ideally always passwordAttempt.
        
        // Simple direct comparison for demo; in real app, never store raw password.
        // This check implies passwordAttempt should be the same as stored, which isn't ideal UX.
        // Better: just try to decrypt with passwordAttempt.
        // if (file.encryptionPassword && file.encryptionPassword !== passwordAttempt) {
        //   return "[Decryption Failed - Incorrect password]";
        // }

        return decryptText(file.encryptedContent, passwordAttempt);
      } catch (e) {
        return "[Decryption Failed - Invalid password or corrupt data]";
      }
    }
    // Fallback for image/document placeholders if they were marked encrypted but logic path is unclear
    if (file.type === 'image' || file.type === 'document') {
        return file.content; 
    }
    return "[Encrypted - Content unavailable or error in decryption logic]";
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
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
