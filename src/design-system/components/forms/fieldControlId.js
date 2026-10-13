import React from "react";

export const FieldControlIdContext = React.createContext(undefined);

/**
 * FormField 안의 입력 컨트롤이 라벨과 이어질 id를 얻는다. 컨트롤에 id를 직접 줬으면 그 값을 쓰고,
 * ariaLabel로 따로 이름을 붙인 컨트롤(한 필드 안의 두 번째 입력 등)은 필드 라벨에 묶지 않는다.
 */
export function useFieldControlId(id, ariaLabel) {
  const fieldId = React.useContext(FieldControlIdContext);
  return id ?? (ariaLabel ? undefined : fieldId);
}
