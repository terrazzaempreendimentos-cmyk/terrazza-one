"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  message: string;
};

export function ConfirmSubmitButton({
  children,
  message,
  className,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
