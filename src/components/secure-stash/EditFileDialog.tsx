
"use client";
import React, { useState, useEffect, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Sparkles, Loader2, AlertTriangle, KeyRound, Unlock, Lock, Trash2 } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import type { FileType, FileItem } from '@/lib/types';
import { TagInput } from './TagInput';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { useToast } from '@/hooks/use-toast';
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

interface EditFileDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fileToEdit: FileItem | null;
}

export function EditFileDialog({ isOpen, setIsOpen, fileToEdit }: EditFileDialogProps) {
  const { updateFile, decryptFileContent, deleteFile } = useAppContext(); // decryptFileContent now verifies password
  const { toast } = useToast();

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [fileContent, setFileContent] = useState(''); // Holds plaintext content for editing if "unlocked"
  const [tags, setTags] = useState<string[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false); // Target "locked" state for saving
  const [currentEncryptionPassword, setCurrentEncryptionPassword] = useState(''); // For "unlocking" or setting new lock password
  
  const [isContentUnlocked, setIsContentUnlocked] = useState(false); // Was isContentDecrypted
  const [unlockError, setUnlockError] = useState<string | null>(null); // Was decryptionError

  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFileName('');
    setFileType('text');
    setFileContent('');
    setTags([]);
    setIsEncrypted(false);
    setCurrentEncryptionPassword('');
    setIsContentUnlocked(false);
    setUnlockError(null);
    setAiError(null);
  }, []);
  
  const loadInitialFileState = useCallback(() => {
    if (fileToEdit) {
      setFileName(fileToEdit.name);
      setFileType(fileToEdit.type);
      setIsEncrypted(fileToEdit.isEncrypted); // Current "locked" state
      setTags([...fileToEdit.tags]);

      if (!fileToEdit.isEncrypted) { // If not "locked"
        setFileContent(fileToEdit.content);
        setIsContentUnlocked(true);
        setUnlockError(null);
      } else { // File is "locked", content needs unlocking
        setFileContent(''); 
        setIsContentUnlocked(false);
      }
    }
  }, [fileToEdit]);


  useEffect(() => {
    if (isOpen && fileToEdit) {
      loadInitialFileState();
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, fileToEdit, loadInitialFileState, resetForm]);

  const handleUnlockForEditing = () => {
    if (!fileToEdit || !fileToEdit.isEncrypted) return;
    if (!currentEncryptionPassword) {
      setUnlockError("Password is required to unlock the file content.");
      return;
    }
    // decryptFileContent now verifies password and returns original content if correct
    const unlockedContent = decryptFileContent(fileToEdit, currentEncryptionPassword); 
    
    if (unlockedContent.startsWith("[Locked -") || unlockedContent.startsWith("[Unlock Failed -")) {
      setFileContent('');
      setIsContentUnlocked(false);
      setUnlockError(unlockedContent); 
    } else {
      setFileContent(unlockedContent); // Original content
      setIsContentUnlocked(true);
      setUnlockError(null);
      toast({ title: "Content unlocked for editing." });
    }
  };


  const handleSuggestTags = async () => {
     if (!isContentUnlocked || (fileType !== 'text' && fileType !== 'link') || !fileContent.trim()) {
      toast({
        title: "Cannot Suggest Tags",
        description: "Unlock content first. Tag suggestion is available for unlocked text or link files with content.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingTags(true);
    setAiError(null);
    try {
      const result = await suggestTags({ fileContent });
      if (result && result.tags) {
        const newTags = Array.from(new Set([...tags, ...result.tags]));
        setTags(newTags);
        toast({
          title: "Tags Suggested",
          description: `${result.tags.length} new tags suggested by AI.`,
        });
      }
    } catch (error) {
      console.error("AI Tag Suggestion Error:", error);
      setAiError("Failed to suggest tags. Please try again.");
      toast({
        title: "AI Error",
        description: "Could not suggest tags at this time.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToEdit) return;
    if (!fileName.trim()) {
      toast({ title: "File name is required.", variant: "destructive" });
      return;
    }

    if (isEncrypted && !currentEncryptionPassword.trim()) { // If target state is "locked"
      toast({ title: "Password is required to save as locked.", variant: "destructive" });
      return;
    }
    
    // If file was locked, and user wants to keep it locked OR change content,
    // they must have unlocked it or provided a (potentially new) password for the target locked state.
    if (fileToEdit.isEncrypted && !isContentUnlocked && isEncrypted && !currentEncryptionPassword.trim()){
      // This means it was locked, user didn't unlock, wants to save as locked, but didn't provide a password here.
      // This implies they want to use the old password, but we need it re-confirmed if content might change.
      // For simplicity now: if they are keeping it locked and didn't unlock, they must provide the password for saving.
      // This covers changing name/tags for a locked file without viewing content, or relocking with new password.
       toast({ title: "Password required to re-lock or modify a locked file.", variant: "destructive" });
       return;
    }


    const updatesForAppCtx: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId'>> & { newContent: string, newEncryptionPassword?: string, newIsEncrypted: boolean } = {
      name: fileName.trim(),
      tags,
      newContent: fileContent, // Always pass the current content from the form (which is plaintext if unlocked)
      newIsEncrypted: isEncrypted, // Target "locked" state
    };

    if (isEncrypted) { // If target state is "locked"
      updatesForAppCtx.newEncryptionPassword = currentEncryptionPassword;
    }
    
    updateFile(fileToEdit.id, updatesForAppCtx);
    toast({ title: `File "${updatesForAppCtx.name}" updated successfully.`});
    setIsOpen(false);
  };

  const handleDeleteFile = () => {
    if (!fileToEdit) return;
    if (fileToEdit.isEncrypted && !isContentUnlocked) {
        toast({ title: "Unlock file to delete", description: "Please unlock the file by providing its password before deleting.", variant: "destructive"});
        return;
    }
    deleteFile(fileToEdit.id);
    toast({ title: `File "${fileToEdit.name}" deleted successfully.` });
    setIsOpen(false);
  };

  const canSuggestTags = isContentUnlocked && (fileType === 'text' || fileType === 'link') && fileContent.trim().length > 0;
  const showContentFields = isContentUnlocked || !fileToEdit?.isEncrypted; // Show if unlocked or never was locked
  const requirePasswordForUnlocking = fileToEdit?.isEncrypted && !isContentUnlocked;


  if (!fileToEdit) return null;

  const isDeleteDisabled = fileToEdit.isEncrypted && !isContentUnlocked;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-6 w-6 text-primary" />
            Edit File: {fileToEdit.name}
          </DialogTitle>
          <DialogDescription>
            Update the details of your file. Provide password if changing lock state.
          </DialogDescription>
        </DialogHeader>

        {requirePasswordForUnlocking && (
          <div className="my-4 p-4 border border-dashed rounded-md space-y-2 bg-secondary/50">
            <Label htmlFor="unlockPassword">Enter Password to View/Edit Content</Label>
            <div className="flex items-center gap-2">
              <Input
                id="unlockPassword"
                type="password"
                value={currentEncryptionPassword}
                onChange={(e) => {
                  setCurrentEncryptionPassword(e.target.value);
                  if (unlockError) setUnlockError(null); 
                }}
                placeholder="Password to unlock"
                className="flex-grow"
              />
              <Button onClick={handleUnlockForEditing} variant="outline" size="sm">
                <Unlock className="mr-2 h-4 w-4" /> Unlock
              </Button>
            </div>
            {unlockError && <p className="text-sm text-destructive mt-1">{unlockError}</p>}
             <p className="text-xs text-muted-foreground">Original content is locked. Enter password to view and edit.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-4 p-2 md:p-4">
          <div>
            <Label htmlFor="editFileName">File Name</Label>
            <Input
              id="editFileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="editFileType">File Type</Label>
            <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)} disabled>
              <SelectTrigger id="editFileType" className="w-full mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">File type cannot be changed after creation.</p>
          </div>
          
          {showContentFields && (
            <>
              {(fileType === 'text' || fileType === 'link') && (
                <div>
                  <Label htmlFor="editFileContent">{fileType === 'text' ? 'Content' : 'Link URL'}</Label>
                  <Textarea id="editFileContent" value={fileContent} onChange={(e) => setFileContent(e.target.value)}
                    placeholder={fileType === 'text' ? 'Enter your text here...' : 'https://example.com'}
                    rows={fileType === 'text' ? 6 : 2} className="mt-1" />
                </div>
              )}
              {fileType === 'image' && (
                <div>
                  <Label htmlFor="editFileContent">Image URL</Label>
                  <Input id="editFileContent" value={fileContent} onChange={(e) => setFileContent(e.target.value)}
                    placeholder="https://picsum.photos/seed/example/400/300" className="mt-1" />
                </div>
              )}
              {(fileType === 'document' || fileType === 'video') && (
                <div>
                  <Label htmlFor="editFileContent">{fileType === 'document' ? 'Document Content (Placeholder)' : 'Video Content (Placeholder)'}</Label>
                  <Textarea id="editFileContent" value={fileContent} onChange={(e) => setFileContent(e.target.value)}
                    placeholder={`Placeholder ${fileType} content...`} rows={4} className="mt-1" />
                </div>
              )}
            </>
          )}
           {!showContentFields && fileToEdit.isEncrypted && ( // isEncrypted means "isLocked"
            <div className="p-3 my-2 border rounded-md bg-muted/20 text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4"/> Content is locked. Unlock above to edit.
            </div>
           )}


          <TagInput tags={tags} setTags={setTags} />
          
          {canSuggestTags && (
             <Button type="button" variant="outline" onClick={handleSuggestTags}
              disabled={isSuggestingTags || !fileContent.trim()} className="w-full mt-2">
              {isSuggestingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Suggest Tags with AI
            </Button>
          )}
          {aiError && <p className="text-sm text-destructive flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {aiError}</p>}

          <div className="space-y-2 mt-4 p-3 border rounded-md bg-muted/10">
            <div className="flex items-center space-x-2">
                <Checkbox id="editIsEncrypted" checked={isEncrypted} // isEncrypted means "isLocked"
                onCheckedChange={(checkedSt) => {
                    const newCheckedState = Boolean(checkedSt);
                    setIsEncrypted(newCheckedState);
                    if (!newCheckedState) { 
                         if (fileToEdit.isEncrypted && !isContentUnlocked) { // If was locked and not unlocked
                           toast({title: "Unlock Content First", description: "To save as unlocked, please unlock the content first using its password.", variant:"destructive"});
                           setIsEncrypted(true); // Revert checkbox
                           return;
                         }
                    }
                }}
                />
                <Label htmlFor="editIsEncrypted" className="text-sm font-medium">
                Lock this file on save
                </Label>
            </div>

            {isEncrypted && ( // If target state is "locked"
                <div className="mt-2 space-y-1">
                <Label htmlFor="saveEncryptionPassword">
                    {fileToEdit.isEncrypted && isContentUnlocked ? "New or Existing Password for Lock" : "Password for Locking"}
                </Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                    id="saveEncryptionPassword"
                    type="password"
                    value={currentEncryptionPassword}
                    onChange={(e) => setCurrentEncryptionPassword(e.target.value)}
                    placeholder="Enter password for locking"
                    required={isEncrypted}
                    className="pl-10"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    {fileToEdit.isEncrypted && isContentUnlocked ? "Enter original password to re-lock, or a new one to change it." : "This password will be required to view/edit."}
                </p>
                </div>
            )}
            {!isEncrypted && fileToEdit.isEncrypted && !isContentUnlocked && (
                 <p className="text-xs text-destructive mt-1">
                    To save as unlocked, you must first unlock the content using its password.
                </p>
            )}
          </div>

        </form>
        <DialogFooter className="mt-auto pt-4 border-t sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                type="button" 
                variant="destructiveOutline" 
                className="w-full sm:w-auto mb-2 sm:mb-0 sm:mr-auto"
                disabled={isDeleteDisabled}
                title={isDeleteDisabled ? "Unlock file to enable deletion" : `Delete file "${fileToEdit.name}"`}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete File
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the file "{fileToEdit.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Yes, delete file
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex flex-col-reverse sm:flex-row sm:gap-2 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto"
              // Disable save if: target is locked AND no password provided
              // OR if it was locked, not unlocked, and user tries to save as unlocked (without unlocking first)
              disabled={ (isEncrypted && !currentEncryptionPassword.trim()) || (fileToEdit.isEncrypted && !isContentUnlocked && !isEncrypted ) }
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
