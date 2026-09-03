import React, { useState } from "react";
import {
  loginUser,
  registerUser,
  resendVerificationEmail,
} from "../services/auth";

interface AuthScreenProps {
  onLoginSuccess: () => void;
  defaultMode?: "login" | "register";
}

export function AuthScreen({ onLoginSuccess, defaultMode = "register" }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setMessage("");

    if (mode === "register" && !acceptedTerms) {
      setMessage(
        "Debes aceptar los términos y condiciones y la política de privacidad."
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const data = await registerUser(
          name.trim(),
          email.trim(),
          password
        );

        if (data.user && !data.session) {
          setMessage(
            "Registro realizado. Revisa tu correo electrónico para verificar tu cuenta."
          );
          return;
        }

        onLoginSuccess();
      } else {
        const data = await loginUser(
          email.trim(),
          password
        );

        if (!data.user) {
          setMessage("No fue posible iniciar sesión.");
          return;
        }

        onLoginSuccess();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setMessage("Escribe tu correo electrónico primero.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await resendVerificationEmail(email.trim());
      setMessage(
        "Hemos enviado nuevamente el correo de verificación."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible enviar el correo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === "login"
              ? "Iniciar sesión"
              : "Crear cuenta"}
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {mode === "login"
              ? "Accede a tu cuenta de Rinde+"
              : "Para compartir precios en la Comunidad necesitas una cuenta. Crea tu cuenta Rinde+ e inicia sesión para publicar y ayudar a otros usuarios a encontrar los mejores precios."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-green-600"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Correo electrónico
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-green-600"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-green-600"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {mode === "register" && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) =>
                  setAcceptedTerms(e.target.checked)
                }
                className="mt-1"
              />

              <span>
                Acepto los términos y condiciones y la
                política de privacidad.
              </span>
            </label>
          )}

          {message && (
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2E7D32] hover:bg-[#256628] text-white font-semibold py-2.5 disabled:opacity-50 transition-all"
          >
            {loading
              ? "Procesando..."
              : mode === "login"
              ? "Iniciar sesión"
              : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-5 text-center space-y-3">
          <button
            type="button"
            onClick={() =>
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              )
            }
            className="text-sm text-[#2E7D32] font-medium hover:underline"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Crear cuenta"
              : "¿Ya tienes una cuenta? Iniciar sesión"}
          </button>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={loading}
            className="block w-full text-sm text-slate-500 hover:text-[#2E7D32] disabled:opacity-50"
          >
            Reenviar correo de verificación
          </button>
        </div>
      </div>
    </div>
  );
}