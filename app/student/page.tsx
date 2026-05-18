import { requireStudent } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function StudentDashboard() {
  const user = await requireStudent();

  return (
    <div className="min-h-screen bg-cream-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-serif text-3xl text-terracotta-700">Stardrop</h1>
            <p className="text-sm text-wood-600 mt-1">Hi, {user.first_name}!</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-wood-600 hover:text-terracotta-700 transition"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="bg-cream-50 rounded-cozy shadow-cozy p-6">
          <h2 className="font-serif text-xl text-wood-800 mb-2">
            Welcome to Game Design
          </h2>
          <p className="text-wood-600">
            Coming soon: your daily plan, what's due, lessons, and grades.
          </p>
        </div>
      </div>
    </div>
  );
}