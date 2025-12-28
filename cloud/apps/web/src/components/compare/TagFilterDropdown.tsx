/**
 * TagFilterDropdown Component
 *
 * Reusable dropdown for filtering by tags with multi-select support.
 * Shows a button with badge count, dropdown with checkboxes, and
 * optional clear action.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTags } from '../../hooks/useTags';

export type TagFilterDropdownProps = {
  /** Currently selected tag IDs */
  selectedTagIds: string[];
  /** Callback when tag selection changes */
  onTagsChange: (tagIds: string[]) => void;
  /** Optional additional CSS classes */
  className?: string;
};

export function TagFilterDropdown({
  selectedTagIds,
  onTagsChange,
  className = '',
}: TagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tags: allTags, loading } = useTags();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleTagToggle = useCallback(
    (tagId: string) => {
      const isSelected = selectedTagIds.includes(tagId);
      const newTagIds = isSelected
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId];
      onTagsChange(newTagIds);
    },
    [selectedTagIds, onTagsChange]
  );

  const handleClearTags = useCallback(() => {
    onTagsChange([]);
  }, [onTagsChange]);

  const hasSelectedTags = selectedTagIds.length > 0;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        size="sm"
        className={`gap-1 ${
          hasSelectedTags ? 'bg-teal-50 border-teal-300 text-teal-700' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Filter by tags${hasSelectedTags ? `, ${selectedTagIds.length} selected` : ''}`}
      >
        Tags
        {hasSelectedTags && (
          <span className="inline-flex items-center justify-center w-5 h-5 bg-teal-600 text-white text-xs rounded-full">
            {selectedTagIds.length}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Clear button at top when tags are selected */}
          {hasSelectedTags && (
            <div className="border-b border-gray-200">
              {/* eslint-disable-next-line react/forbid-elements -- Menu item requires custom full-width layout */}
              <button
                type="button"
                onClick={handleClearTags}
                className="w-full px-3 py-2 text-sm text-left text-gray-500 hover:bg-gray-50 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all tags
              </button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-sm text-gray-500 text-center">Loading tags...</div>
            ) : allTags.length > 0 ? (
              allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  // eslint-disable-next-line react/forbid-elements -- Menu item requires custom full-width layout
                  <button
                    key={tag.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? 'bg-teal-50' : ''
                    }`}
                  >
                    <span>{tag.name}</span>
                    {isSelected && <span className="text-teal-600">✓</span>}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-sm text-gray-500 text-center">No tags available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
