-- Данные внешнего справочника отделены от документов, дедлайнов и отзывов.
CREATE SCHEMA navigator;

CREATE TABLE navigator.dim_buildings (
  building_id VARCHAR(20) PRIMARY KEY,
  codes_in_room_names VARCHAR(50),
  name TEXT NOT NULL,
  address TEXT,
  index_city VARCHAR(50),
  transport TEXT,
  source_url TEXT,
  location_value_in_schedule VARCHAR(100)
);

CREATE TABLE navigator.dim_groups (
  group_name VARCHAR(50) PRIMARY KEY,
  course INTEGER,
  evening BOOLEAN,
  date_from DATE,
  date_to DATE,
  flag_in_groups_list BOOLEAN,
  is_in_session_now BOOLEAN,
  has_session_schedule BOOLEAN,
  has_semester_data BOOLEAN
);

CREATE TABLE navigator.dim_lesson_types (
  lesson_type VARCHAR(100) PRIMARY KEY,
  suffix_eor_in_source BOOLEAN,
  note TEXT
);

CREATE TABLE navigator.dim_pair_times (
  evening_code INTEGER NOT NULL,
  pair_no INTEGER NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  source_info TEXT,
  PRIMARY KEY (evening_code, pair_no)
);

CREATE TABLE navigator.dim_rooms (
  room_id INTEGER PRIMARY KEY,
  location_value_in_schedule VARCHAR(100),
  building_id_by_location VARCHAR(20) REFERENCES navigator.dim_buildings,
  room_as_in_source VARCHAR(100) NOT NULL,
  building_id_by_room_prefix VARCHAR(20) REFERENCES navigator.dim_buildings
);

CREATE TABLE navigator.dim_subjects (
  subject_id INTEGER PRIMARY KEY,
  subject_name TEXT NOT NULL
);

CREATE TABLE navigator.dim_teachers (
  teacher_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  email VARCHAR(255),
  info_source_url TEXT
);

CREATE TABLE navigator.fact_lessons (
  lesson_id INTEGER PRIMARY KEY,
  group_name VARCHAR(50) REFERENCES navigator.dim_groups,
  subject_id INTEGER REFERENCES navigator.dim_subjects,
  teacher_id INTEGER REFERENCES navigator.dim_teachers,
  pair_number INTEGER,
  lesson_type VARCHAR(100) REFERENCES navigator.dim_lesson_types,
  weekday_no_or_exam_date VARCHAR(50),
  location TEXT,
  auditory_titles TEXT,
  date_from DATE,
  date_to DATE,
  is_session BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE navigator.rel_teacher_subjects (
  teacher_id INTEGER REFERENCES navigator.dim_teachers,
  subject_id INTEGER REFERENCES navigator.dim_subjects,
  PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX navigator_lessons_group_day_idx
  ON navigator.fact_lessons (group_name, is_session, weekday_no_or_exam_date);

-- Время загрузки снимка не является временем проверки расписания университетом.
CREATE TABLE navigator.import_state (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_name TEXT NOT NULL,
  row_counts JSONB NOT NULL
);

CREATE VIEW navigator.v_full_schedule AS
SELECT lesson.lesson_id, lesson.group_name, lesson.weekday_no_or_exam_date,
       lesson.pair_number, times.start_time, times.end_time,
       subject.subject_name, lesson.lesson_type, teacher.full_name AS teacher_name,
       lesson.auditory_titles, lesson.location, lesson.date_from, lesson.date_to,
       lesson.is_session
FROM navigator.fact_lessons AS lesson
LEFT JOIN navigator.dim_groups AS study_group USING (group_name)
LEFT JOIN navigator.dim_subjects AS subject USING (subject_id)
LEFT JOIN navigator.dim_teachers AS teacher USING (teacher_id)
LEFT JOIN navigator.dim_pair_times AS times
  ON times.pair_no = lesson.pair_number
 AND times.evening_code = CASE WHEN study_group.evening THEN 1 ELSE 0 END;

CREATE VIEW navigator.v_teacher_details AS
SELECT teacher.teacher_id, teacher.full_name, teacher.department,
       teacher.position, teacher.email,
       COALESCE(array_agg(DISTINCT subject.subject_name ORDER BY subject.subject_name)
         FILTER (WHERE subject.subject_name IS NOT NULL), '{}'::TEXT[]) AS subjects
FROM navigator.dim_teachers AS teacher
LEFT JOIN navigator.rel_teacher_subjects AS link USING (teacher_id)
LEFT JOIN navigator.dim_subjects AS subject USING (subject_id)
GROUP BY teacher.teacher_id;

CREATE VIEW navigator.v_rooms_navigation AS
SELECT room.room_id, room.room_as_in_source AS room_number,
       room.location_value_in_schedule AS location_name,
       building.building_id AS building_code, building.name AS building_name,
       building.address, building.transport
FROM navigator.dim_rooms AS room
LEFT JOIN navigator.dim_buildings AS building
  ON building.building_id = COALESCE(room.building_id_by_location, room.building_id_by_room_prefix);
