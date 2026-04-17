import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export interface EvidenciasData {
  autores: string;
  totalAlumnos: number;
  totalCentros: number;
  totalProfesores: number;
  totalPruebas: number;
  eurofit: any | null;
  cfs: any | null;
  antropometria: any | null;
  centros: Array<{ nombre: string; provincia: string | null; ciudad: string | null; anonimo: boolean; codigo_anonimo: string | null }>;
  capturaSelector?: string;
  urlPublica: string;
}

const fmt = (v: any, d = 2) => (v == null ? "—" : Number(v).toFixed(d));

export async function generarEvidenciasPDF(data: EvidenciasData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  // ============ PORTADA / CERTIFICADO ============
  doc.setFillColor(20, 50, 110);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(22);
  doc.text("Certificado de uso e impacto", pageW / 2, 28, { align: "center" });
  doc.setFontSize(12).setFont("helvetica", "normal");
  doc.text("Aplicación: Condición Física Adolescentes", pageW / 2, 40, { align: "center" });
  doc.setFontSize(10);
  doc.text("Eurofit + CFS · Investigación educativa en Educación Física", pageW / 2, 48, { align: "center" });

  doc.setTextColor(20, 30, 50);
  let y = 80;

  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text("Resumen ejecutivo", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal").setFontSize(10);
  const intro = doc.splitTextToSize(
    `La aplicación "Condición Física Adolescentes" es una plataforma digital desarrollada por ${data.autores} en colaboración con el grupo de investigación GIEPAFS (https://giepafs.net) para la evaluación de la condición física en alumnado de Educación Secundaria Obligatoria mediante las baterías Eurofit y CFS.

A fecha de ${today}, la plataforma ha sido utilizada por ${data.totalCentros} centro(s) educativo(s) y ${data.totalProfesores} docente(s), registrando ${data.totalAlumnos} alumno(s) y ${data.totalPruebas} resultados de pruebas físicas.`,
    pageW - 28,
  );
  doc.text(intro, 14, y);
  y += intro.length * 5 + 6;

  // Tarjetas de KPIs
  const kpiW = (pageW - 28 - 6) / 2;
  const kpis = [
    { label: "Centros adheridos", value: data.totalCentros },
    { label: "Profesores activos", value: data.totalProfesores },
    { label: "Alumnos evaluados", value: data.totalAlumnos },
    { label: "Resultados de pruebas", value: data.totalPruebas },
  ];
  kpis.forEach((k, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * (kpiW + 6);
    const yy = y + row * 26;
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(x, yy, kpiW, 22, 2, 2, "F");
    doc.setTextColor(20, 50, 110);
    doc.setFont("helvetica", "bold").setFontSize(20);
    doc.text(String(k.value), x + 6, yy + 12);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(80, 90, 110);
    doc.text(k.label, x + 6, yy + 18);
  });
  y += 60;

  // Certificación
  doc.setTextColor(20, 30, 50);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Certificación", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10);
  const cert = doc.splitTextToSize(
    `Por la presente se certifica que la aplicación es de autoría de ${data.autores} y se encuentra en uso activo con fines educativos y de investigación, recogiendo datos de forma anónima y conforme al RGPD.

Enlace permanente de verificación pública: ${data.urlPublica}`,
    pageW - 28,
  );
  doc.text(cert, 14, y);
  y += cert.length * 5 + 8;

  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(100);
  doc.text(`Documento generado automáticamente el ${today}`, 14, pageH - 14);
  doc.text(`${data.autores} · GIEPAFS`, pageW - 14, pageH - 14, { align: "right" });

  // ============ PÁG 2: ESTADÍSTICAS GLOBALES ============
  doc.addPage();
  y = 15;
  doc.setTextColor(20, 30, 50);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Estadísticas globales agregadas", 14, y);
  y += 4;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
  doc.text("Datos anonimizados · Medias y desviación típica del conjunto público", 14, y + 4);
  y += 12;
  doc.setTextColor(20, 30, 50);

  if (data.antropometria) {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Antropometría", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [20, 50, 110], textColor: 255 },
      styles: { fontSize: 9 },
      head: [["Variable", "Media", "DT"]],
      body: [
        ["IMC (kg/m²)", fmt(data.antropometria.imc), fmt(data.antropometria.imc_dt)],
        ["Envergadura (cm)", fmt(data.antropometria.env, 1), fmt(data.antropometria.env_dt, 1)],
        ["Biacromial (cm)", fmt(data.antropometria.bia, 1), fmt(data.antropometria.bia_dt, 1)],
        ["Long. pierna (cm)", fmt(data.antropometria.pierna, 1), fmt(data.antropometria.pierna_dt, 1)],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (data.eurofit) {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Batería Eurofit", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [20, 50, 110], textColor: 255 },
      styles: { fontSize: 9 },
      head: [["Prueba", "Media", "DT"]],
      body: [
        ["Wells (cm)", fmt(data.eurofit.wells, 1), fmt(data.eurofit.wells_dt, 1)],
        ["Salto vertical (cm)", fmt(data.eurofit.salto, 1), fmt(data.eurofit.salto_dt, 1)],
        ["Abdominales 60s", fmt(data.eurofit.abdo, 0), fmt(data.eurofit.abdo_dt, 1)],
        ["Lanzamiento hombros (m)", fmt(data.eurofit.lanz), fmt(data.eurofit.lanz_dt)],
        ["Sprint 50m (s)", fmt(data.eurofit.sprint), fmt(data.eurofit.sprint_dt)],
        ["Cooper (m)", fmt(data.eurofit.cooper, 0), fmt(data.eurofit.cooper_dt, 0)],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (data.cfs) {
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Batería CFS", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [255, 120, 30], textColor: 255 },
      styles: { fontSize: 9 },
      head: [["Prueba", "Media", "DT"]],
      body: [
        ["Thomas test", fmt(data.cfs.thomas, 1), fmt(data.cfs.thomas_dt, 1)],
        ["Biering-Sörensen (s)", fmt(data.cfs.biering, 1), fmt(data.cfs.biering_dt, 1)],
        ["Squat Jump (cm)", fmt(data.cfs.sj, 1), fmt(data.cfs.sj_dt, 1)],
        ["CMJ (cm)", fmt(data.cfs.cmj, 1), fmt(data.cfs.cmj_dt, 1)],
        ["Índice elástico (%)", fmt(data.cfs.ie, 1), fmt(data.cfs.ie_dt, 1)],
        ["Lanz. medicinal der (m)", fmt(data.cfs.lanz_der), fmt(data.cfs.lanz_der_dt)],
        ["Sprint 30m (s)", fmt(data.cfs.sprint30), fmt(data.cfs.sprint30_dt)],
        ["Rockport (min)", fmt(data.cfs.rockport, 1), fmt(data.cfs.rockport_dt, 1)],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ============ PÁG 3: CAPTURA DEL DASHBOARD PÚBLICO ============
  if (data.capturaSelector) {
    const el = document.querySelector(data.capturaSelector) as HTMLElement | null;
    if (el) {
      try {
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 1.5, windowWidth: 1280 });
        const img = canvas.toDataURL("image/png");
        doc.addPage();
        y = 15;
        doc.setFont("helvetica", "bold").setFontSize(14);
        doc.text("Captura del panel público de estadísticas", 14, y);
        y += 6;
        const maxW = pageW - 28;
        const maxH = pageH - y - 20;
        let w = maxW;
        let h = (canvas.height / canvas.width) * w;
        if (h > maxH) { h = maxH; w = (canvas.width / canvas.height) * h; }
        doc.addImage(img, "PNG", (pageW - w) / 2, y, w, h);
      } catch (e) {
        console.warn("No se pudo capturar dashboard", e);
      }
    }
  }

  // ============ PÁG: CENTROS ADHERIDOS ============
  doc.addPage();
  y = 15;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(`Centros adheridos (${data.centros.length})`, 14, y);
  y += 4;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(110);
  doc.text("Los centros marcados como anónimos figuran únicamente con su código de adhesión.", 14, y + 4);
  y += 10;
  doc.setTextColor(20, 30, 50);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [20, 50, 110], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["#", "Centro", "Provincia", "Ciudad"]],
    body: data.centros.length
      ? data.centros.map((c, i) => [
          i + 1,
          c.anonimo ? (c.codigo_anonimo ?? "—") : c.nombre,
          c.provincia ?? "—",
          c.anonimo ? "—" : (c.ciudad ?? "—"),
        ])
      : [["—", "Sin centros públicos aún", "—", "—"]],
  });

  // ============ PIE DE PÁGINA EN TODAS ============
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(130);
    doc.text(
      `Condición Física Adolescentes · ${data.autores} · GIEPAFS · Pág. ${i}/${total}`,
      pageW / 2, pageH - 6, { align: "center" },
    );
  }

  doc.save(`evidencias_uso_${new Date().toISOString().slice(0, 10)}.pdf`);
}
