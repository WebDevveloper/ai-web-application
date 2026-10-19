import {
  formatDateTime,
  formatStudyDate,
} from "../utils/dateTime.js";

function compact(values) {
  return values.filter(Boolean);
}

export function collectSources(items) {
  const uniqueSources = new Map();

  for (const item of items) {
    const source = item?.source;

    if (source?.id && !uniqueSources.has(source.id)) {
      uniqueSources.set(source.id, source);
    }
  }

  return [...uniqueSources.values()];
}

export function formatScheduleResponse(entries, studyDate, fallbackSources = []) {
  if (entries.length === 0) {
    return {
      answer: `В подключённых данных нет записей для выбранной группы на ${formatStudyDate(studyDate)}. Это не означает, что занятий нет: сверьтесь с официальным расписанием.`,
      answerType: "schedule",
      sources: fallbackSources,
      actions: [{ type: "day", label: "Открыть мой день" }],
    };
  }

  const lines = entries.map((entry) => {
    const place = compact([entry.room, entry.building]).join(", ");
    const time = entry.startTime && entry.endTime
      ? `${entry.startTime.slice(0, 5)}–${entry.endTime.slice(0, 5)}`
      : "Время уточняется";
    return `• ${time} — ${entry.subject}${place ? `, ${place}` : ""}${entry.teacherName ? ` · ${entry.teacherName}` : ""}`;
  });

  return {
    answer: `Расписание${entries.some((entry) => entry.source?.type === "snapshot") ? " по загруженному снимку" : ""} на ${formatStudyDate(studyDate)}:\n${lines.join("\n")}`,
    answerType: "schedule",
    sources: collectSources(entries),
    actions: [{ type: "day", label: "Открыть весь день" }],
  };
}

export function formatTeacherResponse(teachers) {
  const lines = teachers.map((teacher) => {
    const details = compact([teacher.department, teacher.position]).join(" · ");
    const subjects = teacher.subjects?.length ? `\n  Дисциплины: ${teacher.subjects.join(", ")}` : "";
    return `• ${teacher.fullName}${details ? ` — ${details}` : ""}\n  ${teacher.email || "Email не указан в справочнике"}${subjects}`;
  });
  return {
    answer: teachers.length
      ? `Преподаватели по загруженному справочнику:\n${lines.join("\n")}`
      : "Преподаватель не найден. Укажите фамилию так, как она записана в расписании, или проверьте подключение справочника.",
    answerType: "teacher",
    sources: collectSources(teachers),
    actions: [{ type: "teachers", label: "Поиск преподавателя" }],
  };
}

export function formatDeadlineResponse(deadlines, timeZone) {
  if (deadlines.length === 0) {
    return {
      answer: "В подключённой базе пока нет подтверждённых сведений о дедлайнах вашей группы. Это не означает, что учебных сроков нет — проверьте LMS и сообщения преподавателя.",
      answerType: "deadline",
      sources: [],
      actions: [{ type: "day", label: "Открыть мой день" }],
    };
  }

  const lines = deadlines.map(
    (deadline) =>
      `• ${deadline.title} — до ${formatDateTime(deadline.dueAt, timeZone)}${deadline.subject ? ` (${deadline.subject})` : ""}`,
  );

  return {
    answer: `Ближайшие сроки:\n${lines.join("\n")}`,
    answerType: "deadline",
    sources: collectSources(deadlines),
    actions: [{ type: "day", label: "Показать все сроки" }],
  };
}

export function formatLocationResponse(locations) {
  if (locations.length === 0) {
    return {
      answer: "Я не нашёл подходящее место в справочнике кампуса. Уточните корпус, аудиторию или название подразделения.",
      answerType: "location",
      sources: [],
      actions: [{ type: "campus", label: "Открыть справочник" }],
    };
  }

  const lines = locations.map((location) => {
    const details = compact([
      location.address,
      location.room && `ауд. ${location.room}`,
      location.directions,
    ]).join(" · ");
    return `• ${location.name}${details ? ` — ${details}` : ""}`;
  });

  return {
    answer: `Подходящие места:\n${lines.join("\n")}`,
    answerType: "location",
    sources: collectSources(locations),
      actions: [{ type: "campus", label: "Открыть справочник кампуса" }],
  };
}

export function formatContactResponse(departments) {
  if (departments.length === 0) {
    return {
      answer: "Подходящее подразделение в справочнике не найдено. Опишите вопрос чуть подробнее — например, справка, пропуск или доступ к сервису.",
      answerType: "contact",
      sources: [],
      actions: [{ type: "help", label: "Варианты обращений" }],
    };
  }

  const lines = departments.map((department) => {
    const contacts = compact([
      department.email,
      department.phone,
      department.locationName,
      department.room && `ауд. ${department.room}`,
      department.openingHours,
    ]).join(" · ");
    return `• ${department.name}${department.purpose ? ` — ${department.purpose}` : ""}${contacts ? `\n  ${contacts}` : ""}`;
  });

  return {
    answer: `Куда можно обратиться:\n${lines.join("\n")}`,
    answerType: "contact",
    sources: collectSources(departments),
    actions: [{ type: "help", label: "Открыть помощь" }],
  };
}

export function formatKnowledgeResponse(chunks) {
  const lines = chunks.slice(0, 3).map((chunk) => {
    const heading = chunk.sectionPath || chunk.heading;
    return `• ${heading}: ${chunk.content}`;
  });

  return {
    answer: `По данным подключённых официальных материалов:\n${lines.join("\n")}`,
    answerType: "verified_data",
    sources: sourcesFromKnowledge(chunks),
    actions: [],
  };
}

export function sourcesFromKnowledge(chunks) {
  const uniqueSources = new Map();

  for (const chunk of chunks) {
    if (!uniqueSources.has(chunk.sourceId)) {
      uniqueSources.set(chunk.sourceId, {
        id: chunk.sourceId,
        title: chunk.sourceTitle,
        url: chunk.sourceUrl,
        section: chunk.sectionPath || chunk.heading,
        updatedAt: chunk.sourceUpdatedAt,
      });
    }
  }

  return [...uniqueSources.values()];
}
