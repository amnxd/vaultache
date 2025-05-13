
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
  folder: FolderType; // isOpen is already part of FolderType
  level: number;
  onSelectFolder: (folderId: string) => void;
  isSelected: boolean;
  toggleFolderOpen: () => void;
  isOpen: boolean;
  hasChildren: boolean;
}

export function FolderTreeItem({ folder, level, onSelectFolder, isSelected, toggleFolderOpen, isOpen, hasChildren }: FolderTreeItemProps) {
  const { deleteFolder } = useAppContext();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents? This action cannot be undone.`)) {
      deleteFolder(folder.id);
    }
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolderOpen();
  };

  const folderIcon = isSelected ? <FolderOpen className="h-4 w-4 mr-2 shrink-0" /> : <Folder className="h-4 w-4 mr-2 shrink-0" />;

  return (
    <div
      className={cn(
        "flex items-center justify-between group rounded-md text-sm font-medium",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
      )}
      style={{ paddingLeft: `${level * 1.5 + (hasChildren ? 0 : 1.5) + 0.5}rem` }} // Adjust paddingLeft if no children to align text
    >
       <Button
        variant="ghost"
        className="flex-grow justify-start h-9 px-2 py-1.5"
        onClick={() => onSelectFolder(folder.id)}
        title={folder.name}
      >
        <span className={cn("flex items-center", { "ml-[-1.5rem]": !hasChildren && level > -1})} style={{ marginLeft: !hasChildren && level > -1 ? `-${level === 0 ? 0: 1.5}rem` : '0rem'}}> 
        {/* This style is to shift text left if no toggle icon. Needs fine tuning.
            The goal is to align folder names if some have toggles and some don't at same level.
            A simpler approach might be to always reserve space for the icon, or use a different layout.
            For now, let's try this simple adjustment.
         */}
          {folderIcon}
          <span className="truncate">{folder.name}</span>
        </span>
      </Button>
      
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center shrink-0 gap-0.5">
          {hasChildren && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  onClick={handleToggleOpen}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isOpen ? "Collapse" : "Expand"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Delete {folder.name}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
