import { useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { acceptInvitation } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { AuthCard, AuthField, AuthError } from "../components/AuthCard";

export function AcceptInvitePage() {
  const { token } = useParams<{ token?: string }>();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthCard title="No invitation token" subtitle="This page requires a valid invitation link">
        <div className="auth-links">
          <Link to="/register">Create an account</Link>
          <Link to="/login">Back to login</Link>
        </div>
      </AuthCard>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await acceptInvitation(token!, username.trim(), password);
      signIn(res.token, { username: res.username, email: res.email });
      navigate("/", { replace: true });
    } catch {
      setError("This invitation link is invalid, has already been used, or has expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Complete your account setup to accept the invitation">
      <form onSubmit={handleSubmit}>
        <AuthField label="Username" value={username} onChange={setUsername} autoFocus autoComplete="username" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" helperText="Minimum 12 characters" />
        <AuthField label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        {error && <AuthError message={error} />}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creating account…" : "Accept invitation"}
        </button>
      </form>
    </AuthCard>
  );
}
