"use client";

import { GoogleIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LOCALE } from "@/i18n/routing";
import { authClient } from "@/lib/auth/auth-client";
import { ensureSignupBonusFingerprint } from "@/lib/auth/signup-bonus-fingerprint";
import { normalizeEmail } from "@/lib/email";
import { initializeTracking } from "@/lib/tracking/client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Github, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

interface LoginFormProps {
  className?: string;
  callbackUrl?: string;
}

export default function LoginForm({
  className = "",
  callbackUrl,
}: LoginFormProps) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const formId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const showGithub = !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const showEmail =
    process.env.NEXT_PUBLIC_EMAIL_LOGIN === "true" ||
    process.env.NODE_ENV === "development";
  const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [socialProvider, setSocialProvider] = useState<
    "google" | "github" | null
  >(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [showTurnstile, setShowTurnstile] = useState(false);
  const busy = isLoading || isSendingCode || socialProvider !== null;

  useEffect(() => {
    setLastMethod(authClient.getLastUsedLoginMethod());
    void ensureSignupBonusFingerprint();
    initializeTracking();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const getCallbackUrl = () => {
    const fallback = locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
    const url = new URL(
      callbackUrl || searchParams.get("next") || fallback,
      window.location.origin,
    );
    return url.origin === window.location.origin
      ? url.toString()
      : new URL(fallback, window.location.origin).toString();
  };

  const resetCaptcha = () => {
    setCaptchaToken("");
    turnstileRef.current?.reset();
  };

  const handleSendCode = async () => {
    if (
      !emailInputRef.current?.reportValidity() ||
      !passwordInputRef.current?.reportValidity()
    )
      return;
    setIsSendingCode(true);
    setOtpCode("");

    try {
      // The server sends a password-setting OTP for both new and existing
      // emails. An unverified signup never receives a login session.
      const { error } = await authClient.signUp.email({
        email: normalizeEmail(email),
        password,
        name: normalizeEmail(email).split("@")[0],
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });
      if (error) {
        toast.error(t("Toast.OTP.errorTitle"), {
          description:
            error.status === 429
              ? t("Toast.rateLimitDescription")
              : error.message || t("Toast.OTP.sendErrorDescription"),
        });
        return;
      }
      setIsCodeSent(true);
      setCountdown(60);
      toast.success(t("Toast.OTP.sendSuccessTitle"), {
        description: t("Toast.OTP.sendSuccessDescription"),
      });
    } catch {
      toast.error(t("Toast.OTP.sendErrorDescription"));
    } finally {
      resetCaptcha();
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    let passwordSaved = false;

    try {
      if (mode === "register") {
        const { error } = await authClient.emailOtp.resetPassword({
          email: normalizeEmail(email),
          password,
          otp: otpCode,
        });
        if (error) {
          toast.error(t("Toast.OTP.errorTitle"), {
            description:
              error.status === 429
                ? t("Toast.rateLimitDescription")
                : error.message || t("Toast.OTP.verifyErrorDescription"),
          });
          return;
        }
        passwordSaved = true;
        setIsCodeSent(false);
        setOtpCode("");
        setMode("login");
      }

      // Establish the session only after the verified password is saved, so
      // the client-auth bridge cannot issue a ticket before registration ends.
      const { error } = await authClient.signIn.email({
        email: normalizeEmail(email),
        password,
        callbackURL: getCallbackUrl(),
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
        },
      });
      if (error) {
        if (
          !passwordSaved &&
          [
            "INVALID_EMAIL_OR_PASSWORD",
            "INVALID_CREDENTIALS",
            "PASSWORD_SETUP_REQUIRED",
            "EMAIL_NOT_VERIFIED",
            "REGISTRATION_REQUIRED",
          ].includes(error.code ?? "")
        ) {
          setMode("register");
          return;
        }
        toast.error(t("Toast.Password.errorTitle"), {
          description: passwordSaved
            ? t("Registration.passwordSaved")
            : error.status === 429
              ? t("Toast.rateLimitDescription")
              : error.message || t("Toast.Password.errorDescription"),
        });
        return;
      }
      window.location.assign(getCallbackUrl());
    } catch {
      toast.error(
        passwordSaved
          ? t("Registration.passwordSaved")
          : t("Toast.Password.errorDescription"),
      );
    } finally {
      resetCaptcha();
      setIsLoading(false);
    }
  };

  const signInSocial = async (provider: "google" | "github") => {
    setSocialProvider(provider);
    try {
      await ensureSignupBonusFingerprint();
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: getCallbackUrl(),
        errorCallbackURL: "/redirect-error",
      });
      if (error) throw error;
    } catch {
      toast.error(
        t(
          provider === "google"
            ? "Toast.Google.errorDescription"
            : "Toast.Github.errorDescription",
        ),
      );
    } finally {
      setSocialProvider(null);
    }
  };

  return (
    <div className={`grid gap-6 ${className}`}>
      <div className="grid gap-2">
        <Button
          variant="outline"
          onClick={() => signInSocial("google")}
          disabled={busy}
          className="relative h-auto min-h-9 flex-wrap gap-x-2 gap-y-1 px-3 py-2 whitespace-normal"
        >
          {socialProvider === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          {t("signInMethods.signInWithGoogle")}
          {lastMethod === "google" && (
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] px-1.5 py-0.5 pointer-events-none"
            >
              Last used
            </Badge>
          )}
        </Button>
        {showGithub && (
          <Button
            variant="outline"
            onClick={() => signInSocial("github")}
            disabled={busy}
            className="relative h-auto min-h-9 flex-wrap gap-x-2 gap-y-1 px-3 py-2 whitespace-normal"
          >
            {socialProvider === "github" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            {t("signInMethods.signInWithGithub")}
            {lastMethod === "github" && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] px-1.5 py-0.5 pointer-events-none"
              >
                Last used
              </Badge>
            )}
          </Button>
        )}
      </div>

      {showEmail && (
        <>
          <div className="relative h-auto min-h-9 flex-wrap gap-x-2 gap-y-1 px-3 py-2 whitespace-normal">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("signInMethods.or")}
              </span>
            </div>
          </div>
          <form
            onSubmit={handleSubmit}
            onFocus={() => setShowTurnstile(true)}
            className="grid gap-3"
          >
            {mode === "register" && (
              <div className="space-y-1" role="status">
                <h2 className="text-sm font-semibold">
                  {t("Registration.title")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("Registration.description")}
                </p>
              </div>
            )}
            <div className="grid gap-1">
              <label
                htmlFor={`${formId}-email`}
                className="text-sm font-medium"
              >
                {t("Registration.emailLabel")}
              </label>
              <Input
                ref={emailInputRef}
                id={`${formId}-email`}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setOtpCode("");
                  setIsCodeSent(false);
                  setCountdown(0);
                }}
                disabled={busy}
              />
            </div>
            <div className="grid gap-1">
              <label
                htmlFor={`${formId}-password`}
                className="text-sm font-medium"
              >
                {t("signInMethods.passwordMethod")}
              </label>
              <Input
                ref={passwordInputRef}
                id={`${formId}-password`}
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "register"
                    ? t("Registration.passwordHint")
                    : "********"
                }
                required
                minLength={mode === "register" ? 8 : undefined}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </div>
            {mode === "register" && (
              <div className="grid gap-1">
                <label
                  htmlFor={`${formId}-otp`}
                  className="text-sm font-medium"
                >
                  {t("signInMethods.otpMethod")}
                </label>
                <div className="flex gap-2">
                  <Input
                    id={`${formId}-otp`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    required
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                    disabled={busy}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={
                      !email ||
                      password.length < 8 ||
                      busy ||
                      countdown > 0 ||
                      (captchaEnabled && !captchaToken)
                    }
                  >
                    {isSendingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      t("signInMethods.sendOTP")
                    )}
                  </Button>
                </div>
              </div>
            )}
            {captchaEnabled && showTurnstile && (
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={setCaptchaToken}
                onError={() => setCaptchaToken("")}
                onExpire={() => setCaptchaToken("")}
                options={{ size: "flexible" }}
              />
            )}
            <Button
              type="submit"
              disabled={
                !email ||
                !password ||
                busy ||
                (captchaEnabled && !captchaToken) ||
                (mode === "register" &&
                  (!isCodeSent || otpCode.length !== 6 || password.length < 8))
              }
              className="w-full bg-primary/90 hover:bg-primary"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {mode === "register"
                ? t("Registration.submit")
                : t("Button.signIn")}
            </Button>
            <Button
              type="button"
              variant="link"
              disabled={busy}
              className="text-xs font-normal text-muted-foreground hover:text-primary"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login"
                ? t("Registration.open")
                : t("Registration.backToLogin")}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
