import React, { useState, useRef } from 'react';
import { X, FilePlus, Loader2, Upload, File as FileIcon } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firebaseUtils';

interface FileModalProps {
  userId: string;
  folders: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

const FileModal: React.FC<FileModalProps> = ({ userId, folders, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folderId, setFolderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !userId) return;

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    // 1. Create a unique file ID/name in storage
    const fileId = Math.random().toString(36).substring(2, 15);
    const storagePath = `user_uploads/${userId}/${fileId}-${selectedFile.name}`;
    const storageRef = ref(storage, storagePath);

    // 2. Start Upload
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (err) => {
        console.error('Upload error:', err);
        setError('Failed to upload file. Please try again.');
        setIsLoading(false);
      },
      async () => {
        // 3. Upload Success - Get Download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Helper to get type label
          const getFileTypeLabel = (mime: string) => {
            if (mime.includes('image')) return 'image';
            if (mime.includes('pdf')) return 'pdf';
            return 'doc';
          };

          const mimeType = selectedFile.type || 'application/octet-stream';

          // 4. Save Metadata to Firestore
          const firestorePath = `users/${userId}/files`;
          await addDoc(collection(db, firestorePath), {
            name: selectedFile.name,
            storagePath: storagePath,
            downloadURL: downloadURL,
            size: selectedFile.size,
            mimeType: mimeType,
            type: getFileTypeLabel(mimeType),
            folderId: folderId || null,
            createdAt: serverTimestamp(),
          });

          onSuccess();
          onClose();
        } catch (err) {
          console.error('Firestore error:', err);
          handleFirestoreError(err, OperationType.WRITE, `users/${userId}/files`);
          setError('File uploaded but failed to save metadata. Please contact support.');
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <FilePlus size={20} className="text-emerald-600" />
            Upload File
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            {/* File Picker Area */}
            <div 
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                selectedFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={isLoading}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                    <FileIcon size={24} />
                  </div>
                  <p className="font-medium text-slate-900 text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
                    <Upload size={24} />
                  </div>
                  <p className="font-medium text-slate-900 text-sm">Click to choose a file</p>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop here</p>
                </div>
              )}
            </div>

            {/* Folder Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Folder (Optional)</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50"
              >
                <option value="">No Folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FileModal;
