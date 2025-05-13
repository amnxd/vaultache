
"use client";
import React, { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { FileItemCard } from './FileItemCard';
import { FilePreviewModal } from './FilePreviewModal';
import type { FileItem as FileItemType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilePlus2, Folder, Search as SearchIcon } from 'lucide-react';
import { AddFileDialog } from './AddFileDialog';
import { EditFileDialog } from './EditFileDialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function FileGrid() {
  const { getFilesForCurrentFolder, currentFolderId, getFolderPath, setCurrentFolderId } = useAppContext();
  const [selectedFile, setSelectedFile] = useState<FileItemType | null>(null);
  const [editingFile, setEditingFile] = useState<FileItemType | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [isEditFileOpen, setIsEditFileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filesInCurrentFolder = getFilesForCurrentFolder();
  const folderPath = getFolderPath(currentFolderId);
  const currentFolderName = folderPath.length > 0 ? folderPath[folderPath.length - 1].name : "Home";

  const filteredFiles = searchTerm.trim() === ''
  ? filesInCurrentFolder
  : filesInCurrentFolder.filter(file => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const nameMatch = file.name.toLowerCase().includes(lowerSearchTerm);
      const tagMatch = file.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm));
      return nameMatch || tagMatch;
    });


  const handleViewFile = (file: FileItemType) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
  };

  const handleEditFile = (file: FileItemType) => {
    setEditingFile(file);
    setIsEditFileOpen(true);
  };
  
  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-2 md:gap-4">
        {/* Left: Breadcrumbs and Title */}
        <div className="w-full md:w-auto md:flex-shrink-0 order-1 md:order-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={() => setCurrentFolderId(null)}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {index === folderPath.length - 1 ? (
                      <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href="#" onClick={() => setCurrentFolderId(folder.id)}>{folder.name}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="text-2xl font-semibold mt-1 flex items-center gap-2">
            <Folder className="h-6 w-6 text-primary" /> {currentFolderName}
          </h2>
        </div>

        {/* Middle: Search Bar */}
        <div className="w-full md:flex-1 md:max-w-lg md:mx-4 order-3 md:order-2 mt-4 md:mt-0">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search files by name or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>

        {/* Right: Add New File Button */}
        <div className="w-full md:w-auto md:flex-shrink-0 flex md:justify-end order-2 md:order-3">
          <Button onClick={() => setIsAddFileOpen(true)} className="w-full md:w-auto">
            <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
          </Button>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 sm:p-8 border-2 border-dashed border-muted rounded-lg">
          {searchTerm.trim() ? (
            <>
              <SearchIcon className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-muted-foreground mb-2">No files match your search</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Try a different search term or clear the search.
              </p>
            </>
          ) : (
            <>
              <FilePlus2 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-muted-foreground mb-2">No files here yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Click "Add New File" to get started.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 flex-grow overflow-y-auto">
          {filteredFiles.sort((a,b) => b.updatedAt - a.updatedAt).map(file => (
            <FileItemCard 
              key={file.id} 
              file={file} 
              onViewFile={handleViewFile}
              onEditFile={handleEditFile} 
            />
          ))}
        </div>
      )}

      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          isOpen={isPreviewOpen}
          setIsOpen={setIsPreviewOpen}
        />
      )}
      <AddFileDialog
        isOpen={isAddFileOpen}
        setIsOpen={setIsAddFileOpen}
      />
      {editingFile && (
        <EditFileDialog
          isOpen={isEditFileOpen}
          setIsOpen={setIsEditFileOpen}
          fileToEdit={editingFile}
        />
      )}
    </div>
  );
}

