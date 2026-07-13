import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Container,
  Header,
  KeyValuePairs,
  Modal,
  StatusIndicator,
  Tabs,
} from "../design-system";
import { useAuth } from "../hooks/useAuth";
import { requestService } from "../services/requestService";
import { mapRequestDtoToUiModel } from "../utils/requestMapper";

const RequestStatusPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setAlert(null);

      try {
        const response = await requestService.getUserRequests();

        if (response.status === 200) {
          // API 응답 데이터를 기존 UI에 맞게 변환
          const transformedRequests = (response.data?.data ?? []).map(
            mapRequestDtoToUiModel
          );

          setRequests(transformedRequests);
        } else {
          setAlert({
            type: "error",
            message:
              "요청 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          });
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setAlert({
          type: "error",
          message:
            "요청 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRequests();
    }
  }, [user]);

  const getStatusIndicator = (status) => {
    switch (status) {
      case "PENDING":
        return <StatusIndicator type="pending">대기중</StatusIndicator>;
      case "FULFILLED":
        return <StatusIndicator type="success">승인됨</StatusIndicator>;
      case "DENIED":
        return <StatusIndicator type="error">거절됨</StatusIndicator>;
      case "DELETED":
        return <StatusIndicator type="stopped">삭제됨</StatusIndicator>;
      default:
        return <StatusIndicator type="info">{status}</StatusIndicator>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRequests = requests
    .filter((request) => {
      if (filter === "ALL") return true;
      return request.status === filter;
    })
    .sort((a, b) => {
      // Sort by priority: PENDING > FULFILLED > DENIED
      const statusPriority = { PENDING: 1, FULFILLED: 2, DENIED: 3, DELETED: 4 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      // Within same status, sort by date (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    FULFILLED: requests.filter((r) => r.status === "FULFILLED").length,
    DENIED: requests.filter((r) => r.status === "DENIED").length,
    DELETED: requests.filter((r) => r.status === "DELETED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StatusIndicator type="loading">
          신청 현황을 불러오고 있어요
        </StatusIndicator>
      </div>
    );
  }

  const requestList =
    filteredRequests.length === 0 ? (
      <Container>
        <div className="text-center py-12 space-y-2">
          <p className="text-(--decs-text-heading) font-bold">
            {filter === "ALL"
              ? "아직 신청한 서버가 없어요"
              : `${
                  filter === "PENDING"
                    ? "대기중인"
                    : filter === "FULFILLED"
                    ? "승인된"
                    : filter === "DENIED"
                    ? "거절된"
                    : "삭제된"
                } 신청이 없어요`}
          </p>
          <p className="text-(--decs-text-secondary)">
            {filter === "ALL"
              ? "새 신청을 하면 이곳에서 바로 확인할 수 있어요."
              : "다른 상태의 신청을 확인해 보세요."}
          </p>
        </div>
      </Container>
    ) : (
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Container
            key={request.request_id}
            header={
              <Header
                variant="h3"
                actions={
                  <Button
                    variant="normal"
                    onClick={() => setSelectedRequest(request)}
                  >
                    상세보기
                  </Button>
                }
              >
                <span className="inline-flex items-center gap-3">
                  #{request.request_id} - {request.ubuntu_username}
                  {getStatusIndicator(request.status)}
                </span>
              </Header>
            }
          >
            <div className="space-y-4">
              <KeyValuePairs
                columns={4}
                items={[
                  { label: "리소스 그룹", value: request.rsgroup_name },
                  {
                    label: "이미지",
                    value: `${request.image_name}:${request.image_version}`,
                  },
                  {
                    label: "저장 공간",
                    value: `${request.volume_size_GB} GiB`,
                  },
                  {
                    label: "만료일",
                    value: new Date(request.expires_at).toLocaleDateString(
                      "ko-KR"
                    ),
                  },
                  { label: "서버", value: request.server_name },
                  { label: "Ubuntu 계정", value: request.ubuntu_username },
                  { label: "신청일", value: formatDate(request.created_at) },
                  {
                    label: "Ubuntu GIDs",
                    value: request.ubuntu_gids?.join(", ") || "설정되지 않음",
                  },
                ]}
              />

              {/* Port Information */}
              {(() => {
                const ports = request.port_mappings;
                if (!ports || ports.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm text-(--decs-text-inactive) mb-1">
                      외부 포트
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ports.map((port, index) => (
                        <Badge
                          key={index}
                          color={port.isActive !== false ? "green" : "grey"}
                        >
                          {port.externalPort}:{port.internalPort}
                          {port.usagePurpose && ` (${port.usagePurpose})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <KeyValuePairs
                columns={1}
                items={[{ label: "사용 목적", value: request.usage_purpose }]}
              />

              {/* Status-specific information */}
              {request.status === "FULFILLED" && request.approved_at && (
                <Alert type="success" header="승인이 완료됐어요">
                  승인일: {formatDate(request.approved_at)}
                </Alert>
              )}

              {request.status === "DENIED" && request.admin_comment && (
                <Alert type="error" header="신청이 거절됐어요">
                  {request.admin_comment}
                </Alert>
              )}

              {request.status === "PENDING" && (
                <Alert type="info" header="승인을 기다리고 있어요">
                  관리자 검토가 끝나면 이곳에서 결과를 확인할 수 있어요.
                </Alert>
              )}
            </div>
          </Container>
        ))}
      </div>
    );

  const filterTabs = [
    { key: "ALL", label: "전체" },
    { key: "PENDING", label: "대기중" },
    { key: "FULFILLED", label: "승인됨" },
    { key: "DENIED", label: "거절됨" },
    { key: "DELETED", label: "삭제됨" },
  ].map((tab) => ({
    id: tab.key,
    label: `${tab.label} (${statusCounts[tab.key]})`,
    content: requestList,
  }));

  return (
    <div className="space-y-6">
      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          dismissible
          onDismiss={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Header
        variant="h1"
        description="신청한 서버의 진행 상태를 한눈에 확인할 수 있어요."
        actions={
          <Link to="/user/request">
            <Button variant="primary" iconName="plus">
              새 신청
            </Button>
          </Link>
        }
      >
        신청 현황 조회
      </Header>

      {/* Status Filter + List */}
      <Tabs tabs={filterTabs} activeTabId={filter} onChange={setFilter} />

      {/* Detail Modal */}
      {selectedRequest && (
        <Modal
          visible
          size="large"
          onDismiss={() => setSelectedRequest(null)}
          header={
            <span className="inline-flex items-center gap-3">
              신청 상세 정보
              {getStatusIndicator(selectedRequest.status)}
            </span>
          }
          footer={
            <Button variant="normal" onClick={() => setSelectedRequest(null)}>
              닫기
            </Button>
          }
        >
          <div className="space-y-6">
            <p className="text-sm text-(--decs-text-secondary)">
              Request ID: {selectedRequest.request_id}
            </p>

            {/* User Information */}
            <div className="space-y-3">
              <Header variant="h3">사용자 정보</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  { label: "이름", value: selectedRequest.user_name },
                  { label: "이메일", value: selectedRequest.user_email },
                  { label: "학번", value: selectedRequest.student_id },
                  { label: "학과", value: selectedRequest.department },
                ]}
              />
            </div>

            {/* Resource Group Information */}
            <div className="space-y-3">
              <Header variant="h3">리소스 그룹 정보</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  {
                    label: "리소스 그룹명",
                    value: selectedRequest.rsgroup_name,
                  },
                  { label: "서버명", value: selectedRequest.server_name },
                  {
                    label: "설명",
                    value: selectedRequest.rsgroup_description,
                  },
                ]}
              />
            </div>

            {/* Request Information */}
            <div className="space-y-3">
              <Header variant="h3">신청 정보</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  {
                    label: "Ubuntu 사용자명",
                    value: selectedRequest.ubuntu_username,
                  },
                  {
                    label: "저장 공간",
                    value: `${selectedRequest.volume_size_GB} GiB`,
                  },
                  {
                    label: "컨테이너 이미지",
                    value: `${selectedRequest.image_name}:${selectedRequest.image_version}`,
                  },
                  {
                    label: "만료일",
                    value: new Date(
                      selectedRequest.expires_at
                    ).toLocaleDateString("ko-KR"),
                  },
                  ...(selectedRequest.ubuntu_gids &&
                  selectedRequest.ubuntu_gids.length > 0
                    ? [
                        {
                          label: "Ubuntu GIDs",
                          value: selectedRequest.ubuntu_gids.join(", "),
                        },
                      ]
                    : []),
                ]}
              />
              <KeyValuePairs
                columns={1}
                items={[
                  {
                    label: "사용 목적",
                    value: selectedRequest.usage_purpose,
                  },
                ]}
              />
              {selectedRequest.form_answers &&
                Object.keys(selectedRequest.form_answers).length > 0 && (
                  <KeyValuePairs
                    columns={2}
                    items={Object.entries(selectedRequest.form_answers).map(
                      ([key, value]) => ({
                        label: key.replace("_", " "),
                        value,
                      })
                    )}
                  />
                )}
            </div>

            {/* Server Access Information (for approved requests) */}
            {selectedRequest.status === "FULFILLED" && (
              <div className="space-y-3">
                <Header variant="h3">서버 접속 정보</Header>
                <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4 space-y-4">
                  <KeyValuePairs
                    columns={2}
                    items={[
                      {
                        label: "사용자명",
                        value: selectedRequest.ubuntu_username,
                        copyable: true,
                        copyText: selectedRequest.ubuntu_username,
                      },
                      {
                        label: "리소스 그룹",
                        value: selectedRequest.rsgroup_name,
                        copyable: true,
                        copyText: selectedRequest.rsgroup_name,
                      },
                      ...(selectedRequest.image_name
                        ? [
                            {
                              label: "컨테이너 이미지",
                              value: `${selectedRequest.image_name}:${selectedRequest.image_version}`,
                              copyable: true,
                              copyText: `${selectedRequest.image_name}:${selectedRequest.image_version}`,
                            },
                          ]
                        : []),
                      ...(selectedRequest.ubuntu_uid != null
                        ? [
                            {
                              label: "Ubuntu UID",
                              value: String(selectedRequest.ubuntu_uid),
                              copyable: true,
                              copyText: String(selectedRequest.ubuntu_uid),
                            },
                          ]
                        : []),
                      ...(selectedRequest.ubuntu_gid != null
                        ? [
                            {
                              label: "Ubuntu GID",
                              value: String(selectedRequest.ubuntu_gid),
                              copyable: true,
                              copyText: String(selectedRequest.ubuntu_gid),
                            },
                          ]
                        : []),
                    ]}
                  />

                  {/* SSH/Jupyter/추가 포트 접속 정보 */}
                  {(() => {
                    const ports = selectedRequest.port_mappings;
                    if (!ports || ports.length === 0) return null;
                    const sshPort = ports.find((p) => p.internalPort === 22);
                    const jupyterPort = ports.find(
                      (p) => p.internalPort === 8888
                    );
                    const otherPorts = ports.filter(
                      (p) => p.internalPort !== 22 && p.internalPort !== 8888
                    );
                    return (
                      <KeyValuePairs
                        columns={1}
                        items={[
                          ...(sshPort
                            ? [
                                {
                                  label: "SSH 접속",
                                  value: `ssh ${selectedRequest.ubuntu_username}@<서버IP> -p ${sshPort.externalPort}`,
                                  copyable: true,
                                  copyText: `ssh ${selectedRequest.ubuntu_username}@<서버IP> -p ${sshPort.externalPort}`,
                                },
                              ]
                            : []),
                          ...(jupyterPort
                            ? [
                                {
                                  label: "Jupyter 접속",
                                  value: `http://<서버IP>:${jupyterPort.externalPort}`,
                                  copyable: true,
                                  copyText: `http://<서버IP>:${jupyterPort.externalPort}`,
                                },
                              ]
                            : []),
                          ...otherPorts.map((port) => ({
                            label: `추가 포트${
                              port.usagePurpose ? ` (${port.usagePurpose})` : ""
                            }`,
                            value: `${port.externalPort} → ${port.internalPort}`,
                          })),
                        ]}
                      />
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Port Mappings Information */}
            {(() => {
              const ports = selectedRequest.port_mappings;
              if (!ports || ports.length === 0) return null;
              return (
                <div className="space-y-3">
                  <Header variant="h3">외부 포트 상세 정보</Header>
                  <div className="space-y-3">
                    {ports.map((port, index) => (
                      <div
                        key={index}
                        className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4"
                      >
                        <KeyValuePairs
                          columns={4}
                          items={[
                            {
                              label: "외부 포트",
                              value: String(port.externalPort),
                            },
                            {
                              label: "내부 포트",
                              value: String(port.internalPort),
                            },
                            {
                              label: "상태",
                              value:
                                port.isActive !== false ? (
                                  <StatusIndicator type="success">
                                    활성
                                  </StatusIndicator>
                                ) : (
                                  <StatusIndicator type="stopped">
                                    비활성
                                  </StatusIndicator>
                                ),
                            },
                            {
                              label: "사용 목적",
                              value: port.usagePurpose || "지정되지 않음",
                            },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Status History */}
            <div className="space-y-3">
              <Header variant="h3">처리 이력</Header>
              <div className="space-y-2">
                <StatusIndicator type="info">
                  신청 제출: {formatDate(selectedRequest.created_at)}
                </StatusIndicator>
                {selectedRequest.approved_at && (
                  <div>
                    <StatusIndicator type="success">
                      승인 완료: {formatDate(selectedRequest.approved_at)}
                    </StatusIndicator>
                  </div>
                )}
                {selectedRequest.status === "DENIED" && (
                  <div>
                    <StatusIndicator type="error">
                      거절: {formatDate(selectedRequest.updated_at)}
                    </StatusIndicator>
                  </div>
                )}
              </div>
              {selectedRequest.admin_comment && (
                <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-3">
                  <KeyValuePairs
                    columns={1}
                    items={[
                      {
                        label: "관리자 의견",
                        value: selectedRequest.admin_comment,
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RequestStatusPage;
