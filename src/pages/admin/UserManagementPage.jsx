import { useState, useEffect } from "react";
import userService from "../../services/userService";
import {
  Alert,
  Badge,
  Button,
  ButtonDropdown,
  Container,
  FormField,
  Header,
  Input,
  KeyValuePairs,
  Modal,
  Select,
  StatusIndicator,
  Table,
} from "../../design-system";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState(null); // { userId, name }

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

  // 사용자 삭제 (확인은 Modal에서 처리)
  const handleDeleteUser = async (userId) => {
    setDeleteTarget(null);
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

  const columns = [
    {
      id: "user",
      header: "사용자",
      minWidth: "180px",
      cell: (user) => (
        <div>
          <div className="font-medium text-(--decs-text-heading)">
            {user.name}
          </div>
          <div className="text-(--decs-text-secondary)">{user.email}</div>
        </div>
      ),
    },
    {
      id: "studentId",
      header: "학번",
      cell: (user) => user.studentId,
    },
    {
      id: "department",
      header: "학과",
      cell: (user) => user.department,
    },
    {
      id: "phone",
      header: "연락처",
      cell: (user) => user.phone,
    },
    {
      id: "role",
      header: "역할",
      cell: (user) => (
        <Badge color={user.role === "ADMIN" ? "brand" : "grey"}>
          {user.role === "ADMIN" ? "관리자" : "사용자"}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "상태",
      cell: (user) => (
        <StatusIndicator type={user.isActive ? "success" : "stopped"}>
          {user.isActive ? "활성" : "비활성"}
        </StatusIndicator>
      ),
    },
    {
      id: "createdAt",
      header: "가입일",
      cell: (user) => formatDate(user.createdAt),
    },
    {
      id: "actions",
      header: "작업",
      width: "110px",
      cell: (user) => (
        <ButtonDropdown
          items={[
            {
              id: "toggle-active",
              text: user.isActive ? "비활성화" : "활성화",
              disabled: true, // 백엔드 API 미구현
            },
            {
              id: "toggle-role",
              text: user.role === "ADMIN" ? "사용자로 변경" : "관리자로 변경",
              disabled: true, // 백엔드 API 미구현
            },
            {
              id: "delete",
              text: "삭제",
              iconName: "trash",
              variant: "danger",
              onClick: () =>
                setDeleteTarget({ userId: user.userId, name: user.name }),
            },
          ]}
        >
          작업
        </ButtonDropdown>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <Header
        variant="h1"
        description="등록된 사용자들을 관리하고 권한을 설정할 수 있습니다."
        actions={
          <Button iconName="arrow-path" loading={loading} onClick={loadUsers}>
            새로고침
          </Button>
        }
      >
        사용자 관리
      </Header>

      {/* 알림 */}
      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* 검색 및 필터 */}
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="검색" htmlFor="user-search">
            <Input
              id="user-search"
              iconName="magnifying-glass"
              placeholder="이름, 이메일, 학번, 학과로 검색"
              value={searchTerm}
              onChange={(value) => setSearchTerm(value)}
            />
          </FormField>
          <FormField label="역할" htmlFor="user-role-filter">
            <Select
              id="user-role-filter"
              selectedValue={filterRole}
              onChange={(value) => setFilterRole(value)}
              options={[
                { value: "ALL", label: "전체" },
                { value: "ADMIN", label: "관리자" },
                { value: "USER", label: "사용자" },
              ]}
            />
          </FormField>
          <FormField label="상태" htmlFor="user-status-filter">
            <Select
              id="user-status-filter"
              selectedValue={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              options={[
                { value: "ALL", label: "전체" },
                { value: "ACTIVE", label: "활성" },
                { value: "INACTIVE", label: "비활성" },
              ]}
            />
          </FormField>
        </div>
      </Container>

      {/* 사용자 목록 */}
      <Container disablePadding>
        <Table
          density="compact"
          trackBy="userId"
          columns={columns}
          items={filteredUsers}
          loading={loading}
          empty="검색 조건에 맞는 사용자가 없습니다."
          header={
            <Header variant="h2" counter={`(${filteredUsers.length})`}>
              사용자
            </Header>
          }
        />
      </Container>

      {/* 통계 정보 */}
      <Container header={<Header variant="h2">사용자 통계</Header>}>
        <KeyValuePairs
          columns={4}
          items={[
            { label: "전체 사용자", value: users.length },
            {
              label: "관리자",
              value: users.filter((u) => u.role === "ADMIN").length,
            },
            {
              label: "활성 사용자",
              value: users.filter((u) => u.isActive).length,
            },
            {
              label: "비활성 사용자",
              value: users.filter((u) => !u.isActive).length,
            },
          ]}
        />
      </Container>

      {/* 삭제 확인 */}
      <Modal
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        header="사용자 삭제"
        size="small"
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button
              variant="primary"
              style={{
                background: "var(--decs-status-error)",
                color: "#fff",
              }}
              onClick={() => handleDeleteUser(deleteTarget.userId)}
            >
              삭제
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p>
            사용자 &quot;{deleteTarget.name}&quot;이(가) 영구적으로 삭제됩니다.
            이 작업은 되돌릴 수 없습니다.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementPage;
