
"use client";
import React, { useState } from 'react';
import { useAppContext } from '@/hooks/useAppContext';
import { FileItemCard } from './FileItemCard';
import { FilePreviewModal } from './FilePreviewModal';
import type { FileItem as FileItemType, FolderItem as FolderType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2, Folder, ArrowLeft } from 'lucide-react';
import { AddFileDialog } from './AddFileDialog';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);

  const files = getFilesForCurrentFolder();
  const folderPath = getFolderPath(currentFolderId);
  const currentFolderName = folderPath.length > 0 ? folderPath[folderPath.length - 1].name : "Home";

  const handleViewFile = (file: FileItemType) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
  };
  
  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
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
        <Button onClick={() => setIsAddFileOpen(true)}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-muted rounded-lg">
          <FilePlus2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground mb-2">No files here yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Add New File" to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 flex-grow overflow-y-auto">
          {files.sort((a,b) => b.updatedAt - a.updatedAt).map(file => (
            <FileItemCard key={file.id} file={file} onViewFile={handleViewFile} />
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
    </div>
  );
}
