"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {/* Where to land after a successful sign-in (set by middleware when an
          unauthenticated visitor was bounced here from a protected page). */}
      <input type="hidden" name="next" value={next} />

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="firstinitiallastname"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
