import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  Alert,
  Button,
  Container,
  Header,
  KeyValuePairs,
  Modal,
  StatusIndicator,
  Tabs,
} from "../design-system";
import { requestService } from "../services/requestService";

const MyChangeRequestsPage = () => {
  const { t } = useTranslation();
  const [changeRequests, setChangeRequests] = useState([]);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, FULFILLED, DENIED
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchChangeRequests = async () => {
      setIsLoading(true);
      setAlert(null);

      try {
        const response = await requestService.getMyChangeRequests();

        if (response.status === 200) {
          const changeRequestsArray = response.data?.data ?? [];
          setChangeRequests(changeRequestsArray.filter((request) => request.changeType !== "VOLUME_SIZE"));
        } else {
          setAlert({
            type: "error",
            message:
              i18n.t("changes.loadFailed"),
          });
        }
      } catch (error) {
        console.error("Failed to fetch my change requests:", error);
        setAlert({
          type: "error",
          message:
            i18n.t("changes.loadNetworkFailed"),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChangeRequests();
  }, []);

  const filteredChangeRequests = changeRequests
    .filter((changeReq) => {
      if (filter === "ALL") return true;
      return changeReq.status === filter;
    })
    .sort((a, b) => {
      // Sort by priority: PENDING > FULFILLED > DENIED
      const statusPriority = { PENDING: 1, PROCESSING: 1, FULFILLED: 2, DENIED: 3 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      // Within same status, sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const statusCounts = {
    ALL: changeRequests.length,
    PENDING: changeRequests.filter((r) => r.status === "PENDING").length,
    FULFILLED: changeRequests.filter((r) => r.status === "FULFILLED").length,
    DENIED: changeRequests.filter((r) => r.status === "DENIED").length,
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case "PENDING":
        return <StatusIndicator type="pending">{t("requests.status.PENDING")}</StatusIndicator>;
      case "PROCESSING":
        return <StatusIndicator type="in-progress">{t("changes.applying")}</StatusIndicator>;
      case "FULFILLED":
        return <StatusIndicator type="success">{t("requests.status.FULFILLED")}</StatusIndicator>;
      case "DENIED":
        return <StatusIndicator type="error">{t("requests.status.DENIED")}</StatusIndicator>;
      default:
        return <StatusIndicator type="info">{status}</StatusIndicator>;
    }
  };

  const getChangeTypeDisplay = (changeType) => {
    switch (changeType) {
      case "EXPIRES_AT":
        return t("changes.type.EXPIRES_AT");
      case "RESOURCE_GROUP":
        return t("changes.type.RESOURCE_GROUP");
      case "CONTAINER_IMAGE":
        return t("changes.type.IMAGE");
      case "GROUP":
        return t("changes.type.GROUP");
      case "PORT":
        return t("changes.type.PORT");
      default:
        return changeType;
    }
  };

  const formatChangeValue = (changeType, value) => {
    if (changeType === "EXPIRES_AT") {
      // 날짜 형식으로 포맷팅
      if (value) {
        return new Date(value).toLocaleDateString(i18n.resolvedLanguage, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return t("changes.noDate");
    } else if (changeType === "RESOURCE_GROUP") {
      // 리소스 그룹 ID 또는 이름 표시
      return value;
    } else if (changeType === "CONTAINER_IMAGE") {
      // 이미지 정보 표시 (이미지명:태그 형식일 수 있음)
      if (typeof value === "object" && value !== null) {
        return `${value.imageName || value.name || ""}:${value.imageVersion || value.version || ""}`;
      }
      return value;
    } else if (changeType === "GROUP") {
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return value;
    } else if (changeType === "PORT") {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return t("changes.noPorts");
        }
        return value.map(port => `${port.internalPort} (${port.usagePurpose || t("changes.noPurpose")})`).join(", ");
      }
      return t("changes.noPorts");
    }
    return value;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <StatusIndicator type="loading">
          {t("changes.loading")}
        </StatusIndicator>
      </div>
    );
  }

  const changeRequestList =
    filteredChangeRequests.length === 0 ? (
      <Container>
        <div className="text-center py-12 space-y-2">
          <p className="text-(--decs-text-heading) font-bold">
            {filter === "ALL"
              ? t("changes.emptyAll")
              : t(`changes.emptyFiltered.${filter}`)}
          </p>
          <p className="text-(--decs-text-secondary)">
            {filter === "ALL"
              ? t("changes.emptyAllHint")
              : t("changes.emptyFilteredHint")}
          </p>
        </div>
      </Container>
    ) : (
      <div className="space-y-4">
        {filteredChangeRequests.map((changeRequest) => (
          <Container
            key={changeRequest.changeRequestId}
            header={
              <Header
                variant="h3"
                actions={
                  <Button
                    variant="normal"
                    onClick={() => setSelectedChangeRequest(changeRequest)}
                  >
                    {t("requests.detail")}
                  </Button>
                }
              >
                <span className="inline-flex items-center gap-3">
                  {t("changes.itemTitle", { id: changeRequest.changeRequestId })}
                  {getStatusIndicator(changeRequest.status)}
                </span>
              </Header>
            }
          >
            <div className="space-y-4">
              {/* Change Details */}
              <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4 space-y-3">
                <KeyValuePairs
                  columns={3}
                  items={[
                    {
                      label: t("changes.changeType"),
                      value: getChangeTypeDisplay(changeRequest.changeType),
                    },
                    {
                      label: t("changes.oldValue"),
                      value: formatChangeValue(
                        changeRequest.changeType,
                        changeRequest.oldValue
                      ),
                    },
                    {
                      label: t("changes.newValue"),
                      value: formatChangeValue(
                        changeRequest.changeType,
                        changeRequest.newValue
                      ),
                    },
                  ]}
                />
                <KeyValuePairs
                  columns={1}
                  items={[
                    { label: t("changes.reason"), value: changeRequest.reason },
                  ]}
                />
              </div>

              {/* Request Information */}
              <KeyValuePairs
                columns={3}
                items={[
                  {
                    label: t("changes.originalRequestId"),
                    value: `#${changeRequest.originalRequestId}`,
                  },
                  {
                    label: t("changes.requestedAt"),
                    value: formatDate(changeRequest.createdAt),
                  },
                  {
                    label: t("changes.changeType"),
                    value: getChangeTypeDisplay(changeRequest.changeType),
                  },
                ]}
              />

              {/* Status-specific information */}
              {changeRequest.status === "FULFILLED" && (
                <Alert type="success" header={t("requests.approvedTitle")}>
                  {changeRequest.adminComment ||
                    t("changes.approvedDefault")}
                </Alert>
              )}

              {changeRequest.status === "DENIED" && (
                <Alert type="error" header={t("changes.deniedTitle")}>
                  {t("changes.reasonPrefix")}{" "}
                  {changeRequest.adminComment ||
                    t("changes.deniedDefault")}
                </Alert>
              )}

              {changeRequest.status === "PENDING" && (
                <Alert type="info" header={t("requests.pendingTitle")}>
                  {t("changes.pendingBody")}
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
  ].map((tab) => ({
    id: tab.key,
    label: `${tab.label} (${statusCounts[tab.key]})`,
    content: changeRequestList,
  }));

  return (
    <div className="space-y-6">
      {alert && (
        <Alert type={alert.type} dismissible onDismiss={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Header
        variant="h1"
        description={t("changes.description")}
      >
        {t("changes.title")}
      </Header>

      {/* Status Filter + List */}
      <Tabs tabs={filterTabs} activeTabId={filter} onChange={setFilter} />

      {/* Detail Modal */}
      {selectedChangeRequest && (
        <Modal
          visible
          size="large"
          onDismiss={() => setSelectedChangeRequest(null)}
          header={
            <span className="inline-flex items-center gap-3">
              {t("changes.detailTitle")}
              {getStatusIndicator(selectedChangeRequest.status)}
            </span>
          }
          footer={
            <Button
              variant="normal"
              onClick={() => setSelectedChangeRequest(null)}
            >
              {t("common.close")}
            </Button>
          }
        >
          <div className="space-y-6">
            <p className="text-sm text-(--decs-text-secondary)">
              Change Request ID: {selectedChangeRequest.changeRequestId}
            </p>

            {/* Change Information */}
            <div className="space-y-3">
              <Header variant="h3">{t("changes.changeContent")}</Header>
              <div className="bg-(--decs-surface-sunken) rounded-(--decs-radius-item) p-4 space-y-3">
                <KeyValuePairs
                  columns={3}
                  items={[
                    {
                      label: t("changes.changeType"),
                      value: getChangeTypeDisplay(
                        selectedChangeRequest.changeType
                      ),
                    },
                    {
                      label: t("changes.oldValue"),
                      value: formatChangeValue(
                        selectedChangeRequest.changeType,
                        selectedChangeRequest.oldValue
                      ),
                    },
                    {
                      label: t("changes.newValue"),
                      value: formatChangeValue(
                        selectedChangeRequest.changeType,
                        selectedChangeRequest.newValue
                      ),
                    },
                  ]}
                />
                <KeyValuePairs
                  columns={1}
                  items={[
                    {
                      label: t("changes.reason"),
                      value: selectedChangeRequest.reason,
                    },
                  ]}
                />
              </div>
            </div>

            {/* Request Information */}
            <div className="space-y-3">
              <Header variant="h3">{t("changes.requestInfo")}</Header>
              <KeyValuePairs
                columns={2}
                items={[
                  {
                    label: t("changes.changeRequestId"),
                    value: selectedChangeRequest.changeRequestId,
                  },
                  {
                    label: t("changes.originalRequestId"),
                    value: `#${selectedChangeRequest.originalRequestId}`,
                  },
                  {
                    label: t("changes.requestedAt"),
                    value: formatDate(selectedChangeRequest.createdAt),
                  },
                  {
                    label: t("changes.processStatus"),
                    value: getStatusIndicator(selectedChangeRequest.status),
                  },
                ]}
              />
            </div>

            {/* Status Information */}
            {(selectedChangeRequest.status === "FULFILLED" ||
              selectedChangeRequest.status === "DENIED") && (
              <div className="space-y-3">
                <Header variant="h3">{t("changes.result")}</Header>
                <Alert
                  type={
                    selectedChangeRequest.status === "FULFILLED"
                      ? "success"
                      : "error"
                  }
                  header={
                    selectedChangeRequest.status === "FULFILLED"
                      ? t("requests.approvedTitle")
                      : t("changes.deniedTitle")
                  }
                >
                  {t("changes.adminMessagePrefix")}{" "}
                  {selectedChangeRequest.adminComment ||
                    (selectedChangeRequest.status === "FULFILLED"
                      ? t("changes.approvedDefault")
                      : t("changes.deniedDefault"))}
                </Alert>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyChangeRequestsPage;
