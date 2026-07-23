# Fig.md — Figma Community 퍼블리시 준비

공개 퍼블리시 목표. 실제 퍼블리시는 **Figma 데스크톱 앱에서 소유자가 직접** 진행한다
(로그인·에셋 업로드·심사 제출은 대행 불가). 이 문서는 그 준비물과 절차다.

## 1. 프로덕션 빌드
```
npm install
npm run build   # dist/code.js + dist/ui.html 생성
```
manifest는 `dist/code.js`(메인) + `dist/ui.html`(UI)를 가리킨다. `dist/`는 gitignore이므로
퍼블리시 전 로컬에서 반드시 `npm run build`.

## 2. 매니페스트 (완료)
- `name`: Fig.md
- `editorType`: ["figma"]
- `documentAccess`: "dynamic-page"
- `networkAccess`: `{ allowedDomains: ["none"] }` — 네트워크 요청 없음(공개 퍼블리시 필수 필드)
- `id`: 현재 `fig-md-local`(개발용). **퍼블리시 시 Figma가 실제 플러그인 ID를 부여**한다.

## 3. 에셋 (직접 준비/업로드)
| 에셋 | 규격 | 용도 |
|---|---|---|
| 플러그인 아이콘 | **128×128 PNG** | 목록·실행 아이콘 |
| 커버 아트 | **1920×960 PNG** | Community 리스팅 상단 |
| 스크린샷(선택) | 자유 | 기능 소개 |

아이콘/커버는 Liquid Glass 아이덴티티(중립 그레이 + systemBlue 액센트, SF/Pretendard)에 맞춰
디자인 권장. (원하면 초안 생성 가능.)

## 4. 스토어 문구 (초안)

**이름:** Fig.md

**태그라인(짧게):**
- KO: 마크다운 ⇄ 피그마 문서 라운드트립 에디터
- EN: Round-trip Markdown ⇄ Figma frames

**설명(KO):**
> Fig.md는 마크다운을 피그마 프레임으로 렌더하고, 캔버스에서 편집한 뒤 다시 깨끗한
> 마크다운으로 추출하는 라운드트립 에디터입니다. 피그마 프레임을 노션 페이지처럼 씁니다.
>
> - 제목·문단·목록(중첩·체크박스)·인용(콜아웃)·구분선·코드블록·표·링크·이미지 지원
> - 표는 셀 단위로 정확히 왕복(내용 기반 열 너비, 마지막 열 채움)
> - 문서 테마는 현재 페이지 배경(라이트/다크)을 자동으로 따르고, 색상 직접 지정도 가능
> - 편집 중 "+"로 구분선·표(행x열) 삽입, 추출은 클립보드로 복사
>
> 마크다운으로 쓴 문서를 피그마에서 시각적으로 다듬고, 다시 마크다운으로 뽑아 노션·문서 도구로 옮기세요.

**설명(EN):**
> Fig.md renders Markdown into a Figma frame, lets you edit it on the canvas, and extracts
> clean Markdown back out — a round-trip editor that turns a frame into a Notion-like page.
>
> - Headings, paragraphs, nested/checkbox lists, callouts, dividers, code blocks, tables, links, images
> - Tables round-trip cell-by-cell (content-based column widths, last column fills)
> - Document theme follows the current page background (light/dark); custom colors optional
> - Insert dividers and tables (rows×cols) via a contextual "+"; export copies Markdown to the clipboard

**태그:** markdown, documentation, productivity, writing, text, developer

**카테고리:** Productivity (또는 Documentation)

## 5. 퍼블리시 전 QA (실기기)
`docs/qa-checklist.md` 수행 — 특히: 라이트/다크 페이지 테마, 표 렌더, 컨텍스트 "+" 삽입,
색상 직접 지정, 추출 왕복, 이물질 경고.

## 6. 퍼블리시 절차 (Figma 데스크톱)
1. Plugins → Development → Fig.md → **Publish** (또는 우클릭 → Publish new release)
2. 아이콘·커버·태그라인·설명·태그 입력
3. 공개 범위 = **Public**
4. 제출 → Figma 심사 → 승인되면 Community에 게시
5. 이후 업데이트: 코드 수정 → `npm run build` → Publish new release

## 7. 참고
- 소스: https://github.com/nuuxixv/fig-md
- 라이선스: (미정 — 오픈소스로 공개하려면 LICENSE 추가 권장, 예: MIT)
- 아이덴티티/토큰: `DESIGN.md`
