import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { verifySignup, resendSignupOtp } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { AuthCard, AuthField, AuthError, AuthSuccess } from "../components/AuthCard";

export function VerifyRegistrationPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!email) {
    return (
      <AuthCard title="Nothing to verify" subtitle="Start a new registration to get a verification code">
        <div className="auth-links">
          <Link to="/register">Back to registration</Link>
          <Link to="/login">Back to login</Link>
        </div>
      </AuthCard>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Verification code is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifySignup(email!, code.trim());
      signIn(res.token, { username: res.username, email: res.email });
      navigate("/", { replace: true });
    } catch {
      setError("Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resendSignupOtp(email!);
      setNotice("A new code has been sent.");
    } catch {
      setError("Couldn't resend the code. Please try again.");
    }
  }

  return (
    <AuthCard title="Verify your email" subtitle={`We sent a code to ${maskEmail(email)}`}>
      <form onSubmit={handleSubmit}>
        <div className="auth-code-input">
          <AuthField label="Verification code" value={code} onChange={setCode} maxLength={6} autoFocus />
        </div>

        {error && <AuthError message={error} />}
        {notice && <AuthSuccess message={notice} />}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Verifying…" : "Verify & continue"}
        </button>

        <div className="auth-links">
          <button type="button" onClick={handleResend}>Resend code</button>
          <Link to="/login">Back to login</Link>
        </div>
      </form>
    </AuthCard>
  );
}

function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return local.length <= 2
    ? `${local[0]}***${domain}`
    : `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
}
