// Только эти таблицы и столбцы принимаются из COPY-блоков. SQL из файла
// не выполняется: DROP, смена владельца и другие команды дампа игнорируются.
export const NAVIGATOR_COLUMNS = {
  dim_buildings: [
    "building_id",
    "codes_in_room_names",
    "name",
    "address",
    "index_city",
    "transport",
    "source_url",
    "location_value_in_schedule",
  ],
  dim_groups: [
    "group_name",
    "course",
    "evening",
    "date_from",
    "date_to",
    "flag_in_groups_list",
    "is_in_session_now",
    "has_session_schedule",
    "has_semester_data",
  ],
  dim_lesson_types: ["lesson_type", "suffix_eor_in_source", "note"],
  dim_pair_times: [
    "evening_code",
    "pair_no",
    "start_time",
    "end_time",
    "source_info",
  ],
  dim_rooms: [
    "room_id",
    "location_value_in_schedule",
    "building_id_by_location",
    "room_as_in_source",
    "building_id_by_room_prefix",
  ],
  dim_subjects: ["subject_id", "subject_name"],
  dim_teachers: [
    "teacher_id",
    "full_name",
    "department",
    "position",
    "email",
    "info_source_url",
  ],
  fact_lessons: [
    "lesson_id",
    "group_name",
    "subject_id",
    "teacher_id",
    "pair_number",
    "lesson_type",
    "weekday_no_or_exam_date",
    "location",
    "auditory_titles",
    "date_from",
    "date_to",
    "is_session",
  ],
  rel_teacher_subjects: ["teacher_id", "subject_id"],
};

function decodeCopyValue(value) {
  if (value === "\\N") return null;
  const encoded = Buffer.from(value, "utf8");
  const decoded = [];
  const escapes = { b: 8, f: 12, n: 10, r: 13, t: 9, v: 11, "\\": 92 };
  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] !== 92) {
      decoded.push(encoded[index]);
      continue;
    }
    index += 1;
    const escaped = String.fromCharCode(encoded[index]);
    if (Object.hasOwn(escapes, escaped)) {
      decoded.push(escapes[escaped]);
      continue;
    }
    // В COPY восьмеричные/hex escape задают байты UTF-8, не Unicode-символы.
    const rest = encoded.subarray(index).toString("ascii");
    const numeric =
      rest.match(/^[0-7]{1,3}/)?.[0] || rest.match(/^x[0-9a-f]{1,2}/i)?.[0];
    if (!numeric) throw new Error("Неизвестная escape-последовательность COPY");
    const isHex = /^x/i.test(numeric);
    decoded.push(parseInt(isHex ? numeric.slice(1) : numeric, isHex ? 16 : 8));
    index += numeric.length - 1;
  }
  return Buffer.from(decoded).toString("utf8");
}

export function parseNavigatorDump(dump) {
  const tables = new Map();
  let currentTable = null;
  for (const line of dump.replaceAll("\r\n", "\n").split("\n")) {
    if (currentTable) {
      if (line === "\\.") {
        currentTable = null;
        continue;
      }
      const values = line.split("\t").map(decodeCopyValue);
      if (values.length !== NAVIGATOR_COLUMNS[currentTable].length) {
        throw new Error(`Неверное число полей в ${currentTable}`);
      }
      tables.get(currentTable).push(values);
      continue;
    }
    if (!line.startsWith("COPY ")) continue;
    const header = line.match(/^COPY public\.(\w+) \(([^)]+)\) FROM stdin;$/);
    const table = header?.[1];
    const columns = header?.[2]
      .split(",")
      .map((column) => column.trim().replaceAll('"', ""));
    if (
      !Object.hasOwn(NAVIGATOR_COLUMNS, table || "") ||
      tables.has(table) ||
      JSON.stringify(columns) !== JSON.stringify(NAVIGATOR_COLUMNS[table])
    ) {
      throw new Error(
        "Дамп содержит неизвестную таблицу, повторный блок или другой набор столбцов",
      );
    }
    tables.set(table, []);
    currentTable = table;
  }
  if (currentTable || tables.size !== Object.keys(NAVIGATOR_COLUMNS).length) {
    throw new Error("Дамп неполный: нужны все девять COPY-блоков навигатора");
  }
  return tables;
}

export async function importNavigatorDump(
  database,
  dump,
  { fileName, replace = false },
) {
  const tables = parseNavigatorDump(dump);
  const rowCounts = Object.fromEntries(
    [...tables].map(([name, rows]) => [name, rows.length]),
  );
  // Порядок справочников задан явно, а не порядком блоков во внешнем файле.
  const tableNames = Object.keys(NAVIGATOR_COLUMNS);
  await database.withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(72834921)");
    const previous = await client.query(
      "SELECT id FROM navigator.import_state",
    );
    if (previous.rows.length && !replace) {
      throw new Error(
        "Снимок уже загружен. Для его замены передайте --replace",
      );
    }
    for (const table of [...tableNames].reverse()) {
      await client.query(`DELETE FROM navigator.${table}`);
    }
    for (const table of tableNames) {
      const columns = NAVIGATOR_COLUMNS[table];
      const rows = tables.get(table);
      for (let offset = 0; offset < rows.length; offset += 200) {
        const batch = rows.slice(offset, offset + 200);
        const parameters = batch.flat();
        const placeholders = batch.map(
          (_row, rowIndex) =>
            `(${columns.map((_column, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(", ")})`,
        );
        await client.query(
          `INSERT INTO navigator.${table} (${columns.map((column) => `"${column}"`).join(", ")}) VALUES ${placeholders.join(", ")}`,
          parameters,
        );
      }
    }
    await client.query(
      `INSERT INTO navigator.import_state (id, file_name, row_counts)
       VALUES (true, $1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET file_name = EXCLUDED.file_name,
         row_counts = EXCLUDED.row_counts, imported_at = NOW()`,
      [fileName, JSON.stringify(rowCounts)],
    );
  });
  return rowCounts;
}
