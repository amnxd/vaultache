
"use client";
import React from 'react';
import type { FileItem as FileItemType } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileImage, FileArchive, Link as LinkIcon, Eye, Trash2, Lock, Tag, Pencil, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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

interface FileItemCardProps {
  file: FileItemType;
  onViewFile: (file: FileItemType) => void;
  onEditFile: (file: FileItemType) => void;
}

const FileTypeIcon: React.FC<{ type: FileItemType['type'], className?: string }> = ({ type, className }) => {
  const commonClass = cn("h-5 w-5", className); 
  switch (type) {
    case 'text':
      return <FileText className={commonClass} />;
    case 'image':
      return <FileImage className={commonClass} />;
    case 'document':
      return <FileArchive className={commonClass} />; 
    case 'link':
      return <LinkIcon className={commonClass} />;
    case 'video':
      return <Film className={commonClass} />;
    default:
      return <FileText className={commonClass} />;
  }
};

export function FileItemCard({ file, onViewFile, onEditFile }: FileItemCardProps) {
  const { deleteFile } = useAppContext();
  const { toast } = useToast();
  
  const displayDate = new Date(file.updatedAt).toLocaleDateString();

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 h-full">
      <CardHeader className="p-2 sm:p-3"> 
        <CardTitle className="flex items-center justify-between text-sm sm:text-base"> 
          <div className="flex items-center gap-1 sm:gap-2 truncate">
            <FileTypeIcon type={file.type} className="text-primary shrink-0 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate" title={file.name}>{file.name}</span>
          </div>
          {file.isEncrypted && (
            <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 shrink-0" title="Encrypted" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 flex-grow min-h-[50px] sm:min-h-[60px]"> 
        {file.type === 'image' && file.content && !file.isEncrypted && (
          <img 
            src={file.content} 
            alt={file.name} 
            className="w-full h-20 sm:h-24 object-cover rounded-md mb-2" 
            data-ai-hint="abstract design"
            onError={(e) => (e.currentTarget.style.display = 'none')} 
          />
        )}
        {file.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1 items-center">
             <Tag className="h-3 w-3 text-muted-foreground mr-1 shrink-0"/>
            {file.tags.slice(0, 2).map(tag => ( 
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">{tag}</Badge>
            ))}
            {file.tags.length > 2 && <Badge variant="outline" className="text-xs px-1 py-0.5">+{file.tags.length - 2}</Badge>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Updated: {displayDate}</p>
        {file.fileSize && <p className="text-xs text-muted-foreground">Size: {(file.fileSize / 1024).toFixed(2)} KB</p>}
      </CardContent>
      <CardFooter className="p-2 mt-auto flex items-center justify-end gap-1 sm:gap-1.5 bg-muted/30"> 
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                onClick={() => onViewFile(file)} 
                className="h-7 px-2 py-1 rounded"
              >
                <Eye className="h-4 w-4" /> 
                <span className="sr-only">View</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>View</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                onClick={() => onEditFile(file)} 
                className="h-7 px-2 py-1 rounded"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Edit</p>
            </TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructiveOutline" 
                    className="h-7 px-2 py-1 rounded"
                    disabled={file.isEncrypted}
                    title={file.isEncrypted ? "File is encrypted. Decrypt via Edit dialog to enable deletion." : `Delete file "${file.name}"`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{file.isEncrypted ? "Decrypt to enable delete" : "Delete file"}</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the file "{file.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteFile(file.id);
                    toast({ title: `File "${file.name}" deleted successfully.` });
                  }}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Yes, delete file
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
