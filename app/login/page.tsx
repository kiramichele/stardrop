"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-cream-50 rounded-cozy shadow-cozy-lg p-8">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-terracotta-700">Stardrop</h1>
            <p className="text-sm text-wood-600 mt-1">Game Design</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-wood-700 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-3 py-2 rounded-cozy border border-wood-200 bg-white text-wood-900 focus:outline-none focus:ring-2 focus:ring-terracotta-300 focus:border-terracotta-400 transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-wood-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-cozy border border-wood-200 bg-white text-wood-900 focus:outline-none focus:ring-2 focus:ring-terracotta-300 focus:border-terracotta-400 transition"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 rounded-cozy bg-terracotta-500 text-white font-medium hover:bg-terracotta-600 active:bg-terracotta-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-wood-500 mt-4">
          Forgot your password? Ask Ms. Shinn.
        </p>
      </div>
    </div>
  );
}