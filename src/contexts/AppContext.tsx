
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
  toggleFolderOpen: (folderId: string) => void;
  hasEncryptedFilesInFolderOrSubfolders: (folderId: string) => boolean; // Added
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
      isOpen: true,
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
      contentVal = (fileData.type === 'image' || fileData.type === 'document' || fileData.type === 'video') ? restOfFileData.content : ""; 
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
        // Determine content to process based on newContent availability, otherwise use existing content.
        // If the file type preserves plaintext content even when encrypted (image/doc/video URLs), use that as base if newContent isn't provided for encryption.
        let contentToProcessForEncryption: string;
        if (newContent !== undefined) {
            contentToProcessForEncryption = newContent;
        } else if (file.type === 'image' || file.type === 'document' || file.type === 'video') {
            // For these types, the 'content' field holds the URL/placeholder even if encrypted.
            // If newContent isn't given, we re-encrypt the existing 'content'.
            contentToProcessForEncryption = file.content;
        } else {
            // For text/link, if not encrypted, content is in file.content.
            // If it was encrypted, file.content would be "", this case should be handled by requiring decryption first.
            // This branch implies we're encrypting existing plaintext from file.content.
            contentToProcessForEncryption = file.content;
        }


        if (isActuallyEncrypted) {
          const keyToUse = newEncryptionPassword !== undefined ? newEncryptionPassword : file.encryptionPassword;
          if (!keyToUse) {
            console.error("Cannot encrypt file without a password during update.");
             updatedFile.isEncrypted = false; 
             updatedFile.content = contentToProcessForEncryption; 
             updatedFile.encryptedContent = undefined;
             updatedFile.encryptionPassword = undefined;
          } else {
            updatedFile.encryptedContent = encryptText(contentToProcessForEncryption, keyToUse);
            // For image, doc, video, keep the URL/placeholder in 'content'. For others, clear it.
            updatedFile.content = (file.type === 'image' || file.type === 'document' || file.type === 'video') ? contentToProcessForEncryption : "";
            updatedFile.isEncrypted = true;
            updatedFile.encryptionPassword = keyToUse; 
          }
        } else { 
          // Decrypting: newContent should be the plaintext. If not provided, it means keeping existing decrypted content.
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
    
    // Recursively find all subfolder IDs
    const findSubfolderIds = (parentId: string): string[] => {
        let ids: string[] = [];
        const children = folders.filter(f => f.parentId === parentId);
        for (const child of children) {
            ids.push(child.id);
            ids = ids.concat(findSubfolderIds(child.id));
        }
        return ids;
    };
    allFolderIdsToDelete = allFolderIdsToDelete.concat(findSubfolderIds(folderId));

    setFolders(prevFolders => prevFolders.filter(f => !allFolderIdsToDelete.includes(f.id)));
    
    setFiles(prevFiles => prevFiles.filter(f => {
      if (f.folderId === null) return true; // Keep files in root if not explicitly deleted
      return !allFolderIdsToDelete.includes(f.folderId); 
    }));

    // If current folder or one of its ancestors was deleted, navigate to its parent or root
    if (currentFolderId !== null && allFolderIdsToDelete.includes(currentFolderId)) {
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
    // Fallback for encrypted image/doc/video where encryptedContent might not be primary store
    if (file.type === 'image' || file.type === 'document' || file.type === 'video') {
        if (file.encryptionPassword && passwordAttempt === file.encryptionPassword) {
             return file.content || "[Encrypted - Placeholder content, password correct]";
        }
        return "[Decryption Failed - Invalid password for placeholder file]";
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

  const hasEncryptedFilesInFolderOrSubfolders = useCallback((folderId: string): boolean => {
    const checkRecursively = (currentFolderId: string): boolean => {
        const filesInThisFolder = files.filter(file => file.folderId === currentFolderId);
        if (filesInThisFolder.some(file => file.isEncrypted)) {
            return true;
        }

        const subfoldersOfThisFolder = folders.filter(folder => folder.parentId === currentFolderId);
        for (const subfolder of subfoldersOfThisFolder) {
            if (checkRecursively(subfolder.id)) {
                return true;
            }
        }
        return false;
    };
    return checkRecursively(folderId);
  }, [files, folders]);


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
      toggleFolderOpen,
      hasEncryptedFilesInFolderOrSubfolders, // Expose the new function
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
