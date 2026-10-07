import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  User,
  ShieldCheck,
} from "lucide-react";
import { loginUser } from "../api/loginApi.js";
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// import { useAuth } from "../context/AuthContext.jsx";
import './LoginForm.css'
export default function LoginForm() {
const navigate = useNavigate();
const queryClient = useQueryClient();
  // which panel is visible: "login" | "register"
  const [panel, setPanel] = useState("login");

  // --- login state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginFieldErrors, setLoginFieldErrors] = useState({});

  // --- register state ---
  const [username, setUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regFieldErrors, setRegFieldErrors] = useState({});
  const [regSuccess, setRegSuccess] = useState("");
const [designation,setDesignation]=useState("")
  // const { login } = useAuth();
  // ── validation ──────────────────────────────────────────────────────────
  const validateLogin = () => {
    const errors = {};
    if (!loginEmail) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail))
      errors.email = "Enter a valid email address";
    if (!loginPassword) errors.password = "Password is required";
    else if (loginPassword.length < 6)
      errors.password = "Password must be at least 6 characters";
    return errors;
  };

  const validateRegister = () => {
    const errors = {};
    if (!username.trim()) errors.username = "Username is required";
    if (!regEmail) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errors.email = "Enter a valid email address";
    if(!designation.trim())errors.designation="designation is required"
    if (!regPassword) errors.password = "Password is required";
    else if (regPassword.length < 6)
      errors.password = "Password must be at least 6 characters";
    if (!confirmPassword)
      errors.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== regPassword)
      errors.confirmPassword = "Passwords do not match";
    return errors;
  };

  // ── handlers ────────────────────────────────────────────────────────────
 const handleLogin = async (e) => {
  e.preventDefault();
  setLoginError("");
  setLoginFieldErrors({});
  setLoginSuccess("");
  const errors = validateLogin();
  if (Object.keys(errors).length > 0) {
    setLoginFieldErrors(errors);
    return;
  }
  setLoginLoading(true);
  try {
    // The interceptor unwraps the response, so this is { token, user }.
    const { token, user } = await loginUser(loginEmail, loginPassword);
    localStorage.setItem("token", token);
    queryClient.clear();                    // drop any previous user's cached data
    queryClient.setQueryData(["me"], user); // permissions are ready immediately
    navigate("/", { replace: true });       // HomeRedirect picks the first allowed page
  } catch (error) {
    setLoginError(error.message || "Login failed. Please try again.");
  } finally {
    setLoginLoading(false);
  }
};

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegFieldErrors({});
    setRegSuccess("");
    const errors = validateRegister();
    if (Object.keys(errors).length > 0) {
      setRegFieldErrors(errors);
      return;
    }
    setRegLoading(true);
    try {
      const result = await registerUser(username, regEmail, regPassword,designation);
      if (result.success) {
        
  await login(result.token, result.user);
        // localStorage.setItem("token", result.token);
        // localStorage.setItem("username", result.user.username);
        setRegSuccess("Registration successful! Redirecting...");
        // setTimeout(() => navigate("/"), 1500); // brief delay to show success
      } else {
        // console.log(result.message);
        setRegError(result.message || "Registration failed. Please try again.");
      }
    } catch {
      setRegError("Something went wrong. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  const switchTo = (target) => {
    setLoginError("");
    setLoginFieldErrors({});
    setRegError("");
    setRegFieldErrors({});
    setPanel(target);
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-blob-tl" />
      <div className="login-blob-br" />

      <div className="login-container">
        {/* progress dots */}
        {/* <div className="lf-dots">
          <span className={`lf-dot${panel === "login" ? " active" : ""}`} />
          <span className={`lf-dot${panel === "register" ? " active" : ""}`} />
        </div> */}

        {/* sliding track */}
        <div className="lf-slider-outer">
          <div
            // className="lf-slider-track"
            // style={{
            //   transform:
            //     panel === "register" ? "translateX(-100%)" : "translateX(0)",
            // }}
          >
            {/* ── LOGIN PANEL ─────────────────────────────────────────── */}
            <div className="login-card lf-panel">
              <div className="login-logo-wrap">
                <div className="login-logo">
                  <LogIn strokeWidth={2} />
                </div>
              </div>

              <div className="login-heading">
                <h1>Welcome back</h1>
                <p>Sign in to continue to your account</p>
              </div>

              {loginError && (
                <div className="login-error-banner">
                  <AlertCircle />
                  <p>{loginError}</p>
                </div>
              )}
              {loginSuccess && (
                <div className="login-success-banner">
                  <AlertCircle />
                  <p>{loginSuccess}</p>
                </div>
              )}

              <form onSubmit={handleLogin} noValidate className="login-form">
                {/* Email */}
                <div className="login-field">
                  <label htmlFor="login-email" className="login-label">
                    Email address
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <Mail />
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (loginFieldErrors.email)
                          setLoginFieldErrors((p) => ({ ...p, email: "" }));
                      }}
                      placeholder="you@example.com"
                      className={`login-input${loginFieldErrors.email ? " error" : ""}`}
                    />
                  </div>
                  {loginFieldErrors.email && (
                    <p className="login-field-error">
                      {loginFieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="login-field">
                  <div className="login-field-header">
                    <label
                      htmlFor="login-password"
                      className="login-label"
                      style={{ marginBottom: 0 }}
                    >
                      Password
                    </label>
                    <a href="#" className="login-forgot">
                      Forgot password?
                    </a>
                  </div>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <Lock />
                    </span>
                    <input
                      id="login-password"
                      type={showLoginPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginFieldErrors.password)
                          setLoginFieldErrors((p) => ({ ...p, password: "" }));
                      }}
                      placeholder="Enter your password"
                      className={`login-input has-toggle${loginFieldErrors.password ? " error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPw((p) => !p)}
                      className="login-pw-toggle"
                      aria-label={
                        showLoginPw ? "Hide password" : "Show password"
                      }
                    >
                      {showLoginPw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {loginFieldErrors.password && (
                    <p className="login-field-error">
                      {loginFieldErrors.password}
                    </p>
                  )}
                </div>

                {/* <div className="login-remember">
                  <input id="remember" type="checkbox" />
                  <label htmlFor="remember">Keep me signed in</label>
                </div> */}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="login-submit"
                >
                  {loginLoading ? (
                    <span className="login-spinner-row">
                      <svg
                        className="login-spinner"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          style={{ opacity: 0.25 }}
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          style={{ opacity: 0.75 }}
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              {/* <div className="login-divider">
                <div className="login-divider-line" />
                <div className="login-divider-label">
                  <span>Don't have an account?</span>
                </div>
              </div>
              <p className="login-signup">
                <button
                  type="button"
                  className="lf-switch-btn"
                  onClick={() => switchTo("register")}
                >
                  Create a free account
                </button>
              </p> */}
            </div>

            {/* ── REGISTER PANEL ──────────────────────────────────────── */}
            {/* <div className="login-card lf-panel">
              <div className="login-logo-wrap">
                <div className="login-logo">
                  <UserPlus strokeWidth={2} />
                </div>
              </div>

              <div className="login-heading">
                <h1>Create account</h1>
                <p>Sign up and get started for free</p>
              </div>

              {regError && (
                <div className="login-error-banner">
                  <AlertCircle />
                  <p>{regError}</p>
                </div>
              )}
              {regSuccess && (
                <div className="login-success-banner">
                  <AlertCircle />
                  <p>{regSuccess}</p>
                </div>
              )}

              <form onSubmit={handleRegister} noValidate className="login-form">
                <div className="login-field">
                  <label htmlFor="reg-username" className="login-label">
                    Username
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <User />
                    </span>
                    <input
                      id="reg-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (regFieldErrors.username)
                          setRegFieldErrors((p) => ({ ...p, username: "" }));
                      }}
                      placeholder="johndoe"
                      className={`login-input${regFieldErrors.username ? " error" : ""}`}
                    />
                  </div>
                  {regFieldErrors.username && (
                    <p className="login-field-error">
                      {regFieldErrors.username}
                    </p>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="reg-email" className="login-label">
                    Email address
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <Mail />
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        if (regFieldErrors.email)
                          setRegFieldErrors((p) => ({ ...p, email: "" }));
                      }}
                      placeholder="you@example.com"
                      className={`login-input${regFieldErrors.email ? " error" : ""}`}
                    />
                  </div>
                  {regFieldErrors.email && (
                    <p className="login-field-error">{regFieldErrors.email}</p>
                  )}
                </div>
                 <div className="login-field">
                  <label htmlFor="reg-email" className="login-label">
                    Designation
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <Mail/>
                    </span>
                    <input
                      id="reg-designation"
                      type="designation"
                      value={designation}
                      onChange={(e) => {
                        setDesignation(e.target.value);
                        if (regFieldErrors.designation)
                          setRegFieldErrors((p) => ({ ...p, designation: "" }));
                      }}
                      placeholder="admin,HR"
                      className={`login-input${regFieldErrors.designation ? " error" : ""}`}
                    />
                  </div>
                  {regFieldErrors.designation && (
                    <p className="login-field-error">{regFieldErrors.designation}</p>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="reg-password" className="login-label">
                    Password
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <Lock />
                    </span>
                    <input
                      id="reg-password"
                      type={showRegPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regFieldErrors.password)
                          setRegFieldErrors((p) => ({ ...p, password: "" }));
                      }}
                      placeholder="Create a password"
                      className={`login-input has-toggle${regFieldErrors.password ? " error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPw((p) => !p)}
                      className="login-pw-toggle"
                      aria-label={showRegPw ? "Hide password" : "Show password"}
                    >
                      {showRegPw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {regFieldErrors.password && (
                    <p className="login-field-error">
                      {regFieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="login-field">
                  <label htmlFor="reg-confirm" className="login-label">
                    Confirm password
                  </label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">
                      <ShieldCheck />
                    </span>
                    <input
                      id="reg-confirm"
                      type={showConfirmPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (regFieldErrors.confirmPassword)
                          setRegFieldErrors((p) => ({
                            ...p,
                            confirmPassword: "",
                          }));
                      }}
                      placeholder="Repeat your password"
                      className={`login-input has-toggle${regFieldErrors.confirmPassword ? " error" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw((p) => !p)}
                      className="login-pw-toggle"
                      aria-label={
                        showConfirmPw ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {regFieldErrors.confirmPassword && (
                    <p className="login-field-error">
                      {regFieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="login-submit"
                >
                  {regLoading ? (
                    <span className="login-spinner-row">
                      <svg
                        className="login-spinner"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          style={{ opacity: 0.25 }}
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          style={{ opacity: 0.75 }}
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    "Create account"
                  )}
                </button>
              </form>

              <div className="login-divider">
                <div className="login-divider-line" />
                <div className="login-divider-label">
                  <span>Already have an account?</span>
                </div>
              </div>
              <p className="login-signup">
                <button
                  type="button"
                  className="lf-switch-btn"
                  onClick={() => switchTo("login")}
                >
                  Sign in instead
                </button>
              </p>
            </div> */}
         
          </div>
        </div>
      </div>
    </div>
  );
}
