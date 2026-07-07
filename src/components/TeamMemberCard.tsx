import { roleLabel } from "@/lib/roles";

export type TeamMember = {
  id?: string;
  name_ar?: string;
  name_en?: string;
  full_name?: string;
  role_ar?: string;
  role_en?: string;
  role_title?: string;
  role_keys?: string[];
  bio_ar?: string;
  bio_en?: string;
  bio?: string;
  image_url?: string;
  skills_ar?: string[];
  skills_en?: string[];
  is_founder?: boolean;
};

/**
 * TeamMemberCard — single unified team card used on the About page,
 * (future) Home team strip, and the dashboard live preview. One design,
 * one data shape, everywhere.
 */
export function TeamMemberCard({
  member,
  locale,
}: {
  member: TeamMember;
  locale: string;
}) {
  const pick = (ar?: string, en?: string) => (locale === "en" ? en || ar || "" : ar || en || "");
  const name = pick(member.name_ar, member.name_en) || member.full_name || "";
  const role = pick(member.role_ar, member.role_en) || member.role_title || "";
  const bio = pick(member.bio_ar, member.bio_en) || member.bio || "";
  const skills = (locale === "en" ? member.skills_en : member.skills_ar) ?? member.skills_ar ?? [];

  return (
    <article className="group relative flex flex-col items-center overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-brand">
      <div className="pointer-events-none absolute -top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        <div className="absolute -inset-1 rounded-full gradient-hero opacity-0 blur transition-opacity duration-500 group-hover:opacity-60" />
        {member.image_url ? (
          <img
            src={member.image_url}
            alt={name}
            loading="lazy"
            className="relative mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-border transition-all duration-500 group-hover:ring-brand/50"
          />
        ) : (
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full gradient-hero text-4xl font-extrabold text-brand-foreground ring-2 ring-border">
            {name?.slice(0, 1)}
          </div>
        )}
      </div>

      <h3 className="relative mt-5 text-xl font-bold">{name}</h3>

      {member.is_founder && (
        <span className="relative mt-1 inline-block rounded-full gradient-hero px-3 py-1 text-xs font-bold text-brand-foreground shadow-brand">
          {locale === "en" ? "✦ Founder of MDink Solutions" : "✦ مؤسِّس MDink Solutions"}
        </span>
      )}

      {member.role_keys && member.role_keys.length ? (
        <div className="relative mt-3 flex flex-wrap justify-center gap-1.5">
          {member.role_keys.map((rk) => (
            <span
              key={rk}
              className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand transition-colors group-hover:bg-brand/20"
            >
              {roleLabel(rk, locale as any)}
            </span>
          ))}
        </div>
      ) : role ? (
        <p className="relative mt-2 text-sm font-medium text-brand">{role}</p>
      ) : null}

      {bio && (
        <p className="relative mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {bio}
        </p>
      )}

      {skills.length > 0 && (
        <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
