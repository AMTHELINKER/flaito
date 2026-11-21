import { Link } from 'react-router-dom';
import type { BookDto } from '@laito/shared';
import { BookCover } from './BookCover';
import { StatusBadge, VisibilityBadge } from './badges';
import { formatWords } from '@/lib/format';
import { Skeleton } from './ui/primitives';

export function BookCard({ book, to, showMeta = true }: { book: BookDto; to: string; showMeta?: boolean }) {
  return (
    <Link
      to={to}
      className="glass pressable group flex flex-col gap-3 rounded-lg p-3 hover:shadow-lg focus-visible:outline-offset-4"
    >
      <BookCover title={book.title} coverUrl={book.coverUrl} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="line-clamp-2 text-base leading-snug">{book.title}</h3>
        {book.author && <p className="truncate text-sm text-muted">{book.author.displayName}</p>}
        {showMeta && (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge value={book.status} />
            <VisibilityBadge value={book.visibility} />
          </div>
        )}
        <p className="text-xs text-muted">
          {book.chapterCount} chapitre{book.chapterCount > 1 ? 's' : ''} · {formatWords(book.wordCount)}
        </p>
      </div>
    </Link>
  );
}

export function BookGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}

export function BookGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <BookGrid>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass flex flex-col gap-3 rounded-lg p-3">
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </BookGrid>
  );
}
