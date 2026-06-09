import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface UploadCardProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
  onClearImage: () => void;
  disabled?: boolean;
}

export function UploadCard({ onImageSelect, selectedImage, onClearImage, disabled }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card className="overflow-hidden border-2 bg-card shadow-sm">
      <div className="p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <h3 className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload Image
        </h3>

        {!selectedImage ? (
          <motion.div
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            whileHover={!disabled ? { scale: 1.01 } : {}}
            transition={{ duration: 0.2 }}
          >
            
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-primary/10 p-4">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <p className="font-medium">
                  {isDragging ? 'Drop image here' : 'Drag & drop image here'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                Supported formats: PNG, JPG, JPEG
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl overflow-hidden border-2 border-border"
          >
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Selected preview"
              className="h-64 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="font-medium truncate max-w-[200px]">{selectedImage.name}</p>
                  <p className="text-xs text-white/80">
                    {(selectedImage.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onClearImage}
                  disabled={disabled}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {selectedImage && (
          <Button
            className="mt-4 w-full bg-primary hover:bg-primary/90"
            onClick={handleClick}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            Change Image
          </Button>
        )}
      </div>
    </Card>
  );
}
