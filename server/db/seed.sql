-- Небольшой набор публичных сведений с официальных сайтов Московского Политеха.
-- Он нужен для воспроизводимой демонстрации без внешней языковой модели.

-- Удаляем только старые тестовые записи, созданные предыдущей версией seed.
DELETE FROM deadlines WHERE metadata @> '{"demo": true}'::JSONB;
DELETE FROM schedule_entries WHERE metadata @> '{"demo": true}'::JSONB;
DELETE FROM departments WHERE metadata @> '{"demo": true}'::JSONB;
DELETE FROM campus_locations WHERE metadata @> '{"demo": true}'::JSONB;
DELETE FROM knowledge_sources WHERE metadata @> '{"demo": true}'::JSONB;

INSERT INTO study_groups (code, program_name, academic_year, metadata)
VALUES ('261-321', NULL, 1, '{"scope": "project-case"}')
ON CONFLICT (code) DO UPDATE SET
  academic_year = EXCLUDED.academic_year,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO knowledge_sources (
  source_key,
  title,
  canonical_url,
  source_type,
  owner_name,
  status,
  last_checked_at,
  metadata
)
VALUES
  (
    'mospolytech-contacts',
    'Адреса и контакты Московского Политеха',
    'https://mospolytech.ru/ob-universitete/adresa-i-kontakty/',
    'official_webpage',
    'Московский политехнический университет',
    'verified',
    '2026-10-13T00:00:00+03',
    '{"official": true}'
  ),
  (
    'mospolytech-mfc-services',
    'Услуги Многофункционального центра',
    'https://mospolytech.ru/obuchauschimsya/uslugi-mnogofunkcionalnogo-centra/',
    'official_webpage',
    'Московский политехнический университет',
    'verified',
    '2026-10-13T00:00:00+03',
    '{"official": true}'
  ),
  (
    'mospolytech-digital-support',
    'Техническая поддержка личного кабинета',
    'https://e.mospolytech.ru/old/index.php?p=contact',
    'official_webpage',
    'Московский политехнический университет',
    'verified',
    '2026-10-13T00:00:00+03',
    '{"official": true}'
  ),
  (
    'mospolytech-schedule-bot-2026',
    'Официальный чат-бот расписания Московского Политеха',
    'https://mospolytech.ru/news/chat-bot-v-max-podskazhet-raspisanie-studentam-moskovskogo-politekha/',
    'official_webpage',
    'Московский политехнический университет',
    'verified',
    '2026-10-13T00:00:00+03',
    '{"official": true}'
  ),
  (
    'mospolytech-tuition-payment',
    'Оплата обучения',
    'https://mospolytech.ru/obuchauschimsya/oplata-obucheniya/',
    'official_webpage',
    'Московский политехнический университет',
    'verified',
    '2026-10-13T00:00:00+03',
    '{"official": true}'
  ),
  (
    'mospolytech-practice',
    'Практика в Московском Политехе',
    'https://mospolytech.ru/obuchauschimsya/praktika/',
    'official_webpage',
    'Московский политехнический университет',
    'verified',
    '2026-10-13T00:00:00+03',
    '{"official": true}'
  )
ON CONFLICT (source_key) DO UPDATE SET
  title = EXCLUDED.title,
  canonical_url = EXCLUDED.canonical_url,
  source_type = EXCLUDED.source_type,
  owner_name = EXCLUDED.owner_name,
  status = EXCLUDED.status,
  last_checked_at = EXCLUDED.last_checked_at,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO campus_locations (
  code,
  type,
  name,
  address,
  directions,
  source_id,
  metadata
)
VALUES (
  'BS-38',
  'УЧЕБНЫЙ КОРПУС',
  'Главный корпус Московского Политеха',
  'Москва, ул. Большая Семёновская, 38',
  'Перед поездкой проверьте нужное подразделение и кабинет на официальном сайте.',
  (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-contacts'),
  '{"official": true}'
)
ON CONFLICT (code) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
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
VALUES
  (
    'GENERAL-CONTACT',
    'Общий контакт Московского Политеха',
    'Официальные письма, запросы и уточнение ответственного подразделения',
    'mospolytech@mospolytech.ru',
    '+7 (495) 223-05-23',
    (SELECT id FROM campus_locations WHERE code = 'BS-38'),
    NULL,
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-contacts'),
    '{"official": true}'
  ),
  (
    'MFC',
    'Многофункциональный центр',
    'Справки, характеристики и документальное сопровождение обучающихся',
    'mospolytech@mospolytech.ru',
    '+7 (495) 223-05-23',
    NULL,
    NULL,
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-mfc-services'),
    '{"official": true}'
  ),
  (
    'DIGITAL-SUPPORT',
    'Техническая поддержка цифровых сервисов',
    'Проблемы с официальным ботом расписания и технические обращения',
    'help@mospolytech.ru',
    NULL,
    NULL,
    NULL,
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-schedule-bot-2026'),
    '{"official": true}'
  ),
  (
    'LMS-SUPPORT',
    'Поддержка LMS',
    'Проблемы со входом в LMS и вопросы по дистанционному обучению',
    'lms@mospolytech.ru',
    NULL,
    NULL,
    NULL,
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-digital-support'),
    '{"official": true}'
  ),
  (
    'PRACTICE-OFFICE',
    'Отдел практики',
    'Общие вопросы по практике; конкретные сроки уточняются у ответственного по программе или на кафедре',
    'praktika@mospolytech.ru',
    NULL,
    NULL,
    NULL,
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-practice'),
    '{"official": true}'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
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
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-contacts'),
    'Главный корпус и общие контакты',
    'Главный корпус находится по адресу: Москва, ул. Большая Семёновская, 38. Общий телефон: +7 (495) 223-05-23. Для официальных писем и запросов используется адрес mospolytech@mospolytech.ru.',
    'Контакты / Главный корпус',
    1,
    ARRAY['адрес', 'корпус', 'контакты', 'телефон'],
    '{"official": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-mfc-services'),
    'Справка в социальные учреждения',
    'Для получения справки в социальные учреждения нужно заполнить заявление, отсканировать его и направить на mospolytech@mospolytech.ru. Актуальный бланк и перечень услуг размещены на странице Многофункционального центра.',
    'МФЦ / Справки',
    1,
    ARRAY['справка', 'социальные учреждения', 'мфц', 'заявление'],
    '{"official": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-mfc-services'),
    'Получение характеристики',
    'Для получения характеристики нужно отсканировать запрос на характеристику при его наличии или заявление на выдачу характеристики и направить документ на mospolytech@mospolytech.ru.',
    'МФЦ / Характеристика',
    2,
    ARRAY['характеристика', 'мфц', 'заявление'],
    '{"official": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-digital-support'),
    'Поддержка LMS',
    'Если не получается войти в LMS, не приходит ответ или есть вопрос по дистанционному обучению, официальный адрес поддержки: lms@mospolytech.ru.',
    'Цифровые сервисы / LMS',
    1,
    ARRAY['lms', 'вход', 'дистанционное обучение', 'поддержка'],
    '{"official": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-schedule-bot-2026'),
    'Официальное расписание',
    'Официальный бот @mpoly_sched_bot в мессенджере MAX показывает расписание на текущий, следующий и предыдущий день. Для настройки используются команды /start, /setgroup и /today. Вопросы по работе бота можно направить на help@mospolytech.ru или через раздел «Техническое обслуживание» личного кабинета.',
    'Расписание / Официальный бот',
    1,
    ARRAY['расписание', 'пары', 'бот', 'max', 'группа'],
    '{"official": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-tuition-payment'),
    'Проблема с заказом справки для налогового вычета',
    'Если не получается заказать справку через личный кабинет обучающегося, официальный сайт предлагает написать в бухгалтерию на 1370@mospolytech.ru, описать проблему и обязательно указать ФИО студента.',
    'Оплата обучения / Налоговый вычет',
    1,
    ARRAY['оплата', 'налоговый вычет', 'справка', 'бухгалтерия'],
    '{"official": true}'
  ),
  (
    (SELECT id FROM knowledge_sources WHERE source_key = 'mospolytech-practice'),
    'Вопросы и сроки практики',
    'Общие вопросы по практике можно направить на praktika@mospolytech.ru. Крайние сроки подачи заявлений и договоров необходимо уточнять у ответственного за практику на образовательной программе или на кафедре.',
    'Учебный процесс / Практика',
    1,
    ARRAY['практика', 'договор', 'заявление', 'срок'],
    '{"official": true}'
  )
ON CONFLICT (source_id, chunk_order) DO UPDATE SET
  heading = EXCLUDED.heading,
  content = EXCLUDED.content,
  section_path = EXCLUDED.section_path,
  tags = EXCLUDED.tags,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
