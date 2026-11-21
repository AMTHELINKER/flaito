import type { ProfileDto } from '@laito/shared';

export function Avatar({
  profile,
  size = 80,
}: {
  profile: Pick<ProfileDto, 'displayName' | 'avatarUrl'>;
  size?: number;
}) {
  return profile.avatarUrl ? (
    <img
      src={profile.avatarUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover shadow-soft"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="flex items-center justify-center rounded-full bg-leather font-serif text-parchment shadow-soft"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {profile.displayName[0]?.toUpperCase() ?? '?'}
    </span>
  );
}
