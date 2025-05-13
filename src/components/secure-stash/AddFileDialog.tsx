
"use client";
import React, { useState, useEffect } from 'react';
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
import { FilePlus2, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import type { FileType, FileItem } from '@/lib/types';
import { TagInput } from './TagInput';
import { suggestTags } from '@/ai/flows/suggest-tags'; // Assuming path is correct
import { useToast } from '@/hooks/use-toast';

interface AddFileDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function AddFileDialog({ isOpen, setIsOpen }: AddFileDialogProps) {
  const { addFile, currentFolderId, encryptionKey } = useAppContext();
  const { toast } = useToast();

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<FileType>('text');
  const [fileContent, setFileContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(!!encryptionKey);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when dialog opens
      setFileName('');
      setFileType('text');
      setFileContent('');
      setTags([]);
      setIsEncrypted(!!encryptionKey);
      setAiError(null);
    }
  }, [isOpen, encryptionKey]);

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
      const result = await suggestTags({ fileContent: fileContent });
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
    if (!fileName.trim()) {
      toast({ title: "File name is required.", variant: "destructive" });
      return;
    }
    
    let finalContent = fileContent;
    if (fileType === 'image') {
      finalContent = `https://picsum.photos/seed/${Date.now()}/400/300`; // Placeholder image
    } else if (fileType === 'document') {
      finalContent = `This is a placeholder for the document named "${fileName}". Actual content not stored in this demo.`;
    }

    const newFileData: Omit<FileItem, 'id' | 'createdAt' | 'updatedAt' | 'encryptedContent'> = {
      name: fileName.trim(),
      type: fileType,
      content: finalContent,
      tags,
      folderId: currentFolderId,
      isEncrypted,
      // fileSize could be calculated for text, but for simplicity we omit it
    };
    addFile(newFileData);
    toast({ title: `File "${newFileData.name}" added successfully.`});
    setIsOpen(false);
  };
  
  const canSuggestTags = (fileType === 'text' || fileType === 'link') && fileContent.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-6 w-6 text-primary" />
            Add New File
          </DialogTitle>
          <DialogDescription>
            Store your texts, images, documents, or links securely. Encrypt if needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-4 p-1 pr-3">
          <div>
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., My Secret Notes"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fileType">File Type</Label>
            <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
              <SelectTrigger id="fileType" className="w-full mt-1">
                <SelectValue placeholder="Select file type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image (Placeholder)</SelectItem>
                <SelectItem value="document">Document (Placeholder)</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(fileType === 'text' || fileType === 'link') && (
            <div>
              <Label htmlFor="fileContent">{fileType === 'text' ? 'Content' : 'Link URL'}</Label>
              <Textarea
                id="fileContent"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder={fileType === 'text' ? 'Enter your text here...' : 'https://example.com'}
                rows={fileType === 'text' ? 6 : 2}
                className="mt-1"
              />
            </div>
          )}
           {fileType === 'image' && (
            <p className="text-sm text-muted-foreground p-2 border rounded-md bg-secondary/30">
              A placeholder image will be used. Actual image uploads are not supported in this demo.
            </p>
           )}
           {fileType === 'document' && (
            <p className="text-sm text-muted-foreground p-2 border rounded-md bg-secondary/30">
              A placeholder document will be created. Actual document uploads are not supported in this demo.
            </p>
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
              id="isEncrypted"
              checked={isEncrypted}
              onCheckedChange={(checked) => setIsEncrypted(Boolean(checked))}
              disabled={!encryptionKey}
            />
            <Label htmlFor="isEncrypted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Encrypt this file
            </Label>
          </div>
          {!encryptionKey && isEncrypted && (
            <p className="text-xs text-destructive mt-1">
              Encryption key is not set. Please set it in the header to encrypt files.
            </p>
          )}

        </form>
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>Add File</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
