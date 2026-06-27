import type { LeadContext } from "./tipos";

function valorPreenchido(valor: LeadContext[keyof LeadContext]) {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "string") return valor.trim().length > 0;

  return true;
}

export function atualizarContexto(
  contexto: LeadContext,
  novasInformacoes: Partial<LeadContext>,
) {
  return {
    ...contexto,
    ...novasInformacoes,
  };
}

export function possuiInformacao(contexto: LeadContext, campo: keyof LeadContext) {
  return valorPreenchido(contexto[campo]);
}

export function camposPendentes(
  contexto: LeadContext,
  campos: Array<keyof LeadContext> = [
    "tipoLead",
    "cidade",
    "bairro",
    "tipoImovel",
    "valor",
    "objetivo",
  ],
) {
  return campos.filter((campo) => !possuiInformacao(contexto, campo));
}

export function camposPreenchidos(contexto: LeadContext) {
  return (Object.keys(contexto) as Array<keyof LeadContext>).filter(
    (campo) =>
      campo !== "ultimaPerguntaCampo" &&
      campo !== "handoffReady" &&
      possuiInformacao(contexto, campo),
  );
}

export function resumoContexto(contexto: LeadContext) {
  const partes = [
    contexto.tipoLead ? `Tipo de lead: ${contexto.tipoLead}` : null,
    contexto.cidade ? `Cidade: ${contexto.cidade}` : null,
    contexto.bairro ? `Bairro: ${contexto.bairro}` : null,
    contexto.tipoImovel ? `Tipo de imovel: ${contexto.tipoImovel}` : null,
    contexto.valor ? `Valor: ${contexto.valor}` : null,
    contexto.objetivo ? `Objetivo: ${contexto.objetivo}` : null,
    contexto.urgencia ? `Urgencia: ${contexto.urgencia}` : null,
    contexto.documentacao !== null
      ? `Documentacao: ${contexto.documentacao ? "sim" : "nao"}`
      : null,
  ].filter(Boolean);

  return partes.length > 0 ? partes.join(" | ") : "Contexto ainda vazio.";
}
