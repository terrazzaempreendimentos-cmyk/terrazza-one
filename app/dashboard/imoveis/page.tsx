import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "../../../components/ConfirmSubmitButton";
import { hasPapel } from "../../../lib/crm/pessoas/papeis";
import { supabase } from "../../../lib/supabase";

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

type ProprietarioLegado = {
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
  responsavel_id?: string | null;
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
  condominio?: string | null;
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
  created_at?: string | null;
};

const abas = [
  ["dados", "Dados gerais"],
  ["localizacao", "Localizacao"],
  ["proprietarios", "Proprietarios"],
  ["financeiro", "Financeiro"],
  ["caracteristicas", "Caracteristicas"],
  ["documentacao", "Documentacao"],
  ["midia", "Midia"],
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

function paramValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function valorTexto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function valorNumero(formData: FormData, campo: string) {
  const value = valorTexto(formData, campo);
  if (!value) return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function valorBooleano(formData: FormData, campo: string) {
  return formData.get(campo) === "on";
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

function valorPrincipal(imovel: Imovel) {
  return (
    imovel.valor_anunciado ||
    imovel.valor_venda ||
    imovel.valor_locacao ||
    imovel.aluguel_pretendido ||
    null
  );
}

function tituloImovel(imovel: Imovel) {
  return (
    imovel.titulo ||
    [imovel.tipo, imovel.bairro, imovel.cidade].filter(Boolean).join(" em ") ||
    "Imovel sem titulo"
  );
}

function contatoPessoa(pessoa: PessoaProprietario) {
  return pessoa.whatsapp || pessoa.celular || pessoa.telefone || "-";
}

function fieldValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
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
  const filtroCondominio = paramValue(resolvedSearchParams, "condominio") ?? "";
  const filtroResponsavel = paramValue(resolvedSearchParams, "responsavel_id") ?? "";

  async function salvarImovel(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");
    const pessoasProprietarias = formData
      .getAll("proprietario_pessoa_ids")
      .map(String)
      .filter(Boolean);
    const proprietarioLegadoId = valorTexto(formData, "proprietario_legado_id");

    if (pessoasProprietarias.length === 0 && !proprietarioLegadoId) {
      throw new Error("Selecione ao menos um proprietario.");
    }

    const payload = {
      proprietario_id: proprietarioLegadoId || null,
      codigo: valorTexto(formData, "codigo") || null,
      titulo: valorTexto(formData, "titulo") || null,
      tipo: valorTexto(formData, "tipo") || null,
      subtipo: valorTexto(formData, "subtipo") || null,
      finalidade: valorTexto(formData, "finalidade") || null,
      status: valorTexto(formData, "status") || "rascunho",
      situacao: valorTexto(formData, "status") || "rascunho",
      responsavel_id: valorTexto(formData, "responsavel_id") || null,
      origem: valorTexto(formData, "origem") || "manual",
      data_captacao: valorTexto(formData, "data_captacao") || null,
      exclusividade: valorBooleano(formData, "exclusividade"),
      observacoes: valorTexto(formData, "observacoes") || null,
      cep: valorTexto(formData, "cep") || null,
      endereco: valorTexto(formData, "endereco") || null,
      numero: valorTexto(formData, "numero") || null,
      complemento: valorTexto(formData, "complemento") || null,
      bairro: valorTexto(formData, "bairro") || null,
      cidade: valorTexto(formData, "cidade") || null,
      estado: valorTexto(formData, "estado") || null,
      latitude: valorNumero(formData, "latitude"),
      longitude: valorNumero(formData, "longitude"),
      google_maps: valorTexto(formData, "google_maps") || null,
      condominio: valorTexto(formData, "condominio") || null,
      valor_venda: valorNumero(formData, "valor_venda"),
      valor_locacao: valorNumero(formData, "valor_locacao"),
      aluguel_pretendido: valorNumero(formData, "valor_locacao"),
      valor_condominio: valorNumero(formData, "valor_condominio"),
      valor_iptu: valorNumero(formData, "valor_iptu"),
      taxa_bombeiro: valorNumero(formData, "taxa_bombeiro"),
      taxa_administracao: valorNumero(formData, "taxa_administracao"),
      comissao_venda: valorNumero(formData, "comissao_venda"),
      comissao_locacao: valorNumero(formData, "comissao_locacao"),
      valor_minimo_aceito: valorNumero(formData, "valor_minimo_aceito"),
      valor_ideal: valorNumero(formData, "valor_ideal"),
      valor_anunciado: valorNumero(formData, "valor_anunciado"),
      area_total: valorNumero(formData, "area_total"),
      area_util: valorNumero(formData, "area_util"),
      area_construida: valorNumero(formData, "area_construida"),
      metragem: valorNumero(formData, "area_util"),
      dormitorios: valorNumero(formData, "dormitorios"),
      quartos: valorNumero(formData, "dormitorios"),
      suites: valorNumero(formData, "suites"),
      banheiros: valorNumero(formData, "banheiros"),
      lavabos: valorNumero(formData, "lavabos"),
      garagens: valorNumero(formData, "garagens"),
      garagem: Number(valorNumero(formData, "garagens") ?? 0) > 0,
      andar: valorNumero(formData, "andar"),
      elevadores: valorNumero(formData, "elevadores"),
      ano_construcao: valorNumero(formData, "ano_construcao"),
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
      matricula: valorTexto(formData, "matricula") || null,
      cartorio: valorTexto(formData, "cartorio") || null,
      iptu_documento: valorTexto(formData, "iptu_documento") || null,
      habite_se: valorTexto(formData, "habite_se") || null,
      escritura: valorTexto(formData, "escritura") || null,
      registro: valorTexto(formData, "registro") || null,
      documentacao_completa: valorBooleano(formData, "documentacao_completa"),
      pendencias_documentacao: valorTexto(formData, "pendencias_documentacao") || null,
      upload_pdf: valorTexto(formData, "upload_pdf") || null,
      fotos: valorTexto(formData, "fotos") || null,
      videos: valorTexto(formData, "videos") || null,
      tour_360: valorTexto(formData, "tour_360") || null,
      drone: valorTexto(formData, "drone") || null,
      planta: valorTexto(formData, "planta") || null,
      thumbnail: valorTexto(formData, "thumbnail") || null,
      foto_principal: valorTexto(formData, "foto_principal") || null,
      ordenacao_midias: valorTexto(formData, "ordenacao_midias") || null,
      portal_proprio: valorBooleano(formData, "portal_proprio"),
      site: valorBooleano(formData, "site"),
      chaves_na_mao: valorBooleano(formData, "chaves_na_mao"),
      olx: valorBooleano(formData, "olx"),
      viva_real: valorBooleano(formData, "viva_real"),
      zap: valorBooleano(formData, "zap"),
      status_publicacao: valorTexto(formData, "status_publicacao") || "nao_publicado",
      data_publicacao: valorTexto(formData, "data_publicacao") || null,
      ultima_atualizacao_publicacao:
        valorTexto(formData, "ultima_atualizacao_publicacao") || null,
      resumo_comercial: valorTexto(formData, "resumo_comercial") || null,
      resumo_tecnico: valorTexto(formData, "resumo_tecnico") || null,
      perfil_ideal: valorTexto(formData, "perfil_ideal") || null,
      observacoes_ia: valorTexto(formData, "observacoes_ia") || null,
      score_comercial: valorNumero(formData, "score_comercial"),
      score_locacao: valorNumero(formData, "score_locacao"),
      liquidez: valorTexto(formData, "liquidez") || null,
      ativo: true,
      updated_at: new Date().toISOString(),
    };

    const mutation = id
      ? supabase.from("imoveis").update(payload).eq("id", id).select("id").single()
      : supabase.from("imoveis").insert(payload).select("id").single();

    const { data: imovelSalvo, error } = await mutation;

    if (error || !imovelSalvo?.id) {
      throw new Error("Nao foi possivel salvar o imovel.");
    }

    const imovelId = imovelSalvo.id as string;

    await supabase
      .from("imovel_proprietarios")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("imovel_id", imovelId);

    if (pessoasProprietarias.length > 0) {
      const relacoes = pessoasProprietarias.map((pessoaId, index) => ({
        imovel_id: imovelId,
        pessoa_id: pessoaId,
        percentual_participacao: valorNumero(formData, `percentual_${pessoaId}`),
        contato_principal:
          valorTexto(formData, "contato_principal_pessoa_id") === pessoaId || index === 0,
        observacoes: valorTexto(formData, `observacoes_proprietario_${pessoaId}`) || null,
        ativo: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: relacoesError } = await supabase
        .from("imovel_proprietarios")
        .insert(relacoes);

      if (relacoesError) {
        throw new Error("Nao foi possivel salvar os proprietarios do imovel.");
      }
    }

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
    redirect("/dashboard/imoveis");
  }

  async function excluirImovel(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");
    if (!id) throw new Error("Imovel nao informado.");

    const { error } = await supabase
      .from("imoveis")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error("Nao foi possivel excluir logicamente o imovel.");

    revalidatePath("/dashboard/imoveis");
    revalidatePath("/dashboard");
  }

  async function duplicarImovel(formData: FormData) {
    "use server";

    const id = valorTexto(formData, "id");
    if (!id) throw new Error("Imovel nao informado.");

    const { data: original, error } = await supabase
      .from("imoveis")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !original) throw new Error("Nao foi possivel duplicar o imovel.");

    const clone = {
      ...(original as Record<string, unknown>),
      id: undefined,
      codigo: `${String((original as Imovel).codigo ?? "IMOVEL")}-COPIA`,
      titulo: `${tituloImovel(original as Imovel)} (copia)`,
      status: "rascunho",
      created_at: undefined,
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from("imoveis").insert(clone);
    if (insertError) throw new Error("Nao foi possivel criar a copia do imovel.");

    revalidatePath("/dashboard/imoveis");
    redirect("/dashboard/imoveis");
  }

  const [imoveisResult, pessoasResult, corretoresResult, legadosResult, relacoesResult] =
    await Promise.all([
      supabase.from("imoveis").select("*").eq("ativo", true).order("created_at", {
        ascending: false,
      }),
      supabase
        .from("pessoas")
        .select("id, nome, telefone, celular, whatsapp, email, papeis")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("corretores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase.from("proprietarios").select("id, nome").order("nome", { ascending: true }),
      supabase.from("imovel_proprietarios").select("*").eq("ativo", true),
    ]);

  const imoveis = (imoveisResult.data ?? []) as Imovel[];
  const pessoasProprietarias = ((pessoasResult.data ?? []) as PessoaProprietario[]).filter(
    (pessoa) => hasPapel(pessoa, "proprietario"),
  );
  const corretores = (corretoresResult.data ?? []) as Corretor[];
  const proprietariosLegados = (legadosResult.data ?? []) as ProprietarioLegado[];
  const relacoes = (relacoesResult.data ?? []) as ImovelProprietario[];
  const pessoasPorId = new Map(pessoasProprietarias.map((pessoa) => [pessoa.id, pessoa]));
  const corretoresPorId = new Map(corretores.map((corretor) => [corretor.id, corretor.nome]));
  const legadosPorId = new Map(
    proprietariosLegados.map((proprietario) => [proprietario.id, proprietario.nome]),
  );

  const relacoesPorImovel = new Map<string, ImovelProprietario[]>();
  for (const relacao of relacoes) {
    const atuais = relacoesPorImovel.get(relacao.imovel_id) ?? [];
    relacoesPorImovel.set(relacao.imovel_id, [...atuais, relacao]);
  }

  const imoveisFiltrados = imoveis.filter((imovel) => {
    const valorImovel = Number(valorPrincipal(imovel));
    const valorMinimo = Number(filtroValorMin);
    const valorMaximo = Number(filtroValorMax);
    const dormitorios = Number(imovel.dormitorios || imovel.quartos || 0);
    const garagens = Number(imovel.garagens || (imovel.garagem ? 1 : 0));
    const proprietarios = relacoesPorImovel
      .get(imovel.id)
      ?.map((relacao) => pessoasPorId.get(relacao.pessoa_id)?.nome)
      .filter(Boolean)
      .join(" ");
    const textoBusca = normalizarTexto(
      [
        imovel.codigo,
        imovel.titulo,
        imovel.tipo,
        imovel.bairro,
        imovel.cidade,
        imovel.status,
        imovel.finalidade,
        proprietarios,
        imovel.responsavel_id ? corretoresPorId.get(imovel.responsavel_id) : "",
      ].join(" "),
    );

    return (
      (!busca || textoBusca.includes(normalizarTexto(busca))) &&
      (!filtroTipo || imovel.tipo === filtroTipo) &&
      (!filtroFinalidade || imovel.finalidade === filtroFinalidade) &&
      (!filtroStatus || imovel.status === filtroStatus) &&
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
      (!filtroCondominio ||
        normalizarTexto(imovel.condominio).includes(normalizarTexto(filtroCondominio))) &&
      (!filtroResponsavel || imovel.responsavel_id === filtroResponsavel)
    );
  });

  const imovelEmEdicao = imoveis.find((imovel) => imovel.id === editId) ?? null;
  const imovelVisualizado = imoveis.find((imovel) => imovel.id === viewId) ?? null;
  const relacoesEmEdicao = imovelEmEdicao
    ? relacoesPorImovel.get(imovelEmEdicao.id) ?? []
    : [];
  const proprietariosSelecionados = new Set(
    relacoesEmEdicao.map((relacao) => relacao.pessoa_id),
  );
  const contatoPrincipalSelecionado =
    relacoesEmEdicao.find((relacao) => relacao.contato_principal)?.pessoa_id ?? "";

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
              placeholder="Codigo, titulo, bairro, proprietario, responsavel..."
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
            <input
              name="condominio"
              defaultValue={filtroCondominio}
              className={inputClass()}
              placeholder="Condominio"
            />
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
                ["Codigo", imovelVisualizado.codigo || "-"],
                ["Status", imovelVisualizado.status || "-"],
                ["Finalidade", imovelVisualizado.finalidade || "-"],
                ["Responsavel", corretoresPorId.get(imovelVisualizado.responsavel_id ?? "") || "-"],
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
              Nao foi possivel carregar os imoveis. Verifique se o SQL do modulo premium foi aplicado.
            </p>
          ) : imoveisFiltrados.length === 0 ? (
            <p className="rounded-2xl border border-[#E8DDCB] bg-white p-8 text-center text-sm text-[#64736D] lg:col-span-3">
              Nenhum imovel encontrado para os filtros atuais.
            </p>
          ) : (
            imoveisFiltrados.map((imovel) => {
              const relacoesDoImovel = relacoesPorImovel.get(imovel.id) ?? [];
              const proprietarioPrincipal =
                relacoesDoImovel
                  .map((relacao) => pessoasPorId.get(relacao.pessoa_id)?.nome)
                  .filter(Boolean)[0] ||
                (imovel.proprietario_id ? legadosPorId.get(imovel.proprietario_id) : "") ||
                "Sem proprietario";

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
                          {imovel.codigo || "Sem codigo"}
                        </p>
                        <h2 className="mt-2 line-clamp-2 text-lg font-bold text-[#071E36]">
                          {tituloImovel(imovel)}
                        </h2>
                      </div>
                      <span className="rounded-full bg-[#C89B3C]/10 px-3 py-1 text-xs font-semibold text-[#8B6827]">
                        {imovel.status || "rascunho"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#64736D]">
                      {imovel.bairro || "-"} · {imovel.cidade || "-"}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[#071E36]">
                      {formatarMoeda(valorPrincipal(imovel))}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-[#64736D]">
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {imovel.tipo || "Tipo"}
                      </span>
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {imovel.dormitorios || imovel.quartos || 0} dorm.
                      </span>
                      <span className="rounded-lg bg-[#F7F3ED] px-2 py-2">
                        {imovel.garagens || (imovel.garagem ? 1 : 0)} vagas
                      </span>
                    </div>
                    <div className="mt-4 rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] p-3 text-sm text-[#102A27]">
                      <p>
                        <strong>Proprietario:</strong> {proprietarioPrincipal}
                      </p>
                      <p>
                        <strong>Responsavel:</strong>{" "}
                        {corretoresPorId.get(imovel.responsavel_id ?? "") || "-"}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/imoveis?view=${imovel.id}`}
                        className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
                      >
                        Visualizar
                      </Link>
                      <Link
                        href={`/dashboard/imoveis?edit=${imovel.id}#dados`}
                        className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
                      >
                        Editar
                      </Link>
                      <form action={duplicarImovel}>
                        <input type="hidden" name="id" value={imovel.id} />
                        <button className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#071E36] hover:bg-[#F7F3ED]">
                          Duplicar
                        </button>
                      </form>
                      <button
                        type="button"
                        disabled
                        className="rounded-full border border-[#E8DDCB] px-3 py-1 text-xs font-semibold text-[#8B6827] opacity-70"
                      >
                        Compartilhar
                      </button>
                      <form action={excluirImovel}>
                        <input type="hidden" name="id" value={imovel.id} />
                        <ConfirmSubmitButton
                          message="Confirmar exclusao logica deste imovel?"
                          className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </ConfirmSubmitButton>
                      </form>
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

        <form action={salvarImovel} className="mt-6 grid gap-6">
          <input type="hidden" name="id" value={imovelEmEdicao?.id ?? ""} />

          <Section id="dados" title="Dados gerais">
            <Field label="Codigo" name="codigo" defaultValue={imovelEmEdicao?.codigo} />
            <Field label="Titulo" name="titulo" defaultValue={imovelEmEdicao?.titulo} />
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
              defaultValue={imovelEmEdicao?.finalidade}
              options={["venda", "locacao", "temporada", "administracao", "investimento"]}
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue={imovelEmEdicao?.status}
              options={["rascunho", "ativo", "reservado", "vendido", "locado", "inativo"]}
            />
            <label className="grid gap-2 text-sm font-medium text-[#102A27]">
              Responsavel
              <select
                name="responsavel_id"
                defaultValue={imovelEmEdicao?.responsavel_id ?? ""}
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
            <Field label="CEP" name="cep" defaultValue={imovelEmEdicao?.cep} />
            <Field label="Endereco" name="endereco" defaultValue={imovelEmEdicao?.endereco} />
            <Field label="Numero" name="numero" defaultValue={imovelEmEdicao?.numero} />
            <Field label="Complemento" name="complemento" defaultValue={imovelEmEdicao?.complemento} />
            <Field label="Bairro" name="bairro" defaultValue={imovelEmEdicao?.bairro} />
            <Field label="Cidade" name="cidade" defaultValue={imovelEmEdicao?.cidade} />
            <Field label="Estado" name="estado" defaultValue={imovelEmEdicao?.estado} />
            <Field label="Latitude" name="latitude" type="number" defaultValue={imovelEmEdicao?.latitude} />
            <Field label="Longitude" name="longitude" type="number" defaultValue={imovelEmEdicao?.longitude} />
            <Field label="Google Maps" name="google_maps" defaultValue={imovelEmEdicao?.google_maps} />
          </Section>

          <Section id="proprietarios" title="Proprietarios">
            <label className="grid gap-2 text-sm font-medium text-[#102A27] md:col-span-3">
              Fallback legado
              <select
                name="proprietario_legado_id"
                defaultValue={imovelEmEdicao?.proprietario_id ?? ""}
                className={inputClass()}
              >
                <option value="">Sem proprietario legado</option>
                {proprietariosLegados.map((proprietario) => (
                  <option key={proprietario.id} value={proprietario.id}>
                    {proprietario.nome}
                  </option>
                ))}
              </select>
            </label>
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

          <Section id="financeiro" title="Financeiro">
            <Field label="Valor venda" name="valor_venda" type="number" defaultValue={imovelEmEdicao?.valor_venda} />
            <Field label="Valor locacao" name="valor_locacao" type="number" defaultValue={imovelEmEdicao?.valor_locacao ?? imovelEmEdicao?.aluguel_pretendido} />
            <Field label="Condominio" name="valor_condominio" type="number" defaultValue={imovelEmEdicao?.valor_condominio} />
            <Field label="IPTU" name="valor_iptu" type="number" defaultValue={imovelEmEdicao?.valor_iptu} />
            <Field label="Taxa bombeiro" name="taxa_bombeiro" type="number" defaultValue={imovelEmEdicao?.taxa_bombeiro} />
            <Field label="Taxa administracao" name="taxa_administracao" type="number" defaultValue={imovelEmEdicao?.taxa_administracao} />
            <Field label="Comissao venda" name="comissao_venda" type="number" defaultValue={imovelEmEdicao?.comissao_venda} />
            <Field label="Comissao locacao" name="comissao_locacao" type="number" defaultValue={imovelEmEdicao?.comissao_locacao} />
            <Field label="Valor minimo aceito" name="valor_minimo_aceito" type="number" defaultValue={imovelEmEdicao?.valor_minimo_aceito} />
            <Field label="Valor ideal" name="valor_ideal" type="number" defaultValue={imovelEmEdicao?.valor_ideal} />
            <Field label="Valor anunciado" name="valor_anunciado" type="number" defaultValue={imovelEmEdicao?.valor_anunciado} />
            <Field label="Condominio nome" name="condominio" defaultValue={imovelEmEdicao?.condominio} />
          </Section>

          <Section id="caracteristicas" title="Caracteristicas">
            <Field label="Area total" name="area_total" type="number" defaultValue={imovelEmEdicao?.area_total} />
            <Field label="Area util" name="area_util" type="number" defaultValue={imovelEmEdicao?.area_util ?? imovelEmEdicao?.metragem} />
            <Field label="Area construida" name="area_construida" type="number" defaultValue={imovelEmEdicao?.area_construida} />
            <Field label="Dormitorios" name="dormitorios" type="number" defaultValue={imovelEmEdicao?.dormitorios ?? imovelEmEdicao?.quartos} />
            <Field label="Suites" name="suites" type="number" defaultValue={imovelEmEdicao?.suites} />
            <Field label="Banheiros" name="banheiros" type="number" defaultValue={imovelEmEdicao?.banheiros} />
            <Field label="Lavabos" name="lavabos" type="number" defaultValue={imovelEmEdicao?.lavabos} />
            <Field label="Garagens" name="garagens" type="number" defaultValue={imovelEmEdicao?.garagens ?? (imovelEmEdicao?.garagem ? 1 : "")} />
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
              defaultValue={imovelEmEdicao?.ultima_atualizacao_publicacao}
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
            <div className="md:col-span-3 rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] p-5 text-sm text-[#64736D]">
              Area preparada para exibir manutencoes, conflitos e historico operacional do modulo CRM.
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
            {imovelEmEdicao ? (
              <Link
                href="/dashboard/imoveis"
                className="rounded-xl border border-[#E8DDCB] px-5 py-3 text-sm font-semibold text-[#071E36] hover:bg-[#F7F3ED]"
              >
                Cancelar edicao
              </Link>
            ) : null}
            <button
              type="submit"
              className="rounded-xl bg-[#071E36] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2A4A]"
            >
              {imovelEmEdicao ? "Salvar alteracoes" : "Criar imovel"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-xs text-[#64736D]">
          SQL necessario: supabase/sql/015_expand_imoveis_premium.sql. Aplique antes de usar os novos campos em producao.
        </p>
        <p className="mt-2 text-xs text-[#64736D]">
          Ultima atualizacao de publicacao: {formatarData(new Date().toISOString())}
        </p>
      </div>
    </main>
  );
}
