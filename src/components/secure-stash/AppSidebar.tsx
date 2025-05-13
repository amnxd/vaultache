
"use client";
import React, { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { FolderTreeItem } from './FolderTreeItem';
import { CreateFolderDialog } from './CreateFolderDialog';
import { Button } from '@/components/ui/button';
import { FolderPlus, Home } from 'lucide-react';
import type { FolderItem as FolderType } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { folders, currentFolderId, setCurrentFolderId, toggleFolderOpen } = useAppContext();
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const renderFolders = (parentId: string | null, level: number): JSX.Element[] => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap(folder => {
        const isFolderOpen = folder.isOpen === undefined ? true : folder.isOpen;
        const hasChildren = folders.some(f => f.parentId === folder.id);
        const childrenElements = isFolderOpen && hasChildren ? renderFolders(folder.id, level + 1) : [];
        
        return [
          <FolderTreeItem
            key={folder.id}
            folder={folder}
            level={level}
            onSelectFolder={setCurrentFolderId}
            isSelected={currentFolderId === folder.id}
            toggleFolderOpen={() => toggleFolderOpen(folder.id)}
            isOpen={isFolderOpen}
            hasChildren={hasChildren}
          />,
          ...childrenElements
        ];
      });
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          onClick={() => setIsCreateFolderOpen(true)}
          className="w-full"
          variant="outline"
        >
          <FolderPlus className="mr-2 h-4 w-4" /> New Folder
        </Button>
      </div>
      <ScrollArea className="flex-grow p-2">
        <nav className="space-y-1">
           <Button
            variant="ghost"
            className={cn(
                "w-full justify-start h-9 px-2 py-1.5 text-sm font-medium",
                currentFolderId === null ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
            )}
            onClick={() => setCurrentFolderId(null)}
            title="Root Folder / Home"
            >
            <Home className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">Home</span>
          </Button>
          {renderFolders(null, 0)}
        </nav>
      </ScrollArea>
      <CreateFolderDialog
        isOpen={isCreateFolderOpen}
        setIsOpen={setIsCreateFolderOpen}
        parentId={currentFolderId}
      />
    </div>
  );
}
