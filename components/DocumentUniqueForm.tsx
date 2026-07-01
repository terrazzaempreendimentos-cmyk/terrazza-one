"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { limparDocumento, validarCNPJ, validarCPF } from "../lib/utils/validators";

type DocumentoAtivo = {
  id: string;
  cpf_cnpj: string | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  currentId?: string;
  documentosAtivos: DocumentoAtivo[];
};

const fieldErrorClass = "border-red-300 bg-red-50/50 focus:border-red-400";
const fieldBaseClass = "border-[#E8DDCB]";

function toggleClasses(element: HTMLElement, classes: string, force: boolean) {
  for (const className of classes.split(" ")) {
    if (className) element.classList.toggle(className, force);
  }
}

export function DocumentUniqueForm({
  action,
  children,
  className,
  currentId = "",
  documentosAtivos,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");

  const documentosNormalizados = useMemo(
    () =>
      documentosAtivos.map((item) => ({
        id: item.id,
        documento: limparDocumento(item.cpf_cnpj ?? ""),
      })),
    [documentosAtivos],
  );

  function validate(form: HTMLFormElement) {
    const formData = new FormData(form);
    const tipoPessoa = String(formData.get("tipo_pessoa") ?? "fisica");
    const documentoOriginal = String(formData.get("cpf_cnpj") ?? "").trim();
    const documento = limparDocumento(documentoOriginal);

    if (!documento) return "";

    const documentoValido =
      tipoPessoa === "juridica" ? validarCNPJ(documento) : validarCPF(documento);

    if (!documentoValido) {
      return tipoPessoa === "juridica" ? "CNPJ invalido." : "CPF invalido.";
    }

    const duplicated = documentosNormalizados.some(
      (item) => item.id !== currentId && item.documento && item.documento === documento,
    );

    return duplicated ? "Ja existe uma pessoa ativa cadastrada com este CPF/CNPJ." : "";
  }

  function refreshValidation() {
    const form = formRef.current;
    if (!form) return;
    setMessage(validate(form));
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const input = form.elements.namedItem("cpf_cnpj") as HTMLInputElement | null;
    const submitButtons = Array.from(
      form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'),
    );

    submitButtons.forEach((button) => {
      button.disabled = Boolean(message);
      button.classList.toggle("cursor-not-allowed", Boolean(message));
      button.classList.toggle("bg-slate-300", Boolean(message));
      button.classList.toggle("text-slate-600", Boolean(message));
    });

    if (input) {
      input.setAttribute("aria-invalid", message ? "true" : "false");
      toggleClasses(input, fieldErrorClass, Boolean(message));
      toggleClasses(input, fieldBaseClass, !message);
    }
  }, [message]);

  return (
    <form
      ref={formRef}
      action={action}
      className={className}
      onBlur={refreshValidation}
      onChange={refreshValidation}
      onSubmit={(event) => {
        const error = validate(event.currentTarget);
        setMessage(error);
        if (error) event.preventDefault();
      }}
    >
      {children}
      {message ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}
