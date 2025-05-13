
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const containsEncryptedFiles = hasEncryptedFilesInFolderOrSubfolders(folder.id);

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); // Important to prevent folder selection
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
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-no-select-folder="true"]')) {
              return;
            }
            onSelectFolder(folder.id);
          }}
          title={folder.name}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectFolder(folder.id); } }}
        >
          {/* Toggle Chevron Button */}
          {hasChildren ? (
            <button
              type="button"
              data-no-select-folder="true"
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
          <div className="flex items-center shrink-0 ml-1 pr-1" data-no-select-folder="true">
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      disabled={containsEncryptedFiles}
                      aria-label={containsEncryptedFiles ? "Cannot delete folder with encrypted files" : `Delete folder ${folder.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{containsEncryptedFiles ? "Folder or subfolders contain locked files" : `Delete ${folder.name}`}</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the folder "{folder.name}" and all its contents (files and subfolders).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder.id);
                      toast({ title: `Folder "${folder.name}" deleted successfully.` });
                    }}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Yes, delete folder
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TooltipProvider>
      </div>
    </>
  );
}
