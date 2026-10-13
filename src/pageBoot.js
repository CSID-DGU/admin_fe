// index.html에 인라인으로 있던 스크립트를 옮긴 것이다. nginx가 보내는 CSP(script-src)는 인라인 스크립트와
// 인라인 이벤트 핸들러를 막는다 — 화면에 스크립트가 끼어들어도 로그인 토큰을 읽어 가지 못하게 하기 위해서다.
// 여기서 불러오는 외부 스크립트의 출처를 바꾸면 nginx.conf의 script-src도 같이 고친다.

const CLARITY_PROJECT_ID = 'xelxgi7ss0'
const GA_MEASUREMENT_ID = 'G-ZQCD1GVMT6'

function loadScript(src) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

// 글꼴 스타일시트는 렌더링을 막지 않도록 media=print로 받아 둔 것을 여기서 화면에 적용한다.
function applyDeferredStyles() {
  document.querySelectorAll('link[data-deferred-style]').forEach((link) => {
    link.media = 'all'
  })
}

// IP 주소로 접속하면 세션 쿠키(_clsk)의 Domain 속성이 유효하지 않아 브라우저가 거부하고 콘솔에 경고를 남긴다.
// 실제 도메인에서만 불러온다 — 어차피 IP 접속에서는 페이지를 넘나드는 세션 추적도 되지 않는다.
function startClarity() {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(location.hostname)) return
  window.clarity =
    window.clarity ||
    function () {
      ;(window.clarity.q = window.clarity.q || []).push(arguments)
    }
  loadScript(`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`)
}

function startGoogleAnalytics() {
  window.dataLayer = window.dataLayer || []
  // gtag.js는 배열이 아니라 arguments 객체가 쌓이기를 기대한다.
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID)
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`)
}

applyDeferredStyles()
startClarity()
startGoogleAnalytics()
