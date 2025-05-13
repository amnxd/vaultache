
export type FileType = 'text' | 'image' | 'document' | 'link' | 'video';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  content: string; // For text/link: actual content. For image: picsum URL. For document/video: placeholder text.
  encryptedContent?: string;
  encryptionPassword?: string; // Optional password for per-file encryption
  tags: string[];
  folderId: string | null;
  createdAt: number;
  isEncrypted: boolean;
  fileSize?: number; // Optional: for display, not used for actual storage here
  updatedAt: number;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

