import type { LeadContext, LeadTemperature } from "./tipos";
import { camposPendentes } from "./memoria";

function valorTexto(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "Não informado";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";

  return String(valor);
}

export function gerarBriefing({
  contexto,
  score,
  temperatura,
  sugestao,
}: {
  contexto: LeadContext;
  score: number;
  temperatura: LeadTemperature;
  sugestao: string;
}) {
  const pendencias = camposPendentes(contexto, [
    "bairro",
    "tipoImovel",
    "valor",
    "urgencia",
  ]);

  return [
    `Cliente ${contexto.tipoLead ?? "sem tipo definido"}.`,
    `Cidade: ${valorTexto(contexto.cidade)}`,
    `Bairro: ${valorTexto(contexto.bairro)}`,
    `Tipo de imóvel: ${valorTexto(contexto.tipoImovel)}`,
    `Valor: ${valorTexto(contexto.valor)}`,
    `Pet: ${valorTexto(contexto.pet)}`,
    `Mudança: ${valorTexto(contexto.prazoMudanca)}`,
    `Temperatura: ${temperatura}`,
    `Score: ${score}`,
    `Pendências: ${
      pendencias.length > 0 ? pendencias.join(", ") : "Sem pendências essenciais"
    }`,
    `Sugestão: ${sugestao}`,
  ].join("\n");
}
