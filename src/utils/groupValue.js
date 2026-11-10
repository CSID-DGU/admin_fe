// 그룹 변경 요청의 값(gid 배열 또는 그 JSON 문자열)을 그룹명 목록으로 바꾼다.
// 이름을 모르는 gid(관리자가 삭제한 그룹)는 "GID <n>"으로 둔다.
export function formatGroupValue(value, groupOptions = []) {
  let gids = value;
  if (typeof gids === "string") {
    try {
      gids = JSON.parse(gids);
    } catch {
      return value;
    }
  }
  if (!Array.isArray(gids)) return value;
  const nameByGid = new Map(
    groupOptions.filter((g) => g.ubuntuGid != null).map((g) => [String(g.ubuntuGid), g.groupName])
  );
  return gids.map((gid) => nameByGid.get(String(gid)) ?? `GID ${gid}`).join(", ");
}
