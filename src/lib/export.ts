export function exportTableAsExcel(filename: string, headers: string[], rows: unknown[][]) {
  const esc = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // أنماط مضمّنة (Excel يقرأ subset من CSS) — جدول نظيف: ترويسة بلون العلامة،
  // صفوف متبادلة الألوان، حدود خفيفة، اتجاه RTL، وخط عربي واضح.
  const headStyle =
    "background-color:#1d3fb3;color:#ffffff;font-weight:bold;font-size:13px;" +
    "padding:9px 12px;border:1px solid #16308c;text-align:center;white-space:nowrap;";
  const cellStyle = (alt: boolean) =>
    "padding:7px 12px;border:1px solid #d6def0;font-size:12px;text-align:right;" +
    `vertical-align:middle;background-color:${alt ? "#f3f7ff" : "#ffffff"};`;

  // BOM لدعم العربية في Excel + جدول HTML منسّق
  const html =
    "﻿<!doctype html><html xmlns:x=\"urn:schemas-microsoft-com:office:excel\">" +
    '<head><meta charset="utf-8" /><style>' +
    "table{border-collapse:collapse;font-family:'Segoe UI','Cairo','Arial',sans-serif;}" +
    "</style></head><body dir=\"rtl\">" +
    '<table dir="rtl" cellspacing="0" cellpadding="0">' +
    `<thead><tr>${headers.map((h) => `<th style="${headStyle}">${esc(h)}</th>`).join("")}</tr></thead>` +
    `<tbody>${rows
      .map(
        (row, i) =>
          `<tr>${row.map((c) => `<td style="${cellStyle(i % 2 === 1)}">${esc(c)}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename.endsWith(".xls") || filename.endsWith(".xlsx") ? filename : `${filename}.xls`;
  link.style.display = "none";
  document.body.appendChild(link); // ضروري لبعض المتصفحات (Firefox)
  link.click();
  // أخّر التنظيف لضمان بدء التحميل
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

export function flattenRows<T>(items: T[], mapper: (item: T) => unknown[]) {
  return items.map(mapper);
}
