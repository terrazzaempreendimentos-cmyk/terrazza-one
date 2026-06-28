export type UCEEstiloDecisao =
  | "decidido"
  | "analitico"
  | "inseguro"
  | "comparador"
  | "urgente"
  | "consultivo"
  | "emocional"
  | "investidor";

export type UCEPerfilComportamental =
  | "comprador_primeiro_imovel"
  | "investidor"
  | "familia"
  | "alto_padrao"
  | "proprietario_rentista"
  | "proprietario_inseguro"
  | "inquilino_urgente"
  | "inquilino_consultivo"
  | "vendedor_motivado"
  | "vendedor_teste_mercado";

export type UCEPerfilRisco = "baixo" | "medio" | "alto";

export type UCESinalComportamental = {
  id: string;
  frase: string;
  descricao: string;
  peso: number;
  estiloDecisao?: UCEEstiloDecisao;
  perfil?: UCEPerfilComportamental;
  riscoPerda?: UCEPerfilRisco;
  urgencia?: "baixa" | "media" | "alta";
};

export type UCEPerfilRecomendacao = {
  id: string;
  titulo: string;
  texto: string;
  prioridade: "baixa" | "media" | "alta";
  perfil?: UCEPerfilComportamental;
  estiloDecisao?: UCEEstiloDecisao;
};

export type UCEPerfil = {
  perfilPrincipal: UCEPerfilComportamental;
  perfisSecundarios: UCEPerfilComportamental[];
  estiloDecisao: UCEEstiloDecisao;
  nivelUrgencia: "baixa" | "media" | "alta";
  riscoPerda: UCEPerfilRisco;
  recomendacoes: UCEPerfilRecomendacao[];
  sinaisDetectados: UCESinalComportamental[];
  resumoPerfil: string;
};
