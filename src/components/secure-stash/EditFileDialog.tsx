
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
  const { updateFile, decryptFileContent, deleteFile } = useAppContext();
  const { toast } = useToast();

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [fileContent, setFileContent] = useState(''); // This will hold plaintext content for editing
  const [tags, setTags] = useState<string[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false); // Target encryption state for saving
  const [currentEncryptionPassword, setCurrentEncryptionPassword] = useState(''); // For decrypting existing or setting new
  
  const [isContentDecrypted, setIsContentDecrypted] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFileName('');
    setFileType('text');
    setFileContent('');
    setTags([]);
    setIsEncrypted(false);
    setCurrentEncryptionPassword('');
    setIsContentDecrypted(false);
    setDecryptionError(null);
    setAiError(null);
  }, []);
  
  const loadInitialFileState = useCallback(() => {
    if (fileToEdit) {
      setFileName(fileToEdit.name);
      setFileType(fileToEdit.type);
      setIsEncrypted(fileToEdit.isEncrypted);
      setTags([...fileToEdit.tags]);
      // setCurrentEncryptionPassword(fileToEdit.encryptionPassword || ''); // Don't prefill actual password

      if (!fileToEdit.isEncrypted) {
        setFileContent(fileToEdit.content);
        setIsContentDecrypted(true);
        setDecryptionError(null);
      } else {
        // File is encrypted, content needs decryption. Clear previous content.
        setFileContent(''); 
        setIsContentDecrypted(false);
        // User will need to enter password to decrypt
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

  const handleDecryptForEditing = () => {
    if (!fileToEdit || !fileToEdit.isEncrypted) return;
    if (!currentEncryptionPassword) {
      setDecryptionError("Password is required to decrypt the file content.");
      return;
    }
    const decrypted = decryptFileContent(fileToEdit, currentEncryptionPassword);
    if (decrypted.startsWith("[Decryption Failed") || decrypted.startsWith("[Encrypted -")) {
      setFileContent('');
      setIsContentDecrypted(false);
      setDecryptionError(decrypted); // Show specific error from decryptFileContent
    } else {
      setFileContent(decrypted);
      setIsContentDecrypted(true);
      setDecryptionError(null);
      toast({ title: "Content decrypted for editing." });
    }
  };


  const handleSuggestTags = async () => {
     if (!isContentDecrypted || (fileType !== 'text' && fileType !== 'link') || !fileContent.trim()) {
      toast({
        title: "Cannot Suggest Tags",
        description: "Decrypt content first. Tag suggestion is available for decrypted text or link files with content.",
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

    if (isEncrypted && !currentEncryptionPassword.trim()) {
      toast({ title: "Password is required to save as encrypted.", variant: "destructive" });
      return;
    }
    
    if (fileToEdit.isEncrypted && !isContentDecrypted && isEncrypted) {
        // If was encrypted, not decrypted, and still trying to save as encrypted WITHOUT providing a new password for possibly new content.
        // This state means user is trying to save an encrypted file (possibly with new name/tags) without viewing/changing its content or password.
        // Or, if user changed to encrypted state and provided a password for new content.
        if(!currentEncryptionPassword && fileToEdit.encryptionPassword) {
            // Trying to save an old encrypted file without re-entering its password or providing a new one.
            // This case is tricky: if content was never decrypted, we can't re-encrypt it with a *new* password without the old one.
            // For simplicity: if user wants to keep it encrypted and didn't decrypt, we assume no content change.
            // If they *did* change to `isEncrypted=true` from false, they *must* supply a password.
        }
    }


    // Logic for preparing updates
    const updatesForAppCtx: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId'>> & { newContent: string, newEncryptionPassword?: string, newIsEncrypted: boolean } = {
      name: fileName.trim(),
      tags,
      newContent: fileContent, // Always pass the current plaintext content from the form
      newIsEncrypted: isEncrypted, // Target encryption state
    };

    if (isEncrypted) {
      updatesForAppCtx.newEncryptionPassword = currentEncryptionPassword;
    }
    
    updateFile(fileToEdit.id, updatesForAppCtx);
    toast({ title: `File "${updatesForAppCtx.name}" updated successfully.`});
    setIsOpen(false);
  };

  const handleDeleteFile = () => {
    if (!fileToEdit) return;
    if (fileToEdit.isEncrypted) {
      toast({
        title: "Action Prohibited",
        description: "Encrypted files cannot be deleted directly from here. Please decrypt or change encryption status first via Edit actions on the card.",
        variant: "destructive",
      });
      return;
    }
    deleteFile(fileToEdit.id);
    toast({ title: `File "${fileToEdit.name}" deleted successfully.` });
    setIsOpen(false);
  };

  const canSuggestTags = isContentDecrypted && (fileType === 'text' || fileType === 'link') && fileContent.trim().length > 0;
  const showContentFields = isContentDecrypted || !fileToEdit?.isEncrypted;
  const requirePasswordForDecryption = fileToEdit?.isEncrypted && !isContentDecrypted;


  if (!fileToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-6 w-6 text-primary" />
            Edit File: {fileToEdit.name}
          </DialogTitle>
          <DialogDescription>
            Update the details of your file. Provide password if changing encryption.
          </DialogDescription>
        </DialogHeader>

        {/* Password input for decryption if needed */}
        {requirePasswordForDecryption && (
          <div className="my-4 p-4 border border-dashed rounded-md space-y-2 bg-secondary/50">
            <Label htmlFor="decryptPassword">Enter Password to View/Edit Content</Label>
            <div className="flex items-center gap-2">
              <Input
                id="decryptPassword"
                type="password"
                value={currentEncryptionPassword}
                onChange={(e) => {
                  setCurrentEncryptionPassword(e.target.value);
                  if (decryptionError) setDecryptionError(null); // Clear error on new input
                }}
                placeholder="Password to decrypt"
                className="flex-grow"
              />
              <Button onClick={handleDecryptForEditing} variant="outline" size="sm">
                <Unlock className="mr-2 h-4 w-4" /> Decrypt
              </Button>
            </div>
            {decryptionError && <p className="text-sm text-destructive mt-1">{decryptionError}</p>}
             <p className="text-xs text-muted-foreground">Original content is encrypted. Enter password to view and edit.</p>
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
          
          {/* Content Fields - shown if not encrypted OR if decrypted */}
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
           {!showContentFields && fileToEdit.isEncrypted && (
            <div className="p-3 my-2 border rounded-md bg-muted/20 text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4"/> Content is encrypted. Decrypt above to edit.
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

          {/* Encryption Checkbox and Password Field for Saving */}
          <div className="space-y-2 mt-4 p-3 border rounded-md bg-muted/10">
            <div className="flex items-center space-x-2">
                <Checkbox id="editIsEncrypted" checked={isEncrypted}
                onCheckedChange={(checkedSt) => {
                    const newCheckedState = Boolean(checkedSt);
                    setIsEncrypted(newCheckedState);
                    if (!newCheckedState) { // If unchecking encryption
                         if (fileToEdit.isEncrypted && !isContentDecrypted) {
                           toast({title: "Decrypt Content First", description: "To save as unencrypted, please decrypt the content first using its original password.", variant:"destructive"});
                           // Revert checkbox, as we can't unencrypt without decryption key
                           setIsEncrypted(true);
                           return;
                         }
                    }
                }}
                />
                <Label htmlFor="editIsEncrypted" className="text-sm font-medium">
                Encrypt this file on save
                </Label>
            </div>

            {isEncrypted && (
                <div className="mt-2 space-y-1">
                <Label htmlFor="saveEncryptionPassword">
                    {fileToEdit.isEncrypted && isContentDecrypted ? "New or Existing Encryption Password" : "Encryption Password for Saving"}
                </Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                    id="saveEncryptionPassword"
                    type="password"
                    value={currentEncryptionPassword}
                    onChange={(e) => setCurrentEncryptionPassword(e.target.value)}
                    placeholder="Enter password for encryption"
                    required={isEncrypted}
                    className="pl-10"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    {fileToEdit.isEncrypted && isContentDecrypted ? "Enter original password to re-encrypt, or a new one to change it." : "This password will be required to view/edit."}
                </p>
                </div>
            )}
            {!isEncrypted && fileToEdit.isEncrypted && !isContentDecrypted && (
                 <p className="text-xs text-destructive mt-1">
                    To save as unencrypted, you must first decrypt the content using its password.
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
                disabled={fileToEdit.isEncrypted}
                title={fileToEdit.isEncrypted ? "Encrypted files cannot be deleted from here" : "Delete this file"}
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
              disabled={ (isEncrypted && !currentEncryptionPassword.trim()) || (fileToEdit.isEncrypted && !isContentDecrypted && !isEncrypted && fileToEdit.type !== 'image' && fileToEdit.type !== 'document' && fileToEdit.type !== 'video' ) }
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

