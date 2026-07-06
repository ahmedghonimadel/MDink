import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Image as ImageIcon, Save, Trash2, UserPlus, Plus, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireWebsiteAdmin } from "@/lib/admin";
import { ImageUpload } from "@/components/ImageUpload";
import { AboutLivePreview } from "./-about-live-preview";

export const Route = createFileRoute("/_authenticated/admin/about")({
  beforeLoad: requireWebsiteAdmin,
  component: AboutAdmin,
});

const defaults = {
  intro_ar: "MDink for Digital Solutions شركة حلول رقمية متخصصة بالكامل في خدمة القطاع الطبي.",
  intro_en:
    "MDink for Digital Solutions is a digital solutions company fully specialized in the medical sector.",
  vision_ar: "أن نكون المنصة الرقمية الأولى لأطباء مصر والشرق الأوسط.",
  vision_en: "To become the leading digital platform for doctors in Egypt and the Middle East.",
  mission_ar: "تحويل الخبرة الطبية إلى حضور رقمي مملوك وقابل للنمو.",
  mission_en: "Turning medical expertise into an owned, scalable digital presence.",
  values_ar: "الجودة، الشفافية، الالتزام، والابتكار.",
  values_en: "Quality, transparency, commitment, and innovation.",
  team_title_ar: "فريق العمل",
  team_title_en: "Our Team",
  team_text_ar: "الأشخاص وراء تشغيل وتسويق وتطوير حضور MDink الطبي.",
  team_text_en: "The people behind MDink medical marketing and digital operations.",
  // لحظات فريق MDink — تظهر أسفل الفريق في صفحة "من نحن"
  gallery: [] as { image_url: string; caption_ar?: string; caption_en?: string }[],
};

const emptyMember = {
  name_ar: "",
  name_en: "",
  role_ar: "",
  role_en: "",
  bio_ar: "",
  bio_en: "",
  email: "",
  phone: "",
  image_url: "",
  alt_ar: "",
  alt_en: "",
  sort_order: "50",
  is_published: true,
  is_featured: false,
};

function AboutAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [content, setContent] = useState(defaults);
  const [tab, setTab] = useState("live");
  const set = (k: string, v: string) => setContent((c) => ({ ...c, [k]: v }));
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [member, setMember] = useState(emptyMember);

  const { data: page } = useQuery({
    queryKey: ["page-sections-admin", "about"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "about")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return { content: merged };
    },
  });
  const { data: team = [] } = useQuery({
    queryKey: ["admin-about-team"],
    queryFn: async () => (await db.from("team_members").select("*").order("sort_order")).data ?? [],
  });

  useEffect(() => {
    if (page?.content) setContent({ ...defaults, ...page.content });
  }, [page]);

  async function saveContent() {
    const { error } = await db.from("page_sections").upsert(
      {
        page_slug: "about",
        section_key: "intro",
        content_json: content,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_slug,section_key" },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("تم حفظ صفحة من نحن ✓");
      qc.invalidateQueries({ queryKey: ["page-sections-admin", "about"] });
      qc.invalidateQueries({ queryKey: ["page-sections-public", "about"] });
    }
  }

  function editMember(item: any) {
    setEditingMemberId(item.id);
    setMember({
      name_ar: item.name_ar ?? "",
      name_en: item.name_en ?? "",
      role_ar: item.role_ar ?? "",
      role_en: item.role_en ?? "",
      bio_ar: item.bio_ar ?? "",
      bio_en: item.bio_en ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      image_url: item.image_url ?? "",
      alt_ar: item.alt_ar ?? "",
      alt_en: item.alt_en ?? "",
      sort_order: String(item.sort_order ?? 50),
      is_published: !!item.is_visible,
      is_featured: !!item.is_featured,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetMember() {
    setEditingMemberId(null);
    setMember(emptyMember);
  }

  async function saveMember() {
    if (!member.name_ar.trim() || !member.role_ar.trim()) {
      toast.error("اكتب اسم ووظيفة العضو بالعربي على الأقل");
      return;
    }
    const payload = {
      full_name: member.name_en.trim() || member.name_ar.trim(),
      role_title: member.role_en.trim() || member.role_ar.trim(),
      image_url: member.image_url.trim() || null,
      name_ar: member.name_ar.trim(),
      name_en: member.name_en.trim() || null,
      role_ar: member.role_ar.trim(),
      role_en: member.role_en.trim() || null,
      bio_ar: member.bio_ar.trim() || null,
      bio_en: member.bio_en.trim() || null,
      sort_order: Number(member.sort_order) || 50,
      is_visible: member.is_published,
      is_founder: member.is_featured,
    };
    const { error } = editingMemberId
      ? await db.from("team_members").update(payload).eq("id", editingMemberId)
      : await db.from("team_members").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editingMemberId ? "تم تحديث العضو ✓" : "تمت إضافة عضو الفريق ✓");
      resetMember();
      qc.invalidateQueries({ queryKey: ["admin-about-team"] });
      qc.invalidateQueries({ queryKey: ["public-team-members"] });
    }
  }

  async function toggleMember(id: string, is_visible: boolean) {
    const { error } = await db
      .from("team_members")
      .update({ is_visible: !is_visible })
      .eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-about-team"] });
  }

  async function removeMember(item: any) {
    if (item.is_protected || item.email?.toLowerCase() === "shfahmy2010@gmail.com") {
      toast.error("شيماء عضو محمي ولا يمكن حذفها من الفريق");
      return;
    }
    if (!confirm("حذف عضو الفريق؟")) return;
    const { error } = await db.from("team_members").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-about-team"] });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">إدارة من نحن وفريق العمل</h1>
          <p className="mt-1 text-muted-foreground">
            نصوص الصفحة والفريق الظاهر للزوار بالعربية والإنجليزية.
          </p>
        </div>
        <Button onClick={saveContent} className="gradient-hero text-brand-foreground shadow-brand">
          <Save className="ml-2 h-4 w-4" /> حفظ كل التغييرات
        </Button>
      </header>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "live", label: "✨ معاينة حية" },
          { id: "edit", label: "تعديل تفصيلي" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "gradient-hero text-brand-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "live" && <AboutLivePreview content={content} set={set} />}

      {tab === "edit" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-xl font-bold">نصوص صفحة من نحن</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field
                area
                label="Intro عربي"
                value={content.intro_ar}
                onChange={(v) => setContent({ ...content, intro_ar: v })}
              />
              <Field
                area
                label="Intro English"
                value={content.intro_en}
                onChange={(v) => setContent({ ...content, intro_en: v })}
              />
              <Field
                area
                label="الرؤية عربي"
                value={content.vision_ar}
                onChange={(v) => setContent({ ...content, vision_ar: v })}
              />
              <Field
                area
                label="Vision English"
                value={content.vision_en}
                onChange={(v) => setContent({ ...content, vision_en: v })}
              />
              <Field
                area
                label="الرسالة عربي"
                value={content.mission_ar}
                onChange={(v) => setContent({ ...content, mission_ar: v })}
              />
              <Field
                area
                label="Mission English"
                value={content.mission_en}
                onChange={(v) => setContent({ ...content, mission_en: v })}
              />
              <Field
                area
                label="القيم عربي"
                value={content.values_ar}
                onChange={(v) => setContent({ ...content, values_ar: v })}
              />
              <Field
                area
                label="Values English"
                value={content.values_en}
                onChange={(v) => setContent({ ...content, values_en: v })}
              />
              <Field
                label="عنوان قسم الفريق عربي"
                value={content.team_title_ar}
                onChange={(v) => setContent({ ...content, team_title_ar: v })}
              />
              <Field
                label="Team title English"
                value={content.team_title_en}
                onChange={(v) => setContent({ ...content, team_title_en: v })}
              />
              <Field
                area
                label="وصف قسم الفريق عربي"
                value={content.team_text_ar}
                onChange={(v) => setContent({ ...content, team_text_ar: v })}
              />
              <Field
                area
                label="Team text English"
                value={content.team_text_en}
                onChange={(v) => setContent({ ...content, team_text_en: v })}
              />
            </div>
            <Button onClick={saveContent} className="mt-5 bg-brand text-brand-foreground">
              <Save className="ml-2 h-4 w-4" /> حفظ النصوص
            </Button>
          </section>

          {/* لحظات فريق MDink */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">لحظات فريق MDink</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  صور/لقطات من كواليس الفريق تظهر أسفل قسم الفريق في صفحة «من نحن». اتركها فارغة لإخفاء القسم.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setContent({
                    ...content,
                    gallery: [
                      ...(Array.isArray(content.gallery) ? content.gallery : []),
                      { image_url: "", caption_ar: "", caption_en: "" },
                    ],
                  })
                }
              >
                <Plus className="ml-1 h-4 w-4" /> إضافة لحظة
              </Button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Array.isArray(content.gallery) ? content.gallery : []).map((g: any, i: number) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <ImageUpload
                    label={`صورة ${i + 1}`}
                    value={g.image_url || ""}
                    folder="about"
                    onChange={(v) => {
                      const arr = [...content.gallery];
                      arr[i] = { ...arr[i], image_url: v };
                      setContent({ ...content, gallery: arr });
                    }}
                  />
                  <Input
                    className="mt-2"
                    placeholder="تعليق عربي (اختياري)"
                    value={g.caption_ar || ""}
                    onChange={(e) => {
                      const arr = [...content.gallery];
                      arr[i] = { ...arr[i], caption_ar: e.target.value };
                      setContent({ ...content, gallery: arr });
                    }}
                  />
                  <Input
                    dir="ltr"
                    className="mt-2"
                    placeholder="Caption English (optional)"
                    value={g.caption_en || ""}
                    onChange={(e) => {
                      const arr = [...content.gallery];
                      arr[i] = { ...arr[i], caption_en: e.target.value };
                      setContent({ ...content, gallery: arr });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 text-destructive hover:text-destructive"
                    onClick={() =>
                      setContent({
                        ...content,
                        gallery: content.gallery.filter((_: any, j: number) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="ml-1 h-4 w-4" /> حذف
                  </Button>
                </div>
              ))}
            </div>

            <Button onClick={saveContent} className="mt-5 bg-brand text-brand-foreground">
              <Save className="ml-2 h-4 w-4" /> حفظ اللحظات
            </Button>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editingMemberId ? "تعديل عضو فريق" : "إضافة عضو فريق"}
                </h2>
                {editingMemberId && (
                  <Button size="sm" variant="ghost" onClick={resetMember}>
                    <Plus className="ml-1 h-4 w-4" /> عضو جديد
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-3">
                <Field
                  label="الاسم عربي"
                  value={member.name_ar}
                  onChange={(v) => setMember({ ...member, name_ar: v })}
                />
                <Field
                  label="Name English"
                  value={member.name_en}
                  onChange={(v) => setMember({ ...member, name_en: v })}
                />
                <Field
                  label="الوظيفة عربي"
                  value={member.role_ar}
                  onChange={(v) => setMember({ ...member, role_ar: v })}
                />
                <Field
                  label="Role English"
                  value={member.role_en}
                  onChange={(v) => setMember({ ...member, role_en: v })}
                />
                <Field
                  label="Email"
                  value={member.email}
                  onChange={(v) => setMember({ ...member, email: v })}
                />
                <Field
                  label="Phone"
                  value={member.phone}
                  onChange={(v) => setMember({ ...member, phone: v })}
                />
                <ImageUpload
                  label="صورة العضو"
                  value={member.image_url}
                  onChange={(v) => setMember({ ...member, image_url: v })}
                  folder="team"
                />
                {member.image_url ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="وصف الصورة عربي"
                      value={member.alt_ar}
                      onChange={(v) => setMember({ ...member, alt_ar: v })}
                    />
                    <Field
                      label="Alt English"
                      value={member.alt_en}
                      onChange={(v) => setMember({ ...member, alt_en: v })}
                    />
                  </div>
                ) : null}
                <Field
                  area
                  label="نبذة عربي"
                  value={member.bio_ar}
                  onChange={(v) => setMember({ ...member, bio_ar: v })}
                />
                <Field
                  area
                  label="Bio English"
                  value={member.bio_en}
                  onChange={(v) => setMember({ ...member, bio_en: v })}
                />
                <Field
                  label="ترتيب الظهور"
                  value={member.sort_order}
                  onChange={(v) => setMember({ ...member, sort_order: v })}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={member.is_published}
                    onChange={(e) => setMember({ ...member, is_published: e.target.checked })}
                  />{" "}
                  منشور
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={member.is_featured}
                    onChange={(e) => setMember({ ...member, is_featured: e.target.checked })}
                  />{" "}
                  مميز (يظهر أولاً)
                </label>
                <Button onClick={saveMember} className="bg-brand text-brand-foreground">
                  {editingMemberId ? (
                    <>
                      <Save className="ml-2 h-4 w-4" /> حفظ التعديل
                    </>
                  ) : (
                    <>
                      <UserPlus className="ml-2 h-4 w-4" /> إضافة
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-xl font-bold">الفريق الحالي</h2>
              <div className="mt-4 space-y-3">
                {team.map((item: any) => (
                  <article
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name_ar ?? item.full_name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <ImageIcon />
                      </div>
                    )}
                    <button onClick={() => editMember(item)} className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-1 font-bold">
                        {item.is_protected ? <Shield className="h-3 w-3 text-accent" /> : null}
                        {item.name_ar ?? item.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.role_ar ?? item.role_title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.email} {item.is_visible ? "· منشور" : "· مخفي"}
                      </div>
                    </button>
                    {item.is_protected && (
                      <span className="rounded-full bg-accent/20 px-2 py-1 text-[11px] font-semibold">
                        محمي
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMember(item.id, !!item.is_visible)}
                    >
                      {item.is_visible ? "إخفاء" : "نشر"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeMember(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  area,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
}) {
  const isEn = /English|Email|Phone/i.test(label);
  return (
    <div>
      <Label>{label}</Label>
      {area ? (
        <Textarea
          className="mt-1.5"
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="mt-1.5"
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
