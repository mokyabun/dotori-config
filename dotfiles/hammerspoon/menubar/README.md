# Web menubar PoC

기존 canvas menubar는 `../menubar_legacy/`에 보존했습니다. `common.lua`의
`require("menubar")`는 이제 `hs.webview` 기반 바를 로드합니다. 데이터 수집·yabai
이벤트 처리·모니터 및 잠자기 복귀 처리는 기존 `init.lua`를 그대로 사용합니다.

## 수정하는 곳

- `web/index.html`: 화면 구조
- `web/menubar.css`: 색상, 글꼴, 간격 등 스타일
- `web/menubar.js`: DOM 업데이트
- `constants.lua`: 네이티브 창 너비와 화면 오른쪽 여백
- `view.lua`: 창 수명, Lua ↔ JS 브리지, 파일 감시

HTML/CSS/JS 저장 시 200ms debounce 후 모든 바의 웹 문서를 다시 로드합니다.
JS가 `ui.ready`를 보내면 최신 상태를 다시 전달합니다. Lua 파일 변경은 Hammerspoon
전체 reload가 필요합니다. 빌드, Node 서버, 외부 패키지는 필요 없습니다.

CSS/JS는 개별 파일로 관리하되 로딩 시 HTML에 인라인으로 합쳐 `webview:html()`로
전달합니다. 서버 포트를 열거나 광범위한 로컬 파일 접근 권한을 부여하지 않습니다.
외부 탐색과 새 창 열기는 차단합니다.

## 이벤트

이번 PoC는 내부 WebKit 브리지를 사용합니다. WebSocket/Unix 소켓 서버는 아직
추가하지 않았습니다. 이벤트 형식은 이후 다른 전송 방식에서도 유지할 수 있습니다.

```js
// JS → Lua: 문서가 준비됨
window.webkit.messageHandlers.plater.postMessage({ type: "ui.ready" });

// Lua → JS: evaluateJavaScript로 전달
window.plater.receive({
  type: "menubar.update",
  payload: {
    screen: "screen-uuid",
    workspaces: ["1", "2", "3"],
    focused: "2",
    clock: { day: "TUE", date: "09.01", time: "12:30" },
    power: "6.0W", cpu: "4%", ram: "38G",
    caffeinate: { display: false, system: false }
  }
});
```

메뉴 바는 기존과 동일하게 읽기 전용입니다. 모니터마다 해당 모니터의 Space를
표시하고, 네이티브 전체 화면에서는 해당 바를 숨깁니다. 투명한 창의 크기는
바 영역으로 제한되며 전체 데스크톱을 덮지 않습니다. 화면 재연결 시 창을 재생성합니다.

Hammerspoon 콘솔에서 상태 확인 및 UI만 수동 reload:

```lua
hs.inspect(require("menubar.view").status())
require("menubar.view").reload()
```

## 기존 canvas로 복귀

`common.lua`에서 `require("menubar")`를 `require("menubar_legacy")`로 변경한 뒤
Hammerspoon 전체 reload를 실행합니다. 두 모듈을 동시에 로드하지 마세요.
