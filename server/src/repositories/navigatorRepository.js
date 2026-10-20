import { isIsoDate } from "../utils/dateTime.js";

function searchPattern(text) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

export function validateSearchText(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
    const error = new Error("Введите от 1 до 100 символов для поиска.");
    error.code = "INVALID_INPUT";
    throw error;
  }
  return value.trim();
}

export function createNavigatorRepository(database) {
  async function getStatus() {
    const result = await database.query(
      "SELECT imported_at FROM navigator.import_state WHERE id = true",
    );
    return { enabled: true, importedAt: result.rows[0]?.imported_at || null };
  }

  async function getSource() {
    const status = await getStatus();
    if (!status.importedAt) {
      const error = new Error("Снимок навигатора ещё не импортирован.");
      error.code = "NAVIGATOR_NOT_IMPORTED";
      throw error;
    }
    return {
      id: "navigator-snapshot",
      title: "Данные политех-навигатора",
      url: "https://mospolytech.ru/obuchauschimsya/raspisaniya/",
      type: "snapshot",
      importedAt: status.importedAt,
      updatedAt: null,
    };
  }

  async function getSchedule(groupCode, studyDate) {
    if (!isIsoDate(studyDate)) {
      const error = new Error("Некорректная дата расписания.");
      error.code = "INVALID_INPUT";
      throw error;
    }
    const source = await getSource();
    const weekday = String(new Date(`${studyDate}T12:00:00Z`).getUTCDay() || 7);
    const result = await database.query(
      `SELECT lesson_id, subject_name, lesson_type, start_time, end_time,
              teacher_name, auditory_titles, location, is_session
       FROM navigator.v_full_schedule
       WHERE group_name = $1
         AND ((is_session = false AND weekday_no_or_exam_date = $2)
           OR (is_session = true AND weekday_no_or_exam_date = $3))
         AND (date_from IS NULL OR date_from <= $3::date)
         AND (date_to IS NULL OR date_to >= $3::date)
       ORDER BY pair_number, lesson_id`,
      [groupCode, weekday, studyDate],
    );
    return result.rows.map((lesson) => ({
      id: `navigator-${lesson.lesson_id}`,
      subject: lesson.subject_name || "Предмет не указан",
      lessonType: lesson.lesson_type,
      studyDate,
      startTime: lesson.start_time,
      endTime: lesson.end_time,
      teacherName: lesson.teacher_name,
      building: lesson.location,
      room: lesson.auditory_titles,
      isSession: lesson.is_session,
      source,
    }));
  }

  async function findTeachers(query) {
    const text = validateSearchText(query);
    const source = await getSource();
    const result = await database.query(
      `SELECT teacher_id AS id, full_name AS "fullName", department, position, email, subjects
       FROM navigator.v_teacher_details
       WHERE full_name ILIKE $1 ESCAPE '\\'
       ORDER BY full_name, teacher_id LIMIT 5`,
      [searchPattern(text)],
    );
    return result.rows.map((teacher) => ({ ...teacher, source }));
  }

  async function findRooms(query) {
    const text = validateSearchText(query);
    const source = await getSource();
    const result = await database.query(
      `SELECT room_id AS id, room_number AS room, building_name AS building,
              building_code AS "buildingCode", address, transport
       FROM navigator.v_rooms_navigation
       WHERE room_number ILIKE $1 ESCAPE '\\'
          OR building_code ILIKE $1 ESCAPE '\\'
          OR building_name ILIKE $1 ESCAPE '\\'
       ORDER BY CASE WHEN LOWER(room_number) = LOWER($2) THEN 0 ELSE 1 END,
                building_code, room_number, room_id
       LIMIT 5`,
      [searchPattern(text), text],
    );
    return result.rows.map((room) => ({ ...room, source }));
  }

  async function findLocations(terms = [], limit = 6) {
    const roomCode = terms
      .flatMap((term) => term.split(/\s+/))
      .find((term) => /^[a-zа-яё-]*\d[a-zа-яё0-9-]*$/iu.test(term));
    if (roomCode) {
      const rooms = await findRooms(roomCode);
      return rooms.map((room) => ({
        id: `navigator-room-${room.id}`,
        type: "Аудитория",
        room: room.room,
        name: room.building || "Корпус не указан",
        address: room.address,
        directions: room.transport,
        source: room.source,
      }));
    }
    const genericWords = new Set([
      "корпус",
      "аудитория",
      "кабинет",
      "найти",
      "пройти",
      "добраться",
    ]);
    const buildingCode =
      terms.find((term) => /^корпус\s+\S+$/iu.test(term))?.split(/\s+/)[1] ||
      null;
    const patterns = terms
      .filter((term) => !genericWords.has(term))
      .map(searchPattern);
    const source = await getSource();
    const result = await database.query(
      `SELECT building_id AS id, name, address, transport AS directions
       FROM navigator.dim_buildings
       WHERE ($3::text IS NOT NULL AND (LOWER(building_id) = LOWER($3)
         OR LOWER($3) = ANY(regexp_split_to_array(LOWER(codes_in_room_names), ',\\s*'))))
          OR ($3::text IS NULL AND (cardinality($1::text[]) = 0
            OR CONCAT_WS(' ', building_id, name, address) ILIKE ANY($1::text[])))
       ORDER BY name LIMIT $2`,
      [patterns, limit, buildingCode],
    );
    return result.rows.map((building) => ({
      ...building,
      type: "Корпус",
      source,
    }));
  }

  async function getGroups() {
    await getSource();
    const result = await database.query(
      "SELECT group_name AS code, course FROM navigator.dim_groups ORDER BY group_name",
    );
    return result.rows;
  }
  return {
    getStatus,
    getSchedule,
    findTeachers,
    findRooms,
    findLocations,
    getGroups,
  };
}
