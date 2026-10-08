import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
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
import { formAnswerLabel, visibleFormAnswers } from "../utils/formAnswers";
import { PUBLIC_HOST, toPublicPort } from "../utils/publicEndpoint";

const RequestStatusPage = ({ onChanged }) => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { user } = useAuth();

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await requestService.cancelRequest(cancelTarget.request_id);
      setAlert({ type: "success", message: t("requests.cancelDone") });
      setReloadKey((key) => key + 1);
      onChanged?.();
    } catch (error) {
      // 그 사이 관리자가 승인을 시작했으면 서버가 취소를 거절한다 — 목록을 다시 읽어 지금 상태를 보여 준다.
      setAlert({ type: "error", message: error.message || t("requests.cancelFailed") });
      setReloadKey((key) => key + 1);
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);

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
              i18n.t("requests.loadFailed"),
          });
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setAlert({
          type: "error",
          message:
            i18n.t("requests.loadFailed"),
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRequests();
    }
  }, [user, reloadKey]);

  const getStatusIndicator = (status) => {
    switch (status) {
      case "PENDING":
        return <StatusIndicator type="pending">{t("requests.status.PENDING")}</StatusIndicator>;
      case "FULFILLED":
        return <StatusIndicator type="success">{t("requests.status.FULFILLED")}</StatusIndicator>;
      case "DENIED":
        return <StatusIndicator type="error">{t("requests.status.DENIED")}</StatusIndicator>;
      case "DELETED":
        return <StatusIndicator type="stopped">{t("requests.status.DELETED")}</StatusIndicator>;
      default:
        return <StatusIndicator type="info">{status}</StatusIndicator>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.resolvedLanguage, {
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
          {t("requests.loading")}
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
              ? t("requests.emptyAll")
              : t(`requests.emptyFiltered.${filter}`)}
          </p>
          <p className="text-(--decs-text-secondary)">
            {filter === "ALL"
              ? t("requests.emptyAllHint")
              : t("requests.emptyFilteredHint")}
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
                  <span className="inline-flex items-center gap-2">
                    {request.status === "PENDING" && (
                      <Button variant="normal" onClick={() => setCancelTarget(request)}>
                        {t("requests.cancel")}
                      </Button>
                    )}
                    <Button
                      variant="normal"
                      onClick={() => setSelectedRequest(request)}
                    >
                      {t("requests.detail")}
                    </Button>
                  </span>
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
                  { label: t("requests.resourceGroup"), value: request.rsgroup_name },
                  {
                    label: t("requests.image"),
                    value: `${request.image_name}:${request.image_version}`,
                  },
                  {
                    label: t("requests.expiresAt"),
                    value: new Date(request.expires_at).toLocaleDateString(
                      "ko-KR"
                    ),
                  },
                  { label: t("requests.server"), value: request.server_name },
                  { label: t("requests.ubuntuAccount"), value: request.ubuntu_username },
                  { label: t("requests.createdAt"), value: formatDate(request.created_at) },
                  {
                    label: t("requests.sharedGroup"),
                    value: request.requested_group_labels.join(", ") || t("common.none"),
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
                      {t("requests.externalPorts")}
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
                items={[{ label: t("requests.purpose"), value: request.usage_purpose }]}
              />

              {/* Status-specific information */}
              {request.status === "FULFILLED" && request.approved_at && (
                <Alert type="success" header={t("requests.approvedTitle")}>
                  {t("requests.approvedOn", { date: formatDate(request.approved_at) })}
                </Alert>
              )}

              {request.status === "DENIED" && request.admin_comment && (
                <Alert type="error" header={t("requests.deniedTitle")}>
                  {request.admin_comment}
                </Alert>
              )}

              {request.status === "PENDING" && (
                <Alert type="info" header={t("requests.pendingTitle")}>
                  {t("requests.pendingBody")}
                </Alert>
              )}
            </div>
          </Container>
        ))}
      </div>
    );

  const filterTabs = [
    { key: "ALL", label: t("requests.filterAll") },
    { key: "PENDING", label: t("requests.status.PENDING") },
    { key: "FULFILLED", label: t("requests.status.FULFILLED") },
    { key: "DENIED", label: t("requests.status.DENIED") },
    { key: "DELETED", label: t("requests.status.DELETED") },
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
        description={t("requests.description")}
        actions={
          <Link to="/user/request">
            <Button variant="primary" iconName="plus">
              {t("requests.newRequest")}
            </Button>
          </Link>
        }
      >
        {t("requests.title")}
      </Header>

      {/* Status Filter + List */}
      <Tabs tabs={filterTabs} activeTabId={filter} onChange={setFilter} />

      {cancelTarget && (
        <Modal
          visible
          dismissible={!cancelling}
          onDismiss={() => setCancelTarget(null)}
          header={t("requests.cancelConfirmTitle")}
          footer={
            <span className="inline-flex items-center gap-2">
              <Button variant="normal" disabled={cancelling} onClick={() => setCancelTarget(null)}>
                {t("common.close")}
              </Button>
              <Button variant="primary" loading={cancelling} disabled={cancelling} onClick={confirmCancel}>
                {t("requests.cancel")}
              </Button>
            </span>
          }
        >
          {t("requests.cancelConfirmBody", { id: cancelTarget.request_id })}
        </Modal>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <Modal
          visible
          size="large"
          onDismiss={() => setSelectedRequest(null)}
          header={
            <span className="inline-flex items-center gap-3">
              {t("requests.detailTitle")}
              {getStatusIndicator(selectedRequest.status)}
            </span>
          }
          footer={
            <Button variant="normal" onClick={() => setSelectedRequest(null)}>
              {t("common.close")}
            </Button>
          }
        >
          <div className="space-y-6">
            <p className="text-sm text-(--decs-text-secondary)">
              Request ID: {selectedRequest.request_id}
            </p>

            {/* User Information */}
            <div className="space-y-3">
              <Header variant="h3">{t("requests.userInfo")}</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  { label: t("auth.name"), value: selectedRequest.user_name },
                  { label: t("auth.email"), value: selectedRequest.user_email },
                  { label: t("auth.studentId"), value: selectedRequest.student_id },
                  { label: t("auth.department"), value: selectedRequest.department },
                ]}
              />
            </div>

            {/* Resource Group Information */}
            <div className="space-y-3">
              <Header variant="h3">{t("requests.resourceGroupInfo")}</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  {
                    label: t("requests.resourceGroupName"),
                    value: selectedRequest.rsgroup_name,
                  },
                  { label: t("requests.serverName"), value: selectedRequest.server_name },
                  {
                    label: t("requests.desc"),
                    value: selectedRequest.rsgroup_description,
                  },
                ]}
              />
            </div>

            {/* Request Information */}
            <div className="space-y-3">
              <Header variant="h3">{t("requests.requestInfo")}</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  {
                    label: t("auth.ubuntuUsername"),
                    value: selectedRequest.ubuntu_username,
                  },
                  {
                    label: t("requests.containerImage"),
                    value: `${selectedRequest.image_name}:${selectedRequest.image_version}`,
                  },
                  {
                    label: t("requests.expiresAt"),
                    value: new Date(
                      selectedRequest.expires_at
                    ).toLocaleDateString("ko-KR"),
                  },
                  {
                    label: t("requests.sharedGroup"),
                    value: selectedRequest.requested_group_labels.join(", ") || t("common.none"),
                  },
                ]}
              />
              <KeyValuePairs
                columns={1}
                items={[
                  {
                    label: t("requests.purpose"),
                    value: selectedRequest.usage_purpose,
                  },
                ]}
              />
              {visibleFormAnswers(selectedRequest.form_answers).length > 0 && (
                  <KeyValuePairs
                    columns={2}
                    items={visibleFormAnswers(selectedRequest.form_answers).map(
                      ([key, value]) => ({
                        label: formAnswerLabel(key),
                        value,
                      })
                    )}
                  />
                )}
            </div>

            {/* Server Access Information (for approved requests) */}
            {selectedRequest.status === "FULFILLED" && (
              <div className="space-y-3">
                <Header variant="h3">{t("requests.connectionInfo")}</Header>
                <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4 space-y-4">
                  <KeyValuePairs
                    columns={2}
                    items={[
                      {
                        label: t("requests.username"),
                        value: selectedRequest.ubuntu_username,
                        copyable: true,
                        copyText: selectedRequest.ubuntu_username,
                      },
                      {
                        label: t("requests.resourceGroup"),
                        value: selectedRequest.rsgroup_name,
                        copyable: true,
                        copyText: selectedRequest.rsgroup_name,
                      },
                      ...(selectedRequest.image_name
                        ? [
                            {
                              label: t("requests.containerImage"),
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
                    const sshPublicPort = sshPort && toPublicPort(sshPort.externalPort);
                    const jupyterPublicPort = jupyterPort && toPublicPort(jupyterPort.externalPort);
                    const sshText = sshPublicPort
                      ? `ssh ${selectedRequest.ubuntu_username}@${PUBLIC_HOST} -p ${sshPublicPort}`
                      : sshPort && `ssh ${selectedRequest.ubuntu_username}@${t("requests.serverIp")} -p ${sshPort.externalPort}`;
                    const jupyterText = jupyterPublicPort
                      ? `http://${PUBLIC_HOST}:${jupyterPublicPort}`
                      : jupyterPort && `http://${t("requests.serverIp")}:${jupyterPort.externalPort}`;
                    return (
                      <KeyValuePairs
                        columns={1}
                        items={[
                          ...(sshPort
                            ? [
                                {
                                  label: t("requests.sshAccess"),
                                  value: sshText,
                                  copyable: true,
                                  copyText: sshText,
                                },
                              ]
                            : []),
                          ...(jupyterPort
                            ? [
                                {
                                  label: t("requests.jupyterAccess"),
                                  value: jupyterText,
                                  copyable: true,
                                  copyText: jupyterText,
                                },
                              ]
                            : []),
                          ...otherPorts.map((port) => {
                            const publicPort = toPublicPort(port.externalPort);
                            return {
                              label: port.usagePurpose ? t("requests.extraPortWith", { purpose: port.usagePurpose }) : t("requests.extraPort"),
                              value: publicPort
                                ? `${PUBLIC_HOST}:${publicPort} → ${port.internalPort}`
                                : `${port.externalPort} → ${port.internalPort}`,
                            };
                          }),
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
                  <Header variant="h3">{t("requests.portDetailTitle")}</Header>
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
                              label: t("requests.externalPort"),
                              value: String(port.externalPort),
                            },
                            {
                              label: t("requests.internalPort"),
                              value: String(port.internalPort),
                            },
                            {
                              label: t("requests.portStatus"),
                              value:
                                port.isActive !== false ? (
                                  <StatusIndicator type="success">
                                    {t("common.active")}
                                  </StatusIndicator>
                                ) : (
                                  <StatusIndicator type="stopped">
                                    {t("common.inactive")}
                                  </StatusIndicator>
                                ),
                            },
                            {
                              label: t("requests.purpose"),
                              value: port.usagePurpose || t("requests.notSpecified"),
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
              <Header variant="h3">{t("requests.history")}</Header>
              <div className="space-y-2">
                <StatusIndicator type="info">
                  {t("requests.submittedOn", { date: formatDate(selectedRequest.created_at) })}
                </StatusIndicator>
                {selectedRequest.approved_at && (
                  <div>
                    <StatusIndicator type="success">
                      {t("requests.approvedDoneOn", { date: formatDate(selectedRequest.approved_at) })}
                    </StatusIndicator>
                  </div>
                )}
                {selectedRequest.status === "DENIED" && (
                  <div>
                    <StatusIndicator type="error">
                      {t("requests.deniedOn", { date: formatDate(selectedRequest.updated_at) })}
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
                        label: t("requests.adminComment"),
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
