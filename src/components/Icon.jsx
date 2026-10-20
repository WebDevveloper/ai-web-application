import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Home,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

const icons = {
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  external: ArrowUpRight,
  book: BookOpen,
  calendar: CalendarDays,
  check: Check,
  chevron: ChevronDown,
  document: FileText,
  teacher: GraduationCap,
  home: Home,
  locate: LocateFixed,
  login: LogIn,
  logout: LogOut,
  pin: MapPin,
  menu: Menu,
  chat: MessageCircle,
  plus: Plus,
  thumbsDown: ThumbsDown,
  thumbsUp: ThumbsUp,
  close: X,
};

export default function Icon({ name, className = "" }) {
  const Symbol = icons[name];
  return (
    <Symbol
      className={`icon ${className}`}
      size={20}
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
    />
  );
}
