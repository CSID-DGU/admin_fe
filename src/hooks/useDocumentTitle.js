import { useEffect } from "react";

// index.html에 적힌 제품 이름. 화면 이름 뒤에 붙여 탭 여러 개를 띄워도 어느 화면인지 구분되게 한다.
const BASE_TITLE = document.title;

export function useDocumentTitle(pageTitle) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${BASE_TITLE}` : BASE_TITLE;
    return () => { document.title = BASE_TITLE; };
  }, [pageTitle]);
}

/** 사이드 메뉴 항목(섹션 안 항목 포함)에서 지금 화면에 해당하는 항목의 이름을 찾는다. */
export function activeNavText(nav) {
  const items = nav.items.flatMap((item) => (item.type === "section" ? item.items : [item]));
  return items.find((item) => item.href === nav.activeHref)?.text;
}
