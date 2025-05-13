
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
  const { decryptFileContent } = useAppContext(); // decryptFileContent now verifies password
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [displayedContent, setDisplayedContent] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null); // Was decryptionError
  const [isContentReady, setIsContentReady] = useState(false); // True if content is ready to be displayed (unlocked or not locked)


  useEffect(() => {
    if (isOpen && file) {
      if (!file.isEncrypted) { // If not "locked"
        setDisplayedContent(file.content);
        setIsContentReady(true);
        setUnlockError(null);
      } else { // File is "locked", wait for password
        setDisplayedContent('');
        setIsContentReady(false);
        setUnlockError(null); 
      }
      setPasswordAttempt(''); 
    } else if (!isOpen) {
        setDisplayedContent('');
        setPasswordAttempt('');
        setUnlockError(null);
        setIsContentReady(false);
    }
  }, [isOpen, file]);

  const handleUnlockAndShow = () => {
    if (!file || !file.isEncrypted) return; // Should not happen if UI is correct
    if (!passwordAttempt) {
      setUnlockError("Password is required to view locked content.");
      setIsContentReady(false);
      return;
    }

    // decryptFileContent now verifies password and returns original content if correct
    const unlockedContent = decryptFileContent(file, passwordAttempt); 
    
    if (unlockedContent.startsWith("[Locked -") || unlockedContent.startsWith("[Unlock Failed -")) {
      setDisplayedContent('');
      setUnlockError(unlockedContent);
      setIsContentReady(false);
    } else {
      setDisplayedContent(unlockedContent); // Original content
      setIsContentReady(true);
      setUnlockError(null);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate flex items-center gap-2">
            {file.isEncrypted ? <Lock className="h-5 w-5 text-orange-500 shrink-0" /> : null} {/* isEncrypted means "isLocked" */}
            {file.name}
          </DialogTitle>
          <DialogDescription>
            Type: {file.type} | Created: {new Date(file.createdAt).toLocaleDateString()} | Updated: {new Date(file.updatedAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {file.isEncrypted && !isContentReady && ( // If "locked" and content not yet "unlocked"
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
                    if (unlockError) setUnlockError(null); 
                  }}
                  placeholder="File password"
                  className="pl-10"
                />
              </div>
              <Button onClick={handleUnlockAndShow} variant="outline" size="sm">
                <Unlock className="mr-2 h-4 w-4" /> View Content
              </Button>
            </div>
            {unlockError && <p className="text-sm text-destructive mt-1 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/>{unlockError}</p>}
          </div>
        )}

        <ScrollArea className="flex-grow p-1 pr-3 my-4 border rounded-md">
          <div className="p-4 min-h-[200px] whitespace-pre-wrap break-words">
            {isContentReady && ( // Display content if "unlocked" or never "locked"
              <>
                {file.type === 'text' && <p>{displayedContent}</p>}
                {file.type === 'link' && (
                  <a href={displayedContent} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {displayedContent}
                  </a>
                )}
                {file.type === 'image' && displayedContent && (
                  <Image 
                    src={displayedContent} 
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
            {!isContentReady && file.isEncrypted && !unlockError && (
              <p className="text-muted-foreground text-center py-8">Enter password above to view locked content.</p>
            )}
             {!isContentReady && file.isEncrypted && unlockError && (
              <p className="text-destructive text-center py-8">{unlockError}</p>
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
