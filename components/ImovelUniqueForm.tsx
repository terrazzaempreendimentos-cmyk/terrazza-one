"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ImovelAtivo = {
  id: string;
  codigo: string | null;
  matricula: string | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  currentId?: string;
  imoveisAtivos: ImovelAtivo[];
};

const fieldErrorClass = "border-red-300 bg-red-50/50 focus:border-red-400";
const fieldBaseClass = "border-[#E8DDCB]";

function toggleClasses(element: HTMLElement, classes: string, force: boolean) {
  for (const className of classes.split(" ")) {
    if (className) element.classList.toggle(className, force);
  }
}

function normalizar(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function ImovelUniqueForm({
  action,
  children,
  className,
  currentId = "",
  imoveisAtivos,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [fieldName, setFieldName] = useState<"codigo" | "matricula" | "">("");

  const registros = useMemo(
    () =>
      imoveisAtivos.map((item) => ({
        id: item.id,
        codigo: normalizar(item.codigo ?? ""),
        matricula: normalizar(item.matricula ?? ""),
      })),
    [imoveisAtivos],
  );

  function validate(form: HTMLFormElement) {
    const formData = new FormData(form);
    const codigo = normalizar(String(formData.get("codigo") ?? ""));
    const matricula = normalizar(String(formData.get("matricula") ?? ""));

    if (!codigo) {
      return {
        field: "codigo" as const,
        message: "O codigo do imovel e obrigatorio.",
      };
    }

    const codigoDuplicado = registros.some(
      (item) => item.id !== currentId && item.codigo && item.codigo === codigo,
    );

    if (codigoDuplicado) {
      return {
        field: "codigo" as const,
        message: "Ja existe um imovel ativo cadastrado com este codigo.",
      };
    }

    const matriculaDuplicada =
      matricula &&
      registros.some(
        (item) => item.id !== currentId && item.matricula && item.matricula === matricula,
      );

    if (matriculaDuplicada) {
      return {
        field: "matricula" as const,
        message: "Ja existe um imovel ativo cadastrado com esta matricula.",
      };
    }

    return { field: "" as const, message: "" };
  }

  function refreshValidation() {
    const form = formRef.current;
    if (!form) return;
    const titulo = form.elements.namedItem("titulo") as HTMLInputElement | null;
    const complemento = form.elements.namedItem("complemento") as HTMLInputElement | null;
    if (titulo && complemento && !titulo.value.trim() && complemento.value.trim()) {
      titulo.value = complemento.value.trim();
    }

    const result = validate(form);
    setFieldName(result.field);
    setMessage(result.message);
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const submitButtons = Array.from(
      form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'),
    );

    submitButtons.forEach((button) => {
      button.disabled = Boolean(message);
      button.classList.toggle("cursor-not-allowed", Boolean(message));
      button.classList.toggle("bg-slate-300", Boolean(message));
      button.classList.toggle("text-slate-600", Boolean(message));
    });

    for (const name of ["codigo", "matricula"]) {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      if (!input) continue;
      const active = Boolean(message && fieldName === name);
      input.setAttribute("aria-invalid", active ? "true" : "false");
      toggleClasses(input, fieldErrorClass, active);
      toggleClasses(input, fieldBaseClass, !active);
    }
  }, [fieldName, message]);

  return (
    <form
      ref={formRef}
      action={action}
      className={className}
      onBlur={refreshValidation}
      onChange={refreshValidation}
      onSubmit={(event) => {
        const result = validate(event.currentTarget);
        setFieldName(result.field);
        setMessage(result.message);
        if (result.message) event.preventDefault();
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
