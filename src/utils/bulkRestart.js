// 선택한 컨테이너를 하나씩 재시작한다. 하나가 실패해도 나머지는 계속한다.
// 순차로 보내는 이유: 같은 노드에서 여러 컨테이너가 동시에 commit·재생성되며 부하가 몰리는 것을 피한다.
export async function restartEach(items, start) {
  const results = [];
  for (const item of items) {
    try {
      await start(item);
      results.push({ item, ok: true });
    } catch (error) {
      results.push({ item, ok: false, error });
    }
  }
  return results;
}
