import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SESSION_SECONDS = 8 * 60 * 60;
const JWT_OPTIONS = {
  algorithm: "HS256",
  issuer: "campus-api",
  audience: "campus-web",
};

export function authError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeCredentials(body, registering = false) {
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = body?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw authError("Укажите корректный email.");
  }
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    password.includes("\0")
  ) {
    throw authError("Пароль: от 12 символов, не более 72 байт UTF-8.");
  }
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (registering && (displayName.length < 2 || displayName.length > 60)) {
    throw authError("Имя должно содержать от 2 до 60 символов.");
  }
  return { email, password, displayName };
}

export function createAuthService({
  userRepository,
  campusRepository,
  secret,
}) {
  const isConfigured =
    typeof secret === "string" && Buffer.byteLength(secret) >= 32;
  // Одинаковая дорогая проверка для неверного пароля и неизвестного email.
  let dummyHash;
  async function startSession(user) {
    const sessionId = randomUUID();
    await userRepository.createSession(
      sessionId,
      user.id,
      new Date(Date.now() + SESSION_SECONDS * 1000),
    );
    const token = jwt.sign({}, secret, {
      ...JWT_OPTIONS,
      subject: user.id,
      jwtid: sessionId,
      expiresIn: SESSION_SECONDS,
    });
    return { user, token, maxAge: SESSION_SECONDS * 1000 };
  }
  async function requireGroup(groupCode) {
    if (!(await campusRepository.ensureStudyGroup(groupCode))) {
      throw authError("Выберите группу из подключённого справочника.");
    }
  }
  return {
    isConfigured,
    async register(body) {
      const { email, password, displayName } = normalizeCredentials(body, true);
      await requireGroup(body.groupCode);
      // bcrypt сам создаёт случайную соль; cost 12 хранится внутри хеша.
      const passwordHash = await bcrypt.hash(password, 12);
      let user;
      try {
        user = await userRepository.createUser({
          email,
          displayName,
          passwordHash,
          groupCode: body.groupCode,
        });
      } catch (error) {
        if (error.code === "23505")
          throw authError(
            "Не удалось создать аккаунт. Попробуйте войти или используйте другой email.",
            409,
          );
        throw error;
      }
      if (!user) throw authError("Не удалось сохранить выбранную группу.");
      return startSession(user);
    },
    async login(body) {
      const { email, password } = normalizeCredentials(body);
      const credentials = await userRepository.findCredentials(email);
      dummyHash ||= bcrypt.hash(randomUUID(), 12);
      const matches = await bcrypt.compare(
        password,
        credentials?.passwordHash || (await dummyHash),
      );
      if (!credentials || !matches)
        throw authError("Неверный email или пароль.", 401);
      const { passwordHash: _passwordHash, ...user } = credentials;
      return startSession(user);
    },
    async authenticate(token) {
      let claims;
      try {
        claims = jwt.verify(token, secret, {
          algorithms: ["HS256"],
          issuer: JWT_OPTIONS.issuer,
          audience: JWT_OPTIONS.audience,
        });
      } catch {
        throw authError("Сессия завершилась. Войдите снова.", 401);
      }
      const uuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuid.test(claims.sub || "") || !uuid.test(claims.jti || ""))
        throw authError("Некорректная сессия.", 401);
      const user = await userRepository.findSession(claims.jti, claims.sub);
      if (!user) throw authError("Сессия завершилась. Войдите снова.", 401);
      return { user, sessionId: claims.jti };
    },
    async logout(sessionId) {
      if (sessionId) await userRepository.deleteSession(sessionId);
    },
    async changeGroup(user, groupCode) {
      await requireGroup(groupCode);
      await userRepository.changeGroup(user.id, groupCode);
      return { ...user, groupCode };
    },
  };
}
