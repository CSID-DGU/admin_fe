import { useState, useEffect } from "react";
import userService from "../../services/userService";
import Alert from "../../components/UI/Alert";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Badge from "../../components/UI/Badge";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log("사용자 목록 로드 시작...");

      const response = await userService.getAllUsers();
      console.log("받은 응답:", response);

      if (response.status === 200) {
        setUsers(response.data.data || []);
        setAlert({
          type: "success",
          message: "사용자 목록을 성공적으로 불러왔습니다.",
        });
      } else {
        setAlert({
          type: "error",
          message: "사용자 목록을 불러오는데 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("사용자 목록 로드 실패:", error);
      setAlert({
        type: "error",
        message: `사용자 목록을 불러오는데 실패했습니다: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };
  // 사용자 삭제
  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`정말로 "${userName}" 사용자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await userService.deleteUser(userId);

      if (response.status === 200) {
        setAlert({
          type: "success",
          message: "사용자가 성공적으로 삭제되었습니다.",
        });
        loadUsers(); // 목록 새로고침
      } else {
        setAlert({
          type: "error",
          message: "사용자 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("사용자 삭제 실패:", error);
      setAlert({
        type: "error",
        message: "사용자 삭제에 실패했습니다.",
      });
    }
  };

  // 필터링된 사용자 목록
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.studentId.includes(searchTerm) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === "ALL" || user.role === filterRole;
    const matchesStatus =
      filterStatus === "ALL" ||
      (filterStatus === "ACTIVE" ? user.isActive : !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-1">
            등록된 사용자들을 관리하고 권한을 설정할 수 있습니다.
          </p>
        </div>
        <Button
          onClick={loadUsers}
          disabled={loading}
          className="bg-brand-500 hover:bg-brand-600"
        >
          {loading ? "새로고침 중..." : "새로고침"}
        </Button>
      </div>

      {/* 알림 */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* 검색 및 필터 */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              검색
            </label>
            <input
              type="text"
              placeholder="이름, 이메일, 학번, 학과로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              역할
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            >
              <option value="ALL">전체</option>
              <option value="ADMIN">관리자</option>
              <option value="USER">사용자</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            >
              <option value="ALL">전체</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            <p className="text-gray-600 mt-2">사용자 목록을 불러오는 중...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">검색 조건에 맞는 사용자가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학과/연락처
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할/상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          학번: {user.studentId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.department}
                      </div>
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2 items-baseline">
                        <Badge
                          variant={
                            user.role === "ADMIN" ? "primary" : "secondary"
                          }
                        >
                          {user.role === "ADMIN" ? "관리자" : "사용자"}
                        </Badge>
                        <Badge variant={user.isActive ? "success" : "error"}>
                          {user.isActive ? "활성" : "비활성"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <select
                          value={user.role}
                          disabled
                          title="백엔드 API 미구현"
                          className="text-sm px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                        >
                          <option value="USER">사용자</option>
                          <option value="ADMIN">관리자</option>
                        </select>
                        <div className="flex space-x-2">
                          <button
                            disabled
                            title="백엔드 API 미구현"
                            className="text-sm px-3 py-1 border border-gray-300 text-gray-400 cursor-not-allowed"
                          >
                            {user.isActive ? "비활성화" : "활성화"}
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteUser(user.userId, user.name)
                            }
                            className="text-sm px-3 py-1 border border-red-500 text-red-600 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 통계 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-500">
              {users.length}
            </div>
            <div className="text-sm text-gray-600">전체 사용자</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter((u) => u.role === "ADMIN").length}
            </div>
            <div className="text-sm text-gray-600">관리자</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.isActive).length}
            </div>
            <div className="text-sm text-gray-600">활성 사용자</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {users.filter((u) => !u.isActive).length}
            </div>
            <div className="text-sm text-gray-600">비활성 사용자</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserManagementPage;
