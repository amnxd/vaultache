
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { FolderItem, FileItem, FileType } from '@/lib/types';
// crypto.ts is not used for content transformation anymore, but kept for potential other uses or if user wants actual crypto later.

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
  decryptFileContent: (file: FileItem, passwordAttempt: string) => string; // Conceptually: verifyPasswordAndGetContent
  toggleFolderOpen: (folderId: string) => void;
  hasEncryptedFilesInFolderOrSubfolders: (folderId: string) => boolean;
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
    
    let fileIsLocked = restOfFileData.isEncrypted;
    let passwordForLock = encryptionPassword;

    if (fileIsLocked && !passwordForLock) {
      console.warn("File marked as locked but no password provided. Storing as unlocked.");
      fileIsLocked = false;
      passwordForLock = undefined;
    }

    const newFile: FileItem = {
      ...restOfFileData,
      id: crypto.randomUUID(),
      content: restOfFileData.content, // Content is always stored as is
      isEncrypted: fileIsLocked, // Represents "locked" state
      encryptionPassword: passwordForLock, // Password to unlock
      encryptedContent: undefined, // Not used for content transformation in "locking" model
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

        // Update content if newContent is provided
        if (newContent !== undefined) {
          updatedFile.content = newContent;
        }

        const targetLockState = newIsEncrypted !== undefined ? newIsEncrypted : file.isEncrypted;

        if (targetLockState) { // File should be locked
          const passwordToUse = newEncryptionPassword !== undefined ? newEncryptionPassword : file.encryptionPassword;
          if (!passwordToUse) {
            console.error("Cannot lock file without a password during update. Keeping it unlocked.");
            updatedFile.isEncrypted = false;
            updatedFile.encryptionPassword = undefined;
          } else {
            updatedFile.isEncrypted = true;
            updatedFile.encryptionPassword = passwordToUse;
          }
        } else { // File should be unlocked
          updatedFile.isEncrypted = false;
          updatedFile.encryptionPassword = undefined;
        }
        
        updatedFile.encryptedContent = undefined; // Not used for content transformation

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
      if (f.folderId === null) return true;
      return !allFolderIdsToDelete.includes(f.folderId); 
    }));

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
    // This function now verifies password for "locked" files, rather than decrypting content.
    if (!file.isEncrypted) { // If not "locked"
      return file.content;
    }
    // File is "locked"
    if (!passwordAttempt) {
      return "[Locked - Password not provided]";
    }
    if (file.encryptionPassword && passwordAttempt === file.encryptionPassword) {
      return file.content; // Password matches, grant access to content
    }
    return "[Unlock Failed - Invalid password]";
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
        if (filesInThisFolder.some(file => file.isEncrypted)) { // Checks for "locked" files
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
      hasEncryptedFilesInFolderOrSubfolders,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
