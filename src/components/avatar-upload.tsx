"use client";

import * as React from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface AvatarUploadProps {
  currentUrl?: string | null;
  initials: string;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
  error?: string;
  labels: {
    upload: string;
    remove: string;
    uploading: string;
    tooLarge: string;
    invalidType: string;
    hint: string;
  };
}

export function AvatarUpload({
  currentUrl,
  initials,
  onFileSelect,
  onRemove,
  isUploading = false,
  error,
  labels,
}: AvatarUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const displayUrl = preview || currentUrl || null;
  const displayError = error || localError;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    // Client-side type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError(labels.invalidType);
      return;
    }

    // Client-side size check
    if (file.size > MAX_SIZE) {
      setLocalError(labels.tooLarge);
      return;
    }

    // Show preview immediately
    const url = URL.createObjectURL(file);
    setPreview(url);

    onFileSelect(file);
  }

  function handleRemove() {
    setPreview(null);
    setLocalError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove();
  }

  // Clean up object URLs
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar preview */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          {displayUrl && <AvatarImage src={displayUrl} alt="Avatar" />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Upload overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Remove button */}
        {displayUrl && !isUploading && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -right-1 -top-1 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
            aria-label={labels.remove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Upload button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          {isUploading ? labels.uploading : labels.upload}
        </Button>
        <p className="text-caption text-muted-foreground">{labels.hint}</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Error message */}
      {displayError && (
        <p className="text-body-sm text-error" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
