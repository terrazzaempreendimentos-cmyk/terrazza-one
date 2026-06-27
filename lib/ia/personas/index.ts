import type { LeadContext } from "../motor/tipos";
import { CorretorSenior } from "./CorretorSenior";
import { EspecialistaAdministracao } from "./EspecialistaAdministracao";
import { EspecialistaAltoPadrao } from "./EspecialistaAltoPadrao";
import { EspecialistaInvestidor } from "./EspecialistaInvestidor";
import { EspecialistaLocacao } from "./EspecialistaLocacao";
import { EspecialistaPrimeiroImovel } from "./EspecialistaPrimeiroImovel";

export * from "./Base";
export { CorretorSenior } from "./CorretorSenior";
export { EspecialistaAdministracao } from "./EspecialistaAdministracao";
export { EspecialistaAltoPadrao } from "./EspecialistaAltoPadrao";
export { EspecialistaInvestidor } from "./EspecialistaInvestidor";
export { EspecialistaLocacao } from "./EspecialistaLocacao";
export { EspecialistaPrimeiroImovel } from "./EspecialistaPrimeiroImovel";

function objetivoInclui(contexto: LeadContext, termo: string) {
  return contexto.objetivo?.toLowerCase().includes(termo) ?? false;
}

export function selecionarPersona(contexto: LeadContext) {
  if ((contexto.valor ?? 0) > 5000) return EspecialistaAltoPadrao;

  if (
    contexto.tipoLead === "proprietario" ||
    objetivoInclui(contexto, "administracao") ||
    objetivoInclui(contexto, "captacao")
  ) {
    return EspecialistaAdministracao;
  }

  if (contexto.tipoLead === "inquilino" || objetivoInclui(contexto, "locacao")) {
    return EspecialistaLocacao;
  }

  if (objetivoInclui(contexto, "investidor")) {
    return EspecialistaInvestidor;
  }

  if (objetivoInclui(contexto, "compra") || contexto.tipoLead === "comprador") {
    return EspecialistaPrimeiroImovel;
  }

  return CorretorSenior;
}
