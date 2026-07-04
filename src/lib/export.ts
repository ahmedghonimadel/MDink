export function exportTableAsExcel(filename: string, headers: string[], rows: unknown[][]) {
  const esc = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // BOM لدعم العربية في Excel + جدول HTML
  const html = `\ufeff<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers
    .map((header) => `<th>${esc(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
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
