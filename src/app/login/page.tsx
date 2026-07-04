import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  // Already signed in → go to dashboard
  const session = await auth();
  if (session?.user) redirect("/");

  async function authenticate(_prev: string | undefined, formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        return "Invalid email or password.";
      }
      throw error; // re-throw redirect
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sidebar)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white">
            <span className="text-3xl">🔨</span>
            <span className="text-2xl font-bold tracking-tight">Hammer</span>
          </div>
          <p className="text-[var(--sidebar-foreground)] mt-2 text-sm">
            Operations Dashboard
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <h1 className="text-xl font-semibold text-slate-800 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter your admin credentials to continue.
          </p>
          <LoginForm authenticate={authenticate} />
        </div>

        <p className="text-center text-xs text-[var(--sidebar-foreground)] mt-6">
          © {new Date().getFullYear()} Hammer. All rights reserved.
        </p>
      </div>
    </div>
  );
}
