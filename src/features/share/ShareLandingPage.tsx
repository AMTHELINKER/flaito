import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shareApi } from '@/api/endpoints';
import { AuthLayout } from '../auth/AuthPages';
import { Skeleton } from '@/components/ui/primitives';
import { Link } from 'react-router-dom';

/** /s/:token → résout le lien privé puis ouvre le lecteur. */
export function ShareLandingPage() {
  const { token = '' } = useParams();
  const q = useQuery({ queryKey: ['share', 'resolve', token], queryFn: () => shareApi.resolve(token), retry: false });
  if (q.data) {
    const { resourceType, resourceId, bookId } = q.data;
    const share = `?share=${encodeURIComponent(token)}`;
    return (
      <Navigate to={resourceType === 'chapter' ? `/lire/${bookId}/${resourceId}${share}` : `/lire/${bookId}${share}`} replace />
    );
  }
  if (q.error) {
    return (
      <AuthLayout title="Lien indisponible">
        <p className="text-muted">Ce lien a expiré ou a été révoqué par son auteur. Demandez-lui un nouveau lien.</p>
        <Link to="/" className="mt-4 inline-block text-accent-text underline-offset-2 hover:underline">
          Découvrir Laito
        </Link>
      </AuthLayout>
    );
  }
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-6 pt-24">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
