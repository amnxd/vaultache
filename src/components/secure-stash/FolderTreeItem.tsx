
"use client";
import React from 'react';
import type { FolderItem as FolderType } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Folder, FolderOpen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderTreeItemProps {
  folder: FolderType;
  level: number;
  onSelectFolder: (folderId: string) => void;
  isSelected: boolean;
}

export function FolderTreeItem({ folder, level, onSelectFolder, isSelected }: FolderTreeItemProps) {
  const { deleteFolder } = useAppContext();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent folder selection when deleting
    if (window.confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) {
      deleteFolder(folder.id);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between group rounded-md text-sm font-medium",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
      )}
      style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }} // Indentation
    >
      <Button
        variant="ghost"
        className="flex-grow justify-start h-9 px-2 py-1.5"
        onClick={() => onSelectFolder(folder.id)}
        title={folder.name}
      >
        {isSelected ? <FolderOpen className="h-4 w-4 mr-2 shrink-0" /> : <Folder className="h-4 w-4 mr-2 shrink-0" />}
        <span className="truncate">{folder.name}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 mr-1 shrink-0"
        onClick={handleDelete}
        title={`Delete ${folder.name}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
