
"use client";
import React, { useState, useEffect, useMemo } from 'react';
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
import { Pencil, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import type { FileType, FileItem } from '@/lib/types';
import { TagInput } from './TagInput';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { useToast } from '@/hooks/use-toast';

interface EditFileDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fileToEdit: FileItem | null;
}

export function EditFileDialog({ isOpen, setIsOpen, fileToEdit }: EditFileDialogProps) {
  const { updateFile, encryptionKey, decryptFileContent, encryptFileContent } = useAppContext();
  const { toast } = useToast();

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [fileContent, setFileContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const initialDecryptedContent = useMemo(() => {
    if (!fileToEdit) return '';
    return decryptFileContent(fileToEdit);
  }, [fileToEdit, decryptFileContent]);

  useEffect(() => {
    if (isOpen && fileToEdit) {
      setFileName(fileToEdit.name);
      setFileType(fileToEdit.type);
      setFileContent(initialDecryptedContent);
      setTags([...fileToEdit.tags]);
      setIsEncrypted(fileToEdit.isEncrypted);
      setAiError(null);
    } else if (!isOpen) {
        // Reset on close to prevent stale data flashing
        setFileName('');
        setFileType('text');
        setFileContent('');
        setTags([]);
        setIsEncrypted(false);
        setAiError(null);
    }
  }, [isOpen, fileToEdit, initialDecryptedContent]);

  const handleSuggestTags = async () => {
    if ((fileType !== 'text' && fileType !== 'link') || !fileContent.trim()) {
      toast({
        title: "Cannot Suggest Tags",
        description: "Tag suggestion is only available for text or link files with content.",
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

    let finalContentForUpdate = fileContent;
    let finalEncryptedContent: string | undefined = undefined;

    if (isEncrypted) {
      if (!encryptionKey) {
        toast({ title: "Encryption key not set.", description: "Cannot encrypt file without an encryption key.", variant: "destructive" });
        return;
      }
      finalEncryptedContent = encryptFileContent(fileContent);
      if (finalEncryptedContent === undefined) {
         toast({ title: "Encryption Failed", description: "Could not encrypt the file content.", variant: "destructive" });
         return;
      }
      finalContentForUpdate = ""; // Clear raw content if encrypted
    }
    
    // For image/doc placeholders, content is just the URL/placeholder text.
    // If type changed from/to image/doc, this needs more robust handling.
    // For this version, we assume type doesn't change or if it does, content is appropriate.
    if (fileType === 'image' && !isEncrypted) {
      // If image, content is URL. Potentially update if user changes it, though UI doesn't allow this explicitly yet.
      // This just ensures if it's an image and not encrypted, its content (URL) is saved.
      // If it becomes encrypted, URL is encrypted.
    } else if (fileType === 'document' && !isEncrypted) {
      // Similar for document.
    }

    const updatedFileData: Partial<Omit<FileItem, 'id' | 'createdAt' | 'folderId'>> = {
      name: fileName.trim(),
      // type: fileType, // Type editing disabled for simplicity
      content: finalContentForUpdate,
      encryptedContent: finalEncryptedContent,
      tags,
      isEncrypted,
    };

    updateFile(fileToEdit.id, updatedFileData);
    toast({ title: `File "${updatedFileData.name}" updated successfully.`});
    setIsOpen(false);
  };

  const canSuggestTags = (fileType === 'text' || fileType === 'link') && fileContent.trim().length > 0;

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
            Update the details of your file. Encryption status can be changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-4 p-1 pr-3">
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
            <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)} disabled> {/* Type editing disabled */}
              <SelectTrigger id="editFileType" className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
             <p className="text-xs text-muted-foreground mt-1">File type cannot be changed after creation.</p>
          </div>

          {(fileType === 'text' || fileType === 'link') && (
            <div>
              <Label htmlFor="editFileContent">{fileType === 'text' ? 'Content' : 'Link URL'}</Label>
              <Textarea
                id="editFileContent"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder={fileType === 'text' ? 'Enter your text here...' : 'https://example.com'}
                rows={fileType === 'text' ? 6 : 2}
                className="mt-1"
              />
            </div>
          )}
           {fileType === 'image' && (
             <div>
                <Label htmlFor="editFileContent">Image URL</Label>
                <Input
                    id="editFileContent"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="https://picsum.photos/seed/example/400/300"
                    className="mt-1"
                    disabled={isEncrypted && !encryptionKey} // can't edit if encrypted and no key to re-encrypt
                />
                <p className="text-sm text-muted-foreground p-1 mt-1">
                    For "Image" type, content is a URL.
                </p>
             </div>
           )}
           {fileType === 'document' && (
             <div>
                <Label htmlFor="editFileContent">Document Content (Placeholder)</Label>
                <Textarea
                    id="editFileContent"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder="Placeholder document content..."
                    rows={4}
                    className="mt-1"
                    disabled={isEncrypted && !encryptionKey}
                />
                <p className="text-sm text-muted-foreground p-1 mt-1">
                    For "Document" type, content is placeholder text.
                </p>
             </div>
           )}


          <TagInput tags={tags} setTags={setTags} />
          
          {canSuggestTags && (
             <Button
              type="button"
              variant="outline"
              onClick={handleSuggestTags}
              disabled={isSuggestingTags || !fileContent.trim()}
              className="w-full mt-2"
            >
              {isSuggestingTags ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Suggest Tags with AI
            </Button>
          )}
          {aiError && <p className="text-sm text-destructive flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {aiError}</p>}


          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="editIsEncrypted"
              checked={isEncrypted}
              onCheckedChange={(checked) => setIsEncrypted(Boolean(checked))}
              disabled={!encryptionKey && Boolean(checked)} // Disable checking if no key, allow unchecking
            />
            <Label htmlFor="editIsEncrypted" className="text-sm font-medium">
              Encrypt this file
            </Label>
          </div>
          {!encryptionKey && isEncrypted && ( // Show warning if trying to keep/make encrypted without a key
            <p className="text-xs text-destructive mt-1">
              Encryption key is not set. File cannot be encrypted. Please set key or uncheck.
            </p>
          )}

        </form>
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={isEncrypted && !encryptionKey}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
