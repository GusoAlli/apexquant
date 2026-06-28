"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

type GoogleCredentialResponse = {
  credential: string;
  clientId: string;
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleResponse = async (response: GoogleCredentialResponse) => {
    if (!response?.credential) {
      setStatus("Google sign-in failed.");
      return;
    }

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || "Google register failed.");
        return;
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      setStatus("Account created. Redirecting...");
      window.location.href = "/dashboard/profile";
    } catch (error) {
      setStatus("Unable to connect to the login service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (!clientId) return;
      if ((window as any).__gsi_initialized) return;
      if (!(window as any).google?.accounts?.id) return;

      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
      (window as any).__gsi_initialized = true;

      try {
        try {
          (window as any).google.accounts.id.renderButton(
            document.getElementById("google-signin-button"),
            { theme: "outline", size: "large", width: "320" }
          );
        } catch (e) {
          // renderButton may fail in some environments; ignore
        }

        // Do not call `prompt()` automatically to avoid FedCM AbortError noise.
        // Keep the rendered button so user can initiate sign-in.
      } catch (e) {
        // ignore
      }
    };

    if (clientId && (window as any).google?.accounts?.id) {
      initGoogle();
      return;
    }

    if (!document.getElementById("gsi-client-script")) {
      const script = document.createElement("script");
      script.id = "gsi-client-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }

    return () => {
      // keep script in DOM to avoid reloading during HMR
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || "Registration failed.");
        return;
      }

      setStatus("Registration successful. You can now log in.");
      window.location.href = "/login";
    } catch (error) {
      setStatus("Unable to connect to registration service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-yellow-300">ApexQuant</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">Create your account</h1>
            <p className="mt-2 text-sm text-slate-400">Use Google or email and password to create an account.</p>
          </div>

          <div className="space-y-4">
            <div id="google-signin-button" className="flex justify-center"></div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm text-slate-500">
                <span className="bg-slate-900 px-2">Or continue with</span>
              </div>
            </div>
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating your account..." : "Create account"}
            </button>
          </form>

          {status ? (
            <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-200">
              {status}
            </p>
          ) : null}

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-white hover:text-yellow-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
