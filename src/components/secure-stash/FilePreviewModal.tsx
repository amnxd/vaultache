
"use client";
import React, { useMemo } from 'react';
import type { FileItem } from '@/lib/types';
import { useAppContext } from '@/hooks/useAppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Lock, Unlock, Tag } from 'lucide-react';
import Image from 'next/image';

interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function FilePreviewModal({ file, isOpen, setIsOpen }: FilePreviewModalProps) {
  const { decryptFileContent, encryptionKey } = useAppContext();

  const decryptedContent = useMemo(() => {
    if (!file) return '';
    return decryptFileContent(file);
  }, [file, decryptFileContent]);

  if (!file) return null;

  const isContentPotentiallyEncryptedMessage = decryptedContent.startsWith("[Encrypted") || decryptedContent.startsWith("[Decryption Failed");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate flex items-center gap-2">
            {file.isEncrypted ? (
              encryptionKey ? <Lock className="h-5 w-5 text-green-500 shrink-0" /> : <Unlock className="h-5 w-5 text-orange-500 shrink-0" />
            ) : null}
            {file.name}
          </DialogTitle>
          <DialogDescription>
            Type: {file.type} | Created: {new Date(file.createdAt).toLocaleDateString()} | Updated: {new Date(file.updatedAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow p-1 pr-3 my-4 border rounded-md">
          <div className="p-4 min-h-[200px] whitespace-pre-wrap break-words">
            {isContentPotentiallyEncryptedMessage && (
              <div className="my-4 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>{decryptedContent}</p>
              </div>
            )}
            {!isContentPotentiallyEncryptedMessage && file.type === 'text' && <p>{decryptedContent}</p>}
            {!isContentPotentiallyEncryptedMessage && file.type === 'link' && (
              <a href={decryptedContent} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                {decryptedContent}
              </a>
            )}
            {!isContentPotentiallyEncryptedMessage && file.type === 'image' && file.content && (
              <Image 
                src={file.content} 
                alt={file.name} 
                width={400} 
                height={300} 
                className="rounded-md object-contain max-w-full mx-auto" 
                data-ai-hint="placeholder image"
              />
            )}
             {!isContentPotentiallyEncryptedMessage && file.type === 'document' && <p className="text-muted-foreground">{decryptedContent}</p>}
          </div>
        </ScrollArea>

        {file.tags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1"><Tag className="h-4 w-4"/>Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {file.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
