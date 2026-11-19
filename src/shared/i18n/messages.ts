import { type Locale } from "./locale";
import { navMessage, type NavKey } from "./nav-messages";
import { homeMessage, type HomeKey } from "./home-messages";
import { menuMessage, type MenuKey } from "./menu-messages";
import { detailMessage, type DetailKey } from "./detail-messages";
import { editorMessage, type EditorKey } from "./editor-messages";
import { workspaceMessage, type WorkspaceKey } from "./workspace-messages";
import { accountAdminMessage, type AccountAdminKey } from "./account-admin-messages";
import { loadingMessage, type LoadingKey } from "./loading-messages";

const vi = {
  "language.label": "Ngôn ngữ",
  "language.automatic": "Tự động theo quốc gia",
  "common.close": "Đóng",
  "common.save": "Lưu",
  "common.cancel": "Hủy",
  "common.loading": "Đang tải...",
  "common.retry": "Thử lại",
} as const;
type CommonKey = keyof typeof vi;
export type MessageKey =
  | CommonKey
  | NavKey
  | HomeKey
  | MenuKey
  | DetailKey
  | EditorKey
  | WorkspaceKey
  | AccountAdminKey
  | LoadingKey;
export const messages: Record<Locale, Record<CommonKey, string>> = {
  vi,
  en: {
    "language.label": "Language",
    "language.automatic": "Automatic by country",
    "common.close": "Close",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading...",
    "common.retry": "Try again",
  },
  ko: {
    "language.label": "언어",
    "language.automatic": "국가에 따라 자동 선택",
    "common.close": "닫기",
    "common.save": "저장",
    "common.cancel": "취소",
    "common.loading": "불러오는 중...",
    "common.retry": "다시 시도",
  },
  ja: {
    "language.label": "言語",
    "language.automatic": "国に応じて自動選択",
    "common.close": "閉じる",
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.loading": "読み込み中...",
    "common.retry": "再試行",
  },
  "zh-CN": {
    "language.label": "语言",
    "language.automatic": "根据国家自动选择",
    "common.close": "关闭",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.loading": "加载中...",
    "common.retry": "重试",
  },
  ru: {
    "language.label": "Язык",
    "language.automatic": "Автоматически по стране",
    "common.close": "Закрыть",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.loading": "Загрузка...",
    "common.retry": "Повторить",
  },
};
export function translate(locale: Locale, key: MessageKey): string {
  return (
    loadingMessage(locale, key as LoadingKey) ??
    workspaceMessage(locale, key as WorkspaceKey) ??
    accountAdminMessage(locale, key as AccountAdminKey) ??
    editorMessage(locale, key as EditorKey) ??
    detailMessage(locale, key as DetailKey) ??
    menuMessage(locale, key as MenuKey) ??
    homeMessage(locale, key as HomeKey) ??
    navMessage(locale, key as NavKey) ??
    messages[locale]?.[key as CommonKey] ??
    vi[key as CommonKey]
  );
}
