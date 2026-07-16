import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthCard, AuthField, AuthError } from "../components/AuthCard";

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [company, setCompany] = useState("");
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
      await signup(username, email, password, company);
      navigate("/verify-registration", { state: { email: email.toLowerCase() } });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? "That username or email is already registered." : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your company account" subtitle="Set up a new workspace for your team">
      <form onSubmit={handleSubmit}>
        <AuthField label="Username" value={username} onChange={setUsername} autoFocus autoComplete="username" />
        <AuthField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField label="Company name" value={company} onChange={setCompany} autoComplete="organization" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" helperText="Minimum 8 characters" />
        <AuthField label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        {error && <AuthError message={error} />}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
          <span />
        </div>
      </form>
    </AuthCard>
  );
}
