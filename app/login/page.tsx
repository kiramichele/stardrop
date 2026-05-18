"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";

// Decorative starfield SVG — scattered dots evoking stardrops without being literal
function Starfield() {
  // Hand-picked positions so the layout doesn't shift every render
  const stars = [
    { x: 12, y: 18, r: 1.5, o: 0.4 },
    { x: 28, y: 8, r: 1, o: 0.3 },
    { x: 48, y: 22, r: 2, o: 0.5 },
    { x: 72, y: 14, r: 1.2, o: 0.35 },
    { x: 88, y: 28, r: 1.8, o: 0.45 },
    { x: 8, y: 42, r: 1, o: 0.3 },
    { x: 38, y: 52, r: 1.5, o: 0.4 },
    { x: 62, y: 48, r: 1, o: 0.3 },
    { x: 92, y: 60, r: 2, o: 0.5 },
    { x: 16, y: 72, r: 1.3, o: 0.35 },
    { x: 44, y: 84, r: 1.6, o: 0.4 },
    { x: 78, y: 78, r: 1.1, o: 0.32 },
    { x: 22, y: 92, r: 0.9, o: 0.28 },
    { x: 58, y: 12, r: 0.8, o: 0.25 },
    { x: 84, y: 92, r: 1.4, o: 0.4 },
  ];
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      aria-hidden
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#d56f3e"
          opacity={s.o}
        />
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <Starfield />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="bg-cream-50/95 backdrop-blur-sm rounded-cozy-lg shadow-cozy-lg border border-wood-100/70 p-9">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-terracotta-700 leading-none">
              Stardrop
            </h1>
            <p className="label-eyebrow mt-3">Game Design · Ms. Shinn</p>
          </div>

          <form action={formAction} className="space-y-4">
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

            <Button
              type="submit"
              disabled={isPending}
              size="lg"
              className="w-full"
            >
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-wood-500 mt-5">
          Forgot your password? Ask Ms. Shinn.
        </p>
      </div>
    </div>
  );
}