// Domain types for SIA UNAL

export interface Course {
  code: string;
  name: string;
  typology: string;
  credits: number;
  groups?: CourseGroup[];
}

export interface CourseGroup {
  code: string;
  professorName: string;
  professorUsername: string;
  totalSeats: number;
  availableSeats: number;
  schedule: WeekSchedule;
  classrooms: WeekClassrooms;
  planRestrictions: PlanRestriction[];
}

export interface WeekSchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface WeekClassrooms {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface PlanRestriction {
  plan: string;
  type: string;
}

export interface SearchResult {
  totalCourses: number;
  totalPages: number;
  courses: Course[];
}

export interface CatalogEntry {
  level: string;
  faculty: string;
  program: string;
  courses: CatalogCourse[];
}

export interface CatalogCourse {
  code: string;
  name: string;
  credits: number;
  typology: string;
}

export interface CourseDetails {
  code: string;
  name: string;
  credits: number;
  typology: string;
  faculty: string;
  department: string;
  prerequisites: string[];
  description: string;
  groups: CourseGroup[];
}

export interface Grade {
  courseCode: string;
  courseName: string;
  credits: number;
  grade: number;
  period: string;
  typology: string;
}

export interface ScheduleEntry {
  courseCode: string;
  courseName: string;
  group: string;
  day: string;
  startHour: string;
  endHour: string;
  classroom: string;
  professor: string;
}

export interface AcademicHistory {
  studentName: string;
  studentId: string;
  program: string;
  papa: number;
  pappiCredits: number;
  totalCredits: number;
  completedCredits: number;
  periods: PeriodSummary[];
}

export interface PeriodSummary {
  period: string;
  grades: Grade[];
  periodAverage: number;
  cumulativeAverage: number;
}

export interface EnrollmentStatus {
  studentName: string;
  program: string;
  currentPeriod: string;
  enrolledCourses: EnrolledCourse[];
  totalCredits: number;
  status: string;
}

export interface EnrolledCourse {
  code: string;
  name: string;
  group: string;
  credits: number;
  professor: string;
}

export interface SessionState {
  isAuthenticated: boolean;
  username?: string;
  expiresAt?: Date;
}

// JSON-RPC raw response types

export interface JsonRpcResponse<T> {
  result: T;
  error: string | null;
}

export interface RawSubjectResult {
  totalAsignaturas: number;
  numPaginas: number;
  asignaturas: JavaList<RawSubject>;
}

export interface RawSubject {
  id_asignatura: string;
  codigo: string;
  nombre: string;
  tipologia: string;
  creditos: number;
  javaClass: string;
  grupos: JavaList<RawGroup>;
}

export interface RawGroup {
  javaClass: string;
  codigo: string;
  nombredocente: string;
  usuariodocente: string;
  cupostotal: number;
  cuposdisponibles: number;
  horario_lunes: string;
  horario_martes: string;
  horario_miercoles: string;
  horario_jueves: string;
  horario_viernes: string;
  horario_sabado: string;
  horario_domingo: string;
  aula_lunes: string;
  aula_martes: string;
  aula_miercoles: string;
  aula_jueves: string;
  aula_viernes: string;
  aula_sabado: string;
  aula_domingo: string;
  planlimitacion: JavaList<RawPlanRestriction>;
}

export interface RawPlanRestriction {
  plan: string;
  tipo_limitacion: string;
  javaClass: string;
}

export interface JavaList<T> {
  list: T[];
  javaClass: string;
}
