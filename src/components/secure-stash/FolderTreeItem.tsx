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

  const effectiveFolderIcon = isOpen ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />;

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between group text-sm font-medium rounded-md"
        )}
        style={{ paddingLeft: `${level * 1.25}rem` }}
      >
        {/* Clickable area for folder selection & display (icon and name) */}
        <div
          className={cn(
            "flex-grow flex items-center h-9 px-2 py-1.5 rounded-md cursor-pointer truncate",
            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
          )}
          onClick={() => onSelectFolder(folder.id)}
          title={folder.name}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectFolder(folder.id); } }}
        >
          {/* Toggle Chevron Button */}
          {hasChildren ? (
            <button
              type="button"
              className="h-6 w-6 p-0.5 mr-1 shrink-0 rounded-md hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleToggleOpen}
              aria-label={isOpen ? "Collapse folder" : "Expand folder"}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6 mr-1 shrink-0"></span>
          )}

          {effectiveFolderIcon}
          <span className="truncate ml-2">{folder.name}</span>
        </div>

        {/* Delete Button (separate, at the end of the row) */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center shrink-0 ml-1 pr-1">
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
    </>
  );
}