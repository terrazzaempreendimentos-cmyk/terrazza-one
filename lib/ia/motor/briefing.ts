import { camposPendentes } from "./memoria";
import type { LeadContext, LeadTemperature } from "./tipos";

function valorTexto(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "Nao informado";
  if (typeof valor === "boolean") return valor ? "Sim" : "Nao";

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
    `Tipo de imovel: ${valorTexto(contexto.tipoImovel)}`,
    `Valor: ${valorTexto(contexto.valor)}`,
    `Pet: ${valorTexto(contexto.pet)}`,
    `Mudanca: ${valorTexto(contexto.prazoMudanca)}`,
    `Temperatura: ${temperatura}`,
    `Score: ${score}`,
    `Pendencias: ${
      pendencias.length > 0 ? pendencias.join(", ") : "Sem pendencias essenciais"
    }`,
    `Sugestao: ${sugestao}`,
  ].join("\n");
}
