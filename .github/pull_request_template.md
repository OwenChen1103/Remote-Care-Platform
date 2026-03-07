## 變更摘要

<!-- 用 1-3 句描述這個 PR 做了什麼 -->

## 變更類型

- [ ] 新功能（feat）
- [ ] Bug 修復（fix）
- [ ] 重構（refactor）
- [ ] 測試（test）
- [ ] 文件（docs）
- [ ] 設定/依賴（chore）

## 影響範圍

- [ ] apps/mobile
- [ ] apps/web（API）
- [ ] apps/web（Admin UI）
- [ ] packages/shared
- [ ] CI/CD
- [ ] 資料庫 schema

## 測試

- [ ] 新增/更新了對應的測試
- [ ] 所有既有測試通過
- [ ] 手動測試過以下場景：
  -

## 截圖（UI 變更時必須提供）

## Checklist

- [ ] 程式碼符合 engineering-standards.md 規範
- [ ] ESLint 零錯誤且零 warning（`--max-warnings 0`）
- [ ] 無 `any` 型別
- [ ] API 使用 Zod 驗證
- [ ] API 有 ownership 檢查（若適用）
- [ ] 回應使用標準 envelope
- [ ] 無硬編碼 secret
- [ ] 無 console.log（使用 structured logger）
- [ ] Loading/Empty/Error 狀態已處理（前端）
- [ ] 免責聲明已顯示（AI 功能）
- [ ] 不超出 MVP 範圍（對照 implementation-spec A.5）
