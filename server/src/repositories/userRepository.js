const PROFILE_COLUMNS = `account.id, account.email, account.display_name AS "displayName",
                         study_group.code AS "groupCode"`;

export function createUserRepository(database) {
  return {
    async createUser({ email, displayName, passwordHash, groupCode }) {
      const result = await database.query(
        `INSERT INTO users AS account (email, display_name, password_hash, group_id)
         SELECT $1, $2, $3, id FROM study_groups WHERE code = $4
         RETURNING id, email, display_name AS "displayName"`,
        [email, displayName, passwordHash, groupCode],
      );
      return result.rows[0] ? { ...result.rows[0], groupCode } : null;
    },
    async findCredentials(email) {
      const result = await database.query(
        `SELECT ${PROFILE_COLUMNS}, account.password_hash AS "passwordHash"
         FROM users AS account JOIN study_groups AS study_group ON study_group.id = account.group_id
         WHERE account.email = $1`,
        [email],
      );
      return result.rows[0] || null;
    },
    async createSession(id, userId, expiresAt) {
      await database.withTransaction(async (client) => {
        // Чистим только истёкшие сессии этого пользователя при новом входе.
        await client.query(
          "DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= NOW()",
          [userId],
        );
        await client.query(
          "INSERT INTO user_sessions(id, user_id, expires_at) VALUES ($1, $2, $3)",
          [id, userId, expiresAt],
        );
      });
    },
    async findSession(id, userId) {
      const result = await database.query(
        `SELECT ${PROFILE_COLUMNS} FROM user_sessions AS session
         JOIN users AS account ON account.id = session.user_id
         JOIN study_groups AS study_group ON study_group.id = account.group_id
         WHERE session.id = $1 AND session.user_id = $2 AND session.expires_at > NOW()`,
        [id, userId],
      );
      return result.rows[0] || null;
    },
    async deleteSession(id) {
      await database.query("DELETE FROM user_sessions WHERE id = $1", [id]);
    },
    async changeGroup(userId, groupCode) {
      const result = await database.query(
        `UPDATE users SET group_id = (SELECT id FROM study_groups WHERE code = $2)
         WHERE id = $1 RETURNING id`,
        [userId, groupCode],
      );
      return result.rowCount === 1;
    },
  };
}
