import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AddressFields } from "../../../components/AddressFields";
import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import {
  ImovelSaveButton,
  ImovelUniqueForm,
  type SalvarImovelState,
} from "../../../components/ImovelUniqueForm";
import {
  requireCorretorPessoaId,
  requirePermission,
  requireRole,
  type AccessProfile,
} from "../../../lib/auth/access-profile";
import { requirePagePermission } from "../../../lib/auth/page-permission";
import { hasPapel } from "../../../lib/crm/pessoas/papeis";
import { createClient } from "../../../lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

type PessoaProprietario = {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  email: string | null;
  papeis: string[] | null;
};

type Corretor = {
  id: string;
  nome: string;
};

type ImovelProprietario = {
  id: string;
  imovel_id: string;
  pessoa_id: string;
  percentual_participacao: number | string | null;
  contato_principal: boolean | null;
  observacoes: string | null;
  pessoa:
    | {
        id: string;
        nome: string;
      }
    | Array<{
        id: string;
        nome: string;
      }>
    | null;
};

type Imovel = {
  id: string;
  proprietario_id?: string | null;
  codigo?: string | null;
  titulo?: string | null;
  tipo?: string | null;
  subtipo?: string | null;
  finalidade?: string | null;
  status?: string | null;
  situacao?: string | null;
  responsavel_id?: string | null;
  responsavel_pessoa_id?: string | null;
  origem?: string | null;
  data_captacao?: string | null;
  exclusividade?: boolean | null;
  observacoes?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  google_maps?: string | null;
  valor_venda?: number | string | null;
  valor_locacao?: number | string | null;
  aluguel_pretendido?: number | string | null;
  valor_condominio?: number | string | null;
  valor_iptu?: number | string | null;
  taxa_bombeiro?: number | string | null;
  taxa_administracao?: number | string | null;
  comissao_venda?: number | string | null;
  comissao_locacao?: number | string | null;
  valor_minimo_aceito?: number | string | null;
  valor_ideal?: number | string | null;
  valor_anunciado?: number | string | null;
  area_total?: number | string | null;
  area_util?: number | string | null;
  area_construida?: number | string | null;
  metragem?: number | string | null;
  dormitorios?: number | string | null;
  quartos?: number | string | null;
  suites?: number | string | null;
  banheiros?: number | string | null;
  lavabos?: number | string | null;
  garagens?: number | string | null;
  garagem?: boolean | null;
  andar?: number | string | null;
  elevadores?: number | string | null;
  ano_construcao?: number | string | null;
  piscina?: boolean | null;
  academia?: boolean | null;
  varanda?: boolean | null;
  varanda_gourmet?: boolean | null;
  sacada?: boolean | null;
  churrasqueira?: boolean | null;
  energia_solar?: boolean | null;
  mobiliado?: boolean | null;
  aceita_pet?: boolean | null;
  ar_condicionado?: boolean | null;
  portaria?: boolean | null;
  condominio_fechado?: boolean | null;
  vista_mar?: boolean | null;
  frente_mar?: boolean | null;
  beira_lago?: boolean | null;
  acessibilidade?: boolean | null;
  matricula?: string | null;
  cartorio?: string | null;
  iptu_documento?: string | null;
  habite_se?: string | null;
  escritura?: string | null;
  registro?: string | null;
  documentacao_completa?: boolean | null;
  pendencias_documentacao?: string | null;
  upload_pdf?: string | null;
  fotos?: string | null;
  videos?: string | null;
  tour_360?: string | null;
  drone?: string | null;
  planta?: string | null;
  thumbnail?: string | null;
  foto_principal?: string | null;
  ordenacao_midias?: string | null;
  portal_proprio?: boolean | null;
  site?: boolean | null;
  chaves_na_mao?: boolean | null;
  olx?: boolean | null;
  viva_real?: boolean | null;
  zap?: boolean | null;
  status_publicacao?: string | null;
  data_publicacao?: string | null;
  ultima_atualizacao_publicacao?: string | null;
  resumo_comercial?: string | null;
  resumo_tecnico?: string | null;
  perfil_ideal?: string | null;
  observacoes_ia?: string | null;
  score_comercial?: number | string | null;
  score_locacao?: number | string | null;
  liquidez?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const imoveisLeituraFields = `
  id,
  proprietario_id,
  codigo,
  titulo,
  tipo,
  subtipo,
  finalidade,
  status,
  situacao,
  responsavel_id,
  responsavel_pessoa_id,
  origem,
  data_captacao,
  exclusividade,
  observacoes,
  cep,
  endereco,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  latitude,
  longitude,
  google_maps,
  valor_venda,
  valor_locacao,
  aluguel_pretendido,
  valor_condominio,
  valor_iptu,
  taxa_bombeiro,
  taxa_administracao,
  comissao_venda,
  comissao_locacao,
  valor_minimo_aceito,
  valor_ideal,
  valor_anunciado,
  area_total,
  area_util,
  area_construida,
  metragem,
  dormitorios,
  quartos,
  suites,
  banheiros,
  lavabos,
  garagens,
  garagem,
  andar,
  elevadores,
  ano_construcao,
  piscina,
  academia,
  varanda,
  varanda_gourmet,
  sacada,
  churrasqueira,
  energia_solar,
  mobiliado,
  aceita_pet,
  ar_condicionado,
  portaria,
  condominio_fechado,
  vista_mar,
  frente_mar,
  beira_lago,
  acessibilidade,
  matricula,
  cartorio,
  iptu_documento,
  habite_se,
  escritura,
  registro,
  documentacao_completa,
  pendencias_documentacao,
  upload_pdf,
  fotos,
  videos,
  tour_360,
  drone,
  planta,
  thumbnail,
  foto_principal,
  ordenacao_midias,
  portal_proprio,
  site,
  chaves_na_mao,
  olx,
  viva_real,
  zap,
  status_publicacao,
  data_publicacao,
  ultima_atualizacao_publicacao,
  resumo_comercial,
  resumo_tecnico,
  perfil_ideal,
  observacoes_ia,
  score_comercial,
  score_locacao,
  liquidez,
  ativo,
  created_at,
  updated_at
`;

const imovelProprietariosLeituraFields = `
  id,
  imovel_id,
  pessoa_id,
  percentual_participacao,
  contato_principal,
  observacoes,
  pessoa:pessoas(id, nome)
`;

const imovelDuplicacaoFields = [
  "titulo",
  "tipo",
  "subtipo",
  "finalidade",
  "origem",
  "data_captacao",
  "exclusividade",
  "observacoes",
  "cep",
  "endereco",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado",
  "latitude",
  "longitude",
  "google_maps",
  "valor_venda",
  "valor_locacao",
  "aluguel_pretendido",
  "valor_condominio",
  "valor_iptu",
  "taxa_bombeiro",
  "taxa_administracao",
  "comissao_venda",
  "comissao_locacao",
  "valor_minimo_aceito",
  "valor_ideal",
  "valor_anunciado",
  "area_total",
  "area_util",
  "area_construida",
  "metragem",
  "dormitorios",
  "quartos",
  "suites",
  "banheiros",
  "lavabos",
  "garagens",
  "garagem",
  "andar",
  "elevadores",
  "ano_construcao",
  "piscina",
  "academia",
  "varanda",
  "varanda_gourmet",
  "sacada",
  "churrasqueira",
  "energia_solar",
  "mobiliado",
  "aceita_pet",
  "ar_condicionado",
  "portaria",
  "condominio_fechado",
  "vista_mar",
  "frente_mar",
  "beira_lago",
  "acessibilidade",
  "cartorio",
  "iptu_documento",
  "habite_se",
  "escritura",
  "registro",
  "documentacao_completa",
  "pendencias_documentacao",
  "upload_pdf",
  "fotos",
  "videos",
  "tour_360",
  "drone",
  "planta",
  "thumbnail",
  "foto_principal",
  "ordenacao_midias",
  "resumo_comercial",
  "resumo_tecnico",
  "perfil_ideal",
  "observacoes_ia",
  "score_comercial",
  "score_locacao",
  "liquidez",
] as const;

const imovelDuplicacaoSelect = imovelDuplicacaoFields.join(", ");

const abas = [
  ["dados", "Dados Gerais"],
  ["localizacao", "Localizacao"],
  ["proprietarios", "Proprietarios"],
  ["comercial", "Comercial"],
  ["financeiro", "Financeiro"],
  ["caracteristicas", "Caracteristicas"],
  ["documentacao", "Documentacao"],
  ["midia", "Fotos e Midia"],
  ["publicacao", "Publicacao"],
  ["relacionamentos", "Relacionamentos"],
  ["timeline", "Timeline"],
  ["manutencoes", "Manutencoes"],
  ["inteligencia", "Inteligencia"],
];

const caracteristicasBooleanas = [
  ["piscina", "Piscina"],
  ["academia", "Academia"],
  ["varanda", "Varanda"],
  ["varanda_gourmet", "Varanda gourmet"],
  ["sacada", "Sacada"],
  ["churrasqueira", "Churrasqueira"],
  ["energia_solar", "Energia solar"],
  ["mobiliado", "Mobiliado"],
  ["aceita_pet", "Aceita pet"],
  ["ar_condicionado", "Ar condicionado"],
  ["portaria", "Portaria"],
  ["condominio_fechado", "Condominio fechado"],
  ["vista_mar", "Vista mar"],
  ["frente_mar", "Frente mar"],
  ["beira_lago", "Beira lago"],
  ["acessibilidade", "Acessibilidade"],
];

const canaisPublicacao = [
  ["portal_proprio", "Portal proprio"],
  ["site", "Site"],
  ["chaves_na_mao", "Chaves na Mao"],
  ["olx", "OLX"],
  ["viva_real", "Viva Real"],
  ["zap", "Zap"],
];

const caracteristicasComplementares = [
  "Closet",
  "Escritorio",
  "Deposito",
  "Dependencia",
  "Despensa",
  "Lavanderia",
  "Home office",
  "Home theater",
  "Adega",
  "Area gourmet",
  "Jardim",
  "Quintal",
];

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

class ImovelValidationError extends Error {
  constructor(public readonly code: string) {
    super("Dados do imovel invalidos.");
    this.name = "ImovelValidationError";
  }
}

function textoObrigatorio(formData: FormData, campo: string) {
  const value = valorTexto(formData, campo);
  if (!value) throw new ImovelValidationError(`campo_${campo}`);
  return value;
}

function textoOpcional(formData: FormData, campo: string) {
  return valorTexto(formData, campo) || null;
}

function validarUuid(value: string, campo: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ImovelValidationError(`campo_${campo}`);
  }
  return value;
}

function uuidValido(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function uuidOpcional(formData: FormData, campo: string) {
  const value = textoOpcional(formData, campo);
  if (value === null) return null;
  return validarUuid(value, campo);
}

function dataOpcional(formData: FormData, campo: string) {
  const value = textoOpcional(formData, campo);
  if (value === null) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    throw new ImovelValidationError(`campo_${campo}`);
  }
  return value;
}

function timestamptzOpcional(formData: FormData, campo: string) {
  const value = textoOpcional(formData, campo);
  if (value === null) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new ImovelValidationError(`campo_${campo}`);
  return new Date(timestamp).toISOString();
}

function numeroOpcional(formData: FormData, campo: string) {
  const value = textoOpcional(formData, campo);
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new ImovelValidationError(`campo_${campo}`);
  return number;
}

function inteiroOpcional(formData: FormData, campo: string) {
  const value = numeroOpcional(formData, campo);
  if (value === null) return null;
  if (!Number.isInteger(value)) throw new ImovelValidationError(`campo_${campo}`);
  return value;
}

function valorBooleano(formData: FormData, campo: string) {
  return formData.get(campo) === "on";
}

function midiaSerializada(formData: FormData, campo: string) {
  return textoOpcional(formData, campo);
}

function normalizarTexto(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatarMoeda(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Sob consulta";

  const number = Number(value);
  if (!Number.isFinite(number)) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
}

function formatarData(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function textoPreenchido(value: string | null | undefined) {
  const texto = value?.trim();
  return texto ? texto : null;
}

function statusImovel(imovel: Imovel) {
  return imovel.status ?? imovel.situacao ?? "rascunho";
}

function valorLocacaoImovel(imovel: Imovel) {
  return imovel.valor_locacao ?? imovel.aluguel_pretendido ?? null;
}

function areaUtilImovel(imovel: Imovel) {
  return imovel.area_util ?? imovel.metragem ?? null;
}

function dormitoriosImovel(imovel: Imovel) {
  return imovel.dormitorios ?? imovel.quartos ?? null;
}

function garagensImovel(imovel: Imovel) {
  if (imovel.garagens !== null && imovel.garagens !== undefined) {
    return imovel.garagens;
  }

  if (imovel.garagem === true) return 1;
  if (imovel.garagem === false) return 0;

  return null;
}

function finalidadeImovel(imovel: Imovel) {
  if (imovel.finalidade !== null && imovel.finalidade !== undefined) {
    return imovel.finalidade;
  }

  const situacao = normalizarTexto(imovel.situacao).trim();
  if (["alugado", "locado", "locacao"].includes(situacao)) return "locacao";
  if (["vendido", "venda"].includes(situacao)) return "venda";

  return null;
}

function codigoImovel(imovel: Imovel) {
  return textoPreenchido(imovel.codigo) ?? "Sem codigo";
}

function valorPrincipal(imovel: Imovel) {
  return (
    imovel.valor_anunciado ??
    imovel.valor_venda ??
    valorLocacaoImovel(imovel) ??
    null
  );
}

function tituloImovel(imovel: Imovel) {
  const composicao = [imovel.tipo, imovel.bairro, imovel.cidade]
    .filter(Boolean)
    .join(" em ");

  return (
    textoPreenchido(imovel.titulo) ??
    textoPreenchido(imovel.complemento) ??
    textoPreenchido(composicao) ??
    "Imovel sem titulo"
  );
}

function contatoPessoa(pessoa: PessoaProprietario) {
  return pessoa.whatsapp || pessoa.celular || pessoa.telefone || "-";
}

function nomePessoaRelacionada(relacao: ImovelProprietario) {
  if (Array.isArray(relacao.pessoa)) {
    return relacao.pessoa[0]?.nome;
  }

  return relacao.pessoa?.nome;
}

function fieldValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function datetimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "" : timestamp.toISOString().slice(0, 16);
}

function inputClass() {
  return "rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]";
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#102A27]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={fieldValue(defaultValue)}
        placeholder={placeholder}
        className={inputClass()}
      />
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={fieldValue(defaultValue)}
        placeholder={placeholder}
        className={inputClass()}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#102A27]">
      {label}
      <select name={name} defaultValue={fieldValue(defaultValue)} className={inputClass()}>
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean | null;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm font-medium text-[#102A27]">
      <input
        name={name}
        type="checkbox"
        defaultChecked={Boolean(defaultChecked)}
        className="size-4 accent-[#C89B3C]"
      />
      {label}
    </label>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#071E36]">{title}</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await requirePagePermission("imoveis.visualizar");
  const corretorPessoaId = requireCorretorPessoaId(profile);
  const supabase = await createClient();

  const resolvedSearchParams = (await searchParams) ?? {};
  const editId = paramValue(resolvedSearchParams, "edit") ?? "";
  const viewId = paramValue(resolvedSearchParams, "view") ?? "";
  const busca = paramValue(resolvedSearchParams, "busca") ?? "";
  const filtroTipo = paramValue(resolvedSearchParams, "tipo") ?? "";
  const filtroFinalidade = paramValue(resolvedSearchParams, "finalidade") ?? "";
  const filtroStatus = paramValue(resolvedSearchParams, "status") ?? "";
  const filtroCidade = paramValue(resolvedSearchParams, "cidade") ?? "";
  const filtroBairro = paramValue(resolvedSearchParams, "bairro") ?? "";
  const filtroValorMin = paramValue(resolvedSearchParams, "valor_min") ?? "";
  const filtroValorMax = paramValue(resolvedSearchParams, "valor_max") ?? "";
  const filtroDormitorios = paramValue(resolvedSearchParams, "dormitorios") ?? "";
  const filtroGaragem = paramValue(resolvedSearchParams, "garagem") ?? "";
  const filtroPiscina = paramValue(resolvedSearchParams, "piscina") ?? "";
  const filtroPet = paramValue(resolvedSearchParams, "pet") ?? "";
  const filtroResponsavel = paramValue(resolvedSearchParams, "responsavel_id") ?? "";
  const errorCode = paramValue(resolvedSearchParams, "error") ?? "";

  if (editId && !uuidValido(editId)) {
    redirect("/dashboard/imoveis?error=imovel_invalido");
  }

  async function salvarImovel(formData: FormData): Promise<SalvarImovelState> {
    "use server";
    let actor: AccessProfile;
    try {
      actor = await requirePermission(formData.get("id") ? "imoveis.editar" : "imoveis.criar");
      requireCorretorPessoaId(actor);
    } catch {
      console.error("Falha de autorizacao ao salvar imovel.", {
        module: "imoveis.salvar",
        stage: "authorization",
        code: "not_authorized",
      });
      return {
        status: "erro",
        mensagem: "Voce nao possui permissao para realizar esta operacao.",
      };
    }

    let id: string | null;
    let payload: Record<string, string | number | boolean | null>;
    let pessoasProprietarias: string[];
    let proprietarios: Array<{
      pessoa_id: string;
      percentual_participacao: number | null;
      contato_principal: boolean;
      observacoes: string | null;
    }>;

    try {
      id = uuidOpcional(formData, "id");

      pessoasProprietarias = formData
        .getAll("proprietario_pessoa_ids")
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => validarUuid(value, "proprietario_pessoa_ids"));

      if (new Set(pessoasProprietarias).size !== pessoasProprietarias.length) {
        throw new ImovelValidationError("proprietario_duplicado");
      }

      if (!id && pessoasProprietarias.length === 0) {
        throw new ImovelValidationError("proprietario_obrigatorio");
      }

      const contatoPrincipalInformado = textoOpcional(
        formData,
        "contato_principal_pessoa_id",
      );
      const contatoPrincipalValido =
        contatoPrincipalInformado && pessoasProprietarias.includes(contatoPrincipalInformado)
          ? validarUuid(contatoPrincipalInformado, "contato_principal_pessoa_id")
          : pessoasProprietarias[0] ?? null;

      proprietarios = pessoasProprietarias.map((pessoaId) => {
        const percentual = numeroOpcional(formData, `percentual_${pessoaId}`);
        if (percentual !== null && (percentual < 0 || percentual > 100)) {
          throw new ImovelValidationError("percentual_proprietario");
        }

        return {
          pessoa_id: pessoaId,
          percentual_participacao: percentual,
          contato_principal: pessoaId === contatoPrincipalValido,
          observacoes: textoOpcional(formData, `observacoes_proprietario_${pessoaId}`),
        };
      });

      const totalContatosPrincipais = proprietarios.filter(
        (proprietario) => proprietario.contato_principal,
      ).length;
      if (proprietarios.length > 0 && totalContatosPrincipais !== 1) {
        throw new ImovelValidationError("contato_principal");
      }

      const codigo = id
        ? textoOpcional(formData, "codigo")
        : textoObrigatorio(formData, "codigo");
      const complemento = id
        ? textoOpcional(formData, "complemento")
        : textoObrigatorio(formData, "complemento");
      const tipo = id ? textoOpcional(formData, "tipo") : textoObrigatorio(formData, "tipo");
      const finalidade = id
        ? textoOpcional(formData, "finalidade")
        : textoObrigatorio(formData, "finalidade");
      const status = id
        ? textoOpcional(formData, "status")
        : textoObrigatorio(formData, "status");
      const cidade = id
        ? textoOpcional(formData, "cidade")
        : textoObrigatorio(formData, "cidade");
      const titulo = textoOpcional(formData, "titulo") ?? complemento;
      const valorLocacao = numeroOpcional(formData, "valor_locacao");
      const areaUtil = numeroOpcional(formData, "area_util");
      const dormitorios = inteiroOpcional(formData, "dormitorios");
      const garagens = inteiroOpcional(formData, "garagens");

      payload = {
        proprietario_id: null,
        codigo,
        titulo,
        tipo,
        subtipo: textoOpcional(formData, "subtipo"),
        finalidade,
        status,
        situacao: status,
        responsavel_pessoa_id:
          actor.papel === "corretor"
            ? actor.pessoaId
            : uuidOpcional(formData, "responsavel_pessoa_id"),
        origem: textoOpcional(formData, "origem") ?? "manual",
        data_captacao: dataOpcional(formData, "data_captacao"),
        exclusividade: valorBooleano(formData, "exclusividade"),
        observacoes: textoOpcional(formData, "observacoes"),
        cep: textoOpcional(formData, "cep"),
        endereco: textoOpcional(formData, "endereco"),
        numero: textoOpcional(formData, "numero"),
        complemento,
        bairro: textoOpcional(formData, "bairro"),
        cidade,
        estado: textoOpcional(formData, "estado"),
        latitude: numeroOpcional(formData, "latitude"),
        longitude: numeroOpcional(formData, "longitude"),
        google_maps: textoOpcional(formData, "google_maps"),
        valor_venda: numeroOpcional(formData, "valor_venda"),
        valor_locacao: valorLocacao,
        aluguel_pretendido: valorLocacao,
        valor_condominio: numeroOpcional(formData, "valor_condominio"),
        valor_iptu: numeroOpcional(formData, "valor_iptu"),
        taxa_bombeiro: numeroOpcional(formData, "taxa_bombeiro"),
        taxa_administracao: numeroOpcional(formData, "taxa_administracao"),
        comissao_venda: numeroOpcional(formData, "comissao_venda"),
        comissao_locacao: numeroOpcional(formData, "comissao_locacao"),
        valor_minimo_aceito: numeroOpcional(formData, "valor_minimo_aceito"),
        valor_ideal: numeroOpcional(formData, "valor_ideal"),
        valor_anunciado: numeroOpcional(formData, "valor_anunciado"),
        area_total: numeroOpcional(formData, "area_total"),
        area_util: areaUtil,
        area_construida: numeroOpcional(formData, "area_construida"),
        metragem: areaUtil,
        dormitorios,
        quartos: dormitorios,
        suites: inteiroOpcional(formData, "suites"),
        banheiros: inteiroOpcional(formData, "banheiros"),
        lavabos: inteiroOpcional(formData, "lavabos"),
        garagens,
        garagem: garagens !== null && garagens > 0,
        andar: inteiroOpcional(formData, "andar"),
        elevadores: inteiroOpcional(formData, "elevadores"),
        ano_construcao: inteiroOpcional(formData, "ano_construcao"),
        piscina: valorBooleano(formData, "piscina"),
        academia: valorBooleano(formData, "academia"),
        varanda: valorBooleano(formData, "varanda"),
        varanda_gourmet: valorBooleano(formData, "varanda_gourmet"),
        sacada: valorBooleano(formData, "sacada"),
        churrasqueira: valorBooleano(formData, "churrasqueira"),
        energia_solar: valorBooleano(formData, "energia_solar"),
        mobiliado: valorBooleano(formData, "mobiliado"),
        aceita_pet: valorBooleano(formData, "aceita_pet"),
        ar_condicionado: valorBooleano(formData, "ar_condicionado"),
        portaria: valorBooleano(formData, "portaria"),
        condominio_fechado: valorBooleano(formData, "condominio_fechado"),
        vista_mar: valorBooleano(formData, "vista_mar"),
        frente_mar: valorBooleano(formData, "frente_mar"),
        beira_lago: valorBooleano(formData, "beira_lago"),
        acessibilidade: valorBooleano(formData, "acessibilidade"),
        matricula: textoOpcional(formData, "matricula"),
        cartorio: textoOpcional(formData, "cartorio"),
        iptu_documento: textoOpcional(formData, "iptu_documento"),
        habite_se: textoOpcional(formData, "habite_se"),
        escritura: textoOpcional(formData, "escritura"),
        registro: textoOpcional(formData, "registro"),
        documentacao_completa: valorBooleano(formData, "documentacao_completa"),
        pendencias_documentacao: textoOpcional(formData, "pendencias_documentacao"),
        upload_pdf: midiaSerializada(formData, "upload_pdf"),
        fotos: midiaSerializada(formData, "fotos"),
        videos: midiaSerializada(formData, "videos"),
        tour_360: midiaSerializada(formData, "tour_360"),
        drone: midiaSerializada(formData, "drone"),
        planta: midiaSerializada(formData, "planta"),
        thumbnail: midiaSerializada(formData, "thumbnail"),
        foto_principal: midiaSerializada(formData, "foto_principal"),
        ordenacao_midias: midiaSerializada(formData, "ordenacao_midias"),
        portal_proprio: valorBooleano(formData, "portal_proprio"),
        site: valorBooleano(formData, "site"),
        chaves_na_mao: valorBooleano(formData, "chaves_na_mao"),
        olx: valorBooleano(formData, "olx"),
        viva_real: valorBooleano(formData, "viva_real"),
        zap: valorBooleano(formData, "zap"),
        status_publicacao:
          textoOpcional(formData, "status_publicacao") ?? "nao_publicado",
        data_publicacao: dataOpcional(formData, "data_publicacao"),
        ultima_atualizacao_publicacao: timestamptzOpcional(
          formData,
          "ultima_atualizacao_publicacao",
        ),
        resumo_comercial: textoOpcional(formData, "resumo_comercial"),
        resumo_tecnico: textoOpcional(formData, "resumo_tecnico"),
        perfil_ideal: textoOpcional(formData, "perfil_ideal"),
        observacoes_ia: textoOpcional(formData, "observacoes_ia"),
        score_comercial: inteiroOpcional(formData, "score_comercial"),
        score_locacao: inteiroOpcional(formData, "score_locacao"),
        liquidez: textoOpcional(formData, "liquidez"),
      };
    } catch (error) {
      if (error instanceof ImovelValidationError) {
        if (error.code === "proprietario_obrigatorio") {
          return {
            status: "erro",
            mensagem: "Selecione pelo menos um proprietário antes de salvar o imóvel.",
          };
        }

        if (
          error.code.startsWith("proprietario_") ||
          error.code === "percentual_proprietario" ||
          error.code === "contato_principal"
        ) {
          return {
            status: "erro",
            mensagem: "Revise os proprietarios e o contato principal informados.",
          };
        }

        return {
          status: "erro",
          mensagem: "Revise os campos obrigatorios e os valores informados.",
        };
      }

      console.error("Falha inesperada ao validar formulario de imovel.", {
        module: "imoveis.salvar",
        stage: "validation",
        code: error instanceof Error ? error.name : "unknown_error",
      });
      return {
        status: "erro",
        mensagem: "Nao foi possivel salvar o imovel. Tente novamente.",
      };
    }

    try {
      const supabase = await createClient();
      if (id && actor.papel === "corretor") {
        const ownership = await supabase
          .from("imoveis")
          .select("id")
          .eq("id", id)
          .eq("responsavel_pessoa_id", actor.pessoaId)
          .maybeSingle();
        if (ownership.error || !ownership.data) {
          return { status: "erro", mensagem: "Voce nao possui permissao para realizar esta operacao." };
        }
      }
      if (actor.papel === "corretor") {
        const propertyResult = id
          ? await supabase.from("imoveis").update(payload).eq("id", id).eq("responsavel_pessoa_id", actor.pessoaId).select("id").maybeSingle()
          : await supabase.from("imoveis").insert(payload).select("id").single();
        if (propertyResult.error || !propertyResult.data) {
          const code = propertyResult.error?.code ?? "missing_result";
          console.error("Falha na persistencia do imovel do Corretor.", { module: "imoveis.salvar", stage: "ownership_write", code });
          return { status: "erro", mensagem: code === "42501" ? "Voce nao possui permissao para realizar esta operacao." : "Nao foi possivel salvar o imovel. Tente novamente." };
        }

        const propertyId = propertyResult.data.id;
        const archiveRelations = await supabase.from("imovel_proprietarios").update({ ativo: false }).eq("imovel_id", propertyId).eq("ativo", true);
        if (archiveRelations.error) return { status: "erro", mensagem: "Nao foi possivel atualizar os proprietarios do imovel." };
        if (proprietarios.length > 0) {
          const relationResult = await supabase.from("imovel_proprietarios").insert(proprietarios.map((item) => ({ ...item, imovel_id: propertyId, ativo: true })));
          if (relationResult.error) return { status: "erro", mensagem: "Nao foi possivel atualizar os proprietarios do imovel." };
        }
      } else {
        const rpcPayload = { ...payload };
        delete rpcPayload.responsavel_pessoa_id;
        const { data: resultado, error } = await supabase.rpc(
          "salvar_imovel_com_proprietarios",
          {
            p_imovel_id: id,
            p_payload: rpcPayload,
            p_proprietarios: proprietarios,
          },
        );

        const resultadoRpc = Array.isArray(resultado) ? resultado[0] : null;
        const operacaoEsperada = id ? "editado" : "criado";
        if (
          error ||
          typeof resultadoRpc?.imovel_id !== "string" ||
          resultadoRpc?.operacao !== operacaoEsperada
        ) {
          const code = error?.code ?? "missing_result";
          console.error("Falha na RPC de persistencia do imovel.", {
            module: "imoveis.salvar",
            stage: "rpc",
            code,
          });

          const mensagem =
            code === "23505"
              ? "Codigo ou matricula ja cadastrados em outro imovel ativo."
              : code === "23503"
                ? "Um dos proprietarios ou relacionamentos informados e invalido."
                : code === "23514"
                  ? "Revise os dados do imovel e dos proprietarios."
                  : code === "42501"
                    ? "Voce nao possui permissao para realizar esta operacao."
                    : code === "P0001"
                      ? "Nao foi possivel validar o imovel e seus proprietarios."
                      : "Nao foi possivel salvar o imovel. Tente novamente.";

          return { status: "erro", mensagem };
        }
        const ownershipResult = await supabase
          .from("imoveis")
          .update({ responsavel_pessoa_id: payload.responsavel_pessoa_id })
          .eq("id", resultadoRpc.imovel_id);
        if (ownershipResult.error) {
          return { status: "erro", mensagem: "O imovel foi salvo, mas nao foi possivel associar o responsavel canonico." };
        }
      }
    } catch (error) {
      console.error("Falha inesperada na persistencia do imovel.", {
        module: "imoveis.salvar",
        stage: "rpc_unexpected",
        code: error instanceof Error ? error.name : "unknown_error",
      });
      return {
        status: "erro",
        mensagem: "Nao foi possivel salvar o imovel. Tente novamente.",
      };
    }

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
    redirect("/dashboard/imoveis");
  }

  async function excluirImovel(formData: FormData) {
    "use server";
    const actor = await requirePermission("imoveis.arquivar");
    const ownerId = requireCorretorPessoaId(actor);
    const supabase = await createClient();

    const id = valorTexto(formData, "id");
    if (!id) throw new Error("Imovel nao informado.");

    let archiveQuery = supabase
      .from("imoveis")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");
    if (ownerId) archiveQuery = archiveQuery.eq("responsavel_pessoa_id", ownerId);
    const { data, error } = await archiveQuery.maybeSingle();

    if (error || !data) throw new Error("Nao foi possivel excluir logicamente o imovel.");

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
  }

  async function duplicarImovel(formData: FormData) {
    "use server";
    await requirePermission("imoveis.criar");
    await requireRole("administrador", "gestor");
    const supabase = await createClient();

    let id: string | null;
    try {
      id = uuidOpcional(formData, "id");
    } catch (error) {
      if (error instanceof ImovelValidationError) {
        redirect("/dashboard/imoveis?error=imovel_invalido");
      }
      throw error;
    }
    if (!id) redirect("/dashboard/imoveis?error=imovel_invalido");

    const { data: original, error } = await supabase
      .from("imoveis")
      .select(imovelDuplicacaoSelect)
      .eq("id", id)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.error("Falha ao consultar imovel para duplicacao.", {
        module: "imoveis.duplicacao",
        stage: "consulta",
        code: error.code,
      });
      throw new Error("Nao foi possivel preparar a duplicacao do imovel.");
    }
    if (!original) redirect("/dashboard/imoveis?error=imovel_nao_encontrado");

    const originalImovel = original as unknown as Imovel;
    const originalPermitido = original as unknown as Record<string, unknown>;
    const clone: Record<string, unknown> = {};
    for (const field of imovelDuplicacaoFields) clone[field] = originalPermitido[field];

    clone.proprietario_id = null;
    clone.codigo = null;
    clone.matricula = null;
    clone.titulo = `${tituloImovel(originalImovel)} (copia)`;
    clone.complemento = originalImovel.complemento
      ? `${originalImovel.complemento} (copia)`
      : "Copia";
    clone.status = "rascunho";
    clone.situacao = "rascunho";
    clone.portal_proprio = false;
    clone.site = false;
    clone.chaves_na_mao = false;
    clone.olx = false;
    clone.viva_real = false;
    clone.zap = false;
    clone.status_publicacao = "nao_publicado";
    clone.data_publicacao = null;
    clone.ultima_atualizacao_publicacao = null;
    clone.ativo = true;

    const { error: insertError } = await supabase.from("imoveis").insert(clone);
    if (insertError) {
      console.error("Falha ao duplicar imovel.", {
        module: "imoveis.duplicacao",
        stage: "insert",
        code: insertError.code,
      });
      throw new Error("Nao foi possivel criar a copia do imovel.");
    }

    revalidatePath("/dashboard/imoveis");
    redirect("/dashboard/imoveis");
  }

  const [imoveisResult, pessoasResult, corretoresResult, relacoesResult] =
    await Promise.all([
      supabase
        .from("imoveis")
        .select(imoveisLeituraFields)
        .eq("ativo", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("pessoas")
        .select("id, nome, telefone, celular, whatsapp, email, papeis")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("pessoas")
        .select("id, nome")
        .eq("ativo", true)
        .contains("papeis", ["corretor"])
        .order("nome", { ascending: true }),
      supabase
        .from("imovel_proprietarios")
        .select(imovelProprietariosLeituraFields)
        .eq("ativo", true)
        .order("contato_principal", { ascending: false }),
    ]);

  if (relacoesResult.error) {
    console.error("Falha ao consultar vinculos ativos de proprietarios de imoveis.", {
      module: "imoveis.proprietarios",
      code: relacoesResult.error.code,
    });
  }

  if (imoveisResult.error) {
    console.error("Falha ao consultar imoveis.", {
      module: "imoveis.listagem",
      code: imoveisResult.error.code,
    });
  }

  const imoveis = (imoveisResult.data ?? []) as Imovel[];
  const imoveisAtivosParaValidacao = imoveis.map((imovel) => ({
    id: imovel.id,
    codigo: imovel.codigo ?? null,
    matricula: imovel.matricula ?? null,
  }));
  const pessoasProprietarias = ((pessoasResult.data ?? []) as PessoaProprietario[]).filter(
    (pessoa) => hasPapel(pessoa, "proprietario"),
  );
  const corretores = (corretoresResult.data ?? []) as Corretor[];
  const relacoes = (
    relacoesResult.error ? [] : (relacoesResult.data ?? [])
  ) as ImovelProprietario[];

  let imovelEmEdicao: Imovel | null = null;
  if (editId) {
    let editQuery = supabase
      .from("imoveis")
      .select(imoveisLeituraFields)
      .eq("id", editId)
      .eq("ativo", true);
    if (corretorPessoaId) editQuery = editQuery.eq("responsavel_pessoa_id", corretorPessoaId);
    const { data, error } = await editQuery.maybeSingle();

    if (error) {
      console.error("Falha ao consultar imovel para edicao.", {
        module: "imoveis.edicao",
        code: error.code,
      });
      redirect("/dashboard/imoveis?error=imovel_nao_encontrado");
    }

    if (!data) {
      redirect("/dashboard/imoveis?error=imovel_nao_encontrado");
    }

    imovelEmEdicao = data as Imovel;
  }

  const pessoasPorId = new Map(pessoasProprietarias.map((pessoa) => [pessoa.id, pessoa]));
  const corretoresPorId = new Map(corretores.map((corretor) => [corretor.id, corretor.nome]));

  const relacoesPorImovel = new Map<string, ImovelProprietario[]>();
  for (const relacao of relacoes) {
    const atuais = relacoesPorImovel.get(relacao.imovel_id) ?? [];
    relacoesPorImovel.set(relacao.imovel_id, [...atuais, relacao]);
  }

  const imoveisFiltrados = imoveis.filter((imovel) => {
    const valorImovel = Number(valorPrincipal(imovel));
    const valorMinimo = Number(filtroValorMin);
    const valorMaximo = Number(filtroValorMax);
    const dormitorios = Number(dormitoriosImovel(imovel) ?? 0);
    const garagens = Number(garagensImovel(imovel) ?? 0);
    const proprietarios = relacoesPorImovel
      .get(imovel.id)
      ?.map(
        (relacao) =>
          nomePessoaRelacionada(relacao) ?? pessoasPorId.get(relacao.pessoa_id)?.nome,
      )
      .filter(Boolean)
      .join(" ");
    const textoBusca = normalizarTexto(
      [
        imovel.codigo,
        imovel.complemento,
        imovel.titulo,
        imovel.tipo,
        imovel.bairro,
        imovel.cidade,
        statusImovel(imovel),
        finalidadeImovel(imovel),
        proprietarios,
        imovel.responsavel_pessoa_id ? corretoresPorId.get(imovel.responsavel_pessoa_id) : "",
      ].join(" "),
    );

    return (
      (!busca || textoBusca.includes(normalizarTexto(busca))) &&
      (!filtroTipo || imovel.tipo === filtroTipo) &&
      (!filtroFinalidade || finalidadeImovel(imovel) === filtroFinalidade) &&
      (!filtroStatus || statusImovel(imovel) === filtroStatus) &&
      (!filtroCidade || normalizarTexto(imovel.cidade).includes(normalizarTexto(filtroCidade))) &&
      (!filtroBairro || normalizarTexto(imovel.bairro).includes(normalizarTexto(filtroBairro))) &&
      (!filtroValorMin ||
        (Number.isFinite(valorImovel) &&
          Number.isFinite(valorMinimo) &&
          valorImovel >= valorMinimo)) &&
      (!filtroValorMax ||
        (Number.isFinite(valorImovel) &&
          Number.isFinite(valorMaximo) &&
          valorImovel <= valorMaximo)) &&
      (!filtroDormitorios || dormitorios >= Number(filtroDormitorios)) &&
      (!filtroGaragem ||
        (filtroGaragem === "sim" ? garagens > 0 : garagens === 0)) &&
      (!filtroPiscina ||
        (filtroPiscina === "sim" ? Boolean(imovel.piscina) : !imovel.piscina)) &&
      (!filtroPet ||
        (filtroPet === "sim" ? Boolean(imovel.aceita_pet) : !imovel.aceita_pet)) &&
      (!filtroResponsavel || imovel.responsavel_pessoa_id === filtroResponsavel)
    );
  });

  const imovelVisualizado = imoveis.find((imovel) => imovel.id === viewId) ?? null;
  const imovelParaHistorico = imovelEmEdicao ?? imovelVisualizado;
  const manutencoesHref = imovelParaHistorico
    ? `/dashboard/crm/manutencoes?imovel_id=${imovelParaHistorico.id}`
    : "/dashboard/crm/manutencoes";
  const relacoesEmEdicao = imovelEmEdicao
    ? relacoesPorImovel.get(imovelEmEdicao.id) ?? []
    : [];
  const proprietariosSelecionados = new Set(
    relacoesEmEdicao.map((relacao) => relacao.pessoa_id),
  );
  const contatoPrincipalSelecionado =
    relacoesEmEdicao.find((relacao) => relacao.contato_principal)?.pessoa_id ?? "";
  const mensagemErro =
    errorCode === "codigo_duplicado"
      ? "Ja existe um imovel ativo cadastrado com este codigo."
      : errorCode === "matricula_duplicada"
        ? "Ja existe um imovel ativo cadastrado com esta matricula."
        : errorCode === "unicidade_indice"
          ? "Nao foi possivel salvar. Codigo ou matricula ja cadastrado em outro imovel ativo."
          : errorCode === "imovel_nao_encontrado"
            ? "O imovel informado nao existe ou nao esta ativo."
            : errorCode === "imovel_invalido"
              ? "O imovel informado e invalido."
              : errorCode === "proprietario_obrigatorio"
                ? "Selecione ao menos um proprietario."
                : errorCode === "relacionamento_invalido"
                  ? "Um dos proprietarios ou relacionamentos informados e invalido."
                  : errorCode === "dados_invalidos"
                    ? "Revise os dados do imovel e dos proprietarios."
                    : errorCode === "operacao_nao_autorizada"
                      ? "Voce nao possui permissao para realizar esta operacao."
                      : errorCode === "validacao_rpc"
                        ? "Nao foi possivel validar o imovel e seus proprietarios."
                        : errorCode === "erro_salvar"
                          ? "Nao foi possivel salvar o imovel. Tente novamente."
                          : errorCode.startsWith("proprietario_") ||
                              errorCode === "percentual_proprietario" ||
                              errorCode === "contato_principal"
                            ? "Revise os proprietarios e o contato principal informados."
                : errorCode.startsWith("campo_")
                  ? "Revise os campos obrigatorios e os valores informados."
                  : "";

  return (
    <main className="min-h-screen bg-[#F7F3ED] px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl border border-[#E8DDCB] bg-white px-4 py-2 text-sm font-medium text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          Voltar ao Dashboard
        </Link>

        <header className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <span className="rounded-full border border-[#C89B3C]/35 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
              CRM Profissional
            </span>
            <h1 className="mt-5 text-4xl font-bold text-[#071E36]">Imoveis Premium</h1>
            <p className="mt-2 max-w-3xl text-[#64736D]">
              Cadastro imobiliario corporativo com pessoas como base de proprietarios,
              dados comerciais, documentais, midia, publicacao e inteligencia futura.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Total", imoveis.length],
              ["Filtrados", imoveisFiltrados.length],
              ["Pessoas", pessoasProprietarias.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#E8DDCB] bg-white px-4 py-3">
                <p className="text-2xl font-bold text-[#071E36]">{value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-[#E8DDCB] bg-white p-5 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-6">
            <input
              name="busca"
              defaultValue={busca}
              className={`${inputClass()} lg:col-span-2`}
              placeholder="Codigo, complemento, titulo, bairro, proprietario, responsavel..."
            />
            <input name="tipo" defaultValue={filtroTipo} className={inputClass()} placeholder="Tipo" />
            <input
              name="finalidade"
              defaultValue={filtroFinalidade}
              className={inputClass()}
              placeholder="Finalidade"
            />
            <input
              name="cidade"
              defaultValue={filtroCidade}
              className={inputClass()}
              placeholder="Cidade"
            />
            <input
              name="bairro"
              defaultValue={filtroBairro}
              className={inputClass()}
              placeholder="Bairro"
            />
            <select name="status" defaultValue={filtroStatus} className={inputClass()}>
              <option value="">Todos os status</option>
              {["rascunho", "ativo", "reservado", "vendido", "locado", "inativo"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              name="valor_min"
              type="number"
              defaultValue={filtroValorMin}
              className={inputClass()}
              placeholder="Valor min."
            />
            <input
              name="valor_max"
              type="number"
              defaultValue={filtroValorMax}
              className={inputClass()}
              placeholder="Valor max."
            />
            <input
              name="dormitorios"
              type="number"
              min="0"
              defaultValue={filtroDormitorios}
              className={inputClass()}
              placeholder="Dormitorios"
            />
            <select name="garagem" defaultValue={filtroGaragem} className={inputClass()}>
              <option value="">Garagem</option>
              <option value="sim">Com garagem</option>
              <option value="nao">Sem garagem</option>
            </select>
            <select name="piscina" defaultValue={filtroPiscina} className={inputClass()}>
              <option value="">Piscina</option>
              <option value="sim">Com piscina</option>
              <option value="nao">Sem piscina</option>
            </select>
            <select name="pet" defaultValue={filtroPet} className={inputClass()}>
              <option value="">Pet</option>
              <option value="sim">Aceita pet</option>
              <option value="nao">Nao aceita pet</option>
            </select>
            <select
              name="responsavel_id"
              defaultValue={filtroResponsavel}
              className={`${inputClass()} lg:col-span-2`}
            >
              <option value="">Todos os responsaveis</option>
              {corretores.map((corretor) => (
                <option key={corretor.id} value={corretor.id}>
                  {corretor.nome}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
            >
              Buscar
            </button>
            <Link
              href="/dashboard/imoveis"
              className="rounded-xl border border-[#E8DDCB] bg-white px-5 py-3 text-center text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
            >
              Limpar
            </Link>
          </form>
        </section>

        {imovelVisualizado ? (
          <section className="mt-8 rounded-2xl border border-[#C89B3C]/35 bg-[#071E36] p-6 text-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E4C478]">
                  Visualizacao
                </p>
                <h2 className="mt-2 text-2xl font-bold">{tituloImovel(imovelVisualizado)}</h2>
                <p className="mt-2 text-sm text-white/75">
                  {imovelVisualizado.bairro || "-"} · {imovelVisualizado.cidade || "-"} ·{" "}
                  {formatarMoeda(valorPrincipal(imovelVisualizado))}
                </p>
              </div>
              <Link
                href="/dashboard/imoveis"
                className="h-fit rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Fechar
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                ["Codigo", codigoImovel(imovelVisualizado)],
                ["Status", statusImovel(imovelVisualizado)],
                ["Finalidade", finalidadeImovel(imovelVisualizado) ?? "-"],
                ["Responsavel", corretoresPorId.get(imovelVisualizado.responsavel_pessoa_id ?? "") || "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#E4C478]">{label}</p>
                  <p className="mt-2 font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {imoveisResult.error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700 lg:col-span-3">
              Nao foi possivel carregar os imoveis. Tente novamente em instantes.
            </p>
          ) : imoveisFiltrados.length === 0 ? (
            <p className="rounded-2xl border border-[#E8DDCB] bg-white p-8 text-center text-sm text-[#64736D] lg:col-span-3">
              Nenhum imovel encontrado para os filtros atuais.
            </p>
          ) : (
            imoveisFiltrados.map((imovel) => {
              const relacoesDoImovel = relacoesPorImovel.get(imovel.id) ?? [];
              const proprietariosPessoa = relacoesDoImovel
                .map(
                  (relacao) =>
                    nomePessoaRelacionada(relacao) ??
                    pessoasPorId.get(relacao.pessoa_id)?.nome,
                )
                .filter((nome): nome is string => Boolean(nome));
              const proprietarioPrincipal =
                (proprietariosPessoa.length > 0
                  ? proprietariosPessoa.join(", ")
                  : null) ??
                "Proprietário não vinculado";
              const areaUtil = areaUtilImovel(imovel);
              const canMutate = profile.papel !== "corretor" || imovel.responsavel_pessoa_id === corretorPessoaId;
              const compartilharHref = `mailto:?subject=${encodeURIComponent(
                `Imovel ${textoPreenchido(imovel.codigo) ?? tituloImovel(imovel)}`,
              )}&body=${encodeURIComponent(
                `${tituloImovel(imovel)}\n${imovel.bairro || "-"} - ${
                  imovel.cidade || "-"
                }\nValor: ${formatarMoeda(valorPrincipal(imovel))}`,
              )}`;

              return (
                <article
                  key={imovel.id}
                  className="overflow-hidden rounded-2xl border border-[#E8DDCB] bg-white shadow-sm"
                >
                  <div className="flex aspect-[16/9] items-center justify-center bg-[#071E36] text-center text-sm font-semibold uppercase tracking-[0.18em] text-[#E4C478]">
                    {imovel.foto_principal ? "Foto principal" : "Imagem em breve"}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                          {codigoImovel(imovel)}
                        </p>
                        <h2 className="mt-2 line-clamp-2 text-lg font-bold text-[#071E36]">
                          {tituloImovel(imovel)}
                        </h2>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#64736D]">
                          Titulo: {textoPreenchido(imovel.titulo) ?? tituloImovel(imovel)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold text-[#8B6827]">
                        {statusImovel(imovel)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#64736D]">
                      {imovel.bairro || "-"} · {imovel.cidade || "-"}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-[#64736D] sm:grid-cols-2">
                      <span className="rounded-lg bg-[#F7F3ED] px-3 py-2">
                        <strong className="text-[#071E36]">Complemento:</strong>{" "}
                        {imovel.complemento || "-"}
                      </span>
                      <span className="rounded-lg bg-[#F7F3ED] px-3 py-2">
                        <strong className="text-[#071E36]">Matricula:</strong>{" "}
                        {imovel.matricula || "-"}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-[#071E36]">
                      {formatarMoeda(valorPrincipal(imovel))}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs text-[#64736D] sm:grid-cols-4">
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {imovel.tipo || "Tipo"}
                      </span>
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {dormitoriosImovel(imovel) ?? 0} dorm.
                      </span>
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {garagensImovel(imovel) ?? 0} vagas
                      </span>
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {areaUtil !== null ? `${areaUtil} m²` : "Area n/d"}
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] p-3 text-sm text-[#102A27]">
                      <p>
                        <strong>Proprietario:</strong> {proprietarioPrincipal}
                      </p>
                      <p>
                        <strong>Finalidade:</strong> {finalidadeImovel(imovel) ?? "-"}
                      </p>
                      <p>
                        <strong>Status:</strong> {statusImovel(imovel)}
                      </p>
                      <p>
                        <strong>Responsavel:</strong>{" "}
                        {corretoresPorId.get(imovel.responsavel_pessoa_id ?? "") || "-"}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/imoveis?view=${imovel.id}`}
                        className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
                      >
                        Visualizar
                      </Link>
                      {canMutate ? <Link
                        href={`/dashboard/imoveis?edit=${imovel.id}#dados`}
                        className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
                      >
                        Editar
                      </Link> : null}
                      {profile.papel !== "corretor" ? <form action={duplicarImovel}>
                        <input type="hidden" name="id" value={imovel.id} />
                        <button className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]">
                          Duplicar
                        </button>
                      </form> : null}
                      <Link
                        href={compartilharHref}
                        className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#8B6827] hover:bg-[#F7F3ED]"
                      >
                        Compartilhar
                      </Link>
                      {canMutate ? <form action={excluirImovel}>
                        <input type="hidden" name="id" value={imovel.id} />
                        <ConfirmSubmitButton
                          message="Confirmar exclusao logica deste imovel?"
                          className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </ConfirmSubmitButton>
                      </form> : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <nav className="sticky top-0 z-10 mt-10 flex gap-2 overflow-x-auto border-y border-[#E8DDCB] bg-[#F7F3ED]/95 py-3 backdrop-blur">
          {abas.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="whitespace-nowrap rounded-full border border-[#E8DDCB] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#071E36] hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
            >
              {label}
            </a>
          ))}
        </nav>

        {mensagemErro ? (
          <p className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {mensagemErro}
          </p>
        ) : null}

        <ImovelUniqueForm
          key={imovelEmEdicao?.id ?? "novo"}
          action={salvarImovel}
          className="mt-6 grid gap-6"
          currentId={imovelEmEdicao?.id ?? ""}
          imoveisAtivos={imoveisAtivosParaValidacao}
        >
          <input type="hidden" name="id" value={imovelEmEdicao?.id ?? ""} />

          <Section id="dados" title="Dados gerais">
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Codigo
              <input
                name="codigo"
                required={!imovelEmEdicao}
                defaultValue={fieldValue(imovelEmEdicao?.codigo)}
                className={inputClass()}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Complemento
              <input
                name="complemento"
                required={!imovelEmEdicao}
                defaultValue={fieldValue(imovelEmEdicao?.complemento)}
                className={inputClass()}
                placeholder="Apto 402, sala 12, casa principal..."
              />
            </label>
            <Field
              label="Titulo"
              name="titulo"
              defaultValue={imovelEmEdicao ? tituloImovel(imovelEmEdicao) : undefined}
            />
            <SelectField
              label="Tipo"
              name="tipo"
              defaultValue={imovelEmEdicao?.tipo}
              options={["apartamento", "casa", "studio", "sala", "terreno", "galpao"]}
            />
            <Field label="Subtipo" name="subtipo" defaultValue={imovelEmEdicao?.subtipo} />
            <SelectField
              label="Finalidade"
              name="finalidade"
              defaultValue={imovelEmEdicao ? finalidadeImovel(imovelEmEdicao) : undefined}
              options={["venda", "locacao", "temporada", "administracao", "investimento"]}
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue={imovelEmEdicao ? statusImovel(imovelEmEdicao) : undefined}
              options={["rascunho", "ativo", "reservado", "vendido", "locado", "inativo"]}
            />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Responsavel
              <select
                name="responsavel_pessoa_id"
                defaultValue={imovelEmEdicao?.responsavel_pessoa_id ?? ""}
                className={inputClass()}
              >
                <option value="">Sem responsavel</option>
                {corretores.map((corretor) => (
                  <option key={corretor.id} value={corretor.id}>
                    {corretor.nome}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Origem" name="origem" defaultValue={imovelEmEdicao?.origem} />
            <Field
              label="Data captacao"
              name="data_captacao"
              type="date"
              defaultValue={imovelEmEdicao?.data_captacao}
            />
            <CheckboxField
              label="Exclusividade"
              name="exclusividade"
              defaultChecked={imovelEmEdicao?.exclusividade}
            />
            <TextareaField
              label="Observacoes"
              name="observacoes"
              defaultValue={imovelEmEdicao?.observacoes}
              placeholder="Contexto comercial, condicoes do proprietario e observacoes internas."
            />
          </Section>

          <Section id="localizacao" title="Localizacao">
            <div className="md:col-span-3">
              <AddressFields
                complementoRequired={!imovelEmEdicao}
                defaultValues={{
                  cep: imovelEmEdicao?.cep,
                  endereco: imovelEmEdicao?.endereco,
                  numero: imovelEmEdicao?.numero,
                  bairro: imovelEmEdicao?.bairro,
                  cidade: imovelEmEdicao?.cidade,
                  estado: imovelEmEdicao?.estado,
                }}
                showComplemento={false}
              />
            </div>
            <Field label="Latitude" name="latitude" type="number" defaultValue={imovelEmEdicao?.latitude} />
            <Field label="Longitude" name="longitude" type="number" defaultValue={imovelEmEdicao?.longitude} />
            <Field label="Google Maps" name="google_maps" defaultValue={imovelEmEdicao?.google_maps} />
          </Section>

          <Section id="proprietarios" title="Proprietarios">
            <div className="md:col-span-3 grid gap-3">
              {pessoasProprietarias.length === 0 ? (
                <p className="rounded-xl bg-[#F7F3ED] p-4 text-sm text-[#64736D]">
                  Nenhuma pessoa com papel proprietario foi encontrada.
                </p>
              ) : (
                pessoasProprietarias.map((pessoa) => {
                  const relacao = relacoesEmEdicao.find((item) => item.pessoa_id === pessoa.id);
                  return (
                    <div
                      key={pessoa.id}
                      className="grid gap-3 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_1fr]"
                    >
                      <label className="flex items-start gap-3 text-sm text-[#102A27]">
                        <input
                          name="proprietario_pessoa_ids"
                          type="checkbox"
                          value={pessoa.id}
                          defaultChecked={proprietariosSelecionados.has(pessoa.id)}
                          className="mt-1 size-4 accent-[#C89B3C]"
                        />
                        <span>
                          <strong className="block text-[#071E36]">{pessoa.nome}</strong>
                          {contatoPessoa(pessoa)} · {pessoa.email || "sem email"}
                        </span>
                      </label>
                      <Field
                        label="Percentual"
                        name={`percentual_${pessoa.id}`}
                        type="number"
                        defaultValue={relacao?.percentual_participacao}
                      />
                      <label className="flex items-center gap-3 rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-sm font-medium text-[#102A27]">
                        <input
                          name="contato_principal_pessoa_id"
                          type="radio"
                          value={pessoa.id}
                          defaultChecked={contatoPrincipalSelecionado === pessoa.id}
                          className="size-4 accent-[#C89B3C]"
                        />
                        Contato principal
                      </label>
                      <Field
                        label="Observacoes"
                        name={`observacoes_proprietario_${pessoa.id}`}
                        defaultValue={relacao?.observacoes}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          <Section id="comercial" title="Comercial">
            <div className="md:col-span-3 grid gap-4 lg:grid-cols-3">
              {[
                [
                  "Posicionamento",
                  (imovelEmEdicao ? finalidadeImovel(imovelEmEdicao) : null) ??
                    "Defina a finalidade nos Dados Gerais.",
                  "Venda, locacao, temporada, administracao ou investimento.",
                ],
                [
                  "Disponibilidade",
                  imovelEmEdicao ? statusImovel(imovelEmEdicao) : "rascunho",
                  "Status comercial exibido na listagem e nos filtros operacionais.",
                ],
                [
                  "Responsavel",
                  corretoresPorId.get(imovelEmEdicao?.responsavel_pessoa_id ?? "") || "Sem responsavel",
                  "Corretor ou equipe responsavel pela captacao e andamento.",
                ],
              ].map(([title, value, description]) => (
                <div key={title} className="rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                    {title}
                  </p>
                  <p className="mt-3 text-lg font-bold text-[#071E36]">{value}</p>
                  <p className="mt-2 text-sm leading-6 text-[#64736D]">{description}</p>
                </div>
              ))}
            </div>
            <div className="md:col-span-3 rounded-2xl border border-[#E8DDCB] bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                Leitura comercial
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#64736D]">
                Esta aba separa a estrategia comercial dos valores financeiros. Use
                os campos de dados gerais para ajustar finalidade, status, origem,
                exclusividade e responsavel; o financeiro fica reservado para
                precificacao, taxas e comissoes.
              </p>
            </div>
          </Section>

          <Section id="financeiro" title="Financeiro">
            <Field label="Valor venda" name="valor_venda" type="number" defaultValue={imovelEmEdicao?.valor_venda} />
            <Field
              label="Valor locacao"
              name="valor_locacao"
              type="number"
              defaultValue={imovelEmEdicao ? valorLocacaoImovel(imovelEmEdicao) : undefined}
            />
            <Field label="Condominio" name="valor_condominio" type="number" defaultValue={imovelEmEdicao?.valor_condominio} />
            <Field label="IPTU" name="valor_iptu" type="number" defaultValue={imovelEmEdicao?.valor_iptu} />
            <Field label="Taxa bombeiro" name="taxa_bombeiro" type="number" defaultValue={imovelEmEdicao?.taxa_bombeiro} />
            <Field label="Taxa administracao" name="taxa_administracao" type="number" defaultValue={imovelEmEdicao?.taxa_administracao} />
            <Field label="Comissao venda" name="comissao_venda" type="number" defaultValue={imovelEmEdicao?.comissao_venda} />
            <Field label="Comissao locacao" name="comissao_locacao" type="number" defaultValue={imovelEmEdicao?.comissao_locacao} />
            <Field label="Valor minimo aceito" name="valor_minimo_aceito" type="number" defaultValue={imovelEmEdicao?.valor_minimo_aceito} />
            <Field label="Valor ideal" name="valor_ideal" type="number" defaultValue={imovelEmEdicao?.valor_ideal} />
            <Field label="Valor anunciado" name="valor_anunciado" type="number" defaultValue={imovelEmEdicao?.valor_anunciado} />
          </Section>

          <Section id="caracteristicas" title="Caracteristicas">
            <Field label="Area total" name="area_total" type="number" defaultValue={imovelEmEdicao?.area_total} />
            <Field
              label="Area util"
              name="area_util"
              type="number"
              defaultValue={imovelEmEdicao ? areaUtilImovel(imovelEmEdicao) : undefined}
            />
            <Field label="Area construida" name="area_construida" type="number" defaultValue={imovelEmEdicao?.area_construida} />
            <Field
              label="Dormitorios"
              name="dormitorios"
              type="number"
              defaultValue={imovelEmEdicao ? dormitoriosImovel(imovelEmEdicao) : undefined}
            />
            <Field label="Suites" name="suites" type="number" defaultValue={imovelEmEdicao?.suites} />
            <Field label="Banheiros" name="banheiros" type="number" defaultValue={imovelEmEdicao?.banheiros} />
            <Field label="Lavabos" name="lavabos" type="number" defaultValue={imovelEmEdicao?.lavabos} />
            <Field
              label="Garagens"
              name="garagens"
              type="number"
              defaultValue={imovelEmEdicao ? garagensImovel(imovelEmEdicao) : undefined}
            />
            <Field label="Andar" name="andar" type="number" defaultValue={imovelEmEdicao?.andar} />
            <Field label="Elevadores" name="elevadores" type="number" defaultValue={imovelEmEdicao?.elevadores} />
            <Field label="Ano construcao" name="ano_construcao" type="number" defaultValue={imovelEmEdicao?.ano_construcao} />
            <div className="grid gap-3 md:col-span-3 md:grid-cols-4">
              {caracteristicasBooleanas.map(([name, label]) => (
                <CheckboxField
                  key={name}
                  name={name}
                  label={label}
                  defaultChecked={Boolean(imovelEmEdicao?.[name as keyof Imovel])}
                />
              ))}
            </div>
            <div className="md:col-span-3 rounded-2xl border border-dashed border-[#C89B3C]/45 bg-[#FFFCF7] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B6827]">
                Caracteristicas complementares
              </p>
              <p className="mt-2 text-sm leading-6 text-[#64736D]">
                Itens preparados para a evolucao do modulo sem alterar o banco
                nesta sprint.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {caracteristicasComplementares.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[#E8DDCB] bg-white px-3 py-1 text-xs font-semibold text-[#071E36]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          <Section id="documentacao" title="Documentacao">
            <Field label="Matricula" name="matricula" defaultValue={imovelEmEdicao?.matricula} />
            <Field label="Cartorio" name="cartorio" defaultValue={imovelEmEdicao?.cartorio} />
            <Field label="IPTU documento" name="iptu_documento" defaultValue={imovelEmEdicao?.iptu_documento} />
            <Field label="Habite-se" name="habite_se" defaultValue={imovelEmEdicao?.habite_se} />
            <Field label="Escritura" name="escritura" defaultValue={imovelEmEdicao?.escritura} />
            <Field label="Registro" name="registro" defaultValue={imovelEmEdicao?.registro} />
            <CheckboxField
              label="Documentacao completa"
              name="documentacao_completa"
              defaultChecked={imovelEmEdicao?.documentacao_completa}
            />
            <Field label="Upload PDF" name="upload_pdf" defaultValue={imovelEmEdicao?.upload_pdf} />
            <TextareaField
              label="Pendencias"
              name="pendencias_documentacao"
              defaultValue={imovelEmEdicao?.pendencias_documentacao}
            />
          </Section>

          <Section id="midia" title="Midia">
            <Field label="Fotos" name="fotos" defaultValue={imovelEmEdicao?.fotos} />
            <Field label="Videos" name="videos" defaultValue={imovelEmEdicao?.videos} />
            <Field label="Tour 360" name="tour_360" defaultValue={imovelEmEdicao?.tour_360} />
            <Field label="Drone" name="drone" defaultValue={imovelEmEdicao?.drone} />
            <Field label="Planta" name="planta" defaultValue={imovelEmEdicao?.planta} />
            <Field label="Thumbnail" name="thumbnail" defaultValue={imovelEmEdicao?.thumbnail} />
            <Field label="Foto principal" name="foto_principal" defaultValue={imovelEmEdicao?.foto_principal} />
            <Field label="Ordenacao" name="ordenacao_midias" defaultValue={imovelEmEdicao?.ordenacao_midias} />
          </Section>

          <Section id="publicacao" title="Publicacao">
            <div className="grid gap-3 md:col-span-3 md:grid-cols-3">
              {canaisPublicacao.map(([name, label]) => (
                <CheckboxField
                  key={name}
                  name={name}
                  label={label}
                  defaultChecked={Boolean(imovelEmEdicao?.[name as keyof Imovel])}
                />
              ))}
            </div>
            <SelectField
              label="Status publicacao"
              name="status_publicacao"
              defaultValue={imovelEmEdicao?.status_publicacao}
              options={["nao_publicado", "em_revisao", "publicado", "pausado"]}
            />
            <Field
              label="Data publicacao"
              name="data_publicacao"
              type="date"
              defaultValue={imovelEmEdicao?.data_publicacao}
            />
            <Field
              label="Ultima atualizacao"
              name="ultima_atualizacao_publicacao"
              type="datetime-local"
              defaultValue={datetimeLocalValue(
                imovelEmEdicao?.ultima_atualizacao_publicacao,
              )}
            />
          </Section>

          <Section id="relacionamentos" title="Relacionamentos">
            <div className="md:col-span-3 grid gap-4 md:grid-cols-4">
              {["Interessados", "Visitas", "Propostas", "Corretores envolvidos"].map((label) => (
                <div key={label} className="rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] p-4">
                  <p className="text-sm font-semibold text-[#071E36]">{label}</p>
                  <p className="mt-2 text-xs text-[#64736D]">Modulo preparado para integracao futura.</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="timeline" title="Timeline">
            <div className="md:col-span-3 rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] p-5 text-sm text-[#64736D]">
              Visitas, alteracoes, publicacoes, manutencoes, contratos e UCE Memoria serao consolidados aqui nas proximas fases.
            </div>
          </Section>

          <Section id="manutencoes" title="Manutencoes">
            <div className="md:col-span-3 rounded-2xl border border-[#E8DDCB] bg-[#F7F3ED] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <span className="rounded-full border border-[#C89B3C]/35 bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6827]">
                    Historico do ano
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-[#071E36]">
                    Manutencoes e conflitos do imovel
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#64736D]">
                    Resumo preparado para acompanhar ocorrencias abertas,
                    resolvidas, criticas e reincidencias durante a administracao.
                  </p>
                </div>
                <Link
                  href={manutencoesHref}
                  className="inline-flex w-fit rounded-xl bg-[#071E36] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
                >
                  Abrir Manutencoes e Conflitos
                </Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {[
                  ["Manutencoes", "0"],
                  ["Conflitos", "0"],
                  ["Abertas", "0"],
                  ["Resolvidas", "0"],
                  ["Criticas", "0"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#E8DDCB] bg-white p-4">
                    <strong className="text-2xl font-bold text-[#071E36]">{value}</strong>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6827]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="inteligencia" title="Inteligencia">
            <TextareaField label="Resumo Comercial" name="resumo_comercial" defaultValue={imovelEmEdicao?.resumo_comercial} />
            <TextareaField label="Resumo Tecnico" name="resumo_tecnico" defaultValue={imovelEmEdicao?.resumo_tecnico} />
            <TextareaField label="Perfil Ideal" name="perfil_ideal" defaultValue={imovelEmEdicao?.perfil_ideal} />
            <TextareaField label="Observacoes IA" name="observacoes_ia" defaultValue={imovelEmEdicao?.observacoes_ia} />
            <Field label="Score Comercial" name="score_comercial" type="number" defaultValue={imovelEmEdicao?.score_comercial} />
            <Field label="Score Locacao" name="score_locacao" type="number" defaultValue={imovelEmEdicao?.score_locacao} />
            <Field label="Liquidez" name="liquidez" defaultValue={imovelEmEdicao?.liquidez} />
          </Section>

          <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-3 rounded-2xl border border-[#E8DDCB] bg-white/95 p-4 shadow-lg backdrop-blur">
            <Link
              href="/dashboard/imoveis"
              className="rounded-xl border border-[#E8DDCB] px-5 py-3 text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
            >
              Cancelar
            </Link>
            {imovelEmEdicao ? (
              <>
                <button
                  type="submit"
                  formAction={duplicarImovel}
                  className="rounded-xl border border-[#E8DDCB] px-5 py-3 text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
                >
                  Duplicar
                </button>
                <ConfirmSubmitButton
                  formAction={excluirImovel}
                  message="Confirmar exclusao logica deste imovel?"
                  className="rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Excluir
                </ConfirmSubmitButton>
              </>
            ) : null}
            <ImovelSaveButton
              className="rounded-xl bg-[#071E36] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
            >
              {imovelEmEdicao ? "Salvar alteracoes" : "Criar imovel"}
            </ImovelSaveButton>
          </div>
        </ImovelUniqueForm>

        <p className="mt-6 text-xs text-[#64736D]">
          Novos imoveis exigem codigo, complemento, tipo, finalidade, status e cidade.
          Proprietarios sao Pessoas com papel proprietario; matricula vazia continua
          opcional e, quando preenchida, possui validacao de unicidade.
        </p>
        <p className="mt-2 text-xs text-[#64736D]">
          Ultima atualizacao de publicacao: {formatarData(new Date().toISOString())}
        </p>
      </div>
    </main>
  );
}
