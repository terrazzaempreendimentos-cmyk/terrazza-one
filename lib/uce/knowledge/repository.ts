import type { UCEKnowledgeItem } from "./types";
import { terrazzaCommercialKnowledge } from "./commercial/terrazza";
import { realEstateLegalKnowledge } from "./legal/realEstate";
import { terrazzaScriptKnowledge } from "./scripts/terrazza";
import { bairrosMaceio, cidadesAlagoas } from "./territorial";

const territorialKnowledge: UCEKnowledgeItem[] = [
  ...bairrosMaceio.map<UCEKnowledgeItem>((bairro) => ({
    id: `territorial-maceio-${bairro.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    title: `Perfil territorial: ${bairro.nome}`,
    category: "bairros",
    content: [
      bairro.perfil,
      `Uso comercial: ${bairro.usoComercial}`,
      `Observacoes: ${bairro.observacoes}`,
      `Nivel de demanda: ${bairro.nivelDemanda}.`,
      `Perfil publico: ${bairro.perfilPublico}.`,
      `Adequado para: ${bairro.adequadoPara.join(", ")}.`,
    ].join(" "),
    tags: [
      "maceio",
      "bairro",
      bairro.nome,
      bairro.cidade,
      bairro.estado,
      bairro.nivelDemanda,
      bairro.perfilPublico,
      ...bairro.tags,
      ...bairro.adequadoPara,
    ],
    priority: bairro.nivelDemanda === "alta" ? 85 : bairro.nivelDemanda === "media" ? 70 : 55,
    domain: "real_estate",
    source: {
      id: "territorial-maceio",
      title: "Base Territorial Maceio",
      type: "manual",
    },
    active: true,
  })),
  ...cidadesAlagoas.map<UCEKnowledgeItem>((cidade) => ({
    id: `territorial-alagoas-${cidade.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    title: `Perfil territorial: ${cidade.nome}`,
    category: "territorial",
    content: [
      cidade.perfil,
      `Uso comercial: ${cidade.usoComercial}`,
      `Observacoes: ${cidade.observacoes}`,
      `Nivel de demanda: ${cidade.nivelDemanda}.`,
      `Perfil publico: ${cidade.perfilPublico}.`,
      `Adequado para: ${cidade.adequadoPara.join(", ")}.`,
    ].join(" "),
    tags: [
      "alagoas",
      "cidade",
      cidade.nome,
      cidade.estado,
      cidade.nivelDemanda,
      cidade.perfilPublico,
      ...cidade.tags,
      ...cidade.adequadoPara,
    ],
    priority: cidade.nivelDemanda === "alta" ? 85 : cidade.nivelDemanda === "media" ? 70 : 55,
    domain: "real_estate",
    source: {
      id: "territorial-alagoas",
      title: "Base Territorial Alagoas",
      type: "manual",
    },
    active: true,
  })),
];

export const knowledgeItems: UCEKnowledgeItem[] = [
  ...terrazzaCommercialKnowledge,
  ...realEstateLegalKnowledge,
  ...terrazzaScriptKnowledge,
  ...territorialKnowledge,
];
