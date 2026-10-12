-- Эти записи нужны только для демонстрации MVP. Перед пилотом замените их
-- сведениями, подтверждёнными ответственными подразделениями университета.

INSERT INTO study_groups (code, program_name, academic_year, metadata)
VALUES ('261-321', 'Демонстрационная программа', 1, '{"demo": true}')
ON CONFLICT (code) DO UPDATE SET
  program_name = EXCLUDED.program_name,
  academic_year = EXCLUDED.academic_year,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO knowledge_sources (
  source_key,
  title,
  source_type,
  owner_name,
  status,
  last_checked_at,
  metadata
)
VALUES (
  'demo-campus-guide',
  '[ДЕМО] Справочник цифрового кампуса',
  'demo',
  'Команда MVP',
  'verified',
  NOW(),
  '{"demo": true}'
)
ON CONFLICT (source_key) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  last_checked_at = EXCLUDED.last_checked_at,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO campus_locations (
  code,
  type,
  name,
  address,
  room,
  directions,
  source_id,
  metadata
)
VALUES
  (
    'DEMO-A',
    'КОРПУС',
    '[ДЕМО] Учебный корпус А',
    'Тестовый адрес, 1',
    NULL,
    'Вход со стороны внутреннего двора',
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    '{"demo": true}'
  ),
  (
    'DEMO-OFFICE',
    'УЧЕБНЫЙ ОФИС',
    '[ДЕМО] Учебный офис',
    'Тестовый адрес, 1',
    '101',
    'Первый этаж, направо после входа',
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    '{"demo": true}'
  )
ON CONFLICT (code) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  room = EXCLUDED.room,
  directions = EXCLUDED.directions,
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO departments (
  code,
  name,
  purpose,
  email,
  phone,
  office_location_id,
  opening_hours,
  source_id,
  metadata
)
VALUES (
  'DEMO-STUDY-OFFICE',
  '[ДЕМО] Учебный офис',
  'Справки, вопросы по учебному процессу и обращения студентов',
  'replace-with-official@example.edu',
  NULL,
  (SELECT id FROM campus_locations WHERE code = 'DEMO-OFFICE'),
  'Пн–Пт, 10:00–17:00',
  (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
  '{"demo": true}'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  email = EXCLUDED.email,
  office_location_id = EXCLUDED.office_location_id,
  opening_hours = EXCLUDED.opening_hours,
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO knowledge_chunks (
  source_id,
  heading,
  content,
  section_path,
  chunk_order,
  tags,
  metadata
)
VALUES
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    'Справка об обучении',
    'Демонстрационный порядок: студент запрашивает справку через учебный офис. Перед пилотом этот текст нужно заменить официальной инструкцией и указать фактический срок подготовки.',
    'Документы / Справки',
    1,
    ARRAY['справка', 'документы'],
    '{"demo": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    'Академический отпуск',
    'Демонстрационный порядок: сначала студент уточняет основание и комплект документов в учебном офисе. Ассистент не принимает решение и не отправляет заявление без подтверждения пользователя.',
    'Учебный процесс / Академический отпуск',
    2,
    ARRAY['академический отпуск', 'заявление'],
    '{"demo": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    'Проблемы с цифровыми сервисами',
    'Демонстрационный порядок: зафиксируйте название сервиса, время ошибки и приложите снимок экрана без паролей и персональных данных, затем обратитесь в службу поддержки.',
    'Цифровые сервисы / Поддержка',
    3,
    ARRAY['поддержка', 'личный кабинет'],
    '{"demo": true}'
  )
ON CONFLICT (source_id, chunk_order) DO UPDATE SET
  heading = EXCLUDED.heading,
  content = EXCLUDED.content,
  section_path = EXCLUDED.section_path,
  tags = EXCLUDED.tags,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO schedule_entries (
  external_key,
  group_id,
  subject,
  lesson_type,
  study_date,
  start_time,
  end_time,
  teacher_name,
  location_id,
  source_id,
  metadata
)
VALUES
  (
    'demo-today-lesson-1',
    (SELECT id FROM study_groups WHERE code = '261-321'),
    '[ДЕМО] Основы программирования',
    'Практика',
    CURRENT_DATE,
    '10:00',
    '11:30',
    'Преподаватель не указан',
    (SELECT id FROM campus_locations WHERE code = 'DEMO-A'),
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    '{"demo": true}'
  ),
  (
    'demo-today-lesson-2',
    (SELECT id FROM study_groups WHERE code = '261-321'),
    '[ДЕМО] Цифровая грамотность',
    'Лекция',
    CURRENT_DATE,
    '12:00',
    '13:30',
    'Преподаватель не указан',
    (SELECT id FROM campus_locations WHERE code = 'DEMO-A'),
    (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
    '{"demo": true}'
  )
ON CONFLICT (external_key) DO UPDATE SET
  study_date = EXCLUDED.study_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  location_id = EXCLUDED.location_id,
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO deadlines (
  external_key,
  group_id,
  title,
  subject,
  description,
  due_at,
  source_id,
  metadata
)
VALUES (
  'demo-deadline-1',
  (SELECT id FROM study_groups WHERE code = '261-321'),
  '[ДЕМО] Загрузить лабораторную работу',
  'Основы программирования',
  'Условия должны быть заменены данными из учебной системы.',
  NOW() + INTERVAL '3 days',
  (SELECT id FROM knowledge_sources WHERE source_key = 'demo-campus-guide'),
  '{"demo": true}'
)
ON CONFLICT (external_key) DO UPDATE SET
  title = EXCLUDED.title,
  subject = EXCLUDED.subject,
  description = EXCLUDED.description,
  due_at = EXCLUDED.due_at,
  status = 'active',
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
