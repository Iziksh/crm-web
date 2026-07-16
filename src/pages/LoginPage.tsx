import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, verifyLoginOtp, resendLoginOtp } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getDeviceToken, setDeviceToken } from "../lib/deviceTrust";
import { AuthCard, AuthField, AuthError, AuthSuccess } from "../components/AuthCard";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(username, password, getDeviceToken(username));
      if (res.otpRequired) {
        setMaskedEmail(res.maskedEmail ?? "your email");
        setOtpStep(true);
      } else {
        signIn(res.token!, { username: res.username, email: res.email! });
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Invalid username or password." : "Couldn't reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Verification code is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyLoginOtp(username, code.trim(), trustDevice);
      if (res.deviceToken) setDeviceToken(username, res.deviceToken);
      signIn(res.token!, { username: res.username, email: res.email! });
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
      await resendLoginOtp(username);
      setNotice("A new code has been sent.");
    } catch {
      setError("Couldn't resend the code. Please try again.");
    }
  }

  if (otpStep) {
    return (
      <AuthCard title="Verify your identity" subtitle={`We sent a code to ${maskedEmail}`}>
        <form onSubmit={handleVerify}>
          <div className="auth-code-input">
            <AuthField label="Verification code" value={code} onChange={setCode} maxLength={6} autoFocus />
          </div>

          <label className="field field-checkbox">
            <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
            <span>Trust this device for 14 days</span>
          </label>

          {error && <AuthError message={error} />}
          {notice && <AuthSuccess message={notice} />}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Verifying…" : "Verify & continue"}
          </button>

          <div className="auth-links">
            <button type="button" onClick={handleResend}>Resend code</button>
            <button type="button" onClick={() => { setOtpStep(false); setCode(""); setError(null); setNotice(null); }}>
              Back to login
            </button>
          </div>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your workspace">
      <form onSubmit={handleSubmit}>
        <AuthField label="Username" value={username} onChange={setUsername} autoFocus autoComplete="username" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />

        {error && <AuthError message={error} />}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="auth-links">
          <Link to="/register">Create a company account</Link>
          <span />
        </div>
      </form>
    </AuthCard>
  );
}
