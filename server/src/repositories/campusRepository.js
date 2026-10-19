import { getIsoDate } from "../utils/dateTime.js";

function buildSearchPatterns(terms) {
  return terms.map((term) => `%${term.toLocaleLowerCase("ru-RU")}%`);
}

function mapSource(row) {
  if (!row.source_id || !row.source_title) {
    return null;
  }

  return {
    id: row.source_id,
    title: row.source_title,
    url: row.source_url,
    updatedAt: row.source_updated_at,
  };
}

export function createCampusRepository(
  database,
  { timeZone = "Europe/Moscow", navigatorRepository = null } = {},
) {
  async function getSchedule(groupCode, studyDate) {
    if (navigatorRepository) return navigatorRepository.getSchedule(groupCode, studyDate);
    const result = await database.query(
      `SELECT
         schedule.id,
         schedule.subject,
         schedule.lesson_type AS "lessonType",
         schedule.study_date AS "studyDate",
         schedule.start_time AS "startTime",
         schedule.end_time AS "endTime",
         schedule.teacher_name AS "teacherName",
         location.name AS building,
         location.room,
         source.id AS source_id,
         source.title AS source_title,
         source.canonical_url AS source_url,
         source.last_checked_at AS source_updated_at
       FROM schedule_entries AS schedule
       INNER JOIN study_groups AS study_group ON study_group.id = schedule.group_id
       LEFT JOIN campus_locations AS location ON location.id = schedule.location_id
       LEFT JOIN knowledge_sources AS source ON source.id = schedule.source_id
       WHERE study_group.code = $1 AND schedule.study_date = $2
       ORDER BY schedule.start_time`,
      [groupCode, studyDate],
    );

    return result.rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      lessonType: row.lessonType,
      studyDate: row.studyDate,
      startTime: row.startTime,
      endTime: row.endTime,
      teacherName: row.teacherName,
      building: row.building,
      room: row.room,
      source: mapSource(row),
    }));
  }

  async function getDeadlines(groupCode, limit = 6) {
    const result = await database.query(
      `SELECT
         deadline.id,
         deadline.title,
         deadline.subject,
         deadline.description,
         deadline.due_at AS "dueAt",
         source.id AS source_id,
         source.title AS source_title,
         source.canonical_url AS source_url,
         source.last_checked_at AS source_updated_at
       FROM deadlines AS deadline
       LEFT JOIN study_groups AS study_group ON study_group.id = deadline.group_id
       LEFT JOIN knowledge_sources AS source ON source.id = deadline.source_id
       WHERE deadline.status = 'active'
         AND deadline.due_at >= NOW()
         AND (study_group.code = $1 OR deadline.group_id IS NULL)
       ORDER BY deadline.due_at
       LIMIT $2`,
      [groupCode, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      subject: row.subject,
      description: row.description,
      dueAt: row.dueAt,
      source: mapSource(row),
    }));
  }

  async function findLocations(terms = [], limit = 6) {
    if (navigatorRepository) return navigatorRepository.findLocations(terms, limit);
    const patterns = buildSearchPatterns(terms);
    const result = await database.query(
      `SELECT
         location.id,
         location.code,
         location.type,
         location.name,
         location.address,
         location.room,
         location.directions,
         location.map_url AS "mapUrl",
         source.id AS source_id,
         source.title AS source_title,
         source.canonical_url AS source_url,
         source.last_checked_at AS source_updated_at
       FROM campus_locations AS location
       LEFT JOIN knowledge_sources AS source ON source.id = location.source_id
       WHERE cardinality($1::text[]) = 0
         OR LOWER(CONCAT_WS(
              ' ',
              location.code,
              location.type,
              location.name,
              location.address,
              location.room,
              location.directions
            ))
            LIKE ANY($1::text[])
       ORDER BY location.name
       LIMIT $2`,
      [patterns, limit],
    );

    return result.rows.map((row) => ({ ...row, source: mapSource(row) }));
  }

  async function findDepartments(terms = [], limit = 6) {
    const patterns = buildSearchPatterns(terms);
    const result = await database.query(
      `SELECT
         department.id,
         department.code,
         department.name,
         department.purpose,
         department.email,
         department.phone,
         department.opening_hours AS "openingHours",
         location.name AS "locationName",
         location.address,
         location.room,
         source.id AS source_id,
         source.title AS source_title,
         source.canonical_url AS source_url,
         source.last_checked_at AS source_updated_at
       FROM departments AS department
       LEFT JOIN campus_locations AS location ON location.id = department.office_location_id
       LEFT JOIN knowledge_sources AS source ON source.id = department.source_id
       WHERE cardinality($1::text[]) = 0
         OR LOWER(CONCAT_WS(
              ' ',
              department.code,
              department.name,
              department.purpose,
              department.email,
              location.name,
              location.address,
              location.room
            )) LIKE ANY($1::text[])
       ORDER BY department.name
       LIMIT $2`,
      [patterns, limit],
    );

    return result.rows.map((row) => ({ ...row, source: mapSource(row) }));
  }

  async function searchKnowledge(question, limit = 5) {
    const result = await database.query(
      `WITH search_query AS (
         SELECT REPLACE(
           plainto_tsquery('russian', $1)::TEXT,
           ' & ',
           ' | '
         )::TSQUERY AS value
       )
       SELECT
         chunk.id,
         chunk.heading,
         chunk.content,
         chunk.section_path AS "sectionPath",
         source.id AS "sourceId",
         source.title AS "sourceTitle",
         source.canonical_url AS "sourceUrl",
         source.last_checked_at AS "sourceUpdatedAt",
         ts_rank(chunk.search_vector, search_query.value) AS rank
       FROM knowledge_chunks AS chunk
       INNER JOIN knowledge_sources AS source ON source.id = chunk.source_id
       CROSS JOIN search_query
       WHERE source.status = 'verified'
         AND (
           chunk.search_vector @@ search_query.value
           OR chunk.content ILIKE '%' || $1 || '%'
           OR chunk.heading ILIKE '%' || $1 || '%'
         )
       ORDER BY rank DESC, chunk.chunk_order
       LIMIT $2`,
      [question, limit],
    );

    return result.rows;
  }

  return {
    ping: database.ping,
    getSchedule,
    getDeadlines,
    findLocations,
    findDepartments,
    searchKnowledge,
    findTeachers: (query) => navigatorRepository ? navigatorRepository.findTeachers(query) : Promise.resolve([]),
    findRooms: (query) => navigatorRepository ? navigatorRepository.findRooms(query) : Promise.resolve([]),
    getNavigatorStatus: () => navigatorRepository
      ? navigatorRepository.getStatus()
      : Promise.resolve({ enabled: false, importedAt: null }),
    async getDashboard(groupCode) {
      const today = getIsoDate(new Date(), timeZone);
      const [lessons, deadlines, locations, navigator] = await Promise.all([
        getSchedule(groupCode, today),
        getDeadlines(groupCode, 4),
        findLocations([], 4),
        navigatorRepository ? navigatorRepository.getStatus() : { enabled: false, importedAt: null },
      ]);

      return {
        groupCode,
        date: today,
        lessons,
        navigator,
        deadlines: deadlines.map((deadline) => ({
          ...deadline,
          dueTime: new Intl.DateTimeFormat("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone,
          }).format(new Date(deadline.dueAt)),
          dueLabel: new Intl.DateTimeFormat("ru-RU", {
            day: "numeric",
            month: "long",
            timeZone,
          }).format(new Date(deadline.dueAt)),
        })),
        locations,
      };
    },
    async saveFeedback(feedback) {
      await database.query(
        `INSERT INTO feedback (
           message_id,
           rating,
           comment,
           intent,
           response_had_sources
         ) VALUES ($1, $2, $3, $4, $5)`,
        [
          feedback.messageId,
          feedback.rating,
          feedback.comment,
          feedback.intent,
          feedback.responseHadSources,
        ],
      );
    },
  };
}
