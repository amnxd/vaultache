
"use client";
import React, { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Lock, Unlock, Tag, KeyRound } from 'lucide-react';
import Image from 'next/image';

interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function FilePreviewModal({ file, isOpen, setIsOpen }: FilePreviewModalProps) {
  const { decryptFileContent } = useAppContext();
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [displayedContent, setDisplayedContent] = useState('');
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isContentReady, setIsContentReady] = useState(false);


  useEffect(() => {
    if (isOpen && file) {
      if (!file.isEncrypted) {
        setDisplayedContent(file.content);
        setIsContentReady(true);
        setDecryptionError(null);
      } else {
        // For encrypted files, clear previous state, wait for password
        setDisplayedContent('');
        setIsContentReady(false);
        setDecryptionError(null); 
      }
      setPasswordAttempt(''); // Reset password field on open or file change
    } else if (!isOpen) {
        // Reset all state on close
        setDisplayedContent('');
        setPasswordAttempt('');
        setDecryptionError(null);
        setIsContentReady(false);
    }
  }, [isOpen, file]);

  const handleDecryptAndShow = () => {
    if (!file || !file.isEncrypted) return;
    if (!passwordAttempt) {
      setDecryptionError("Password is required to view encrypted content.");
      setIsContentReady(false);
      return;
    }

    const decrypted = decryptFileContent(file, passwordAttempt);
    
    if (decrypted.startsWith("[Decryption Failed") || decrypted.startsWith("[Encrypted -")) {
      setDisplayedContent('');
      setDecryptionError(decrypted);
      setIsContentReady(false);
    } else {
      setDisplayedContent(decrypted);
      setIsContentReady(true);
      setDecryptionError(null);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate flex items-center gap-2">
            {file.isEncrypted ? <Lock className="h-5 w-5 text-orange-500 shrink-0" /> : null}
            {file.name}
          </DialogTitle>
          <DialogDescription>
            Type: {file.type} | Created: {new Date(file.createdAt).toLocaleDateString()} | Updated: {new Date(file.updatedAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {file.isEncrypted && !isContentReady && (
          <div className="my-4 p-4 border border-dashed rounded-md space-y-2 bg-secondary/50">
            <Label htmlFor="previewPassword">Enter Password to View Content</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-grow">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="previewPassword"
                  type="password"
                  value={passwordAttempt}
                  onChange={(e) => {
                    setPasswordAttempt(e.target.value);
                    if (decryptionError) setDecryptionError(null); // Clear error on new input
                  }}
                  placeholder="File password"
                  className="pl-10"
                />
              </div>
              <Button onClick={handleDecryptAndShow} variant="outline" size="sm">
                <Unlock className="mr-2 h-4 w-4" /> View Content
              </Button>
            </div>
            {decryptionError && <p className="text-sm text-destructive mt-1 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/>{decryptionError}</p>}
          </div>
        )}

        <ScrollArea className="flex-grow p-1 pr-3 my-4 border rounded-md">
          <div className="p-4 min-h-[200px] whitespace-pre-wrap break-words">
            {isContentReady && (
              <>
                {file.type === 'text' && <p>{displayedContent}</p>}
                {file.type === 'link' && (
                  <a href={displayedContent} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {displayedContent}
                  </a>
                )}
                {file.type === 'image' && displayedContent && (
                  <Image 
                    src={displayedContent} // Use displayedContent which is URL for images
                    alt={file.name} 
                    width={400} 
                    height={300} 
                    className="rounded-md object-contain max-w-full mx-auto" 
                    data-ai-hint="placeholder image"
                  />
                )}
                {(file.type === 'document' || file.type === 'video') && <p className="text-muted-foreground">{displayedContent}</p>}
              </>
            )}
            {!isContentReady && file.isEncrypted && !decryptionError && (
              <p className="text-muted-foreground text-center py-8">Enter password above to view encrypted content.</p>
            )}
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
