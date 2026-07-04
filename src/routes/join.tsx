import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { ImageUpload } from "@/components/ImageUpload";
import { ACCEPT_FILE, ACCEPT_IMAGE } from "@/lib/upload";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "انضم إلى شبكة MDink Solutions الطبية — MDink Solutions" },
      {
        name: "description",
        content: "نموذج طلب انضمام الأطباء إلى شبكة MDink Solutions الطبية للمراجعة من فريق الإدارة.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "انضم إلى شبكة MDink Solutions الطبية" },
      {
        property: "og:description",
        content: "نموذج طلب انضمام الأطباء إلى شبكة MDink Solutions الطبية.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/join" },
    ],
    links: [{ rel: "canonical", href: "/join" }],
  }),
  component: JoinPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "الاسم مطلوب").max(120),
  specialty: z.string().trim().min(2, "التخصص مطلوب").max(120),
  phone: z.string().trim().min(6, "رقم الهاتف مطلوب").max(50),
  email: z.string().trim().email("بريد غير صحيح").optional().or(z.literal("")),
  clinic_name: z.string().trim().max(160).optional().or(z.literal("")),
  clinic_address: z.string().trim().max(300).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  qualifications: z.string().trim().max(3000).optional().or(z.literal("")),
});

const SERVICE_OPTIONS = [
  { key: "Website", ar: "تصميم موقع" },
  { key: "Social Media", ar: "إدارة سوشيال ميديا" },
  { key: "SEO", ar: "سيو طبي" },
  { key: "Ads", ar: "حملات إعلانية" },
  { key: "Photography", ar: "تصوير" },
  { key: "Reels", ar: "ريلز" },
  { key: "Branding", ar: "هوية بصرية" },
  { key: "Content Strategy", ar: "استراتيجية محتوى" },
];

function JoinPage() {
  const { locale } = useLocale();
  const en = locale === "en";
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [certificatesUrl, setCertificatesUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const copy = en
    ? {
        title: "Join MDink Solutions Medical Network",
        intro: "Submit your professional details for review by the MDink Solutions team.",
        name: "Doctor name",
        specialty: "Specialty",
        phone: "Phone / WhatsApp",
        email: "Email",
        clinic: "Clinic / Center name",
        address: "Clinic address",
        branches: "Branches",
        addBranch: "Add branch",
        branchPlaceholder: "Branch address",
        bio: "Short bio",
        qualifications: "Qualifications",
        servicesLabel: "Requested services",
        certs: "Certificates (PDF / images)",
        photo: "Personal photo (optional)",
        clinicLogo: "Clinic logo (optional)",
        submit: "Submit application",
        sending: "Submitting...",
        success: (name: string) =>
          `Welcome Dr. ${name}, your details have been received and will be reviewed by the MDink Solutions team.`,
      }
    : {
        title: "انضم إلى شبكة MDink Solutions الطبية",
        intro: "أرسل بياناتك المهنية لمراجعتها من فريق MDink Solutions.",
        name: "اسم الطبيب",
        specialty: "التخصص",
        phone: "رقم الهاتف / واتساب",
        email: "البريد الإلكتروني",
        clinic: "اسم العيادة / المركز",
        address: "عنوان العيادة",
        branches: "الفروع",
        addBranch: "إضافة فرع",
        branchPlaceholder: "عنوان الفرع",
        bio: "نبذة قصيرة",
        qualifications: "المؤهلات",
        servicesLabel: "الخدمات المطلوبة",
        certs: "الشهادات (PDF / صور)",
        photo: "صورة شخصية (اختياري)",
        clinicLogo: "لوجو العيادة (اختياري)",
        submit: "إرسال الطلب",
        sending: "جاري الإرسال...",
        success: (name: string) =>
          `أهلًا دكتور ${name}، تم استلام بياناتك وسيتم مراجعتها من فريق MDink Solutions.`,
      };

  function toggleService(key: string) {
    setServices((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget).entries()));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    setLoading(true);
    const { error } = await (supabase as any).from("doctor_applications").insert({
      full_name: parsed.data.full_name,
      specialty: parsed.data.specialty,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      clinic_name: parsed.data.clinic_name || null,
      clinic_address: parsed.data.clinic_address || null,
      branches: branches.filter((b) => b.trim()),
      requested_services: services,
      bio: parsed.data.bio || null,
      qualifications: parsed.data.qualifications || null,
      certificates_url: certificatesUrl || null,
      photo_url: photoUrl || null,
      clinic_logo_url: logoUrl || null,
      status: "new",
    });
    setLoading(false);
    if (error) {
      toast.error(en ? "Could not submit, please try again." : "تعذر إرسال الطلب، حاول مرة أخرى");
      return;
    }
    toast.success(copy.success(parsed.data.full_name));
    (e.target as HTMLFormElement).reset();
    setBranches([]);
    setServices([]);
    setCertificatesUrl("");
    setPhotoUrl("");
    setLogoUrl("");
  }

  return (
    <MarketingLayout>
      <header className="border-b border-border gradient-soft">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{copy.intro}</p>
        </div>
      </header>

      <form
        onSubmit={onSubmit}
        className="mx-auto my-14 grid max-w-4xl gap-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:grid-cols-2"
      >
        <Field required name="full_name" label={copy.name} />
        <Field required name="specialty" label={copy.specialty} />
        <Field required name="phone" label={copy.phone} dir="ltr" />
        <Field name="email" label={copy.email} type="email" dir="ltr" />
        <Field name="clinic_name" label={copy.clinic} />
        <Field name="clinic_address" label={copy.address} />

        {/* Branches */}
        <div className="sm:col-span-2">
          <Label>{copy.branches}</Label>
          <div className="mt-1.5 space-y-2">
            {branches.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={b}
                  placeholder={copy.branchPlaceholder}
                  onChange={(e) => {
                    const n = [...branches];
                    n[i] = e.target.value;
                    setBranches(n);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setBranches(branches.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBranches([...branches, ""])}
            >
              <Plus className="ml-1 h-4 w-4" /> {copy.addBranch}
            </Button>
          </div>
        </div>

        {/* Services */}
        <div className="sm:col-span-2">
          <Label>{copy.servicesLabel}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleService(s.key)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${services.includes(s.key) ? "gradient-hero border-transparent text-brand-foreground" : "border-border bg-background text-muted-foreground hover:border-brand/40"}`}
              >
                {en ? s.key : s.ar}
              </button>
            ))}
          </div>
        </div>

        <Area name="bio" label={copy.bio} />
        <Area name="qualifications" label={copy.qualifications} />

        <div className="sm:col-span-2 grid gap-5 sm:grid-cols-3">
          <FileUpload
            label={copy.certs}
            value={certificatesUrl}
            onChange={setCertificatesUrl}
            accept={ACCEPT_FILE}
          />
          <FileUpload
            label={copy.photo}
            value={photoUrl}
            onChange={setPhotoUrl}
            accept={ACCEPT_IMAGE}
          />
          <FileUpload
            label={copy.clinicLogo}
            value={logoUrl}
            onChange={setLogoUrl}
            accept={ACCEPT_IMAGE}
          />
        </div>

        <Button
          disabled={loading}
          className="sm:col-span-2 gradient-hero text-brand-foreground shadow-brand"
        >
          {loading ? copy.sending : copy.submit}
        </Button>
      </form>
    </MarketingLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  dir?: string;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input name={name} type={type} required={required} dir={dir} className="mt-1.5" />
    </div>
  );
}
function Area({ label, name }: { label: string; name: string }) {
  return (
    <div className="sm:col-span-2">
      <Label>{label}</Label>
      <Textarea name={name} rows={3} className="mt-1.5" />
    </div>
  );
}
function FileUpload({
  label,
  value,
  onChange,
  accept,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accept: string;
}) {
  return (
    <div>
      <ImageUpload
        label={label}
        value={value}
        onChange={onChange}
        folder="applications"
        accept={accept}
      />
    </div>
  );
}
