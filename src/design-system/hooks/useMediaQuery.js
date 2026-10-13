import React from "react";

// 화면 폭 기준. 좁은 화면은 옆 메뉴를 접고, 휴대폰 폭은 여러 열을 한 열로 쌓는다.
export const NARROW_QUERY = "(max-width: 1023px)";
export const PHONE_QUERY = "(max-width: 639px)";

export function useMediaQuery(query) {
  const subscribe = React.useCallback((onChange) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
