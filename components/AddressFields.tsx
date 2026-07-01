"use client";

import { useState } from "react";

import { estadosBrasil } from "../lib/constants/estadosBrasil";
import { buscarEnderecoPorCEP } from "../lib/utils/cep";

type AddressFieldsProps = {
  defaultValues?: {
    cep?: string | null;
    endereco?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  };
  complementoRequired?: boolean;
  showComplemento?: boolean;
  className?: string;
};

function inputClass() {
  return "rounded-xl border border-[#E8DDCB] bg-white px-4 py-3 text-[#071E36] outline-none transition placeholder:text-[#9a9d98] focus:border-[#C89B3C]";
}

export function AddressFields({
  defaultValues,
  complementoRequired = false,
  showComplemento = true,
  className = "grid gap-4 md:grid-cols-4",
}: AddressFieldsProps) {
  const [cep, setCep] = useState(defaultValues?.cep ?? "");
  const [endereco, setEndereco] = useState(defaultValues?.endereco ?? "");
  const [bairro, setBairro] = useState(defaultValues?.bairro ?? "");
  const [cidade, setCidade] = useState(defaultValues?.cidade ?? "");
  const [estado, setEstado] = useState(defaultValues?.estado ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBuscarCEP() {
    if (!cep.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const data = await buscarEnderecoPorCEP(cep);
      setCep(data.cep);
      setEndereco(data.endereco);
      setBairro(data.bairro);
      setCidade(data.cidade);
      setEstado(data.estado);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CEP invalido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        CEP
        <input
          name="cep"
          value={cep}
          onBlur={handleBuscarCEP}
          onChange={(event) => setCep(event.target.value)}
          className={inputClass()}
          placeholder="00000-000"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Endereco
        <input
          name="endereco"
          value={endereco}
          onChange={(event) => setEndereco(event.target.value)}
          className={inputClass()}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Numero
        <input
          name="numero"
          defaultValue={defaultValues?.numero ?? ""}
          className={inputClass()}
        />
      </label>
      {showComplemento ? (
        <label className="grid gap-2 text-sm font-medium text-[#102A27]">
          Complemento
          <input
            name="complemento"
            required={complementoRequired}
            defaultValue={defaultValues?.complemento ?? ""}
            className={inputClass()}
          />
        </label>
      ) : null}
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Bairro
        <input
          name="bairro"
          value={bairro}
          onChange={(event) => setBairro(event.target.value)}
          className={inputClass()}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Cidade
        <input
          name="cidade"
          value={cidade}
          onChange={(event) => setCidade(event.target.value)}
          className={inputClass()}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#102A27]">
        Estado
        <select
          name="estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
          className={inputClass()}
        >
          <option value="">UF</option>
          {estadosBrasil.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={handleBuscarCEP}
          className="w-full rounded-xl border border-[#E8DDCB] bg-[#F7F3ED] px-4 py-3 text-sm font-semibold text-[#071E36] transition hover:border-[#C89B3C]/45 hover:bg-[#C89B3C]/10"
        >
          {loading ? "Buscando..." : "Buscar CEP"}
        </button>
      </div>
      {message ? (
        <p className="rounded-xl bg-[#fbebe7] px-4 py-3 text-sm text-[#8a2e1c] md:col-span-4">
          {message}
        </p>
      ) : null}
    </div>
  );
}
