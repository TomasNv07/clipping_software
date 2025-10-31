import { useState, useEffect } from 'react';
import ClipCard from './ClipCard';
import { Clip } from '../types';

function ClipGallery() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load clips on mount
  useEffect(() => {
    loadClips();

    // Listen for new clips saved
    window.electron.onClipSaved((clip) => {
      setClips((prev) => [clip, ...prev]);
    });
  }, []);

  const loadClips = async () => {
    setIsLoading(true);
    try {
      const loadedClips = await window.electron.getClipsList();
      setClips(loadedClips);
    } catch (error) {
      console.error('Error loading clips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (clipPath: string) => {
    const result = await window.electron.deleteClip(clipPath);
    if (result.success) {
      // Remove from list
      setClips((prev) => prev.filter((clip) => clip.path !== clipPath));
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center h-full">
        <div className="text-text-secondary">Loading clips...</div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white">
          ALL CLIPS ({clips.length})
        </h2>
        {/* Optional: Create Montage button */}
        {/* <button className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-opacity-90 transition-colors">
          Create Montage
        </button> */}
      </div>

      {/* Clip Grid */}
      {clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-text-tertiary">
          <div className="text-lg mb-2">No clips yet</div>
          <div className="text-sm">Press F3 while recording to save a clip</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ClipGallery;
