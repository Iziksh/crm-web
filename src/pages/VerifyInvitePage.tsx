import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyInvite } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { AuthCard, AuthField, AuthError } from "../components/AuthCard";

export function VerifyInvitePage() {
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyInvite(email.trim(), otp.trim(), password);
      signIn(res.token, { username: res.username, email: res.email });
      navigate("/", { replace: true });
    } catch {
      setError("Invalid or expired code. Contact your administrator for a new invitation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Accept your invitation" subtitle="Enter the verification code from your invitation email">
      <form onSubmit={handleSubmit}>
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoFocus={!email} autoComplete="email" />
        <div className="auth-code-input">
          <AuthField label="Verification code" value={otp} onChange={setOtp} maxLength={6} autoFocus={!!email} />
        </div>
        <AuthField label="Choose a password" type="password" value={password} onChange={setPassword} autoComplete="new-password" helperText="Minimum 8 characters" />
        <AuthField label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        {error && <AuthError message={error} />}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Activating…" : "Activate account"}
        </button>
      </form>
    </AuthCard>
  );
}
