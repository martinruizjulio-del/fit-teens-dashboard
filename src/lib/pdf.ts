import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { NOMBRE_PRUEBA, PRUEBAS_EUROFIT, PRUEBAS_CFS, CATEGORIAS, formateaValor, valorParaBaremo, calcularEdad, type PruebaDef, type BateriaPersonalizada } from "./pruebas";

export interface InformeData {
  alumno: any;
  eurofit: any | null;
  cfs: any | null;
  notasEurofit: Record<string, number | null>;
  notasCfs: Record<string, number | null>;
  procedimientos?: Array<{ bateria: string; prueba: string; procedimiento_md: string; referencia_apa: string }>;
  radarSelector?: string; // CSS selector del radar a capturar
  bateriaPersonalizada?: BateriaPersonalizada | null;
}

export async function generarInformePDF(d: InformeData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Cabecera
  doc.setFillColor(20, 50, 110);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Informe de Condición Física", 14, 13);
  doc.setFontSize(10).setFont("helvetica", "normal");
  doc.text("Condición Física Adolescentes — Eurofit + CFS", 14, 20);
  doc.text(new Date().toLocaleDateString("es-ES"), pageW - 14, 20, { align: "right" });

  y = 36;
  doc.setTextColor(20, 30, 50);
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(`${d.alumno.nombre} ${d.alumno.apellidos}`, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10);
  const edad = calcularEdad(d.alumno.fecha_nacimiento);
  doc.text(
    `Sexo: ${d.alumno.sexo === "M" ? "Chico" : "Chica"}   |   Edad: ${edad} años   |   Aula: ${d.alumno.id_aula}   |   Código: ${d.alumno.codigo_acceso ?? "—"}`,
    14,
    y,
  );
  y += 8;

  // Antropometría
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Datos antropométricos", 14, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [20, 50, 110], textColor: 255 },
    styles: { fontSize: 9 },
    head: [["Peso (kg)", "Talla (m)", "IMC", "Envergadura (cm)", "Biacromial (cm)", "Biac.×1.5 (cm)", "Pierna (cm)"]],
    body: [[
      d.alumno.peso_kg ?? "—",
      d.alumno.talla_m ?? "—",
      d.alumno.imc ?? "—",
      d.alumno.envergadura_cm ?? "—",
      d.alumno.biacromial_cm ?? "—",
      d.alumno.biacromial_15_cm ?? "—",
      d.alumno.longitud_pierna_cm ?? "—",
    ]],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Eurofit
  if (d.eurofit) {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Batería Eurofit", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [20, 50, 110], textColor: 255 },
      styles: { fontSize: 9 },
      head: [["Prueba", "Resultado", "Nota /10", "Omni-Res /10"]],
      body: PRUEBAS_EUROFIT.map((p) => [
        NOMBRE_PRUEBA[p.prueba],
        formateaValor(p, d.eurofit),
        d.notasEurofit[p.prueba] ?? "—",
        d.eurofit[p.omniCampo] ?? "—",
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // CFS
  if (d.cfs) {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Batería CFS", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [255, 120, 30], textColor: 255 },
      styles: { fontSize: 9 },
      head: [["Prueba", "Resultado", "Nota /10", "Omni-Res /10"]],
      body: PRUEBAS_CFS.map((p) => [
        NOMBRE_PRUEBA[p.prueba],
        formateaValor(p, d.cfs),
        d.notasCfs[p.prueba] ?? "—",
        d.cfs[p.omniCampo] ?? "—",
      ]),
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    if (d.cfs.indice_elastico != null) {
      doc.setFont("helvetica", "italic").setFontSize(9);
      doc.text(`Índice elástico (CMJ-SJ)/SJ × 100 = ${d.cfs.indice_elastico}%`, 14, y);
      y += 6;
    }
  }

  // Batería personalizada
  if (d.bateriaPersonalizada) {
    if (y > 230) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.setTextColor(20, 30, 50);
    doc.text("Batería personalizada (configurada por el profesor)", 14, y);
    y += 2;
    const body: any[] = [];
    const notasBP: number[] = [];
    for (const cat of CATEGORIAS) {
      const optKey = d.bateriaPersonalizada[cat.key];
      if (!optKey) continue;
      const opt = cat.opciones.find((o) => o.key === optKey);
      if (!opt) continue;
      opt.pruebas.forEach((p, i) => {
        const reg = p.bateria === "eurofit" ? d.eurofit : d.cfs;
        const nota = (p.bateria === "eurofit" ? d.notasEurofit : d.notasCfs)[p.prueba];
        if (typeof nota === "number") notasBP.push(nota);
        body.push([
          i === 0 ? cat.label : "",
          NOMBRE_PRUEBA[p.prueba],
          p.bateria.toUpperCase(),
          reg ? formateaValor(p, reg) : "—",
          nota ?? "—",
        ]);
      });
    }
    autoTable(doc, {
      startY: y,
      theme: "striped",
      headStyles: { fillColor: [80, 50, 150], textColor: 255 },
      styles: { fontSize: 9 },
      head: [["Categoría", "Prueba", "Batería", "Resultado", "Nota /10"]],
      body,
    });
    y = (doc as any).lastAutoTable.finalY + 4;
    if (notasBP.length) {
      const media = (notasBP.reduce((a, b) => a + b, 0) / notasBP.length).toFixed(2);
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text(`Nota media batería personalizada: ${media}/10`, 14, y);
      y += 8;
    } else {
      y += 4;
    }
  }



  // Radar
  if (d.radarSelector) {
    const el = document.querySelector(d.radarSelector) as HTMLElement | null;
    if (el) {
      try {
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
        const img = canvas.toDataURL("image/png");
        if (y > 200) { doc.addPage(); y = 15; }
        doc.setFont("helvetica", "bold").setFontSize(11);
        doc.text("Perfil de notas (radar)", 14, y);
        y += 2;
        const w = 120;
        const h = (canvas.height / canvas.width) * w;
        doc.addImage(img, "PNG", (pageW - w) / 2, y, w, h);
        y += h + 6;
      } catch (e) {
        console.warn("No se pudo capturar el radar", e);
      }
    }
  }

  // Procedimientos
  if (d.procedimientos?.length) {
    doc.addPage();
    y = 15;
    doc.setFont("helvetica", "bold").setFontSize(13);
    doc.text("Anexo: Procedimientos y referencias", 14, y);
    y += 8;
    doc.setFontSize(9).setFont("helvetica", "normal");
    d.procedimientos.forEach((p) => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text(NOMBRE_PRUEBA[p.prueba] || p.prueba, 14, y);
      y += 5;
      doc.setFont("helvetica", "normal").setFontSize(9);
      const proc = doc.splitTextToSize(p.procedimiento_md.replace(/\*\*/g, ""), pageW - 28);
      doc.text(proc, 14, y);
      y += proc.length * 4 + 2;
      doc.setFont("helvetica", "italic");
      const ref = doc.splitTextToSize(p.referencia_apa, pageW - 28);
      doc.text(ref, 14, y);
      y += ref.length * 4 + 6;
      doc.setFont("helvetica", "normal");
    });
  }

  // Pie con marca de provisional
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(120);
    doc.text(
      `Baremos provisionales (Eurofit, Council of Europe 1988; ALPHA-Fitness, Ruiz et al. 2011) · Pág. ${i}/${total}`,
      pageW / 2, 290, { align: "center" },
    );
  }

  doc.save(`informe_${d.alumno.apellidos.split(" ")[0]}_${d.alumno.nombre}.pdf`);
}
