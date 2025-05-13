
"use client";
import React from 'react';
import type { FileItem as FileItemType } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileImage, FileArchive, Link as LinkIcon, Eye, Trash2, Lock, Unlock, Tag, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileItemCardProps {
  file: FileItemType;
  onViewFile: (file: FileItemType) => void;
  onEditFile: (file: FileItemType) => void;
}

const FileTypeIcon: React.FC<{ type: FileItemType['type'], className?: string }> = ({ type, className }) => {
  const commonClass = cn("h-4 w-4", className); // Reduced icon size
  switch (type) {
    case 'text':
      return <FileText className={commonClass} />;
    case 'image':
      return <FileImage className={commonClass} />;
    case 'document':
      return <FileArchive className={commonClass} />; 
    case 'link':
      return <LinkIcon className={commonClass} />;
    default:
      return <FileText className={commonClass} />;
  }
};

export function FileItemCard({ file, onViewFile, onEditFile }: FileItemCardProps) {
  const { deleteFile, encryptionKey } = useAppContext();

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete file "${file.name}"?`)) {
      deleteFile(file.id);
    }
  };
  
  const displayDate = new Date(file.updatedAt).toLocaleDateString();

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="p-3"> {/* Reduced padding */}
        <CardTitle className="flex items-center justify-between text-base"> {/* Reduced font size */}
          <div className="flex items-center gap-2 truncate">
            <FileTypeIcon type={file.type} className="text-primary shrink-0" />
            <span className="truncate" title={file.name}>{file.name}</span>
          </div>
          {file.isEncrypted && (
            encryptionKey ? <Lock className="h-4 w-4 text-green-500 shrink-0" title="Encrypted" /> : <Unlock className="h-4 w-4 text-orange-500 shrink-0" title="Encrypted (Key Missing)" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-grow"> {/* Reduced padding */}
        {file.type === 'image' && file.content && (
          <img 
            src={file.content} 
            alt={file.name} 
            className="w-full h-28 object-cover rounded-md mb-2" // Reduced image height
            data-ai-hint="abstract design"
            onError={(e) => (e.currentTarget.style.display = 'none')} 
          />
        )}
        {file.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1 items-center">
             <Tag className="h-3 w-3 text-muted-foreground mr-1 shrink-0"/>
            {file.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {file.tags.length > 3 && <Badge variant="outline" className="text-xs">+{file.tags.length - 3}</Badge>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Updated: {displayDate}</p>
        {file.fileSize && <p className="text-xs text-muted-foreground">Size: {(file.fileSize / 1024).toFixed(2)} KB</p>}
      </CardContent>
      <CardFooter className="p-3 flex flex-wrap justify-end gap-1 bg-muted/30"> {/* Reduced padding and gap */}
        <Button 
          variant="outline" 
          onClick={() => onViewFile(file)} 
          className="h-8 px-2 text-xs rounded-md flex-1 min-w-[calc(33.33%-0.25rem)] sm:flex-none sm:min-w-0" // Adjusted button size and min-width for smaller gap
        >
          <Eye className="h-3.5 w-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">View</span> {/* Adjusted icon size and margin */}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => onEditFile(file)} 
          className="h-8 px-2 text-xs rounded-md flex-1 min-w-[calc(33.33%-0.25rem)] sm:flex-none sm:min-w-0" // Adjusted button size
        >
          <Pencil className="h-3.5 w-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Edit</span> {/* Adjusted icon size and margin */}
        </Button>
        <Button 
          variant="destructiveOutline" 
          onClick={handleDelete} 
          className="h-8 px-2 text-xs rounded-md flex-1 min-w-[calc(33.33%-0.25rem)] sm:flex-none sm:min-w-0" // Adjusted button size
        >
          <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Delete</span> {/* Adjusted icon size and margin */}
        </Button>
      </CardFooter>
    </Card>
  );
}

