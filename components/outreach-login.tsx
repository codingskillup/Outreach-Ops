"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OutreachLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F6F7F9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
        }}
      >
        <div
          style={{
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 18px",
              borderRadius: 14,
              background: "#111827",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            O
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Outreach Ops
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              color: "#6B7280",
              fontSize: 15,
            }}
          >
            Email infrastructure monitoring dashboard
          </p>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 18,
            border: "1px solid #E5E7EB",
            padding: 30,
            boxShadow: "0 15px 40px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ marginBottom: 25 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                color: "#111827",
              }}
            >
              Sign in
            </h2>

            <p
              style={{
                marginTop: 7,
                marginBottom: 0,
                color: "#6B7280",
                fontSize: 14,
              }}
            >
              Enter your account details to continue.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="client@example.com"
                style={{
                  width: "100%",
                  height: 48,
                  border: "1px solid #D1D5DB",
                  borderRadius: 10,
                  padding: "0 14px",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#111827",
                  background: "#FFFFFF",
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  height: 48,
                  border: "1px solid #D1D5DB",
                  borderRadius: 10,
                  padding: "0 14px",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                  color: "#111827",
                  background: "#FFFFFF",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 18,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  borderRadius: 10,
                  padding: "11px 13px",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 48,
                border: 0,
                borderRadius: 10,
                background: "#111827",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            color: "#9CA3AF",
            fontSize: 13,
          }}
        >
          Secure client access
        </p>
      </div>
    </main>
  );
}