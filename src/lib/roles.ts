// ============================================================
// MDink — تعريفات الأدوار وحقول كل دور
// مرجع مشترك للـ Role-Based Dashboards
// ============================================================

export type RoleKey =
  | "video_editor"
  | "graphic_designer"
  | "web_developer"
  | "moderator"
  | "content_writer"
  | "photographer"
  | "medical_reviewer"
  | "operations";

export type RoleDef = {
  key: RoleKey;
  label_ar: string;
  label_en: string;
  icon: string; // lucide icon name
  taskTypes: { value: string; ar: string; en: string }[];
  statuses: { value: string; ar: string; en: string }[];
};

const COMMON_STATUSES = [
  { value: "not_started", ar: "لم تبدأ", en: "Not started" },
  { value: "in_progress", ar: "قيد التنفيذ", en: "In progress" },
  { value: "waiting_review", ar: "بانتظار المراجعة", en: "Waiting review" },
  { value: "revision_required", ar: "تحتاج تعديل", en: "Revision required" },
  { value: "approved", ar: "معتمد", en: "Approved" },
  { value: "delivered", ar: "تم التسليم", en: "Delivered" },
  { value: "completed", ar: "مكتمل", en: "Completed" },
  { value: "cancelled", ar: "ملغي", en: "Cancelled" },
];

export const PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube", "WhatsApp", "Website"];

export const ROLES: Record<RoleKey, RoleDef> = {
  video_editor: {
    key: "video_editor",
    label_ar: "محرر فيديو",
    label_en: "Video Editor",
    icon: "Video",
    taskTypes: [
      { value: "reel", ar: "ريل", en: "Reel" },
      { value: "short", ar: "شورت", en: "Short" },
      { value: "long_video", ar: "فيديو طويل", en: "Long video" },
      { value: "ad_video", ar: "فيديو إعلاني", en: "Ad video" },
      { value: "testimonial", ar: "شهادة عميل", en: "Testimonial" },
      { value: "educational", ar: "فيديو تعليمي", en: "Educational video" },
    ],
    statuses: [
      { value: "not_started", ar: "لم تبدأ", en: "Not started" },
      { value: "in_progress", ar: "قيد التنفيذ", en: "In progress" },
      { value: "first_draft", ar: "مسودة أولى", en: "First draft" },
      { value: "revision_required", ar: "تحتاج تعديل", en: "Revision required" },
      { value: "approved", ar: "معتمد", en: "Approved" },
      { value: "delivered", ar: "تم التسليم", en: "Delivered" },
    ],
  },
  graphic_designer: {
    key: "graphic_designer",
    label_ar: "مصمم جرافيك",
    label_en: "Graphic Designer",
    icon: "Palette",
    taskTypes: [
      { value: "social_post", ar: "بوست سوشيال", en: "Social media post" },
      { value: "story", ar: "ستوري", en: "Story" },
      { value: "carousel", ar: "كاروسيل", en: "Carousel" },
      { value: "ad_creative", ar: "إعلان", en: "Ad creative" },
      { value: "logo", ar: "لوجو", en: "Logo" },
      { value: "brand_identity", ar: "هوية بصرية", en: "Brand identity" },
      { value: "website_banner", ar: "بانر موقع", en: "Website banner" },
      { value: "print", ar: "تصميم مطبوع", en: "Print design" },
    ],
    statuses: [
      { value: "not_started", ar: "لم تبدأ", en: "Not started" },
      { value: "in_progress", ar: "قيد التنفيذ", en: "In progress" },
      { value: "sent_for_review", ar: "أُرسل للمراجعة", en: "Sent for review" },
      { value: "revision_required", ar: "تحتاج تعديل", en: "Revision required" },
      { value: "approved", ar: "معتمد", en: "Approved" },
      { value: "delivered", ar: "تم التسليم", en: "Delivered" },
    ],
  },
  web_developer: {
    key: "web_developer",
    label_ar: "مطور / مصمم ويب",
    label_en: "Web Developer",
    icon: "Globe",
    taskTypes: [
      { value: "ui_design", ar: "تصميم واجهة", en: "UI Design" },
      { value: "frontend", ar: "فرونت إند", en: "Frontend" },
      { value: "backend", ar: "باك إند", en: "Backend" },
      { value: "cms_setup", ar: "إعداد CMS", en: "CMS setup" },
      { value: "seo_setup", ar: "إعداد SEO", en: "SEO setup" },
      { value: "bug_fix", ar: "إصلاح خطأ", en: "Bug fix" },
      { value: "deployment", ar: "نشر", en: "Deployment" },
      { value: "domain_setup", ar: "إعداد دومين", en: "Domain setup" },
      { value: "content_update", ar: "تحديث محتوى", en: "Content update" },
    ],
    statuses: [
      { value: "not_started", ar: "لم تبدأ", en: "Not started" },
      { value: "in_progress", ar: "قيد التنفيذ", en: "In progress" },
      { value: "waiting_client", ar: "بانتظار العميل", en: "Waiting client" },
      { value: "waiting_admin_review", ar: "بانتظار مراجعة الإدارة", en: "Waiting admin review" },
      { value: "revision_required", ar: "تحتاج تعديل", en: "Revision required" },
      { value: "deployed", ar: "تم النشر", en: "Deployed" },
      { value: "completed", ar: "مكتمل", en: "Completed" },
    ],
  },
  moderator: {
    key: "moderator",
    label_ar: "مودريتور",
    label_en: "Moderator",
    icon: "MessageCircle",
    taskTypes: [
      { value: "messages", ar: "رسائل", en: "Messages" },
      { value: "comments", ar: "تعليقات", en: "Comments" },
      { value: "reviews", ar: "تقييمات", en: "Reviews" },
      { value: "complaints", ar: "شكاوى", en: "Complaints" },
      { value: "booking_inquiry", ar: "استفسار حجز", en: "Booking inquiry" },
      { value: "lead_followup", ar: "متابعة عميل محتمل", en: "Lead follow-up" },
    ],
    statuses: [
      { value: "handled", ar: "تم التعامل", en: "Handled" },
      { value: "needs_followup", ar: "تحتاج متابعة", en: "Needs follow-up" },
      { value: "escalated", ar: "تم التصعيد", en: "Escalated" },
      { value: "closed", ar: "مغلقة", en: "Closed" },
    ],
  },
  content_writer: {
    key: "content_writer",
    label_ar: "كاتب محتوى",
    label_en: "Content Writer",
    icon: "Newspaper",
    taskTypes: [
      { value: "social_caption", ar: "كابشن سوشيال", en: "Social media caption" },
      { value: "blog_article", ar: "مقال مدونة", en: "Blog article" },
      { value: "website_copy", ar: "محتوى موقع", en: "Website copy" },
      { value: "reel_script", ar: "سكريبت ريل", en: "Reel script" },
      { value: "ad_copy", ar: "نص إعلان", en: "Ad copy" },
      { value: "medical_post", ar: "بوست طبي تعليمي", en: "Medical educational post" },
    ],
    statuses: [
      { value: "draft", ar: "مسودة", en: "Draft" },
      { value: "sent_for_review", ar: "أُرسل للمراجعة", en: "Sent for review" },
      { value: "revision_required", ar: "تحتاج تعديل", en: "Revision required" },
      { value: "approved", ar: "معتمد", en: "Approved" },
      { value: "scheduled", ar: "مجدول", en: "Scheduled" },
      { value: "published", ar: "منشور", en: "Published" },
    ],
  },
  photographer: {
    key: "photographer",
    label_ar: "مصور",
    label_en: "Photographer",
    icon: "Camera",
    taskTypes: [
      { value: "clinic_session", ar: "جلسة عيادة", en: "Clinic session" },
      { value: "doctor_portrait", ar: "بورتريه طبيب", en: "Doctor portrait" },
      { value: "reels_shooting", ar: "تصوير ريلز", en: "Reels shooting" },
      { value: "behind_scenes", ar: "كواليس", en: "Behind the scenes" },
      { value: "team_photos", ar: "صور الفريق", en: "Team photos" },
      { value: "product", ar: "منتج/معدات", en: "Product/equipment" },
    ],
    statuses: [
      { value: "scheduled", ar: "مجدولة", en: "Scheduled" },
      { value: "done", ar: "تمت", en: "Done" },
      { value: "uploaded_raw", ar: "رُفعت الملفات الخام", en: "Uploaded raw" },
      { value: "sent_to_editor", ar: "أُرسلت للمحرر", en: "Sent to editor" },
      { value: "delivered", ar: "تم التسليم", en: "Delivered" },
    ],
  },
  medical_reviewer: {
    key: "medical_reviewer",
    label_ar: "مراجع طبي",
    label_en: "Medical Reviewer",
    icon: "Stethoscope",
    taskTypes: [
      { value: "article_review", ar: "مراجعة مقال", en: "Article review" },
      { value: "caption_review", ar: "مراجعة كابشن", en: "Caption review" },
      { value: "script_review", ar: "مراجعة سكريبت", en: "Script review" },
    ],
    statuses: [
      { value: "waiting_review", ar: "بانتظار المراجعة", en: "Waiting review" },
      { value: "approved", ar: "معتمد", en: "Approved" },
      { value: "revision_required", ar: "يحتاج تعديل", en: "Changes requested" },
      { value: "rejected", ar: "مرفوض", en: "Rejected" },
    ],
  },
  operations: {
    key: "operations",
    label_ar: "عمليات",
    label_en: "Operations",
    icon: "Megaphone",
    taskTypes: [
      { value: "coordination", ar: "تنسيق", en: "Coordination" },
      { value: "client_meeting", ar: "اجتماع عميل", en: "Client meeting" },
      { value: "planning", ar: "تخطيط", en: "Planning" },
      { value: "reporting", ar: "تقارير", en: "Reporting" },
    ],
    statuses: COMMON_STATUSES,
  },
};

export const ALL_ROLES = Object.values(ROLES);

export const PRIORITIES = [
  { value: "low", ar: "منخفضة", en: "Low" },
  { value: "normal", ar: "عادية", en: "Normal" },
  { value: "high", ar: "عالية", en: "High" },
  { value: "urgent", ar: "عاجلة", en: "Urgent" },
];

export function roleLabel(key: string, locale: "ar" | "en") {
  const r = (ROLES as Record<string, RoleDef>)[key];
  if (!r) return key;
  return locale === "en" ? r.label_en : r.label_ar;
}

export function statusLabel(roleKey: string, statusValue: string, locale: "ar" | "en") {
  const r = (ROLES as Record<string, RoleDef>)[roleKey];
  const s = r?.statuses.find((x) => x.value === statusValue);
  if (!s) return statusValue;
  return locale === "en" ? s.en : s.ar;
}
