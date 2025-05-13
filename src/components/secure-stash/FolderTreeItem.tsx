
"use client";
import React from 'react';
import type { FolderItem as FolderType } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Folder, FolderOpen, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FolderTreeItemProps {
  folder: FolderType;
  level: number;
  onSelectFolder: (folderId: string) => void;
  isSelected: boolean;
  toggleFolderOpen: () => void;
  isOpen: boolean;
  hasChildren: boolean;
}

export function FolderTreeItem({ folder, level, onSelectFolder, isSelected, toggleFolderOpen, isOpen, hasChildren }: FolderTreeItemProps) {
  const { deleteFolder, hasEncryptedFilesInFolderOrSubfolders } = useAppContext();

  const containsEncryptedFiles = hasEncryptedFilesInFolderOrSubfolders(folder.id);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (containsEncryptedFiles) {
      // This alert might be redundant if button is disabled, but good for clarity if somehow clicked
      alert("This folder cannot be deleted because it or one of its subfolders contains encrypted files. Please decrypt or move them first.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents? This action cannot be undone.`)) {
      deleteFolder(folder.id);
    }
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolderOpen();
  };

  const folderIcon = isOpen && isSelected ? <FolderOpen className="h-4 w-4 mr-2 shrink-0" /> : <Folder className="h-4 w-4 mr-2 shrink-0" />;
  // If selected and not open, it should still show FolderOpen if it's the current selected folder.
  // If it's not the current selected but is open (showing children), it should be FolderOpen.
  // Simplified: if open use FolderOpen, else Folder
  const effectiveFolderIcon = isOpen ? <FolderOpen className="h-4 w-4 mr-2 shrink-0" /> : <Folder className="h-4 w-4 mr-2 shrink-0" />;


  return (
    <div
      className={cn(
        "flex items-center justify-between group rounded-md text-sm font-medium",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
      )}
      style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
    >
       <Button
        variant="ghost"
        className="flex-grow justify-start h-9 px-2 py-1.5"
        onClick={() => onSelectFolder(folder.id)}
        title={folder.name}
      >
        <span className="flex items-center">
          {hasChildren ? (
            <button
              onClick={handleToggleOpen}
              className="mr-1 p-0.5 rounded hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={isOpen ? "Collapse folder" : "Expand folder"}
            >
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            </button>
          ) : (
            <span className="w-5 mr-1"></span> // Placeholder for alignment
          )}
          {effectiveFolderIcon}
          <span className="truncate">{folder.name}</span>
        </span>
      </Button>
      
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={handleDelete}
                disabled={containsEncryptedFiles}
                aria-label={containsEncryptedFiles ? "Cannot delete folder with encrypted files" : `Delete folder ${folder.name}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{containsEncryptedFiles ? "Folder or subfolders contain encrypted files" : `Delete ${folder.name}`}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
