import { useState, useEffect } from "react";
import userService from "../../services/userService";
import UserGroupsModal from "./UserGroupsModal";
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
  Select,
  StatusIndicator,
  Table,
} from "../../design-system";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [groupsUser, setGroupsUser] = useState(null);

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await userService.getAllUsers();

      if (response.status === 200) {
        setUsers(response.data.data || []);
        setLastUpdated(new Date());
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

  // 사용자 활성/비활성 토글
  const handleToggleActive = async (user) => {
    try {
      const response = user.isActive
        ? await userService.deactivateUser(user.userId)
        : await userService.reactivateUser(user.userId);

      if (response.status === 200) {
        setAlert({
          type: "success",
          message: user.isActive
            ? "사용자를 비활성화했습니다."
            : "사용자를 재활성화했습니다.",
        });
        loadUsers();
      } else {
        setAlert({
          type: "error",
          message: user.isActive
            ? "사용자 비활성화에 실패했습니다."
            : "사용자 재활성화에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("사용자 활성 상태 변경 실패:", error);
      setAlert({
        type: "error",
        message: `사용자 활성 상태 변경에 실패했습니다: ${error.message}`,
      });
    }
  };

  // 사용자 권한 토글 (ADMIN <-> USER)
  const handleToggleRole = async (user) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      const response = await userService.changeUserRole(user.userId, newRole);

      if (response.status === 200) {
        setAlert({
          type: "success",
          message: "사용자 권한을 변경했습니다.",
        });
        loadUsers();
      } else {
        setAlert({
          type: "error",
          message: "사용자 권한 변경에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("사용자 권한 변경 실패:", error);
      setAlert({
        type: "error",
        message: `사용자 권한 변경에 실패했습니다: ${error.message}`,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--decs-space-xs)" }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--decs-text-heading)" }}>
              {user.name}
            </div>
            <div style={{ color: "var(--decs-text-secondary)" }}>{user.email}</div>
          </div>
          <ButtonDropdown
            trigger="icon"
            ariaLabel={`${user.name} 관리`}
            items={[
              {
                id: "toggle-active",
                text: user.isActive ? "비활성화" : "활성화",
                onClick: () => handleToggleActive(user),
              },
              {
                id: "toggle-role",
                text: user.role === "ADMIN" ? "사용자로 변경" : "관리자로 변경",
                onClick: () => handleToggleRole(user),
              },
              {
                id: "manage-groups",
                text: "그룹 관리",
                onClick: () => setGroupsUser(user),
              },
            ]}
          />
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
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--decs-space-l)" }}>
      {/* 페이지 헤더 */}
      <Header
        variant="h1"
        description="등록된 사용자들을 관리하고 권한을 설정할 수 있습니다."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--decs-space-s)" }}>
            {lastUpdated ? (
              <span style={{ fontSize: "var(--decs-fs-body-s)", color: "var(--decs-text-secondary)" }}>
                {lastUpdated.toLocaleTimeString("ko-KR")} 기준
              </span>
            ) : null}
            <Button iconName="arrow-path" loading={loading} onClick={loadUsers}>
              새로고침
            </Button>
          </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--decs-space-m)" }}>
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

      {groupsUser && <UserGroupsModal user={groupsUser} onDismiss={() => setGroupsUser(null)} />}

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
    </div>
  );
};

export default UserManagementPage;
