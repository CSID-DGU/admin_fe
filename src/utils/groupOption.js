// 공유 그룹 선택지. 값은 그룹 id다 — gid는 새 그룹(승인 대기)이면 아직 없다. admin_be는 "새로 만들기" 때 그룹을
// DB에만 만들고, 그 그룹을 고른 신청이 승인될 때 인프라 그룹과 gid가 생긴다.
export function toGroupOption(g) {
  const groupId = g.groupId ?? g.group_id;
  const ubuntuGid = g.ubuntuGid ?? g.ubuntu_gid ?? null;
  const groupName = g.groupName ?? g.group_name;
  return {
    value: String(groupId),
    label: ubuntuGid == null ? `${groupName} (승인 시 생성)` : `${groupName} (${ubuntuGid})`,
    groupName,
    groupId,
    ubuntuGid,
  };
}
