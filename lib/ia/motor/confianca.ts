import type { CampoConfianca, ExtractedInfo, LeadContext } from "./tipos";

const camposMonitorados: Array<{ campo: keyof LeadContext; label: string }> = [
  { campo: "cidade", label: "Cidade" },
  { campo: "bairro", label: "Bairro" },
  { campo: "tipoImovel", label: "Tipo" },
  { campo: "valor", label: "Valor" },
  { campo: "quartos", label: "Quartos" },
  { campo: "pet", label: "Pet" },
  { campo: "financiamento", label: "Financiamento" },
  { campo: "urgencia", label: "Urgencia" },
  { campo: "objetivo", label: "Objetivo" },
  { campo: "documentacao", label: "Documentacao" },
];

function valorTexto(valor: LeadContext[keyof LeadContext]) {
  if (valor === null || valor === undefined || valor === "") return "Nao informado";
  if (typeof valor === "boolean") return valor ? "Sim" : "Nao";

  return String(valor);
}

export function calcularConfiancaCampos(
  contexto: LeadContext,
  informacoesExtraidas: ExtractedInfo = {},
): CampoConfianca[] {
  return camposMonitorados.map(({ campo, label }) => {
    const valor = contexto[campo];
    const preenchido = valor !== null && valor !== undefined && valor !== "";
    const extraidoNoTurno = Object.prototype.hasOwnProperty.call(
      informacoesExtraidas,
      campo,
    );

    if (!preenchido) {
      return {
        campo,
        label,
        valor: "Nao informado",
        confianca: 20,
        origem: "vazio",
      };
    }

    return {
      campo,
      label,
      valor: valorTexto(valor),
      confianca: extraidoNoTurno ? 94 : 86,
      origem: "informado",
    };
  });
}
