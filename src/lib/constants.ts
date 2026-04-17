// Provincias de España (orden alfabético)
export const PROVINCIAS_ES = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila",
  "Badajoz", "Baleares", "Barcelona", "Burgos",
  "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca",
  "Girona", "Granada", "Guadalajara", "Guipúzcoa",
  "Huelva", "Huesca",
  "Jaén",
  "La Coruña", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo",
  "Madrid", "Málaga", "Melilla", "Murcia",
  "Navarra",
  "Ourense",
  "Palencia", "Pontevedra",
  "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria",
  "Tarragona", "Teruel", "Toledo",
  "Valencia", "Valladolid", "Vizcaya",
  "Zamora", "Zaragoza",
] as const;

export const CURSOS = [
  { value: "1ESO", label: "1º ESO" },
  { value: "2ESO", label: "2º ESO" },
  { value: "3ESO", label: "3º ESO" },
  { value: "4ESO", label: "4º ESO" },
] as const;

export const LETRAS = ["A", "B", "C", "D", "E", "F"] as const;

// Genera años escolares: el actual y los 4 anteriores
export function generarAniosEscolares(): string[] {
  const hoy = new Date();
  const year = hoy.getMonth() >= 8 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  const lista: string[] = [];
  for (let i = 0; i < 5; i++) {
    const y = year - i;
    lista.push(`${y}/${String((y + 1) % 100).padStart(2, "0")}`);
  }
  return lista;
}

// Escala Omni-Res (0-10)
export const OMNI_RES = [
  { val: 0, label: "Extremadamente fácil" },
  { val: 1, label: "Muy fácil" },
  { val: 2, label: "Fácil" },
  { val: 3, label: "Algo fácil" },
  { val: 4, label: "Moderado" },
  { val: 5, label: "Algo duro" },
  { val: 6, label: "Duro" },
  { val: 7, label: "Bastante duro" },
  { val: 8, label: "Muy duro" },
  { val: 9, label: "Extremadamente duro" },
  { val: 10, label: "Esfuerzo máximo" },
] as const;
