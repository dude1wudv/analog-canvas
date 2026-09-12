import { useState } from "react";

export function LocalAccountForm({
  authenticate,
}: {
  authenticate: (
    username: string,
    password: string,
    register: boolean,
  ) => Promise<string | null>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="local-account-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        if (register && password !== confirmation) {
          setError("两次输入的密码不一致。");
          return;
        }
        setBusy(true);
        setError("");
        void authenticate(username, password, register)
          .then((message) => {
            setError(message ?? "");
            setPassword("");
            setConfirmation("");
          })
          .catch(() => setError("登录服务暂不可用，请稍后重试。"))
          .finally(() => setBusy(false));
      }}
    >
      <strong>{register ? "创建本地账号" : "账号密码登录"}</strong>
      <label>
        用户名
        <input
          autoComplete="username"
          value={username}
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9_]{3,32}"
          required
          disabled={busy}
          placeholder="3–32 位小写字母、数字或下划线"
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        密码
        <input
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
          value={password}
          minLength={12}
          maxLength={128}
          required
          disabled={busy}
          placeholder="至少 12 个字符"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {register && (
        <label>
          确认密码
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            minLength={12}
            maxLength={128}
            required
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
      )}
      <button type="submit" disabled={busy}>
        {busy ? "请稍候…" : register ? "注册并登录" : "登录账号"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setError("");
          setPassword("");
          setConfirmation("");
        }}
      >
        {register ? "已有账号，返回登录" : "没有账号？注册"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
