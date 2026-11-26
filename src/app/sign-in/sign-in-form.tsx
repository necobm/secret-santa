"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

// Sign-in only: Organizer accounts are created from the command line (ADR-0003).

const field =
  "h-13 rounded-field border-2 border-border px-4 text-[17px] font-bold outline-offset-2 focus:border-accent";
const label = "text-[15px] font-extrabold";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, {});

  return (
    <form
      action={formAction}
      className="relative flex w-full max-w-[440px] flex-col gap-4 rounded-[24px] bg-surface p-7 shadow-[0_8px_0_var(--color-accent-shade)]"
    >
      <h2 className="text-2xl font-black">Entrar</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} placeholder="tu@email.com" className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={label}>Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={field} />
      </div>

      <p aria-live="polite" className="text-sm font-bold text-danger empty:hidden">{state.error}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-14 cursor-pointer rounded-button bg-accent text-[19px] font-black text-white shadow-button active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-accent-shade)] disabled:opacity-70"
      >
        {pending ? "Un momento…" : "¡Entrar!"}
      </button>
    </form>
  );
}
