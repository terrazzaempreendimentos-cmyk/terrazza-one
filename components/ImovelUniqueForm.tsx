"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export type SalvarImovelState =
  | { status: "idle"; mensagem: null }
  | { status: "erro"; mensagem: string };

type ImovelAtivo = {
  id: string;
  codigo: string | null;
  matricula: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<SalvarImovelState>;
  children: ReactNode;
  className?: string;
  currentId?: string;
  imoveisAtivos: ImovelAtivo[];
};

const fieldErrorClass = "border-red-300 bg-red-50/50 focus:border-red-400";
const fieldBaseClass = "border-[#E8DDCB]";
const estadoInicial: SalvarImovelState = { status: "idle", mensagem: null };
const ImovelFormPendingContext = createContext(false);

export function ImovelSaveButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const pending = useContext(ImovelFormPendingContext);

  return (
    <button
      {...props}
      type="submit"
      name="imovel_intent"
      value="salvar"
      disabled={pending || props.disabled}
      aria-disabled={pending || props.disabled}
    >
      {pending ? "Salvando..." : children}
    </button>
  );
}

function toggleClasses(element: HTMLElement, classes: string, force: boolean) {
  for (const className of classes.split(" ")) {
    if (className) element.classList.toggle(className, force);
  }
}

function normalizar(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizarContatoPrincipal(form: HTMLFormElement) {
  const proprietariosSelecionados = Array.from(
    form.querySelectorAll<HTMLInputElement>(
      'input[name="proprietario_pessoa_ids"]:checked',
    ),
  ).map((input) => input.value);
  const contatos = Array.from(
    form.querySelectorAll<HTMLInputElement>(
      'input[name="contato_principal_pessoa_id"]',
    ),
  );

  if (proprietariosSelecionados.length === 0) {
    contatos.forEach((contato) => {
      contato.checked = false;
    });
    return;
  }

  const contatoAtual = contatos.find(
    (contato) => contato.checked && proprietariosSelecionados.includes(contato.value),
  );
  const contatoPrincipal =
    contatoAtual ??
    contatos.find((contato) => contato.value === proprietariosSelecionados[0]);

  contatos.forEach((contato) => {
    contato.checked = contato === contatoPrincipal;
  });
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
  const [actionState, setActionState] = useState<SalvarImovelState>(estadoInicial);
  const [pending, startTransition] = useTransition();

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
    normalizarContatoPrincipal(form);
    const formData = new FormData(form);
    const codigo = normalizar(String(formData.get("codigo") ?? ""));
    const matricula = normalizar(String(formData.get("matricula") ?? ""));

    if (!codigo && !currentId) {
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

    const proprietariosSelecionados = formData.getAll("proprietario_pessoa_ids");
    if (!currentId && proprietariosSelecionados.length === 0) {
      return {
        field: "" as const,
        message: "Selecione pelo menos um proprietário antes de salvar o imóvel.",
        section: "proprietarios",
      };
    }

    return { field: "" as const, message: "", section: "" };
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
    <ImovelFormPendingContext.Provider value={pending}>
      <form
        ref={formRef}
        className={className}
        onBlur={refreshValidation}
        onChange={refreshValidation}
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          if (submitter?.name !== "imovel_intent" || submitter.value !== "salvar") {
            return;
          }

          event.preventDefault();
          if (pending) return;

          const result = validate(event.currentTarget);
          setFieldName(result.field);
          setMessage(result.message);
          if (result.message) {
            if ("section" in result && result.section) {
              document.getElementById(result.section)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
            return;
          }

          const formData = new FormData(event.currentTarget);
          setActionState(estadoInicial);
          startTransition(async () => {
            try {
              const nextState = await action(formData);
              setActionState(nextState);
            } catch {
              setActionState({
                status: "erro",
                mensagem: "Nao foi possivel salvar o imovel. Tente novamente.",
              });
            }
          });
        }}
      >
        {children}
        {message || actionState.status === "erro" ? (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {message || actionState.mensagem}
          </p>
        ) : null}
      </form>
    </ImovelFormPendingContext.Provider>
  );
}
