/**
 * TagFilterDropdown Component Tests
 *
 * Tests for the reusable tag filter dropdown component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagFilterDropdown } from '../../../src/components/compare/TagFilterDropdown';

// Mock the useTags hook
vi.mock('../../../src/hooks/useTags', () => ({
  useTags: vi.fn(),
}));

import { useTags } from '../../../src/hooks/useTags';

const mockUseTags = vi.mocked(useTags);

const mockTags = [
  { id: 'tag-1', name: 'safety' },
  { id: 'tag-2', name: 'ethics' },
  { id: 'tag-3', name: 'production' },
];

describe('TagFilterDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTags.mockReturnValue({
      tags: mockTags,
      loading: false,
      error: null,
      refetch: vi.fn(),
      createTag: vi.fn(),
      deleteTag: vi.fn(),
      creating: false,
      deleting: false,
    });
  });

  describe('rendering', () => {
    it('renders with Tags button', () => {
      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /filter by tags/i })).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('shows badge count when tags are selected', () => {
      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1', 'tag-2']}
          onTagsChange={vi.fn()}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show badge when no tags selected', () => {
      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('shows loading state', async () => {
      const user = userEvent.setup();
      mockUseTags.mockReturnValue({
        tags: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
        createTag: vi.fn(),
        deleteTag: vi.fn(),
        creating: false,
        deleting: false,
      });

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      // Open dropdown
      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Loading tags...')).toBeInTheDocument();
    });

    it('shows empty state when no tags available', async () => {
      const user = userEvent.setup();
      mockUseTags.mockReturnValue({
        tags: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
        createTag: vi.fn(),
        deleteTag: vi.fn(),
        creating: false,
        deleting: false,
      });

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      // Open dropdown
      await user.click(screen.getByRole('button'));

      expect(screen.getByText('No tags available')).toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('safety')).toBeInTheDocument();
      expect(screen.getByText('ethics')).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('closes dropdown on second click', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on outside click', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <TagFilterDropdown
            selectedTagIds={[]}
            onTagsChange={vi.fn()}
          />
          <button type="button">Outside</button>
        </div>
      );

      await user.click(screen.getByRole('button', { name: /filter by tags/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Outside' }));
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('tag selection', () => {
    it('selects a tag on click', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={onTagsChange}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('safety'));

      expect(onTagsChange).toHaveBeenCalledWith(['tag-1']);
    });

    it('deselects a tag on click', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();

      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1']}
          onTagsChange={onTagsChange}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('safety'));

      expect(onTagsChange).toHaveBeenCalledWith([]);
    });

    it('adds to existing selection', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();

      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1']}
          onTagsChange={onTagsChange}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('ethics'));

      expect(onTagsChange).toHaveBeenCalledWith(['tag-1', 'tag-2']);
    });

    it('shows checkmark for selected tags', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1']}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      const safetyOption = screen.getByRole('option', { name: /safety/i });
      expect(safetyOption).toHaveAttribute('aria-selected', 'true');
      expect(safetyOption).toHaveTextContent('✓');

      const ethicsOption = screen.getByRole('option', { name: /ethics/i });
      expect(ethicsOption).toHaveAttribute('aria-selected', 'false');
    });

    it('highlights selected tags with background color', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1']}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      const safetyOption = screen.getByRole('option', { name: /safety/i });
      expect(safetyOption).toHaveClass('bg-teal-50');
    });
  });

  describe('clear tags', () => {
    it('shows clear button when tags are selected', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1']}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /filter by tags/i }));

      expect(screen.getByText('Clear all tags')).toBeInTheDocument();
    });

    it('does not show clear button when no tags selected', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      expect(screen.queryByText('Clear all tags')).not.toBeInTheDocument();
    });

    it('clears all tags on clear button click', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();

      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1', 'tag-2']}
          onTagsChange={onTagsChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /filter by tags/i }));
      await user.click(screen.getByText('Clear all tags'));

      expect(onTagsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('accessibility', () => {
    it('has correct aria attributes on button', () => {
      render(
        <TagFilterDropdown
          selectedTagIds={['tag-1']}
          onTagsChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-label', 'Filter by tags, 1 selected');
    });

    it('updates aria-expanded when dropdown opens', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('dropdown has correct role', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('tag options have correct role', async () => {
      const user = userEvent.setup();

      render(
        <TagFilterDropdown
          selectedTagIds={[]}
          onTagsChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });
  });
});
