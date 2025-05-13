
export type FileType = 'text' | 'image' | 'document' | 'link' | 'video';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  content: string; // Always stores the original content/URL/placeholder. Access is gated by isEncrypted.
  encryptedContent?: string; // Primarily for legacy or if actual crypto was used. With "locking", this might be unused for main content.
  encryptionPassword?: string; // Password to "unlock" the file if isEncrypted is true.
  tags: string[];
  folderId: string | null;
  createdAt: number;
  isEncrypted: boolean; // If true, file is "locked" and requires encryptionPassword to view/edit.
  fileSize?: number; // Optional: for display, not used for actual storage here
  updatedAt: number;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  isOpen?: boolean; // Added for expand/collapse state
}

